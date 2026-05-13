import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'crt-kl-secret-2024');

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('crt_token')?.value;

  // Auth API routes always pass through
  if (pathname.startsWith('/api/auth')) return NextResponse.next();

  if (!token) {
    if (pathname === '/login') return NextResponse.next();
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret());

    // Already logged in → redirect away from login
    if (pathname === '/login' || pathname === '/') {
      const dest = payload.role === 'admin' ? '/admin/upload' : '/student';
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // Role guards
    if (pathname.startsWith('/admin') && payload.role !== 'admin')
      return NextResponse.redirect(new URL('/student', request.url));

    if (pathname.startsWith('/student') && payload.role !== 'student')
      return NextResponse.redirect(new URL('/admin/upload', request.url));

    // Must-change-password guard
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
