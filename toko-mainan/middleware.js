import { NextResponse } from 'next/server';
import { COOKIE, verifyToken } from './lib/session';

// Halaman & API admin wajib login
export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin/login') || pathname.startsWith('/api/admin/login')) return NextResponse.next();
  if (await verifyToken(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  return NextResponse.redirect(new URL('/admin/login', req.url));
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
