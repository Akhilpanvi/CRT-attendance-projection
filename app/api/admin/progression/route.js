import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { getWeekNumber } from '@/lib/helpers';
import { buildSlotsPerDate } from '@/lib/attendanceCalc';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    await connectDB();

    // Build the training-day slot map so we know total expected slots per week
    const rawPairs = await Attendance.aggregate([
      { $group: { _id: { date: '$date', slot: '$slot' } } },
      { $project: { _id: 0, date: '$_id.date', slot: '$_id.slot' } },
    ]);
    const { slotsPerDate } = buildSlotsPerDate(rawPairs);

    // Total expected slots per ISO week key (e.g. '2026-W20')
    const slotsPerWeek = {};
    for (const [date, slots] of Object.entries(slotsPerDate)) {
      const d    = new Date(date + 'T00:00:00Z');
      const year = d.getUTCFullYear();
      const week = getWeekNumber(date);
      const key  = `${year}-W${String(week).padStart(2, '0')}`;
      slotsPerWeek[key] = (slotsPerWeek[key] || 0) + slots.length;
    }

    // Per-student present counts grouped by week, on working dates only
    const workingDates = Object.keys(slotsPerDate);
    const agg = workingDates.length
      ? await Attendance.aggregate([
          { $match: { date: { $in: workingDates }, status: { $in: ['present', 'sp'] } } },
          { $group: {
              _id:     { rollNumber: '$rollNumber', week: '$week', year: '$year' },
              present: { $sum: 1 },
          }},
          { $sort: { '_id.year': 1, '_id.week': 1 } },
        ])
      : [];

    const byStudent = {};
    const weekSet   = new Set(Object.keys(slotsPerWeek));

    for (const r of agg) {
      const key   = `${r._id.year}-W${String(r._id.week).padStart(2, '0')}`;
      const total = slotsPerWeek[key] || 0;
      weekSet.add(key);
      if (!byStudent[r._id.rollNumber]) byStudent[r._id.rollNumber] = {};
      byStudent[r._id.rollNumber][key] = { present: r.present, total };
    }

    // Fill in weeks where a student has zero presence (total still applies)
    for (const key of weekSet) {
      for (const roll of Object.keys(byStudent)) {
        if (!byStudent[roll][key]) {
          byStudent[roll][key] = { present: 0, total: slotsPerWeek[key] || 0 };
        }
      }
    }

    return NextResponse.json({ weeks: [...weekSet].sort(), byStudent });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
