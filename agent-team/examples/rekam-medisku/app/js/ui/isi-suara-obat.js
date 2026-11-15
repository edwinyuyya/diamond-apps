// Rekam Medisku — panel "Obat" pada layar Isi dengan Suara (t33).
//
// Sejak 8B.15/9.4.10, jalur obat utama adalah TANYA SATU PER SATU di
// `#/suara/tanya`: nama dipilih dari daftar/pindai/ketik/ejaan (tidak pernah
// dari ASR bebas), lalu lima pertanyaan tertutup, lalu konfirmasi persis.
//
// Panel ini hanya menampilkan pintu masuk ke layar tanya, status sesi, dan
// field lama sebagai ringkasan/sunting pendamping. Panel TIDAK menyimpan obat
// dan tidak pernah mengisi `#suara-obat-nama` dari `kenaliSuara`.

import { h, clear } from '../dom.js';
import { pagarKewajaranDosis } from '../logic/ucapanObat.js';
import {
  defaultPemeriksaan,
  LABEL_BELUM_DIPERIKSA
} from '../logic/pemeriksaan.js';

const SUMBER_NAMA = [
  { value: 'daftar', label: 'Daftar obat tersimpan' },
  { value: 'pindai', label: 'Hasil pindai resep' },
  { value: 'ketik', label: 'Ketik nama obat' },
  { value: 'ejaan', label: 'Ejaan huruf per huruf' }
];

const ATURAN_OPSI = [
  { value: '', label: 'Tidak disebutkan' },
  { value: 'sebelum', label: 'Sebelum makan' },
  { value: 'sesudah', label: 'Sesudah makan' },
  { value: 'saat', label: 'Saat makan' },
  { value: 'bila-perlu', label: 'Bila perlu' }
];

const PESAN_PAGAR =
  'Sunting takaran/frekuensi agar berada dalam batas wajar, lalu minta '
  + 'Pemeriksaan Pendamping.';

const PESAN_LEGACY =
  'Dikte bebas tidak dipakai untuk nama obat. Isian di bawah hanya ringkasan/'
  + 'sunting pendamping; obat disimpan lewat layar tanya setelah konfirmasi.';

function field(labelText, control, { hint = '', required = false } = {}) {
  const wrapper = h('div', { class: 'field' });
  const label = h('label', { for: control.id }, labelText);
  if (required) label.appendChild(document.createTextNode(' *'));
  wrapper.appendChild(label);
  wrapper.appendChild(control);
  if (hint) wrapper.appendChild(h('p', { class: 'hint' }, hint));
  return wrapper;
}

function angkaAtauNull(teks) {
  const value = String(teks ?? '').trim().replace(',', '.');
  if (value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function parseKekuatan(teks, satuanCadangan = '') {
  const value = String(teks ?? '').trim();
  if (value === '') return { nilai: null, satuan: '', teks: '' };
  const cocok = /^(\d+(?:[.,]\d+)?)\s*(mg|mcg|g|ml|%)?$/i.exec(value);
  if (!cocok) return null;
  const nilai = Number(cocok[1].replace(',', '.'));
  if (!Number.isFinite(nilai)) return null;
  const satuan = (cocok[2] || satuanCadangan || '').toLowerCase();
  return {
    nilai,
    satuan,
    teks: satuan ? `${nilai} ${satuan}` : String(nilai)
  };
}

function parseJadwalJam(teks) {
  const raw = String(teks ?? '').trim();
  if (raw === '') return { ok: true, jadwal: [] };
  const hasil = [];
  for (const bagian of raw.split(/[,;]+/)) {
    const token = bagian.trim();
    if (token === '') continue;
    const cocok = /^(\d{1,2}):(\d{2})$/.exec(token);
    if (!cocok) return { ok: false, jadwal: [] };
    const jam = Number(cocok[1]);
    const menit = Number(cocok[2]);
    if (jam > 23 || menit > 59) return { ok: false, jadwal: [] };
    const waktu = `${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')}`;
    if (!hasil.includes(waktu)) hasil.push(waktu);
  }
  hasil.sort();
  return { ok: true, jadwal: hasil };
}

function pergiKe(ctx, route) {
  try {
    if (ctx && typeof ctx.navigate === 'function') {
      ctx.navigate(route);
      return;
    }
  } catch {
    // jatuh ke location.hash
  }
  if (typeof location !== 'undefined') location.hash = route;
}

/**
 * Bangun panel Obat (pintu masuk alur tanya).
 *
 * @param {{ctx:object}} opsi
 */
export function buatPanelObat({ ctx } = {}) {
  const panel = h('div', {
    id: 'suara-panel-obat',
    role: 'tabpanel',
    'aria-labelledby': 'suara-tab-obat',
    class: 'card stack'
  });

  panel.appendChild(h('h2', { class: 'card-title' }, 'Obat lewat tanya satu per satu'));
  panel.appendChild(h('p', { class: 'muted' },
    'Nama obat dipilih dari daftar, hasil pindai, ketikan, atau ejaan — bukan dari '
    + 'dikte bebas. Setelah itu lima pertanyaan tertutup dan konfirmasi persis. '
    + 'Obat hanya disimpan setelah jawaban "Ya, benar".'));

  const tombolTanya = h('button', {
    id: 'btn-suara-tanya-obat',
    type: 'button',
    class: 'button button--primary',
    style: { minHeight: '56px', minWidth: '48px', width: '100%' }
  }, 'Mulai tanya obat');

  const sumberSelect = h('select', {
    id: 'suara-obat-sumber',
    name: 'suara-obat-sumber'
  }, SUMBER_NAMA.map((item) => h('option', { value: item.value }, item.label)));

  const statusTanya = h('p', {
    id: 'suara-obat-tanya-status',
    class: 'status-message muted',
    role: 'status',
    'aria-live': 'polite'
  }, 'Belum ada sesi tanya. Tekan "Mulai tanya obat" untuk memulai.');

  const legacyNote = h('p', { id: 'suara-obat-legacy-note', class: 'hint' }, PESAN_LEGACY);

  panel.appendChild(tombolTanya);
  panel.appendChild(field('Sumber nama obat', sumberSelect, {
    hint: 'Pilihan ini dipakai di layar tanya. Mikrofon tidak dipakai untuk nama obat.'
  }));
  panel.appendChild(statusTanya);
  panel.appendChild(legacyNote);

  // ---------------------------------------------------------------------
  // Field lama: ringkasan/sunting pendamping, bukan hasil ASR dan bukan
  // jalur simpan. Semua ID lama tetap tersedia (9.4.10).
  // ---------------------------------------------------------------------
  const namaInput = h('input', {
    id: 'suara-obat-nama', name: 'suara-obat-nama', type: 'text',
    autocomplete: 'off', list: 'suara-pemilih-obat'
  });
  const pemilihObat = h('datalist', { id: 'suara-pemilih-obat' });
  const kekuatanInput = h('input', {
    id: 'suara-obat-kekuatan', name: 'suara-obat-kekuatan', type: 'text',
    inputmode: 'decimal', autocomplete: 'off', placeholder: 'mis. 12,5 mg'
  });
  const frekuensiInput = h('input', {
    id: 'suara-obat-frekuensi', name: 'suara-obat-frekuensi', type: 'number',
    inputmode: 'numeric', min: '1', max: '24', step: '1'
  });
  const takaranInput = h('input', {
    id: 'suara-obat-takaran', name: 'suara-obat-takaran', type: 'number',
    inputmode: 'decimal', min: '0', step: 'any'
  });
  const aturanSelect = h('select', {
    id: 'suara-obat-aturan', name: 'suara-obat-aturan'
  }, ATURAN_OPSI.map((opsi) => h('option', { value: opsi.value }, opsi.label)));
  const jadwalInput = h('input', {
    id: 'suara-obat-jadwal', name: 'suara-obat-jadwal', type: 'text',
    autocomplete: 'off', placeholder: 'mis. 07:00, 19:00'
  });
  const terjemahan = h('p', {
    id: 'suara-obat-terjemahan', class: 'muted', 'aria-live': 'off'
  });
  const pagarBox = h('p', {
    id: 'suara-obat-pagar',
    class: 'error-text',
    role: 'alert',
    tabindex: '-1',
    hidden: true
  });

  const ringkasanLama = h('div', { class: 'stack' });
  ringkasanLama.appendChild(h('h3', {}, 'Ringkasan/sunting pendamping'));
  ringkasanLama.appendChild(h('p', { class: 'hint' },
    'Bukan hasil dikte dan tidak disimpan dari panel ini. Gunakan layar tanya '
    + 'untuk mencatat obat baru.'));
  ringkasanLama.appendChild(h('div', { class: 'form-grid' },
    field('Nama obat (ringkasan)', namaInput),
    field('Kekuatan dan satuan', kekuatanInput, { hint: 'Contoh: 12,5 mg, 500 mcg, 5 ml.' })));
  ringkasanLama.appendChild(pemilihObat);
  ringkasanLama.appendChild(h('div', { class: 'form-grid' },
    field('Frekuensi (kali sehari)', frekuensiInput, { hint: 'Lebih dari 8 kali ditolak pagar.' }),
    field('Takaran per dosis', takaranInput, { hint: 'Lebih dari 4 tablet/kapsul ditolak pagar.' })));
  ringkasanLama.appendChild(h('div', { class: 'form-grid' },
    field('Aturan makan', aturanSelect),
    field('Jadwal jam', jadwalInput, { hint: 'Format HH:mm, pisahkan dengan koma.' })));
  ringkasanLama.appendChild(h('div', { class: 'field' },
    h('span', { class: 'hint' }, 'Terjemahan'),
    terjemahan));
  ringkasanLama.appendChild(pagarBox);

  const detail = h('details', { class: 'stack' }, ringkasanLama);
  panel.appendChild(detail);

  panel.appendChild(h('p', { class: 'hint' },
    'Status entri baru: ',
    h('strong', {}, LABEL_BELUM_DIPERIKSA),
    '. Suara bukan verifikasi.'));

  // ---------------------------------------------------------------------
  // Perilaku
  // ---------------------------------------------------------------------
  function ringkasanSumber() {
    const item = SUMBER_NAMA.find((opsi) => opsi.value === sumberSelect.value);
    return item ? item.label : 'Daftar obat tersimpan';
  }

  tombolTanya.addEventListener('click', () => {
    statusTanya.textContent = `Membuka layar tanya dengan sumber nama: ${ringkasanSumber()}.`;
    pergiKe(ctx, '#/suara/tanya');
  });

  function bacaField() {
    const nama = namaInput.value.trim();
    if (nama === '') {
      return { ok: false, pesan: 'Nama obat belum diisi (ringkasan pendamping).', fokus: namaInput };
    }

    const kekuatan = parseKekuatan(kekuatanInput.value);
    if (kekuatan === null) {
      return {
        ok: false,
        pesan: 'Kekuatan harus berupa angka dengan satuan mg, mcg, g, ml, atau %.',
        fokus: kekuatanInput
      };
    }

    const frekuensi = angkaAtauNull(frekuensiInput.value);
    if (Number.isNaN(frekuensi) || (frekuensi !== null && frekuensi <= 0)) {
      return { ok: false, pesan: 'Frekuensi harus angka lebih dari 0.', fokus: frekuensiInput };
    }

    const takaran = angkaAtauNull(takaranInput.value);
    if (Number.isNaN(takaran) || (takaran !== null && takaran < 0)) {
      return { ok: false, pesan: 'Takaran harus angka 0 atau lebih.', fokus: takaranInput };
    }

    const jadwal = parseJadwalJam(jadwalInput.value);
    if (!jadwal.ok) {
      return {
        ok: false,
        pesan: 'Jadwal jam harus format HH:mm dan dipisahkan koma. Contoh: 07:00, 19:00.',
        fokus: jadwalInput
      };
    }

    const pagar = pagarKewajaranDosis({
      takaranPerDosis: takaran,
      kaliSehari: frekuensi,
      satuanTakaran: kekuatan.satuan || null
    });
    if (!pagar.ok) {
      return {
        ok: false,
        pesan: `${pagar.pesan} ${PESAN_PAGAR}`,
        fokus: pagar.kode === 'TAKARAN_TIDAK_WAJAR' ? takaranInput : frekuensiInput,
        pagar
      };
    }

    return {
      ok: true,
      ringkasan: `${nama}${kekuatan.teks ? ` ${kekuatan.teks}` : ''}`
        + `${frekuensi ? `, ${frekuensi} kali sehari` : ''}`
        + `${takaran !== null ? `, ${takaran} tablet` : ''}`
        + `${aturanSelect.value ? `, ${aturanSelect.value}` : ''}`
        + `${jadwal.jadwal.length ? `, ${jadwal.jadwal.join(' dan ')}` : ''}.`
    };
  }

  function perbaruiTerjemahan() {
    const hasil = bacaField();
    if (!hasil.ok) {
      terjemahan.textContent = 'Ringkasan pendamping belum lengkap.';
      if (hasil.pagar) {
        pagarBox.textContent = hasil.pesan;
        pagarBox.hidden = false;
      } else {
        pagarBox.textContent = '';
        pagarBox.hidden = true;
      }
      return;
    }
    terjemahan.textContent = hasil.ringkasan;
    pagarBox.textContent = '';
    pagarBox.hidden = true;
  }

  panel.addEventListener('input', perbaruiTerjemahan);
  panel.addEventListener('change', perbaruiTerjemahan);

  function muatPemilihObat() {
    clear(pemilihObat);
    let stateData = {};
    try {
      stateData = ctx?.state?.getState?.() || {};
    } catch {
      stateData = {};
    }
    const profileId = ctx?.profile?.id ?? stateData.activeProfileId ?? null;
    const medications = Array.isArray(stateData.medications) ? stateData.medications : [];
    const nama = [];
    for (const med of medications) {
      if (!med || typeof med.name !== 'string' || med.name.trim() === '') continue;
      if (profileId !== null && med.profileId !== profileId) continue;
      if (!nama.includes(med.name.trim())) nama.push(med.name.trim());
    }
    nama.sort((a, b) => a.localeCompare(b, 'id'));
    for (const item of nama) {
      pemilihObat.appendChild(h('option', { value: item }));
    }
  }

  function bersihkan() {
    namaInput.value = '';
    kekuatanInput.value = '';
    frekuensiInput.value = '';
    takaranInput.value = '';
    aturanSelect.value = '';
    jadwalInput.value = '';
    terjemahan.textContent = '';
    pagarBox.textContent = '';
    pagarBox.hidden = true;
  }

  muatPemilihObat();
  perbaruiTerjemahan();

  return {
    mode: 'obat',
    element: panel,
    // Mode obat tidak punya konfirmasi/simpan lokal: konfirmasi wajib ada di
    // layar tanya (9.4.13) agar tidak terjadi konfirmasi ganda.
    dariDikte: () => ({
      ok: false,
      pesan: 'Dikte bebas tidak dipakai untuk nama obat. Gunakan tombol "Mulai tanya obat".',
      fokus: tombolTanya
    }),
    siapKonfirmasi: () => ({
      ok: false,
      pesan: 'Obat disimpan lewat layar tanya setelah konfirmasi "Ya, benar".'
    }),
    bolehKonfirmasi: () => false,
    simpan: async () => {
      throw new Error('Simpan obat hanya melalui alur tanya satu per satu.');
    },
    bersihkan,
    fokusPertama: () => tombolTanya.focus(),
    setStatusTanya: (teks) => {
      statusTanya.textContent = String(teks || '');
    },
    statusPemeriksaan: () => LABEL_BELUM_DIPERIKSA,
    pesanSukses: (saved) => `Obat ${saved?.name || 'ini'} sudah dicatat ke daftar obat.`,
    sumberNama: () => sumberSelect.value,
    defaultPemeriksaan
  };
}
