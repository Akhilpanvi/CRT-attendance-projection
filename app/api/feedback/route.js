import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Feedback from '@/lib/models/Feedback';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { message } = await request.json();
    if (!message?.trim()) return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    if (message.trim().length > 1000) return NextResponse.json({ error: 'Message too long (max 1000 characters).' }, { status: 400 });

    await connectDB();
    await Feedback.create({ message: message.trim() });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to submit feedback.' }, { status: 500 });
  }
}
