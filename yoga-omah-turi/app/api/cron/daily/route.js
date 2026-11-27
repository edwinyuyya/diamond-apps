import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildSummary, hasChat, hasToken, loadData, sendTelegram, todayWIB } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// Dipanggil Vercel Cron tiap hari 21.00 WIB. Vercel mengirim "Authorization: Bearer <CRON_SECRET>".
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasToken() || !hasChat()) return NextResponse.json({ skipped: 'Telegram belum diatur' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ skipped: 'Database belum tersambung' });
  const d = await loadData(db());
  const sent = await sendTelegram(buildSummary(d, todayWIB(), 'Ringkasan harian'));
  return NextResponse.json({ sent });
}
