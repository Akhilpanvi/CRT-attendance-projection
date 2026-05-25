import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

function isSuperAdmin(session) {
  return session?.role === 'admin' && (session.permissions === null || session.permissions === undefined);
}

// GET — list all admin accounts
export async function GET() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session))
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });

  await connectDB();
  // Exclude the super-admin's own account — they cannot edit themselves here
  const admins = await User.find({ role: 'admin', username: { $ne: session.username } })
    .select('username email permissions mustChangePassword createdAt lastLoginAt')
    .lean();

  return NextResponse.json(admins.map(a => ({
    username:           a.username,
    email:              a.email || '',
    permissions:        a.permissions,
    mustChangePassword: a.mustChangePassword,
    createdAt:          a.createdAt,
    lastLoginAt:        a.lastLoginAt || null,
    isSelf:             false,
  })));
}

// PATCH — update email or reset password
export async function PATCH(request) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session))
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });

  const { username, action, email, permissions } = await request.json();
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

  await connectDB();
  const user = await User.findOne({ username, role: 'admin' });
  if (!user) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

  if (action === 'reset-password') {
    user.passwordHash       = await bcrypt.hash(username, 10);
    user.mustChangePassword = true;
    await user.save();
    logAction(session.username, 'RESET_PASSWORD', username, `Reset password for admin "${username}"`);
    return NextResponse.json({ success: true, message: `Password reset to "${username}"` });
  }

  if (action === 'update-email') {
    user.email = email?.trim() || '';
    await user.save();
    logAction(session.username, 'UPDATE_EMAIL', username, `Updated email for admin "${username}"`);
    return NextResponse.json({ success: true });
  }

  if (action === 'update-permissions') {
    // null = full access, array = restricted
    user.permissions = Array.isArray(permissions) ? permissions : null;
    if (email !== undefined) user.email = email?.trim() || '';
    await user.save();
    const permDesc = user.permissions === null ? 'full access' : `${user.permissions.length} permissions`;
    logAction(session.username, 'UPDATE_PERMISSIONS', username, `Updated permissions for "${username}" → ${permDesc}`);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// DELETE — remove an admin account
export async function DELETE(request) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session))
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });

  const { username } = await request.json();
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

  // Prevent self-deletion
  if (username === session.username)
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });

  await connectDB();
  const result = await User.deleteOne({ username, role: 'admin' });
  if (result.deletedCount === 0)
    return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

  logAction(session.username, 'DELETE_ADMIN', username, `Deleted admin account "${username}"`);
  return NextResponse.json({ success: true });
}
