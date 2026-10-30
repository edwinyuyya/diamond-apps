import { NextResponse } from 'next/server';
import { COOKIE, verifyToken } from './lib/session';

// Semua halaman & API butuh login, kecuali login, gambar postingan (diakses Instagram) dan cron
const PUBLIC = [/^\/login/, /^\/api\/login/, /^\/api\/image\//, /^\/api\/cron\//, /^\/_next\//, /^\/favicon/];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  if (await verifyToken(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  return NextResponse.redirect(new URL('/login', req.url));
}
