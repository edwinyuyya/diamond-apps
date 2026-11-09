// t16 QA — logika murni: dates, schedule, stock, adherence, safety, vitals, summary.
// Tanpa DOM, tanpa jaringan, waktu tetap.

import test from 'node:test';
import assert from 'node:assert/strict';

import * as dates from '../app/js/logic/dates.js';
import * as schedule from '../app/js/logic/schedule.js';
import * as stock from '../app/js/logic/stock.js';
import * as adherence from '../app/js/logic/adherence.js';
import * as safety from '../app/js/logic/safety.js';
import * as vitals from '../app/js/logic/vitals.js';
import { buildControlQuestions, buildDoctorSummary, summaryToPlainText } from '../app/js/logic/summary.js';
import {
  DISCLAIMERS,
  createEmptyState,
  createLab,
  createMedication,
  createQuestion,
  createRefRange,
  createVisit,
  createVital
} from '../app/js/model.js';

const NOW = new Date(2026, 10, 9, 7, 0, 0); // Senin 9 November 2026, 07:00 lokal

// ---------------------------------------------------------------------------
// dates
// ---------------------------------------------------------------------------

test('dates: format/parse lokal, addDays, diffDays, startOfWeek Senin, weekKey, validasi', () => {
  assert.equal(dates.toISODate(NOW), '2026-11-09');
  assert.equal(dates.todayISO(NOW), '2026-11-09');

  const parsed = dates.parseISODate('2026-11-09');
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 10);
  assert.equal(parsed.getDate(), 9);
  assert.equal(parsed.getHours(), 12);

  assert.equal(dates.addDays('2026-11-09', 15), '2026-11-24');
  assert.equal(dates.addDays('2026-11-09', -1), '2026-11-08');
  assert.equal(dates.diffDays('2026-11-09', '2026-11-24'), 15);

  assert.equal(dates.startOfWeek('2026-11-09'), '2026-11-09');
  assert.equal(dates.endOfWeek('2026-11-09'), '2026-11-15');
  assert.equal(dates.startOfWeek('2026-11-15'), '2026-11-09');

  assert.equal(dates.weekKey('2026-11-09'), '2026-W46');
  assert.deepEqual(dates.isoWeekNumber('2026-11-09'), { year: 2026, week: 46 });

  assert.equal(dates.isValidDateISO('2026-11-09'), true);
  assert.equal(dates.isValidDateISO('2026-02-30'), false);
  assert.equal(dates.isValidDateISO('bukan'), false);
  assert.equal(dates.isValidTime('08:00'), true);
  assert.equal(dates.isValidTime('24:00'), false);
  assert.equal(dates.timeToMinutes('08:30'), 510);
  assert.equal(dates.minutesToTime(510), '08:30');

  assert.equal(dates.formatDateID('2026-11-09'), '9 November 2026');
  assert.equal(dates.formatDateID('2026-11-09', 'short'), '9 Nov 2026');
  assert.equal(dates.formatDateID('2026-11-09', 'numeric'), '09/11/2026');
  assert.equal(dates.formatDateID('tidak-valid'), '');
  assert.equal(dates.dayNameID('2026-11-09'), 'Senin');
  assert.equal(dates.formatBytes(850 * 1024), '850 KB');
  assert.equal(dates.formatBytes(1.2 * 1024 * 1024), '1,2 MB');
});

// ---------------------------------------------------------------------------
// schedule
// ---------------------------------------------------------------------------

test('schedule: aktif berdasarkan tanggal & hari, times kosong tidak menghasilkan dose', () => {
  const base = {
    id: 'med_a', profileId: 'prf_1', name: 'Amlodipin',
    times: ['08:00'], daysOfWeek: [1], startDate: '2026-11-01', endDate: '2026-11-30', active: true
  };
  assert.equal(schedule.isMedicationActiveOn(base, '2026-11-09'), true); // Senin
  assert.equal(schedule.isMedicationActiveOn(base, '2026-11-10'), false); // Selasa
  assert.equal(schedule.isMedicationActiveOn(base, '2026-10-31'), false);
  assert.equal(schedule.isMedicationActiveOn(base, '2026-12-01'), false);
  assert.equal(schedule.isMedicationActiveOn({ ...base, active: false }, '2026-11-09'), false);

  const noTimes = { ...base, times: [] };
  assert.equal(schedule.isMedicationActiveOn(noTimes, '2026-11-09'), true);
  assert.deepEqual(schedule.buildDosesForDate([noTimes], '2026-11-09'), []);
});

test('schedule: dua obat urut jam lalu nama; applyDoseLogs taken/skipped/missed/pending', () => {
  const meds = [
    { id: 'med_b', profileId: 'prf_1', name: 'Beta', times: ['20:00'], daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startDate: null, endDate: null, active: true },
    { id: 'med_a', profileId: 'prf_1', name: 'Alfa', times: ['08:00'], daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startDate: null, endDate: null, active: true }
  ];
  const doses = schedule.buildDosesForDate(meds, '2026-11-09');
  assert.deepEqual(doses.map((d) => d.time), ['08:00', '20:00']);
  assert.equal(doses[0].medicationId, 'med_a');
  assert.equal(doses[0].key, schedule.doseKey('med_a', '2026-11-09', '08:00'));
  assert.equal(doses[0].scheduledAt, new Date(2026, 10, 9, 8, 0, 0).toISOString());

  const morningOnly = [doses[0]];
  const taken = schedule.applyDoseLogs(morningOnly, [
    { medicationId: 'med_a', date: '2026-11-09', time: '08:00', status: 'taken' }
  ], { now: new Date(2026, 10, 9, 12, 0, 0) });
  assert.equal(taken[0].status, 'taken');

  const skipped = schedule.applyDoseLogs(morningOnly, [
    { medicationId: 'med_a', date: '2026-11-09', time: '08:00', status: 'skipped' }
  ], { now: new Date(2026, 10, 9, 12, 0, 0) });
  assert.equal(skipped[0].status, 'skipped');

  const missed = schedule.applyDoseLogs(morningOnly, [], { now: new Date(2026, 10, 9, 12, 0, 0) });
  assert.equal(missed[0].status, 'missed'); // 08:00 + 180 menit < 12:00

  const pending = schedule.applyDoseLogs(morningOnly, [], { now: new Date(2026, 10, 9, 7, 0, 0) });
  assert.equal(pending[0].status, 'pending');

  const summary = schedule.summarizeDoses([
    { status: 'taken' }, { status: 'taken' }, { status: 'missed' }, { status: 'pending' }
  ]);
  assert.deepEqual(summary, { total: 4, taken: 2, skipped: 0, missed: 1, pending: 1, percent: 67 });
});

test('schedule: nextDose mencari dose pending berikutnya; formatSchedule mengikuti kontrak', () => {
  const meds = [
    { id: 'med_a', profileId: 'prf_1', name: 'Alfa', times: ['08:00', '20:00'], daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startDate: '2026-11-01', endDate: null, active: true }
  ];
  const next = schedule.nextDose(meds, { from: new Date(2026, 10, 9, 7, 0, 0), horizonDays: 14 });
  assert.ok(next);
  assert.equal(next.time, '08:00');
  assert.equal(next.date, '2026-11-09');

  assert.equal(schedule.formatSchedule({ times: ['20:00', '08:00'], daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }), 'Setiap hari · 08:00, 20:00');
  assert.equal(schedule.formatSchedule({ times: ['08:00'], daysOfWeek: [1, 3, 5] }), 'Sen, Rab, Jum · 08:00');
  assert.equal(
    schedule.formatSchedule({ times: ['08:00'], daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startDate: '2026-11-01', endDate: '2026-11-30' }),
    'Setiap hari · 08:00 · 1 Nov 2026–30 Nov 2026'
  );
});

// ---------------------------------------------------------------------------
// stock
// ---------------------------------------------------------------------------

test('stock: 30 tablet 2x/hari habis 2026-11-24, tebus 2026-11-21; null/nonaktif/predictRefills', () => {
  const med = {
    id: 'med_a', profileId: 'prf_1', name: 'Amlodipin',
    times: ['08:00', '20:00'], daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: '2026-11-09', endDate: null, active: true,
    stock: { remaining: 30, unit: 'tablet', unitsPerDose: 1 }, refillReminderDays: 3
  };

  const result = stock.simulateStockOut(med, { today: '2026-11-09' });
  assert.equal(result.tracked, true);
  assert.equal(result.runOutDate, '2026-11-24');
  assert.equal(result.daysLeft, 15);
  assert.equal(result.refillByDate, '2026-11-21');
  assert.equal(result.refillDue, false);
  assert.equal(result.dosesPerDay, 2);
  assert.equal(result.unitsPerDay, 2);
  assert.equal(result.reason, null);

  const untracked = stock.simulateStockOut({ ...med, stock: { remaining: null, unit: 'tablet', unitsPerDose: 1 } }, { today: '2026-11-09' });
  assert.equal(untracked.tracked, false);
  assert.equal(untracked.reason, 'stok-tidak-dilacak');
  assert.equal(untracked.remaining, null);

  const inactive = stock.simulateStockOut({ ...med, active: false }, { today: '2026-11-09' });
  assert.equal(inactive.tracked, true);
  assert.equal(inactive.daysLeft, null);
  assert.equal(inactive.runOutDate, null);
  assert.equal(inactive.reason, 'obat-tidak-aktif');

  const sorted = stock.predictRefills([
    { ...med, id: 'med_late', name: 'Beta', stock: { remaining: 300, unit: 'tablet', unitsPerDose: 1 } },
    { ...med, id: 'med_soon', name: 'Alfa' },
    { ...med, id: 'med_off', name: 'Gamma', active: false }
  ], { today: '2026-11-09' });
  assert.deepEqual(sorted.map((item) => item.medicationId), ['med_soon', 'med_late']);
});

// ---------------------------------------------------------------------------
// adherence
// ---------------------------------------------------------------------------

test('adherence: due hanya yang sudah lewat, status, label, dan history urut lama→baru', () => {
  const now = new Date(2026, 10, 10, 0, 0, 0); // Selasa 00:00 (kedua dosis Senin sudah lewat grace)
  const medications = [{
    id: 'med_a', profileId: 'prf_1', name: 'Amlodipin',
    times: ['08:00', '20:00'], daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: null, endDate: null, active: true
  }];
  const doseLogs = [{
    id: 'dose_med_a_2026-11-09_0800', medicationId: 'med_a', profileId: 'prf_1',
    date: '2026-11-09', time: '08:00', status: 'taken'
  }];

  const week = adherence.weeklyAdherence({ medications, doseLogs, weekStartISO: '2026-11-09', now });
  assert.equal(week.weekStart, '2026-11-09');
  assert.equal(week.weekEnd, '2026-11-15');
  assert.equal(week.scheduled, 14);
  assert.equal(week.due, 2);      // Senin 08:00 & 20:00
  assert.equal(week.taken, 1);
  assert.equal(week.skipped, 0);
  assert.equal(week.missed, 1);
  assert.equal(week.percent, 50);
  assert.equal(week.label, 'Perlu perhatian');
  assert.equal(week.byMedication.length, 1);
  assert.equal(week.byMedication[0].percent, 50);

  const history = adherence.adherenceHistory({ medications, doseLogs, weeks: 2, now });
  assert.equal(history.length, 2);
  assert.equal(history[0].weekStart, '2026-11-02');
  assert.equal(history[1].weekStart, '2026-11-09');

  assert.equal(adherence.complianceLabel(null), 'Belum ada data');
  assert.equal(adherence.complianceLabel(69), 'Perlu perhatian');
  assert.equal(adherence.complianceLabel(70), 'Cukup');
  assert.equal(adherence.complianceLabel(90), 'Baik');
});

// ---------------------------------------------------------------------------
// safety
// ---------------------------------------------------------------------------

test('safety: normalisasi, duplikasi hanya obat aktif, flagValue, resolveRange terbaru, flagVital, flagLab', () => {
  assert.equal(safety.normalizeIngredient('Paracetamol (500 mg)'), 'paracetamol');
  assert.equal(safety.normalizeIngredient('  AMOXICILLIN/Clav  '), 'amoxicillin clav');

  const meds = [
    { id: 'med_1', profileId: 'prf_1', name: 'Paracetamol A', activeIngredient: 'Paracetamol (500 mg)', active: true },
    { id: 'med_2', profileId: 'prf_1', name: 'Paracetamol B', activeIngredient: 'paracetamol', active: true },
    { id: 'med_3', profileId: 'prf_1', name: 'Paracetamol C', activeIngredient: 'Paracetamol', active: false }
  ];
  const groups = safety.findDuplicateIngredients(meds);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, 'paracetamol');
  assert.deepEqual(groups[0].medicationIds, ['med_1', 'med_2']);
  assert.equal(groups[0].count, 2);
  assert.equal(safety.duplicatesForMedication(meds[0], meds).length, 1);
  assert.deepEqual(safety.duplicatesForMedication(meds[2], meds), []);

  assert.equal(safety.flagValue(null, { low: 1, high: 2 }), 'unknown');
  assert.equal(safety.flagValue(0, { low: 1, high: 2 }), 'low');
  assert.equal(safety.flagValue(3, { low: 1, high: 2 }), 'high');
  assert.equal(safety.flagValue(1.5, { low: 1, high: 2 }), 'normal');
  assert.equal(safety.flagValue(5), 'unknown');

  const refRanges = [
    { id: 'ref_1', profileId: 'prf_1', metric: 'systolic', low: 90, high: 140, unit: 'mmHg', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'ref_2', profileId: 'prf_1', metric: 'systolic', low: 100, high: 130, unit: 'mmHg', updatedAt: '2026-02-01T00:00:00.000Z' }
  ];
  assert.deepEqual(safety.resolveRange('systolic', refRanges, 'prf_1'), { low: 100, high: 130, unit: 'mmHg' });
  assert.equal(safety.resolveRange('glucose', refRanges, 'prf_1'), null);

  const vital = { id: 'vit_1', profileId: 'prf_1', type: 'tension', date: '2026-11-08', time: '07:30', values: { systolic: 150, diastolic: 95 } };
  const flagged = safety.flagVital(vital, refRanges);
  assert.equal(flagged.overall, 'high');
  assert.equal(flagged.flags.systolic, 'high');
  assert.equal(flagged.flags.diastolic, 'unknown');
  assert.equal(flagged.disclaimer, DISCLAIMERS.range);

  const lab = safety.flagLab({ id: 'lab_1', name: 'HbA1c', value: 7.2, refLow: 4, refHigh: 5.6 });
  assert.equal(lab.flag, 'high');
  assert.deepEqual(lab.range, { low: 4, high: 5.6 });
});

// ---------------------------------------------------------------------------
// vitals
// ---------------------------------------------------------------------------

test('vitals: seri, limit ambil terbaru, stats, trend, format, grup lab', () => {
  const list = [
    { id: 'vit_1', profileId: 'prf_1', type: 'glucose', date: '2026-11-01', time: '08:00', values: { value: 100 } },
    { id: 'vit_2', profileId: 'prf_1', type: 'glucose', date: '2026-11-05', time: '08:00', values: { value: 120 } },
    { id: 'vit_3', profileId: 'prf_1', type: 'glucose', date: '2026-11-08', time: '08:00', values: { value: 110 } }
  ];
  assert.deepEqual(vitals.pointsForType('glucose', list), { value: [
    { date: '2026-11-01', value: 100 }, { date: '2026-11-05', value: 120 }, { date: '2026-11-08', value: 110 }
  ] });
  assert.deepEqual(vitals.pointsForType('glucose', list, { limit: 2 }).value.map((p) => p.value), [120, 110]);
  assert.equal(vitals.latestFor('glucose', list).id, 'vit_3');

  const stats = vitals.statsFor([{ date: '2026-11-01', value: 100 }, { date: '2026-11-05', value: 120 }]);
  assert.deepEqual(stats, { count: 2, min: 100, max: 120, avg: 110, first: 100, last: 120, delta: 20, deltaPct: 20 });

  const trend = vitals.buildVitalTrend('glucose', list, [], { profileId: 'prf_1' });
  assert.equal(trend.type, 'glucose');
  assert.equal(trend.unit, 'mg/dL');
  assert.equal(trend.series.length, 1);
  assert.deepEqual(trend.series[0].points.map((p) => p.value), [100, 120, 110]);
  assert.equal(trend.latest.display, '110 mg/dL');

  assert.equal(vitals.formatVital('tension', { values: { systolic: 150, diastolic: 95 }, unit: 'mmHg' }), '150/95 mmHg');
  assert.equal(vitals.formatVital('glucose', { values: { value: 180 }, unit: 'mg/dL' }), '180 mg/dL');

  const groups = vitals.groupLabResults([
    { id: 'lab_1', profileId: 'prf_1', name: 'HbA1c', value: 7.2, unit: '%', refLow: 4, refHigh: 5.6, date: '2026-11-01' },
    { id: 'lab_2', profileId: 'prf_1', name: 'hba1c', value: 6.8, unit: '%', refLow: 4, refHigh: 5.6, date: '2026-11-08' }
  ], { profileId: 'prf_1' });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].name.toLowerCase(), 'hba1c');
  assert.equal(groups[0].points.length, 2);
  assert.equal(groups[0].latest.value, 6.8);
});

// ---------------------------------------------------------------------------
// summary
// ---------------------------------------------------------------------------

function sampleState(now) {
  const state = createEmptyState({ now });
  const profileId = state.profiles[0].id;
  state.profiles[0] = {
    ...state.profiles[0],
    name: 'Budi',
    birthDate: '1962-04-17',
    sex: 'L',
    bloodType: 'O+',
    allergies: ['penisilin'],
    chronicConditions: ['hipertensi'],
    emergencyContacts: [{ name: 'Siti', relation: 'Istri', phone: '081234567890' }]
  };
  state.visits.push(createVisit({
    profileId, date: '2026-11-01', doctorName: 'dr. Sari', facility: 'Klinik Sehat',
    complaint: 'pusing', diagnosis: 'hipertensi'
  }));
  state.medications.push(createMedication({
    profileId, name: 'Amlodipin', activeIngredient: 'amlodipine', dose: '5', doseUnit: 'mg',
    times: ['08:00'], startDate: '2026-11-01',
    stock: { remaining: 30, unit: 'tablet', unitsPerDose: 1 }
  }));
  state.vitals.push(createVital({
    profileId, type: 'tension', date: '2026-11-08', time: '07:30', values: { systolic: 150, diastolic: 95 }
  }));
  state.labs.push(createLab({
    profileId, date: '2026-11-01', name: 'HbA1c', value: 7.2, unit: '%', refLow: 4, refHigh: 5.6
  }));
  state.refRanges.push(createRefRange({ profileId, metric: 'systolic', low: 90, high: 140, unit: 'mmHg' }));
  state.questions.push(createQuestion({ profileId, text: 'Apakah saya perlu mengurangi garam?' }));
  return { state, profileId };
}

test('summary: ringkasan lengkap, pertanyaan relevan, bukan saran medis/dosis', () => {
  const now = new Date(2026, 10, 9, 7, 0, 0);
  const { state, profileId } = sampleState(now);

  const summary = buildDoctorSummary(state, { profileId, now });
  assert.equal(summary.app, 'Rekam Medisku');
  assert.equal(summary.profileId, profileId);
  assert.equal(summary.profile.name, 'Budi');
  assert.equal(summary.profile.age, 64);
  assert.equal(summary.profile.sexLabel, 'Laki-laki');
  assert.equal(summary.profile.bloodType, 'O+');
  assert.equal(summary.activeMedications.length, 1);
  assert.equal(summary.activeMedications[0].name, 'Amlodipin');
  assert.equal(summary.recentVisits.length, 1);
  assert.equal(summary.recentVisits[0].diagnosis, 'hipertensi');
  assert.equal(summary.vitals[0].flag, 'high');
  assert.equal(summary.labs[0].flag, 'high');
  assert.equal(summary.adherence.weekStart, '2026-11-09');
  assert.deepEqual(summary.emergencyNumbers, ['112', '119']);
  assert.equal(summary.disclaimer, DISCLAIMERS.summary);
  assert.equal(summary.isMedicalAdvice, false);

  const questions = buildControlQuestions(state, profileId, { now });
  assert.ok(questions.includes('Apakah saya perlu mengurangi garam?'));
  assert.ok(questions.some((q) => /alergi penisilin/i.test(q)));
  assert.ok(questions.some((q) => /tekanan darah terakhir/i.test(q)));
  for (const q of questions) {
    assert.match(q, /^[A-ZÀ-Ý].*\?$/);
    assert.doesNotMatch(q, /minumlah|tingkatkan dosis|kurangi dosis|hentikan obat/i);
  }

  const plain = summaryToPlainText(summary);
  assert.match(plain, /RINGKASAN UNTUK DOKTER/);
  assert.match(plain, /Budi/);
  assert.match(plain, /Amlodipin/);
});

// ---------------------------------------------------------------------------
// foto resep asli: metadata sumber harus ikut ke ringkasan dokter agar bisa dicocokkan
// ---------------------------------------------------------------------------

test('summary: obat dari resep membawa photoId dan terjemahan; obat manual tidak', () => {
  const now = new Date(2026, 10, 9, 7, 0, 0);
  const { state, profileId } = sampleState(now);
  state.medications.push(createMedication({
    profileId, name: 'Captopril', dose: '12,5', doseUnit: 'mg', times: ['07:00', '19:00'],
    startDate: '2026-11-01',
    source: {
      kind: 'resep', photoId: 'pho_abc123', photoMime: 'image/jpeg',
      ocrText: 'S 2 dd 1/2 tab a.c.', translatedText: 'Diminum 2 kali sehari, 0,5 tablet, sebelum makan',
      parserVersion: '1', verifiedByUser: true, verifiedAt: '2026-11-09T07:00:00.000Z'
    }
  }));
  const summary = buildDoctorSummary(state, { profileId, now });
  const captopril = summary.activeMedications.find((m) => m.name === 'Captopril');
  const amlodipin = summary.activeMedications.find((m) => m.name === 'Amlodipin');
  assert.equal(captopril.source.photoId, 'pho_abc123');
  assert.match(captopril.source.translatedText, /0,5 tablet/);
  assert.equal(captopril.source.verifiedByUser, true);
  assert.equal(amlodipin.source, null);
});
