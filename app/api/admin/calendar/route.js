import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CalendarDay from '@/lib/models/CalendarDay';
import Session from '@/lib/models/Session';
import { getSession } from '@/lib/auth';
import { getSessions } from '@/lib/sessions';
import { buildCalendar } from '@/lib/calendar';
import { CLUSTERS, TRAINING_START, clusterForDate } from '@/lib/attendanceCalc';
import { logAction } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function adminOnly() {
  const session = await getSession();
  return session && session.role === 'admin' ? session : null;
}

/** 'C1' | 'C2' | 'ALL' → ['C1'] | ['C2'] | ['C1','C2'] */
const clustersOf = c => (c === 'ALL' ? CLUSTERS : CLUSTERS.includes(c) ? [c] : []);

// GET — every scheduled day of both clusters with its status
export async function GET() {
  try {
    if (!await adminOnly()) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    await connectDB();
    const [sessions, holidays] = await Promise.all([getSessions(), CalendarDay.find().lean()]);
    const days = buildCalendar(sessions, holidays);
    const count = s => days.filter(d => d.status === s && !d.future).length;
    return NextResponse.json({
      days,
      summary: { uploaded: count('uploaded'), holiday: count('holiday'), pending: count('pending') },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — mark a day as holiday / no class.  Body: { date, cluster: 'C1'|'C2'|'ALL', reason }
export async function POST(request) {
  try {
    const session = await adminOnly();
    if (!session) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    const { date, cluster, reason = '' } = await request.json();
    // "Both" only applies to clusters that actually have CRT on that weekday
    const scheduled = date ? clusterForDate(date) : '';
    const clusters = cluster === 'ALL' && scheduled ? [scheduled] : clustersOf(cluster);
    if (!ISO_DATE.test(date || '') || date < TRAINING_START)
      return NextResponse.json({ error: 'Pick a valid date on or after the training start' }, { status: 400 });
    if (!clusters.length) return NextResponse.json({ error: 'Pick a cluster' }, { status: 400 });

    await connectDB();
    const uploaded = await Session.distinct('cluster', { date, cluster: { $in: clusters } });
    if (uploaded.length)
      return NextResponse.json({ error: `${date} already has attendance uploaded for ${uploaded.join(', ')}. Delete that upload first.` }, { status: 409 });

    const text = String(reason).trim().slice(0, 120);
    await CalendarDay.bulkWrite(clusters.map(c => ({ updateOne: {
      filter: { date, cluster: c },
      update: { $set: { type: 'holiday', reason: text, setBy: session.username, setAt: new Date() } },
      upsert: true,
    }})));

    logAction(session.username, 'MARK_HOLIDAY', date, `Marked ${date} (${clusters.join('+')}) as holiday${text ? ` — ${text}` : ''}`);
    return NextResponse.json({ success: true, clusters });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — undo a holiday.  Body: { date, cluster: 'C1'|'C2'|'ALL' }
export async function DELETE(request) {
  try {
    const session = await adminOnly();
    if (!session) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    const { date, cluster } = await request.json();
    const clusters = clustersOf(cluster);
    if (!date || !clusters.length) return NextResponse.json({ error: 'date and cluster required' }, { status: 400 });

    await connectDB();
    const r = await CalendarDay.deleteMany({ date, cluster: { $in: clusters } });
    logAction(session.username, 'MARK_HOLIDAY', date, `Removed holiday on ${date} (${clusters.join('+')})`);
    return NextResponse.json({ success: true, removed: r.deletedCount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
