import { NextResponse } from 'next/server';
import { db, countUsed } from '@/lib/db';
import { isAdmin } from '@/lib/admin';

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
  return NextResponse.json({
    sessions: (sessions || []).map((s) => ({ ...s, used: used[s.id] || 0 })),
    registrations: regs || [],
    recordings: recordings || [],
  });
}

export async function POST(req) {
  if (!isAdmin()) return deny();
  const b = await req.json().catch(() => ({}));
  const sb = db();
  let error;
  if (b.action === 'saveSession') {
    const quota = Math.max(0, parseInt(b.quota, 10) || 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 });
    ({ error } = await sb.from('sessions').upsert({ date: b.date, kind: b.kind === 'online' ? 'online' : 'venue', quota, note: b.note || null, price: parseInt(b.price, 10) > 0 ? parseInt(b.price, 10) : null, is_open: b.is_open !== false }, { onConflict: 'date,kind' }));
  } else if (b.action === 'saveRecording') {
    const price = parseInt(b.price, 10);
    if (!b.title?.trim() || !(price > 0)) return NextResponse.json({ error: 'Judul dan harga wajib diisi' }, { status: 400 });
    const row = { title: b.title.trim(), description: b.description || null, price, access_url: b.access_url || null, is_open: b.is_open !== false };
    ({ error } = b.id ? await sb.from('recordings').update(row).eq('id', b.id) : await sb.from('recordings').insert(row));
  } else if (b.action === 'deleteRecording') {
    ({ error } = await sb.from('recordings').delete().eq('id', b.id));
  } else if (b.action === 'deleteSession') {
    ({ error } = await sb.from('sessions').delete().eq('id', b.id));
  } else if (b.action === 'setStatus' && ['paid', 'cancelled', 'pending'].includes(b.status)) {
    const patch = { status: b.status, paid_at: b.status === 'paid' ? new Date().toISOString() : null };
    if (b.status === 'pending') patch.expires_at = new Date(Date.now() + Number(process.env.HOLD_MINUTES || 180) * 60000).toISOString();
    ({ error } = await sb.from('registrations').update(patch).eq('id', b.id));
  } else return NextResponse.json({ error: 'Aksi tidak dikenal' }, { status: 400 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
