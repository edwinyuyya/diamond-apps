import { createClient } from '@supabase/supabase-js';

export function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// Tanggal hari ini (WIB) format YYYY-MM-DD
export const todayWIB = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

// Hitung kuota terpakai per sesi: sudah bayar + pending yang belum kedaluwarsa
export function countUsed(regs) {
  const now = Date.now();
  const used = {};
  for (const r of regs) {
    if (r.status === 'paid' || (r.status === 'pending' && new Date(r.expires_at).getTime() > now)) {
      used[r.session_id] = (used[r.session_id] || 0) + 1;
    }
  }
  return used;
}
