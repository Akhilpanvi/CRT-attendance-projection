import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { TIME_SLOTS, getWeekNumber } from '@/lib/helpers';
import { buildSlotsPerDate, computeStudentStats } from '@/lib/attendanceCalc';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'student')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const roll = session.rollNumber.toUpperCase();
    await connectDB();

    const [student, records, rawPairs] = await Promise.all([
      Student.findOne({ rollNumber: roll }).lean(),
      Attendance.find({ rollNumber: roll }).sort({ date: 1, slot: 1 }).lean(),
      // All (date, slot) pairs ever uploaded — used to detect training days
      Attendance.aggregate([
        { $group: { _id: { date: '$date', slot: '$slot' } } },
        { $project: { _id: 0, date: '$_id.date', slot: '$_id.slot' } },
      ]),
    ]);

    if (!student) return NextResponse.json({ error: 'Student record not found' }, { status: 404 });

    // Build training-day slot map (filters to working dates ≥ training start, excl. Sundays)
    const { slotsPerDate } = buildSlotsPerDate(rawPairs);

    // Compute stats: missing slots on training days → absent
    const { total, present, absent, sp, overallPct, byDate } = computeStudentStats(records, slotsPerDate);

    // Weekly breakdown
    const weekMap = {};
    for (const [date, slotStatuses] of Object.entries(byDate)) {
      const wk  = getWeekNumber(date);
      const yr  = new Date(date + 'T00:00:00Z').getUTCFullYear();
      const key = `${yr}-W${String(wk).padStart(2, '0')}`;
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

    // Ordered slot list for the UI (matches TIME_SLOTS order where possible)
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
