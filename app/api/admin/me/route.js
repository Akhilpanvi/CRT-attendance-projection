import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    username:    session.username,
    permissions: session.permissions ?? null, // null = full access
  });
}
