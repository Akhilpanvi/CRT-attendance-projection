import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import Student from '@/lib/models/Student';
import { getSession } from '@/lib/auth';
import { getWeekNumber } from '@/lib/helpers';
import { getSessions } from '@/lib/sessions';
import { normalizeCluster, slotsByCluster } from '@/lib/attendanceCalc';

export const dynamic = 'force-dynamic';

const weekKey = date =>
  `${new Date(date + 'T00:00:00Z').getUTCFullYear()}-W${String(getWeekNumber(date)).padStart(2, '0')}`;

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    await connectDB();

    const [sessions, students] = await Promise.all([
      getSessions(),
      Student.find({}, { _id: 0, rollNumber: 1, cluster: 1 }).lean(),
    ]);
    const byCluster = slotsByCluster(sessions);

    // Expected slots per ISO week (e.g. '2026-W38'), separately for each cluster
    const slotsPerWeek = {};   // cluster → weekKey → count
    const weekSet = new Set();
    for (const [cluster, { slotsPerDate }] of Object.entries(byCluster)) {
      slotsPerWeek[cluster] = {};
      for (const [date, slots] of Object.entries(slotsPerDate)) {
        const key = weekKey(date);
        weekSet.add(key);
        slotsPerWeek[cluster][key] = (slotsPerWeek[cluster][key] || 0) + slots.length;
      }
    }

    // Per-student present counts grouped by week, on working dates only
    const workingDates = Object.keys(byCluster[''].slotsPerDate);
    const agg = workingDates.length
      ? await Attendance.aggregate([
          { $match: { date: { $in: workingDates }, status: { $in: ['present', 'sp'] } } },
          { $group: { _id: { rollNumber: '$rollNumber', week: '$week', year: '$year' }, present: { $sum: 1 } } },
        ])
      : [];
    const presentMap = new Map(agg.map(r =>
      [`${r._id.rollNumber}|${r._id.year}-W${String(r._id.week).padStart(2, '0')}`, r.present]));

    const weeks = [...weekSet].sort();
    const byStudent = {};
    for (const s of students) {
      const perWeek = slotsPerWeek[normalizeCluster(s.cluster)];
      const row = {};
      for (const key of weeks) {
        const total = perWeek[key] || 0;
        if (total) row[key] = { present: Math.min(total, presentMap.get(`${s.rollNumber}|${key}`) || 0), total };
      }
      byStudent[s.rollNumber] = row;
    }

    return NextResponse.json({ weeks, byStudent });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
