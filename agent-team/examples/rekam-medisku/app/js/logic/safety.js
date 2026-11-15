// Logika keselamatan deterministik (CONTRACT.md 7.5).
// Tidak mendiagnosis, tidak menyarankan dosis, dan tidak mengklaim interaksi obat.
// Pemeriksaan hanya membandingkan teks bahan aktif dan rentang acuan milik pengguna.

import { DISCLAIMERS, VITAL_TYPES } from '../model.js';

export const FLAG_LABELS = {
  low: 'Rendah',
  normal: 'Dalam rentang',
  high: 'Tinggi',
  unknown: 'Tanpa rentang'
};

function isNum(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function timeValue(iso) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** Nama bahan aktif untuk ditampilkan: buang isi kurung, rapikan spasi. */
function displayIngredient(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalisasi teks bahan aktif: NFKC, lowercase, buang isi tanda kurung,
 * ganti karakter non-alfanumerik dengan spasi, rapikan spasi.
 * "Paracetamol (500 mg)" -> "paracetamol".
 */
export function normalizeIngredient(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Kelompokkan obat aktif per bahan aktif ternormalisasi. Hanya grup dengan
 * minimal dua obat yang dikembalikan. Ini bukan pemeriksaan interaksi obat.
 */
export function findDuplicateIngredients(medications, { profileId = null } = {}) {
  const list = Array.isArray(medications) ? medications : [];
  const groups = new Map();

  for (const med of list) {
    if (!med || typeof med !== 'object') continue;
    if (med.active === false) continue;
    if (profileId !== null && profileId !== undefined && med.profileId !== profileId) continue;

    const key = normalizeIngredient(med.activeIngredient);
    if (!key) continue;

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        displayName: displayIngredient(med.activeIngredient),
        medicationIds: [],
        medicationNames: [],
        count: 0
      };
      groups.set(key, group);
    }
    group.medicationIds.push(med.id);
    group.medicationNames.push(med.name ?? '');
    group.count += 1;
  }

  return [...groups.values()].filter((group) => group.count >= 2);
}

/**
 * Grup duplikasi bahan aktif yang memuat obat tertentu. Dibatasi ke profil
 * obat tersebut agar tidak membandingkan antar-profil.
 */
export function duplicatesForMedication(med, medications) {
  if (!med || med.id === null || med.id === undefined) return [];
  const options = med.profileId ? { profileId: med.profileId } : {};
  return findDuplicateIngredients(medications, options).filter((group) =>
    group.medicationIds.includes(med.id)
  );
}

/**
 * Nilai di bawah `low` -> low, di atas `high` -> high, selain itu normal.
 * Tanpa nilai angka atau tanpa satu pun batas -> unknown (bukan diagnosis).
 */
export function flagValue(value, { low = null, high = null } = {}) {
  if (!isNum(value)) return 'unknown';
  const hasLow = isNum(low);
  const hasHigh = isNum(high);
  if (!hasLow && !hasHigh) return 'unknown';
  if (hasLow && value < low) return 'low';
  if (hasHigh && value > high) return 'high';
  return 'normal';
}

/**
 * Rentang acuan untuk metric + profil. Bila ada lebih dari satu, pakai
 * updatedAt terbaru. Mengembalikan { low, high, unit } atau null.
 */
export function resolveRange(metric, refRanges, profileId) {
  const list = Array.isArray(refRanges) ? refRanges : [];
  let best = null;

  for (const range of list) {
    if (!range || range.metric !== metric) continue;
    if (profileId !== undefined && range.profileId !== profileId) continue;
    if (!best || timeValue(range.updatedAt) >= timeValue(best.updatedAt)) {
      best = range;
    }
  }

  if (!best) return null;
  return {
    low: isNum(best.low) ? best.low : null,
    high: isNum(best.high) ? best.high : null,
    unit: typeof best.unit === 'string' ? best.unit : ''
  };
}

function componentMetric(type, component) {
  return component === 'value' ? type : component;
}

/**
 * Tandai vital terhadap rentang acuan pengguna. Tension memeriksa systolic &
 * diastolic; tipe tunggal memeriksa values.value.
 */
export function flagVital(vital, refRanges, { profileId = vital?.profileId } = {}) {
  if (!vital || typeof vital !== 'object') return null;

  const type = vital.type;
  const config = VITAL_TYPES?.[type] ?? null;
  const values = vital.values && typeof vital.values === 'object' ? vital.values : {};
  const components = Array.isArray(config?.components)
    ? config.components
    : type === 'tension'
      ? ['systolic', 'diastolic']
      : ['value'];

  const flags = {};
  const ranges = {};

  for (const component of components) {
    const metric = componentMetric(type, component);
    const range = resolveRange(metric, refRanges, profileId);
    ranges[metric] = range;
    flags[component] = flagValue(values[component], {
      low: range?.low ?? null,
      high: range?.high ?? null
    });
  }

  const all = Object.values(flags);
  const overall = all.includes('high')
    ? 'high'
    : all.includes('low')
      ? 'low'
      : all.includes('normal')
        ? 'normal'
        : 'unknown';

  return {
    vitalId: vital.id ?? null,
    type,
    date: vital.date ?? null,
    flags,
    overall,
    ranges,
    disclaimer: DISCLAIMERS.range
  };
}

/**
 * Tandai hasil lab terhadap rentang acuan yang tertulis pada item lab.
 * Nilai tanpa rentang -> unknown.
 */
export function flagLab(lab) {
  const flag = flagValue(lab?.value, {
    low: lab?.refLow ?? null,
    high: lab?.refHigh ?? null
  });

  return {
    labId: lab?.id ?? null,
    name: lab?.name ?? '',
    flag,
    range: {
      low: isNum(lab?.refLow) ? lab.refLow : null,
      high: isNum(lab?.refHigh) ? lab.refHigh : null
    },
    disclaimer: DISCLAIMERS.range
  };
}
