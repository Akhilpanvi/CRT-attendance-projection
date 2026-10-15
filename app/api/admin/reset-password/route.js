import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/auditLog';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { rollNumber } = await request.json();
    if (!rollNumber?.trim())
      return NextResponse.json({ error: 'Roll number required' }, { status: 400 });

    const roll = rollNumber.trim().toUpperCase();
    await connectDB();

    const user = await User.findOne({ username: roll });
    if (!user) return NextResponse.json({ error: `No account found for ${roll}` }, { status: 404 });

    const hash = await bcrypt.hash(roll, 10);
    await user.updateOne({ passwordHash: hash, mustChangePassword: true, resetToken: null, resetTokenExpiry: null });
    await logAction(session.username, 'RESET_PASSWORD', roll, `Reset student ${roll}'s password to their roll number`);

    return NextResponse.json({ success: true, rollNumber: roll });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
