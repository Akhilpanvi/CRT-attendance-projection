import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { getWeekNumber } from '@/lib/helpers';
import { logAction } from '@/lib/auditLog';

export async function PATCH(request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'student'))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rollNumber, date, slot, status } = await request.json();
    if (!rollNumber || !date || !slot || !['present', 'absent', 'sp'].includes(status))
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    if (session.role === 'student' && session.rollNumber.toUpperCase() !== rollNumber.toUpperCase())
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const week = getWeekNumber(date);
    const year = new Date(date).getFullYear();

    // Normalize slot and build regex that matches both padded and un-padded hour forms
    // e.g. '04:30-05:30' matches '04:30-05:30', '04:30-5:30', '4:30-05:30', '4:30-5:30'
    const normalizeSlot = s => s.replace(/\b(\d):/g, '0$1:');
    const normalizedSlot = normalizeSlot(slot);
    const slotRegex = new RegExp('^' + normalizedSlot.replace(/0(\d):/g, '0?$1:') + '$');

    await connectDB();
    const roll = rollNumber.toUpperCase();

    // Delete ALL records matching this slot (cleans up duplicates from normalized/un-normalized forms)
    await Attendance.deleteMany({ rollNumber: roll, date, slot: slotRegex });

    // Insert a single clean record with the normalized slot name
    const result = await Attendance.create({ rollNumber: roll, date, slot: normalizedSlot, status, week, year, markedAt: new Date() });

    if (session.role === 'admin') {
      logAction(
        session.username, 'MARK_SP', roll,
        `Marked ${roll} slot "${normalizedSlot}" on ${date} as ${status.toUpperCase()}`
      );
    }

    return NextResponse.json({ success: true, status: result.status });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
