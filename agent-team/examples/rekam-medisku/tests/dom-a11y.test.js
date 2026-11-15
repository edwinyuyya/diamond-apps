// Test DOM & aksesibilitas layar suara/pemeriksaan/bantuan (CONTRACT.md
// 9.4.9–9.4.12, 10.3, 14.1 t27). Memakai tests/helpers/fake-dom.js tanpa
// dependency dan tanpa peramban.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  createFakeDom,
  textOf,
  labelFor,
  accessibleName,
  documentOrder,
  tabbables,
  allElements
} from './helpers/fake-dom.js';

import { render as renderPengaturan } from '../app/js/ui/suara-pengaturan.js';
import { render as renderIsiSuara } from '../app/js/ui/isi-suara.js';
import { render as renderPemeriksaan } from '../app/js/ui/pemeriksaan.js';
import { render as renderBantuan } from '../app/js/ui/bantuan-suara.js';
import {
  defaultPemeriksaan,
  PERNYATAAN_PEMERIKSAAN
} from '../app/js/logic/pemeriksaan.js';
import { PERINGATAN_WEB_SPEECH } from '../app/js/suara/mesin.js';
import { daftarBantuan } from '../app/js/logic/perintahNavigasi.js';

const WAKTU = new Date(2026, 10, 9, 7, 0, 0);

const ID_9_4_9 = [
  'screen-suara-pengaturan', 'suara-mesin', 'suara-mesin-offline',
  'suara-mesin-offline-label', 'suara-mesin-web', 'suara-mesin-web-label',
  'suara-mesin-status', 'suara-web-warning', 'suara-setuju-checkbox',
  'btn-suara-setuju', 'btn-suara-cabut', 'suara-persetujuan-status',
  'suara-tidak-tersedia', 'settings-suara-tts', 'settings-suara-rate',
  'btn-simulasikan-suara', 'suara-pengaturan-error', 'suara-pengaturan-status',
  'suara-pengaturan-live'
];

const ID_9_4_10 = [
  'screen-isi-suara', 'suara-mesin-aktif', 'suara-mode', 'suara-tab-obat',
  'suara-tab-vital', 'suara-tab-minum', 'suara-tab-jadwal', 'suara-panel-obat',
  'suara-panel-vital', 'suara-panel-minum', 'suara-panel-jadwal',
  'btn-suara-mulai', 'btn-suara-berhenti', 'suara-mendengarkan',
  'suara-transkrip', 'suara-status', 'suara-live', 'suara-error',
  'suara-warning', 'suara-hasil', 'suara-ringkasan',
  'suara-pertanyaan-konfirmasi', 'btn-konfirmasi-ya', 'btn-konfirmasi-tidak',
  'btn-suara-ulangi', 'btn-suara-batal', 'suara-pemeriksaan-status',
  'btn-suara-bantuan', 'btn-suara-pengaturan', 'suara-pemilih-obat',
  'suara-obat-nama', 'suara-obat-kekuatan', 'suara-obat-frekuensi',
  'suara-obat-takaran', 'suara-obat-aturan', 'suara-obat-jadwal',
  'suara-obat-terjemahan', 'suara-obat-pagar',
  'suara-vital-jenis', 'suara-vital-sistolik', 'suara-vital-diastolik',
  'suara-vital-nilai', 'suara-vital-unit', 'suara-vital-waktu',
  'suara-vital-parse',
  'suara-minum-obat', 'suara-minum-jam', 'suara-minum-daftar',
  'btn-suara-minum-catat', 'suara-jadwal-daftar', 'btn-suara-bacakan-jadwal'
];

const ID_9_4_11 = [
  'screen-pemeriksaan', 'pemeriksaan-empty', 'pemeriksaan-list',
  'pemeriksaan-detail', 'pemeriksaan-obat-nama', 'pemeriksaan-status',
  'pemeriksaan-sumber', 'pemeriksaan-resep-foto', 'pemeriksaan-resep-kosong',
  'pemeriksaan-terjemahan', 'pemeriksaan-field-list',
  'pemeriksaan-nama-pendamping', 'pemeriksaan-pernyataan',
  'pemeriksaan-pernyataan-label', 'btn-pemeriksaan-sahkan',
  'pemeriksaan-error', 'pemeriksaan-live', 'pemeriksaan-filter',
  'pemeriksaan-count'
];

const ID_9_4_12 = [
  'screen-bantuan-suara', 'bantuan-suara-daftar', 'btn-bacakan-bantuan',
  'bantuan-kembali', 'bantuan-suara-live', 'bantuan-suara-warning'
];

function fakeState({ settings = {}, medications = [] } = {}) {
  let data = { settings, activeProfileId: 'p1', medications, doseLogs: [] };
  return {
    getState: () => data,
    list(collection, { profileId } = {}) {
      const daftar = Array.isArray(data[collection]) ? data[collection] : [];
      return profileId ? daftar.filter((item) => item.profileId === profileId) : daftar.slice();
    },
    async upsert(collection, item) {
      const daftar = Array.isArray(data[collection]) ? data[collection] : [];
      data = {
        ...data,
        [collection]: [...daftar.filter((entry) => entry.id !== item.id), item]
      };
      return item;
    },
    async setSettings(patch) {
      data = { ...data, settings: { ...data.settings, ...patch } };
      return data;
    },
    async getSourcePhoto() { return null; },
    async logDose() { return {}; }
  };
}

function ctxUntuk(state) {
  return {
    state,
    profile: { id: 'p1', name: 'Profil Uji' },
    now: () => WAKTU,
    navigate() {},
    toast() {},
    refresh() {}
  };
}

function obatContoh() {
  return {
    id: 'm1',
    profileId: 'p1',
    name: 'Captopril',
    dose: 12.5,
    doseUnit: 'mg',
    instructions: 'Dua kali sehari, sebelum makan',
    times: ['07:00', '19:00'],
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: '2026-11-09',
    endDate: null,
    stock: { remaining: 10, unit: 'tablet', unitsPerDose: 0.5 },
    refillReminderDays: 3,
    active: true,
    dibuatDengan: 'suara',
    dikonfirmasiDengan: 'suara',
    source: null,
    pemeriksaanOrangLain: defaultPemeriksaan()
  };
}

function harusAda(root, ids, layar) {
  for (const id of ids) {
    assert.ok(root.querySelector(`#${id}`), `${layar}: ID wajib #${id} tidak ada`);
  }
}

function periksaKontrolBerlabel(root, layar) {
  for (const kontrol of root.querySelectorAll('input, select, textarea')) {
    if (String(kontrol.type).toLowerCase() === 'hidden') continue;
    const nama = accessibleName(kontrol, root);
    assert.ok(
      nama.length > 0,
      `${layar}: kontrol #${kontrol.id || '(tanpa id)'} (${kontrol.tagName}) tanpa <label for> / aria-label`
    );
    if (kontrol.id) {
      assert.ok(
        labelFor(kontrol, root) || kontrol.getAttribute('aria-label'),
        `${layar}: #${kontrol.id} harus punya label for atau aria-label`
      );
    }
  }
}

function periksaTombolBernama(root, layar) {
  for (const tombol of root.querySelectorAll('button')) {
    assert.ok(
      accessibleName(tombol, root).length > 0,
      `${layar}: tombol #${tombol.id || '(tanpa id)'} tanpa nama aksesibel`
    );
  }
}

function periksaLiveDanAlert(root, { live, error }, layar) {
  const liveEl = root.querySelector(`#${live}`);
  assert.ok(liveEl, `${layar}: #${live} tidak ada`);
  assert.equal(liveEl.getAttribute('role'), 'status');
  assert.equal(liveEl.getAttribute('aria-live'), 'polite');

  const errorEl = root.querySelector(`#${error}`);
  assert.ok(errorEl, `${layar}: #${error} tidak ada`);
  assert.equal(errorEl.getAttribute('role'), 'alert');
}

async function daftarBerkasJs(dir) {
  const hasil = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const lengkap = path.join(dir, entry.name);
    if (entry.isDirectory()) hasil.push(...await daftarBerkasJs(lengkap));
    else if (entry.name.endsWith('.js')) hasil.push(lengkap);
  }
  return hasil;
}

/* ================================================================== */
/* 9.4.9 Pengaturan Suara                                             */
/* ================================================================== */

test('layar Pengaturan Suara: ID wajib, label, live region, dan peringatan pihak ketiga', async (t) => {
  const dom = createFakeDom();
  t.after(() => dom.teardown());
  const root = dom.createRoot();
  const state = fakeState();

  await renderPengaturan(root, ctxUntuk(state));

  const screen = root.querySelector('#screen-suara-pengaturan');
  assert.ok(screen, 'screen-suara-pengaturan tidak dirender');
  harusAda(root, ID_9_4_9, 'Pengaturan Suara');
  periksaKontrolBerlabel(root, 'Pengaturan Suara');
  periksaTombolBernama(root, 'Pengaturan Suara');
  periksaLiveDanAlert(root, { live: 'suara-pengaturan-live', error: 'suara-pengaturan-error' }, 'Pengaturan Suara');

  // Radio mesin berada dalam fieldset + legend dan punya label for.
  const fieldset = root.querySelector('#suara-mesin');
  assert.equal(fieldset.tagName, 'FIELDSET');
  assert.ok(fieldset.querySelector('legend'));

  const offline = root.querySelector('#suara-mesin-offline');
  const web = root.querySelector('#suara-mesin-web');
  assert.equal(offline.getAttribute('type'), 'radio');
  assert.equal(web.getAttribute('type'), 'radio');
  assert.equal(labelFor(offline, root).getAttribute('for'), 'suara-mesin-offline');
  assert.equal(labelFor(web, root).getAttribute('for'), 'suara-mesin-web');
  assert.equal(offline.checked, true, 'offline adalah default');
  assert.match(web.getAttribute('aria-describedby'), /suara-web-warning/);

  // Peringatan pihak ketiga selalu ada di DOM (bukan di balik modal).
  assert.equal(textOf(root.querySelector('#suara-web-warning')), PERINGATAN_WEB_SPEECH);

  // Tanpa API peramban: opsi web-speech disembunyikan dan pesan jelas tampil.
  const tidakTersedia = root.querySelector('#suara-tidak-tersedia');
  assert.equal(tidakTersedia.hidden, false);
  assert.match(textOf(tidakTersedia), /tidak tersedia di peramban ini/i);

  // Tombol besar 48 px lewat kelas voice-big-button.
  for (const id of ['btn-suara-setuju', 'btn-suara-cabut', 'btn-simulasikan-suara']) {
    const tombol = root.querySelector(`#${id}`);
    assert.ok(tombol.classList.contains('voice-big-button'), `#${id} harus voice-big-button`);
  }

  // Kecepatan TTS adalah range 0.5–1.5 step 0.1 dengan label terlihat.
  const rate = root.querySelector('#settings-suara-rate');
  assert.equal(rate.getAttribute('type'), 'range');
  assert.equal(rate.getAttribute('min'), '0.5');
  assert.equal(rate.getAttribute('max'), '1.5');
  assert.equal(rate.getAttribute('step'), '0.1');
  assert.ok(root.querySelector('#settings-suara-rate-value'));
});

/* ================================================================== */
/* 9.4.10 Isi dengan Suara                                            */
/* ================================================================== */

test('layar Isi dengan Suara: ID wajib, tab/tabpanel, label semua kontrol', async (t) => {
  const dom = createFakeDom();
  t.after(() => dom.teardown());
  const root = dom.createRoot();
  const state = fakeState();

  await renderIsiSuara(root, ctxUntuk(state));

  assert.ok(root.querySelector('#screen-isi-suara'), 'screen-isi-suara tidak dirender');
  harusAda(root, ID_9_4_10, 'Isi dengan Suara');
  periksaKontrolBerlabel(root, 'Isi dengan Suara');
  periksaTombolBernama(root, 'Isi dengan Suara');
  periksaLiveDanAlert(root, { live: 'suara-live', error: 'suara-error' }, 'Isi dengan Suara');

  // Tab memakai role=tab dengan aria-selected dan panel role=tabpanel.
  const tabs = root.querySelectorAll('[role="tab"]');
  assert.equal(tabs.length, 4);
  for (const tab of tabs) {
    assert.ok(['true', 'false'].includes(tab.getAttribute('aria-selected')));
    assert.equal(tab.getAttribute('type'), 'button');
    const panel = root.querySelector(`#${tab.getAttribute('aria-controls')}`);
    assert.ok(panel, `panel ${tab.getAttribute('aria-controls')} tidak ada`);
    assert.equal(panel.getAttribute('role'), 'tabpanel');
  }
  assert.equal(root.querySelector('#suara-tab-obat').getAttribute('aria-selected'), 'true');

  // Tombol konfirmasi besar dan berlabel persis.
  const ya = root.querySelector('#btn-konfirmasi-ya');
  const tidak = root.querySelector('#btn-konfirmasi-tidak');
  assert.equal(textOf(ya), 'Ya, benar');
  assert.equal(textOf(tidak), 'Tidak');
  assert.equal(ya.getAttribute('type'), 'button');
  assert.equal(tidak.getAttribute('type'), 'button');
  for (const tombol of [ya, tidak]) {
    assert.ok(parseFloat(tombol.style.minHeight) >= 48, `#${tombol.id} minimal 48px`);
    assert.ok(parseFloat(tombol.style.minWidth) >= 48, `#${tombol.id} minimal 48px`);
  }

  // Disclaimer wajib tampil di layar. Status pemeriksaan baru diisi setelah
  // ada entri, jadi saat render awal elemennya ada tetapi tersembunyi/kosong.
  assert.match(textOf(root.querySelector('#suara-warning')), /bukan alat medis/i);
  const status = root.querySelector('#suara-pemeriksaan-status');
  assert.ok(status, '#suara-pemeriksaan-status tidak ada');
  assert.equal(status.hidden, true);
  assert.equal(textOf(status), '');
});

test('Isi dengan Suara: urutan logis mulai -> hasil -> konfirmasi -> simpan/batal', async (t) => {
  const dom = createFakeDom();
  t.after(() => dom.teardown());
  const root = dom.createRoot();
  await renderIsiSuara(root, ctxUntuk(fakeState()));

  // Buka elemen yang secara default tersembunyi sampai ada hasil. Baris tombol dikte (#suara-aksi-dikte)
  // memang disembunyikan di mode Obat (obat memakai tanya satu per satu), jadi dibuka seperti mode dikte.
  for (const id of ['suara-aksi-dikte', 'suara-ringkasan', 'suara-pertanyaan-konfirmasi', 'btn-konfirmasi-ya', 'btn-konfirmasi-tidak']) {
    const el = root.querySelector(`#${id}`);
    assert.ok(el, `#${id} tidak ada`);
    el.hidden = false;
  }

  const urutan = documentOrder(root);
  for (const id of ['btn-suara-mulai', 'suara-ringkasan', 'btn-konfirmasi-ya', 'btn-konfirmasi-tidak']) {
    assert.ok(urutan.has(id), `#${id} tidak ditemukan untuk uji urutan`);
  }
  assert.ok(urutan.get('btn-suara-mulai') < urutan.get('suara-ringkasan'));
  assert.ok(urutan.get('suara-ringkasan') < urutan.get('btn-konfirmasi-ya'));
  assert.ok(urutan.get('btn-konfirmasi-ya') < urutan.get('btn-konfirmasi-tidak'));

  // Urutan Tab tombol aksi mengikuti alur; ringkasan difokus programatik
  // (tabindex -1) sehingga tidak masuk urutan Tab.
  const tabIds = tabbables(root).map((el) => el.id).filter(Boolean);
  const posisi = (id) => tabIds.indexOf(id);
  assert.ok(posisi('btn-suara-mulai') >= 0);
  assert.ok(posisi('btn-suara-mulai') < posisi('btn-konfirmasi-ya'));
  assert.ok(posisi('btn-konfirmasi-ya') < posisi('btn-konfirmasi-tidak'));
  assert.equal(root.querySelector('#suara-ringkasan').tabIndex, -1);
});

/* ================================================================== */
/* 9.4.11 Pemeriksaan Pendamping                                      */
/* ================================================================== */

test('layar Pemeriksaan: ID wajib, label, live/alert, status teks, dan urutan fokus', async (t) => {
  const dom = createFakeDom();
  t.after(() => dom.teardown());
  const root = dom.createRoot();
  const state = fakeState({ medications: [obatContoh()] });

  await renderPemeriksaan(root, ctxUntuk(state));

  assert.ok(root.querySelector('#screen-pemeriksaan'), 'screen-pemeriksaan tidak dirender');
  harusAda(root, ID_9_4_11, 'Pemeriksaan');
  periksaKontrolBerlabel(root, 'Pemeriksaan');
  periksaTombolBernama(root, 'Pemeriksaan');
  periksaLiveDanAlert(root, { live: 'pemeriksaan-live', error: 'pemeriksaan-error' }, 'Pemeriksaan');

  // Status tampil sebagai teks, bukan hanya warna.
  assert.match(textOf(root.querySelector('#pemeriksaan-status')), /Belum diperiksa pendamping\/apoteker/);
  assert.equal(textOf(root.querySelector('#pemeriksaan-obat-nama')), 'Captopril');
  assert.match(textOf(root.querySelector('#pemeriksaan-sumber')), /dibuat dengan suara/);

  // Pernyataan memakai label persis dan checkbox terhubung.
  const pernyataan = root.querySelector('#pemeriksaan-pernyataan');
  const labelPernyataan = root.querySelector('#pemeriksaan-pernyataan-label');
  assert.equal(pernyataan.getAttribute('type'), 'checkbox');
  assert.equal(labelPernyataan.getAttribute('for'), 'pemeriksaan-pernyataan');
  assert.equal(textOf(labelPernyataan), PERNYATAAN_PEMERIKSAAN);

  // Tombol sahkan nonaktif sampai nama + pernyataan valid.
  assert.equal(root.querySelector('#btn-pemeriksaan-sahkan').disabled, true);

  // Urutan fokus: filter -> daftar -> detail (nama -> pernyataan -> sahkan).
  const urutan = documentOrder(root);
  const tombolDaftar = root.querySelector('button[data-action="pilih-pemeriksaan"]');
  assert.ok(tombolDaftar, 'tombol pilih pemeriksaan tidak ada');
  const semua = allElements(root);
  assert.ok(
    semua.indexOf(root.querySelector('#pemeriksaan-filter')) < semua.indexOf(tombolDaftar),
    'filter harus sebelum tombol daftar'
  );
  const nama = root.querySelector('#pemeriksaan-nama-pendamping');
  const pernyataanIndex = urutan.get('pemeriksaan-pernyataan');
  assert.ok(semua.indexOf(tombolDaftar) < semua.indexOf(nama));
  assert.ok(urutan.get('pemeriksaan-nama-pendamping') < pernyataanIndex);
  assert.ok(pernyataanIndex < urutan.get('btn-pemeriksaan-sahkan'));
  assert.ok(tabbables(root).includes(nama));
  assert.ok(tabbables(root).includes(pernyataan));
  assert.equal(tabbables(root).includes(root.querySelector('#btn-pemeriksaan-sahkan')), false,
    'tombol sahkan yang disabled tidak boleh ikut urutan Tab');

  // Tidak ada klaim "terverifikasi" untuk pemeriksaan manusia.
  assert.doesNotMatch(textOf(root.querySelector('#screen-pemeriksaan')), /terverifikasi/i);
});

test('layar Pemeriksaan: daftar kosong menampilkan pesan kosong yang jelas', async (t) => {
  const dom = createFakeDom();
  t.after(() => dom.teardown());
  const root = dom.createRoot();
  await renderPemeriksaan(root, ctxUntuk(fakeState({ medications: [] })));

  const kosong = root.querySelector('#pemeriksaan-empty');
  assert.equal(kosong.hidden, false);
  assert.match(textOf(kosong), /Tidak ada obat yang menunggu pemeriksaan/);
  assert.ok(root.querySelector('#pemeriksaan-obat-nama'));
});

/* ================================================================== */
/* 9.4.12 Bantuan Suara                                               */
/* ================================================================== */

test('layar Bantuan Suara: ID wajib, daftar perintah, live region, dan peringatan', async (t) => {
  const dom = createFakeDom();
  t.after(() => dom.teardown());
  const root = dom.createRoot();

  const cleanup = await renderBantuan(root, { navigate() {} });
  t.after(() => { if (typeof cleanup === 'function') cleanup(); });

  assert.ok(root.querySelector('#screen-bantuan-suara'), 'screen-bantuan-suara tidak dirender');
  harusAda(root, ID_9_4_12, 'Bantuan Suara');
  periksaKontrolBerlabel(root, 'Bantuan Suara');
  periksaTombolBernama(root, 'Bantuan Suara');

  // Layar bantuan hanya butuh live region status (tidak ada form error).
  const liveEl = root.querySelector('#bantuan-suara-live');
  assert.ok(liveEl, 'Bantuan Suara: #bantuan-suara-live tidak ada');
  assert.equal(liveEl.getAttribute('role'), 'status');
  assert.equal(liveEl.getAttribute('aria-live'), 'polite');

  const daftar = root.querySelector('#bantuan-suara-daftar');
  assert.equal(daftar.tagName, 'UL');
  const item = daftar.querySelectorAll('li');
  assert.equal(item.length, daftarBantuan().length);
  assert.ok(item.every((li) => li.getAttribute('tabindex') === '0'));
  assert.match(textOf(daftar), /berhenti/);
  assert.match(textOf(daftar), /bantuan/);

  const warning = root.querySelector('#bantuan-suara-warning');
  assert.match(textOf(warning), /bukan alat medis/i);
  assert.match(textOf(warning), /tidak menjawab pertanyaan medis/i);
});

/* ================================================================== */
/* Pemeriksaan statis (10.3)                                          */
/* ================================================================== */

test('statis: tidak ada onclick= dan tidak ada innerHTML di layar suara/pemeriksaan', async () => {
  const berkas = await daftarBerkasJs('app/js');
  for (const file of berkas) {
    const isi = await readFile(file, 'utf8');
    assert.ok(!/onclick\s*=/.test(isi), `${file} memakai handler inline onclick=`);
  }

  const berkasLayar = [
    'app/js/ui/suara-pengaturan.js',
    'app/js/ui/isi-suara.js',
    'app/js/ui/isi-suara-obat.js',
    'app/js/ui/isi-suara-vital.js',
    'app/js/ui/isi-suara-minum.js',
    'app/js/ui/pemeriksaan.js',
    'app/js/ui/status-pemeriksaan.js',
    'app/js/ui/bantuan-suara.js'
  ];
  for (const file of berkasLayar) {
    const isi = await readFile(file, 'utf8');
    assert.ok(!/\.innerHTML\s*=/.test(isi), `${file} menulis innerHTML untuk data pengguna`);
  }
});

test('statis: SpeechRecognition hanya di modul suara; getUserMedia hanya di jalur audio/kamera', async () => {
  const berkas = await daftarBerkasJs('app/js');
  const suaraDir = path.join('app', 'js', 'suara') + path.sep;

  for (const file of berkas) {
    const isi = await readFile(file, 'utf8');
    if (!file.startsWith(suaraDir)) {
      assert.ok(
        !/SpeechRecognition|webkitSpeechRecognition/.test(isi),
        `${file} menyentuh SpeechRecognition di luar app/js/suara/`
      );
    }
    if (!file.startsWith(suaraDir)
        && !file.endsWith('photos.js')
        && !file.endsWith('photo-capture.js')) {
      assert.ok(!/getUserMedia/.test(isi), `${file} memanggil getUserMedia di luar jalur yang diizinkan`);
    }
  }
});

test('statis: layar suara/pemeriksaan tidak memuat URL eksternal', async () => {
  const berkas = [
    'app/js/ui/suara-pengaturan.js',
    'app/js/ui/isi-suara.js',
    'app/js/ui/isi-suara-obat.js',
    'app/js/ui/isi-suara-vital.js',
    'app/js/ui/isi-suara-minum.js',
    'app/js/ui/pemeriksaan.js',
    'app/js/ui/bantuan-suara.js',
    'app/js/ui/status-pemeriksaan.js',
    'app/js/suara/adaptor.js',
    'app/js/suara/mesin.js',
    'app/js/suara/webSpeech.js',
    'app/js/suara/persetujuan.js',
    'app/js/suara/konfirmasi.js',
    'app/js/suara/tts.js'
  ];
  for (const file of berkas) {
    const isi = (await readFile(file, 'utf8')).replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
    assert.ok(!/https?:\/\//.test(isi), `${file} memuat URL eksternal`);
  }
});

test('semua elemen layar yang dirender memakai tag DOM, bukan string HTML mentah', async (t) => {
  const dom = createFakeDom();
  t.after(() => dom.teardown());
  const root = dom.createRoot();
  await renderBantuan(root, {});
  const semua = allElements(root);
  assert.ok(semua.length > 5);
  // Tidak ada elemen yang dibuat dari string HTML mentah.
  assert.equal(root.querySelector('script'), null);
});

test('Isi dengan Suara: di mode Obat tombol dikte bebas disembunyikan (tombol redup yang tak berfungsi membingungkan)', async (t) => {
  const dom = createFakeDom();
  t.after(() => dom.teardown());
  const root = dom.createRoot();
  await renderIsiSuara(root, ctxUntuk(fakeState()));
  const baris = root.querySelector('#suara-aksi-dikte');
  assert.ok(baris, '#suara-aksi-dikte tidak ada');
  assert.equal(baris.hidden, true, 'mode Obat harus menyembunyikan baris tombol dikte');
});
