import { NextResponse } from 'next/server';
import { COOKIE, cookieOpts, makeToken } from '../../../../lib/session';
import { checkPassword, requireAdmin, setPassword } from '../../../../lib/admin-auth';

// Ganti password admin. Semua sesi lain otomatis keluar; sesi ini tetap login.
export async function POST(req) {
  const deny = await requireAdmin(req);
  if (deny) return deny;
  const { current, next } = await req.json().catch(() => ({}));
  const r = await checkPassword(current);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 503 });
  if (!r.ok) return NextResponse.json({ error: 'Password lama salah' }, { status: 400 });
  if (typeof next !== 'string' || next.length < 8) return NextResponse.json({ error: 'Password baru minimal 8 karakter' }, { status: 400 });
  if (next === current) return NextResponse.json({ error: 'Password baru harus berbeda dari yang lama' }, { status: 400 });
  const ver = await setPassword(next);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await makeToken(ver), cookieOpts);
  return res;
}
