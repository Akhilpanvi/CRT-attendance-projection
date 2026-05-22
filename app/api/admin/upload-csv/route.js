import { NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import User from '@/lib/models/User';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { getWeekNumber } from '@/lib/helpers';
import SelfAttendance from '@/lib/models/SelfAttendance';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get('csv');
    const attendanceDate = formData.get('date') || new Date().toISOString().split('T')[0];
    const reupload = formData.get('reupload') === 'true';

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const content = await file.text();
    const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    if (!rows.length) return NextResponse.json({ error: 'CSV is empty' }, { status: 400 });

    const cols = Object.keys(rows[0]);
    const find = pats => cols.find(c => pats.some(p => p.test(c.trim())));

    const rollCol    = find([/regd\.?no/i, /reg\.?no/i, /roll/i]);
    const nameCol    = find([/^name$/i]);
    const branchCol  = find([/^branch$/i]);
    const deptCol    = find([/^dept$/i]);
    const clusterCol = find([/^cluster$/i]);
    const crtSecCol  = find([/crt\s*sec/i]);
    const crtRoomCol = find([/crt\s*room/i, /^room$/i]);
    const snoCol     = find([/^s\.?no$/i, /^sno$/i]);

    if (!rollCol || !nameCol)
      return NextResponse.json({ error: 'CSV must have NAME and REGD.NO columns' }, { status: 400 });

    const week = getWeekNumber(attendanceDate);
    const year = new Date(attendanceDate).getFullYear();
    const knownCols = [rollCol, nameCol, branchCol, deptCol, clusterCol, crtSecCol, crtRoomCol, snoCol].filter(Boolean);
    // Normalize slot names: pad single-digit hours so 04:30-5:30 → 04:30-05:30
    const normalizeSlot = s => s.replace(/\b(\d):/g, '0$1:');
    const slotCols  = cols.filter(c => !knownCols.includes(c));

    const studentBulk    = [];
    const attendanceBulk = [];
    const rollNumbers    = [];

    for (const row of rows) {
      const rollNumber = row[rollCol]?.trim().toUpperCase();
      const name       = row[nameCol]?.trim();
      if (!rollNumber || !name) continue;
      rollNumbers.push(rollNumber);

      studentBulk.push({ updateOne: {
        filter: { rollNumber },
        update: { $set: {
          name,
          branch:  branchCol  ? (row[branchCol]  || '') : '',
          dept:    deptCol    ? (row[deptCol]    || '') : '',
          cluster: clusterCol ? (row[clusterCol] || '') : '',
          crtSec:  crtSecCol  ? (row[crtSecCol]  || '') : '',
          crtRoom: crtRoomCol ? (row[crtRoomCol] || '') : '',
          sno:     snoCol     ? (parseInt(row[snoCol]) || 0) : 0,
        }},
        upsert: true,
      }});

      for (const slotCol of slotCols) {
        const val = row[slotCol]?.trim().toUpperCase();
        if (!val || !['P', 'A'].includes(val)) continue;
        const slot = normalizeSlot(slotCol);
        // Match both normalized '04:30-05:30' and un-normalized '04:30-5:30' forms in DB
        const slotRegex = new RegExp('^' + slot.replace(/0(\d):/g, '0?$1:') + '$');
        attendanceBulk.push({ updateOne: {
          filter: { rollNumber, date: attendanceDate, slot: slotRegex },
          update: { $set: { status: val === 'P' ? 'present' : 'absent', slot, week, year, markedAt: new Date() } },
          upsert: true,
        }});
      }
    }

    await connectDB();

    const stuResult = rollNumbers.length
      ? await Student.bulkWrite(studentBulk, { ordered: false })
      : { upsertedCount: 0, modifiedCount: 0 };

    // Create missing user accounts in batches (skipped in re-upload mode)
    if (!reupload) {
      const existingUsers = await User.find({ username: { $in: rollNumbers } }, { username: 1 }).lean();
      const existingSet   = new Set(existingUsers.map(u => u.username));
      const newRolls      = rollNumbers.filter(r => !existingSet.has(r));

      if (newRolls.length) {
        const BATCH = 50;
        const userDocs = [];
        for (let i = 0; i < newRolls.length; i += BATCH) {
          const batch  = newRolls.slice(i, i + BATCH);
          const hashed = await Promise.all(batch.map(r => bcrypt.hash(r, 6)));
          batch.forEach((r, idx) => userDocs.push({
            username: r, passwordHash: hashed[idx],
            role: 'student', rollNumber: r, mustChangePassword: true,
          }));
        }
        await User.insertMany(userDocs, { ordered: false });
      }
    }

    // Attendance in 500-op chunks
    const CHUNK = 500;
    let attCount = 0;
    for (let i = 0; i < attendanceBulk.length; i += CHUNK) {
      const r = await Attendance.bulkWrite(attendanceBulk.slice(i, i + CHUNK), { ordered: false });
      attCount += (r.upsertedCount || 0) + (r.modifiedCount || 0);
    }

    // Clear self-tracked data for this date — official records now supersede them
    if (rollNumbers.length) {
      await SelfAttendance.deleteMany({ rollNumber: { $in: rollNumbers }, date: attendanceDate });
    }

    return NextResponse.json({
      success: true,
      created:         stuResult.upsertedCount  || 0,
      updated:         stuResult.modifiedCount  || 0,
      attendanceCount: attCount,
      total:           rollNumbers.length,
      slotCols: slotCols.map(normalizeSlot),
      date:            attendanceDate,
      reupload,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
