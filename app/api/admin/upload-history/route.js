import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { getWeekNumber } from '@/lib/helpers';

async function adminOnly() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}

// GET — list all uploaded dates with record counts
export async function GET() {
  try {
    if (!await adminOnly()) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    await connectDB();

    const agg = await Attendance.aggregate([
      { $group: {
        _id:      '$date',
        records:  { $sum: 1 },
        present:  { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        students: { $addToSet: '$rollNumber' },
        slots:    { $addToSet: '$slot' },
      }},
      { $project: {
        date:     '$_id',
        records:  1,
        present:  1,
        students: { $size: '$students' },
        slots:    { $size: '$slots' },
        _id: 0,
      }},
      { $sort: { date: -1 } },
    ]);

    return NextResponse.json(agg);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — change the date of all records for a given date
export async function PATCH(request) {
  try {
    if (!await adminOnly()) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    const { fromDate, toDate } = await request.json();

    if (!fromDate || !toDate)
      return NextResponse.json({ error: 'fromDate and toDate required' }, { status: 400 });
    if (fromDate === toDate)
      return NextResponse.json({ error: 'Dates are the same' }, { status: 400 });

    const week = getWeekNumber(toDate);
    const year = new Date(toDate).getFullYear();

    await connectDB();

    // Check toDate doesn't already have records (would cause unique-index conflicts)
    const existing = await Attendance.countDocuments({ date: toDate });
    if (existing > 0)
      return NextResponse.json({ error: `${toDate} already has ${existing} records. Delete it first or pick a different date.` }, { status: 409 });

    const result = await Attendance.updateMany(
      { date: fromDate },
      { $set: { date: toDate, week, year } }
    );

    return NextResponse.json({ success: true, updated: result.modifiedCount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — remove all attendance records for a date
export async function DELETE(request) {
  try {
    if (!await adminOnly()) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    const { date } = await request.json();
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

    await connectDB();
    const result = await Attendance.deleteMany({ date });
    return NextResponse.json({ success: true, deleted: result.deletedCount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
