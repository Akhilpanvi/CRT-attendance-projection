import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    await connectDB();
    const agg = await Attendance.aggregate([
      { $group: {
        _id:     { rollNumber: '$rollNumber', week: '$week', year: '$year' },
        total:   { $sum: 1 },
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'sp']] }, 1, 0] } },
      }},
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]);

    const byStudent = {};
    const weekSet   = new Set();
    for (const r of agg) {
      const key = `${r._id.year}-W${String(r._id.week).padStart(2, '0')}`;
      weekSet.add(key);
      if (!byStudent[r._id.rollNumber]) byStudent[r._id.rollNumber] = {};
      byStudent[r._id.rollNumber][key] = { present: r.present, total: r.total };
    }

    return NextResponse.json({ weeks: [...weekSet].sort(), byStudent });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
