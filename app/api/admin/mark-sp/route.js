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

    await connectDB();
    const result = await Attendance.findOneAndUpdate(
      { rollNumber: rollNumber.toUpperCase(), date, slot },
      { $set: { status, week, year, markedAt: new Date() } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, status: result.status });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
