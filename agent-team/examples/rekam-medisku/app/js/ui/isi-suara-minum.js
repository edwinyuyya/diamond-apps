// Rekam Medisku — panel "Sudah minum" dan "Jadwal hari ini" (t22).
//
// Panel minum hanya memilih dosis dari jadwal hari ini; pencatatan dilakukan
// layar utama setelah konfirmasi eksplisit. Panel jadwal hanya membacakan
// jadwal (termasuk status pemeriksaan) dan tidak pernah menyimpan.

import { h, clear } from '../dom.js';
import {
  buildDosesForDate,
  applyDoseLogs
} from '../logic/schedule.js';
import { todayISO } from '../logic/dates.js';
import {
  labelPemeriksaan,
  LABEL_BELUM_DIPERIKSA
} from '../logic/pemeriksaan.js';
import { teksUlangMinum, teksUlangJadwal } from '../suara/tts.js';

const STATUS_DOSIS = {
  taken: 'Sudah diminum',
  skipped: 'Dilewati',
  missed: 'Terlewat',
  pending: 'Belum dicatat'
};

function normalisasiTeks(teks) {
  return String(teks ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namaDosis(dose) {
  return String(dose?.name ?? dose?.nama ?? '').trim();
}

function teksDosis(dose) {
  const doseText = String(dose?.dose ?? dose?.doseText ?? '').trim();
  const unit = String(dose?.doseUnit ?? dose?.unit ?? '').trim();
  if (doseText && unit) return `${doseText} ${unit}`;
  if (doseText) return doseText;
  const units = dose?.unitsPerDose;
  if (units !== null && units !== undefined) return `${units} tablet`;
  return '';
}

function labelDosis(dose) {
  return STATUS_DOSIS[dose?.status] || STATUS_DOSIS.pending;
}

function bacaData(ctx) {
  let stateData = {};
  try {
    stateData = ctx?.state?.getState?.() || {};
  } catch {
    stateData = {};
  }
  const profileId = ctx?.profile?.id ?? stateData.activeProfileId ?? null;
  const now = typeof ctx?.now === 'function' ? ctx.now() : new Date();
  const medications = Array.isArray(stateData.medications) ? stateData.medications : [];
  const meds = profileId === null
    ? medications
    : medications.filter((med) => med && med.profileId === profileId);
  const dasar = buildDosesForDate(meds, todayISO(now), { profileId });
  const doses = applyDoseLogs(dasar, Array.isArray(stateData.doseLogs) ? stateData.doseLogs : [], { now });
  return { meds, doses, now };
}

function medMap(meds) {
  const map = new Map();
  for (const med of meds) {
    if (med && typeof med.id === 'string') map.set(med.id, med);
  }
  return map;
}

function jamCocokDenganUcapan(norm, time) {
  const jam = Number(String(time || '').slice(0, 2));
  if (!Number.isFinite(jam)) return false;
  if (/\bpagi\b/.test(norm)) return jam >= 5 && jam < 11;
  if (/\bsiang\b/.test(norm)) return jam >= 11 && jam < 15;
  if (/\bmalam\b/.test(norm)) return jam >= 15 && jam < 21;
  if (/\bsebelum tidur\b/.test(norm)) return jam >= 21 || jam < 5;
  const angka = norm.match(/\b(\d{1,2})(?::(\d{2}))?\b/);
  if (angka) {
    const disebut = Number(angka[1]);
    if (Number.isFinite(disebut) && disebut >= 0 && disebut <= 23) return jam === disebut;
  }
  return null;
}

/**
 * Bangun panel catat minum.
 *
 * @param {{ctx:object, mintaKonfirmasi:Function}} opsi
 */
export function buatPanelMinum({ ctx, mintaKonfirmasi } = {}) {
  let pilihan = null;
  let doses = [];
  let medsById = new Map();

  const panel = h('div', {
    id: 'suara-panel-minum',
    role: 'tabpanel',
    'aria-labelledby': 'suara-tab-minum',
    class: 'card stack'
  });

  panel.appendChild(h('h2', { class: 'card-title' }, 'Catat sudah minum'));
  panel.appendChild(h('p', { class: 'muted' },
    'Ucapkan nama obat yang ada di jadwal hari ini, atau pilih dari daftar. '
    + 'Pencatatan baru disimpan setelah konfirmasi.'));

  const daftarSelect = h('select', {
    id: 'suara-minum-daftar', name: 'suara-minum-daftar'
  });
  const obatInput = h('input', {
    id: 'suara-minum-obat', name: 'suara-minum-obat', type: 'text', readOnly: true
  });
  const jamInput = h('input', {
    id: 'suara-minum-jam', name: 'suara-minum-jam', type: 'text', readOnly: true
  });
  const statusBox = h('p', { id: 'suara-minum-status', class: 'muted' });
  const catatButton = h('button', {
    id: 'btn-suara-minum-catat',
    type: 'button',
    class: 'button button--primary',
    style: { minHeight: '48px', minWidth: '48px' },
    disabled: true
  }, 'Bacakan ulang dan catat');

  function field(labelText, control) {
    return h('div', { class: 'field' },
      h('label', { for: control.id }, labelText),
      control);
  }

  panel.appendChild(field('Jadwal hari ini', daftarSelect));
  panel.appendChild(h('div', { class: 'form-grid' },
    field('Obat', obatInput),
    field('Jam', jamInput)));
  panel.appendChild(statusBox);
  panel.appendChild(h('div', { class: 'actions' }, catatButton));

  catatButton.addEventListener('click', () => {
    if (!pilihan) return;
    if (typeof mintaKonfirmasi === 'function') mintaKonfirmasi();
  });

  function kunciDosis(dose) {
    return `${dose.medicationId}::${dose.time}`;
  }

  function perbaruiPilihan() {
    const key = daftarSelect.value;
    pilihan = doses.find((dose) => kunciDosis(dose) === key) || null;
    if (pilihan) {
      obatInput.value = namaDosis(pilihan);
      jamInput.value = pilihan.time || '';
      const med = medsById.get(pilihan.medicationId);
      const pemeriksaan = med ? labelPemeriksaan(med) : LABEL_BELUM_DIPERIKSA;
      statusBox.textContent = `${labelDosis(pilihan)}. Status obat: ${pemeriksaan}.`;
    } else {
      obatInput.value = '';
      jamInput.value = '';
      statusBox.textContent = 'Belum ada dosis dipilih.';
    }
    catatButton.disabled = !pilihan;
    catatButton.setAttribute('aria-disabled', pilihan ? 'false' : 'true');
  }

  daftarSelect.addEventListener('change', perbaruiPilihan);

  function muatUlang() {
    const data = bacaData(ctx);
    doses = data.doses;
    medsById = medMap(data.meds);
    const sebelumnya = daftarSelect.value;

    clear(daftarSelect);
    daftarSelect.appendChild(h('option', { value: '' }, 'Pilih dosis hari ini'));
    if (doses.length === 0) {
      daftarSelect.appendChild(h('option', { value: '' }, 'Tidak ada jadwal obat hari ini'));
    } else {
      for (const dose of doses) {
        const med = medsById.get(dose.medicationId);
        const pemeriksaan = med ? labelPemeriksaan(med) : LABEL_BELUM_DIPERIKSA;
        const dosis = teksDosis(dose);
        const label = [
          dose.time,
          namaDosis(dose) || 'Obat',
          dosis ? `(${dosis})` : '',
          `· ${labelDosis(dose)}`,
          `· ${pemeriksaan}`
        ].filter(Boolean).join(' ');
        daftarSelect.appendChild(h('option', {
          value: kunciDosis(dose)
        }, label));
      }
      if (sebelumnya && doses.some((dose) => kunciDosis(dose) === sebelumnya)) {
        daftarSelect.value = sebelumnya;
      }
    }
    perbaruiPilihan();
  }

  function dariDikte(teks) {
    muatUlang();
    if (doses.length === 0) {
      return {
        ok: false,
        pesan: 'Tidak ada jadwal obat hari ini. Tambahkan obat dan jadwal terlebih dahulu.',
        fokus: daftarSelect
      };
    }

    const norm = normalisasiTeks(teks);
    let cocok = doses.filter((dose) => {
      const nama = normalisasiTeks(namaDosis(dose));
      return nama !== '' && norm.includes(nama);
    });

    if (cocok.length > 1) {
      const denganJam = cocok.filter((dose) => jamCocokDenganUcapan(norm, dose.time) === true);
      if (denganJam.length > 0) cocok = denganJam;
    }

    if (cocok.length === 0) {
      pilihan = null;
      daftarSelect.value = '';
      perbaruiPilihan();
      return {
        ok: false,
        pesan: 'Nama obat tidak ada di jadwal hari ini. Pilih dosis dari daftar atau ucapkan nama obat yang terdaftar.',
        fokus: daftarSelect
      };
    }

    if (cocok.length > 1) {
      const pertama = cocok[0];
      daftarSelect.value = kunciDosis(pertama);
      perbaruiPilihan();
      return {
        ok: true,
        ringkas: `Beberapa dosis cocok: ${cocok.map((dose) => `${dose.time} ${namaDosis(dose)}`).join(', ')}. `
          + 'Pilih salah satu di daftar, lalu konfirmasi.',
        fokus: daftarSelect
      };
    }

    const dose = cocok[0];
    daftarSelect.value = kunciDosis(dose);
    perbaruiPilihan();
    const med = medsById.get(dose.medicationId);
    const pemeriksaan = med ? labelPemeriksaan(med) : LABEL_BELUM_DIPERIKSA;
    return {
      ok: true,
      ringkas: `Draf catat minum: ${namaDosis(dose)} pukul ${dose.time}. `
        + `Status obat: ${pemeriksaan}.`,
      fokus: null
    };
  }

  function siapKonfirmasi() {
    if (!pilihan) {
      return {
        ok: false,
        pesan: 'Pilih dosis yang akan dicatat terlebih dahulu.',
        fokus: daftarSelect
      };
    }
    const dose = doses.find((item) => kunciDosis(item) === kunciDosis(pilihan));
    if (!dose) {
      return {
        ok: false,
        pesan: 'Dosis tidak lagi ada di jadwal hari ini. Muat ulang daftar.',
        fokus: daftarSelect
      };
    }
    const med = medsById.get(dose.medicationId);
    if (!med) {
      return {
        ok: false,
        pesan: 'Obat untuk dosis ini tidak ditemukan.',
        fokus: daftarSelect
      };
    }
    if (dose.status === 'taken') {
      return {
        ok: false,
        pesan: 'Dosis ini sudah tercatat diminum. Tidak perlu dicatat ulang.',
        fokus: daftarSelect
      };
    }
    const denganStatus = {
      ...dose,
      pemeriksaanOrangLain: med.pemeriksaanOrangLain
    };
    return {
      ok: true,
      draf: { dose, medication: med },
      ringkasan: teksUlangMinum(denganStatus)
    };
  }

  function bolehKonfirmasi() {
    return Boolean(pilihan);
  }

  async function simpan(draf) {
    if (!draf || !draf.dose) {
      throw new Error('Draf catat minum tidak tersedia. Ulangi pemilihan.');
    }
    if (!ctx?.state || typeof ctx.state.logDose !== 'function') {
      throw new Error('Penyimpanan tidak tersedia. Coba muat ulang layar.');
    }
    if (draf.dose.status === 'taken') {
      throw new Error('Dosis ini sudah tercatat diminum. Tidak perlu dicatat ulang.');
    }
    const log = await ctx.state.logDose({
      medicationId: draf.dose.medicationId,
      date: draf.dose.date,
      time: draf.dose.time,
      status: 'taken'
    });
    try {
      ctx?.toast?.('Catatan minum disimpan.', 'success');
    } catch {
      // Toast bukan syarat keberhasilan simpan.
    }
    muatUlang();
    return log;
  }

  function bersihkan() {
    daftarSelect.value = '';
    perbaruiPilihan();
    muatUlang();
  }

  function fokusPertama() {
    daftarSelect.focus();
  }

  function statusPemeriksaan() {
    if (!pilihan) return null;
    const med = medsById.get(pilihan.medicationId);
    return med ? labelPemeriksaan(med) : LABEL_BELUM_DIPERIKSA;
  }

  muatUlang();

  return {
    mode: 'minum',
    element: panel,
    dariDikte,
    siapKonfirmasi,
    bolehKonfirmasi,
    simpan,
    bersihkan,
    fokusPertama,
    statusPemeriksaan,
    muatUlang,
    pesanSukses: () => {
      if (!pilihan) return 'Catatan minum sudah disimpan.';
      return `Catatan minum ${namaDosis(pilihan)} pukul ${pilihan.time} sudah disimpan.`;
    }
  };
}

/**
 * Bangun panel jadwal hari ini (hanya membaca, tidak menyimpan).
 *
 * @param {{ctx:object, bacaTeks:Function, umumkan?:Function}} opsi
 */
export function buatPanelJadwal({ ctx, bacaTeks, umumkan } = {}) {
  let doses = [];
  let medsById = new Map();

  const panel = h('div', {
    id: 'suara-panel-jadwal',
    role: 'tabpanel',
    'aria-labelledby': 'suara-tab-jadwal',
    class: 'card stack'
  });

  panel.appendChild(h('h2', { class: 'card-title' }, 'Jadwal hari ini'));
  panel.appendChild(h('p', { class: 'muted' },
    'Bacaan memuat setiap dosis hari ini beserta status pemeriksaan obat. '
    + 'Layar ini tidak menyimpan apa pun.'));

  const daftar = h('ul', { id: 'suara-jadwal-daftar', class: 'stack' });
  const teks = h('p', { id: 'suara-jadwal-teks', class: 'muted' });
  const bacakanButton = h('button', {
    id: 'btn-suara-bacakan-jadwal',
    type: 'button',
    class: 'button button--primary',
    style: { minHeight: '48px', minWidth: '48px' }
  }, 'Bacakan jadwal hari ini');

  panel.appendChild(daftar);
  panel.appendChild(teks);
  panel.appendChild(h('div', { class: 'actions' }, bacakanButton));

  function muatUlang() {
    const data = bacaData(ctx);
    doses = data.doses;
    medsById = medMap(data.meds);
    clear(daftar);
    if (doses.length === 0) {
      daftar.appendChild(h('li', {}, 'Tidak ada jadwal obat hari ini.'));
      return;
    }
    for (const dose of doses) {
      const med = medsById.get(dose.medicationId);
      const pemeriksaan = med ? labelPemeriksaan(med) : LABEL_BELUM_DIPERIKSA;
      const dosis = teksDosis(dose);
      daftar.appendChild(h('li', {},
        `${dose.time} — ${namaDosis(dose) || 'Obat'}`
        + `${dosis ? `, ${dosis}` : ''}. `
        + `${labelDosis(dose)}. Status obat: ${pemeriksaan}.`));
    }
  }

  function teksJadwal() {
    const data = bacaData(ctx);
    doses = data.doses;
    medsById = medMap(data.meds);
    const statusMap = {};
    for (const [id, med] of medsById.entries()) statusMap[id] = med;
    return teksUlangJadwal(doses, { statusPemeriksaan: statusMap });
  }

  async function bacakanJadwal() {
    muatUlang();
    const ringkasan = teksJadwal();
    teks.textContent = ringkasan;
    if (typeof umumkan === 'function') umumkan(ringkasan);
    if (typeof bacaTeks === 'function') {
      await bacaTeks(ringkasan);
    }
    return ringkasan;
  }

  bacakanButton.addEventListener('click', () => {
    Promise.resolve(bacakanJadwal()).catch(() => {});
  });

  muatUlang();

  return {
    mode: 'jadwal',
    element: panel,
    dariDikte: () => ({ ok: true, ringkas: teksJadwal(), fokus: null }),
    siapKonfirmasi: () => ({ ok: false, pesan: 'Mode jadwal tidak menyimpan data.' }),
    bolehKonfirmasi: () => false,
    simpan: async () => {
      throw new Error('Mode jadwal tidak menyimpan data.');
    },
    bersihkan: () => {},
    fokusPertama: () => daftar.focus?.(),
    statusPemeriksaan: () => null,
    muatUlang,
    bacakanJadwal,
    pesanSukses: () => ''
  };
}
