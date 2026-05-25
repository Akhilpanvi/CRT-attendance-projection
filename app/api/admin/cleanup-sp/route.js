import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/cleanup-sp
 * Reverts ALL existing SP records to 'absent'.
 * Used as a one-time cleanup after student SP self-marking was disabled.
 * Admins should re-mark legitimate SPs via the Bulk SP upload.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    await connectDB();

    const result = await Attendance.updateMany(
      { status: 'sp' },
      { $set: { status: 'absent', markedAt: new Date() } }
    );

    await logAction(
      session.username,
      'MARK_SP',
      '',
      `Cleanup: reverted ${result.modifiedCount} SP record(s) → absent`
    );

    return NextResponse.json({ success: true, reverted: result.modifiedCount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
