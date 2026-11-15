/**
 * Logika jadwal obat murni (tanpa DOM, tanpa dependency).
 *
 * Bentuk dose mengikuti CONTRACT.md 7.2. `buildDosesForDate` menghasilkan dose
 * belum berstatus; `applyDoseLogs` menambahkan `status`.
 */

import {
  addDays,
  formatDateID,
  isValidDateISO,
  isValidTime,
  parseISODate,
  timeToMinutes,
  todayISO
} from './dates.js';

/** Label hari; indeks = `Date#getDay()` (0 = Minggu). */
export const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/** Dosis yang belum dicatat dianggap terlewat setelah 180 menit. */
export const MISSED_GRACE_MINUTES = 180;

const VALID_STATUSES = new Set(['taken', 'skipped', 'missed', 'pending']);
const LOG_STATUSES = new Set(['taken', 'skipped']);

function compareText(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Angka finite > 0, atau fallback. */
function positiveNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

/** `unitsPerDose` default 1 bila tidak diisi/tidak valid. */
function unitsPerDoseOf(med) {
  return positiveNumber(med && med.stock ? med.stock.unitsPerDose : undefined, 1);
}

/**
 * Jam unik & valid dari sebuah medication, urut menaik.
 * Duplikat dibuang agar satu kombinasi obat+tanggal+jam hanya satu dosis.
 */
function normalizedTimes(med) {
  const raw = med && Array.isArray(med.times) ? med.times : [];
  const seen = new Set();
  const times = [];
  for (const time of raw) {
    if (!isValidTime(time) || seen.has(time)) continue;
    seen.add(time);
    times.push(time);
  }
  times.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  return times;
}

/** Normalisasi satu entri `daysOfWeek` menjadi 0..6, atau null bila invalid. */
function normalizeDay(day) {
  if (typeof day === 'number') {
    return Number.isInteger(day) && day >= 0 && day <= 6 ? day : null;
  }
  if (typeof day === 'string' && /^[0-6]$/.test(day)) return Number(day);
  return null;
}

/** Apakah hari ini (`dow`) termasuk `daysOfWeek` (kosong = semua hari)? */
function dayIncluded(med, dow) {
  const days = med && med.daysOfWeek;
  if (!Array.isArray(days) || days.length === 0) return true;
  return days.some((day) => normalizeDay(day) === dow);
}

/**
 * Bangun ISO UTC dari tanggal & jam **lokal**.
 * Input diasumsikan valid.
 */
function localDateTimeToISO(dateISO, time) {
  const [year, month, day] = dateISO.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(2000, month - 1, day, hours, minutes, 0, 0);
  date.setFullYear(year);
  return date.toISOString();
}

/**
 * Obat aktif pada tanggal tertentu?
 * - `active !== false`
 * - tanggal valid
 * - di dalam `startDate`/`endDate` inklusif
 * - `daysOfWeek` (default semua hari bila kosong) memuat hari tersebut
 * - `times` kosong tetap aktif, tetapi tidak menghasilkan dosis
 */
export function isMedicationActiveOn(med, dateISO) {
  if (!med || typeof med !== 'object') return false;
  if (med.active === false) return false;
  if (!isValidDateISO(dateISO)) return false;

  const startDate = isValidDateISO(med.startDate) ? med.startDate : null;
  const endDate = isValidDateISO(med.endDate) ? med.endDate : null;
  if (startDate && dateISO < startDate) return false;
  if (endDate && dateISO > endDate) return false;

  const date = parseISODate(dateISO);
  if (!date) return false;
  return dayIncluded(med, date.getDay());
}

/**
 * Kunci deterministik satu dosis, mis. `2026-11-09T08:00|med_001`.
 */
export function doseKey(medicationId, dateISO, time) {
  return `${dateISO}T${time}|${medicationId}`;
}

/**
 * Dosis terjadwal untuk satu tanggal.
 * Hasil diurutkan `time` lalu `name` (lalu `medicationId` sebagai pemecah
 * seri agar deterministik). `status` belum diisi.
 */
export function buildDosesForDate(medications, dateISO, { profileId = null } = {}) {
  if (!isValidDateISO(dateISO) || !Array.isArray(medications)) return [];

  const doses = [];
  for (const med of medications) {
    if (!med || typeof med !== 'object') continue;
    if (profileId !== null && med.profileId !== profileId) continue;
    if (!isMedicationActiveOn(med, dateISO)) continue;

    const times = normalizedTimes(med);
    const unitsPerDose = unitsPerDoseOf(med);

    for (const time of times) {
      doses.push({
        key: doseKey(med.id, dateISO, time),
        medicationId: med.id,
        profileId: med.profileId ?? null,
        name: med.name ?? '',
        activeIngredient: med.activeIngredient ?? '',
        dose: med.dose ?? '',
        doseUnit: med.doseUnit ?? '',
        time,
        date: dateISO,
        scheduledAt: localDateTimeToISO(dateISO, time),
        unitsPerDose
      });
    }
  }

  doses.sort((a, b) => (
    compareText(a.time, b.time) ||
    compareText(a.name, b.name) ||
    compareText(String(a.medicationId ?? ''), String(b.medicationId ?? ''))
  ));
  return doses;
}

/**
 * Terapkan log dosis ke daftar dose dan tentukan status.
 *
 * - Log `taken`/`skipped` selalu menang atas status turunan waktu. Bila ada
 *   lebih dari satu log untuk kunci yang sama, log terakhir pada array menang.
 * - Tanpa log: `scheduledAt + graceMinutes < now` -> `missed`, selain itu
 *   `pending`.
 * - Fungsi tidak mengubah input; objek dose baru dikembalikan.
 */
export function applyDoseLogs(
  doses,
  doseLogs,
  { now = new Date(), graceMinutes = MISSED_GRACE_MINUTES } = {}
) {
  const list = Array.isArray(doses) ? doses : [];
  const logByKey = new Map();

  if (Array.isArray(doseLogs)) {
    for (const log of doseLogs) {
      if (!log || typeof log !== 'object') continue;
      if (!LOG_STATUSES.has(log.status)) continue;
      if (typeof log.medicationId !== 'string' || log.medicationId === '') continue;
      if (!isValidDateISO(log.date) || !isValidTime(log.time)) continue;
      logByKey.set(doseKey(log.medicationId, log.date, log.time), log.status);
    }
  }

  const nowMs = now instanceof Date && Number.isFinite(now.getTime())
    ? now.getTime()
    : Date.now();
  const grace = typeof graceMinutes === 'number' && Number.isFinite(graceMinutes) && graceMinutes >= 0
    ? graceMinutes
    : MISSED_GRACE_MINUTES;
  const graceMs = grace * 60000;

  return list.map((dose) => {
    if (!dose || typeof dose !== 'object') return dose;

    const key = dose.key || doseKey(dose.medicationId, dose.date, dose.time);
    const logged = logByKey.get(key);
    if (logged) return { ...dose, status: logged };

    const scheduledMs = Date.parse(dose.scheduledAt);
    const status = Number.isFinite(scheduledMs) && scheduledMs + graceMs < nowMs
      ? 'missed'
      : 'pending';
    return { ...dose, status };
  });
}

/**
 * Ringkasan status dosis.
 * `denom = taken + skipped + missed`; `pending` tidak masuk denominator.
 * `percent` bulat 0..100, atau `null` bila denominator 0.
 */
export function summarizeDoses(dosesWithStatus) {
  const summary = { total: 0, taken: 0, skipped: 0, missed: 0, pending: 0 };

  if (Array.isArray(dosesWithStatus)) {
    for (const dose of dosesWithStatus) {
      summary.total += 1;
      const status = dose && VALID_STATUSES.has(dose.status) ? dose.status : 'pending';
      summary[status] += 1;
    }
  }

  const denom = summary.taken + summary.skipped + summary.missed;
  summary.percent = denom > 0 ? Math.round((summary.taken * 100) / denom) : null;
  return summary;
}

/**
 * Dosis pending terdekat dengan `scheduledAt >= from` dalam horizon hari.
 * Horizon inklusif: hari `from` sampai `from + horizonDays`.
 * Kembalikan dose (dengan status) atau `null`.
 */
export function nextDose(
  medications,
  { from = new Date(), horizonDays = 14, profileId = null, doseLogs = [] } = {}
) {
  const fromDate = from instanceof Date && Number.isFinite(from.getTime()) ? from : new Date();
  const horizon = typeof horizonDays === 'number' && Number.isFinite(horizonDays) && horizonDays >= 0
    ? Math.floor(horizonDays)
    : 14;
  const startISO = todayISO(fromDate);
  if (!startISO) return null;

  const fromMs = fromDate.getTime();

  for (let offset = 0; offset <= horizon; offset += 1) {
    const dateISO = addDays(startISO, offset);
    if (!dateISO) break;
    const doses = applyDoseLogs(
      buildDosesForDate(medications, dateISO, { profileId }),
      doseLogs,
      { now: fromDate }
    );
    for (const dose of doses) {
      if (!dose || dose.status !== 'pending') continue;
      const scheduledMs = Date.parse(dose.scheduledAt);
      if (Number.isFinite(scheduledMs) && scheduledMs >= fromMs) return dose;
    }
  }

  return null;
}

/**
 * Ringkasan jadwal untuk ditampilkan.
 * - Semua hari / `daysOfWeek` kosong: `Setiap hari`
 * - Subset hari: `Sen, Rab, Jum` (urut indeks 0..6)
 * - Jam valid diurutkan; tanpa jam, bagian jam dihilangkan.
 * - Rentang tanggal memakai format pendek: `1 Nov 2026–30 Nov 2026`;
 *   hanya `endDate`: `s.d. 30 Nov 2026`; hanya `startDate`: `1 Nov 2026`.
 */
export function formatSchedule(med) {
  if (!med || typeof med !== 'object') return '';

  const rawDays = Array.isArray(med.daysOfWeek) ? med.daysOfWeek : [];
  const days = [...new Set(
    rawDays
      .map((day) => normalizeDay(day))
      .filter((day) => day !== null)
  )].sort((a, b) => a - b);

  const dayText = days.length === 0 || days.length === 7
    ? 'Setiap hari'
    : days.map((day) => DAY_LABELS[day]).join(', ');

  const times = normalizedTimes(med);
  const parts = [dayText];
  if (times.length > 0) parts.push(times.join(', '));

  const startDate = isValidDateISO(med.startDate) ? med.startDate : null;
  const endDate = isValidDateISO(med.endDate) ? med.endDate : null;

  if (startDate && endDate) {
    parts.push(`${formatDateID(startDate, 'short')}–${formatDateID(endDate, 'short')}`);
  } else if (endDate) {
    parts.push(`s.d. ${formatDateID(endDate, 'short')}`);
  } else if (startDate) {
    parts.push(formatDateID(startDate, 'short'));
  }

  return parts.join(' · ');
}
