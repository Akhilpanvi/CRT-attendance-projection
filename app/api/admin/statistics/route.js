import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { computeStatistics } from '@/lib/statistics';
import { CLUSTERS } from '@/lib/attendanceCalc';

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
    return NextResponse.json(await computeStatistics(CLUSTERS.includes(want) ? want : 'ALL'));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
