import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Update from '@/lib/models/Update';

export async function GET() {
  try {
    await connectDB();
    const updates = await Update.find()
      .sort({ pinned: -1, createdAt: -1 })
      .limit(10)
      .lean();
    return NextResponse.json(updates);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
