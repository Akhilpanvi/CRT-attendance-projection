import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { name, rollNumber, branch, dept, cluster, crtSec, crtRoom, role } = await request.json();
    if (!name?.trim() || !rollNumber?.trim())
      return NextResponse.json({ error: 'Name and registration number are required' }, { status: 400 });

    const roll = rollNumber.trim().toUpperCase();
    await connectDB();

    // Check existing user
    const existing = await User.findOne({ username: roll });
    if (existing) return NextResponse.json({ error: `User ${roll} already exists` }, { status: 409 });

    const effectiveRole = role === 'admin' ? 'admin' : 'student';
    const hash = await bcrypt.hash(roll, 10);

    await Promise.all([
      User.create({
        username:           roll,
        passwordHash:       hash,
        role:               effectiveRole,
        rollNumber:         roll,
        mustChangePassword: true,
      }),
      effectiveRole === 'student'
        ? Student.findOneAndUpdate(
            { rollNumber: roll },
            { rollNumber: roll, name: name.trim().toUpperCase(), branch, dept, cluster, crtSec, crtRoom },
            { upsert: true, new: true }
          )
        : Promise.resolve(),
    ]);

    return NextResponse.json({ success: true, rollNumber: roll, role: effectiveRole });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
