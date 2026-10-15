import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import StartDateFeedback from '@/lib/models/StartDateFeedback';
import Student from '@/lib/models/Student';

export const dynamic = 'force-dynamic';

/** GET → per-cluster tally of answers about the cluster's first CRT day, plus every "wrong" answer */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  // Every answer, whichever date the student was shown (16 Aug, or their cluster's first day)
  const rows = await StartDateFeedback.find({}).sort({ updatedAt: -1 }).lean();
  const wrong = rows.filter(r => !r.correct);
  const names = new Map((await Student.find({ rollNumber: { $in: rows.map(r => r.rollNumber) } },
    { _id: 0, rollNumber: 1, name: 1, cluster: 1, crtSec: 1 }).lean()).map(s => [s.rollNumber, s]));

  const suggested = {};
  for (const r of wrong) if (r.suggestedDate) suggested[r.suggestedDate] = (suggested[r.suggestedDate] || 0) + 1;

  // One line per (date shown, cluster)
  const groups = new Map();
  for (const r of rows) {
    const cluster = names.get(r.rollNumber)?.cluster || '—';
    const k = `${r.startDate}|${cluster}`;
    const g = groups.get(k) || { startDate: r.startDate, cluster, correct: 0, wrong: 0 };
    r.correct ? g.correct++ : g.wrong++;
    groups.set(k, g);
  }
  const byCluster = [...groups.values()].sort((x, y) => x.startDate.localeCompare(y.startDate) || x.cluster.localeCompare(y.cluster));
  const changed = rows.filter(r => r.history?.length).length;

  return NextResponse.json({
    byCluster,
    changed,
    correct: rows.length - wrong.length,
    wrong: wrong.length,
    suggested: Object.entries(suggested).sort((a, b) => b[1] - a[1]).map(([date, count]) => ({ date, count })),
    responses: wrong.map(r => ({ ...names.get(r.rollNumber), rollNumber: r.rollNumber, shownDate: r.startDate,
      suggestedDate: r.suggestedDate, note: r.note, updatedAt: r.updatedAt })),
  });
}
