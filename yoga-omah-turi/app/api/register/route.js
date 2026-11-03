import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

function normalizeWA(v) {
  let d = String(v || '').replace(/[^\d]/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return /^62\d{8,13}$/.test(d) ? d : null;
}
const fmt = (n) => 'Rp ' + n.toLocaleString('id-ID');
const bad = (error, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.fullName || '').trim().replace(/\s+/g, ' ');
  const wa = normalizeWA(body.whatsapp);
  const min = Number(process.env.MIN_DONATION || 1000);
  const hold = Number(process.env.HOLD_MINUTES || 180);
  const isRec = body.type === 'recording';

  if (name.length < 2 || name.length > 100) return bad('Nama lengkap tidak valid.');
  if (!wa) return bad('Nomor WhatsApp tidak valid.');

  const sb = db();
  let reg, label, ticket, date = null;

  if (isRec) {
    if (!body.recordingId) return bad('Pilih rekaman dulu.');
    const { data: rec } = await sb.from('recordings').select('title').eq('id', body.recordingId).single();
    if (!rec) return bad('Rekaman tidak ditemukan.', 404);
    const { data, error } = await sb.rpc('create_recording_order', { p_recording: body.recordingId, p_name: name, p_wa: wa, p_hold_minutes: hold });
    if (error) return bad(error.message.includes('SESSION_CLOSED') ? 'Rekaman ini tidak tersedia.' : 'Gagal memproses, coba lagi.', 500);
    reg = data; ticket = true; label = `Rekaman: ${rec.title}`;
  } else {
    if (!body.sessionId) return bad('Pilih tanggal dulu.');
    const { data: sess } = await sb.from('sessions').select('price,date,kind').eq('id', body.sessionId).single();
    if (!sess) return bad('Tanggal tidak ditemukan.', 404);
    // Harga tetap ditentukan server, bukan input pengguna
    const donation = sess.price ? sess.price : Math.round(Number(body.donation));
    if (!Number.isFinite(donation) || donation < min || donation > 100_000_000) return bad(`Donasi minimal ${fmt(min)}.`);
    const { data, error } = await sb.rpc('create_registration', { p_session: body.sessionId, p_name: name, p_wa: wa, p_donation: donation, p_hold_minutes: hold });
    if (error) {
      if (error.message.includes('FULL')) return bad('Maaf, kuota tanggal ini sudah penuh.', 409);
      if (error.message.includes('SESSION_CLOSED')) return bad('Tanggal ini sudah ditutup.', 409);
      return bad('Gagal mendaftar, coba lagi.', 500);
    }
    reg = data; ticket = !!sess.price; date = sess.date;
    const tgl = new Date(sess.date + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    label = (sess.kind === 'online' ? 'Yoga Online Live' : 'Yoga di Omah Turi') + ' · ' + tgl;
  }

  const text =
    `Halo Admin Harmony of Life, saya sudah transfer.\n\n` +
    `Nama: ${reg.full_name}\nPesanan: ${label}\nTotal transfer: ${fmt(reg.total)}\nKode: ${reg.id.slice(0, 8).toUpperCase()}\n\n(bukti transfer saya lampirkan di chat ini)`;

  return NextResponse.json({
    id: reg.id, label, date, isTicket: ticket, total: reg.total, uniqueCode: reg.unique_code, donation: reg.donation,
    expiresAt: reg.expires_at,
    bank: { name: process.env.BANK_NAME, account: process.env.BANK_ACCOUNT, holder: process.env.BANK_HOLDER },
    waUrl: `https://wa.me/${process.env.WA_NUMBER}?text=${encodeURIComponent(text)}`,
  });
}
