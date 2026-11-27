// Telegram: notifikasi, ringkasan harian, dan perintah bot. Token hanya dibaca di server.
import crypto from 'crypto';
import { KIND_LABEL, KIND_ORDER } from './kinds';

const TZ = 7 * 3600e3; // WIB
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const SHORT = { meditation: 'Meditasi', venue: 'Kelas', online: 'Online' };

export const wibDate = (ts) => new Date(new Date(ts).getTime() + TZ).toISOString().slice(0, 10);
export const todayWIB = () => wibDate(Date.now());
export const addDaysStr = (d, n) => new Date(new Date(d + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
export const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
export function tgl(d, long = false) {
  const [y, m, dd] = d.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, dd)).getUTCDay();
  return long ? `${HARI[dow]}, ${dd} ${BULAN[m - 1]} ${y}` : `${HARI[dow].slice(0, 3)}, ${dd} ${BULAN[m - 1].slice(0, 3)}`;
}

export const hasToken = () => !!process.env.TELEGRAM_BOT_TOKEN;
export const hasChat = () => !!process.env.TELEGRAM_CHAT_ID;
export const webhookSecret = () => crypto.createHash('sha256').update(String(process.env.TELEGRAM_BOT_TOKEN || '')).digest('hex').slice(0, 32);

async function call(method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    cache: 'no-store', signal: AbortSignal.timeout(4000),
  });
  return r.json().catch(() => ({ ok: false, description: 'Balasan Telegram tidak terbaca' }));
}
// Tidak pernah melempar error: kegagalan Telegram tidak boleh mengganggu pendaftaran.
export async function sendTelegram(text, chatId = process.env.TELEGRAM_CHAT_ID) {
  if (!hasToken() || !chatId) return false;
  try { return !!(await call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })).ok; } catch { return false; }
}
export async function setWebhook(url) {
  try { return await call('setWebhook', { url, secret_token: webhookSecret(), allowed_updates: ['message'] }); }
  catch (e) { return { ok: false, description: String(e.message || e) }; }
}

// ---------- model data ----------
export const amountOf = (r) => (r.total > 0 ? r.total : r.received_amount || 0);
export const confirmedAt = (r) => (r.status === 'cancelled' ? null : r.total > 0 ? (r.status === 'paid' ? r.paid_at : null) : r.transferred_at);
const isActive = (r) => r.status === 'paid' || (r.status === 'pending' && new Date(r.expires_at).getTime() > Date.now());

export async function loadData(sb) {
  const [{ data: regs }, { data: sessions }, { data: recs }] = await Promise.all([
    sb.from('registrations').select('*').neq('status', 'cancelled'),
    sb.from('sessions').select('id,date,kind,quota,price,coach'),
    sb.from('recordings').select('id,title'),
  ]);
  const sessById = Object.fromEntries((sessions || []).map((s) => [s.id, s]));
  const recById = Object.fromEntries((recs || []).map((r) => [r.id, r]));
  return { regs: regs || [], sessions: sessions || [], sessById, recById };
}
export function labelOf(r, d) {
  if (r.recording_id) return `Rekaman: ${d.recById[r.recording_id]?.title || '-'}`;
  const s = d.sessById[r.session_id];
  return s ? `${KIND_LABEL[s.kind] || 'Yoga'} · ${tgl(s.date)}` : '-';
}
function stats(d, s) {
  const rs = d.regs.filter((r) => r.session_id === s.id && isActive(r));
  const sudah = rs.filter((r) => confirmedAt(r));
  return { used: rs.length, sudah: sudah.length, belum: rs.filter((r) => !confirmedAt(r)) };
}
const dayConfirmed = (d, date) => d.regs.filter((r) => { const t = confirmedAt(r); return t && wibDate(t) === date; })
  .sort((a, b) => new Date(confirmedAt(a)) - new Date(confirmedAt(b)));
const nominalText = (r) => (r.total === 0 && !r.received_amount ? 'donasi (nominal belum diisi)' : rp(amountOf(r)));

// ---------- pesan ----------
export function buildUpcoming(d, today, limit = 8) {
  const list = d.sessions.filter((s) => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]).slice(0, limit);
  if (!list.length) return '<b>Sesi mendatang</b>\nBelum ada jadwal.';
  return '<b>Sesi mendatang</b>\n' + list.map((s) => {
    const st = stats(d, s);
    return `• ${tgl(s.date)} · ${SHORT[s.kind] || ''}: <b>${st.used}/${s.quota}</b> terdaftar, ${st.sudah} sudah transfer`;
  }).join('\n');
}
export function buildSummary(d, date, title = 'Ringkasan hari ini') {
  const conf = dayConfirmed(d, date);
  const baru = d.regs.filter((r) => wibDate(r.created_at) === date);
  const total = conf.reduce((s, r) => s + amountOf(r), 0);
  const tanpa = conf.filter((r) => r.total === 0 && !r.received_amount).length;
  let m = `📊 <b>${esc(title)}</b>\n<i>${tgl(date, true)}</i>\n\n💰 Pendapatan: <b>${rp(total)}</b>\n✅ Transfer terkonfirmasi: <b>${conf.length}</b> orang\n🆕 Pendaftar baru: <b>${baru.length}</b>`;
  if (tanpa) m += `\n⚠️ ${tanpa} donasi belum diisi nominalnya (isi di halaman admin)`;
  if (conf.length) {
    m += '\n\n<b>Yang transfer</b>';
    conf.slice(0, 40).forEach((r, i) => { m += `\n${i + 1}. ${esc(r.full_name)}: ${nominalText(r)}\n    <i>${esc(labelOf(r, d))}</i>`; });
    if (conf.length > 40) m += `\n… dan ${conf.length - 40} lainnya`;
  }
  return m + '\n\n' + buildUpcoming(d, todayWIB());
}
export function buildBelum(d, today) {
  const end = addDaysStr(today, 7);
  const list = d.sessions.filter((s) => s.date >= today && s.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  let m = '⏳ <b>Terdaftar tapi belum transfer</b> (7 hari ke depan)';
  let ada = false;
  for (const s of list) {
    const { belum } = stats(d, s);
    if (!belum.length) continue;
    ada = true;
    m += `\n\n<b>${tgl(s.date)} · ${SHORT[s.kind] || ''}</b> (${belum.length})\n` + belum.slice(0, 40).map((r) => `• ${esc(r.full_name)}`).join('\n');
  }
  return ada ? m : m + '\n\nSemua yang terdaftar sudah transfer 🎉';
}
export const HELP = `🤖 <b>Perintah</b>\n/ringkasan: pendapatan & yang transfer hari ini\n/kemarin: ringkasan kemarin\n/jadwal: kuota sesi mendatang\n/belum: terdaftar tapi belum transfer\n\nNotifikasi pendaftaran baru dan transfer terkonfirmasi dikirim otomatis, plus ringkasan harian pukul 21.00 WIB.`;

export async function answerCommand(cmd, sb) {
  const c = String(cmd || '').trim().split(/[\s@]/)[0].toLowerCase();
  if (c === '/start' || c === '/bantuan' || c === '/help') return HELP;
  const d = await loadData(sb);
  const today = todayWIB();
  if (c === '/ringkasan' || c === '/hariini') return buildSummary(d, today);
  if (c === '/kemarin') return buildSummary(d, addDaysStr(today, -1), 'Ringkasan kemarin');
  if (c === '/jadwal') return buildUpcoming(d, today, 12);
  if (c === '/belum') return buildBelum(d, today);
  return 'Perintah tidak dikenal. Ketik /bantuan.';
}

// ---------- notifikasi otomatis ----------
export async function notifyRegistration(sb, reg, { label, quota, sessionId }) {
  if (!hasToken() || !hasChat()) return;
  let kuota = '';
  if (sessionId) {
    const { data } = await sb.from('registrations').select('status,expires_at').eq('session_id', sessionId).neq('status', 'cancelled');
    kuota = `\nKuota: <b>${(data || []).filter(isActive).length}/${quota}</b>`;
  }
  const bayar = reg.total > 0 ? `Tiket ${rp(reg.total)}: <i>menunggu transfer</i>` : 'Donasi sukarela';
  await sendTelegram(`🆕 <b>Pendaftaran baru</b>\n${esc(reg.full_name)}\nWA: ${esc(reg.whatsapp)}\n${esc(label)}\n${bayar}${kuota}`);
}
export async function notifyTransfer(sb, reg) {
  if (!hasToken() || !hasChat()) return;
  const d = await loadData(sb);
  const conf = dayConfirmed(d, todayWIB());
  const total = conf.reduce((s, r) => s + amountOf(r), 0);
  await sendTelegram(`💰 <b>Transfer dikonfirmasi</b>\n${esc(reg.full_name)}\n${esc(labelOf(reg, d))}\n<b>${nominalText(reg)}</b>\n\nHari ini: <b>${rp(total)}</b> dari ${conf.length} orang`);
}
