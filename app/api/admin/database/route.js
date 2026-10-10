import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { buildDbReport } from '@/lib/dbReport';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/admin/database[?users=1]
 * Super-admin only: collections, fields vs. schema, integrity checks and,
 * with users=1, one row per account (no password hashes or reset tokens).
 */
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin' || Array.isArray(session.permissions))
      return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });

    const withUsers = new URL(request.url).searchParams.get('users') === '1';
    return NextResponse.json(await buildDbReport({ withUsers }));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
