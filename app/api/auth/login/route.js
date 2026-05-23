import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { signToken, setTokenCookie } from '@/lib/auth';
import { logAction } from '@/lib/auditLog';

export async function POST(request) {
  try {
    await connectDB();
    const { username, password } = await request.json();
    if (!username || !password)
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });

    const user = await User.findOne({ username: username.trim() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });

    // Track last login and log for admin accounts
    if (user.role === 'admin' || user.role === 'aprameya') {
      user.lastLoginAt = new Date();
      await user.save();
      logAction(user.username, 'LOGIN', '', 'Logged in to admin panel');
    }

    const token = await signToken({
      userId:             user._id.toString(),
      username:           user.username,
      role:               user.role,
      rollNumber:         user.rollNumber,
      mustChangePassword: user.mustChangePassword,
      permissions:        user.permissions ?? null,
    });

    const res = NextResponse.json({
      role:               user.role,
      username:           user.username,
      rollNumber:         user.rollNumber,
      mustChangePassword: user.mustChangePassword,
    });
    setTokenCookie(res, token);
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
