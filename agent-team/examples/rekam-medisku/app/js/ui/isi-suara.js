// Rekam Medisku — layar Isi dengan Suara (t22, CONTRACT.md 8B.2–8B.7 & 9.4.10).
//
// Prinsip yang dijaga modul ini:
// - mikrofon hanya aktif saat diminta; TTS selalu didahului `adaptor.berhenti()`;
// - tidak ada penyimpanan sebelum konfirmasi eksplisit (ya/benar atau tombol);
// - "lain" diulang maksimal 2 kali lalu batal tanpa menyimpan;
// - fokus pindah ke ringkasan/field error dan setiap status diumumkan;
// - suara bukan verifikasi: entri obat selalu berstatus 'belum'.
//
// Modul ini tidak melakukan request eksternal dan tidak menyimpan audio/transkrip.

import { h, clear } from '../dom.js';
import {
  DISCLAIMERS_SUARA,
  MESIN_SUARA,
  mesinAktif,
  normalisasiPengaturanSuara
} from '../suara/mesin.js';
import {
  createAdaptorSuara,
  kenaliSuara,
  suaraTersedia
} from '../suara/adaptor.js';
import {
  bacakan,
  hentikanBacaan,
  ttsTersedia
} from '../suara/tts.js';
import {
  PERTANYAAN_KONFIRMASI,
  buatSesiKonfirmasi,
  jawabKonfirmasi
} from '../logic/konfirmasiSuara.js';
import { LABEL_BELUM_DIPERIKSA } from '../logic/pemeriksaan.js';
import { buatPanelObat } from './isi-suara-obat.js';
import { buatPanelVital } from './isi-suara-vital.js';
import {
  buatPanelMinum,
  buatPanelJadwal
} from './isi-suara-minum.js';

const TOUCH_STYLE = Object.freeze({ minHeight: '48px', minWidth: '48px' });

const PESAN_ERROR_SUARA = {
  SUARA_TIDAK_TERSEDIA: 'Pengenalan suara tidak tersedia di perangkat ini. Gunakan isian biasa.',
  MIKROFON_DITOLAK: 'Izin mikrofon ditolak. Semua isian tetap dapat diisi dengan tombol dan keyboard.',
  SUARA_GAGAL: 'Suara tidak dapat diproses. Coba lagi atau gunakan isian biasa.',
  SUARA_TIMEOUT: 'Tidak ada suara yang terdengar. Tekan Mulai bicara lalu ucapkan lagi.',
  SUARA_KOSONG: 'Tidak ada ucapan yang dikenali. Coba lagi dengan suara lebih jelas.',
  MESIN_TIDAK_DIKENAL: 'Mesin suara tidak dikenali. Pilih mesin di Pengaturan Suara.',
  PERSETUJUAN_DIPERLUKAN: 'Mesin bawaan peramban memerlukan persetujuan eksplisit di Pengaturan Suara.',
  MODEL_TIDAK_TERSEDIA: 'Model suara offline belum tersedia. Jalankan vendor suara atau buka Pengaturan Suara.',
  TTS_TIDAK_TERSEDIA: 'Pembaca suara tidak tersedia. Bacaan ditampilkan sebagai teks; konfirmasi tetap wajib.'
};

const MODE_DEFINISI = [
  { mode: 'obat', label: 'Obat', tabId: 'suara-tab-obat', panelId: 'suara-panel-obat' },
  { mode: 'vital', label: 'Tanda vital', tabId: 'suara-tab-vital', panelId: 'suara-panel-vital' },
  { mode: 'minum', label: 'Sudah minum', tabId: 'suara-tab-minum', panelId: 'suara-panel-minum' },
  { mode: 'jadwal', label: 'Jadwal hari ini', tabId: 'suara-tab-jadwal', panelId: 'suara-panel-jadwal' }
];

function pesanErrorSuara(error) {
  if (!error) return PESAN_ERROR_SUARA.SUARA_GAGAL;
  const kode = typeof error.code === 'string' ? error.code : '';
  if (PESAN_ERROR_SUARA[kode]) return PESAN_ERROR_SUARA[kode];
  const pesan = typeof error.message === 'string' ? error.message.trim() : '';
  return pesan || PESAN_ERROR_SUARA.SUARA_GAGAL;
}

/**
 * Render layar Isi dengan Suara.
 *
 * @param {HTMLElement} root
 * @param {object} ctx
 * @returns {Function} cleanup
 */
export async function render(root, ctx) {
  let disposed = false;
  let activeMode = 'obat';
  let mendengarkan = false;
  let abortCtrl = null;
  let konfirmasiAktif = false;
  let konfirmasiCtrl = null;
  let adaptor = null;
  let adaptorMesin = null;
  let jawabanTombol = null;
  let tombolResolver = null;

  // ---------------------------------------------------------------------
  // Kerangka layar
  // ---------------------------------------------------------------------
  const screen = h('section', {
    id: 'screen-isi-suara',
    class: 'screen suara-isi'
  });

  const bantuanButton = h('button', {
    id: 'btn-suara-bantuan',
    type: 'button',
    class: 'button button--ghost',
    style: TOUCH_STYLE
  }, 'Bantuan suara');
  const pengaturanButton = h('button', {
    id: 'btn-suara-pengaturan',
    type: 'button',
    class: 'button button--ghost',
    style: TOUCH_STYLE
  }, 'Pengaturan suara');

  screen.appendChild(h('header', { class: 'screen-header' },
    h('h1', {}, 'Isi dengan Suara'),
    h('p', { class: 'muted' },
      'Isi obat, tanda vital, catat minum, atau dengarkan jadwal. '
      + 'Tidak ada yang disimpan tanpa konfirmasi eksplisit.'),
    h('div', { class: 'actions' }, bantuanButton, pengaturanButton)));

  const mesinEl = h('p', { id: 'suara-mesin-aktif', class: 'status-message' });
  screen.appendChild(mesinEl);

  const warningEl = h('p', { id: 'suara-warning', class: 'hint' },
    DISCLAIMERS_SUARA,
    ' Suara bukan verifikasi. Entri obat dari suara tetap berstatus ',
    h('strong', {}, LABEL_BELUM_DIPERIKSA),
    ' sampai diperiksa pendamping/apoteker.');
  screen.appendChild(warningEl);

  // ---------------------------------------------------------------------
  // Kontrol mikrofon
  // ---------------------------------------------------------------------
  const kontrolCard = h('section', { class: 'card stack' });
  const mendengarEl = h('p', { id: 'suara-mendengarkan', class: 'status-message' }, 'Tidak mendengarkan.');
  const transkripEl = h('p', {
    id: 'suara-transkrip',
    class: 'muted',
    style: { minHeight: '1.5em' }
  }, 'Belum ada ucapan.');
  const statusEl = h('p', { id: 'suara-status', class: 'status-message muted' }, 'Siap.');

  const mulaiButton = h('button', {
    id: 'btn-suara-mulai',
    type: 'button',
    class: 'button button--primary',
    style: { minHeight: '56px', minWidth: '48px', flex: '1 1 12rem' }
  }, 'Mulai bicara');
  const berhentiButton = h('button', {
    id: 'btn-suara-berhenti',
    type: 'button',
    class: 'button button--danger',
    style: TOUCH_STYLE,
    disabled: true
  }, 'Berhenti');
  const ulangiButton = h('button', {
    id: 'btn-suara-ulangi',
    type: 'button',
    class: 'button',
    style: TOUCH_STYLE
  }, 'Ulangi bicara');
  const batalButton = h('button', {
    id: 'btn-suara-batal',
    type: 'button',
    class: 'button button--ghost',
    style: TOUCH_STYLE
  }, 'Batal dan buang draf');

  const errorBox = h('p', {
    id: 'suara-error',
    class: 'error-text',
    role: 'alert',
    tabindex: '-1',
    hidden: true
  });

  kontrolCard.appendChild(mendengarEl);
  kontrolCard.appendChild(transkripEl);
  kontrolCard.appendChild(h('div', { class: 'actions' },
    mulaiButton, berhentiButton, ulangiButton, batalButton));
  kontrolCard.appendChild(statusEl);
  kontrolCard.appendChild(errorBox);
  screen.appendChild(kontrolCard);

  // ---------------------------------------------------------------------
  // Tab mode & panel
  // ---------------------------------------------------------------------
  const tablist = h('div', {
    id: 'suara-tabs',
    class: 'suara-tabs',
    role: 'tablist',
    'aria-label': 'Mode isi dengan suara'
  });
  const tabButtons = new Map();
  for (const definisi of MODE_DEFINISI) {
    const button = h('button', {
      id: definisi.tabId,
      type: 'button',
      role: 'tab',
      class: 'button',
      'aria-selected': definisi.mode === activeMode ? 'true' : 'false',
      'aria-controls': definisi.panelId,
      tabindex: definisi.mode === activeMode ? '0' : '-1',
      style: TOUCH_STYLE
    }, definisi.label);
    tabButtons.set(definisi.mode, button);
    tablist.appendChild(button);
  }
  screen.appendChild(tablist);

  const modeEl = h('p', { id: 'suara-mode', class: 'muted' }, 'Mode: Obat');
  screen.appendChild(modeEl);

  const panelContainer = h('div', { class: 'suara-panels' });
  screen.appendChild(panelContainer);

  // ---------------------------------------------------------------------
  // Hasil, ringkasan, dan konfirmasi
  // ---------------------------------------------------------------------
  const hasilCard = h('section', { id: 'suara-hasil', class: 'card stack' });
  const ringkasanEl = h('div', {
    id: 'suara-ringkasan',
    tabindex: '-1',
    class: 'stack',
    hidden: true
  });
  const pertanyaanEl = h('p', {
    id: 'suara-pertanyaan-konfirmasi',
    class: 'status-message',
    hidden: true
  });
  const pemeriksaanEl = h('p', { id: 'suara-pemeriksaan-status', class: 'hint', hidden: true });

  const yaButton = h('button', {
    id: 'btn-konfirmasi-ya',
    type: 'button',
    class: 'button button--primary',
    style: { minHeight: '56px', minWidth: '48px', flex: '1 1 10rem' },
    hidden: true
  }, 'Ya, benar');
  const tidakButton = h('button', {
    id: 'btn-konfirmasi-tidak',
    type: 'button',
    class: 'button button--danger',
    style: { minHeight: '56px', minWidth: '48px', flex: '1 1 10rem' },
    hidden: true
  }, 'Tidak');
  const siapButton = h('button', {
    id: 'btn-suara-siap',
    type: 'button',
    class: 'button button--primary',
    style: TOUCH_STYLE,
    disabled: true
  }, 'Bacakan ulang dan minta konfirmasi');

  hasilCard.appendChild(ringkasanEl);
  hasilCard.appendChild(pertanyaanEl);
  hasilCard.appendChild(pemeriksaanEl);
  hasilCard.appendChild(h('div', { class: 'actions' }, yaButton, tidakButton));
  hasilCard.appendChild(h('div', { class: 'actions' }, siapButton));
  screen.appendChild(hasilCard);

  const liveEl = h('div', {
    id: 'suara-live',
    class: 'sr-only',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true'
  });
  screen.appendChild(liveEl);

  root.appendChild(screen);

  // ---------------------------------------------------------------------
  // Panel mode
  // ---------------------------------------------------------------------
  const panelObat = buatPanelObat({ ctx });
  const panelVital = buatPanelVital({ ctx });
  const panelMinum = buatPanelMinum({
    ctx,
    mintaKonfirmasi: () => mulaiKonfirmasi('minum')
  });
  const panelJadwal = buatPanelJadwal({
    ctx,
    bacaTeks: (teks) => bacaTeksAman(teks),
    umumkan: (teks) => umumkan(teks)
  });

  const panels = {
    obat: panelObat,
    vital: panelVital,
    minum: panelMinum,
    jadwal: panelJadwal
  };

  for (const definisi of MODE_DEFINISI) {
    const panel = panels[definisi.mode];
    panel.element.hidden = definisi.mode !== activeMode;
    panelContainer.appendChild(panel.element);
  }

  // ---------------------------------------------------------------------
  // Utilitas status/fokus
  // ---------------------------------------------------------------------
  function umumkan(teks) {
    if (!teks || disposed) return;
    liveEl.textContent = '';
    liveEl.textContent = String(teks);
  }

  function aturStatus(teks) {
    if (disposed) return;
    statusEl.textContent = String(teks || '');
  }

  function tampilkanError(pesan, fokus = null) {
    if (disposed) return;
    errorBox.textContent = pesan ? String(pesan) : '';
    errorBox.hidden = !pesan;
    if (!pesan) return;
    umumkan(pesan);
    const target = fokus && typeof fokus.focus === 'function' ? fokus : errorBox;
    target.focus();
  }

  function bersihkanError() {
    errorBox.textContent = '';
    errorBox.hidden = true;
  }

  function setMendengarkan(aktif) {
    mendengarkan = Boolean(aktif);
    if (disposed) return;
    mendengarEl.textContent = mendengarkan ? 'Mendengarkan…' : 'Tidak mendengarkan.';
    perbaruiTombol();
  }

  function pergiKe(route) {
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

  bantuanButton.addEventListener('click', () => pergiKe('#/bantuan-suara'));
  pengaturanButton.addEventListener('click', () => pergiKe('#/suara/pengaturan'));

  // ---------------------------------------------------------------------
  // Mesin & adaptor
  // ---------------------------------------------------------------------
  function bacaSettings() {
    try {
      const stateData = ctx?.state?.getState?.();
      return stateData?.settings || {};
    } catch {
      return {};
    }
  }

  function kecepatanTts() {
    try {
      return normalisasiPengaturanSuara(bacaSettings()).suara.kecepatan;
    } catch {
      return 0.9;
    }
  }

  function perbaruiMesin() {
    const settings = bacaSettings();
    let mesin = 'offline';
    try {
      mesin = mesinAktif(settings);
    } catch {
      mesin = 'offline';
    }
    const meta = MESIN_SUARA[mesin] || MESIN_SUARA.offline;
    let teks = `Mesin aktif: ${meta.label}.`;
    let siap = false;
    try {
      siap = suaraTersedia(mesin, settings);
    } catch {
      siap = false;
    }
    if (!siap) {
      teks += mesin === 'offline'
        ? ' Model suara offline belum siap di perangkat ini; buka Pengaturan Suara atau gunakan isian biasa.'
        : ' Mesin ini belum siap; buka Pengaturan Suara.';
    }
    try {
      if (!ttsTersedia()) {
        teks += ' Pembaca suara tidak tersedia; semua bacaan ditampilkan sebagai teks.';
      }
    } catch {
      // Status TTS opsional.
    }
    clear(mesinEl);
    mesinEl.appendChild(document.createTextNode(teks));
    if (!siap) {
      const bukaPengaturan = h('button', {
        id: 'btn-suara-mesin-pengaturan',
        type: 'button',
        class: 'button button--ghost',
        style: TOUCH_STYLE
      }, 'Buka Pengaturan Suara');
      bukaPengaturan.addEventListener('click', () => pergiKe('#/suara/pengaturan'));
      mesinEl.appendChild(document.createTextNode(' '));
      mesinEl.appendChild(bukaPengaturan);
    }
  }

  function ambilAdaptor() {
    const settings = bacaSettings();
    const mesin = mesinAktif(settings);
    if (!adaptor || adaptorMesin !== mesin) {
      const lama = adaptor;
      adaptor = null;
      adaptorMesin = null;
      if (lama && typeof lama.terminate === 'function') {
        Promise.resolve(lama.terminate()).catch(() => {});
      }
      adaptor = createAdaptorSuara({ mesin, settings, bahasa: 'id-ID' });
      adaptorMesin = mesin;
    }
    return adaptor;
  }

  async function hentikanMikrofon() {
    if (abortCtrl) {
      abortCtrl.abort();
      abortCtrl = null;
    }
    try {
      if (adaptor && typeof adaptor.berhenti === 'function') await adaptor.berhenti();
    } catch {
      // Penghentian mikrofon tidak boleh menggagalkan alur.
    }
    setMendengarkan(false);
  }

  // ---------------------------------------------------------------------
  // Tab
  // ---------------------------------------------------------------------
  function perbaruiTombol() {
    // Mode obat memakai konfirmasi di layar tanya (#/suara/tanya); layar ini
    // hanya mengonfirmasi vital/minum agar tidak terjadi konfirmasi ganda.
    const bisaKonfirmasi = activeMode === 'vital' || activeMode === 'minum';
    siapButton.hidden = !bisaKonfirmasi;
    if (bisaKonfirmasi) {
      let boleh = false;
      try {
        boleh = panels[activeMode].bolehKonfirmasi();
      } catch {
        boleh = false;
      }
      siapButton.disabled = konfirmasiAktif || mendengarkan || !boleh;
    } else {
      siapButton.disabled = true;
    }

    const modeObat = activeMode === 'obat';
    mulaiButton.textContent = activeMode === 'jadwal'
      ? 'Bacakan jadwal hari ini'
      : 'Mulai bicara';
    // Mode obat tidak memakai dikte bebas. `aria-disabled` dipakai agar tombol
    // tetap dapat difokus keyboard/pembaca layar dan menjelaskan alasannya.
    mulaiButton.setAttribute('aria-disabled', modeObat ? 'true' : 'false');
    mulaiButton.disabled = !modeObat && (konfirmasiAktif || mendengarkan);
    ulangiButton.disabled = konfirmasiAktif || mendengarkan || modeObat;
    berhentiButton.disabled = !mendengarkan;
  }

  function setMode(mode, { fokus = false, announce = true } = {}) {
    if (!panels[mode] || mode === activeMode) {
      perbaruiTombol();
      return;
    }
    if (konfirmasiAktif) {
      batalkanAlur({
        bersihkanDraf: false,
        fokus: false,
        pesan: 'Konfirmasi dibatalkan karena berpindah mode.'
      });
      // Ringkasan mode lama tidak boleh tampak di mode baru.
      ringkasanEl.textContent = '';
      ringkasanEl.hidden = true;
      pemeriksaanEl.hidden = true;
    } else if (mendengarkan) {
      hentikanMikrofon();
    }

    activeMode = mode;
    for (const definisi of MODE_DEFINISI) {
      const button = tabButtons.get(definisi.mode);
      const dipilih = definisi.mode === mode;
      button.setAttribute('aria-selected', dipilih ? 'true' : 'false');
      button.tabIndex = dipilih ? 0 : -1;
      panels[definisi.mode].element.hidden = !dipilih;
    }

    const label = MODE_DEFINISI.find((item) => item.mode === mode)?.label || mode;
    modeEl.textContent = `Mode: ${label}`;
    if (mode === 'minum' || mode === 'jadwal') {
      try {
        panels[mode].muatUlang?.();
      } catch {
        // Daftar kosong ditangani panel.
      }
    }
    perbaruiTombol();
    if (announce) umumkan(`Mode ${label}.`);
    if (fokus) panels[mode].fokusPertama?.();
  }

  for (const definisi of MODE_DEFINISI) {
    tabButtons.get(definisi.mode).addEventListener('click', () => setMode(definisi.mode));
  }

  tablist.addEventListener('keydown', (event) => {
    const urutan = MODE_DEFINISI.map((item) => item.mode);
    const index = urutan.indexOf(activeMode);
    let target = null;
    if (event.key === 'ArrowRight') target = urutan[(index + 1) % urutan.length];
    else if (event.key === 'ArrowLeft') target = urutan[(index - 1 + urutan.length) % urutan.length];
    else if (event.key === 'Home') target = urutan[0];
    else if (event.key === 'End') target = urutan[urutan.length - 1];
    if (!target) return;
    event.preventDefault();
    setMode(target, { fokus: true });
    tabButtons.get(target).focus();
  });

  panelContainer.addEventListener('input', () => perbaruiTombol());
  panelContainer.addEventListener('change', () => perbaruiTombol());

  // ---------------------------------------------------------------------
  // Pendengaran satu ucapan
  // ---------------------------------------------------------------------
  function terapkanHasil(teks) {
    // Sabuk pengaman: mode obat tidak pernah memakai hasil ASR bebas.
    if (activeMode === 'obat') {
      tampilkanError('Mode obat memakai layar tanya satu per satu, bukan dikte bebas.');
      return;
    }
    const panel = panels[activeMode];
    let hasil;
    try {
      hasil = panel.dariDikte(teks);
    } catch (error) {
      tampilkanError(error?.message || 'Ucapan tidak dapat diurai.');
      return;
    }

    if (!hasil || !hasil.ok) {
      ringkasanEl.hidden = true;
      ringkasanEl.textContent = '';
      pemeriksaanEl.hidden = true;
      tampilkanError(hasil?.pesan || 'Ucapan belum dikenali.', hasil?.fokus || null);
      perbaruiTombol();
      return;
    }

    bersihkanError();
    ringkasanEl.textContent = hasil.ringkas || 'Draf siap diperiksa.';
    ringkasanEl.hidden = false;
    pertanyaanEl.hidden = true;
    yaButton.hidden = true;
    tidakButton.hidden = true;

    let status = null;
    try {
      status = panel.statusPemeriksaan?.();
    } catch {
      status = null;
    }
    if (status) {
      pemeriksaanEl.textContent = `Status pemeriksaan: ${status}. Suara bukan verifikasi.`;
      pemeriksaanEl.hidden = false;
    } else if (activeMode === 'obat') {
      pemeriksaanEl.textContent = `Status pemeriksaan: ${LABEL_BELUM_DIPERIKSA}. Suara bukan verifikasi.`;
      pemeriksaanEl.hidden = false;
    } else {
      pemeriksaanEl.hidden = true;
    }

    const fokus = hasil.fokus && typeof hasil.fokus.focus === 'function'
      ? hasil.fokus
      : ringkasanEl;
    fokus.focus();
    const statusTeks = status ? ` Status: ${status}.` : '';
    umumkan(`${hasil.ringkas || 'Draf siap diperiksa.'}${statusTeks} `
      + 'Periksa isian, lalu tekan Bacakan ulang dan minta konfirmasi.');
    aturStatus('Draf siap. Sunting bila perlu, lalu minta konfirmasi.');
    perbaruiTombol();
  }

  async function mulaiMendengar() {
    if (disposed || mendengarkan || konfirmasiAktif) return;
    if (activeMode === 'obat') {
      const pesan = 'Mode obat memakai layar tanya satu per satu. Tekan "Mulai tanya obat".';
      aturStatus(pesan);
      umumkan(pesan);
      return;
    }
    bersihkanError();

    if (activeMode === 'jadwal') {
      try {
        aturStatus('Membacakan jadwal hari ini…');
        await panelJadwal.bacakanJadwal();
        aturStatus('Jadwal dibacakan. Tidak ada yang disimpan.');
      } catch (error) {
        tampilkanError(error?.message || 'Jadwal tidak dapat dibacakan.');
      }
      return;
    }

    const settings = bacaSettings();
    const mesin = mesinAktif(settings);

    const controller = new AbortController();
    abortCtrl = controller;
    setMendengarkan(true);
    aturStatus('Mendengarkan… Ucapkan sekarang.');
    umumkan('Mendengarkan. Ucapkan sekarang.');

    try {
      // `kenaliSuara` membuat adaptor, meminta mikrofon, mengenali, lalu
      // menghentikan & melepas mesin di finally-nya sendiri.
      const hasil = await kenaliSuara({
        mesin,
        settings,
        signal: controller.signal,
        timeoutMs: 25000,
        onStatus: (info) => {
          if (disposed || !mendengarkan) return;
          if (info?.status === 'mendengarkan') {
            aturStatus('Mendengarkan… Ucapkan sekarang.');
          }
        }
      });
      if (disposed) return;

      const teks = String(hasil?.teks || '').trim();
      transkripEl.textContent = teks || 'Tidak ada ucapan yang dikenali.';
      umumkan(`Terdengar: ${teks || 'tidak ada ucapan'}`);
      if (!teks) {
        tampilkanError(PESAN_ERROR_SUARA.SUARA_KOSONG);
        return;
      }
      terapkanHasil(teks);
    } catch (error) {
      if (disposed) return;
      if (controller.signal.aborted) {
        aturStatus('Pendengaran dihentikan.');
        umumkan('Pendengaran dihentikan.');
      } else {
        tampilkanError(pesanErrorSuara(error));
      }
    } finally {
      if (!disposed) {
        if (abortCtrl === controller) abortCtrl = null;
        setMendengarkan(false);
      }
    }
  }

  async function berhentiMendengar() {
    await hentikanMikrofon();
    aturStatus('Pendengaran dihentikan.');
    umumkan('Pendengaran dihentikan.');
    perbaruiTombol();
  }

  async function bacaTeksAman(teks) {
    try {
      if (adaptor && typeof adaptor.berhenti === 'function') await adaptor.berhenti();
    } catch {
      // abaikan
    }
    setMendengarkan(false);
    try {
      await bacakan(teks, { rate: kecepatanTts() });
      return true;
    } catch (error) {
      if (error?.code === 'TTS_TIDAK_TERSEDIA') {
        aturStatus('Pembaca suara tidak tersedia; bacaan ditampilkan sebagai teks.');
        umumkan(`${teks} Pembaca suara tidak tersedia; bacaan ditampilkan sebagai teks.`);
      } else {
        tampilkanError(pesanErrorSuara(error));
      }
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // Konfirmasi wajib (ya/tidak/lain)
  // ---------------------------------------------------------------------
  function tekanKonfirmasi(teks) {
    if (!konfirmasiAktif) return;
    jawabanTombol = teks;
    hentikanBacaan();
    umumkan(teks === 'ya' ? 'Ya, benar.' : 'Tidak.');
    if (tombolResolver) {
      const resolve = tombolResolver;
      tombolResolver = null;
      resolve(teks);
    }
  }

  yaButton.addEventListener('click', () => tekanKonfirmasi('ya'));
  tidakButton.addEventListener('click', () => tekanKonfirmasi('tidak'));

  async function dengarkanJawaban(signal) {
    if (jawabanTombol !== null) {
      const teks = jawabanTombol;
      jawabanTombol = null;
      return teks;
    }

    const tombolPromise = new Promise((resolve) => {
      tombolResolver = resolve;
    });

    if (!adaptor) return tombolPromise;

    try {
      await adaptor.mulai();
    } catch {
      aturStatus('Mikrofon tidak aktif. Gunakan tombol Ya, benar atau Tidak.');
      umumkan('Mikrofon tidak aktif. Tekan tombol Ya, benar atau Tidak.');
      return tombolPromise;
    }

    if (signal?.aborted) return '';

    let timer = null;
    const batasPromise = new Promise((resolve) => {
      timer = setTimeout(() => resolve({ timeout: true }), 15000);
    });
    const suaraPromise = adaptor.kenali({ signal })
      .then((hasil) => ({ teks: String(hasil?.teks || '') }))
      .catch((error) => ({ error }));

    const hasil = await Promise.race([
      suaraPromise,
      tombolPromise.then((teks) => ({ teks })),
      batasPromise
    ]);
    if (timer) clearTimeout(timer);
    tombolResolver = null;

    if (signal?.aborted) return '';
    if (hasil && typeof hasil.teks === 'string') return hasil.teks;
    if (hasil && hasil.timeout) {
      aturStatus('Tidak ada jawaban suara. Pertanyaan diulang.');
      return '';
    }
    if (hasil && hasil.error) {
      if (signal?.aborted) return '';
      const kode = hasil.error?.code;
      if (kode === 'SUARA_KOSONG' || kode === 'SUARA_TIMEOUT') {
        // Tidak ada jawaban = 'lain'; mesin konfirmasi akan mengulang maks. 2x.
        aturStatus('Tidak ada jawaban yang terdengar. Pertanyaan diulang.');
        return '';
      }
      aturStatus('Jawaban suara tidak terdengar. Gunakan tombol Ya, benar atau Tidak.');
      umumkan('Jawaban suara tidak terdengar. Tekan tombol Ya, benar atau Tidak.');
      // Resolver lama sudah dilepas setelah balapan; daftarkan penunggu baru
      // agar tombol Ya/Tidak tetap dapat menyelesaikan konfirmasi.
      return new Promise((resolve) => {
        tombolResolver = resolve;
      });
    }
    return '';
  }

  async function mulaiKonfirmasi(mode) {
    if (disposed || konfirmasiAktif) return;
    if (mode !== activeMode) setMode(mode);
    const panel = panels[mode];
    const siap = panel.siapKonfirmasi();
    if (!siap.ok) {
      tampilkanError(siap.pesan, siap.fokus || null);
      perbaruiTombol();
      return;
    }

    bersihkanError();
    await hentikanMikrofon();
    // Siapkan pendengar jawaban suara; bila mesin tidak tersedia, konfirmasi
    // tetap berjalan lewat tombol besar "Ya, benar" / "Tidak".
    try {
      ambilAdaptor();
    } catch {
      // Mikrofon tidak wajib untuk konfirmasi.
    }
    konfirmasiAktif = true;
    konfirmasiCtrl = new AbortController();
    jawabanTombol = null;
    tombolResolver = null;

    ringkasanEl.hidden = false;
    ringkasanEl.textContent = siap.ringkasan;
    pertanyaanEl.hidden = false;
    pertanyaanEl.textContent = PERTANYAAN_KONFIRMASI;
    yaButton.hidden = false;
    tidakButton.hidden = false;
    perbaruiTombol();
    ringkasanEl.focus();
    umumkan(`${siap.ringkasan} ${PERTANYAAN_KONFIRMASI}`);

    let sesi = buatSesiKonfirmasi({ ringkasan: siap.ringkasan });
    let tersimpan = false;

    try {
      for (;;) {
        if (!konfirmasiAktif || disposed) return;

        // Wajib: hentikan mikrofon sebelum aplikasi berbicara.
        try {
          if (adaptor && typeof adaptor.berhenti === 'function') await adaptor.berhenti();
        } catch {
          // abaikan
        }
        aturStatus('Membacakan ulang seluruh isian…');

        try {
          await bacakan(
            `${siap.ringkasan} ${PERTANYAAN_KONFIRMASI}`,
            { signal: konfirmasiCtrl.signal, rate: kecepatanTts() }
          );
        } catch (error) {
          if (error?.code === 'TTS_TIDAK_TERSEDIA') {
            aturStatus('Pembaca suara tidak tersedia. Bacaan ditampilkan sebagai teks; konfirmasi tetap wajib.');
          }
          // Error TTS lain tidak menggagalkan konfirmasi; tombol tetap wajib.
        }

        if (!konfirmasiAktif || disposed) return;
        aturStatus('Menunggu jawaban: ucapkan ya/benar atau tidak, atau tekan tombol.');
        const jawaban = await dengarkanJawaban(konfirmasiCtrl.signal);
        // Jawaban tombol yang dipakai lewat jalur "menunggu resolusi" tidak
        // boleh terbawa ke pertanyaan berikutnya.
        jawabanTombol = null;
        if (!konfirmasiAktif || disposed) return;

        const hasil = jawabKonfirmasi(sesi, jawaban == null ? '' : jawaban);
        sesi = hasil.sesi;

        if (hasil.aksi === 'simpan') {
          try {
            if (adaptor && typeof adaptor.berhenti === 'function') await adaptor.berhenti();
          } catch {
            // abaikan
          }
          const saved = await panel.simpan(siap.draf);
          let status = null;
          try {
            status = panel.statusPemeriksaan?.();
          } catch {
            status = null;
          }
          if (!status && mode === 'obat') status = LABEL_BELUM_DIPERIKSA;
          const pesanSukses = panel.pesanSukses?.(saved) || 'Data sudah dicatat.';
          const pesanAkhir = `${pesanSukses}`
            + `${status ? ` Status: ${status}.` : ''} Suara bukan verifikasi.`;
          panel.bersihkan();
          ringkasanEl.textContent = pesanAkhir;
          ringkasanEl.hidden = false;
          pemeriksaanEl.textContent = status
            ? `Status pemeriksaan: ${status}.`
            : LABEL_BELUM_DIPERIKSA;
          pemeriksaanEl.hidden = false;
          aturStatus('Tersimpan setelah konfirmasi eksplisit.');
          umumkan(pesanAkhir);
          try {
            ctx?.toast?.(pesanAkhir, 'success');
          } catch {
            // abaikan
          }
          tersimpan = true;
          break;
        }

        if (hasil.aksi === 'ulangi-entri') {
          const pesan = 'Tidak disimpan. Silakan ulangi pengisian.';
          ringkasanEl.textContent = pesan;
          ringkasanEl.hidden = false;
          transkripEl.textContent = 'Belum ada ucapan.';
          panel.bersihkan();
          aturStatus(pesan);
          umumkan(pesan);
          panel.fokusPertama?.();
          break;
        }

        if (hasil.aksi === 'batal') {
          const pesan = 'Dibatalkan tanpa menyimpan karena tidak ada jawaban yang jelas.';
          ringkasanEl.textContent = pesan;
          ringkasanEl.hidden = false;
          panel.bersihkan();
          aturStatus(pesan);
          umumkan(pesan);
          ringkasanEl.focus();
          break;
        }

        // 'tanya-ulang' — pertanyaan dibacakan lagi pada iterasi berikutnya.
        pertanyaanEl.textContent = PERTANYAAN_KONFIRMASI;
        umumkan(hasil.ucapan || PERTANYAAN_KONFIRMASI);
      }
    } catch (error) {
      tampilkanError(error?.message || 'Gagal menyimpan setelah konfirmasi.');
      aturStatus('Tidak tersimpan karena terjadi kesalahan.');
    } finally {
      konfirmasiAktif = false;
      konfirmasiCtrl = null;
      jawabanTombol = null;
      tombolResolver = null;
      yaButton.hidden = true;
      tidakButton.hidden = true;
      pertanyaanEl.hidden = true;
      perbaruiTombol();
      if (!disposed && tersimpan) ringkasanEl.focus();
    }
  }

  function batalkanAlur({
    bersihkanDraf = true,
    fokus = true,
    pesan = 'Draf dibuang. Tidak ada yang disimpan.'
  } = {}) {
    konfirmasiAktif = false;
    if (konfirmasiCtrl) {
      konfirmasiCtrl.abort();
      konfirmasiCtrl = null;
    }
    if (tombolResolver) {
      const resolve = tombolResolver;
      tombolResolver = null;
      resolve('');
    }
    jawabanTombol = null;
    hentikanBacaan();
    hentikanMikrofon();
    bersihkanError();

    yaButton.hidden = true;
    tidakButton.hidden = true;
    pertanyaanEl.hidden = true;
    pemeriksaanEl.hidden = true;

    if (bersihkanDraf) {
      for (const panel of Object.values(panels)) {
        try {
          panel.bersihkan?.();
        } catch {
          // abaikan
        }
      }
      transkripEl.textContent = 'Belum ada ucapan.';
      ringkasanEl.textContent = '';
      ringkasanEl.hidden = true;
    }

    perbaruiTombol();
    aturStatus(pesan);
    umumkan(pesan);
    if (fokus && !disposed) mulaiButton.focus();
  }

  siapButton.addEventListener('click', () => mulaiKonfirmasi(activeMode));
  mulaiButton.addEventListener('click', () => { mulaiMendengar(); });
  berhentiButton.addEventListener('click', () => { berhentiMendengar(); });
  ulangiButton.addEventListener('click', () => {
    if (konfirmasiAktif) {
      hentikanBacaan();
      umumkan(PERTANYAAN_KONFIRMASI);
      pertanyaanEl.hidden = false;
      pertanyaanEl.textContent = PERTANYAAN_KONFIRMASI;
      ringkasanEl.focus();
      return;
    }
    mulaiMendengar();
  });
  batalButton.addEventListener('click', () => batalkanAlur());

  // ---------------------------------------------------------------------
  // Inisialisasi
  // ---------------------------------------------------------------------
  perbaruiMesin();
  setMode('obat', { announce: false });
  perbaruiTombol();

  // ---------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------
  return () => {
    disposed = true;
    konfirmasiAktif = false;
    if (konfirmasiCtrl) konfirmasiCtrl.abort();
    if (abortCtrl) abortCtrl.abort();
    if (tombolResolver) {
      const resolve = tombolResolver;
      tombolResolver = null;
      resolve('');
    }
    jawabanTombol = null;
    hentikanBacaan();
    const mesin = adaptor;
    adaptor = null;
    if (mesin) {
      try {
        if (typeof mesin.berhenti === 'function') Promise.resolve(mesin.berhenti()).catch(() => {});
      } catch {
        // abaikan
      }
      try {
        if (typeof mesin.terminate === 'function') Promise.resolve(mesin.terminate()).catch(() => {});
      } catch {
        // abaikan
      }
    }
  };
}
