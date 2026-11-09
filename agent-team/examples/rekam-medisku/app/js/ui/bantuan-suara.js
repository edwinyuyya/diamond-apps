// Rekam Medisku — layar Bantuan Suara (t26, CONTRACT.md 8B.8 & 9.4.12).
//
// Menampilkan daftar perintah navigasi/pengisian, membacakannya lewat TTS
// (speechSynthesis id-ID), dan mengumumkan setiap aksi lewat live region.
// Tidak menyimpan data, tidak memakai mikrofon, dan tidak melakukan request
// jaringan. Bila TTS tidak tersedia, daftar teks tetap tampil dan pengguna
// diberi tahu bahwa daftar tetap dapat dibaca.

import { h } from '../dom.js';
import { daftarBantuan, teksBantuan } from '../logic/perintahNavigasi.js';
import { DISCLAIMERS_SUARA } from '../suara/mesin.js';
import { bacakan, hentikanBacaan, ttsTersedia } from '../suara/tts.js';
import { fokuskan, umumkan } from '../a11y.js';

/** Peringatan tetap sesuai 9.4.12; tidak pernah diganti seluruhnya. */
const PERINGATAN_NAVIGASI =
  'Perintah suara hanya navigasi dan pengisian; aplikasi tidak menjawab pertanyaan medis.';

const PESAN_TTS_TIDAK_ADA =
  'Pembaca suara tidak tersedia; daftar perintah tetap dapat dibaca.';

const PESAN_BANTUAN_SELESAI =
  'Bantuan selesai dibacakan. Daftar perintah tetap tampil di layar.';

function teksDasarPeringatan() {
  return `${DISCLAIMERS_SUARA} ${PERINGATAN_NAVIGASI}`;
}

function pergiKeRoute(route) {
  if (typeof location !== 'undefined' && typeof location.assign === 'function') {
    location.hash = route;
    return;
  }
  if (typeof location !== 'undefined') location.hash = route;
}

/**
 * Render layar Bantuan Suara.
 *
 * @param {HTMLElement} root #app-view yang sudah dikosongkan router
 * @param {{navigate?:Function}} [ctx]
 * @returns {Function} cleanup
 */
export async function render(root, ctx = {}) {
  if (!root || typeof root.appendChild !== 'function') return () => {};

  let disposed = false;
  let berbicara = false;
  let abortCtrl = null;

  const screen = h('section', {
    id: 'screen-bantuan-suara',
    class: 'screen bantuan-suara',
    'aria-labelledby': 'bantuan-suara-judul'
  });

  screen.appendChild(h('header', { class: 'screen-header' },
    h('h1', { id: 'bantuan-suara-judul', tabindex: '-1' }, 'Bantuan Suara'),
    h('p', { class: 'muted' },
      'Ucapkan salah satu perintah di bawah. Perintah suara hanya membuka layar '
      + 'atau mengisi data; aplikasi tidak menjawab pertanyaan medis. '
      + 'Semua fitur tetap dapat dipakai dengan tombol dan keyboard.')));

  // -------------------------------------------------------------------
  // Peringatan tetap (disclaimer + batas perintah)
  // -------------------------------------------------------------------
  const warningEl = h('p', {
    id: 'bantuan-suara-warning',
    class: 'voice-warning warning-box',
    tabindex: '-1'
  }, teksDasarPeringatan());
  screen.appendChild(warningEl);

  // -------------------------------------------------------------------
  // Daftar perintah — setiap baris dapat difokus keyboard
  // -------------------------------------------------------------------
  const daftarEl = h('ul', {
    id: 'bantuan-suara-daftar',
    class: 'voice-help-list',
    'aria-label': 'Daftar perintah suara'
  });
  for (const baris of daftarBantuan()) {
    daftarEl.appendChild(h('li', { tabindex: '0', class: 'voice-help-item' }, baris));
  }
  screen.appendChild(daftarEl);

  // -------------------------------------------------------------------
  // Live region khusus layar
  // -------------------------------------------------------------------
  const liveEl = h('p', {
    id: 'bantuan-suara-live',
    class: 'voice-live sr-only',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true'
  });
  screen.appendChild(liveEl);

  function umumkanLayar(pesan, politeness = 'polite') {
    if (disposed) return;
    umumkan(pesan, { politeness, region: liveEl });
  }

  function tampilkanCatatanTts() {
    warningEl.textContent = `${teksDasarPeringatan()} ${PESAN_TTS_TIDAK_ADA}`;
    warningEl.classList.add('voice-warning--fallback');
  }

  // -------------------------------------------------------------------
  // Aksi: bacakan bantuan
  // -------------------------------------------------------------------
  const bacakanButton = h('button', {
    id: 'btn-bacakan-bantuan',
    type: 'button',
    class: 'button button--primary voice-big-button',
    'aria-describedby': 'bantuan-suara-warning'
  }, 'Bacakan bantuan');

  bacakanButton.addEventListener('click', () => {
    if (disposed) return;
    if (berbicara) {
      hentikanBacaan();
      umumkanLayar('Bacaan bantuan dihentikan.');
      return;
    }
    void bacakanBantuan();
  });

  async function bacakanBantuan() {
    if (disposed) return;

    if (!ttsTersedia()) {
      tampilkanCatatanTts();
      umumkanLayar(PESAN_TTS_TIDAK_ADA);
      fokuskan(warningEl);
      return;
    }

    berbicara = true;
    bacakanButton.setAttribute('aria-busy', 'true');
    abortCtrl = typeof AbortController === 'function' ? new AbortController() : null;
    umumkanLayar('Membacakan daftar bantuan.');

    try {
      const hasil = await bacakan(teksBantuan(), {
        signal: abortCtrl ? abortCtrl.signal : null
      });
      if (disposed) return;
      if (hasil && hasil.dibatalkan) umumkanLayar('Bacaan bantuan dihentikan.');
      else umumkanLayar(PESAN_BANTUAN_SELESAI);
    } catch (error) {
      if (disposed) return;
      const kode = error && typeof error.code === 'string' ? error.code : '';
      if (kode === 'TTS_TIDAK_TERSEDIA') {
        tampilkanCatatanTts();
        umumkanLayar(PESAN_TTS_TIDAK_ADA, 'assertive');
        fokuskan(warningEl);
      } else {
        umumkanLayar('Bantuan gagal dibacakan. Daftar perintah tetap dapat dibaca.', 'assertive');
      }
    } finally {
      berbicara = false;
      bacakanButton.removeAttribute('aria-busy');
    }
  }

  // -------------------------------------------------------------------
  // Aksi: kembali
  // -------------------------------------------------------------------
  const kembaliButton = h('button', {
    id: 'bantuan-kembali',
    type: 'button',
    class: 'button voice-big-button'
  }, 'Kembali');

  kembaliButton.addEventListener('click', () => {
    if (disposed) return;
    umumkanLayar('Kembali.');
    hentikanBacaan();
    const adaRiwayat = typeof history !== 'undefined'
      && typeof history.back === 'function'
      && Number(history.length) > 1;
    if (adaRiwayat) {
      history.back();
      return;
    }
    if (ctx && typeof ctx.navigate === 'function') ctx.navigate('#/suara');
    else pergiKeRoute('#/suara');
  });

  screen.appendChild(h('div', { class: 'voice-actions' }, bacakanButton, kembaliButton));

  const catatanKaki = h('p', { class: 'muted small' },
    'Tidak ada mikrofon yang dinyalakan di layar ini. Pembaca suara hanya membacakan '
    + 'daftar perintah; tidak ada data yang dikirim ke luar perangkat.');
  screen.appendChild(catatanKaki);

  root.appendChild(screen);

  // Router sudah memindahkan fokus ke #app-view; arahkan ke judul layar agar
  // pembaca layar mulai dari konteks yang benar.
  fokuskan(screen.querySelector('#bantuan-suara-judul'), { preventScroll: true });

  return () => {
    disposed = true;
    hentikanBacaan();
    if (abortCtrl) {
      try {
        abortCtrl.abort();
      } catch {
        // AbortController opsional.
      }
      abortCtrl = null;
    }
    bacakanButton.removeAttribute('aria-busy');
  };
}

export default { render };
