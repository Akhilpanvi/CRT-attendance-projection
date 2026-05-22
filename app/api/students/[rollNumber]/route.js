import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { TIME_SLOTS } from '@/lib/helpers';

export async function GET(request, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const roll = params.rollNumber.toUpperCase();
    if (session.role !== 'admin' && session.role !== 'aprameya' && session.rollNumber !== roll)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    await connectDB();
    const student = await Student.findOne({ rollNumber: roll }).lean();
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const records = await Attendance.find({ rollNumber: roll }).sort({ date: 1, slot: 1 }).lean();
    const total   = records.length;
    const present = records.filter(r => r.status === 'present' || r.status === 'sp').length;

    // Group by date
    const normalizeSlot = s => s.replace(/\b(\d):/g, '0$1:');
    const byDate = {};
    const slots  = new Set();
    for (const r of records) {
      const slot = normalizeSlot(r.slot);
      if (!byDate[r.date]) byDate[r.date] = {};
      byDate[r.date][slot] = r.status;
      slots.add(slot);
    }

    // Weekly breakdown
    const weekMap = {};
    for (const r of records) {
      const key = `${r.year}-W${String(r.week).padStart(2, '0')}`;
      if (!weekMap[key]) weekMap[key] = { total: 0, present: 0, week: r.week, year: r.year };
      weekMap[key].total++;
      if (r.status === 'present' || r.status === 'sp') weekMap[key].present++;
    }
    const weeks = Object.values(weekMap).map(w => ({
      ...w,
      pct:  w.total > 0 ? Math.round((w.present / w.total) * 100) : 0,
      safe: w.total > 0 ? (w.present / w.total) >= 0.75 : true,
    })).sort((a, b) => b.year - a.year || b.week - a.week);

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
        weeks,
        slots: orderedSlots,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
