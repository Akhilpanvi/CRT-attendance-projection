import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { computeStatistics } from '@/lib/statistics';
import { CLUSTERS } from '@/lib/attendanceCalc';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/statistics?cluster=ALL|C1|C2
 * Section-wise attendance analysis for the admin Statistics page.
 */
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const want = new URL(request.url).searchParams.get('cluster') || 'ALL';
    const [stats, usage] = await Promise.all([computeStatistics(CLUSTERS.includes(want) ? want : 'ALL'), siteUsage()]);
    return NextResponse.json({ ...stats, usage });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** Student sign-in activity, from User.lastSeenAt (site-wide, ignores cluster) */
async function siteUsage() {
  await connectDB();
  const now = Date.now(), day = 864e5;
  const since = ms => ({ role: 'student', lastSeenAt: { $gte: new Date(now - ms) } });
  const [today, week, ever, pwChanged] = await Promise.all([
    User.countDocuments(since(day)),
    User.countDocuments(since(7 * day)),
    User.countDocuments({ role: 'student', lastSeenAt: { $ne: null } }),
    User.countDocuments({ role: 'student', mustChangePassword: false }),
  ]);
  return { today, week, ever, pwChanged };
}
