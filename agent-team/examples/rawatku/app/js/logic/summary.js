// Pertanyaan kontrol & ringkasan untuk dokter (CONTRACT.md 7.7).
// Semua keluaran hanya menyalin/menghitung data pengguna, bukan diagnosis,
// bukan saran dosis, dan bukan klaim interaksi obat.

import {
  DISCLAIMERS,
  EMERGENCY_NUMBERS,
  SEX_OPTIONS,
  VITAL_TYPES,
  VITAL_TYPE_ORDER,
  ageFromBirthDate
} from '../model.js';
import {
  diffDays,
  formatDateID,
  isValidDateISO,
  startOfWeek,
  todayISO
} from './dates.js';
import { formatSchedule } from './schedule.js';
import { complianceLabel, weeklyAdherence } from './adherence.js';
import { predictRefills, simulateStockOut } from './stock.js';
import {
  FLAG_LABELS,
  findDuplicateIngredients,
  flagLab,
  flagVital
} from './safety.js';
import { buildVitalTrend, formatVital, latestFor } from './vitals.js';

const MAX_QUESTIONS = 10;
const COMPLAINT_WINDOW_DAYS = 180;

function isNum(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function collection(state, key) {
  return Array.isArray(state?.[key]) ? state[key] : [];
}

function profileFor(state, profileId) {
  return collection(state, 'profiles').find((profile) => profile.id === profileId) ?? null;
}

function nowDate(now) {
  return now instanceof Date ? now : new Date(now);
}

function cleanText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pastikan setiap butir benar-benar berupa pertanyaan. */
function asQuestion(text) {
  let value = cleanText(text);
  if (!value) return '';
  if (!value.endsWith('?')) value = `${value.replace(/[.,;:]+$/, '')}?`;
  return value;
}

function sexLabelFor(sex) {
  const found = SEX_OPTIONS.find((option) => option.value === (sex ?? ''));
  return found ? found.label : 'Tidak disebutkan';
}

function activeMedicationsFor(state, profileId, today) {
  return collection(state, 'medications').filter((med) => {
    if (!med || typeof med !== 'object') return false;
    if (med.profileId !== profileId) return false;
    if (med.active === false) return false;
    if (isValidDateISO(med.startDate) && med.startDate > today) return false;
    if (isValidDateISO(med.endDate) && med.endDate < today) return false;
    return true;
  });
}

function doseTextFor(med) {
  return [med?.dose, med?.doseUnit]
    .filter((part) => part !== null && part !== undefined && String(part).trim() !== '')
    .join(' ')
    .trim();
}

function compareVisitsDesc(a, b) {
  const date = String(b?.date ?? '').localeCompare(String(a?.date ?? ''));
  if (date !== 0) return date;
  return String(b?.createdAt ?? '').localeCompare(String(a?.createdAt ?? ''));
}

function compareLabsDesc(a, b) {
  const date = String(b?.date ?? '').localeCompare(String(a?.date ?? ''));
  if (date !== 0) return date;
  return String(b?.createdAt ?? '').localeCompare(String(a?.createdAt ?? ''));
}

function latestLabsByName(state, profileId) {
  const sorted = collection(state, 'labs')
    .filter((lab) => lab && lab.profileId === profileId)
    .slice()
    .sort(compareLabsDesc);

  const seen = new Set();
  const latest = [];
  for (const lab of sorted) {
    const name = cleanText(lab.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    latest.push(lab);
  }
  return latest;
}

function dateLabel(date) {
  const label = formatDateID(date, 'long');
  return label || String(date ?? '');
}

/**
 * Pertanyaan kontrol untuk dokter, urut prioritas, maksimum `max`.
 * Hanya bertanya; tidak menyarankan terapi, dosis, atau interaksi.
 */
export function buildControlQuestions(state, profileId, { now = new Date(), max = MAX_QUESTIONS } = {}) {
  const limit = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : MAX_QUESTIONS;
  if (limit === 0) return [];

  const current = nowDate(now);
  const today = todayISO(current);
  const profile = profileFor(state, profileId);
  const questions = [];
  const seen = new Set();

  const push = (text) => {
    if (questions.length >= limit) return;
    const question = asQuestion(text);
    if (!question) return;
    const key = question.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    questions.push(question);
  };

  // 1. Pertanyaan manual yang belum selesai.
  for (const item of collection(state, 'questions')) {
    if (questions.length >= limit) break;
    if (!item || item.profileId !== profileId || item.done === true) continue;
    push(item.text);
  }

  // 2. Alergi.
  const allergies = Array.isArray(profile?.allergies)
    ? profile.allergies.map(cleanText).filter(Boolean)
    : [];
  if (allergies.length) {
    push(`Apakah alergi ${allergies.join(', ')} perlu diperhatikan dalam pengobatan?`);
  }

  // 3. Duplikasi bahan aktif (bukan interaksi obat).
  const duplicates = findDuplicateIngredients(collection(state, 'medications'), { profileId });
  for (const group of duplicates) {
    if (questions.length >= limit) break;
    const names = group.medicationNames.map(cleanText).filter(Boolean);
    push(
      `Apakah obat ${names.join(' dan ')} dengan bahan aktif ${group.displayName} memiliki tujuan yang sama dan perlu ditinjau?`
    );
  }

  // 4. Vital terbaru di luar rentang acuan.
  const refRanges = collection(state, 'refRanges');
  const vitals = collection(state, 'vitals');
  for (const type of VITAL_TYPE_ORDER) {
    if (questions.length >= limit) break;
    const vital = latestFor(type, vitals, { profileId });
    if (!vital) continue;
    const flagged = flagVital(vital, refRanges, { profileId: vital.profileId ?? profileId });
    if (!flagged || (flagged.overall !== 'low' && flagged.overall !== 'high')) continue;
    const label = VITAL_TYPES?.[type]?.label ?? type;
    push(
      `${label} terakhir ${formatVital(type, vital)} (${FLAG_LABELS[flagged.overall]}) — apakah perlu diperiksa ulang?`
    );
  }

  // 5. Lab terbaru per nama di luar rentang.
  for (const lab of latestLabsByName(state, profileId)) {
    if (questions.length >= limit) break;
    const flagged = flagLab(lab);
    if (flagged.flag !== 'low' && flagged.flag !== 'high') continue;
    const unit = cleanText(lab.unit);
    const valueText = unit ? `${lab.value} ${unit}` : String(lab.value ?? '');
    push(
      `Hasil ${cleanText(lab.name)} terakhir ${valueText} (${FLAG_LABELS[flagged.flag]}) — apakah perlu ditinjau atau diperiksa ulang?`
    );
  }

  // 6. Kepatuhan minggu berjalan < 70%.
  if (questions.length < limit) {
    const adherence = weeklyAdherence({
      medications: collection(state, 'medications'),
      doseLogs: collection(state, 'doseLogs'),
      weekStartISO: startOfWeek(today),
      now: current,
      profileId
    });
    if (adherence && adherence.percent !== null && adherence.percent < 70) {
      push(
        `Kepatuhan minum obat minggu ini ${adherence.percent}% — apakah ada kendala yang perlu dibicarakan?`
      );
    }
  }

  // 7. Perlu tebus.
  if (questions.length < limit) {
    const refills = predictRefills(collection(state, 'medications'), { today, profileId });
    for (const refill of Array.isArray(refills) ? refills : []) {
      if (questions.length >= limit) break;
      if (!refill?.tracked || !refill.refillDue) continue;
      const when = refill.runOutDate
        ? `, perkiraan habis ${dateLabel(refill.runOutDate)}`
        : '';
      push(`Obat ${cleanText(refill.name)} diperkirakan perlu ditebus${when} — apakah perlu resep baru?`);
    }
  }

  // 8. Keluhan kunjungan terakhir (dalam 180 hari).
  if (questions.length < limit) {
    const lastVisit = collection(state, 'visits')
      .filter((visit) => visit && visit.profileId === profileId && isValidDateISO(visit.date))
      .slice()
      .sort(compareVisitsDesc)[0];
    if (lastVisit) {
      const days = diffDays(lastVisit.date, today);
      const complaint = cleanText(lastVisit.complaint);
      if (days >= 0 && days <= COMPLAINT_WINDOW_DAYS && complaint) {
        push(`Keluhan terakhir "${complaint}" — apakah masih dirasakan atau perlu diperiksa lagi?`);
      }
    }
  }

  // 9. Penyakit kronis.
  const chronic = Array.isArray(profile?.chronicConditions)
    ? profile.chronicConditions.map(cleanText).filter(Boolean)
    : [];
  if (chronic.length) {
    push(`Bagaimana kondisi penyakit kronis (${chronic.join(', ')}) saat ini?`);
  }

  return questions.slice(0, limit);
}

/** Ringkasan satu halaman untuk dokter. */
export function buildDoctorSummary(
  state,
  { profileId, now = new Date(), visitLimit = 5, trendLimit = 8, labLimit = 8 } = {}
) {
  const current = nowDate(now);
  const today = todayISO(current);
  const profile = profileFor(state, profileId);
  const medications = collection(state, 'medications');
  const refRanges = collection(state, 'refRanges');
  const vitals = collection(state, 'vitals');

  const activeMeds = activeMedicationsFor(state, profileId, today);
  const activeMedications = activeMeds.map((med) => {
    const simulation = simulateStockOut(med, { today });
    return {
      id: med.id,
      name: med.name ?? '',
      activeIngredient: med.activeIngredient ?? '',
      doseText: doseTextFor(med),
      scheduleText: formatSchedule(med),
      startDate: med.startDate ?? null,
      endDate: med.endDate ?? null,
      stock: {
        remaining: isNum(med?.stock?.remaining) ? med.stock.remaining : null,
        unit: med?.stock?.unit ?? '',
        runOutDate: simulation?.runOutDate ?? null,
        refillDue: Boolean(simulation?.refillDue)
      }
    };
  });

  const duplicates = findDuplicateIngredients(medications, { profileId }).map((group) => ({
    key: group.key,
    displayName: group.displayName,
    medicationNames: group.medicationNames,
    count: group.count
  }));

  const visitCap = Number.isFinite(visitLimit) ? Math.max(0, Math.floor(visitLimit)) : 5;
  const recentVisits = collection(state, 'visits')
    .filter((visit) => visit && visit.profileId === profileId)
    .slice()
    .sort(compareVisitsDesc)
    .slice(0, visitCap)
    .map((visit) => ({
      id: visit.id,
      date: visit.date ?? null,
      dateLabel: dateLabel(visit.date),
      doctorName: visit.doctorName ?? '',
      facility: visit.facility ?? '',
      complaint: visit.complaint ?? '',
      diagnosis: visit.diagnosis ?? '',
      notes: visit.notes ?? '',
      attachmentCount: Array.isArray(visit.attachments) ? visit.attachments.length : 0
    }));

  const trendCap = Number.isFinite(trendLimit) ? Math.max(0, Math.floor(trendLimit)) : 8;
  const vitalSummaries = [];
  for (const type of VITAL_TYPE_ORDER) {
    const trend = buildVitalTrend(type, vitals, refRanges, {
      profileId,
      limit: trendCap
    });
    if (!trend.latest) continue;

    const primary = trend.series[0] ?? null;
    const range =
      type === 'tension'
        ? {
            systolic: trend.series[0]?.range ?? null,
            diastolic: trend.series[1]?.range ?? null
          }
        : primary?.range ?? null;

    vitalSummaries.push({
      type,
      label: trend.label,
      display: trend.latest.display,
      date: trend.latest.date,
      flag: trend.latest.overall,
      flagLabel: FLAG_LABELS[trend.latest.overall] ?? FLAG_LABELS.unknown,
      range,
      stats: primary?.stats ?? statsForEmpty()
    });
  }

  const labCap = Number.isFinite(labLimit) ? Math.max(0, Math.floor(labLimit)) : 8;
  const labs = [];
  if (labCap > 0) {
    for (const lab of latestLabsByName(state, profileId)) {
      if (labs.length >= labCap) break;
      const flagged = flagLab(lab);
      labs.push({
        id: lab.id,
        name: lab.name ?? '',
        value: lab.value,
        unit: lab.unit ?? '',
        date: lab.date ?? null,
        flag: flagged.flag,
        flagLabel: FLAG_LABELS[flagged.flag] ?? FLAG_LABELS.unknown,
        range: flagged.range
      });
    }
  }

  const weekStart = startOfWeek(today);
  const adherenceResult = weeklyAdherence({
    medications,
    doseLogs: collection(state, 'doseLogs'),
    weekStartISO: weekStart,
    now: current,
    profileId
  });
  const adherence = {
    weekStart: adherenceResult?.weekStart ?? weekStart,
    weekEnd: adherenceResult?.weekEnd ?? null,
    taken: adherenceResult?.taken ?? 0,
    due: adherenceResult?.due ?? 0,
    percent: adherenceResult?.percent ?? null,
    label:
      adherenceResult?.label ??
      complianceLabel(adherenceResult?.percent ?? null)
  };

  const doctor =
    profile?.doctor && typeof profile.doctor === 'object'
      ? { ...profile.doctor }
      : { name: '', facility: '', phone: '' };

  return {
    app: 'Rawatku',
    generatedAt: current.toISOString(),
    profileId,
    profile: {
      name: profile?.name ?? '',
      age: ageFromBirthDate(profile?.birthDate ?? null, current),
      birthDate: profile?.birthDate ?? null,
      sex: profile?.sex ?? '',
      sexLabel: sexLabelFor(profile?.sex),
      bloodType: profile?.bloodType ?? '',
      allergies: Array.isArray(profile?.allergies) ? [...profile.allergies] : [],
      chronicConditions: Array.isArray(profile?.chronicConditions)
        ? [...profile.chronicConditions]
        : [],
      emergencyContacts: Array.isArray(profile?.emergencyContacts)
        ? profile.emergencyContacts.map((contact) => ({ ...contact }))
        : [],
      doctor
    },
    activeMedications,
    duplicates,
    recentVisits,
    vitals: vitalSummaries,
    labs,
    adherence,
    questions: buildControlQuestions(state, profileId, { now: current, max: MAX_QUESTIONS }),
    emergencyNumbers: [...EMERGENCY_NUMBERS],
    disclaimer: DISCLAIMERS.summary,
    isMedicalAdvice: false
  };
}

function statsForEmpty() {
  return {
    count: 0,
    min: null,
    max: null,
    avg: null,
    first: null,
    last: null,
    delta: null,
    deltaPct: null
  };
}

/** Teks polos ringkasan, untuk fallback tanpa HTML dan untuk pengujian. */
export function summaryToPlainText(summary) {
  if (!summary || typeof summary !== 'object') return '';

  const lines = [];
  const add = (line = '') => lines.push(line);
  const dash = (value) => {
    const text = cleanText(value);
    return text || '-';
  };

  add('RINGKASAN UNTUK DOKTER');
  add(`Dibuat: ${summary.generatedAt ?? '-'}`);
  add('');

  const profile = summary.profile ?? {};
  add('PROFIL');
  add(
    `Nama: ${dash(profile.name)}; Usia: ${profile.age ?? '-'}; Jenis kelamin: ${dash(
      profile.sexLabel
    )}; Golongan darah: ${dash(profile.bloodType)}`
  );
  add(
    `Alergi: ${
      Array.isArray(profile.allergies) && profile.allergies.length
        ? profile.allergies.join(', ')
        : '-'
    }`
  );
  add(
    `Penyakit kronis: ${
      Array.isArray(profile.chronicConditions) && profile.chronicConditions.length
        ? profile.chronicConditions.join(', ')
        : '-'
    }`
  );
  const doctor = profile.doctor ?? {};
  add(
    `Dokter: ${dash(doctor.name)}${doctor.facility ? ` — ${doctor.facility}` : ''}${
      doctor.phone ? ` (${doctor.phone})` : ''
    }`
  );
  if (Array.isArray(profile.emergencyContacts) && profile.emergencyContacts.length) {
    const contacts = profile.emergencyContacts
      .map(
        (contact) =>
          `${dash(contact.name)}${contact.relation ? ` (${contact.relation})` : ''}${
            contact.phone ? ` ${contact.phone}` : ''
          }`
      )
      .join('; ');
    add(`Kontak darurat: ${contacts}`);
  }
  add('');

  add('OBAT AKTIF');
  if (Array.isArray(summary.activeMedications) && summary.activeMedications.length) {
    for (const med of summary.activeMedications) {
      const parts = [dash(med.name)];
      if (med.doseText) parts.push(med.doseText);
      if (med.scheduleText) parts.push(med.scheduleText);
      const stock = med.stock ?? {};
      if (stock.remaining !== null && stock.remaining !== undefined) {
        parts.push(`stok ${stock.remaining} ${dash(stock.unit)}`);
      }
      if (stock.runOutDate) parts.push(`perkiraan habis ${stock.runOutDate}`);
      add(`- ${parts.join(' · ')}`);
    }
  } else {
    add('-');
  }
  add('');

  add('DUPLIKASI BAHAN AKTIF');
  if (Array.isArray(summary.duplicates) && summary.duplicates.length) {
    for (const dup of summary.duplicates) {
      add(`- ${dash(dup.displayName)}: ${(dup.medicationNames ?? []).join(', ')}`);
    }
  } else {
    add('-');
  }
  add('');

  add('KUNJUNGAN TERAKHIR');
  if (Array.isArray(summary.recentVisits) && summary.recentVisits.length) {
    for (const visit of summary.recentVisits) {
      const head = `${dash(visit.dateLabel)} — ${dash(visit.doctorName)}${
        visit.facility ? `, ${visit.facility}` : ''
      }`;
      const detail = [
        visit.complaint ? `keluhan: ${visit.complaint}` : '',
        visit.diagnosis ? `diagnosis tertulis: ${visit.diagnosis}` : ''
      ]
        .filter(Boolean)
        .join('; ');
      add(`- ${head}${detail ? ` — ${detail}` : ''}`);
    }
  } else {
    add('-');
  }
  add('');

  add('VITAL TERBARU');
  if (Array.isArray(summary.vitals) && summary.vitals.length) {
    for (const vital of summary.vitals) {
      add(
        `- ${dash(vital.label)}: ${dash(vital.display)} (${dash(vital.date)}) — ${dash(
          vital.flagLabel
        )}`
      );
    }
  } else {
    add('-');
  }
  add('');

  add('LAB TERBARU');
  if (Array.isArray(summary.labs) && summary.labs.length) {
    for (const lab of summary.labs) {
      add(
        `- ${dash(lab.name)}: ${lab.value ?? '-'} ${lab.unit ?? ''} (${dash(lab.date)}) — ${dash(
          lab.flagLabel
        )}`
      );
    }
  } else {
    add('-');
  }
  add('');

  const adherence = summary.adherence ?? {};
  add('KEPATUHAN MINGGU INI');
  add(
    `${adherence.taken ?? 0} dari ${adherence.due ?? 0} dosis tercatat${
      adherence.percent !== null && adherence.percent !== undefined
        ? ` (${adherence.percent}%)`
        : ''
    } — ${dash(adherence.label)}`
  );
  add('');

  add('PERTANYAAN UNTUK DOKTER');
  if (Array.isArray(summary.questions) && summary.questions.length) {
    summary.questions.forEach((question, index) => add(`${index + 1}. ${question}`));
  } else {
    add('-');
  }
  add('');

  add(`NOMOR DARURAT: ${(summary.emergencyNumbers ?? []).join(', ') || '-'}`);
  add('');
  add(summary.disclaimer ?? DISCLAIMERS.summary);

  return lines.join('\n');
}
