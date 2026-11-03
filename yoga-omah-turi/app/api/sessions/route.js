import { NextResponse } from 'next/server';
import { db, todayWIB, countUsed } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Jadwal tetap: Kamis = donasi sukarela, Jumat = tiket harga tetap. Dibuat otomatis 8 minggu ke depan.
async function ensureSchedule(sb) {
  const rows = [];
  const start = new Date(todayWIB() + 'T00:00:00Z');
  for (let i = 0; i < 56; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const dow = d.getUTCDay();
    if (dow === 4 || dow === 5) {
      rows.push({
        date: d.toISOString().slice(0, 10),
        quota: Number(process.env.DEFAULT_QUOTA || 20),
        price: dow === 5 ? Number(process.env.TICKET_PRICE || 50000) : null,
      });
    }
  }
  await sb.from('sessions').upsert(rows, { onConflict: 'date', ignoreDuplicates: true });
}

export async function GET() {
  const sb = db();
  await ensureSchedule(sb);
  const { data: sessions, error } = await sb.from('sessions').select('*')
    .gte('date', todayWIB()).eq('is_open', true).order('date');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = sessions.map((s) => s.id);
  const { data: regs } = ids.length
    ? await sb.from('registrations').select('session_id,status,expires_at').in('session_id', ids).neq('status', 'cancelled')
    : { data: [] };
  const used = countUsed(regs || []);
  return NextResponse.json({
    minDonation: Number(process.env.MIN_DONATION || 1000),
    sessions: sessions.map((s) => ({
      id: s.id, date: s.date, note: s.note, quota: s.quota, price: s.price,
      remaining: Math.max(0, s.quota - (used[s.id] || 0)),
    })),
  });
}
