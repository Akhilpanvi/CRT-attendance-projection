import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import User from '@/lib/models/User';
import Attendance from '@/lib/models/Attendance';
import Session from '@/lib/models/Session';
import SelfAttendance from '@/lib/models/SelfAttendance';
import { getSession } from '@/lib/auth';
import { getWeekNumber } from '@/lib/helpers';
import { parseAttendanceFile } from '@/lib/attendanceParse';
import { CLUSTERS, clusterForDate, dayName, isWorkingDate } from '@/lib/attendanceCalc';
import { logAction } from '@/lib/auditLog';

export const maxDuration = 60;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CHUNK = 500;

function countBy(list, key) {
  const out = {};
  for (const x of list) out[x[key] || ''] = (out[x[key] || ''] || 0) + 1;
  return out;
}

/** Suggested cluster: the date's weekday cluster, else the file's majority cluster */
function suggestCluster(date, students) {
  const byDay = date ? clusterForDate(date) : '';
  if (byDay) return byDay;
  const counts = countBy(students, 'cluster');
  return CLUSTERS.slice().sort((a, b) => (counts[b] || 0) - (counts[a] || 0))[0];
}

/**
 * POST /api/admin/upload-csv  (multipart)
 *   file      .csv / .xlsx / .xls
 *   mode      'preview' → parse only, return what was detected
 *             'import'  → write to the database
 *   sheet     workbook sheet to import (default: auto)
 *   date      YYYY-MM-DD (import)
 *   cluster   'C1' | 'C2' | 'ALL' (import; ALL = use each row's CLUSTER)
 *   reupload  'true' → do not create new student logins
 */
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const form = await request.formData();
    const file = form.get('file') || form.get('csv');
    if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    const fileName = file.name || 'upload';
    if (!/\.(csv|xlsx|xls|xlsm)$/i.test(fileName))
      return NextResponse.json({ error: 'Upload a .csv, .xlsx or .xls file' }, { status: 400 });

    let parsed;
    try {
      parsed = parseAttendanceFile(Buffer.from(await file.arrayBuffer()), fileName);
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    // ── Preview ─────────────────────────────────────────────────────
    if (form.get('mode') === 'preview') {
      await connectDB();
      const dates = parsed.sheets.map(s => s.date).filter(Boolean);
      const existing = dates.length
        ? await Session.aggregate([
            { $match: { date: { $in: dates } } },
            { $group: { _id: { date: '$date', cluster: '$cluster' }, slots: { $sum: 1 } } },
          ])
        : [];

      return NextResponse.json({
        fileName,
        defaultSheet: parsed.defaultSheet,
        sheets: parsed.sheets.map(s => ({
          sheet:            s.sheet,
          date:             s.date,
          dateSource:       s.dateSource,
          day:              s.date ? dayName(s.date) : '',
          suggestedCluster: suggestCluster(s.date, s.students),
          slots:            s.slots,
          total:            s.students.length,
          clusterCounts:    countBy(s.students, 'cluster'),
          warnings:         s.warnings,
          sample:           s.students.slice(0, 5).map(({ rollNumber, name, cluster, marks }) => ({
            rollNumber, name, cluster,
            marks: s.slots.map(sl => marks[sl] === 'present' ? 'P' : marks[sl] === 'absent' ? 'A' : '·').join(''),
          })),
        })),
        existing: existing.map(e => ({ date: e._id.date, cluster: e._id.cluster, slots: e.slots })),
      });
    }

    // ── Import ──────────────────────────────────────────────────────
    const sheetName = form.get('sheet') || parsed.defaultSheet;
    const sheet = parsed.sheets.find(s => s.sheet === sheetName);
    if (!sheet) return NextResponse.json({ error: `Sheet "${sheetName}" not found in file` }, { status: 400 });

    const date = String(form.get('date') || '');
    if (!ISO_DATE.test(date)) return NextResponse.json({ error: 'Pick the attendance date' }, { status: 400 });
    if (!isWorkingDate(date))
      return NextResponse.json({ error: `${date} is before the training start or a Sunday — it would not count.` }, { status: 400 });

    const clusterSel = String(form.get('cluster') || '');
    if (![...CLUSTERS, 'ALL'].includes(clusterSel)) return NextResponse.json({ error: 'Pick a cluster' }, { status: 400 });
    const reupload = form.get('reupload') === 'true';

    // Keep only rows of the selected cluster; rows without a cluster take the selected one
    let skippedOtherCluster = 0, skippedNoCluster = 0;
    const rows = [];
    for (const s of sheet.students) {
      if (clusterSel === 'ALL') {
        if (!s.cluster) { skippedNoCluster++; continue; }
        rows.push(s);
      } else if (s.cluster && s.cluster !== clusterSel) {
        skippedOtherCluster++;
      } else {
        rows.push({ ...s, cluster: clusterSel });
      }
    }
    if (!rows.length)
      return NextResponse.json({ error: `No rows belong to ${clusterSel === 'ALL' ? 'a known cluster' : clusterSel} in this file.` }, { status: 400 });

    const week = getWeekNumber(date);
    const year = new Date(date).getFullYear();
    const now  = new Date();
    const rollNumbers = rows.map(r => r.rollNumber);

    await connectDB();

    // Students
    const stuResult = await Student.bulkWrite(rows.map(r => ({ updateOne: {
      filter: { rollNumber: r.rollNumber },
      update: { $set: {
        name: r.name, branch: r.branch, dept: r.dept, cluster: r.cluster,
        crtSec: r.crtSec, crtRoom: r.crtRoom, sno: r.sno,
      }},
      upsert: true,
    }})), { ordered: false });

    // Student logins (skipped in re-upload mode)
    let loginsCreated = 0;
    if (!reupload) {
      const existingUsers = await User.find({ username: { $in: rollNumbers } }, { username: 1 }).lean();
      const existingSet   = new Set(existingUsers.map(u => u.username));
      const newRolls      = rollNumbers.filter(r => !existingSet.has(r));
      const userDocs = [];
      for (let i = 0; i < newRolls.length; i += 50) {
        const batch  = newRolls.slice(i, i + 50);
        const hashed = await Promise.all(batch.map(r => bcrypt.hash(r, 6)));
        batch.forEach((r, idx) => userDocs.push({
          username: r, passwordHash: hashed[idx],
          role: 'student', rollNumber: r, mustChangePassword: true,
        }));
      }
      if (userDocs.length) await User.insertMany(userDocs, { ordered: false });
      loginsCreated = userDocs.length;
    }

    // Attendance from the sheet; per cluster, remember which slots were actually held
    const attendanceBulk = [];
    const held = {};      // cluster → Set(slot)
    const present = {};   // `${cluster}|${slot}` → count
    for (const r of rows) {
      for (const [slot, status] of Object.entries(r.marks)) {
        (held[r.cluster] ||= new Set()).add(slot);
        if (status === 'present') present[`${r.cluster}|${slot}`] = (present[`${r.cluster}|${slot}`] || 0) + 1;
        attendanceBulk.push({ updateOne: {
          filter: { rollNumber: r.rollNumber, date, slot },
          update: { $set: { status, cluster: r.cluster, week, year, markedAt: now } },
          upsert: true,
        }});
      }
    }
    let attCount = 0;
    for (let i = 0; i < attendanceBulk.length; i += CHUNK) {
      const res = await Attendance.bulkWrite(attendanceBulk.slice(i, i + CHUNK), { ordered: false });
      attCount += (res.upsertedCount || 0) + (res.modifiedCount || 0);
    }

    // Students of the same cluster missing from the sheet → absent (never overwrites SP/present)
    let absentMarked = 0;
    const clusterSize = {};
    for (const [cluster, slots] of Object.entries(held)) {
      const missing = await Student.find(
        { cluster, rollNumber: { $nin: rollNumbers } }, { rollNumber: 1 }
      ).lean();
      clusterSize[cluster] = rows.filter(r => r.cluster === cluster).length + missing.length;
      const absentBulk = [];
      for (const stu of missing) for (const slot of slots) {
        absentBulk.push({ updateOne: {
          filter: { rollNumber: stu.rollNumber, date, slot },
          update: { $setOnInsert: { status: 'absent', cluster, week, year, markedAt: now } },
          upsert: true,
        }});
      }
      for (let i = 0; i < absentBulk.length; i += CHUNK) {
        const res = await Attendance.bulkWrite(absentBulk.slice(i, i + CHUNK), { ordered: false });
        absentMarked += res.upsertedCount || 0;
      }
    }

    // Record the sessions held
    const sessionOps = [];
    for (const [cluster, slots] of Object.entries(held)) for (const slot of slots) {
      sessionOps.push({ updateOne: {
        filter: { date, slot, cluster },
        update: { $set: {
          students: clusterSize[cluster], present: present[`${cluster}|${slot}`] || 0,
          fileName, uploadedBy: session.username, uploadedAt: now,
        }},
        upsert: true,
      }});
    }
    if (sessionOps.length) await Session.bulkWrite(sessionOps, { ordered: false });

    // Clear self-tracked data for this date — official records now supersede them
    await SelfAttendance.deleteMany({ rollNumber: { $in: rollNumbers }, date });

    const clusters = Object.keys(held).sort();
    const slotList = [...new Set(Object.values(held).flatMap(s => [...s]))];
    logAction(
      session.username, 'UPLOAD_CSV', date,
      `Uploaded ${fileName}${parsed.sheets.length > 1 ? ` [${sheet.sheet}]` : ''} for ${date} (${clusters.join('+')}) — ${rows.length} students, ${slotList.length} slot(s), ${absentMarked} absent records created${skippedOtherCluster ? `, ${skippedOtherCluster} other-cluster rows skipped` : ''}${reupload ? ' [reupload]' : ''}`
    );

    return NextResponse.json({
      success: true,
      date,
      clusters,
      created:  stuResult.upsertedCount || 0,
      updated:  stuResult.modifiedCount || 0,
      loginsCreated,
      attendanceCount: attCount,
      absentMarked,
      total: rows.length,
      skippedOtherCluster,
      skippedNoCluster,
      slotCols: slotList,
      reupload,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
