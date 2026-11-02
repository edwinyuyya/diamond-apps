// Sesi login admin: cookie berisi HMAC dari SESSION_SECRET (aman dipakai di middleware/edge)
export const COOKIE = 'tz_shop_admin';
export const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * 24 * 3600 };

async function hmac(text) {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Token: <kedaluwarsa>.<versi password>.<tanda tangan>. Versi berubah saat password diganti,
// sehingga semua sesi lama otomatis tidak berlaku (dicek di lib/admin-auth.js).
export async function makeToken(ver = '0') {
  const exp = Date.now() + 30 * 24 * 3600 * 1000; // 30 hari
  return `${exp}.${ver}.${await hmac(`toyzone-shop-admin.${exp}.${ver}`)}`;
}

// Mengembalikan versi password di dalam token kalau tanda tangannya sah, selain itu false
export async function verifyToken(token) {
  if (!token) return false;
  const [exp, ver, sig] = token.split('.');
  if (!exp || !ver || !sig || Number(exp) < Date.now()) return false;
  const good = await hmac(`toyzone-shop-admin.${exp}.${ver}`);
  if (good.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < good.length; i++) diff |= good.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? ver : false;
}
