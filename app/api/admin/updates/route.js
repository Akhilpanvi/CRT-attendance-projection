import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Update from '@/lib/models/Update';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

async function adminOnly() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}

export async function GET() {
  try {
    if (!await adminOnly()) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    await connectDB();
    const updates = await Update.find().sort({ pinned: -1, createdAt: -1 }).lean();
    return NextResponse.json(updates);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await adminOnly();
    if (!session) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    const { title, content, category, pinned } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    await connectDB();
    const update = await Update.create({ title: title?.trim(), content: content.trim(), category, pinned });
    await logAction(session.username, 'NOTICE', title?.trim() || '', `Posted a notice${pinned ? ' (pinned)' : ''}: “${(title?.trim() || content.trim()).slice(0, 80)}”`);
    return NextResponse.json(update);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    if (!await adminOnly()) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    const { id, pinned } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await connectDB();
    const update = await Update.findByIdAndUpdate(id, { $set: { pinned } }, { new: true });
    return NextResponse.json(update);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await adminOnly();
    if (!session) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await connectDB();
    const gone = await Update.findByIdAndDelete(id).lean();
    if (gone) await logAction(session.username, 'NOTICE', gone.title || '', `Deleted the notice “${(gone.title || gone.content).slice(0, 80)}”`);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
