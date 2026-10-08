import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { buildSystemPrompt, streamReply } from '@/lib/chatbot';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Per-user limit protects the free API quota (per server instance)
const WINDOW_MS = 10 * 60_000, MAX_IN_WINDOW = 25;
const hits = new Map();
function rateLimited(user) {
  const now = Date.now();
  const list = (hits.get(user) || []).filter(t => now - t < WINDOW_MS);
  if (list.length >= MAX_IN_WINDOW) { hits.set(user, list); return true; }
  list.push(now); hits.set(user, list);
  return false;
}

/**
 * POST /api/chat  { messages: [{ role: 'user'|'model', text }] }  → streamed plain text
 */
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    if (rateLimited(session.username))
      return NextResponse.json({ error: 'You’re sending messages too fast — please wait a few minutes.' }, { status: 429 });

    const { messages } = await request.json().catch(() => ({}));
    if (!Array.isArray(messages) || !messages.length)
      return NextResponse.json({ error: 'No message.' }, { status: 400 });

    const history = messages.slice(-12)
      .filter(m => (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim())
      .map(m => ({ role: m.role, text: m.text.trim().slice(0, 1500) }));
    if (!history.length || history[history.length - 1].role !== 'user')
      return NextResponse.json({ error: 'No message.' }, { status: 400 });

    await connectDB();
    const system = await buildSystemPrompt(session);
    const stream = await streamReply(system, history);
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Something went wrong.' }, { status: 503 });
  }
}
