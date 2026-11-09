// Tren vital & pengelompokan hasil lab (CONTRACT.md 7.6).
// Murni, deterministik, tanpa DOM. Nilai di luar rentang bukan diagnosis.

import { DISCLAIMERS, VITAL_TYPES } from '../model.js';
import { flagLab, flagValue, resolveRange } from './safety.js';

function isNum(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function inProfile(vital, profileId) {
  if (profileId === null || profileId === undefined) return true;
  return vital?.profileId === profileId;
}

function compareVitals(a, b) {
  const date = String(a?.date ?? '').localeCompare(String(b?.date ?? ''));
  if (date !== 0) return date;
  const time = String(a?.time ?? '').localeCompare(String(b?.time ?? ''));
  if (time !== 0) return time;
  return String(a?.createdAt ?? '').localeCompare(String(b?.createdAt ?? ''));
}

function sortVitals(vitals, profileId) {
  return (Array.isArray(vitals) ? vitals : [])
    .filter((vital) => vital && typeof vital === 'object')
    .filter((vital) => inProfile(vital, profileId))
    .slice()
    .sort(compareVitals);
}

function takeLatest(list, limit) {
  if (!Array.isArray(list)) return [];
  if (limit === null || limit === undefined || !Number.isFinite(limit)) return list.slice();
  const n = Math.max(0, Math.floor(limit));
  return n === 0 ? [] : list.slice(-n);
}

function valuesOf(vital) {
  return vital?.values && typeof vital.values === 'object' ? vital.values : {};
}

function hasRelevantValues(type, vital) {
  const values = valuesOf(vital);
  if (type === 'tension') return isNum(values.systolic) && isNum(values.diastolic);
  return isNum(values.value);
}

function typeConfig(type, vital) {
  return VITAL_TYPES?.[type] ?? VITAL_TYPES?.[vital?.type] ?? null;
}

/**
 * Poin per tipe vital, urut tanggal naik. `limit` mengambil vital terbaru
 * sebanyak itu lalu hasilnya tetap urut naik.
 */
export function pointsForType(type, vitals, { profileId = null, limit = 30 } = {}) {
  const list = takeLatest(
    sortVitals(vitals, profileId).filter((vital) => vital.type === type),
    limit
  );

  if (type === 'tension') {
    const result = { systolic: [], diastolic: [] };
    for (const vital of list) {
      const values = valuesOf(vital);
      if (isNum(values.systolic)) result.systolic.push({ date: vital.date, value: values.systolic });
      if (isNum(values.diastolic)) result.diastolic.push({ date: vital.date, value: values.diastolic });
    }
    return result;
  }

  if (!VITAL_TYPES?.[type]) return null;

  const points = [];
  for (const vital of list) {
    const values = valuesOf(vital);
    if (isNum(values.value)) points.push({ date: vital.date, value: values.value });
  }
  return { value: points };
}

/**
 * Poin untuk satu metric (systolic/diastolic atau nama tipe tunggal),
 * urut tanggal naik.
 */
export function seriesForMetric(metric, vitals, { profileId = null, limit = 30 } = {}) {
  const type = metric === 'systolic' || metric === 'diastolic' ? 'tension' : metric;
  if (!VITAL_TYPES?.[type]) return [];

  const list = takeLatest(
    sortVitals(vitals, profileId).filter((vital) => vital.type === type),
    limit
  );

  const points = [];
  for (const vital of list) {
    const values = valuesOf(vital);
    const value =
      metric === 'systolic' || metric === 'diastolic' ? values[metric] : values.value;
    if (isNum(value)) points.push({ date: vital.date, value });
  }
  return points;
}

/** Vital terbaru dengan nilai relevan untuk tipe tersebut, atau null. */
export function latestFor(type, vitals, { profileId = null } = {}) {
  const list = sortVitals(vitals, profileId).filter(
    (vital) => vital.type === type && hasRelevantValues(type, vital)
  );
  return list.length ? list[list.length - 1] : null;
}

/** Statistik ringkas dari poin {date, value} yang sudah urut naik. */
export function statsFor(points) {
  const values = (Array.isArray(points) ? points : [])
    .filter((point) => point && isNum(point.value))
    .map((point) => point.value);

  if (!values.length) {
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

  const first = values[0];
  const last = values[values.length - 1];
  const delta = round2(last - first);

  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: round2(values.reduce((sum, value) => sum + value, 0) / values.length),
    first,
    last,
    delta,
    deltaPct: first !== 0 ? round2((delta / first) * 100) : null
  };
}

/**
 * Tren lengkap satu tipe vital: seri (dengan flag per titik & rentang),
 * plus ringkasan nilai terbaru.
 */
export function buildVitalTrend(type, vitals, refRanges, { profileId = null, limit = 30 } = {}) {
  const config = VITAL_TYPES?.[type] ?? null;
  const label = config?.label ?? type;
  const unit = config?.unit ?? '';
  const list = takeLatest(
    sortVitals(vitals, profileId).filter((vital) => vital.type === type),
    limit
  );

  const series = [];

  if (type === 'tension') {
    for (const key of ['systolic', 'diastolic']) {
      const range = resolveRange(key, refRanges, profileId);
      const points = [];
      for (const vital of list) {
        const value = valuesOf(vital)[key];
        if (!isNum(value)) continue;
        points.push({
          date: vital.date,
          value,
          flag: flagValue(value, { low: range?.low ?? null, high: range?.high ?? null })
        });
      }
      series.push({
        key,
        label: config?.componentLabels?.[key] ?? key,
        unit,
        points,
        range,
        stats: statsFor(points)
      });
    }
  } else if (config) {
    const range = resolveRange(type, refRanges, profileId);
    const points = [];
    for (const vital of list) {
      const value = valuesOf(vital).value;
      if (!isNum(value)) continue;
      points.push({
        date: vital.date,
        value,
        flag: flagValue(value, { low: range?.low ?? null, high: range?.high ?? null })
      });
    }
    series.push({
      key: type,
      label,
      unit,
      points,
      range,
      stats: statsFor(points)
    });
  }

  const latestVital = latestFor(type, vitals, { profileId });
  let latest = null;
  if (latestVital) {
    const flags = vitalFlags(latestVital, refRanges);
    latest = {
      date: latestVital.date,
      display: formatVital(type, latestVital),
      overall: flags.overall,
      flags: flags.flags
    };
  }

  return {
    type,
    label,
    unit,
    disclaimer: DISCLAIMERS.range,
    series,
    latest
  };
}

function vitalFlags(vital, refRanges) {
  const type = vital?.type;
  const config = VITAL_TYPES?.[type] ?? null;
  const values = valuesOf(vital);
  const components = Array.isArray(config?.components)
    ? config.components
    : type === 'tension'
      ? ['systolic', 'diastolic']
      : ['value'];

  const flags = {};
  for (const component of components) {
    const metric = component === 'value' ? type : component;
    const range = resolveRange(metric, refRanges, vital?.profileId);
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

  return { flags, overall };
}

/** '150/95 mmHg' | '180 mg/dL' | '' bila nilai tidak tersedia. */
export function formatVital(type, vital) {
  if (!vital || typeof vital !== 'object') return '';
  const config = typeConfig(type, vital);
  const unit =
    typeof vital.unit === 'string' && vital.unit ? vital.unit : config?.unit ?? '';
  const values = valuesOf(vital);

  if (type === 'tension' || vital.type === 'tension') {
    const systolic = values.systolic;
    const diastolic = values.diastolic;
    if (!isNum(systolic) && !isNum(diastolic)) return '';
    const text = `${isNum(systolic) ? systolic : '–'}/${isNum(diastolic) ? diastolic : '–'}`;
    return unit ? `${text} ${unit}` : text;
  }

  if (!isNum(values.value)) return '';
  return unit ? `${values.value} ${unit}` : String(values.value);
}

function compareLab(a, b) {
  const date = String(a?.date ?? '').localeCompare(String(b?.date ?? ''));
  if (date !== 0) return date;
  return String(a?.createdAt ?? '').localeCompare(String(b?.createdAt ?? ''));
}

/**
 * Kelompokkan lab per nama (case-insensitive), urut nama. Tiap grup memuat
 * titik (dengan flag dari rentang item lab itu sendiri), nilai terbaru, dan
 * statistik. `limit` mengambil titik terbaru per grup.
 */
export function groupLabResults(labs, { profileId = null, limit = 30 } = {}) {
  const list = (Array.isArray(labs) ? labs : [])
    .filter((lab) => lab && typeof lab === 'object')
    .filter((lab) => inProfile(lab, profileId));

  const groups = new Map();
  for (const lab of list) {
    const name = String(lab.name ?? '').trim();
    if (!name) continue;
    const key = name.normalize('NFKC').toLowerCase();
    let group = groups.get(key);
    if (!group) {
      group = { name, labs: [] };
      groups.set(key, group);
    }
    group.labs.push(lab);
  }

  const result = [];
  for (const group of groups.values()) {
    const sorted = group.labs.slice().sort(compareLab);
    const latestLab = sorted.length ? sorted[sorted.length - 1] : null;
    const limited = takeLatest(sorted, limit);
    const points = limited.map((lab) => ({
      date: lab.date,
      value: lab.value,
      flag: flagLab(lab).flag
    }));

    result.push({
      name: group.name,
      unit: latestLab?.unit ?? '',
      refLow: isNum(latestLab?.refLow) ? latestLab.refLow : null,
      refHigh: isNum(latestLab?.refHigh) ? latestLab.refHigh : null,
      points,
      latest: points.length ? points[points.length - 1] : null,
      stats: statsFor(points)
    });
  }

  result.sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
  return result;
}
