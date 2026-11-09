/**
 * Utilitas tanggal & waktu murni (tanpa DOM, tanpa dependency).
 *
 * Konvensi:
 * - Tanggal kalender disimpan sebagai string `YYYY-MM-DD` **lokal**.
 * - Jam disimpan sebagai string `HH:mm` 24 jam.
 * - Timestamp disimpan sebagai ISO 8601 UTC (`Date#toISOString`).
 * - `parseISODate` selalu mengembalikan Date pada pukul 12:00 lokal agar aman
 *   terhadap pergeseran zona waktu dan DST.
 *
 * Fungsi yang menerima input tidak valid mengembalikan nilai netral
 * (`''`, `null`, atau `false`) dan tidak pernah melempar error.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MS = 86400000;

const DAY_NAMES_ID = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/** Dua digit dengan nol di depan. */
function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Objek Date yang valid? */
function isUsableDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime());
}

/** Pisahkan `YYYY-MM-DD` menjadi komponen angka tanpa memvalidasi. */
function splitISO(iso) {
  const match = DATE_RE.exec(iso);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}

/**
 * Bangun Date lokal pada tanggal tertentu. Memakai `setFullYear` agar tahun
 * 0000–0099 tidak ditafsirkan sebagai 1900+ oleh konstruktor Date.
 * Mengembalikan null bila tanggal tidak ada (mis. 30 Februari).
 */
function buildLocalDate(year, month, day, hours = 12, minutes = 0) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  const date = new Date(2000, month - 1, day, hours, minutes, 0, 0);
  date.setFullYear(year);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hours ||
    date.getMinutes() !== minutes
  ) {
    return null;
  }
  return date;
}

/**
 * `Date` -> `YYYY-MM-DD` menurut komponen tanggal **lokal**.
 * Date tidak valid -> `''`.
 */
export function toISODate(date) {
  if (!isUsableDate(date)) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Tanggal lokal hari ini `YYYY-MM-DD`.
 * @param {Date} [now=new Date()]
 */
export function todayISO(now = new Date()) {
  return toISODate(now);
}

/**
 * `YYYY-MM-DD` -> Date lokal pukul 12:00.
 * Input tidak valid -> `null`.
 */
export function parseISODate(iso) {
  if (typeof iso !== 'string') return null;
  const parts = splitISO(iso);
  if (!parts) return null;
  return buildLocalDate(parts.year, parts.month, parts.day, 12, 0);
}

/**
 * Tanggal `YYYY-MM-DD` valid dan benar-benar ada di kalender?
 * Tahun harus 4 digit; `2026-02-30` ditolak.
 */
export function isValidDateISO(iso) {
  return parseISODate(iso) !== null;
}

/**
 * Jam `HH:mm` valid (00:00–23:59)?
 */
export function isValidTime(hhmm) {
  return typeof hhmm === 'string' && TIME_RE.test(hhmm);
}

/**
 * `HH:mm` -> menit sejak tengah malam (0..1439).
 * Input tidak valid -> `null`.
 */
export function timeToMinutes(hhmm) {
  if (!isValidTime(hhmm)) return null;
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Menit sejak tengah malam -> `HH:mm`.
 * Nilai dibungkus ke rentang 0..1439 (mis. 1440 -> `00:00`).
 * Input bukan angka finite -> `null`.
 */
export function minutesToTime(minutes) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return null;
  let total = Math.trunc(minutes) % 1440;
  if (total < 0) total += 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

/**
 * Tambah `n` hari pada tanggal kalender (boleh negatif).
 * Input tanggal/n tidak valid -> `''`.
 */
export function addDays(dateISO, n) {
  const base = parseISODate(dateISO);
  if (!base || !Number.isInteger(n)) return '';
  base.setDate(base.getDate() + n);
  return toISODate(base);
}

/**
 * Selisih hari `to - from` (integer). Dihitung memakai komponen kalender
 * dalam UTC agar bebas DST. Input tidak valid -> `null`.
 */
export function diffDays(fromISO, toISO) {
  const from = splitISO(fromISO);
  const to = splitISO(toISO);
  if (!from || !to || !isValidDateISO(fromISO) || !isValidDateISO(toISO)) return null;
  const a = Date.UTC(from.year, from.month - 1, from.day);
  const b = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((b - a) / DAY_MS);
}

/**
 * Awal minggu untuk tanggal tertentu. `weekStartsOn` 0=Minggu, 1=Senin.
 * Default Senin. Input tidak valid -> `''`.
 */
export function startOfWeek(dateISO, weekStartsOn = 1) {
  const date = parseISODate(dateISO);
  if (!date) return '';
  const firstDay = Number.isInteger(weekStartsOn) && weekStartsOn >= 0 && weekStartsOn <= 6
    ? weekStartsOn
    : 1;
  const offset = (date.getDay() - firstDay + 7) % 7;
  date.setDate(date.getDate() - offset);
  return toISODate(date);
}

/** Akhir minggu (awal + 6 hari). Input tidak valid -> `''`. */
export function endOfWeek(dateISO, weekStartsOn = 1) {
  const start = startOfWeek(dateISO, weekStartsOn);
  if (!start) return '';
  return addDays(start, 6);
}

/**
 * Nomor minggu ISO 8601 (minggu dimulai Senin; minggu 1 memuat Kamis pertama).
 * @returns {{year:number, week:number}|null}
 */
export function isoWeekNumber(dateISO) {
  const parts = splitISO(dateISO);
  if (!parts || !isValidDateISO(dateISO)) return null;

  // Kamis pada minggu yang sama menentukan tahun & nomor minggu ISO.
  const target = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const dayNr = (target.getUTCDay() + 6) % 7; // Senin = 0
  target.setUTCDate(target.getUTCDate() - dayNr + 3);

  const isoYear = target.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);

  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return { year: isoYear, week };
}

/**
 * Kunci minggu ISO, mis. `2026-W45`.
 * Input tidak valid -> `''`.
 */
export function weekKey(dateISO) {
  const info = isoWeekNumber(dateISO);
  if (!info) return '';
  return `${info.year}-W${pad2(info.week)}`;
}

/**
 * Format tanggal Indonesia.
 * @param {'long'|'short'|'numeric'} [style='long']
 *   long    -> `9 November 2026`
 *   short   -> `9 Nov 2026`
 *   numeric -> `09/11/2026`
 * Input tidak valid -> `''`. Style tak dikenal memakai `long`.
 */
export function formatDateID(dateISO, style = 'long') {
  const date = parseISODate(dateISO);
  if (!date) return '';

  const presets = {
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    short: { day: 'numeric', month: 'short', year: 'numeric' },
    numeric: { day: '2-digit', month: '2-digit', year: 'numeric' }
  };
  const options = presets[style] || presets.long;

  try {
    return new Intl.DateTimeFormat('id-ID', options).format(date);
  } catch {
    return '';
  }
}

/**
 * `Date` -> `9 November 2026, 08.05` (waktu lokal).
 * Input tidak valid -> `''`.
 */
export function formatDateTimeID(date) {
  if (!isUsableDate(date)) return '';
  const datePart = formatDateID(toISODate(date), 'long');
  if (!datePart) return '';
  return `${datePart}, ${pad2(date.getHours())}.${pad2(date.getMinutes())}`;
}

/**
 * Nama hari Indonesia, mis. `Senin`.
 * Input tidak valid -> `''`.
 */
export function dayNameID(dateISO) {
  const date = parseISODate(dateISO);
  if (!date) return '';
  return DAY_NAMES_ID[date.getDay()];
}

/**
 * Ukuran berkas dengan satuan biner (1 KB = 1024 B).
 * Desimal maksimal satu angka dan memakai koma (`1,2 MB`);
 * nilai bulat tidak diberi desimal (`850 KB`).
 * Input bukan angka finite >= 0 -> `''`.
 */
export function formatBytes(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return '';

  let value = n;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  if (unitIndex === 0) {
    return `${Math.round(value)} B`;
  }

  let rounded = Math.round(value * 10) / 10;
  // Pembulatan bisa menjadi 1024 (mis. 1048575 B); naikkan satu satuan.
  if (rounded >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    unitIndex += 1;
    rounded = Math.round((value / 1024) * 10) / 10;
  }
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace('.', ',');
  return `${text} ${BYTE_UNITS[unitIndex]}`;
}
