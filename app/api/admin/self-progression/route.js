import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Attendance from '@/lib/models/Attendance';
import SelfAttendance from '@/lib/models/SelfAttendance';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    await connectDB();

    const [students, selfRecords, officialStats] = await Promise.all([
      Student.find().sort({ sno: 1, name: 1 }).lean(),
      SelfAttendance.find().sort({ date: 1, slot: 1 }).lean(),
      Attendance.aggregate([
        { $group: {
          _id:     '$rollNumber',
          total:   { $sum: 1 },
          present: { $sum: { $cond: [{ $in: ['$status', ['present', 'sp']] }, 1, 0] } },
        }},
      ]),
    ]);

    const officialMap = {};
    for (const s of officialStats) officialMap[s._id] = s;

    const studentMap = {};
    for (const s of students) studentMap[s.rollNumber] = s;

    // Group self-records by student → date → slots
    const byStudent = {};
    for (const r of selfRecords) {
      if (!byStudent[r.rollNumber]) byStudent[r.rollNumber] = {};
      if (!byStudent[r.rollNumber][r.date]) byStudent[r.rollNumber][r.date] = { present: 0, absent: 0, slots: {} };
      byStudent[r.rollNumber][r.date].slots[r.slot] = r.status;
      if (r.status === 'present') byStudent[r.rollNumber][r.date].present++;
      else byStudent[r.rollNumber][r.date].absent++;
    }

    const result = Object.entries(byStudent).map(([roll, dateMap]) => {
      const stu = studentMap[roll] || { name: roll, rollNumber: roll };
      const off = officialMap[roll] || { total: 0, present: 0 };
      const dates = Object.entries(dateMap)
        .map(([date, d]) => ({ date, present: d.present, absent: d.absent, slots: d.slots }))
        .sort((a, b) => b.date.localeCompare(a.date));

      const selfPresent = dates.reduce((s, d) => s + d.present, 0);
      const selfAbsent  = dates.reduce((s, d) => s + d.absent,  0);
      const selfTotal   = selfPresent + selfAbsent;
      const projTotal   = off.total + selfTotal;
      const projPresent = off.present + selfPresent;
      const projPct     = projTotal > 0 ? Math.round((projPresent / projTotal) * 100) : 0;

      return {
        rollNumber:    stu.rollNumber,
        name:          stu.name,
        branch:        stu.branch  || '',
        crtSec:        stu.crtSec  || '',
        officialTotal:   off.total,
        officialPresent: off.present,
        officialPct:   off.total > 0 ? Math.round((off.present / off.total) * 100) : 0,
        selfPresent,
        selfAbsent,
        selfTotal,
        projTotal,
        projPresent,
        projPct,
        dates,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
