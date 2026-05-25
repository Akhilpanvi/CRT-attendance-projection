import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AuditLog from '@/lib/models/AuditLog';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function isSuperAdmin(session) {
  return session?.role === 'admin' && (session.permissions === null || session.permissions === undefined);
}

export async function GET(request) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session))
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });

  await connectDB();

  const { searchParams } = new URL(request.url);
  const page    = Math.max(1, parseInt(searchParams.get('page')  || '1'));
  const limit   = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '50')));
  const admin   = searchParams.get('admin') || '';   // filter by admin username (super-admin only)
  const action  = searchParams.get('action') || '';  // filter by action type
  const dateFrom = searchParams.get('from') || '';
  const dateTo   = searchParams.get('to')   || '';

  const filter = {};

  // Non-super-admins can only see their own logs
  if (!isSuperAdmin(session)) {
    filter.admin = session.username;
  } else if (admin) {
    filter.admin = admin;
  }

  if (action) filter.action = action;

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo)   filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  // For super-admin: get list of distinct admin names for the filter dropdown
  const admins = isSuperAdmin(session)
    ? await AuditLog.distinct('admin')
    : [session.username];

  return NextResponse.json({ logs, total, page, limit, admins });
}
