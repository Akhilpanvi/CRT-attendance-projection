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
      Student.find().sort({ name: 1 }).lean(),
      Attendance.aggregate([
        { $group: {
          _id:     '$rollNumber',
          total:   { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        }},
      ]),
    ]);

    const statsMap = {};
    for (const s of statsAgg) statsMap[s._id] = s;

    const result = students
      .map(s => {
        const st = statsMap[s.rollNumber] || { total: 0, present: 0 };
        const pct = st.total > 0 ? Math.round((st.present / st.total) * 100) : 0;
        return { ...s, stats: { total: st.total, present: st.present, absent: st.total - st.present, pct } };
      })
      .filter(s => s.stats.pct < 85 && s.stats.total > 0)
      .sort((a, b) => a.stats.pct - b.stats.pct);

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
