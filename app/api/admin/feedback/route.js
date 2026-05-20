import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Feedback from '@/lib/models/Feedback';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await getSession(request);
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const feedback = await Feedback.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(feedback);
}

export async function DELETE(request) {
  const session = await getSession(request);
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  await connectDB();
  await Feedback.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
