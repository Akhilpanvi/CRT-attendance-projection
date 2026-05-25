import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { buildSlotsPerDate } from '@/lib/attendanceCalc';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const threshold = Math.min(100, Math.max(0, parseInt(searchParams.get('threshold') || '85', 10)));

    await connectDB();

    // Step 1: identify all training-day slots (working dates ≥ training start, excl. Sundays)
    const rawPairs = await Attendance.aggregate([
      { $group: { _id: { date: '$date', slot: '$slot' } } },
      { $project: { _id: 0, date: '$_id.date', slot: '$_id.slot' } },
    ]);
    const { slotsPerDate, totalSlots } = buildSlotsPerDate(rawPairs);
    const workingDates = Object.keys(slotsPerDate);

    if (!workingDates.length)
      return NextResponse.json([]);

    // Step 2: count present+sp per student only on working training dates
    const [students, presentAgg] = await Promise.all([
      Student.find().sort({ name: 1 }).lean(),
      Attendance.aggregate([
        { $match: { date: { $in: workingDates }, status: { $in: ['present', 'sp'] } } },
        { $group: {
          _id:     '$rollNumber',
          present: { $sum: 1 },
          sp:      { $sum: { $cond: [{ $eq: ['$status', 'sp'] }, 1, 0] } },
        }},
      ]),
    ]);

    const statsMap = {};
    for (const s of presentAgg) statsMap[s._id] = s;

    // Step 3: total = totalSlots (same for everyone); missing records = absent
    const result = students
      .map(s => {
        const present = statsMap[s.rollNumber]?.present || 0;
        const sp      = statsMap[s.rollNumber]?.sp      || 0;
        const pct     = totalSlots > 0 ? Math.round((present / totalSlots) * 100) : 0;
        return {
          ...s,
          stats: { total: totalSlots, present, absent: totalSlots - present, sp, pct },
        };
      })
      .filter(s => s.stats.pct < threshold && totalSlots > 0)
      .sort((a, b) => a.stats.pct - b.stats.pct);

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
