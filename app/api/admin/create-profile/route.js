import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/auditLog';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { name, rollNumber, branch, dept, cluster, crtSec, crtRoom, role, permissions, email } = await request.json();
    if (!name?.trim() || !rollNumber?.trim())
      return NextResponse.json({ error: 'Name and registration number are required' }, { status: 400 });

    const roll = rollNumber.trim().toUpperCase();
    await connectDB();

    // Check existing user
    const existing = await User.findOne({ username: roll });
    if (existing) return NextResponse.json({ error: `User ${roll} already exists` }, { status: 409 });

    // Only super-admins (permissions === null) can create other admins
    const isSuperAdmin = session.permissions === null || session.permissions === undefined;
    const effectiveRole = (role === 'admin' && isSuperAdmin) ? 'admin' : 'student';
    if (role === 'admin' && !isSuperAdmin)
      return NextResponse.json({ error: 'Only the main admin can create admin accounts' }, { status: 403 });

    const hash = await bcrypt.hash(roll, 10);

    // Admin permissions: null = full access, array = restricted
    const effectivePerms = effectiveRole === 'admin'
      ? (Array.isArray(permissions) && permissions.length > 0 ? permissions : null)
      : null;

    await Promise.all([
      User.create({
        username:           roll,
        passwordHash:       hash,
        role:               effectiveRole,
        rollNumber:         roll,
        mustChangePassword: true,
        permissions:        effectivePerms,
        email:              effectiveRole === 'admin' ? (email?.trim() || '') : '',
      }),
      effectiveRole === 'student'
        ? Student.findOneAndUpdate(
            { rollNumber: roll },
            { rollNumber: roll, name: name.trim().toUpperCase(), branch, dept, cluster, crtSec, crtRoom },
            { upsert: true, new: true }
          )
        : Promise.resolve(),
    ]);

    logAction(
      session.username, 'CREATE_PROFILE', roll,
      `Created ${effectiveRole} account for ${name.trim().toUpperCase()} (${roll})`
    );

    return NextResponse.json({ success: true, rollNumber: roll, role: effectiveRole, permissions: effectivePerms });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
