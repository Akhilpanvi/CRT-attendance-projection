import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { TIME_SLOTS, getWeekNumber } from '@/lib/helpers';
import { buildSlotsPerDate, computeStudentStats } from '@/lib/attendanceCalc';

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

    const [records, rawPairs] = await Promise.all([
      Attendance.find({ rollNumber: roll }).sort({ date: 1, slot: 1 }).lean(),
      Attendance.aggregate([
        { $group: { _id: { date: '$date', slot: '$slot' } } },
        { $project: { _id: 0, date: '$_id.date', slot: '$_id.slot' } },
      ]),
    ]);

    // Build training-day slot map (working dates ≥ training start, excl. Sundays)
    const { slotsPerDate } = buildSlotsPerDate(rawPairs);

    // Compute stats: missing training-day slots count as absent
    const { total, present, absent, sp, overallPct, byDate } = computeStudentStats(records, slotsPerDate);

    // Weekly breakdown using the computed byDate
    const weekMap = {};
    for (const [date, slotStatuses] of Object.entries(byDate)) {
      const d    = new Date(date + 'T00:00:00Z');
      const wk   = getWeekNumber(date);
      const yr   = d.getUTCFullYear();
      const key  = `${yr}-W${String(wk).padStart(2, '0')}`;
      if (!weekMap[key]) weekMap[key] = { total: 0, present: 0, week: wk, year: yr };
      for (const status of Object.values(slotStatuses)) {
        weekMap[key].total++;
        if (status === 'present' || status === 'sp') weekMap[key].present++;
      }
    }
    const weeks = Object.values(weekMap).map(w => ({
      ...w,
      pct:  w.total > 0 ? Math.round((w.present / w.total) * 100) : 0,
      safe: w.total > 0 ? (w.present / w.total) >= 0.75 : true,
    })).sort((a, b) => b.year - a.year || b.week - a.week);

    // Ordered slot list
    const allSlots = new Set(Object.values(slotsPerDate).flat());
    const orderedSlots = [
      ...TIME_SLOTS.filter(s => allSlots.has(s)),
      ...[...allSlots].filter(s => !TIME_SLOTS.includes(s)),
    ];

    return NextResponse.json({
      student,
      stats: {
        total,
        present,
        absent,
        sp,
        overallPct,
        byDate,
        weeks,
        slots: orderedSlots,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
