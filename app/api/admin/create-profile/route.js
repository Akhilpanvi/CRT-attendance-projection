import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import User from '@/lib/models/User';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { getWeekNumber } from '@/lib/helpers';
import { logAction } from '@/lib/auditLog';
import { buildSlotsPerDate } from '@/lib/attendanceCalc';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { name, rollNumber, branch, dept, cluster, crtSec, crtRoom, role, permissions, email } = await request.json();
    if (!name?.trim() || !rollNumber?.trim())
      return NextResponse.json({ error: 'Name and registration number are required' }, { status: 400 });

    const roll = rollNumber.trim().toUpperCase();
    await connectDB();

    // Check existing user
    const existing = await User.findOne({ username: roll });
    if (existing) return NextResponse.json({ error: `User ${roll} already exists` }, { status: 409 });

    // Only super-admins (permissions === null) can create other admins
    const isSuperAdmin = session.permissions === null || session.permissions === undefined;
    const effectiveRole = (role === 'admin' && isSuperAdmin) ? 'admin' : 'student';
    if (role === 'admin' && !isSuperAdmin)
      return NextResponse.json({ error: 'Only the main admin can create admin accounts' }, { status: 403 });

    const hash = await bcrypt.hash(roll, 10);

    // Admin permissions: null = full access, array = restricted
    const effectivePerms = effectiveRole === 'admin'
      ? (Array.isArray(permissions) && permissions.length > 0 ? permissions : null)
      : null;

    await Promise.all([
      User.create({
        username:           roll,
        passwordHash:       hash,
        role:               effectiveRole,
        rollNumber:         roll,
        mustChangePassword: true,
        permissions:        effectivePerms,
        email:              effectiveRole === 'admin' ? (email?.trim() || '') : '',
      }),
      effectiveRole === 'student'
        ? Student.findOneAndUpdate(
            { rollNumber: roll },
            { rollNumber: roll, name: name.trim().toUpperCase(), branch, dept, cluster, crtSec, crtRoom },
            { upsert: true, new: true }
          )
        : Promise.resolve(),
    ]);

    // ── Backfill absent records for past training days ────────────────
    // New students must be absent for every session before they were added.
    if (effectiveRole === 'student') {
      try {
        const rawPairs = await Attendance.aggregate([
          { $group: { _id: { date: '$date', slot: '$slot' } } },
          { $project: { _id: 0, date: '$_id.date', slot: '$_id.slot' } },
        ]);
        const { slotsPerDate } = buildSlotsPerDate(rawPairs);

        const absentBulk = [];
        for (const [date, slots] of Object.entries(slotsPerDate)) {
          const wk = getWeekNumber(date);
          const yr = new Date(date).getFullYear();
          for (const slot of slots) {
            absentBulk.push({
              updateOne: {
                filter: { rollNumber: roll, date, slot },
                update: { $setOnInsert: { rollNumber: roll, date, slot, status: 'absent', week: wk, year: yr, markedAt: new Date() } },
                upsert: true,
              },
            });
          }
        }
        if (absentBulk.length) {
          const CHUNK = 500;
          for (let i = 0; i < absentBulk.length; i += CHUNK) {
            await Attendance.bulkWrite(absentBulk.slice(i, i + CHUNK), { ordered: false });
          }
        }
      } catch (backfillErr) {
        // Non-fatal — log but don't fail the profile creation
        console.error('[create-profile] absent backfill failed:', backfillErr.message);
      }
    }

    logAction(
      session.username, 'CREATE_PROFILE', roll,
      `Created ${effectiveRole} account for ${name.trim().toUpperCase()} (${roll})`
    );

    return NextResponse.json({ success: true, rollNumber: roll, role: effectiveRole, permissions: effectivePerms });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
