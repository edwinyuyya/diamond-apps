import crypto from 'crypto';
import { cookies } from 'next/headers';

export const adminToken = () =>
  crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || '').update('yot-admin').digest('hex');

export function isAdmin() {
  if (!process.env.ADMIN_PASSWORD) return false;
  const c = cookies().get('yot_admin')?.value;
  if (!c) return false;
  const a = Buffer.from(c), b = Buffer.from(adminToken());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
