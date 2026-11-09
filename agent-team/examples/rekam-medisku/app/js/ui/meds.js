// Rekam Medisku — layar Obat (t6).
// Daftar obat, form lengkap, dosis hari ini, kepatuhan, prediksi stok.
// Peringatan duplikasi hanya membandingkan teks bahan aktif, bukan interaksi obat.

import { h, clear } from '../dom.js';
import { DISCLAIMERS, newId } from '../model.js';
import {
  todayISO,
  isValidDateISO,
  isValidTime,
  timeToMinutes,
  formatDateID,
  startOfWeek
} from '../logic/dates.js';
import {
  buildDosesForDate,
  applyDoseLogs,
  formatSchedule,
  DAY_LABELS,
  MISSED_GRACE_MINUTES
} from '../logic/schedule.js';
import {
  weeklyAdherence,
  adherenceHistory,
  complianceLabel
} from '../logic/adherence.js';
import { predictRefills, simulateStockOut } from '../logic/stock.js';
import {
  duplicatesForMedication,
  findDuplicateIngredients,
  normalizeIngredient
} from '../logic/safety.js';
import { buildBarChartSVG, renderChart } from './chart.js';
import { attachmentDataUrl } from './attachments.js';

const STOCK_UNITS = ['tablet', 'kapsul', 'ml', 'sachet', 'tetes', 'sendok'];
const DOSE_UNITS = ['mg', 'mcg', 'g', 'ml', 'tablet', 'kapsul', 'tetes', 'sendok'];

function formatDateSafe(dateISO, style = 'long') {
  try {
    return formatDateID(dateISO, style);
  } catch {
    return dateISO || '';
  }
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

function buildErrorCard(message) {
  return h('section', { class: 'card', role: 'alert' },
    h('h2', {}, 'Data obat tidak dapat dimuat'),
    h('p', {}, message || 'Coba muat ulang layar ini.'));
}

function parseNumber(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const number = Number(text.replace(',', '.'));
  return Number.isFinite(number) ? number : NaN;
}

function isDoseDue(dose, { reminders, nowMs }) {
  if (!reminders || !dose || dose.status !== 'pending') return false;
  const scheduledMs = Date.parse(dose.scheduledAt);
  if (!Number.isFinite(scheduledMs) || scheduledMs > nowMs) return false;
  return nowMs - scheduledMs <= MISSED_GRACE_MINUTES * 60000;
}

function statusLabel(dose, due) {
  if (due) return 'Waktunya';
  switch (dose.status) {
    case 'taken': return 'Sudah diminum';
    case 'skipped': return 'Dilewati';
    case 'missed': return 'Terlewat';
    default: return 'Belum waktunya';
  }
}

function statusClass(dose, due) {
  if (due) return 'is-due';
  switch (dose.status) {
    case 'taken': return 'is-taken';
    case 'skipped': return 'is-skipped';
    case 'missed': return 'is-missed';
    default: return 'is-pending';
  }
}

function stockSummary(med, simulation, today) {
  if (!simulation || !simulation.tracked) {
    return 'Stok tidak dilacak. Isi sisa stok agar perkiraan habis dapat dihitung.';
  }
  if (simulation.reason === 'obat-tidak-aktif') {
    return 'Obat tidak aktif; perkiraan habis tidak dihitung.';
  }
  const parts = [];
  if (typeof simulation.remaining === 'number') {
    parts.push(`Sisa ${simulation.remaining} ${simulation.unit || ''}`.trim());
  }
  if (simulation.runOutDate) {
    parts.push(`perkiraan habis ${formatDateSafe(simulation.runOutDate, 'short')}`);
  } else {
    parts.push('perkiraan habis belum dapat dihitung');
  }
  if (simulation.refillByDate) {
    parts.push(`tebus sebelum ${formatDateSafe(simulation.refillByDate, 'short')}`);
  }
  return `${parts.join(' · ')}.`;
}

/**
 * Render layar Obat.
 * @param {HTMLElement} root
 * @param {object} ctx
 */
export async function render(root, ctx) {
  clear(root);

  const screen = h('section', { id: 'screen-meds', class: 'screen meds' });
  root.appendChild(screen);

  const profile = ctx.profile || null;
  const profileId = profile?.id || null;
  const now = typeof ctx.now === 'function' ? ctx.now() : new Date();
  const today = todayISO(now);

  if (!profileId) {
    screen.appendChild(h('p', { class: 'empty-state' },
      'Profil aktif tidak ditemukan. ', h('a', { href: '#/profil' }, 'Buka Profil')));
    return undefined;
  }

  let medications = [];
  let doseLogs = [];
  let settings = {};
  try {
    medications = ctx.state.list('medications', { profileId });
    doseLogs = ctx.state.list('doseLogs', { profileId });
    settings = ctx.state.getState()?.settings || {};
  } catch (error) {
    screen.appendChild(buildErrorCard(error?.message));
    return undefined;
  }
  medications = Array.isArray(medications) ? medications.slice() : [];
  medications.sort((a, b) => {
    const activeDiff = (a.active === false ? 1 : 0) - (b.active === false ? 1 : 0);
    if (activeDiff !== 0) return activeDiff;
    return String(a.name || '').localeCompare(String(b.name || ''), 'id', { sensitivity: 'base' });
  });

  const local = {
    editingId: null,
    saving: false
  };

  // ---------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------

  const header = h('header', { class: 'screen-header' });
  header.appendChild(h('h1', {}, 'Obat'));
  header.appendChild(h('p', { class: 'muted' },
    'Jadwal minum, stok, dan catatan kepatuhan di perangkat ini.'));
  const newButton = h('button', {
    id: 'btn-new-med',
    type: 'button',
    class: 'btn btn-primary'
  }, 'Tambah obat');
  header.appendChild(h('div', { class: 'actions' }, newButton));
  screen.appendChild(header);

  // ---------------------------------------------------------------------
  // Form obat
  // ---------------------------------------------------------------------

  const form = h('form', {
    id: 'med-form',
    class: 'card stack med-form',
    novalidate: true,
    hidden: true
  });
  const formTitle = h('h2', {}, 'Tambah obat');
  form.appendChild(formTitle);

  const idInput = h('input', { id: 'med-id', name: 'id', type: 'hidden', value: '' });
  const nameInput = h('input', {
    id: 'med-name', name: 'name', type: 'text', required: true, maxlength: 160, autocomplete: 'off'
  });
  const ingredientInput = h('input', {
    id: 'med-ingredient', name: 'activeIngredient', type: 'text', maxlength: 160, autocomplete: 'off'
  });
  const doseInput = h('input', {
    id: 'med-dose', name: 'dose', type: 'text', inputmode: 'decimal', maxlength: 40
  });
  const doseUnitInput = h('input', {
    id: 'med-dose-unit', name: 'doseUnit', type: 'text', maxlength: 24, list: 'med-dose-unit-options'
  });
  const doseUnitOptions = h('datalist', { id: 'med-dose-unit-options' },
    ...DOSE_UNITS.map((unit) => h('option', { value: unit })));
  const instructionsInput = h('textarea', {
    id: 'med-instructions', name: 'instructions', rows: 2,
    placeholder: 'mis. sesudah makan'
  });
  const timesInput = h('input', {
    id: 'med-times', name: 'times', type: 'text', maxlength: 120,
    placeholder: '08:00, 20:00', autocomplete: 'off'
  });
  const startInput = h('input', { id: 'med-start', name: 'startDate', type: 'date' });
  const endInput = h('input', { id: 'med-end', name: 'endDate', type: 'date' });
  const stockRemainingInput = h('input', {
    id: 'med-stock-remaining', name: 'stockRemaining', type: 'number',
    min: '0', step: 'any', inputmode: 'decimal'
  });
  const stockUnitSelect = h('select', { id: 'med-stock-unit', name: 'stockUnit' },
    ...STOCK_UNITS.map((unit) => h('option', { value: unit }, unit)));
  const unitsPerDoseInput = h('input', {
    id: 'med-units-per-dose', name: 'unitsPerDose', type: 'number',
    min: '0.01', step: 'any', inputmode: 'decimal', value: '1'
  });
  const refillDaysInput = h('input', {
    id: 'med-refill-days', name: 'refillReminderDays', type: 'number',
    min: '0', step: '1', inputmode: 'numeric', value: '3'
  });

  const daysWrapper = h('fieldset', { id: 'med-days', class: 'days-fieldset' },
    h('legend', {}, 'Hari minum'),
    h('p', { class: 'hint' }, 'Kosongkan semua untuk setiap hari.'));
  const dayCheckboxes = [];
  for (let day = 0; day < 7; day += 1) {
    const checkboxId = `med-day-${day}`;
    const checkbox = h('input', {
      id: checkboxId,
      name: 'med-day',
      type: 'checkbox',
      value: String(day)
    });
    dayCheckboxes.push(checkbox);
    daysWrapper.appendChild(h('div', { class: 'checkbox-row' },
      checkbox,
      h('label', { for: checkboxId }, DAY_LABELS[day])));
  }
  daysWrapper.appendChild(h('p', { class: 'hint' },
    'Minggu sampai Sabtu. Dosis hanya dibuat pada hari yang dicentang atau bila semua kosong.'));

  form.appendChild(idInput);
  form.appendChild(h('div', { class: 'form-grid' },
    field('Nama obat', nameInput, { required: true }),
    field('Bahan aktif', ingredientInput, {
      hint: 'Ditulis apa adanya dari kemasan/resep. Dipakai hanya untuk membandingkan teks.'
    })
  ));
  form.appendChild(h('div', { class: 'form-grid' },
    field('Dosis', doseInput, { hint: 'mis. 5' }),
    field('Satuan dosis', doseUnitInput, { hint: 'mis. mg atau ml' }),
    doseUnitOptions
  ));
  form.appendChild(field('Aturan minum', instructionsInput, {
    hint: 'mis. sesudah makan, sebelum tidur.'
  }));
  form.appendChild(field('Jam minum', timesInput, {
    hint: 'Pisahkan dengan koma, format 24 jam. Kosongkan bila minum hanya bila perlu.'
  }));
  form.appendChild(daysWrapper);
  form.appendChild(h('div', { class: 'form-grid' },
    field('Tanggal mulai', startInput),
    field('Tanggal selesai', endInput, { hint: 'Boleh dikosongkan.' })
  ));
  form.appendChild(h('h3', {}, 'Stok & tebus ulang'));
  form.appendChild(h('div', { class: 'form-grid' },
    field('Sisa stok', stockRemainingInput, { hint: 'Kosongkan bila tidak dilacak.' }),
    field('Satuan stok', stockUnitSelect),
    field('Jumlah per dosis', unitsPerDoseInput, { hint: 'mis. 1 tablet.' }),
    field('Pengingat tebus (hari)', refillDaysInput, {
      hint: 'Pengingat muncul di aplikasi, bukan notifikasi latar belakang.'
    })
  ));

  const duplicateWarning = h('div', {
    id: 'duplicate-warning',
    class: 'warning-box',
    role: 'status',
    hidden: true
  });
  form.appendChild(duplicateWarning);

  const formError = h('p', {
    id: 'med-form-error',
    class: 'error-text',
    role: 'alert',
    hidden: true
  });
  form.appendChild(formError);

  const saveButton = h('button', {
    id: 'btn-save-med', type: 'submit', class: 'btn btn-primary'
  }, 'Simpan obat');
  const cancelButton = h('button', {
    id: 'btn-cancel-med', type: 'button', class: 'btn btn-secondary'
  }, 'Batal');
  form.appendChild(h('div', { class: 'actions' }, saveButton, cancelButton));
  screen.appendChild(form);

  function showFormError(message, control = null) {
    formError.textContent = message || '';
    formError.hidden = !message;
    if (control) {
      control.setAttribute('aria-invalid', 'true');
      control.focus();
    }
  }

  function clearInvalid() {
    formError.hidden = true;
    formError.textContent = '';
    for (const control of [
      nameInput, ingredientInput, doseInput, doseUnitInput, instructionsInput, timesInput,
      startInput, endInput, stockRemainingInput, unitsPerDoseInput, refillDaysInput
    ]) {
      if (control) control.removeAttribute('aria-invalid');
    }
  }

  function duplicateMatchesForDraft() {
    const ingredient = ingredientInput.value;
    const key = normalizeIngredient(ingredient);
    if (!key) return { names: [], disclaimer: DISCLAIMERS.duplicate };

    const draftId = idInput.value || null;
    const draft = {
      id: draftId || newId('med'),
      profileId,
      activeIngredient: ingredient
    };

    const names = new Set();
    for (const med of medications) {
      if (med.active === false) continue;
      if (med.profileId !== profileId) continue;
      if (draftId && med.id === draftId) continue;
      if (normalizeIngredient(med.activeIngredient) !== key) continue;
      if (med.name) names.add(med.name);
    }

    // Modul logika tetap dipakai sebagai pemeriksa utama (grup duplikasi).
    const groups = []
      .concat(duplicatesForMedication(draft, medications))
      .concat(findDuplicateIngredients(medications, { profileId }))
      .filter((group) => group.key === key);
    for (const group of groups) {
      for (const name of group.medicationNames) {
        if (name) names.add(name);
      }
    }
    if (draftId) {
      const current = medications.find((med) => med.id === draftId);
      if (current?.name) names.delete(current.name);
    }

    return { names: [...names], disclaimer: DISCLAIMERS.duplicate };
  }

  function updateDuplicateWarning() {
    const { names, disclaimer } = duplicateMatchesForDraft();
    if (!names.length) {
      duplicateWarning.hidden = true;
      clear(duplicateWarning);
      return;
    }
    clear(duplicateWarning);
    duplicateWarning.appendChild(h('p', {},
      h('strong', {}, 'Bahan aktif sama dengan obat aktif lain: '),
      names.join(', ')));
    duplicateWarning.appendChild(h('p', { class: 'small' }, disclaimer));
    duplicateWarning.hidden = false;
  }

  function checkedDays() {
    return dayCheckboxes
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => Number(checkbox.value))
      .sort((a, b) => a - b);
  }

  function resetForm() {
    form.reset();
    local.editingId = null;
    idInput.value = '';
    formTitle.textContent = 'Tambah obat';
    startInput.value = today;
    endInput.value = '';
    stockUnitSelect.value = 'tablet';
    unitsPerDoseInput.value = '1';
    refillDaysInput.value = '3';
    for (const checkbox of dayCheckboxes) checkbox.checked = true;
    updateDuplicateWarning();
  }

  function fillStockUnit(unit) {
    const value = unit || 'tablet';
    if (!STOCK_UNITS.includes(value)) {
      const exists = Array.from(stockUnitSelect.querySelectorAll('option'))
        .some((option) => option.value === value);
      if (!exists) stockUnitSelect.appendChild(h('option', { value }, value));
    }
    stockUnitSelect.value = value;
  }

  function openForm(med = null) {
    resetForm();
    clearInvalid();
    if (med) {
      local.editingId = med.id;
      idInput.value = med.id;
      formTitle.textContent = 'Ubah obat';
      nameInput.value = med.name || '';
      ingredientInput.value = med.activeIngredient || '';
      doseInput.value = med.dose || '';
      doseUnitInput.value = med.doseUnit || '';
      instructionsInput.value = med.instructions || '';
      timesInput.value = Array.isArray(med.times) ? med.times.join(', ') : '';
      startInput.value = med.startDate || '';
      endInput.value = med.endDate || '';
      stockRemainingInput.value = typeof med.stock?.remaining === 'number'
        ? String(med.stock.remaining)
        : '';
      fillStockUnit(med.stock?.unit);
      unitsPerDoseInput.value = typeof med.stock?.unitsPerDose === 'number'
        ? String(med.stock.unitsPerDose)
        : '1';
      refillDaysInput.value = Number.isInteger(med.refillReminderDays)
        ? String(med.refillReminderDays)
        : '3';
      const days = Array.isArray(med.daysOfWeek) && med.daysOfWeek.length
        ? med.daysOfWeek
        : [0, 1, 2, 3, 4, 5, 6];
      for (const checkbox of dayCheckboxes) {
        checkbox.checked = days.includes(Number(checkbox.value));
      }
    }
    updateDuplicateWarning();
    form.hidden = false;
    if (typeof form.scrollIntoView === 'function') {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    nameInput.focus();
  }

  function closeForm() {
    local.editingId = null;
    form.hidden = true;
    form.reset();
    formTitle.textContent = 'Tambah obat';
    clearInvalid();
  }

  function collectMedication() {
    clearInvalid();
    const name = nameInput.value.trim();
    if (!name) {
      showFormError('Nama obat wajib diisi.', nameInput);
      return null;
    }

    const rawTimes = timesInput.value
      .split(/[\s,;]+/)
      .map((time) => time.trim())
      .filter(Boolean);
    const badTime = rawTimes.find((time) => !isValidTime(time));
    if (badTime) {
      showFormError(`Jam "${badTime}" tidak valid. Gunakan format HH:mm, mis. 08:00.`, timesInput);
      return null;
    }
    const times = [...new Set(rawTimes)].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));

    const startDate = startInput.value || null;
    const endDate = endInput.value || null;
    if (startDate && !isValidDateISO(startDate)) {
      showFormError('Tanggal mulai tidak valid.', startInput);
      return null;
    }
    if (endDate && !isValidDateISO(endDate)) {
      showFormError('Tanggal selesai tidak valid.', endInput);
      return null;
    }
    if (startDate && endDate && startDate > endDate) {
      showFormError('Tanggal selesai tidak boleh sebelum tanggal mulai.', endInput);
      return null;
    }

    const remaining = parseNumber(stockRemainingInput.value);
    if (Number.isNaN(remaining)) {
      showFormError('Sisa stok harus berupa angka.', stockRemainingInput);
      return null;
    }
    if (remaining != null && remaining < 0) {
      showFormError('Sisa stok tidak boleh negatif.', stockRemainingInput);
      return null;
    }

    const unitsPerDose = parseNumber(unitsPerDoseInput.value);
    if (unitsPerDose == null || Number.isNaN(unitsPerDose) || unitsPerDose <= 0) {
      showFormError('Jumlah per dosis harus lebih dari 0.', unitsPerDoseInput);
      return null;
    }

    const refillDays = parseNumber(refillDaysInput.value);
    if (refillDays == null || Number.isNaN(refillDays)
      || !Number.isInteger(refillDays) || refillDays < 0) {
      showFormError('Pengingat tebus harus bilangan bulat 0 atau lebih.', refillDaysInput);
      return null;
    }

    const base = local.editingId
      ? medications.find((med) => med.id === local.editingId) || null
      : null;

    return {
      ...(base || {}),
      ...(base ? { id: base.id, createdAt: base.createdAt, updatedAt: base.updatedAt } : {}),
      profileId,
      name,
      activeIngredient: ingredientInput.value.trim(),
      dose: doseInput.value.trim(),
      doseUnit: doseUnitInput.value.trim(),
      instructions: instructionsInput.value.trim(),
      times,
      daysOfWeek: checkedDays(),
      startDate,
      endDate,
      stock: {
        remaining: remaining == null ? null : remaining,
        unit: stockUnitSelect.value || 'tablet',
        unitsPerDose
      },
      refillReminderDays: refillDays,
      active: base ? base.active !== false : true,
      notes: base?.notes || '',
      source: base?.source ?? null
    };
  }

  async function saveMedication() {
    if (local.saving) return;
    const item = collectMedication();
    if (!item) return;

    local.saving = true;
    saveButton.disabled = true;
    try {
      await ctx.state.upsert('medications', item);
      ctx.toast(local.editingId ? 'Obat diperbarui.' : 'Obat disimpan.', 'success');
      await ctx.refresh();
    } catch (error) {
      showFormError(error?.message || 'Obat gagal disimpan. Periksa kembali data Anda.');
      local.saving = false;
      saveButton.disabled = false;
    }
  }

  // ---------------------------------------------------------------------
  // Dialog foto sumber
  // ---------------------------------------------------------------------

  const photoImage = h('img', { class: 'source-photo', alt: 'Foto sumber resep', hidden: true });
  const photoStatus = h('p', { class: 'muted small', role: 'status' }, '');
  const photoDialog = h('dialog', {
    class: 'source-photo-dialog',
    'aria-labelledby': 'source-photo-title'
  },
  h('div', { class: 'dialog-body' },
    h('div', { class: 'row dialog-heading' },
      h('h2', { id: 'source-photo-title' }, 'Foto sumber'),
      h('button', {
        type: 'button',
        class: 'btn btn-secondary',
        'data-action': 'close-photo-dialog'
      }, 'Tutup')),
    photoStatus,
    photoImage,
    h('p', { class: 'muted small' }, DISCLAIMERS.photo)));
  screen.appendChild(photoDialog);

  function openPhotoDialog() {
    if (typeof photoDialog.showModal === 'function' && !photoDialog.open) {
      try {
        photoDialog.showModal();
        return;
      } catch {
        // fallback
      }
    }
    photoDialog.setAttribute('open', '');
  }

  async function showSourcePhoto(photoId) {
    photoImage.hidden = true;
    photoImage.removeAttribute('src');
    photoStatus.textContent = 'Memuat foto sumber…';
    openPhotoDialog();
    try {
      const photo = await ctx.state.getSourcePhoto(photoId);
      const dataUrl = attachmentDataUrl(photo);
      if (!photo || !dataUrl) throw new Error('Foto tidak tersedia.');
      photoImage.src = dataUrl;
      photoImage.alt = 'Foto sumber resep';
      photoImage.hidden = false;
      photoStatus.textContent = '';
    } catch (error) {
      photoStatus.textContent = error?.code === 'TERKUNCI'
        ? 'Aplikasi terkunci. Buka kunci untuk melihat foto sumber.'
        : error?.code === 'FOTO_TIDAK_ADA'
          ? 'Foto sumber tidak ditemukan. Foto mungkin sudah dihapus.'
          : 'Foto sumber tidak dapat dibuka. '
            + 'Bila kata sandi pernah diubah, foto lama mungkin tidak dapat dibuka.';
    }
  }

  // ---------------------------------------------------------------------
  // Daftar obat
  // ---------------------------------------------------------------------

  const listCard = h('section', { class: 'card' });
  listCard.appendChild(h('h2', {}, 'Daftar obat'));
  const medList = h('ul', { id: 'med-list', class: 'list med-list' });
  listCard.appendChild(medList);
  screen.appendChild(listCard);

  // Foto resep asli ditampilkan LANGSUNG di bawah terjemahan, supaya dokter/perawat bisa
  // mencocokkannya tanpa membuka jendela lain. Cache per foto agar render ulang daftar tidak
  // membaca IndexedDB berulang.
  const urlFotoSumber = new Map();
  function sourceBlock(med) {
    const src = med.source;
    if (!src || (!src.photoId && !src.translatedText)) return null;
    const box = h('div', { class: 'source-block' });
    if (src.translatedText) {
      box.appendChild(h('p', { class: 'med-row' },
        h('strong', {}, 'Terjemahan dari resep: '), src.translatedText));
    }
    if (src.photoId) {
      const img = h('img', { class: 'source-figure-img', alt: 'Foto resep asli', hidden: true });
      const status = h('p', { class: 'muted small', role: 'status' }, 'Memuat foto resep asli…');
      box.appendChild(h('figure', { class: 'source-figure' },
        h('figcaption', { class: 'source-caption' },
          h('strong', {}, 'Ini foto resep aslinya.'),
          ' Cocokkan dengan terjemahan di atas sebelum mengambil keputusan.'),
        status,
        img));
      const tampilkan = (dataUrl) => {
        img.src = dataUrl;
        img.hidden = false;
        status.textContent = '';
      };
      const gagal = (error) => {
        status.textContent = error?.code === 'TERKUNCI'
          ? 'Aplikasi terkunci. Buka kunci untuk melihat foto resep asli.'
          : 'Foto resep asli tidak dapat dimuat. Bila kata sandi pernah diubah, foto lama mungkin tidak dapat dibuka.';
      };
      const tersimpan = urlFotoSumber.get(src.photoId);
      if (tersimpan) {
        tampilkan(tersimpan);
      } else {
        Promise.resolve()
          .then(() => ctx.state.getSourcePhoto(src.photoId))
          .then((photo) => {
            const dataUrl = attachmentDataUrl(photo);
            if (!photo || !dataUrl) throw new Error('Foto tidak tersedia.');
            urlFotoSumber.set(src.photoId, dataUrl);
            tampilkan(dataUrl);
          })
          .catch(gagal);
      }
    }
    return box;
  }

  function renderMedicationList() {
    clear(medList);
    if (!medications.length) {
      medList.appendChild(h('li', { class: 'empty-state' },
        'Belum ada obat. Tekan "Tambah obat" untuk mencatat obat pertama.'));
      return;
    }

    for (const med of medications) {
      const item = h('li', { class: 'med-item', 'data-med-id': med.id });
      const heading = h('div', { class: 'med-heading' });
      heading.appendChild(h('strong', { class: 'med-name' }, med.name || 'Obat'));
      if (med.active === false) {
        heading.appendChild(h('span', { class: 'badge badge-warning' }, 'Tidak aktif'));
      }
      if (med.source?.verifiedByUser) {
        heading.appendChild(h('span', { class: 'badge badge-verified' }, 'Diverifikasi dari resep'));
      }
      item.appendChild(heading);

      if (med.activeIngredient) {
        item.appendChild(h('p', { class: 'med-row' },
          h('strong', {}, 'Bahan aktif: '), med.activeIngredient));
      }
      const doseText = [med.dose, med.doseUnit].filter(Boolean).join(' ');
      if (doseText) {
        item.appendChild(h('p', { class: 'med-row' }, h('strong', {}, 'Dosis: '), doseText));
      }
      item.appendChild(h('p', { class: 'med-row' },
        h('strong', {}, 'Jadwal: '), formatSchedule(med) || 'Belum ada jadwal'));
      if (med.instructions) {
        item.appendChild(h('p', { class: 'med-row' },
          h('strong', {}, 'Aturan: '), med.instructions));
      }

      const simulation = simulateStockOut(med, { today });
      item.appendChild(h('p', { class: 'med-row muted small' },
        stockSummary(med, simulation, today)));

      const duplicates = duplicatesForMedication(med, medications);
      if (duplicates.length) {
        const names = duplicates
          .flatMap((group) => group.medicationNames)
          .filter((name) => name && name !== med.name);
        if (names.length) {
          item.appendChild(h('p', { class: 'warning-text small' },
            `Bahan aktif sama dengan: ${names.join(', ')}. `
            + 'Ini bukan pemeriksaan interaksi obat.'));
        }
      }

      const sumber = sourceBlock(med);
      if (sumber) item.appendChild(sumber);
      if (med.source?.photoId) {
        item.appendChild(h('div', { class: 'actions' },
          h('button', {
            type: 'button',
            class: 'btn btn-secondary btn-small',
            'data-action': 'view-source-photo',
            'data-photo-id': med.source.photoId
          }, 'Perbesar foto resep asli')));
      }

      const actions = h('div', { class: 'actions' },
        h('button', {
          type: 'button',
          class: 'btn btn-secondary',
          'data-action': 'edit-med',
          'data-med-id': med.id
        }, 'Ubah'),
        h('button', {
          type: 'button',
          class: 'btn btn-secondary',
          'data-action': 'toggle-med',
          'data-med-id': med.id
        }, med.active === false ? 'Aktifkan' : 'Nonaktifkan'),
        h('button', {
          type: 'button',
          class: 'btn btn-danger',
          'data-action': 'delete-med',
          'data-med-id': med.id
        }, 'Hapus'));
      item.appendChild(actions);

      medList.appendChild(item);
    }
  }

  // ---------------------------------------------------------------------
  // Hari ini
  // ---------------------------------------------------------------------

  const todayCard = h('section', { class: 'card' });
  todayCard.appendChild(h('div', { class: 'row' },
    h('h2', {}, 'Hari ini'),
    h('span', { id: 'today-date', class: 'muted' }, formatDateSafe(today))));
  const todayList = h('ul', { id: 'today-list', class: 'dose-list' });
  todayCard.appendChild(todayList);
  todayCard.appendChild(h('p', { class: 'muted small' },
    'Pengingat hanya di dalam aplikasi; tidak ada notifikasi latar belakang dari server.'));
  screen.appendChild(todayCard);

  function renderTodayDoses() {
    clear(todayList);
    let doses = [];
    try {
      doses = applyDoseLogs(
        buildDosesForDate(medications, today, { profileId }),
        doseLogs,
        { now, graceMinutes: MISSED_GRACE_MINUTES }
      );
    } catch {
      doses = [];
    }

    if (!doses.length) {
      todayList.appendChild(h('li', { class: 'empty-state' },
        'Belum ada obat yang dijadwalkan hari ini.'));
      return;
    }

    const reminders = settings.reminders !== false;
    const nowMs = now.getTime();

    for (const dose of doses) {
      const due = isDoseDue(dose, { reminders, nowMs });
      const item = h('li', { class: `dose-item ${statusClass(dose, due)}`.trim() });
      const info = h('div', { class: 'dose-info' });
      info.appendChild(h('strong', { class: 'dose-name' }, dose.name || 'Obat'));
      const detail = [dose.time, dose.dose ? `${dose.dose} ${dose.doseUnit || ''}`.trim() : '']
        .filter(Boolean)
        .join(' · ');
      info.appendChild(h('span', { class: 'dose-detail' }, detail || 'Tanpa dosis tertulis'));
      item.appendChild(info);
      item.appendChild(h('span', { class: `dose-status ${statusClass(dose, due)}` },
        statusLabel(dose, due)));

      if (dose.status === 'pending' || dose.status === 'missed') {
        const actions = h('div', { class: 'dose-actions' },
          h('button', {
            type: 'button',
            class: 'btn btn-primary',
            'data-action': 'take-dose',
            'data-medication-id': dose.medicationId,
            'data-date': dose.date,
            'data-time': dose.time
          }, 'Sudah diminum'),
          h('button', {
            type: 'button',
            class: 'btn btn-secondary',
            'data-action': 'skip-dose',
            'data-medication-id': dose.medicationId,
            'data-date': dose.date,
            'data-time': dose.time
          }, 'Lewati'));
        item.appendChild(actions);
      }

      todayList.appendChild(item);
    }
  }

  // ---------------------------------------------------------------------
  // Kepatuhan
  // ---------------------------------------------------------------------

  const adherenceCard = h('section', { class: 'card' });
  adherenceCard.appendChild(h('h2', {}, 'Kepatuhan minum'));
  const adherenceSummary = h('div', { id: 'adherence-summary', class: 'adherence-summary' });
  const adherenceChart = h('div', { id: 'adherence-chart', class: 'chart-container' });
  adherenceCard.appendChild(adherenceSummary);
  adherenceCard.appendChild(adherenceChart);
  adherenceCard.appendChild(h('p', { class: 'muted small' },
    'Persentase = diminum ÷ (diminum + dilewati + terlewat) untuk dosis yang sudah jatuh tempo. '
    + 'Dosis tanpa catatan setelah masa tenggang dihitung terlewat.'));
  screen.appendChild(adherenceCard);

  function renderAdherence() {
    clear(adherenceSummary);
    let adherence = null;
    try {
      adherence = weeklyAdherence({
        medications,
        doseLogs,
        weekStartISO: startOfWeek(today),
        now,
        profileId
      });
    } catch {
      adherence = null;
    }

    if (!adherence || adherence.percent == null) {
      adherenceSummary.appendChild(h('p', { class: 'empty-state' },
        'Belum ada data kepatuhan untuk dosis yang sudah jatuh tempo minggu ini.'));
    } else {
      adherenceSummary.appendChild(h('div', { class: 'adherence-percent' },
        `${adherence.percent}%`));
      adherenceSummary.appendChild(h('div', { class: 'adherence-label' },
        complianceLabel(adherence.percent)));
      adherenceSummary.appendChild(h('p', { class: 'muted small' },
        `${adherence.taken} diminum · ${adherence.skipped} dilewati · `
        + `${adherence.missed} terlewat · ${adherence.pending} menunggu`));
    }

    let bars = [];
    try {
      bars = adherenceHistory({ medications, doseLogs, weeks: 8, now, profileId }).map((week) => ({
        label: formatDateSafe(week.weekStart, 'short') || '—',
        value: typeof week.percent === 'number' ? week.percent : 0,
        percent: typeof week.percent === 'number' ? week.percent : 0
      }));
    } catch {
      bars = [];
    }
    try {
      renderChart(adherenceChart, buildBarChartSVG({
        bars,
        max: 100,
        title: 'Kepatuhan minum 8 minggu terakhir',
        unit: '%'
      }));
    } catch {
      adherenceChart.textContent = 'Grafik belum tersedia.';
    }
  }

  // ---------------------------------------------------------------------
  // Tebus ulang
  // ---------------------------------------------------------------------

  const refillCard = h('section', { class: 'card' });
  refillCard.appendChild(h('h2', {}, 'Prediksi stok & tebus ulang'));
  const refillList = h('div', { id: 'refill-list', class: 'refill-summary' });
  refillCard.appendChild(refillList);
  refillCard.appendChild(h('p', { class: 'muted small' }, DISCLAIMERS.stock));
  screen.appendChild(refillCard);

  function renderRefills() {
    clear(refillList);
    let refills = [];
    try {
      refills = predictRefills(medications, { today, profileId });
    } catch {
      refills = [];
    }

    if (!refills.length) {
      refillList.appendChild(h('p', { class: 'empty-state' },
        'Belum ada obat aktif untuk dihitung.'));
      return;
    }

    const list = h('ul', { class: 'list refill-list' });
    for (const refill of refills) {
      const item = h('li', { class: 'refill-item' });
      const heading = h('div', { class: 'row' });
      heading.appendChild(h('strong', {}, refill.name || 'Obat'));
      if (refill.refillDue) {
        heading.appendChild(h('span', { class: 'badge badge-warning' }, 'Perlu tebus'));
      }
      item.appendChild(heading);

      if (!refill.tracked) {
        item.appendChild(h('span', { class: 'muted small' },
          'Stok tidak dilacak; isi sisa stok untuk perkiraan habis.'));
      } else if (refill.reason === 'obat-tidak-aktif') {
        item.appendChild(h('span', { class: 'muted small' }, 'Obat tidak aktif.'));
      } else {
        const details = [];
        if (typeof refill.remaining === 'number') {
          details.push(`sisa ${refill.remaining} ${refill.unit || ''}`.trim());
        }
        if (refill.runOutDate) {
          details.push(`habis ${formatDateSafe(refill.runOutDate, 'short')}`);
        }
        if (refill.refillByDate) {
          details.push(`tebus ${formatDateSafe(refill.refillByDate, 'short')}`);
        }
        item.appendChild(h('span', { class: 'muted small' }, details.join(' · ')));
      }
      list.appendChild(item);
    }
    refillList.appendChild(list);
  }

  // ---------------------------------------------------------------------
  // Aksi
  // ---------------------------------------------------------------------

  async function logDose(target, status) {
    const buttons = target.closest('.dose-actions')?.querySelectorAll('button') || [target];
    for (const button of buttons) button.disabled = true;
    try {
      await ctx.state.logDose({
        medicationId: target.dataset.medicationId,
        date: target.dataset.date,
        time: target.dataset.time,
        status
      });
      ctx.toast(status === 'taken' ? 'Dosis dicatat diminum.' : 'Dosis dilewati.', 'success');
      await ctx.refresh();
    } catch (error) {
      ctx.toast(error?.message || 'Catatan dosis gagal disimpan.', 'error');
      for (const button of buttons) button.disabled = false;
    }
  }

  async function deleteMedication(medId) {
    const med = medications.find((entry) => entry.id === medId);
    if (!ctx.confirm(`Hapus obat "${med?.name || ''}"? Catatan dosis lama tetap tersimpan.`)) {
      return;
    }
    try {
      await ctx.state.remove('medications', medId);
      ctx.toast('Obat dihapus.', 'success');
      await ctx.refresh();
    } catch (error) {
      ctx.toast(error?.message || 'Obat gagal dihapus.', 'error');
    }
  }

  async function toggleMedication(medId) {
    const med = medications.find((entry) => entry.id === medId);
    if (!med) return;
    try {
      await ctx.state.upsert('medications', { ...med, active: med.active === false });
      ctx.toast(med.active === false ? 'Obat diaktifkan.' : 'Obat dinonaktifkan.', 'success');
      await ctx.refresh();
    } catch (error) {
      ctx.toast(error?.message || 'Status obat gagal diubah.', 'error');
    }
  }

  const clickHandler = async (event) => {
    const target = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('[data-action]')
      : null;
    if (!target || !screen.contains(target)) return;
    const action = target.dataset.action;

    if (action === 'edit-med') {
      const med = medications.find((entry) => entry.id === target.dataset.medId);
      if (med) openForm(med);
      return;
    }
    if (action === 'delete-med') {
      await deleteMedication(target.dataset.medId);
      return;
    }
    if (action === 'toggle-med') {
      await toggleMedication(target.dataset.medId);
      return;
    }
    if (action === 'take-dose') {
      await logDose(target, 'taken');
      return;
    }
    if (action === 'skip-dose') {
      await logDose(target, 'skipped');
      return;
    }
    if (action === 'view-source-photo') {
      await showSourcePhoto(target.dataset.photoId);
      return;
    }
    if (action === 'close-photo-dialog') {
      if (typeof photoDialog.close === 'function') photoDialog.close();
      else photoDialog.removeAttribute('open');
    }
  };

  newButton.addEventListener('click', () => openForm(null));
  cancelButton.addEventListener('click', () => closeForm());
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveMedication();
  });
  ingredientInput.addEventListener('input', updateDuplicateWarning);
  screen.addEventListener('click', clickHandler);

  resetForm();
  form.hidden = true;
  renderMedicationList();
  renderTodayDoses();
  renderAdherence();
  renderRefills();

  return () => {
    screen.removeEventListener('click', clickHandler);
  };
}

export default render;
