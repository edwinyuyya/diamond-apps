import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

function normalizeWA(v) {
  let d = String(v || '').replace(/[^\d]/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return /^62\d{8,13}$/.test(d) ? d : null;
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.fullName || '').trim().replace(/\s+/g, ' ');
  const wa = normalizeWA(body.whatsapp);
  const min = Number(process.env.MIN_DONATION || 1000);
  if (!body.sessionId) return NextResponse.json({ error: 'Pilih tanggal dulu.' }, { status: 400 });
  const sb = db();
  const { data: sess } = await sb.from('sessions').select('price').eq('id', body.sessionId).single();
  if (!sess) return NextResponse.json({ error: 'Tanggal tidak ditemukan.' }, { status: 404 });
  // Tiket harga tetap: nominal ditentukan server, bukan input pengguna
  const donation = sess.price ? sess.price : Math.round(Number(body.donation));

  if (name.length < 2 || name.length > 100) return NextResponse.json({ error: 'Nama lengkap tidak valid.' }, { status: 400 });
  if (!wa) return NextResponse.json({ error: 'Nomor WhatsApp tidak valid.' }, { status: 400 });
  if (!Number.isFinite(donation) || donation < min || donation > 100_000_000)
    return NextResponse.json({ error: `Donasi minimal Rp ${min.toLocaleString('id-ID')}.` }, { status: 400 });

  const { data, error } = await sb.rpc('create_registration', {
    p_session: body.sessionId, p_name: name, p_wa: wa, p_donation: donation,
    p_hold_minutes: Number(process.env.HOLD_MINUTES || 180),
  });
  if (error) {
    if (error.message.includes('FULL')) return NextResponse.json({ error: 'Maaf, kuota tanggal ini sudah penuh.' }, { status: 409 });
    if (error.message.includes('SESSION_CLOSED')) return NextResponse.json({ error: 'Tanggal ini sudah ditutup.' }, { status: 409 });
    return NextResponse.json({ error: 'Gagal mendaftar, coba lagi.' }, { status: 500 });
  }
  const { data: session } = await sb.from('sessions').select('date').eq('id', data.session_id).single();

  const fmt = (n) => 'Rp ' + n.toLocaleString('id-ID');
  const tgl = new Date(session.date + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const text =
    `Halo Admin YOGA OMAH TURI, saya sudah transfer.\n\n` +
    `Nama: ${data.full_name}\nTanggal: ${tgl}\nTotal transfer: ${fmt(data.total)}\nKode: ${data.id.slice(0, 8).toUpperCase()}\n\n(bukti transfer saya lampirkan di chat ini)`;

  return NextResponse.json({
    id: data.id, isTicket: !!sess.price, total: data.total, uniqueCode: data.unique_code, donation: data.donation,
    expiresAt: data.expires_at, date: session.date,
    bank: { name: process.env.BANK_NAME, account: process.env.BANK_ACCOUNT, holder: process.env.BANK_HOLDER },
    waUrl: `https://wa.me/${process.env.WA_NUMBER}?text=${encodeURIComponent(text)}`,
  });
}
