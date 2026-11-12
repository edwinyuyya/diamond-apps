import { NextResponse } from 'next/server';
import { COOKIE, cookieOpts, makeToken } from '../../../../lib/session';
import { checkPassword } from '../../../../lib/admin-auth';

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  const r = await checkPassword(password);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 503 });
  if (!r.ok) return NextResponse.json({ error: 'Password salah' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await makeToken(r.ver), cookieOpts);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
