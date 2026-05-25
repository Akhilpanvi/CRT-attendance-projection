import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { buildSlotsPerDate } from '@/lib/attendanceCalc';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    await connectDB();

    // Identify training days: uploaded dates that are working days (≥ training start, not Sunday)
    const rawPairs = await Attendance.aggregate([
      { $group: { _id: { date: '$date', slot: '$slot' } } },
      { $project: { _id: 0, date: '$_id.date', slot: '$_id.slot' } },
    ]);
    const { slotsPerDate, totalSlots } = buildSlotsPerDate(rawPairs);
    const workingDates = Object.keys(slotsPerDate);

    const [students, presentAgg, spOnlyAgg] = await Promise.all([
      Student.find().sort({ sno: 1, name: 1 }).lean(),
      // present+sp count on working dates only (used for SP-adjusted %)
      workingDates.length
        ? Attendance.aggregate([
            { $match: { date: { $in: workingDates }, status: { $in: ['present', 'sp'] } } },
            { $group: {
                _id:     '$rollNumber',
                present: { $sum: 1 },
                sp:      { $sum: { $cond: [{ $eq: ['$status', 'sp'] }, 1, 0] } },
            }},
          ])
        : Promise.resolve([]),
      // pure-present count on working dates (for "original %" without SP)
      workingDates.length
        ? Attendance.aggregate([
            { $match: { date: { $in: workingDates }, status: 'present' } },
            { $group: { _id: '$rollNumber', presentOnly: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
    ]);

    const statsMap = {};
    for (const s of presentAgg) {
      statsMap[s._id] = { present: s.present, sp: s.sp || 0 };
    }
    const origMap = {};
    for (const s of spOnlyAgg) origMap[s._id] = s.presentOnly;

    return NextResponse.json(students.map(s => {
      const present    = statsMap[s.rollNumber]?.present    || 0;
      const sp         = statsMap[s.rollNumber]?.sp         || 0;
      const origPres   = origMap[s.rollNumber]              || 0;
      const total      = totalSlots;
      const overallPct = total > 0 ? Math.round((present / total) * 100) : 0;
      const origPct    = total > 0 ? Math.round((origPres / total) * 100) : 0;
      return {
        ...s,
        stats: {
          total,
          present,
          absent:     total - present,
          sp,
          overallPct,
          origPresent: origPres,
          origPct,
        },
      };
    }));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
