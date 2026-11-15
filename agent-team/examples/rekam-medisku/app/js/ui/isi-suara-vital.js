// Rekam Medisku — panel "Tanda vital" pada layar Isi dengan Suara (t22).
//
// Hanya membangun draf di memori. Penyimpanan dilakukan layar utama setelah
// konfirmasi eksplisit. Tidak menilai normal/tinggi dan tidak mendiagnosis.

import { h } from '../dom.js';
import { VITAL_TYPES, VITAL_TYPE_ORDER } from '../model.js';
import { parseDikteVital } from '../logic/ucapanVital.js';
import { todayISO } from '../logic/dates.js';
import { teksUlangVital } from '../suara/tts.js';

const PESAN_TIDAK_DIKENAL =
  'Ucapan belum dikenali. Coba ucapkan jenis dan nilainya, misalnya '
  + 'tensi seratus empat puluh per sembilan puluh.';

function field(labelText, control, { hint = '', required = false } = {}) {
  const wrapper = h('div', { class: 'field' });
  const label = h('label', { for: control.id }, labelText);
  if (required) label.appendChild(document.createTextNode(' *'));
  wrapper.appendChild(label);
  wrapper.appendChild(control);
  if (hint) wrapper.appendChild(h('p', { class: 'hint' }, hint));
  return wrapper;
}

function duaDigit(nilai) {
  return String(nilai).padStart(2, '0');
}

function waktuLokalSekarang(now) {
  return `${duaDigit(now.getHours())}:${duaDigit(now.getMinutes())}`;
}

function nilaiDatetimeLokal(now) {
  return `${todayISO(now)}T${waktuLokalSekarang(now)}`;
}

function bacaAngka(input) {
  const teks = String(input.value ?? '').trim();
  if (teks === '') return null;
  const angka = Number(teks.replace(',', '.'));
  return Number.isFinite(angka) ? angka : NaN;
}

/**
 * Bangun panel Tanda Vital.
 *
 * @param {{ctx:object}} opsi
 */
export function buatPanelVital({ ctx } = {}) {
  let parsed = null;

  const panel = h('div', {
    id: 'suara-panel-vital',
    role: 'tabpanel',
    'aria-labelledby': 'suara-tab-vital',
    class: 'card stack'
  });

  panel.appendChild(h('h2', { class: 'card-title' }, 'Dikte tanda vital'));
  panel.appendChild(h('p', { class: 'muted' },
    'Ucapkan jenis dan nilainya, misalnya "tensi seratus empat puluh per sembilan puluh". '
    + 'Aplikasi tidak menilai normal atau tinggi.'));

  const jenisSelect = h('select', {
    id: 'suara-vital-jenis', name: 'suara-vital-jenis', required: true
  }, VITAL_TYPE_ORDER.map((type) => h('option', {
    value: type
  }, VITAL_TYPES[type].label)));

  const sistolikInput = h('input', {
    id: 'suara-vital-sistolik', name: 'suara-vital-sistolik', type: 'number',
    inputmode: 'decimal', step: 'any'
  });
  const diastolikInput = h('input', {
    id: 'suara-vital-diastolik', name: 'suara-vital-diastolik', type: 'number',
    inputmode: 'decimal', step: 'any'
  });
  const nilaiInput = h('input', {
    id: 'suara-vital-nilai', name: 'suara-vital-nilai', type: 'number',
    inputmode: 'decimal', step: 'any'
  });
  const unitInput = h('input', {
    id: 'suara-vital-unit', name: 'suara-vital-unit', type: 'text', readOnly: true
  });
  const waktuInput = h('input', {
    id: 'suara-vital-waktu', name: 'suara-vital-waktu', type: 'datetime-local'
  });
  const parseBox = h('p', { id: 'suara-vital-parse', class: 'muted' });

  const tensionRow = h('div', { class: 'form-grid' },
    field('Sistolik', sistolikInput),
    field('Diastolik', diastolikInput));
  const nilaiField = field('Nilai', nilaiInput);

  panel.appendChild(field('Jenis vital', jenisSelect, { required: true }));
  panel.appendChild(tensionRow);
  panel.appendChild(nilaiField);
  panel.appendChild(h('div', { class: 'form-grid' },
    field('Satuan', unitInput),
    field('Tanggal dan jam', waktuInput, { hint: 'Kosongkan untuk memakai waktu sekarang.' })));
  panel.appendChild(parseBox);
  panel.appendChild(h('p', { class: 'hint' },
    'Tanda vital tidak menilai diagnosis. Nilai di luar rentang acuan hanya ditandai oleh modul safety.'));

  function jenisAktif() {
    return VITAL_TYPES[jenisSelect.value] ? jenisSelect.value : 'tension';
  }

  function perbaruiJenis() {
    const type = jenisAktif();
    const definition = VITAL_TYPES[type];
    const tension = type === 'tension';
    tensionRow.hidden = !tension;
    nilaiField.hidden = tension;
    unitInput.value = definition.unit;
    sistolikInput.required = tension;
    diastolikInput.required = tension;
    nilaiInput.required = !tension;
  }

  jenisSelect.addEventListener('change', () => {
    perbaruiJenis();
  });

  function isiDariHasil(hasil) {
    parsed = hasil;
    jenisSelect.value = VITAL_TYPES[hasil.jenis] ? hasil.jenis : 'tension';
    perbaruiJenis();
    const values = hasil.values || {};
    if (hasil.jenis === 'tension') {
      sistolikInput.value = values.systolic ?? '';
      diastolikInput.value = values.diastolic ?? '';
      nilaiInput.value = '';
    } else {
      nilaiInput.value = values.value ?? '';
      sistolikInput.value = '';
      diastolikInput.value = '';
    }
    unitInput.value = hasil.unit || VITAL_TYPES[hasil.jenis]?.unit || '';
    const now = typeof ctx?.now === 'function' ? ctx.now() : new Date();
    waktuInput.value = nilaiDatetimeLokal(now);
    parseBox.textContent = `Terdengar: ${hasil.teksAsli || ''}`;
  }

  function dariDikte(teks) {
    let hasil = null;
    try {
      hasil = parseDikteVital(teks);
    } catch {
      hasil = null;
    }

    if (!hasil) {
      bersihkan();
      return { ok: false, pesan: PESAN_TIDAK_DIKENAL, fokus: jenisSelect };
    }

    isiDariHasil(hasil);
    const draf = bacaDraf();
    const ringkas = draf.ok ? draf.ringkasan : `Draf vital: ${teks}`;
    return { ok: true, ringkas, fokus: null };
  }

  function bacaDraf() {
    const type = jenisAktif();
    const definition = VITAL_TYPES[type];
    if (!definition) {
      return { ok: false, pesan: 'Jenis vital tidak dikenal.', fokus: jenisSelect };
    }

    const values = {};
    if (definition.kind === 'dual') {
      const sistolik = bacaAngka(sistolikInput);
      if (sistolik === null || Number.isNaN(sistolik)) {
        return { ok: false, pesan: 'Nilai sistolik wajib berupa angka.', fokus: sistolikInput };
      }
      const diastolik = bacaAngka(diastolikInput);
      if (diastolik === null || Number.isNaN(diastolik)) {
        return { ok: false, pesan: 'Nilai diastolik wajib berupa angka.', fokus: diastolikInput };
      }
      values.systolic = sistolik;
      values.diastolic = diastolik;
    } else {
      const nilai = bacaAngka(nilaiInput);
      if (nilai === null || Number.isNaN(nilai)) {
        return { ok: false, pesan: 'Nilai vital wajib berupa angka.', fokus: nilaiInput };
      }
      values.value = nilai;
    }

    const now = typeof ctx?.now === 'function' ? ctx.now() : new Date();
    let date = todayISO(now);
    let time = waktuLokalSekarang(now);

    const raw = String(waktuInput.value || '').trim();
    if (raw !== '') {
      const cocok = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(raw);
      if (!cocok) {
        return {
          ok: false,
          pesan: 'Tanggal dan jam harus diisi dengan format yang valid.',
          fokus: waktuInput
        };
      }
      date = cocok[1];
      time = cocok[2];
    }

    const draf = {
      type,
      date,
      time,
      values,
      unit: definition.unit,
      note: ''
    };

    return {
      ok: true,
      draf,
      ringkasan: teksUlangVital(draf)
    };
  }

  function siapKonfirmasi() {
    const hasil = bacaDraf();
    if (!hasil.ok) return hasil;
    return { ok: true, draf: hasil.draf, ringkasan: hasil.ringkasan };
  }

  function bolehKonfirmasi() {
    return bacaDraf().ok;
  }

  async function simpan(draf) {
    if (!draf || !VITAL_TYPES[draf.type]) {
      throw new Error('Draf vital tidak tersedia. Ulangi pengisian.');
    }
    if (!ctx?.state || typeof ctx.state.upsert !== 'function') {
      throw new Error('Penyimpanan tidak tersedia. Coba muat ulang layar.');
    }
    const saved = await ctx.state.upsert('vitals', {
      type: draf.type,
      date: draf.date,
      time: draf.time,
      values: { ...draf.values },
      unit: draf.unit,
      note: ''
    });
    try {
      ctx?.toast?.('Tanda vital dicatat.', 'success');
    } catch {
      // Toast bukan syarat keberhasilan simpan.
    }
    return saved;
  }

  function bersihkan() {
    parsed = null;
    jenisSelect.value = 'tension';
    perbaruiJenis();
    sistolikInput.value = '';
    diastolikInput.value = '';
    nilaiInput.value = '';
    unitInput.value = VITAL_TYPES.tension.unit;
    waktuInput.value = '';
    parseBox.textContent = '';
  }

  function fokusPertama() {
    jenisSelect.focus();
  }

  perbaruiJenis();

  return {
    mode: 'vital',
    element: panel,
    dariDikte,
    siapKonfirmasi,
    bolehKonfirmasi,
    simpan,
    bersihkan,
    fokusPertama,
    statusPemeriksaan: () => null,
    pesanSukses: (saved) => `Tanda vital ${VITAL_TYPES[saved?.type || parsed?.jenis]?.label || ''} sudah dicatat.`
      .replace(/\s+/g, ' ')
      .trim()
  };
}
