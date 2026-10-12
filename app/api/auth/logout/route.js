import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/auditLog';

export async function POST() {
  const session = await getSession();
  if (session?.role === 'admin' || session?.role === 'aprameya')
    await logAction(session.username, 'LOGOUT', '', 'Signed out');

  const res = NextResponse.json({ success: true });
  res.cookies.delete('crt_token');
  return res;
}
