import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'crt-kl-secret-2024');

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('crt_token')?.value;

  if (pathname.startsWith('/api/auth')) return NextResponse.next();

  const publicRoutes = ['/login', '/reset-password', '/api/updates', '/api/feedback', '/api/weather', '/privacy', '/terms'];
  if (!token) {
    if (publicRoutes.some(r => pathname === r || pathname.startsWith(r))) return NextResponse.next();
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret());

    // Already logged in → redirect to home
    if (pathname === '/login' || pathname === '/') {
      if (payload.role === 'admin')    return NextResponse.redirect(new URL('/admin/upload',  request.url));
      if (payload.role === 'aprameya') return NextResponse.redirect(new URL('/aprameya',      request.url));
      return NextResponse.redirect(new URL('/student', request.url));
    }

    // Block non-admins from all /api/admin/* endpoints at the edge
    if (pathname.startsWith('/api/admin') && payload.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    // Role guards for pages
    if (pathname.startsWith('/admin') && payload.role !== 'admin')
      return NextResponse.redirect(new URL(payload.role === 'aprameya' ? '/aprameya' : '/student', request.url));

    if (pathname.startsWith('/student') && payload.role !== 'student')
      return NextResponse.redirect(new URL(payload.role === 'admin' ? '/admin/upload' : payload.role === 'aprameya' ? '/aprameya' : '/login', request.url));

    if (pathname.startsWith('/aprameya') && payload.role !== 'aprameya')
      return NextResponse.redirect(new URL(payload.role === 'admin' ? '/admin/upload' : '/student', request.url));

    if (payload.mustChangePassword && pathname !== '/change-password')
      return NextResponse.redirect(new URL('/change-password', request.url));

    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete('crt_token');
    return res;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
