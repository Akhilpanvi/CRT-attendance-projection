import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { TIME_SLOTS } from '@/lib/helpers';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'student')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const roll = session.rollNumber.toUpperCase();
    await connectDB();

    const student = await Student.findOne({ rollNumber: roll }).lean();
    if (!student) return NextResponse.json({ error: 'Student record not found' }, { status: 404 });

    const records = await Attendance.find({ rollNumber: roll }).sort({ date: 1, slot: 1 }).lean();
    const total   = records.length;
    const present = records.filter(r => r.status === 'present').length;

    const byDate = {};
    const slots  = new Set();
    for (const r of records) {
      if (!byDate[r.date]) byDate[r.date] = {};
      byDate[r.date][r.slot] = r.status;
      slots.add(r.slot);
    }

    const orderedSlots = [
      ...TIME_SLOTS.filter(s => slots.has(s)),
      ...[...slots].filter(s => !TIME_SLOTS.includes(s)),
    ];

    return NextResponse.json({
      student,
      stats: {
        total,
        present,
        absent:     total - present,
        overallPct: total > 0 ? Math.round((present / total) * 100) : 0,
        byDate,
        slots: orderedSlots,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
