import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import { getSession } from '@/lib/auth';
import { getSessions } from '@/lib/sessions';
import { attachStats } from '@/lib/batchStats';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const threshold = Math.min(100, Math.max(0, parseInt(searchParams.get('threshold') || '85', 10)));

    await connectDB();

    const sessions = await getSessions();
    if (!sessions.length) return NextResponse.json([]);

    const students = await Student.find({}, { __v: 0, createdAt: 0 }).sort({ name: 1 }).lean();
    // Each student's total = sessions of their own cluster; missing records = absent
    const result = (await attachStats(students, sessions, { everyone: true }))
      .filter(s => s.stats.total > 0 && s.stats.pct < threshold)
      .sort((a, b) => a.stats.pct - b.stats.pct);

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
