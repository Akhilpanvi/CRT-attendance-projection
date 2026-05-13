import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { getWeekNumber } from '@/lib/helpers';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { rollNumber, slot, status, date } = await request.json();
    const roll = rollNumber?.toUpperCase();
    if (!roll || !slot || !status)
      return NextResponse.json({ error: 'rollNumber, slot and status required' }, { status: 400 });

    await connectDB();
    if (!await Student.findOne({ rollNumber: roll }))
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const attendanceDate = date || new Date().toISOString().split('T')[0];
    const record = await Attendance.findOneAndUpdate(
      { rollNumber: roll, date: attendanceDate, slot },
      { $set: { status, week: getWeekNumber(attendanceDate), year: new Date(attendanceDate).getFullYear(), markedAt: new Date() } },
      { upsert: true, new: true }
    );
    return NextResponse.json({ success: true, record });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
