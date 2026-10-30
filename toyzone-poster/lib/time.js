// WIB = UTC+7 (tanpa daylight saving)
const WIB = 7 * 3600 * 1000;

// Senin minggu depan (relatif ke `now`), format YYYY-MM-DD (tanggal WIB)
export function nextWeekStart(now = new Date()) {
  const w = new Date(now.getTime() + WIB);
  const dow = w.getUTCDay() || 7; // 1..7
  w.setUTCDate(w.getUTCDate() + (8 - dow));
  return w.toISOString().slice(0, 10);
}

// Tanggal-jam WIB → objek Date (UTC)
export function wibToDate(ymd, hour, minute = 0) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - 7, minute));
}

export function addDays(ymd, n) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function fmtWIB(iso, opts = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) {
  return new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', ...opts });
}
