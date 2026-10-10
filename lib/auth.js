import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'crt-kl-secret-2024');

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(secret());
}

export async function getSession() {
  const token = (await cookies()).get('crt_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    await touchLastSeen(payload);
    return payload;
  } catch {
    return null;
  }
}

// Record activity for users who stay signed in on an existing cookie, so
// "last seen" stays accurate between logins. At most one write per user
// every SEEN_THROTTLE_MS per server instance; failures never block a request.
const SEEN_THROTTLE_MS = 5 * 60 * 1000;
if (!global._lastSeenCache) global._lastSeenCache = new Map();

async function touchLastSeen(payload) {
  const id = payload?.userId;
  if (!id) return;
  const now = Date.now();
  if (now - (global._lastSeenCache.get(id) || 0) < SEEN_THROTTLE_MS) return;
  global._lastSeenCache.set(id, now);
  try {
    const { connectDB } = await import('@/lib/mongodb');
    const User = (await import('@/lib/models/User')).default;
    await connectDB();
    await User.updateOne({ _id: id }, { $set: { lastSeenAt: new Date(now) } });
  } catch (e) {
    console.error('[lastSeen] failed:', e.message);
  }
}

export function setTokenCookie(res, token) {
  res.cookies.set('crt_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });
}
