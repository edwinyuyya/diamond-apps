import { NextResponse } from 'next/server';
import { adminToken } from '@/lib/admin';

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: 'Password salah.' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set('yot_admin', adminToken(), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 });
  return res;
}
