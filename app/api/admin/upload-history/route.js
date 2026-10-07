import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import Session from '@/lib/models/Session';
import { getSession } from '@/lib/auth';
import { getWeekNumber } from '@/lib/helpers';
import { getSessions } from '@/lib/sessions';
import { dayName } from '@/lib/attendanceCalc';
import { logAction } from '@/lib/auditLog';

async function adminOnly() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}

// Records for one upload: a date, optionally narrowed to one cluster
const scope = (date, cluster) => (cluster ? { date, cluster } : { date });

// GET — one row per uploaded (date, cluster), from the Session collection
export async function GET() {
  try {
    if (!await adminOnly()) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    await connectDB();
    await getSessions(); // rebuilds the Session collection if it is missing

    const agg = await Session.aggregate([
      { $group: {
        _id:        { date: '$date', cluster: '$cluster' },
        slots:      { $sum: 1 },
        students:   { $max: '$students' },
        present:    { $sum: '$present' },
        records:    { $sum: '$students' },
        fileName:   { $last: '$fileName' },
        uploadedBy: { $last: '$uploadedBy' },
        uploadedAt: { $max: '$uploadedAt' },
      }},
      { $sort: { '_id.date': -1, '_id.cluster': 1 } },
    ]);

    return NextResponse.json(agg.map(({ _id, ...r }) => ({
      date: _id.date, cluster: _id.cluster, day: dayName(_id.date), ...r,
    })));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — move an upload to another date
export async function PATCH(request) {
  try {
    const session = await adminOnly();
    if (!session) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    const { fromDate, toDate, cluster = '' } = await request.json();

    if (!fromDate || !toDate)
      return NextResponse.json({ error: 'fromDate and toDate required' }, { status: 400 });
    if (fromDate === toDate)
      return NextResponse.json({ error: 'Dates are the same' }, { status: 400 });

    const week = getWeekNumber(toDate);
    const year = new Date(toDate).getFullYear();

    await connectDB();

    // Check toDate doesn't already have records (would cause unique-index conflicts)
    const existing = await Attendance.countDocuments(scope(toDate, cluster));
    if (existing > 0)
      return NextResponse.json({ error: `${toDate} already has ${existing} records${cluster ? ` for ${cluster}` : ''}. Delete it first or pick a different date.` }, { status: 409 });

    const result = await Attendance.updateMany(scope(fromDate, cluster), { $set: { date: toDate, week, year } });
    await Session.updateMany(scope(fromDate, cluster), { $set: { date: toDate } });

    logAction(session.username, 'EDIT_UPLOAD_DATE', fromDate,
      `Moved ${cluster || 'all'} attendance from ${fromDate} to ${toDate} — ${result.modifiedCount} records`);
    return NextResponse.json({ success: true, updated: result.modifiedCount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — remove all attendance records for a date (optionally one cluster)
export async function DELETE(request) {
  try {
    const session = await adminOnly();
    if (!session) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    const { date, cluster = '' } = await request.json();
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

    await connectDB();
    const result = await Attendance.deleteMany(scope(date, cluster));
    await Session.deleteMany(scope(date, cluster));

    logAction(session.username, 'DELETE_UPLOAD', date,
      `Deleted ${cluster || 'all'} attendance for ${date} — ${result.deletedCount} records`);
    return NextResponse.json({ success: true, deleted: result.deletedCount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
