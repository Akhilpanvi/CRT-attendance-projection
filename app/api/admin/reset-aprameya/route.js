import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    await connectDB();
    const hash = await bcrypt.hash('Ap2026', 10);

    await User.findOneAndUpdate(
      { username: 'Aprameya' },
      { username: 'Aprameya', passwordHash: hash, role: 'aprameya', mustChangePassword: false },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, message: 'Aprameya password set to Ap2026' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
