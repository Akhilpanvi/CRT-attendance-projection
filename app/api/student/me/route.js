import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { getStudentReport } from '@/lib/studentReport';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'student')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const report = await getStudentReport(session.rollNumber.toUpperCase());
    if (!report) return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
