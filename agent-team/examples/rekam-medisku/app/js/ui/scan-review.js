// Rekam Medisku — layar Tinjau hasil pindai (t14).
// Satu-satunya layar yang boleh menyimpan hasil pindai, dan hanya setelah
// pengguna mencentang verifikasi. Tidak ada auto-save dan tidak ada jaringan.

import { h, clear } from '../dom.js';
import {
  DISCLAIMERS,
  OCR_LOW_CONFIDENCE,
  MAX_OCR_TEXT_CHARS,
  PARSER_RESEP_VERSION,
  PARSER_REKAM_VERSION
} from '../model.js';
import { getScanDraft, clearScanDraft } from '../scanSession.js';
import { photoDataUrl } from '../photos.js';
import { todayISO, isValidDateISO, isValidTime } from '../logic/dates.js';
import { frasaTerjemahan, LABEL_ATURAN_MAKAN } from '../logic/resepKamus.js';
import { BENTUK_SEDIAAN, SATUAN_KEKUATAN } from '../logic/resepSediaan.js';
import { obatKeMedication, jadwalUntukObat } from '../logic/resep.js';
import { rekamKeKunjungan, labKeLab } from '../logic/rekam.js';
import { parseRujukan } from '../logic/labParse.js';

const WARNING_DOSIS =
  'Kesalahan membaca dosis bisa berbahaya. Cocokkan dengan apoteker atau dokter.';

const MEAL_VALUES = ['sebelum', 'sesudah', 'saat', 'bila-perlu'];

const EMPTY_DRAFT_MESSAGE =
  'Tidak ada draf pindai. Pindai atau tempel teks dokumen terlebih dahulu, lalu buka kembali layar ini.';

// ---------------------------------------------------------------------------
// Utilitas nilai
// ---------------------------------------------------------------------------

function nowOf(ctx) {
  try {
    return typeof ctx?.now === 'function' ? ctx.now() : new Date();
  } catch {
    return new Date();
  }
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function parseStrengthInput(text) {
  const raw = String(text ?? '').trim();
  if (raw === '') return { ok: true, value: null };
  const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Zµ%]+)?$/);
  if (!match) return { ok: false, value: null };
  const nilai = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(nilai) || nilai < 0) return { ok: false, value: null };
  let satuan = (match[2] || '').toLowerCase();
  if (satuan === 'µg' || satuan === 'ug') satuan = 'mcg';
  if (satuan !== '' && !SATUAN_KEKUATAN.includes(satuan)) {
    return { ok: false, value: null };
  }
  const teks = `${String(nilai).replace('.', ',')} ${satuan}`.trim();
  return { ok: true, value: { nilai, satuan, teks } };
}

function parseTotalInput(text, bentukSediaan) {
  const raw = String(text ?? '').trim();
  if (raw === '') return { ok: true, value: null };
  const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?$/);
  if (!match) return { ok: false, value: null };
  const jumlah = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(jumlah) || jumlah < 0) return { ok: false, value: null };
  const satuan = (match[2] || bentukSediaan?.satuan || 'tablet').toLowerCase();
  return { ok: true, value: { jumlah, satuan, teksAsli: raw } };
}

function normalizeTimeToken(token) {
  const cleaned = String(token || '').replace(/[.]/g, ':');
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const jam = String(Number(match[1])).padStart(2, '0');
  const menit = match[2];
  const hasil = `${jam}:${menit}`;
  return isValidTime(hasil) ? hasil : null;
}

function parseTimesInput(text) {
  const raw = String(text ?? '').trim();
  if (raw === '') return { ok: true, times: [], invalid: [] };
  const tokens = raw.split(/[,;\s]+/).filter((token) => token !== '');
  const times = [];
  const invalid = [];
  for (const token of tokens) {
    const normalized = normalizeTimeToken(token);
    if (normalized) times.push(normalized);
    else invalid.push(token);
  }
  const unique = [...new Set(times)].sort((a, b) => a.localeCompare(b));
  return { ok: invalid.length === 0, times: unique, invalid };
}

function formatTimes(times) {
  return Array.isArray(times) ? times.join(', ') : '';
}

function formatKekuatan(kekuatan) {
  if (!kekuatan) return '';
  if (typeof kekuatan.teks === 'string' && kekuatan.teks !== '') return kekuatan.teks;
  if (Number.isFinite(kekuatan.nilai)) {
    return `${String(kekuatan.nilai).replace('.', ',')} ${kekuatan.satuan || ''}`.trim();
  }
  return '';
}

function formatJumlah(jumlahTotal) {
  if (!jumlahTotal) return '';
  if (Number.isFinite(jumlahTotal.jumlah)) {
    return `${jumlahTotal.jumlah} ${jumlahTotal.satuan || ''}`.trim();
  }
  return String(jumlahTotal.teksAsli || '');
}

function confidencePercent(value) {
  return `${Math.round(value * 100)}%`;
}

function modeLabel(mode) {
  return mode === 'rekam-medis' ? 'Rekam medis rumah sakit' : 'Resep / etiket obat';
}

// ---------------------------------------------------------------------------
// Bentuk item resep
// ---------------------------------------------------------------------------

function blankObat() {
  return {
    nama: '',
    kekuatan: null,
    bentukSediaan: null,
    kaliSehari: null,
    takaranPerDosis: null,
    satuanTakaran: null,
    waktuMinum: [],
    aturanMakan: null,
    durasiHari: null,
    jumlahTotal: null,
    jadwalJam: [],
    polaHarian: null,
    teksAsli: 'Ditambahkan manual',
    teksTerjemahan: frasaTerjemahan({ kaliSehari: null, takaranPerDosis: null }),
    kepercayaan: 1,
    bagianTidakDipahami: [],
    // keadaan khusus layar tinjau
    strengthDraft: '',
    totalDraft: '',
    timesDraft: '',
    timesManual: false
  };
}

function fromParserObat(obat) {
  const source = obat && typeof obat === 'object' ? obat : {};
  const item = {
    nama: String(source.nama || ''),
    kekuatan: source.kekuatan ? { ...source.kekuatan } : null,
    bentukSediaan: source.bentukSediaan ? { ...source.bentukSediaan } : null,
    kaliSehari: Number.isInteger(source.kaliSehari) ? source.kaliSehari : null,
    takaranPerDosis: Number.isFinite(source.takaranPerDosis) ? source.takaranPerDosis : null,
    satuanTakaran: typeof source.satuanTakaran === 'string' ? source.satuanTakaran : null,
    waktuMinum: Array.isArray(source.waktuMinum) ? [...source.waktuMinum] : [],
    aturanMakan: typeof source.aturanMakan === 'string' ? source.aturanMakan : null,
    durasiHari: Number.isInteger(source.durasiHari) ? source.durasiHari : null,
    jumlahTotal: source.jumlahTotal ? { ...source.jumlahTotal } : null,
    jadwalJam: Array.isArray(source.jadwalJam) ? [...source.jadwalJam] : [],
    polaHarian: Array.isArray(source.polaHarian) ? [...source.polaHarian] : null,
    teksAsli: String(source.teksAsli || ''),
    teksTerjemahan: String(source.teksTerjemahan || ''),
    kepercayaan: Number.isFinite(source.kepercayaan) ? source.kepercayaan : 1,
    bagianTidakDipahami: Array.isArray(source.bagianTidakDipahami)
      ? [...source.bagianTidakDipahami]
      : [],
    strengthDraft: '',
    totalDraft: '',
    timesDraft: '',
    timesManual: false
  };
  item.strengthDraft = formatKekuatan(item.kekuatan);
  item.totalDraft = formatJumlah(item.jumlahTotal);
  item.timesDraft = formatTimes(item.jadwalJam);
  if (!item.teksTerjemahan) item.teksTerjemahan = frasaTerjemahan(item);
  return item;
}

function materializeObat(item) {
  const strength = parseStrengthInput(item.strengthDraft);
  const total = parseTotalInput(item.totalDraft, item.bentukSediaan);
  const times = parseTimesInput(item.timesDraft);
  const jadwal = times.ok ? times.times : item.jadwalJam;
  const obat = {
    nama: String(item.nama || '').trim(),
    kekuatan: strength.ok ? strength.value : item.kekuatan,
    bentukSediaan: item.bentukSediaan ? { ...item.bentukSediaan } : null,
    kaliSehari: item.kaliSehari,
    takaranPerDosis: item.takaranPerDosis,
    satuanTakaran: item.bentukSediaan
      ? item.bentukSediaan.satuanLabel
      : item.satuanTakaran,
    waktuMinum: [...item.waktuMinum],
    aturanMakan: item.aturanMakan,
    durasiHari: item.durasiHari,
    jumlahTotal: total.ok ? total.value : item.jumlahTotal,
    jadwalJam: jadwal,
    polaHarian: item.polaHarian ? [...item.polaHarian] : null,
    teksAsli: item.teksAsli || 'Ditambahkan manual',
    teksTerjemahan: '',
    kepercayaan: Number.isFinite(item.kepercayaan) ? item.kepercayaan : 1,
    bagianTidakDipahami: [...item.bagianTidakDipahami]
  };
  obat.teksTerjemahan = frasaTerjemahan(obat);
  return obat;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export async function render(root, ctx) {
  clear(root);

  const section = h('section', { id: 'screen-scan-review', class: 'stack' });
  root.appendChild(section);

  const draft = getScanDraft();
  if (!draft || typeof draft !== 'object') {
    renderEmpty(section, ctx);
    return undefined;
  }

  const mode = draft.mode === 'rekam-medis' ? 'rekam-medis' : 'resep';
  const now = nowOf(ctx);
  const profileId = ctx?.profile?.id || null;
  const parsedResep = draft.terjemahan && typeof draft.terjemahan === 'object'
    ? draft.terjemahan
    : null;
  const parsedRekam = draft.rekam && typeof draft.rekam === 'object' ? draft.rekam : null;

  const ocrConfidence = Number.isFinite(draft?.ocr?.kepercayaan)
    ? draft.ocr.kepercayaan
    : null;
  const parserConfidence = Number.isFinite(parsedResep?.kepercayaan)
    ? parsedResep.kepercayaan
    : (Number.isFinite(parsedRekam?.kepercayaan) ? parsedRekam.kepercayaan : null);
  const shownConfidence = ocrConfidence ?? parserConfidence;

  const sourceObat = Array.isArray(parsedResep?.obat) ? parsedResep.obat : [];
  let items = sourceObat.map(fromParserObat);
  if (mode === 'resep' && items.length === 0) items.push(blankObat());

  const sourceLab = Array.isArray(parsedRekam?.hasilLab) ? parsedRekam.hasilLab : [];
  let labs = sourceLab.map((hasil) => ({
    nama: String(hasil?.nama || ''),
    nilai: Number.isFinite(hasil?.nilai) ? hasil.nilai : null,
    satuan: String(hasil?.satuan || ''),
    kepercayaan: Number.isFinite(hasil?.kepercayaan) ? hasil.kepercayaan : null,
    refTeks: hasil?.rujukan
      ? String(hasil.rujukan.teks
        || [hasil.rujukan.low, hasil.rujukan.high].filter((n) => n !== null).join(' - '))
      : ''
  }));

  const rekam = parsedRekam?.draf && typeof parsedRekam.draf === 'object'
    ? parsedRekam.draf
    : {};
  const rekamState = {
    tanggal: rekam.tanggal || '',
    faskes: String(rekam.faskes || ''),
    dokter: String(rekam.dokter || ''),
    diagnosis: Array.isArray(rekam.diagnosisTertulis)
      ? rekam.diagnosisTertulis.join(', ')
      : String(rekam.diagnosisTertulis || ''),
    keluhan: String(rekam.keluhan || ''),
    catatan: String(rekam.catatan || '')
  };

  let dirty = false;
  let saving = false;

  // -------------------------------------------------------------------------
  // Kerangka layar
  // -------------------------------------------------------------------------

  section.appendChild(h('h1', {}, 'Tinjau Hasil Pindai'));
  section.appendChild(h('p', { class: 'muted' },
    `Mode: ${modeLabel(mode)} · Sumber: ${draft.source === 'foto' ? 'foto' : 'teks'}`));

  const warning = h('div', { id: 'review-warning', class: 'review-warning', role: 'note' },
    h('p', {}, DISCLAIMERS.ocr),
    h('p', {}, DISCLAIMERS.review),
    h('p', {}, h('strong', {}, WARNING_DOSIS)));
  section.appendChild(warning);

  const layout = h('div', { class: 'review-layout' });
  section.appendChild(layout);

  const sourcePanel = h('aside', {
    id: 'review-source-panel',
    class: 'review-source',
    'aria-label': 'Dokumen asli'
  });
  sourcePanel.appendChild(h('h2', {}, 'Dokumen asli'));
  buildSourcePanel(sourcePanel, draft);
  sourcePanel.appendChild(h('p', { id: 'review-photo-warning' }, DISCLAIMERS.photo));
  layout.appendChild(sourcePanel);

  const fieldsPanel = h('div', { class: 'review-fields' });
  layout.appendChild(fieldsPanel);

  // Kepercayaan -------------------------------------------------------------
  const lowConfidence = shownConfidence !== null
    && shownConfidence < OCR_LOW_CONFIDENCE;
  const confidence = h('p', {
    id: 'review-confidence',
    class: lowConfidence ? 'is-low-confidence' : null,
    role: 'status'
  }, shownConfidence === null
    ? 'Kepercayaan: tidak tersedia (jalur teks).'
    : `Kepercayaan ${ocrConfidence !== null ? 'OCR' : 'parser'}: ${confidencePercent(shownConfidence)}`
      + (lowConfidence ? ' — rendah, perlu diperiksa.' : ''));
  fieldsPanel.appendChild(confidence);

  const lowList = collectLowConfidence(items, labs, mode);
  const lowBox = h('div', { id: 'review-low-confidence' });
  if (lowConfidence) {
    lowBox.appendChild(h('p', {},
      'Kepercayaan hasil baca rendah. Periksa teks mentah dan setiap angka dengan dokumen asli '
      + 'sebelum menyimpan.'));
  }
  for (const entry of lowList) {
    lowBox.appendChild(h('p', {}, `Perlu diperiksa: ${entry}`));
  }
  if (lowConfidence || lowList.length > 0) {
    lowBox.classList.add('is-low-confidence');
    lowBox.classList.add('review-low-confidence');
  }
  fieldsPanel.appendChild(lowBox);

  // Teks OCR ---------------------------------------------------------------
  const ocrTextArea = h('textarea', {
    id: 'review-ocr-text',
    class: 'review-ocr-text',
    rows: '8',
    spellcheck: 'false',
    'aria-label': 'Teks OCR mentah yang dapat disunting'
  });
  ocrTextArea.value = String(draft.teksAsli || '');
  ocrTextArea.addEventListener('input', () => { dirty = true; });
  fieldsPanel.appendChild(field('Teks OCR mentah (dapat disunting)', ocrTextArea, {
    hint: 'Teks ini disimpan sebagai sumber hasil pindai. Periksa dengan dokumen asli.'
  }));

  // Bagian tidak dipahami --------------------------------------------------
  const unparsed = mode === 'rekam-medis'
    ? (Array.isArray(parsedRekam?.bagianTidakDipahami) ? parsedRekam.bagianTidakDipahami : [])
    : (Array.isArray(parsedResep?.bagianTidakDipahami) ? parsedResep.bagianTidakDipahami : []);
  const unparsedList = h('ul', { id: 'review-unparsed-list', class: 'stack' });
  if (unparsed.length === 0) {
    unparsedList.hidden = true;
  } else {
    for (const teks of unparsed) {
      unparsedList.appendChild(h('li', { class: 'is-review-warning' }, String(teks)));
    }
  }
  fieldsPanel.appendChild(h('div', { class: 'stack' },
    h('h2', {}, 'Bagian yang tidak dikenali'),
    unparsedList));

  // Bagian mode ------------------------------------------------------------
  let itemsContainer = null;
  let startDateInput = null;
  let labsContainer = null;

  const canEditSchedule = (i) => {
    const item = items[i];
    if (!item) return;
    if (item.timesManual) return;
    item.jadwalJam = item.aturanMakan === 'bila-perlu' ? [] : jadwalUntukObat(item);
    item.timesDraft = formatTimes(item.jadwalJam);
    const timesInput = section.querySelector(`#review-item-times-${i}`);
    if (timesInput) timesInput.value = item.timesDraft;
  };

  const refreshDerived = (i) => {
    const item = items[i];
    if (!item) return;
    canEditSchedule(i);
    item.teksTerjemahan = frasaTerjemahan(item);
    const translation = section.querySelector(`#review-item-translation-${i}`);
    if (translation) translation.textContent = item.teksTerjemahan;
  };

  function buildItemNode(item, i) {
    const card = h('article', { id: `review-item-${i}`, class: 'review-item' });
    const heading = h('h3', {}, `Obat ${i + 1}`);
    if (Number.isFinite(item.kepercayaan) && item.kepercayaan < OCR_LOW_CONFIDENCE) {
      heading.appendChild(h('span', {
        class: 'is-low-confidence',
        style: 'margin-left: 8px; font-size: 0.875rem;'
      }, 'Kepercayaan rendah'));
    }
    card.appendChild(heading);

    const fields = h('div', { class: 'review-item-fields' });

    const nameInput = h('input', {
      id: `review-item-name-${i}`,
      type: 'text',
      value: item.nama,
      required: true,
      autocomplete: 'off'
    });
    nameInput.addEventListener('input', () => {
      item.nama = nameInput.value;
      dirty = true;
    });
    fields.appendChild(field(`Nama obat ${i + 1}`, nameInput, { required: true }));

    const strengthInput = h('input', {
      id: `review-item-strength-${i}`,
      type: 'text',
      value: item.strengthDraft,
      placeholder: 'mis. 5 mg',
      autocomplete: 'off'
    });
    strengthInput.addEventListener('input', () => {
      item.strengthDraft = strengthInput.value;
      dirty = true;
    });
    fields.appendChild(field('Kekuatan', strengthInput, {
      hint: 'Angka dan satuan, mis. 5 mg / 500 mg / 0,5 mg.'
    }));

    const formSelect = h('select', { id: `review-item-form-${i}` });
    formSelect.appendChild(h('option', { value: '' }, 'Tidak disebutkan'));
    for (const kode of Object.keys(BENTUK_SEDIAAN)) {
      formSelect.appendChild(h('option', { value: kode }, BENTUK_SEDIAAN[kode].label));
    }
    formSelect.value = item.bentukSediaan?.kode || '';
    formSelect.addEventListener('change', () => {
      item.bentukSediaan = formSelect.value ? { ...BENTUK_SEDIAAN[formSelect.value] } : null;
      if (item.bentukSediaan) item.satuanTakaran = item.bentukSediaan.satuanLabel;
      dirty = true;
      refreshDerived(i);
    });
    fields.appendChild(field('Bentuk sediaan', formSelect));

    const frequencyInput = h('input', {
      id: `review-item-frequency-${i}`,
      type: 'number',
      min: '1',
      max: '12',
      step: '1',
      value: item.kaliSehari === null ? '' : String(item.kaliSehari)
    });
    frequencyInput.addEventListener('input', () => {
      const raw = frequencyInput.value.trim();
      item.kaliSehari = raw === '' ? null : Number(raw);
      item.polaHarian = null;
      dirty = true;
      refreshDerived(i);
    });
    fields.appendChild(field('Kali sehari', frequencyInput, {
      hint: 'Bilangan bulat 1–12 atau kosongkan bila tidak diketahui.'
    }));

    const doseInput = h('input', {
      id: `review-item-dose-${i}`,
      type: 'number',
      min: '0',
      step: '0.5',
      value: item.takaranPerDosis === null ? '' : String(item.takaranPerDosis)
    });
    doseInput.addEventListener('input', () => {
      const raw = doseInput.value.trim();
      item.takaranPerDosis = raw === '' ? null : Number(raw);
      dirty = true;
      refreshDerived(i);
    });
    fields.appendChild(field('Takaran per dosis', doseInput, {
      hint: 'Jumlah satuan tiap kali minum, mis. 1 tablet.'
    }));

    const mealSelect = h('select', { id: `review-item-meal-${i}` });
    mealSelect.appendChild(h('option', { value: '' }, 'Tidak disebutkan'));
    for (const value of MEAL_VALUES) {
      mealSelect.appendChild(h('option', { value }, LABEL_ATURAN_MAKAN[value] || value));
    }
    mealSelect.value = item.aturanMakan || '';
    mealSelect.addEventListener('change', () => {
      item.aturanMakan = mealSelect.value || null;
      dirty = true;
      refreshDerived(i);
    });
    fields.appendChild(field('Aturan makan', mealSelect));

    const durationInput = h('input', {
      id: `review-item-duration-${i}`,
      type: 'number',
      min: '0',
      step: '1',
      value: item.durasiHari === null ? '' : String(item.durasiHari)
    });
    durationInput.addEventListener('input', () => {
      const raw = durationInput.value.trim();
      item.durasiHari = raw === '' ? null : Number(raw);
      dirty = true;
      refreshDerived(i);
    });
    fields.appendChild(field('Durasi (hari)', durationInput, {
      hint: 'Kosongkan bila tidak tertulis.'
    }));

    const totalInput = h('input', {
      id: `review-item-total-${i}`,
      type: 'text',
      value: item.totalDraft,
      placeholder: 'mis. 15 tablet',
      autocomplete: 'off'
    });
    totalInput.addEventListener('input', () => {
      item.totalDraft = totalInput.value;
      dirty = true;
    });
    fields.appendChild(field('Jumlah total', totalInput, {
      hint: 'Jumlah yang diserahkan, mis. 15 tablet / 1 botol.'
    }));

    const timesInput = h('input', {
      id: `review-item-times-${i}`,
      type: 'text',
      value: item.timesDraft,
      placeholder: 'mis. 07:00, 19:00',
      autocomplete: 'off'
    });
    timesInput.addEventListener('input', () => {
      item.timesDraft = timesInput.value;
      item.timesManual = true;
      const parsed = parseTimesInput(timesInput.value);
      item.jadwalJam = parsed.times;
      dirty = true;
    });
    fields.appendChild(field('Waktu minum', timesInput, {
      hint: 'Jam HH:mm dipisah koma. Mengubah jam manual tidak akan ditimpa otomatis.'
    }));

    card.appendChild(fields);

    const translation = h('p', {
      id: `review-item-translation-${i}`,
      class: 'review-translation'
    }, item.teksTerjemahan);
    card.appendChild(translation);

    const itemUnparsed = h('ul', { id: `review-item-unparsed-${i}`, class: 'stack' });
    if (item.bagianTidakDipahami.length === 0) {
      itemUnparsed.hidden = true;
    } else {
      for (const teks of item.bagianTidakDipahami) {
        itemUnparsed.appendChild(h('li', { class: 'is-review-warning' }, String(teks)));
      }
    }
    card.appendChild(itemUnparsed);

    const removeButton = h('button', {
      id: `btn-remove-item-${i}`,
      type: 'button',
      class: 'button danger',
      disabled: items.length <= 1
    }, 'Hapus obat ini');
    removeButton.addEventListener('click', () => {
      if (items.length <= 1) return;
      items.splice(i, 1);
      dirty = true;
      renderItems();
    });
    card.appendChild(removeButton);

    return card;
  }

  function renderItems() {
    if (!itemsContainer) return;
    clear(itemsContainer);
    items.forEach((item, i) => itemsContainer.appendChild(buildItemNode(item, i)));
  }

  function buildLabNode(lab, j) {
    const row = h('div', { id: `review-lab-${j}`, class: 'review-item' });
    row.appendChild(h('h3', {}, `Hasil lab ${j + 1}`));
    const fields = h('div', { class: 'review-item-fields' });

    const nameInput = h('input', {
      id: `review-lab-name-${j}`,
      type: 'text',
      value: lab.nama,
      autocomplete: 'off'
    });
    nameInput.addEventListener('input', () => {
      lab.nama = nameInput.value;
      dirty = true;
    });
    fields.appendChild(field(`Nama pemeriksaan ${j + 1}`, nameInput));

    const valueInput = h('input', {
      id: `review-lab-value-${j}`,
      type: 'number',
      step: 'any',
      value: lab.nilai === null ? '' : String(lab.nilai)
    });
    valueInput.addEventListener('input', () => {
      const raw = valueInput.value.trim().replace(',', '.');
      lab.nilai = raw === '' ? null : Number(raw);
      dirty = true;
    });
    fields.appendChild(field('Nilai', valueInput));

    const unitInput = h('input', {
      id: `review-lab-unit-${j}`,
      type: 'text',
      value: lab.satuan,
      placeholder: 'mis. mg/dL',
      autocomplete: 'off'
    });
    unitInput.addEventListener('input', () => {
      lab.satuan = unitInput.value;
      dirty = true;
    });
    fields.appendChild(field('Satuan', unitInput));

    const refInput = h('input', {
      id: `review-lab-ref-${j}`,
      type: 'text',
      value: lab.refTeks,
      placeholder: 'mis. 4,0 - 5,6',
      autocomplete: 'off'
    });
    refInput.addEventListener('input', () => {
      lab.refTeks = refInput.value;
      dirty = true;
    });
    fields.appendChild(field('Rentang rujukan', refInput, {
      hint: 'Rentang dari dokumen. Bukan diagnosis.'
    }));

    row.appendChild(fields);

    const removeButton = h('button', {
      id: `review-lab-remove-${j}`,
      type: 'button',
      class: 'button danger'
    }, 'Hapus hasil lab ini');
    removeButton.addEventListener('click', () => {
      labs.splice(j, 1);
      dirty = true;
      renderLabs();
    });
    row.appendChild(removeButton);

    return row;
  }

  function renderLabs() {
    if (!labsContainer) return;
    clear(labsContainer);
    labs.forEach((lab, j) => labsContainer.appendChild(buildLabNode(lab, j)));
  }

  if (mode === 'resep') {
    const startDate = h('input', {
      id: 'review-start-date',
      type: 'date',
      value: todayISO(now),
      required: true
    });
    startDate.addEventListener('input', () => { dirty = true; });
    startDateInput = startDate;
    fieldsPanel.appendChild(field('Tanggal mulai minum', startDate, {
      hint: 'Dipakai sebagai tanggal mulai obat yang disimpan.'
    }));

    fieldsPanel.appendChild(h('h2', {}, 'Daftar obat'));
    itemsContainer = h('div', { id: 'review-items', class: 'stack' });
    fieldsPanel.appendChild(itemsContainer);
    renderItems();

    const addItem = h('button', {
      id: 'btn-add-item',
      type: 'button',
      class: 'button'
    }, 'Tambah obat manual');
    addItem.addEventListener('click', () => {
      items.push(blankObat());
      dirty = true;
      renderItems();
      const last = section.querySelector(`#review-item-name-${items.length - 1}`);
      if (last && typeof last.focus === 'function') last.focus();
    });
    fieldsPanel.appendChild(addItem);
  } else {
    fieldsPanel.appendChild(h('h2', {}, 'Data rekam medis'));
    const rekamFields = h('div', { id: 'review-rekam-fields', class: 'stack' });

    const dateInput = h('input', {
      id: 'review-rekam-date',
      type: 'date',
      value: rekamState.tanggal,
      required: true
    });
    dateInput.addEventListener('input', () => {
      rekamState.tanggal = dateInput.value;
      dirty = true;
    });
    rekamFields.appendChild(field('Tanggal dokumen', dateInput, {
      required: true,
      hint: rekamState.tanggal === ''
        ? 'Tanggal tidak terbaca dari dokumen. Isi manual sebelum menyimpan.'
        : ''
    }));

    const facilityInput = h('input', {
      id: 'review-rekam-facility',
      type: 'text',
      value: rekamState.faskes,
      autocomplete: 'off'
    });
    facilityInput.addEventListener('input', () => {
      rekamState.faskes = facilityInput.value;
      dirty = true;
    });
    rekamFields.appendChild(field('Fasilitas kesehatan', facilityInput));

    const doctorInput = h('input', {
      id: 'review-rekam-doctor',
      type: 'text',
      value: rekamState.dokter,
      autocomplete: 'off'
    });
    doctorInput.addEventListener('input', () => {
      rekamState.dokter = doctorInput.value;
      dirty = true;
    });
    rekamFields.appendChild(field('Dokter', doctorInput));

    const diagnosisInput = h('textarea', {
      id: 'review-rekam-diagnosis',
      rows: '2'
    });
    diagnosisInput.value = rekamState.diagnosis;
    diagnosisInput.addEventListener('input', () => {
      rekamState.diagnosis = diagnosisInput.value;
      dirty = true;
    });
    rekamFields.appendChild(field('Diagnosis (sesuai yang tertulis di dokumen)', diagnosisInput, {
      hint: 'Salin apa adanya. Aplikasi tidak menambah diagnosis.'
    }));

    const complaintInput = h('textarea', {
      id: 'review-rekam-complaint',
      rows: '2'
    });
    complaintInput.value = rekamState.keluhan;
    complaintInput.addEventListener('input', () => {
      rekamState.keluhan = complaintInput.value;
      dirty = true;
    });
    rekamFields.appendChild(field('Keluhan', complaintInput));

    const notesInput = h('textarea', {
      id: 'review-rekam-notes',
      rows: '3'
    });
    notesInput.value = rekamState.catatan;
    notesInput.addEventListener('input', () => {
      rekamState.catatan = notesInput.value;
      dirty = true;
    });
    rekamFields.appendChild(field('Catatan', notesInput));

    fieldsPanel.appendChild(rekamFields);

    fieldsPanel.appendChild(h('h2', {}, 'Hasil laboratorium'));
    labsContainer = h('div', { id: 'review-lab-list', class: 'stack' });
    fieldsPanel.appendChild(labsContainer);
    renderLabs();

    const addLab = h('button', {
      id: 'btn-add-lab',
      type: 'button',
      class: 'button'
    }, 'Tambah hasil lab manual');
    addLab.addEventListener('click', () => {
      labs.push({ nama: '', nilai: null, satuan: '', kepercayaan: null, refTeks: '' });
      dirty = true;
      renderLabs();
      const last = section.querySelector(`#review-lab-name-${labs.length - 1}`);
      if (last && typeof last.focus === 'function') last.focus();
    });
    fieldsPanel.appendChild(addLab);
  }

  // Disclaimer mode --------------------------------------------------------
  fieldsPanel.appendChild(h('p', { id: 'review-disclaimer', class: 'muted' },
    mode === 'rekam-medis' ? DISCLAIMERS.rekam : DISCLAIMERS.resep));

  // Verifikasi & aksi ------------------------------------------------------
  const verified = h('input', {
    id: 'review-verified',
    type: 'checkbox',
    required: true
  });
  const saveButton = h('button', {
    id: 'btn-save-reviewed',
    type: 'button',
    class: 'button primary',
    disabled: true
  }, 'Simpan data terverifikasi');
  const verifiedLabel = h('label', {
    id: 'review-verified-label',
    for: 'review-verified'
  }, mode === 'rekam-medis'
    ? 'Saya sudah mencocokkan dengan dokumen asli'
    : 'Saya sudah mencocokkan dengan resep asli');

  verified.addEventListener('change', () => {
    saveButton.disabled = !verified.checked;
    dirty = true;
    if (!verified.checked) {
      showError('Centang pernyataan verifikasi sebelum menyimpan.');
    } else {
      hideError();
    }
  });

  fieldsPanel.appendChild(h('div', { class: 'review-required' }, verified, verifiedLabel));

  const errorBox = h('p', {
    id: 'review-error',
    class: 'form-error',
    role: 'alert',
    hidden: true
  });
  fieldsPanel.appendChild(errorBox);

  const actions = h('div', { class: 'scan-actions' });
  const cancelButton = h('button', {
    id: 'btn-cancel-review',
    type: 'button',
    class: 'button'
  }, 'Batal dan kembali');
  cancelButton.addEventListener('click', () => {
    if (dirty) {
      const confirmed = typeof ctx?.confirm === 'function'
        ? ctx.confirm('Batalkan tinjauan? Perubahan yang belum disimpan akan hilang.')
        : true;
      if (!confirmed) return;
    }
    clearScanDraft();
    ctx.navigate('#/pindai');
  });
  actions.appendChild(saveButton);
  actions.appendChild(cancelButton);
  fieldsPanel.appendChild(actions);

  // -------------------------------------------------------------------------
  // Error / validasi
  // -------------------------------------------------------------------------

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function hideError() {
    errorBox.textContent = '';
    errorBox.hidden = true;
  }

  function clearInvalid() {
    for (const node of section.querySelectorAll('[aria-invalid="true"]')) {
      node.removeAttribute('aria-invalid');
    }
    for (const node of section.querySelectorAll('.review-field-error')) {
      node.remove();
    }
  }

  function markInvalid(id, message) {
    const control = section.querySelector(`#${id}`);
    if (!control) return;
    control.setAttribute('aria-invalid', 'true');
    if (control.parentElement?.querySelector('.review-field-error')) return;
    const node = h('p', { class: 'review-field-error', role: 'alert' }, message);
    control.insertAdjacentElement('afterend', node);
  }

  function validateResep() {
    const errors = [];
    const startDate = startDateInput ? startDateInput.value : '';
    if (!isValidDateISO(startDate)) {
      errors.push({ id: 'review-start-date', message: 'Tanggal mulai minum tidak valid.' });
    }
    if (items.length === 0) {
      errors.push({ id: 'btn-add-item', message: 'Minimal satu obat diperlukan.' });
    }
    items.forEach((item, i) => {
      const number = i + 1;
      if (String(item.nama || '').trim() === '') {
        errors.push({
          id: `review-item-name-${i}`,
          message: `Nama obat ${number} wajib diisi.`
        });
      }
      const strength = parseStrengthInput(item.strengthDraft);
      if (!strength.ok) {
        errors.push({
          id: `review-item-strength-${i}`,
          message: `Kekuatan obat ${number} tidak valid. Gunakan angka dan satuan, mis. 5 mg.`
        });
      }
      if (item.kaliSehari !== null) {
        const kali = item.kaliSehari;
        if (!Number.isInteger(kali) || kali < 1 || kali > 12) {
          errors.push({
            id: `review-item-frequency-${i}`,
            message: `Kali sehari obat ${number} harus bilangan bulat 1–12 atau kosong.`
          });
        }
      }
      if (item.takaranPerDosis !== null) {
        const takaran = item.takaranPerDosis;
        if (!Number.isFinite(takaran) || takaran < 0) {
          errors.push({
            id: `review-item-dose-${i}`,
            message: `Takaran obat ${number} harus angka ≥ 0 atau kosong.`
          });
        }
      }
      if (item.durasiHari !== null) {
        const durasi = item.durasiHari;
        if (!Number.isInteger(durasi) || durasi < 0) {
          errors.push({
            id: `review-item-duration-${i}`,
            message: `Durasi obat ${number} harus bilangan bulat ≥ 0 atau kosong.`
          });
        }
      }
      const total = parseTotalInput(item.totalDraft, item.bentukSediaan);
      if (!total.ok) {
        errors.push({
          id: `review-item-total-${i}`,
          message: `Jumlah total obat ${number} tidak valid. Gunakan angka, mis. 15 tablet.`
        });
      }
      const times = parseTimesInput(item.timesDraft);
      if (!times.ok) {
        errors.push({
          id: `review-item-times-${i}`,
          message: `Jam minum obat ${number} tidak valid: ${times.invalid.join(', ')}. `
            + 'Gunakan format HH:mm.'
        });
      }
    });
    return errors;
  }

  function validateRekam() {
    const errors = [];
    if (!isValidDateISO(rekamState.tanggal)) {
      errors.push({ id: 'review-rekam-date', message: 'Tanggal dokumen wajib diisi dan valid.' });
    }
    labs.forEach((lab, j) => {
      const hasContent = !isBlank(lab.nama) || !isBlank(lab.satuan)
        || !isBlank(lab.refTeks) || lab.nilai !== null;
      if (!hasContent) return;
      if (isBlank(lab.nama)) {
        errors.push({
          id: `review-lab-name-${j}`,
          message: `Nama pemeriksaan lab ${j + 1} wajib diisi.`
        });
      }
      if (!Number.isFinite(lab.nilai)) {
        errors.push({
          id: `review-lab-value-${j}`,
          message: `Nilai lab ${j + 1} wajib berupa angka.`
        });
      }
      if (!isBlank(lab.refTeks) && parseRujukan(lab.refTeks.trim()) === null) {
        errors.push({
          id: `review-lab-ref-${j}`,
          message: `Rentang rujukan lab ${j + 1} tidak dikenali.`
        });
      }
    });
    return errors;
  }

  function applyValidationErrors(errors) {
    clearInvalid();
    for (const entry of errors) markInvalid(entry.id, entry.message);
    const first = errors[0];
    const control = first ? section.querySelector(`#${first.id}`) : null;
    if (control && typeof control.focus === 'function') control.focus();
    showError(`Periksa kembali isian berikut: ${errors.map((e) => e.message).join(' ')}`);
  }

  // -------------------------------------------------------------------------
  // Simpan
  // -------------------------------------------------------------------------

  async function handleSave() {
    if (saving) return;
    hideError();
    clearInvalid();

    if (!verified.checked) {
      showError('REVIEW_BELUM_DIVERIFIKASI — Centang pernyataan verifikasi '
        + '(Saya sudah mencocokkan dengan dokumen asli) sebelum menyimpan.');
      verified.focus();
      return;
    }

    const errors = mode === 'resep' ? validateResep() : validateRekam();
    if (errors.length > 0) {
      applyValidationErrors(errors);
      return;
    }

    saving = true;
    saveButton.disabled = true;

    const verifyDate = nowOf(ctx);
    const verifiedAt = verifyDate.toISOString();
    const kind = mode === 'rekam-medis' ? 'rekam-medis' : 'resep';
    const parserVersion = mode === 'rekam-medis' ? PARSER_REKAM_VERSION : PARSER_RESEP_VERSION;
    const ocrText = String(ocrTextArea.value || '').slice(0, MAX_OCR_TEXT_CHARS);

    // 1) Foto sumber disimpan lebih dulu agar source.photoId dapat diisi.
    let savedPhoto = null;
    if (draft.foto && typeof draft.foto.dataBase64 === 'string') {
      try {
        savedPhoto = await ctx.state.saveSourcePhoto({
          profileId,
          kind,
          mime: draft.foto.mime,
          dataBase64: draft.foto.dataBase64,
          width: draft.foto.width ?? null,
          height: draft.foto.height ?? null
        });
      } catch (error) {
        saving = false;
        saveButton.disabled = !verified.checked;
        showError('Foto sumber gagal disimpan'
          + (error?.code ? ` (${error.code})` : '')
          + `. ${error?.message || 'Periksa penyimpanan perangkat lalu coba lagi.'} `
          + 'Tidak ada data yang ditulis sebelum foto berhasil disimpan.');
        return;
      }
    }

    const photoId = savedPhoto?.id || null;
    const photoMime = draft.foto?.mime || null;
    const translatedText = mode === 'resep'
      ? items.map((item) => item.teksTerjemahan).filter(Boolean)
        .join('\n').slice(0, MAX_OCR_TEXT_CHARS)
      : '';

    const source = {
      kind,
      photoId,
      photoMime,
      ocrText,
      ocrConfidence: ocrConfidence ?? null,
      translatedText,
      verifiedByUser: true,
      verifiedAt,
      parserVersion
    };

    let savedCount = 0;
    try {
      if (mode === 'resep') {
        const today = startDateInput && isValidDateISO(startDateInput.value)
          ? startDateInput.value
          : todayISO(verifyDate);
        for (const item of items) {
          const obat = materializeObat(item);
          const medication = obatKeMedication(obat, {
            profileId,
            today,
            source,
            now: verifyDate
          });
          await ctx.state.upsert('medications', medication);
          savedCount += 1;
        }
      } else {
        const diagnosisTertulis = String(rekamState.diagnosis || '')
          .split(/[,;]/)
          .map((teks) => teks.trim())
          .filter((teks) => teks !== '');
        const drafRekam = {
          tanggal: rekamState.tanggal,
          faskes: rekamState.faskes,
          dokter: rekamState.dokter,
          diagnosisTertulis,
          keluhan: rekamState.keluhan,
          catatan: rekamState.catatan
        };
        const visit = rekamKeKunjungan(drafRekam, {
          profileId,
          photoId,
          photoMime,
          ocrText,
          ocrConfidence: ocrConfidence ?? null,
          verifiedAt,
          now: verifyDate
        });
        visit.source = { ...visit.source, verifiedByUser: true, verifiedAt, parserVersion };
        await ctx.state.upsert('visits', visit);
        savedCount += 1;

        for (const lab of labs) {
          const hasContent = !isBlank(lab.nama) || !isBlank(lab.satuan)
            || !isBlank(lab.refTeks) || lab.nilai !== null;
          if (!hasContent) continue;
          const rujukan = isBlank(lab.refTeks) ? null : parseRujukan(lab.refTeks.trim());
          const hasil = {
            nama: String(lab.nama || '').trim(),
            nilai: lab.nilai,
            nilaiTeks: Number.isFinite(lab.nilai) ? String(lab.nilai) : '',
            satuan: String(lab.satuan || ''),
            rujukan: rujukan
              ? { low: rujukan.low, high: rujukan.high, teks: rujukan.teks }
              : null
          };
          const labItem = labKeLab(hasil, {
            profileId,
            date: rekamState.tanggal,
            facility: rekamState.faskes,
            photoId,
            photoMime,
            ocrText,
            ocrConfidence: ocrConfidence ?? null,
            verifiedAt,
            now: verifyDate
          });
          labItem.source = {
            ...labItem.source,
            verifiedByUser: true,
            verifiedAt,
            parserVersion
          };
          await ctx.state.upsert('labs', labItem);
          savedCount += 1;
        }
      }
    } catch (error) {
      saving = false;
      saveButton.disabled = !verified.checked;
      showError('Penyimpanan gagal di tengah proses. '
        + `Sebagian data mungkin sudah tersimpan (${savedCount} item). `
        + 'Periksa daftar obat/kunjungan sebelum mencoba lagi. '
        + (error?.message || 'Coba lagi.'));
      return;
    }

    // Hanya draf yang dihapus setelah semua penulisan berhasil.
    clearScanDraft();
    if (typeof ctx?.toast === 'function') {
      ctx.toast('Data terverifikasi disimpan.', 'success');
    }
    ctx.navigate(mode === 'resep' ? '#/obat' : '#/kunjungan');
    if (typeof ctx?.refresh === 'function') await ctx.refresh();
  }

  saveButton.addEventListener('click', () => { void handleSave(); });

  return undefined;
}

// ---------------------------------------------------------------------------
// Bagian pembantu render
// ---------------------------------------------------------------------------

function field(labelText, control, { hint = '', required = false } = {}) {
  const wrapper = h('div', { class: 'field' });
  const label = h('label', { for: control.id || undefined }, labelText);
  if (required) label.appendChild(document.createTextNode(' *'));
  wrapper.appendChild(label);
  wrapper.appendChild(control);
  if (hint) wrapper.appendChild(h('p', { class: 'hint' }, hint));
  return wrapper;
}

function collectLowConfidence(items, labs, mode) {
  const entries = [];
  if (mode === 'resep') {
    items.forEach((item, i) => {
      if (Number.isFinite(item.kepercayaan) && item.kepercayaan < OCR_LOW_CONFIDENCE) {
        const nama = String(item.nama || '').trim() || `Obat ${i + 1}`;
        entries.push(`${nama} (${confidencePercent(item.kepercayaan)})`);
      }
    });
  } else {
    labs.forEach((lab, j) => {
      if (Number.isFinite(lab.kepercayaan) && lab.kepercayaan < OCR_LOW_CONFIDENCE) {
        const nama = String(lab.nama || '').trim() || `Lab ${j + 1}`;
        entries.push(`${nama} (${confidencePercent(lab.kepercayaan)})`);
      }
    });
  }
  return entries;
}

function buildSourcePanel(panel, draft) {
  if (draft.foto && typeof draft.foto.dataBase64 === 'string') {
    try {
      const image = h('img', {
        id: 'review-source-image',
        class: 'source-photo',
        src: photoDataUrl(draft.foto),
        alt: 'Foto dokumen yang dipindai'
      });
      panel.appendChild(image);
      const width = draft.foto.width;
      const height = draft.foto.height;
      if (Number.isFinite(width) && Number.isFinite(height)) {
        panel.appendChild(h('p', { class: 'muted' }, `${width} × ${height} piksel`));
      }
      return;
    } catch {
      panel.appendChild(h('p', { class: 'is-review-warning' },
        'Foto sumber tidak dapat ditampilkan. Gunakan teks OCR di samping.'));
      return;
    }
  }
  panel.appendChild(h('pre', {
    id: 'review-source-text',
    class: 'review-source-text'
  }, String(draft.teksAsli || '')));
}

function renderEmpty(section, ctx) {
  section.appendChild(h('h1', {}, 'Tinjau Hasil Pindai'));
  const empty = h('div', { id: 'review-empty', class: 'card' },
    h('h2', {}, 'Tidak ada draf pindai'),
    h('p', {}, EMPTY_DRAFT_MESSAGE));
  const back = h('button', {
    id: 'btn-back-to-scan',
    type: 'button',
    class: 'button primary'
  }, 'Kembali ke Pindai');
  back.addEventListener('click', () => {
    if (typeof ctx?.navigate === 'function') ctx.navigate('#/pindai');
  });
  empty.appendChild(back);
  section.appendChild(empty);
}
