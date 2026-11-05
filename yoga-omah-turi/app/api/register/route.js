import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { BANK, WA } from '@/lib/config';

function normalizeWA(v) {
  let d = String(v || '').replace(/[^\d]/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return /^62\d{8,13}$/.test(d) ? d : null;
}
const fmt = (n) => 'Rp ' + n.toLocaleString('id-ID');
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const tglID = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const wa = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;

function rpcError(error) {
  if (error.message.includes('FULL')) return bad('Maaf, kuota tanggal ini sudah penuh.', 409);
  if (error.message.includes('SESSION_CLOSED')) return bad('Tanggal ini sudah ditutup atau tidak tersedia.', 409);
  return bad('Gagal mendaftar, coba lagi.', 500);
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.fullName || '').trim().replace(/\s+/g, ' ');
  const phone = normalizeWA(body.whatsapp);
  const hold = Number(process.env.HOLD_MINUTES || 180);

  if (name.length < 2 || name.length > 100) return bad('Nama lengkap tidak valid.');
  if (!phone) return bad('Nomor WhatsApp tidak valid.');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return bad('Mode pratinjau: database belum tersambung, jadi pendaftaran belum bisa disimpan.', 503);
  }
  const sb = db();
  let reg, label, date = null;

  if (body.type === 'recording') {
    if (!body.recordingId) return bad('Pilih rekaman dulu.');
    const { data: rec } = await sb.from('recordings').select('title').eq('id', body.recordingId).single();
    if (!rec) return bad('Rekaman tidak ditemukan.', 404);
    const { data, error } = await sb.rpc('create_recording_order', { p_recording: body.recordingId, p_name: name, p_wa: phone, p_hold_minutes: hold });
    if (error) return rpcError(error);
    reg = data; label = `Rekaman: ${rec.title}`;
  } else {
    if (!body.sessionId) return bad('Pilih tanggal dulu.');
    const { data: sess } = await sb.from('sessions').select('price,date,kind').eq('id', body.sessionId).single();
    if (!sess) return bad('Tanggal tidak ditemukan.', 404);
    date = sess.date;
    label = (sess.kind === 'online' ? 'Yoga Online Live' : 'Yoga di Omah Turi') + ' · ' + tglID(sess.date);

    if (!sess.price) {
      // Donasi sukarela: tanpa nominal & kode unik, langsung terdaftar
      const { data, error } = await sb.rpc('create_free_registration', { p_session: body.sessionId, p_name: name, p_wa: phone });
      if (error) return rpcError(error);
      const text = `Halo Admin Harmony of Life, saya sudah mendaftar.\n\nNama: ${data.full_name}\nPesanan: ${label}\nKode: ${data.id.slice(0, 8).toUpperCase()}\n\n(Bukti transfer donasi sukarela saya lampirkan di chat ini.)`;
      return NextResponse.json({ free: true, id: data.id, label, date, bank: BANK, waUrl: wa(text) });
    }

    // Tiket harga tetap: nominal ditentukan server
    const { data, error } = await sb.rpc('create_registration', { p_session: body.sessionId, p_name: name, p_wa: phone, p_donation: sess.price, p_hold_minutes: hold });
    if (error) return rpcError(error);
    reg = data;
  }

  const text =
    `Halo Admin Harmony of Life, saya sudah transfer.\n\n` +
    `Nama: ${reg.full_name}\nPesanan: ${label}\nTotal transfer: ${fmt(reg.total)}\nKode: ${reg.id.slice(0, 8).toUpperCase()}\n\n(bukti transfer saya lampirkan di chat ini)`;

  return NextResponse.json({
    id: reg.id, label, date, isTicket: true, total: reg.total, uniqueCode: reg.unique_code, donation: reg.donation,
    expiresAt: reg.expires_at, bank: BANK, waUrl: wa(text),
  });
}
