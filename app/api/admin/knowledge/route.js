import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import KnowledgeEntry from '@/lib/models/KnowledgeEntry';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

async function adminOnly() {
  const s = await getSession();
  return s && s.role === 'admin' ? s : null;
}

const AUDIENCES = ['all', 'students', 'admins'];
function clean(body) {
  const out = {};
  if (body.title !== undefined) out.title = String(body.title).trim().slice(0, 120);
  if (body.content !== undefined) out.content = String(body.content).trim().slice(0, 2000);
  if (body.audience !== undefined) out.audience = AUDIENCES.includes(body.audience) ? body.audience : 'all';
  if (body.active !== undefined) out.active = !!body.active;
  return out;
}

// GET — all entries, newest first
export async function GET() {
  if (!await adminOnly()) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  await connectDB();
  return NextResponse.json(await KnowledgeEntry.find().sort({ updatedAt: -1 }).lean());
}

// POST — add an entry { title, content, audience }
export async function POST(request) {
  const session = await adminOnly();
  if (!session) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const data = clean(await request.json());
  if (!data.title || !data.content) return NextResponse.json({ error: 'Title and answer are required' }, { status: 400 });
  await connectDB();
  const doc = await KnowledgeEntry.create({ ...data, updatedBy: session.username, updatedAt: new Date() });
  logAction(session.username, 'BOT_KNOWLEDGE', doc.title, `Added chatbot knowledge "${doc.title}"`);
  return NextResponse.json(doc);
}

// PATCH — edit { id, ...fields }
export async function PATCH(request) {
  const session = await adminOnly();
  if (!session) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const body = await request.json();
  await connectDB();
  const doc = await KnowledgeEntry.findByIdAndUpdate(body.id, { ...clean(body), updatedBy: session.username, updatedAt: new Date() }, { new: true });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  logAction(session.username, 'BOT_KNOWLEDGE', doc.title, `Edited chatbot knowledge "${doc.title}"`);
  return NextResponse.json(doc);
}

// DELETE — { id }
export async function DELETE(request) {
  const session = await adminOnly();
  if (!session) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const { id } = await request.json();
  await connectDB();
  const doc = await KnowledgeEntry.findByIdAndDelete(id);
  if (doc) logAction(session.username, 'BOT_KNOWLEDGE', doc.title, `Deleted chatbot knowledge "${doc.title}"`);
  return NextResponse.json({ success: true });
}
