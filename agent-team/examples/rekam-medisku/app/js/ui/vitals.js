// Rekam Medisku — layar Vital & Lab (t6).
// Tab tipe vital, form tensi/nilai tunggal, grafik tren SVG, rentang acuan,
// serta form/daftar hasil lab. Semua perhitungan memakai modul logic.

import { h, clear } from '../dom.js';
import {
  DISCLAIMERS,
  VITAL_TYPES,
  VITAL_TYPE_ORDER,
  RANGE_METRICS
} from '../model.js';
import {
  todayISO,
  isValidDateISO,
  isValidTime,
  formatDateID
} from '../logic/dates.js';
import {
  buildVitalTrend,
  formatVital,
  groupLabResults
} from '../logic/vitals.js';
import {
  flagVital,
  flagLab,
  resolveRange,
  FLAG_LABELS
} from '../logic/safety.js';
import { buildLineChartSVG, renderChart } from './chart.js';

const METRIC_LABELS = {
  systolic: 'Sistolik',
  diastolic: 'Diastolik',
  glucose: 'Gula darah',
  weight: 'Berat badan',
  temperature: 'Suhu tubuh',
  pulse: 'Denyut nadi',
  spo2: 'Saturasi oksigen (SpO₂)'
};

const METRIC_UNITS = {
  systolic: 'mmHg',
  diastolic: 'mmHg',
  glucose: 'mg/dL',
  weight: 'kg',
  temperature: '°C',
  pulse: 'bpm',
  spo2: '%'
};

// Preferensi tampilan (bukan data medis); bertahan saat layar dirender ulang.
let lastVitalType = 'tension';
let lastLabName = null;

function formatDateSafe(dateISO, style = 'long') {
  try {
    return formatDateID(dateISO, style);
  } catch {
    return dateISO || '';
  }
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function field(labelText, control, { hint = '', required = false } = {}) {
  const wrapper = h('div', { class: 'field' });
  const label = h('label', { for: control.id }, labelText);
  if (required) label.appendChild(document.createTextNode(' *'));
  wrapper.appendChild(label);
  wrapper.appendChild(control);
  if (hint) wrapper.appendChild(h('p', { class: 'hint' }, hint));
  return wrapper;
}

function parseNumber(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const number = Number(text.replace(',', '.'));
  return Number.isFinite(number) ? number : NaN;
}

function buildErrorCard(message) {
  return h('section', { class: 'card', role: 'alert' },
    h('h2', {}, 'Data vital tidak dapat dimuat'),
    h('p', {}, message || 'Coba muat ulang layar ini.'));
}

function flagBadge(flag) {
  const value = FLAG_LABELS[flag] ? flag : 'unknown';
  return h('span', { class: `flag-badge flag-${value}` }, FLAG_LABELS[value]);
}

/**
 * Render layar Vital & Lab.
 * @param {HTMLElement} root
 * @param {object} ctx
 */
export async function render(root, ctx) {
  clear(root);

  const screen = h('section', { id: 'screen-vitals', class: 'screen vitals' });
  root.appendChild(screen);

  const profile = ctx.profile || null;
  const profileId = profile?.id || null;
  const now = typeof ctx.now === 'function' ? ctx.now() : new Date();
  const today = todayISO(now);
  const currentTime = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  if (!profileId) {
    screen.appendChild(h('p', { class: 'empty-state' },
      'Profil aktif tidak ditemukan. ', h('a', { href: '#/profil' }, 'Buka Profil')));
    return undefined;
  }

  let vitals = [];
  let labs = [];
  let refRanges = [];
  try {
    vitals = ctx.state.list('vitals', { profileId });
    labs = ctx.state.list('labs', { profileId });
    refRanges = ctx.state.list('refRanges', { profileId });
  } catch (error) {
    screen.appendChild(buildErrorCard(error?.message));
    return undefined;
  }
  vitals = Array.isArray(vitals) ? vitals.slice() : [];
  labs = Array.isArray(labs) ? labs.slice() : [];
  refRanges = Array.isArray(refRanges) ? refRanges.slice() : [];

  const local = {
    activeType: VITAL_TYPES[lastVitalType] ? lastVitalType : 'tension',
    saving: false
  };

  // ---------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------

  const header = h('header', { class: 'screen-header' });
  header.appendChild(h('h1', {}, 'Vital & Lab'));
  header.appendChild(h('p', { class: 'muted' },
    'Catat tensi, gula darah, berat, suhu, nadi, SpO₂, dan hasil lab. '
    + 'Rentang acuan diatur sendiri oleh Anda/dokter.'));
  screen.appendChild(header);

  // ---------------------------------------------------------------------
  // Tab tipe vital
  // ---------------------------------------------------------------------

  const vitalCard = h('section', { class: 'card' });
  vitalCard.appendChild(h('h2', {}, 'Catat vital'));
  const tabs = h('div', {
    id: 'vital-tabs',
    class: 'vital-tabs',
    role: 'tablist',
    'aria-label': 'Jenis vital'
  });
  const tabButtons = [];
  for (const type of VITAL_TYPE_ORDER) {
    const definition = VITAL_TYPES[type];
    const button = h('button', {
      type: 'button',
      id: `vital-tab-${type}`,
      class: 'vital-tab',
      role: 'tab',
      'data-vital-type': type,
      'aria-selected': 'false'
    }, definition.label);
    tabButtons.push({ type, button });
    tabs.appendChild(button);
  }
  vitalCard.appendChild(tabs);

  const form = h('form', {
    id: 'vital-form',
    class: 'stack vital-form',
    novalidate: true
  });
  const dateInput = h('input', { id: 'vital-date', name: 'date', type: 'date', required: true });
  const timeInput = h('input', { id: 'vital-time', name: 'time', type: 'time' });
  const systolicInput = h('input', {
    id: 'vital-systolic', name: 'systolic', type: 'number', inputmode: 'decimal', step: 'any'
  });
  const diastolicInput = h('input', {
    id: 'vital-diastolic', name: 'diastolic', type: 'number', inputmode: 'decimal', step: 'any'
  });
  const valueInput = h('input', {
    id: 'vital-value', name: 'value', type: 'number', inputmode: 'decimal', step: 'any'
  });
  const noteInput = h('textarea', { id: 'vital-note', name: 'note', rows: 2 });

  form.appendChild(h('div', { class: 'form-grid' },
    field('Tanggal', dateInput, { required: true }),
    field('Jam', timeInput)));
  const systolicField = field('Sistolik (mmHg)', systolicInput);
  const diastolicField = field('Diastolik (mmHg)', diastolicInput);
  const valueField = field('Nilai', valueInput);
  const tensionRow = h('div', { class: 'form-grid vital-tension-fields' },
    systolicField, diastolicField);
  const valueRow = h('div', { class: 'form-grid vital-single-fields' }, valueField);
  form.appendChild(tensionRow);
  form.appendChild(valueRow);
  form.appendChild(field('Catatan', noteInput, { hint: 'Boleh dikosongkan.' }));

  const formError = h('p', {
    id: 'vital-form-error', class: 'error-text', role: 'alert', hidden: true
  });
  form.appendChild(formError);
  const saveButton = h('button', {
    id: 'btn-save-vital', type: 'submit', class: 'btn btn-primary'
  }, 'Simpan vital');
  form.appendChild(h('div', { class: 'actions' }, saveButton));
  vitalCard.appendChild(form);
  screen.appendChild(vitalCard);

  function showFormError(node, message, control = null) {
    node.textContent = message || '';
    node.hidden = !message;
    if (control) {
      control.setAttribute('aria-invalid', 'true');
      control.focus();
    }
  }

  function clearFormError(node) {
    node.textContent = '';
    node.hidden = true;
    for (const control of [dateInput, timeInput, systolicInput, diastolicInput, valueInput]) {
      control.removeAttribute('aria-invalid');
    }
  }

  function syncTypeUi() {
    for (const entry of tabButtons) {
      const selected = entry.type === local.activeType;
      entry.button.setAttribute('aria-selected', selected ? 'true' : 'false');
      entry.button.classList.toggle('is-active', selected);
    }
    const isTension = local.activeType === 'tension';
    tensionRow.hidden = !isTension;
    valueRow.hidden = isTension;
    const definition = VITAL_TYPES[local.activeType];
    valueField.querySelector('label').textContent = `Nilai (${definition.unit})`;
    renderVitalChart();
    renderVitalList();
    renderRangeSummary();
  }

  // ---------------------------------------------------------------------
  // Grafik & daftar vital
  // ---------------------------------------------------------------------

  const vitalChartCard = h('section', { class: 'card' });
  const chartTitle = h('h2', { id: 'vital-chart-title' }, 'Tren vital');
  vitalChartCard.appendChild(chartTitle);
  const vitalChart = h('div', { id: 'vital-chart', class: 'chart-container' });
  vitalChartCard.appendChild(vitalChart);
  const rangeSummary = h('div', { id: 'vital-range-summary', class: 'range-summary' });
  vitalChartCard.appendChild(rangeSummary);
  const vitalList = h('ul', { id: 'vital-list', class: 'list vital-list' });
  vitalChartCard.appendChild(h('h3', {}, 'Catatan terakhir'));
  vitalChartCard.appendChild(vitalList);
  screen.appendChild(vitalChartCard);

  function renderVitalChart() {
    const type = local.activeType;
    const definition = VITAL_TYPES[type];
    chartTitle.textContent = `Tren ${definition.label}`;
    try {
      const trend = buildVitalTrend(type, vitals, refRanges, {
        profileId,
        limit: 30
      });
      const series = trend.series.map((entry) => ({
        key: entry.key,
        label: entry.label,
        unit: entry.unit,
        points: entry.points
      }));
      const rangeSeries = trend.series.find((entry) => entry.range
        && (entry.range.low != null || entry.range.high != null));
      const svg = buildLineChartSVG({
        series,
        low: rangeSeries?.range?.low ?? null,
        high: rangeSeries?.range?.high ?? null,
        title: `Tren ${definition.label}`,
        unit: definition.unit
      });
      renderChart(vitalChart, svg);
    } catch {
      vitalChart.textContent = 'Grafik belum tersedia.';
    }
  }

  function renderRangeSummary() {
    clear(rangeSummary);
    const metrics = local.activeType === 'tension' ? ['systolic', 'diastolic'] : [local.activeType];
    for (const metric of metrics) {
      const range = resolveRange(metric, refRanges, profileId);
      const unit = range?.unit || METRIC_UNITS[metric] || '';
      const text = range
        ? `${METRIC_LABELS[metric]}: ${range.low ?? '–'}–${range.high ?? '–'} ${unit}`.trim()
        : `${METRIC_LABELS[metric]}: rentang acuan belum diatur`;
      rangeSummary.appendChild(h('span', { class: 'range-chip' }, text));
    }
    rangeSummary.appendChild(h('p', { class: 'muted small' }, DISCLAIMERS.range));
  }

  function sortVitalsDescending(list) {
    return list.slice().sort((a, b) => (
      String(b.date || '').localeCompare(String(a.date || ''))
      || String(b.time || '').localeCompare(String(a.time || ''))
      || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    ));
  }

  function renderVitalList() {
    clear(vitalList);
    const entries = sortVitalsDescending(
      vitals.filter((vital) => vital.type === local.activeType)
    ).slice(0, 12);

    if (!entries.length) {
      vitalList.appendChild(h('li', { class: 'empty-state' },
        `Belum ada catatan ${VITAL_TYPES[local.activeType].label.toLowerCase()}.`));
      return;
    }

    for (const vital of entries) {
      const item = h('li', { class: 'vital-item', 'data-vital-id': vital.id });
      let flagged = null;
      try {
        flagged = flagVital(vital, refRanges, { profileId });
      } catch {
        flagged = null;
      }
      const heading = h('div', { class: 'vital-heading' });
      heading.appendChild(h('strong', { class: 'vital-value' },
        formatVital(local.activeType, vital) || 'Nilai tidak terbaca'));
      if (flagged) heading.appendChild(flagBadge(flagged.overall));
      item.appendChild(heading);
      item.appendChild(h('span', { class: 'muted small' },
        [formatDateSafe(vital.date, 'short'), vital.time].filter(Boolean).join(' · ')));
      if (vital.note) item.appendChild(h('p', { class: 'vital-note' }, vital.note));
      if (flagged && local.activeType === 'tension') {
        const details = Object.entries(flagged.flags || {})
          .map(([component, flag]) => `${VITAL_TYPES.tension.componentLabels[component] || component}: ${FLAG_LABELS[flag] || FLAG_LABELS.unknown}`);
        item.appendChild(h('span', { class: 'muted small' }, details.join(' · ')));
      }
      item.appendChild(h('div', { class: 'actions' },
        h('button', {
          type: 'button',
          class: 'btn btn-danger',
          'data-action': 'delete-vital',
          'data-id': vital.id
        }, 'Hapus')));
      vitalList.appendChild(item);
    }
  }

  // ---------------------------------------------------------------------
  // Rentang acuan
  // ---------------------------------------------------------------------

  const rangeCard = h('section', { class: 'card' });
  rangeCard.appendChild(h('h2', {}, 'Rentang acuan'));
  rangeCard.appendChild(h('p', { class: 'muted small' },
    'Rentang ini milik Anda/dokter. Nilai di luar rentang bukan diagnosis.'));

  const rangeForm = h('form', { id: 'range-form', class: 'stack', novalidate: true });
  const metricSelect = h('select', { id: 'range-metric', name: 'metric' },
    ...RANGE_METRICS.map((metric) => h('option', { value: metric },
      METRIC_LABELS[metric] || metric)));
  const rangeLowInput = h('input', {
    id: 'range-low', name: 'low', type: 'number', inputmode: 'decimal', step: 'any'
  });
  const rangeHighInput = h('input', {
    id: 'range-high', name: 'high', type: 'number', inputmode: 'decimal', step: 'any'
  });
  rangeForm.appendChild(h('div', { class: 'form-grid' },
    field('Metrik', metricSelect),
    field('Batas bawah', rangeLowInput),
    field('Batas atas', rangeHighInput)));
  const rangeError = h('p', {
    id: 'range-form-error', class: 'error-text', role: 'alert', hidden: true
  });
  rangeForm.appendChild(rangeError);
  const rangeSave = h('button', {
    id: 'btn-save-range', type: 'submit', class: 'btn btn-primary'
  }, 'Simpan rentang');
  rangeForm.appendChild(h('div', { class: 'actions' }, rangeSave));
  rangeCard.appendChild(rangeForm);

  rangeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormError(rangeError);
    const metric = metricSelect.value;
    if (!RANGE_METRICS.includes(metric)) {
      showFormError(rangeError, 'Pilih metrik yang valid.', metricSelect);
      return;
    }
    const low = parseNumber(rangeLowInput.value);
    const high = parseNumber(rangeHighInput.value);
    if (Number.isNaN(low) || Number.isNaN(high)) {
      showFormError(rangeError, 'Batas rentang harus berupa angka.', Number.isNaN(low) ? rangeLowInput : rangeHighInput);
      return;
    }
    if (low == null && high == null) {
      showFormError(rangeError, 'Isi minimal satu batas rentang.', rangeLowInput);
      return;
    }
    if (low != null && high != null && low > high) {
      showFormError(rangeError, 'Batas bawah tidak boleh lebih besar dari batas atas.', rangeLowInput);
      return;
    }

    const existing = refRanges.find((range) => range.metric === metric
      && range.profileId === profileId);
    const item = existing
      ? { ...existing, low, high, unit: METRIC_UNITS[metric] || '' }
      : {
        profileId,
        metric,
        low,
        high,
        unit: METRIC_UNITS[metric] || ''
      };

    rangeSave.disabled = true;
    try {
      await ctx.state.upsert('refRanges', item);
      ctx.toast('Rentang acuan disimpan.', 'success');
      await ctx.refresh();
    } catch (error) {
      showFormError(rangeError, error?.message || 'Rentang gagal disimpan.');
      rangeSave.disabled = false;
    }
  });

  const rangeList = h('ul', { id: 'range-list', class: 'list range-list' });
  rangeCard.appendChild(h('h3', {}, 'Rentang tersimpan'));
  rangeCard.appendChild(rangeList);
  screen.appendChild(rangeCard);

  function renderRangeList() {
    clear(rangeList);
    if (!refRanges.length) {
      rangeList.appendChild(h('li', { class: 'empty-state' },
        'Belum ada rentang acuan. Tambahkan agar nilai ditandai rendah/tinggi.'));
      return;
    }
    for (const range of refRanges) {
      const item = h('li', { class: 'range-item' });
      const unit = range.unit || METRIC_UNITS[range.metric] || '';
      item.appendChild(h('span', { class: 'range-label' },
        METRIC_LABELS[range.metric] || range.metric));
      item.appendChild(h('span', { class: 'range-value' },
        `${range.low ?? '–'}–${range.high ?? '–'} ${unit}`.trim()));
      item.appendChild(h('button', {
        type: 'button',
        class: 'btn btn-danger',
        'data-action': 'delete-range',
        'data-id': range.id
      }, 'Hapus'));
      rangeList.appendChild(item);
    }
  }

  // ---------------------------------------------------------------------
  // Hasil lab
  // ---------------------------------------------------------------------

  const labCard = h('section', { class: 'card' });
  labCard.appendChild(h('h2', {}, 'Hasil lab'));
  labCard.appendChild(h('p', { class: 'muted small' },
    'Rentang rujukan ditulis sesuai dokumen lab. Bukan interpretasi aplikasi.'));

  const labForm = h('form', { id: 'lab-form', class: 'stack', novalidate: true });
  const labNameInput = h('input', {
    id: 'lab-name', name: 'name', type: 'text', required: true, maxlength: 120
  });
  const labDateInput = h('input', { id: 'lab-date', name: 'date', type: 'date' });
  const labValueInput = h('input', {
    id: 'lab-value', name: 'value', type: 'number', inputmode: 'decimal', step: 'any'
  });
  const labUnitInput = h('input', {
    id: 'lab-unit', name: 'unit', type: 'text', maxlength: 24
  });
  const labRefLowInput = h('input', {
    id: 'lab-ref-low', name: 'refLow', type: 'number', inputmode: 'decimal', step: 'any'
  });
  const labRefHighInput = h('input', {
    id: 'lab-ref-high', name: 'refHigh', type: 'number', inputmode: 'decimal', step: 'any'
  });
  const labNoteInput = h('textarea', { id: 'lab-note', name: 'note', rows: 2 });

  labForm.appendChild(h('div', { class: 'form-grid' },
    field('Nama pemeriksaan', labNameInput, { required: true }),
    field('Tanggal', labDateInput)));
  labForm.appendChild(h('div', { class: 'form-grid' },
    field('Nilai', labValueInput, { required: true }),
    field('Satuan', labUnitInput, { hint: 'mis. %, mg/dL' }),
    field('Rujukan bawah', labRefLowInput),
    field('Rujukan atas', labRefHighInput)));
  labForm.appendChild(field('Catatan', labNoteInput, { hint: 'Boleh dikosongkan.' }));
  const labError = h('p', {
    id: 'lab-form-error', class: 'error-text', role: 'alert', hidden: true
  });
  labForm.appendChild(labError);
  const labSave = h('button', {
    id: 'btn-save-lab', type: 'submit', class: 'btn btn-primary'
  }, 'Simpan hasil lab');
  labForm.appendChild(h('div', { class: 'actions' }, labSave));
  labCard.appendChild(labForm);

  labForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormError(labError);
    const name = labNameInput.value.trim();
    if (!name) {
      showFormError(labError, 'Nama pemeriksaan wajib diisi.', labNameInput);
      return;
    }
    const date = labDateInput.value || today;
    if (!isValidDateISO(date)) {
      showFormError(labError, 'Tanggal lab tidak valid.', labDateInput);
      return;
    }
    const value = parseNumber(labValueInput.value);
    if (value == null || Number.isNaN(value)) {
      showFormError(labError, 'Nilai lab harus berupa angka.', labValueInput);
      return;
    }
    const refLow = parseNumber(labRefLowInput.value);
    const refHigh = parseNumber(labRefHighInput.value);
    if (Number.isNaN(refLow)) {
      showFormError(labError, 'Rujukan bawah harus berupa angka.', labRefLowInput);
      return;
    }
    if (Number.isNaN(refHigh)) {
      showFormError(labError, 'Rujukan atas harus berupa angka.', labRefHighInput);
      return;
    }
    if (refLow != null && refHigh != null && refLow > refHigh) {
      showFormError(labError, 'Rujukan bawah tidak boleh lebih besar dari rujukan atas.', labRefLowInput);
      return;
    }

    labSave.disabled = true;
    try {
      await ctx.state.upsert('labs', {
        profileId,
        date,
        name,
        value,
        unit: labUnitInput.value.trim(),
        refLow,
        refHigh,
        note: labNoteInput.value.trim(),
        facility: '',
        source: null
      });
      ctx.toast('Hasil lab disimpan.', 'success');
      await ctx.refresh();
    } catch (error) {
      showFormError(labError, error?.message || 'Hasil lab gagal disimpan.');
      labSave.disabled = false;
    }
  });

  const labChartCard = h('section', { class: 'lab-chart-card' });
  const labSelectLabel = h('label', { for: 'lab-select' }, 'Grafik pemeriksaan');
  const labSelect = h('select', { id: 'lab-select', name: 'lab' });
  labChartCard.appendChild(labSelectLabel);
  labChartCard.appendChild(labSelect);
  const labChart = h('div', { id: 'lab-chart', class: 'chart-container' });
  labChartCard.appendChild(labChart);
  const labChartSummary = h('p', { class: 'muted small' });
  labChartCard.appendChild(labChartSummary);
  labCard.appendChild(labChartCard);

  const labList = h('ul', { id: 'lab-list', class: 'list lab-list' });
  labCard.appendChild(h('h3', {}, 'Catatan lab'));
  labCard.appendChild(labList);
  screen.appendChild(labCard);

  function renderLabChart() {
    let groups = [];
    try {
      groups = groupLabResults(labs, { profileId, limit: 30 });
    } catch {
      groups = [];
    }

    clear(labSelect);
    if (!groups.length) {
      labSelect.appendChild(h('option', { value: '' }, 'Belum ada hasil lab'));
      labSelect.disabled = true;
      labSelect.value = '';
      labChartSummary.textContent = '';
      try {
        renderChart(labChart, buildLineChartSVG({
          series: [],
          title: 'Tren hasil lab',
          unit: '',
          width: 640,
          height: 220
        }));
      } catch {
        labChart.textContent = 'Grafik belum tersedia.';
      }
      return;
    }

    labSelect.disabled = false;
    for (const group of groups) {
      labSelect.appendChild(h('option', { value: group.name }, group.name));
    }
    const selected = groups.find((group) => group.name.toLowerCase() === String(lastLabName || '').toLowerCase())
      || groups[0];
    lastLabName = selected.name;
    labSelect.value = selected.name;

    try {
      renderChart(labChart, buildLineChartSVG({
        series: [{
          key: selected.name,
          label: selected.name,
          unit: selected.unit || '',
          points: selected.points
        }],
        low: selected.refLow,
        high: selected.refHigh,
        title: `Tren ${selected.name}`,
        unit: selected.unit || '',
        width: 640,
        height: 220
      }));
    } catch {
      labChart.textContent = 'Grafik belum tersedia.';
    }

    if (selected.latest) {
      labChartSummary.textContent = `Nilai terbaru: ${selected.latest.value} `
        + `${selected.unit || ''} (${formatDateSafe(selected.latest.date, 'short')}).`;
    } else {
      labChartSummary.textContent = '';
    }
  }

  labSelect.addEventListener('change', () => {
    lastLabName = labSelect.value || null;
    renderLabChart();
  });

  function renderLabList() {
    clear(labList);
    const sorted = labs.slice().sort((a, b) => (
      String(b.date || '').localeCompare(String(a.date || ''))
      || String(a.name || '').localeCompare(String(b.name || ''), 'id', { sensitivity: 'base' })
    ));

    if (!sorted.length) {
      labList.appendChild(h('li', { class: 'empty-state' },
        'Belum ada hasil lab. Tambahkan dari dokumen lab Anda.'));
      return;
    }

    for (const lab of sorted) {
      const item = h('li', { class: 'lab-item', 'data-lab-id': lab.id });
      let flagged = null;
      try {
        flagged = flagLab(lab);
      } catch {
        flagged = null;
      }
      const heading = h('div', { class: 'lab-heading' });
      heading.appendChild(h('strong', {}, lab.name || 'Pemeriksaan'));
      if (flagged) heading.appendChild(flagBadge(flagged.flag));
      item.appendChild(heading);
      item.appendChild(h('span', { class: 'lab-value' },
        `${lab.value} ${lab.unit || ''}`.trim()));
      const rangeText = lab.refLow != null || lab.refHigh != null
        ? `Rujukan ${lab.refLow ?? '–'}–${lab.refHigh ?? '–'} ${lab.unit || ''}`.trim()
        : 'Tanpa rentang rujukan';
      item.appendChild(h('span', { class: 'muted small' },
        [formatDateSafe(lab.date, 'short'), rangeText].filter(Boolean).join(' · ')));
      if (lab.note) item.appendChild(h('p', { class: 'small' }, lab.note));
      item.appendChild(h('div', { class: 'actions' },
        h('button', {
          type: 'button',
          class: 'btn btn-danger',
          'data-action': 'delete-lab',
          'data-id': lab.id
        }, 'Hapus')));
      labList.appendChild(item);
    }
  }

  // ---------------------------------------------------------------------
  // Simpan vital
  // ---------------------------------------------------------------------

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (local.saving) return;
    clearFormError(formError);

    const date = dateInput.value;
    if (!isValidDateISO(date)) {
      showFormError(formError, 'Tanggal vital wajib diisi dengan tanggal yang valid.', dateInput);
      return;
    }
    const time = timeInput.value || '';
    if (time !== '' && !isValidTime(time)) {
      showFormError(formError, 'Jam harus format HH:mm.', timeInput);
      return;
    }

    const type = local.activeType;
    const definition = VITAL_TYPES[type];
    const values = {};
    if (definition.kind === 'dual') {
      const systolic = parseNumber(systolicInput.value);
      const diastolic = parseNumber(diastolicInput.value);
      if (systolic == null || Number.isNaN(systolic)) {
        showFormError(formError, 'Nilai sistolik wajib diisi dengan angka.', systolicInput);
        return;
      }
      if (diastolic == null || Number.isNaN(diastolic)) {
        showFormError(formError, 'Nilai diastolik wajib diisi dengan angka.', diastolicInput);
        return;
      }
      values.systolic = systolic;
      values.diastolic = diastolic;
    } else {
      const value = parseNumber(valueInput.value);
      if (value == null || Number.isNaN(value)) {
        showFormError(formError, `Nilai ${definition.label.toLowerCase()} wajib diisi dengan angka.`, valueInput);
        return;
      }
      values.value = value;
    }

    local.saving = true;
    saveButton.disabled = true;
    try {
      await ctx.state.upsert('vitals', {
        profileId,
        type,
        date,
        time,
        values,
        unit: definition.unit,
        note: noteInput.value.trim()
      });
      ctx.toast('Catatan vital disimpan.', 'success');
      lastVitalType = type;
      await ctx.refresh();
    } catch (error) {
      showFormError(formError, error?.message || 'Catatan vital gagal disimpan.');
      local.saving = false;
      saveButton.disabled = false;
    }
  });

  // ---------------------------------------------------------------------
  // Aksi & event
  // ---------------------------------------------------------------------

  async function deleteItem(collection, id, label) {
    if (!ctx.confirm(`Hapus ${label}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await ctx.state.remove(collection, id);
      ctx.toast('Catatan dihapus.', 'success');
      await ctx.refresh();
    } catch (error) {
      ctx.toast(error?.message || 'Catatan gagal dihapus.', 'error');
    }
  }

  const clickHandler = async (event) => {
    const tab = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('[data-vital-type]')
      : null;
    if (tab && screen.contains(tab)) {
      const type = tab.dataset.vitalType;
      if (VITAL_TYPES[type]) {
        local.activeType = type;
        lastVitalType = type;
        syncTypeUi();
      }
      return;
    }

    const target = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('[data-action]')
      : null;
    if (!target || !screen.contains(target)) return;
    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === 'delete-vital') {
      await deleteItem('vitals', id, 'catatan vital ini');
    } else if (action === 'delete-lab') {
      await deleteItem('labs', id, 'hasil lab ini');
    } else if (action === 'delete-range') {
      await deleteItem('refRanges', id, 'rentang acuan ini');
    }
  };

  screen.addEventListener('click', clickHandler);

  dateInput.value = today;
  timeInput.value = currentTime;
  labDateInput.value = today;
  syncTypeUi();
  renderRangeList();
  renderLabChart();
  renderLabList();

  return () => {
    screen.removeEventListener('click', clickHandler);
  };
}

export default render;
