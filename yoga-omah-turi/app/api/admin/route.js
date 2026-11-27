import { NextResponse } from 'next/server';
import { db, countUsed } from '@/lib/db';
import { isAdmin } from '@/lib/admin';
import { hasChat, hasToken, notifyTransfer, sendTelegram, setWebhook } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
const deny = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export async function GET() {
  if (!isAdmin()) return deny();
  const sb = db();
  const [{ data: sessions }, { data: regs }, { data: recordings }] = await Promise.all([
    sb.from('sessions').select('*').order('date', { ascending: false }),
    sb.from('registrations').select('*').order('created_at', { ascending: false }),
    sb.from('recordings').select('*').order('created_at', { ascending: false }),
  ]);
  const used = countUsed(regs || []);
  // 'Sudah transfer': tiket = status lunas; donasi sukarela = ditandai admin
  const sudahTransfer = (r) => r.status !== 'cancelled' && (r.total > 0 ? r.status === 'paid' : !!r.transferred_at);
  const transferred = {};
  for (const r of regs || []) if (r.session_id && sudahTransfer(r)) transferred[r.session_id] = (transferred[r.session_id] || 0) + 1;
  return NextResponse.json({
    sessions: (sessions || []).map((s) => ({ ...s, used: used[s.id] || 0, transferred: transferred[s.id] || 0 })),
    registrations: regs || [],
    recordings: recordings || [],
    telegram: { token: hasToken(), chat: hasChat() },
  });
}

export async function POST(req) {
  if (!isAdmin()) return deny();
  const b = await req.json().catch(() => ({}));
  if (b.action === 'telegramSetup') {
    if (!hasToken()) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN belum diisi di Vercel.' }, { status: 400 });
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const r = await setWebhook(`https://${host}/api/telegram`);
    return r.ok ? NextResponse.json({ ok: true, chat: hasChat() }) : NextResponse.json({ error: 'Gagal menyambungkan: ' + (r.description || 'tidak diketahui') }, { status: 502 });
  }
  if (b.action === 'telegramTest') {
    if (!hasToken() || !hasChat()) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID belum lengkap.' }, { status: 400 });
    const sent = await sendTelegram('✅ <b>Tes berhasil</b>\nWebsite Harmony of Life tersambung ke Telegram ini. Ketik /bantuan untuk daftar perintah.');
    return sent ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Pesan tes gagal terkirim. Cek token dan chat ID.' }, { status: 502 });
  }
  const sb = db();
  let error;
  if (b.action === 'saveSession') {
    const quota = Math.max(0, parseInt(b.quota, 10) || 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 });
    ({ error } = await sb.from('sessions').upsert({ date: b.date, kind: ['online', 'meditation'].includes(b.kind) ? b.kind : 'venue', quota, note: b.note || null, coach: b.coach?.trim() || null, price: parseInt(b.price, 10) > 0 ? parseInt(b.price, 10) : null, is_open: b.is_open !== false }, { onConflict: 'date,kind' }));
  } else if (b.action === 'saveRecording') {
    const price = parseInt(b.price, 10);
    if (!b.title?.trim() || !(price > 0)) return NextResponse.json({ error: 'Judul dan harga wajib diisi' }, { status: 400 });
    const row = { title: b.title.trim(), description: b.description || null, price, access_url: b.access_url || null, is_open: b.is_open !== false };
    ({ error } = b.id ? await sb.from('recordings').update(row).eq('id', b.id) : await sb.from('recordings').insert(row));
  } else if (b.action === 'deleteRecording') {
    ({ error } = await sb.from('recordings').delete().eq('id', b.id));
  } else if (b.action === 'deleteSession') {
    ({ error } = await sb.from('sessions').delete().eq('id', b.id));
  } else if (b.action === 'setTransfer') {
    const { data: before } = await sb.from('registrations').select('transferred_at').eq('id', b.id).single();
    const amount = b.value && Number.isFinite(Number(b.amount)) && Number(b.amount) > 0 ? Math.round(Number(b.amount)) : null;
    const { data: row, error: e2 } = await sb.from('registrations')
      .update({ transferred_at: b.value ? new Date().toISOString() : null, received_amount: b.value ? amount : null }).eq('id', b.id).select('*').single();
    error = e2;
    if (!e2 && b.value && !before?.transferred_at) await notifyTransfer(sb, row);
  } else if (b.action === 'setStatus' && ['paid', 'cancelled', 'pending'].includes(b.status)) {
    const patch = { status: b.status, paid_at: b.status === 'paid' ? new Date().toISOString() : null };
    if (b.status === 'pending') patch.expires_at = new Date(Date.now() + Number(process.env.HOLD_MINUTES || 180) * 60000).toISOString();
    const { data: row, error: e3 } = await sb.from('registrations').update(patch).eq('id', b.id).select('*').single();
    error = e3;
    if (!e3 && b.status === 'paid' && row.total > 0) await notifyTransfer(sb, row);
  } else return NextResponse.json({ error: 'Aksi tidak dikenal' }, { status: 400 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
