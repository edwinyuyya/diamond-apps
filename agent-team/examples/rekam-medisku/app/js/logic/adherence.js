/**
 * Kepatuhan minum obat mingguan (murni, tanpa DOM/dependency).
 *
 * Mengikuti CONTRACT.md 7.3:
 * - `scheduled` = semua dosis terjadwal dalam minggu (termasuk yang belum jatuh tempo)
 * - `due` = dosis dengan `scheduledAt <= now`
 * - hanya dosis `due` yang dihitung ke status & persen
 * - `percent = denom ? Math.round(taken*100/denom) : null`
 *   dengan `denom = taken + skipped + missed`
 */

import { addDays, isValidDateISO, startOfWeek, todayISO } from './dates.js';
import { applyDoseLogs, buildDosesForDate } from './schedule.js';

/** Label kepatuhan dari persen (null = belum ada data). */
export function complianceLabel(percent) {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return 'Belum ada data';
  if (percent < 70) return 'Perlu perhatian';
  if (percent < 90) return 'Cukup';
  return 'Baik';
}

/** Persen dari komponen status; null bila denominator 0. */
function percentOf(taken, skipped, missed) {
  const denom = taken + skipped + missed;
  return denom > 0 ? Math.round((taken * 100) / denom) : null;
}

/**
 * Kepatuhan satu minggu.
 *
 * @param {object} options
 * @param {Array} [options.medications=[]]
 * @param {Array} [options.doseLogs=[]]
 * @param {string} [options.weekStartISO] tanggal awal minggu (bila kosong: Senin minggu `now`)
 * @param {Date} [options.now=new Date()]
 * @param {string|null} [options.profileId=null]
 */
export function weeklyAdherence({
  medications = [],
  doseLogs = [],
  weekStartISO,
  now = new Date(),
  profileId = null
} = {}) {
  const nowDate = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  const nowMs = nowDate.getTime();

  const weekStart = isValidDateISO(weekStartISO)
    ? weekStartISO
    : startOfWeek(todayISO(nowDate));
  const weekEnd = weekStart ? addDays(weekStart, 6) : '';

  const result = {
    weekStart: weekStart || '',
    weekEnd: weekEnd || '',
    scheduled: 0,
    due: 0,
    taken: 0,
    skipped: 0,
    missed: 0,
    pending: 0,
    percent: null,
    label: complianceLabel(null),
    byMedication: []
  };
  if (!weekStart || !weekEnd) return result;

  /** @type {Map<string, object>} */
  const groups = new Map();

  for (let offset = 0; offset < 7; offset += 1) {
    const dateISO = addDays(weekStart, offset);
    if (!dateISO) continue;

    const doses = applyDoseLogs(
      buildDosesForDate(medications, dateISO, { profileId }),
      doseLogs,
      { now: nowDate }
    );

    for (const dose of doses) {
      if (!dose || typeof dose !== 'object') continue;
      result.scheduled += 1;

      const groupKey = dose.medicationId != null
        ? String(dose.medicationId)
        : `name:${dose.name}`;
      let group = groups.get(groupKey);
      if (!group) {
        group = {
          medicationId: dose.medicationId ?? null,
          name: dose.name ?? '',
          due: 0,
          taken: 0,
          skipped: 0,
          missed: 0,
          pending: 0,
          percent: null
        };
        groups.set(groupKey, group);
      }

      const scheduledMs = Date.parse(dose.scheduledAt);
      const isDue = Number.isFinite(scheduledMs) && scheduledMs <= nowMs;
      if (!isDue) continue;

      const status = dose.status === 'taken' || dose.status === 'skipped' || dose.status === 'missed'
        ? dose.status
        : 'pending';

      result.due += 1;
      result[status] += 1;
      group.due += 1;
      group[status] += 1;
    }
  }

  result.percent = percentOf(result.taken, result.skipped, result.missed);
  result.label = complianceLabel(result.percent);

  result.byMedication = [...groups.values()].map((group) => ({
    medicationId: group.medicationId,
    name: group.name,
    due: group.due,
    taken: group.taken,
    skipped: group.skipped,
    missed: group.missed,
    pending: group.pending,
    percent: percentOf(group.taken, group.skipped, group.missed)
  }));

  return result;
}

/**
 * Riwayat kepatuhan `weeks` minggu, urut lama -> baru.
 * Minggu terakhir = minggu berjalan (`startOfWeek(todayISO(now))`).
 */
export function adherenceHistory({
  medications = [],
  doseLogs = [],
  weeks = 8,
  now = new Date(),
  profileId = null
} = {}) {
  const nowDate = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  const count = typeof weeks === 'number' && Number.isFinite(weeks) && weeks >= 0
    ? Math.floor(weeks)
    : 8;

  const currentStart = startOfWeek(todayISO(nowDate));
  if (!currentStart) return [];

  const history = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const weekStartISO = addDays(currentStart, -7 * index);
    if (!weekStartISO) continue;
    history.push(weeklyAdherence({
      medications,
      doseLogs,
      weekStartISO,
      now: nowDate,
      profileId
    }));
  }
  return history;
}
