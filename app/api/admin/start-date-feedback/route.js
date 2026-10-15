import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import StartDateFeedback from '@/lib/models/StartDateFeedback';
import Student from '@/lib/models/Student';
import { CLUSTERS, clusterStartDate } from '@/lib/attendanceCalc';

export const dynamic = 'force-dynamic';

/** GET → per-cluster tally of answers about the cluster's first CRT day, plus every "wrong" answer */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const starts = Object.fromEntries(CLUSTERS.map(c => [c, clusterStartDate(c)]));
  const rows = await StartDateFeedback.find({ startDate: { $in: Object.values(starts) } }).sort({ updatedAt: -1 }).lean();
  const wrong = rows.filter(r => !r.correct);
  const names = new Map((await Student.find({ rollNumber: { $in: rows.map(r => r.rollNumber) } },
    { _id: 0, rollNumber: 1, name: 1, cluster: 1, crtSec: 1 }).lean()).map(s => [s.rollNumber, s]));

  const suggested = {};
  for (const r of wrong) if (r.suggestedDate) suggested[r.suggestedDate] = (suggested[r.suggestedDate] || 0) + 1;

  const byCluster = CLUSTERS.map(c => {
    const mine = rows.filter(r => names.get(r.rollNumber)?.cluster === c && r.startDate === starts[c]);
    return { cluster: c, startDate: starts[c], correct: mine.filter(r => r.correct).length, wrong: mine.filter(r => !r.correct).length };
  });

  return NextResponse.json({
    byCluster,
    correct: rows.length - wrong.length,
    wrong: wrong.length,
    suggested: Object.entries(suggested).sort((a, b) => b[1] - a[1]).map(([date, count]) => ({ date, count })),
    responses: wrong.map(r => ({ ...names.get(r.rollNumber), rollNumber: r.rollNumber,
      suggestedDate: r.suggestedDate, note: r.note, updatedAt: r.updatedAt })),
  });
}
