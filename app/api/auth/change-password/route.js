import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getSession, signToken, setTokenCookie } from '@/lib/auth';
import { logAction } from '@/lib/auditLog';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { newPassword, currentPassword } = await request.json();
    if (!newPassword || newPassword.length < 6)
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

    await connectDB();
    const user = await User.findById(session.userId);
    if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    // A voluntary change must prove the current password, so a borrowed or
    // left-open session can't lock the owner out. The forced first change
    // happens right after signing in with that password, so it is exempt.
    const forced = !!user.mustChangePassword;
    if (!forced && !(currentPassword && await bcrypt.compare(currentPassword, user.passwordHash))) {
      await logAction(user.username, 'PASSWORD_CHANGE_FAILED', user.rollNumber || '', 'Wrong current password when changing password');
      return NextResponse.json({ error: 'Your current password is not correct.' }, { status: 400 });
    }
    if (await bcrypt.compare(newPassword, user.passwordHash))
      return NextResponse.json({ error: 'The new password must be different from the current one.' }, { status: 400 });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: user._id }, { passwordHash, mustChangePassword: false, resetToken: null, resetTokenExpiry: null });
    await logAction(user.username, 'PASSWORD_CHANGED', user.rollNumber || '',
      forced ? 'Set a new password at first sign-in' : 'Changed password from their account');

    // Re-issue token without mustChangePassword flag
    const token = await signToken({ ...session, mustChangePassword: false });
    const res = NextResponse.json({ success: true, role: session.role });
    setTokenCookie(res, token);
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
