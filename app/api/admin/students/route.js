import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    await connectDB();
    const [students, statsAgg] = await Promise.all([
      Student.find().sort({ sno: 1, name: 1 }).lean(),
      Attendance.aggregate([
        { $group: {
          _id:     '$rollNumber',
          total:   { $sum: 1 },
          present: { $sum: { $cond: [{ $in: ['$status', ['present', 'sp']] }, 1, 0] } },
        }},
      ]),
    ]);

    const statsMap = {};
    for (const s of statsAgg) {
      statsMap[s._id] = {
        total:      s.total,
        present:    s.present,
        absent:     s.total - s.present,
        overallPct: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
      };
    }

    return NextResponse.json(students.map(s => ({
      ...s,
      stats: statsMap[s.rollNumber] || { total: 0, present: 0, absent: 0, overallPct: 0 },
    })));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
