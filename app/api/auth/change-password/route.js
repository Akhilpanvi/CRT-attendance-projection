import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getSession, signToken, setTokenCookie } from '@/lib/auth';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { newPassword } = await request.json();
    if (!newPassword || newPassword.length < 6)
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

    await connectDB();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(session.userId, { passwordHash, mustChangePassword: false });

    // Re-issue token without mustChangePassword flag
    const token = await signToken({ ...session, mustChangePassword: false });
    const res = NextResponse.json({ success: true });
    setTokenCookie(res, token);
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
