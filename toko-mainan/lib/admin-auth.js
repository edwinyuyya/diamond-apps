// Password admin: bawaan dari env ADMIN_PASSWORD, bisa diganti dari /admin/pengaturan.
// Password baru disimpan sebagai hash scrypt (bukan teks asli) di Netlify Blobs.
import 'server-only';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { getJSON, setJSON } from './blobs';
import { COOKIE, verifyToken } from './session';

const STORE = 'toyzone';
const KEY = 'admin-auth';

// null = belum pernah diganti (pakai env); undefined = gagal dibaca
async function getAuth() {
  return getJSON(STORE, KEY);
}

const same = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function checkPassword(pw) {
  if (typeof pw !== 'string' || !pw) return { ok: false };
  const auth = await getAuth();
  if (auth === undefined) return { ok: false, error: 'Server sedang sibuk, coba lagi sebentar' };
  if (auth?.hash) {
    const hash = scryptSync(pw, auth.salt, 32).toString('hex');
    return { ok: same(hash, auth.hash), ver: auth.ver };
  }
  const real = process.env.ADMIN_PASSWORD;
  return { ok: !!real && same(pw, real), ver: '0' };
}

export async function setPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  const ver = Date.now().toString(36);
  await setJSON(STORE, KEY, { hash: scryptSync(pw, salt, 32).toString('hex'), salt, ver, changedAt: new Date().toISOString() });
  return ver;
}

// Dipakai di semua API admin: tolak kalau sesi tidak sah atau dari sebelum password diganti
export async function requireAdmin(req) {
  const ver = await verifyToken(req.cookies.get(COOKIE)?.value);
  const auth = ver ? await getAuth() : null;
  const current = auth?.ver || '0';
  if (!ver || auth === undefined || ver !== current) {
    return NextResponse.json({ error: 'Sesi berakhir, silakan login lagi' }, { status: 401 });
  }
  return null;
}
