// Sesi login admin: cookie berisi HMAC dari SESSION_SECRET (aman dipakai di middleware/edge)
export const COOKIE = 'tz_admin';

async function hmac(text) {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function makeToken() {
  const exp = Date.now() + 30 * 24 * 3600 * 1000; // 30 hari
  return `${exp}.${await hmac('toyzone-admin.' + exp)}`;
}

export async function verifyToken(token) {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = await hmac('toyzone-admin.' + exp);
  if (good.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < good.length; i++) diff |= good.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export function checkPassword(pw) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real || typeof pw !== 'string' || pw.length !== real.length) return false;
  let diff = 0;
  for (let i = 0; i < real.length; i++) diff |= real.charCodeAt(i) ^ pw.charCodeAt(i);
  return diff === 0;
}

// Untuk endpoint cron: header "Authorization: Bearer <CRON_SECRET>"
export function isCron(req) {
  const s = process.env.CRON_SECRET;
  return !!s && req.headers.get('authorization') === `Bearer ${s}`;
}
