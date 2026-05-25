import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { getWeekNumber } from '@/lib/helpers';

// SP marking is now handled exclusively by admin.
// This endpoint is intentionally disabled.
export async function PATCH() {
  return NextResponse.json(
    { error: 'SP marking is managed by admin. Please contact the CRT office.' },
    { status: 403 }
  );
}

// Keep the original handler in comments for reference only.
// eslint-disable-next-line no-unused-vars
async function _disabledPATCH(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'student')
      return NextResponse.json({ error: 'Students only' }, { status: 403 });

    const { rollNumber, date, slot, status } = await request.json();

    // Students can only toggle between 'sp' and 'absent' — never 'present'
    if (!rollNumber || !date || !slot || !['sp', 'absent'].includes(status))
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    // Hard ownership check — own roll number only
    if (session.rollNumber.toUpperCase() !== rollNumber.toUpperCase())
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const week = getWeekNumber(date);
    const year = new Date(date).getFullYear();

    const normalizeSlot = s => s.replace(/\b(\d):/g, '0$1:');
    const normalizedSlot = normalizeSlot(slot);
    const slotRegex = new RegExp('^' + normalizedSlot.replace(/0(\d):/g, '0?$1:') + '$');

    await connectDB();
    const roll = rollNumber.toUpperCase();

    // Verify the slot exists and is currently absent (students can't create new records)
    const existing = await Attendance.findOne({ rollNumber: roll, date, slot: slotRegex });
    if (!existing)
      return NextResponse.json({ error: 'No attendance record found for this slot' }, { status: 404 });

    if (existing.status === 'present')
      return NextResponse.json({ error: 'Cannot modify a present slot' }, { status: 400 });

    // Delete all matching slot records (handles duplicate normalized/un-normalized forms)
    await Attendance.deleteMany({ rollNumber: roll, date, slot: slotRegex });

    // Insert single clean record
    const result = await Attendance.create({
      rollNumber: roll, date, slot: normalizedSlot, status, week, year, markedAt: new Date(),
    });

    return NextResponse.json({ success: true, status: result.status });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
