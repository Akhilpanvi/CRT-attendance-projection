import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { getStudentReport } from '@/lib/studentReport';

export async function GET(request, { params }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const roll = params.rollNumber.toUpperCase();
    if (session.role !== 'admin' && session.role !== 'aprameya' && session.rollNumber !== roll)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    await connectDB();
    const report = await getStudentReport(roll);
    if (!report) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
