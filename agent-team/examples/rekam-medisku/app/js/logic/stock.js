/**
 * Simulasi stok & prediksi tebus ulang (murni, tanpa DOM/dependency).
 *
 * Asumsi yang didokumentasikan:
 * - Satuan waktu adalah hari kalender lokal `YYYY-MM-DD`.
 * - `times` yang tidak valid diabaikan dan duplikat jam dihitung sekali,
 *   sama seperti `buildDosesForDate`.
 * - `unitsPerDose` tidak valid/<= 0 memakai default 1 (validasi model
 *   seharusnya sudah menolak nilai seperti itu).
 * - `refillReminderDays` tidak valid/missing memakai default 3 (default model).
 * - Pembulatan `dosesPerDay` dan `unitsPerDay`: 2 desimal.
 * - Simulasi berhenti pada kekurangan pertama; dosis yang tidak sempat
 *   diminum karena obat berakhir (`endDate`) tidak dianggap kehabisan stok.
 */

import { addDays, diffDays, isValidDateISO, isValidTime, todayISO } from './dates.js';
import { isMedicationActiveOn } from './schedule.js';

const DEFAULT_REFILL_REMINDER_DAYS = 3;

function round2(value) {
  return Math.round(value * 100) / 100;
}

/** Angka finite > 0 atau fallback. */
function positiveNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

/** Jumlah jam unik & valid pada `med.times`. */
function validTimesCount(med) {
  const raw = med && Array.isArray(med.times) ? med.times : [];
  return new Set(raw.filter((time) => isValidTime(time))).size;
}

function unitsPerDoseOf(med) {
  return positiveNumber(med && med.stock ? med.stock.unitsPerDose : undefined, 1);
}

function refillReminderDaysOf(med) {
  const days = med ? med.refillReminderDays : undefined;
  return typeof days === 'number' && Number.isInteger(days) && days >= 0
    ? days
    : DEFAULT_REFILL_REMINDER_DAYS;
}

/**
 * Rata-rata dosis/hari untuk 7 hari ke depan (termasuk hari ini),
 * dibulatkan 2 desimal.
 */
function averageDosesPerDay(med, today) {
  const timesCount = validTimesCount(med);
  let total = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    const dateISO = addDays(today, offset);
    if (dateISO && isMedicationActiveOn(med, dateISO)) total += timesCount;
  }
  return round2(total / 7);
}

/**
 * Simulasikan kapan stok obat habis.
 *
 * @param {object} med
 * @param {object} [options]
 * @param {string} [options.today=todayISO()]
 * @param {number} [options.maxDays=365] horizon inklusif (offset 0..maxDays)
 * @returns {object} bentuk sesuai CONTRACT.md 7.4
 */
export function simulateStockOut(med, { today = todayISO(), maxDays = 365 } = {}) {
  const medicationId = med && med.id != null ? med.id : null;
  const name = med && med.name != null ? med.name : '';
  const stock = med && med.stock && typeof med.stock === 'object' ? med.stock : {};
  const remaining = stock.remaining;
  const unit = stock.unit ?? null;

  // 1. Stok tidak dilacak bila remaining bukan angka finite >= 0.
  if (typeof remaining !== 'number' || !Number.isFinite(remaining) || remaining < 0) {
    return {
      tracked: false,
      medicationId,
      name,
      remaining: null,
      unit,
      reason: 'stok-tidak-dilacak'
    };
  }

  const todayDate = isValidDateISO(today) ? today : todayISO();
  const unitsPerDose = unitsPerDoseOf(med);
  const timesCount = validTimesCount(med);
  const dosesPerDay = averageDosesPerDay(med, todayDate);
  const unitsPerDay = round2(dosesPerDay * unitsPerDose);

  const base = {
    tracked: true,
    medicationId,
    name,
    remaining,
    unit,
    unitsPerDose,
    dosesPerDay,
    unitsPerDay
  };

  // 2. Obat nonaktif atau sudah berakhir: tidak ada prediksi tanggal.
  const endDate = med && isValidDateISO(med.endDate) ? med.endDate : null;
  const ended = med && med.active === false ? true : Boolean(endDate && endDate < todayDate);
  if (ended) {
    return {
      ...base,
      daysLeft: null,
      runOutDate: null,
      refillByDate: null,
      refillDue: false,
      active: false,
      reason: 'obat-tidak-aktif'
    };
  }

  const startDate = med && isValidDateISO(med.startDate) ? med.startDate : null;
  const horizon = typeof maxDays === 'number' && Number.isFinite(maxDays) && maxDays >= 0
    ? Math.floor(maxDays)
    : 365;

  // 3. Simulasi hari demi hari.
  let simulatedRemaining = remaining;
  let runOutDate = null;
  let daysLeft = null;

  for (let offset = 0; offset <= horizon; offset += 1) {
    const dateISO = addDays(todayDate, offset);
    if (!dateISO) break;

    // Lewati hari sebelum startDate.
    if (startDate && dateISO < startDate) continue;
    // Hentikan bila melewati endDate.
    if (endDate && dateISO > endDate) break;

    const needed = isMedicationActiveOn(med, dateISO) ? timesCount * unitsPerDose : 0;
    if (needed > 0 && simulatedRemaining < needed) {
      runOutDate = dateISO;
      daysLeft = diffDays(todayDate, dateISO);
      break;
    }
    simulatedRemaining -= needed;
  }

  // 5. Tanggal pengingat tebus ulang.
  const refillReminderDays = refillReminderDaysOf(med);
  let refillByDate = null;
  let refillDue = false;
  if (runOutDate) {
    refillByDate = addDays(runOutDate, -refillReminderDays) || null;
    refillDue = Boolean(refillByDate && refillByDate <= todayDate);
  }

  return {
    ...base,
    daysLeft,
    runOutDate,
    refillByDate,
    refillDue,
    active: true,
    reason: null
  };
}

/**
 * Prediksi tebus ulang untuk semua obat aktif (opsional filter profil).
 *
 * Urutan: `refillDue` dulu, lalu `runOutDate` menaik (`null` terakhir),
 * `daysLeft:null` terakhir, dan `tracked:false` paling akhir.
 */
export function predictRefills(medications, { today = todayISO(), profileId = null } = {}) {
  if (!Array.isArray(medications)) return [];

  const items = [];
  medications.forEach((med, index) => {
    if (!med || typeof med !== 'object') return;
    if (med.active === false) return;
    if (profileId !== null && med.profileId !== profileId) return;

    items.push({
      index,
      simulation: simulateStockOut(med, { today })
    });
  });

  items.sort((a, b) => {
    const left = a.simulation;
    const right = b.simulation;

    // `tracked:false` paling akhir.
    const leftTracked = left.tracked ? 0 : 1;
    const rightTracked = right.tracked ? 0 : 1;
    if (leftTracked !== rightTracked) return leftTracked - rightTracked;

    // `refillDue` dulu.
    const leftDue = left.refillDue ? 0 : 1;
    const rightDue = right.refillDue ? 0 : 1;
    if (leftDue !== rightDue) return leftDue - rightDue;

    // `runOutDate` menaik, null terakhir.
    const leftHasDate = left.runOutDate ? 0 : 1;
    const rightHasDate = right.runOutDate ? 0 : 1;
    if (leftHasDate !== rightHasDate) return leftHasDate - rightHasDate;
    if (left.runOutDate && right.runOutDate && left.runOutDate !== right.runOutDate) {
      return left.runOutDate < right.runOutDate ? -1 : 1;
    }

    // `daysLeft:null` terakhir.
    const leftHasDays = left.daysLeft == null ? 1 : 0;
    const rightHasDays = right.daysLeft == null ? 1 : 0;
    if (leftHasDays !== rightHasDays) return leftHasDays - rightHasDays;

    return a.index - b.index;
  });

  return items.map((item) => item.simulation);
}
