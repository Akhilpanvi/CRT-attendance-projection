import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { getWeekNumber } from '@/lib/helpers';

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
    // Try to update existing record (handles un-normalized slot names in DB)
    let result = await Attendance.findOneAndUpdate(
      { rollNumber: rollNumber.toUpperCase(), date, slot: slotRegex },
      { $set: { status, week, year, slot: normalizedSlot, markedAt: new Date() } },
      { new: true }
    );
    // If no existing record found, upsert with normalized slot (admin adding new)
    if (!result) {
      result = await Attendance.findOneAndUpdate(
        { rollNumber: rollNumber.toUpperCase(), date, slot: normalizedSlot },
        { $set: { status, week, year, markedAt: new Date() } },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({ success: true, status: result.status });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
