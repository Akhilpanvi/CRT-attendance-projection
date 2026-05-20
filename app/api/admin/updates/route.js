import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Update from '@/lib/models/Update';
import { getSession } from '@/lib/auth';

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
    if (!await adminOnly()) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    const { title, content, type, pinned } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    await connectDB();
    const update = await Update.create({ title: title?.trim(), content: content.trim(), type, pinned });
    return NextResponse.json(update);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    if (!await adminOnly()) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await connectDB();
    await Update.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
