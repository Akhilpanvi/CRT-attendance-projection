import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Feedback from '@/lib/models/Feedback';

export const dynamic = 'force-dynamic';

// Per-IP spam limit, kept in memory only — nothing about the sender is stored
const WINDOW_MS = 60 * 60_000, MAX_PER_WINDOW = 6;
const hits = new Map();

export async function POST(request) {
  try {
    const { message } = await request.json();
    if (!message?.trim()) return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    if (message.trim().length > 1000) return NextResponse.json({ error: 'Message too long (max 1000 characters).' }, { status: 400 });

    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    if (ip) {
      const now = Date.now();
      const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
      if (recent.length >= MAX_PER_WINDOW)
        return NextResponse.json({ error: 'Too many messages — please try again later.' }, { status: 429 });
      recent.push(now); hits.set(ip, recent);
    }

    await connectDB();
    await Feedback.create({ message: message.trim() });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to submit feedback.' }, { status: 500 });
  }
}
