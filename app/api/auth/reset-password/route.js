import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password)
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });

    if (password.length < 6)
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

    await connectDB();

    const user = await User.findOne({
      resetToken:       token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user)
      return NextResponse.json({ error: 'Reset link is invalid or has expired' }, { status: 400 });

    user.passwordHash       = await bcrypt.hash(password, 10);
    user.mustChangePassword = false;
    user.resetToken         = null;
    user.resetTokenExpiry   = null;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('reset-password error:', e);
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}
