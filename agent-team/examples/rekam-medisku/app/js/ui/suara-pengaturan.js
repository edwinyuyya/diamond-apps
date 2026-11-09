// Rekam Medisku — layar Pengaturan Suara (t18).
//
// Memilih mesin suara, menampilkan peringatan pihak ketiga secara permanen, dan
// mencatat/mencabut persetujuan Web Speech secara eksplisit. Pemilihan radio
// TIDAK pernah menjadi persetujuan implisit: audio pihak ketiga hanya aktif
// lewat checkbox peringatan + tombol Setujui.
//
// Modul ini tidak melakukan request eksternal. Modul persetujuan (t19) dan TTS
// (t21) dimuat malas; bila belum tersedia, layar memakai jalur kontrak yang aman.

import { h, clear } from '../dom.js';
import {
  MESIN_SUARA,
  DISCLAIMERS_SUARA,
  PERINGATAN_WEB_SPEECH,
  WEB_SPEECH_CONSENT_VERSION,
  normalisasiPengaturanSuara,
  mesinAktif,
  webSpeechApiTersedia,
  statusPersetujuan
} from '../suara/mesin.js';
import {
  STATUS_MODEL,
  muatModel,
  statusModel
} from '../suara/whisperEngine.js';

const SAMPLE_TTS =
  'Contoh bacaan. Catat tekanan darah seratus dua puluh per delapan puluh. ' +
  'Periksa kembali angka sebelum menyimpan.';

const PESAN_MODEL = Object.freeze({
  siap: 'Model offline siap (Whisper base, ± 80 MB).',
  belum: 'Model offline belum lengkap.',
  'tidak-ada': 'Model offline belum tersedia.'
});

const PERINGATAN_MODEL =
  'Pengenalan offline memakai Whisper base. Akurasinya terbatas untuk nama dan '
  + 'dosis obat berbahasa Indonesia, dan lebih lambat daripada peramban. '
  + 'Gunakan alur tanya, pilihan tertutup, dan periksa ulang bacaan.';

const PERINGATAN_MODEL_RINGKAS =
  'Whisper base lebih lambat dan kurang akurat untuk dikte obat.';

const CARA_VENDOR =
  'Pasang model secara lokal dengan perintah npm run vendor:whisper. '
  + 'Aplikasi tidak mengunduh model saat runtime; berkas dilayani same-origin dari /vendor/suara/.';

function formatMB(bytes) {
  const nilai = Number(bytes);
  if (!Number.isFinite(nilai) || nilai <= 0) return '± 80 MB';
  const mb = nilai / (1024 * 1024);
  return mb >= 100 ? `± ${Math.round(mb)} MB` : `± ${mb.toFixed(1)} MB`;
}

const TOUCH_STYLE = Object.freeze({ minHeight: '48px', minWidth: '48px' });

function touch(props = {}) {
  return {
    ...props,
    style: { ...(props.style || {}), minHeight: '48px', minWidth: '48px' }
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatWaktu(iso) {
  if (!iso || typeof iso !== 'string') return 'waktu tidak tercatat';
  const waktu = new Date(iso);
  if (Number.isNaN(waktu.getTime())) return 'waktu tidak tercatat';
  try {
    return waktu.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

/** Ubah hasil fungsi persetujuan (settings / settings.suara) menjadi suara. */
function suaraDariHasil(hasil, fallback = null) {
  if (isPlainObject(hasil)) {
    if (isPlainObject(hasil.suara)) return normalisasiPengaturanSuara(hasil).suara;
    if (
      Object.prototype.hasOwnProperty.call(hasil, 'mesin')
      || Object.prototype.hasOwnProperty.call(hasil, 'tts')
      || Object.prototype.hasOwnProperty.call(hasil, 'webSpeechPersetujuan')
    ) {
      return normalisasiPengaturanSuara({ suara: hasil }).suara;
    }
  }
  return fallback;
}

/**
 * Render layar Pengaturan Suara.
 * @param {HTMLElement} root
 * @param {object} ctx
 */
export async function render(root, ctx) {
  clear(root);

  let disposed = false;
  let suara = bacaSuara();
  const webTersedia = webSpeechApiTersedia();

  function bacaSuara() {
    let settings = {};
    try {
      settings = ctx?.state?.getState()?.settings || {};
    } catch {
      settings = {};
    }
    return normalisasiPengaturanSuara(settings).suara;
  }

  // ---------------------------------------------------------------------
  // Kerangka layar
  // ---------------------------------------------------------------------
  const screen = h('section', {
    id: 'screen-suara-pengaturan',
    class: 'screen suara-pengaturan'
  });

  screen.appendChild(h('header', { class: 'screen-header' },
    h('h1', {}, 'Pengaturan Suara'),
    h('p', { class: 'muted' },
      'Suara hanya membantu mengisi draf. Tidak ada yang disimpan tanpa konfirmasi eksplisit.')));

  const errorBox = h('p', {
    id: 'suara-pengaturan-error',
    class: 'error-text',
    role: 'alert',
    tabindex: '-1',
    hidden: true
  });
  const statusBox = h('p', {
    id: 'suara-pengaturan-status',
    class: 'status-message muted'
  });
  const live = h('div', {
    id: 'suara-pengaturan-live',
    class: 'sr-only',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true'
  });

  screen.appendChild(errorBox);
  screen.appendChild(statusBox);
  screen.appendChild(live);
  screen.appendChild(h('p', { class: 'hint' }, DISCLAIMERS_SUARA));

  function umumkan(pesan) {
    if (disposed) return;
    live.textContent = pesan == null ? '' : String(pesan);
  }

  function aturStatus(pesan, tone = 'info') {
    if (disposed) return;
    statusBox.textContent = pesan || '';
    statusBox.className = `status-message ${tone === 'error' ? 'error-text' : tone === 'success' ? 'success-text' : 'muted'}`;
    if (pesan) umumkan(pesan);
  }

  function tampilkanError(pesan) {
    if (disposed) return;
    errorBox.textContent = pesan || '';
    errorBox.hidden = !pesan;
    if (pesan) {
      try {
        errorBox.focus();
      } catch {
        // Fokus tidak wajib berhasil di DOM uji.
      }
    }
  }

  // ---------------------------------------------------------------------
  // Kartu mesin
  // ---------------------------------------------------------------------
  const mesinCard = h('section', { class: 'card stack' });
  mesinCard.appendChild(h('h2', {}, 'Mesin pengenalan suara'));

  const fieldset = h('fieldset', { id: 'suara-mesin', class: 'field' });
  fieldset.appendChild(h('legend', {}, 'Pilih mesin'));

  const offlineOption = h('div', { class: 'checkbox-field' });
  const offlineRadio = h('input', {
    id: 'suara-mesin-offline',
    type: 'radio',
    name: 'suara-mesin',
    value: 'offline'
  });
  const offlineLabel = h('label', {
    id: 'suara-mesin-offline-label',
    for: 'suara-mesin-offline',
    style: { display: 'flex', alignItems: 'center', minHeight: '48px' }
  }, 'Offline (di perangkat) — audio tidak dikirim ke mana pun.');
  offlineOption.appendChild(offlineRadio);
  offlineOption.appendChild(offlineLabel);
  fieldset.appendChild(offlineOption);

  const webOption = h('div', { class: 'checkbox-field' });
  const webRadio = h('input', {
    id: 'suara-mesin-web',
    type: 'radio',
    name: 'suara-mesin',
    value: 'web-speech',
    'aria-describedby': 'suara-web-warning'
  });
  const webLabel = h('label', {
    id: 'suara-mesin-web-label',
    for: 'suara-mesin-web',
    style: { display: 'flex', alignItems: 'center', minHeight: '48px' }
  }, MESIN_SUARA['web-speech'].label);
  webOption.appendChild(webRadio);
  webOption.appendChild(webLabel);
  fieldset.appendChild(webOption);

  const tidakTersedia = h('p', {
    id: 'suara-tidak-tersedia',
    class: 'hint',
    hidden: webTersedia
  }, 'Pengenalan suara bawaan peramban tidak tersedia di peramban ini.');

  const warning = h('p', {
    id: 'suara-web-warning',
    class: 'warning-text',
    role: 'note'
  }, PERINGATAN_WEB_SPEECH);

  const persetujuanGroup = h('div', { class: 'stack' });
  const checkboxRow = h('div', { class: 'checkbox-field' });
  const setujuCheckbox = h('input', {
    id: 'suara-setuju-checkbox',
    type: 'checkbox',
    'aria-describedby': 'suara-web-warning'
  });
  const setujuLabel = h('label', {
    id: 'suara-setuju-label',
    for: 'suara-setuju-checkbox',
    style: { display: 'flex', alignItems: 'flex-start', minHeight: '48px' }
  },
  'Saya sudah membaca peringatan pihak ketiga di atas dan memberikan persetujuan eksplisit ',
  'untuk mengaktifkan pengenalan suara bawaan peramban.');
  checkboxRow.appendChild(setujuCheckbox);
  checkboxRow.appendChild(setujuLabel);

  const btnSetuju = h('button', touch({
    id: 'btn-suara-setuju',
    class: 'button button--primary voice-big-button',
    type: 'button',
    disabled: true,
    'aria-describedby': 'suara-web-warning'
  }), 'Setujui dan aktifkan Web Speech');

  // Peringatan pihak ketiga selalu terlihat (bukan di balik modal), termasuk bila
  // API peramban tidak tersedia; hanya kontrol persetujuan yang disembunyikan.
  persetujuanGroup.appendChild(checkboxRow);
  persetujuanGroup.appendChild(btnSetuju);
  fieldset.appendChild(tidakTersedia);
  fieldset.appendChild(warning);
  fieldset.appendChild(persetujuanGroup);

  const mesinStatus = h('p', { id: 'suara-mesin-status', class: 'muted' });
  fieldset.appendChild(mesinStatus);
  mesinCard.appendChild(fieldset);

  // Kelompok persetujuan hanya relevan bila API benar-benar ada.
  if (!webTersedia) {
    webOption.hidden = true;
    persetujuanGroup.hidden = true;
    setujuCheckbox.disabled = true;
    btnSetuju.disabled = true;
  } else {
    tidakTersedia.hidden = true;
  }

  // ---------------------------------------------------------------------
  // Kartu status persetujuan
  // ---------------------------------------------------------------------
  const persetujuanCard = h('section', { class: 'card stack' });
  persetujuanCard.appendChild(h('h2', {}, 'Persetujuan Web Speech'));
  const persetujuanStatus = h('p', {
    id: 'suara-persetujuan-status',
    class: 'muted'
  });
  const btnCabut = h('button', touch({
    id: 'btn-suara-cabut',
    class: 'button button--danger voice-big-button',
    type: 'button',
    hidden: true
  }), 'Cabut persetujuan');
  persetujuanCard.appendChild(persetujuanStatus);
  persetujuanCard.appendChild(btnCabut);

  // ---------------------------------------------------------------------
  // Kartu pembaca suara (TTS)
  // ---------------------------------------------------------------------
  const ttsCard = h('section', { class: 'card stack' });
  ttsCard.appendChild(h('h2', {}, 'Pembaca suara (TTS)'));
  ttsCard.appendChild(h('p', { class: 'hint' },
    'Pembaca suara membacakan ulang isian sebelum disimpan. Konfirmasi tetap wajib dilakukan.'));

  const ttsRow = h('div', { class: 'checkbox-field' });
  const ttsCheckbox = h('input', { id: 'settings-suara-tts', type: 'checkbox' });
  const ttsLabel = h('label', {
    for: 'settings-suara-tts',
    style: { display: 'flex', alignItems: 'center', minHeight: '48px' }
  }, 'Bacakan ulang sebelum menyimpan');
  ttsRow.appendChild(ttsCheckbox);
  ttsRow.appendChild(ttsLabel);
  ttsCard.appendChild(ttsRow);

  const rateValue = h('span', {
    id: 'settings-suara-rate-value',
    class: 'muted'
  }, '0.9×');
  const rateField = h('div', { class: 'field' });
  rateField.appendChild(h('label', { for: 'settings-suara-rate' }, 'Kecepatan bacaan'));
  const rateInput = h('input', {
    id: 'settings-suara-rate',
    type: 'range',
    min: '0.5',
    max: '1.5',
    step: '0.1',
    value: '0.9',
    'aria-describedby': 'settings-suara-rate-value'
  });
  rateField.appendChild(rateInput);
  rateField.appendChild(rateValue);
  ttsCard.appendChild(rateField);

  const btnSimulasi = h('button', touch({
    id: 'btn-simulasikan-suara',
    class: 'button button--ghost voice-big-button',
    type: 'button'
  }), 'Simulasikan bacaan');
  ttsCard.appendChild(btnSimulasi);
  ttsCard.appendChild(h('p', { class: 'hint' }, `Contoh: “${SAMPLE_TTS}”`));

  // ---------------------------------------------------------------------
  // Kartu model offline (status jujur dari manifest same-origin)
  // ---------------------------------------------------------------------
  const modelCard = h('section', { class: 'card stack', id: 'suara-model' });
  modelCard.appendChild(h('h2', {}, 'Model offline (Whisper base)'));
  modelCard.appendChild(h('p', { class: 'hint' },
    'Model offline dipakai untuk pengenalan di perangkat. Tidak ada audio yang dikirim '
    + 'ke jaringan saat memakai mesin Offline.'));

  const modelStatus = h('p', {
    id: 'suara-model-status',
    class: 'status-message',
    role: 'status',
    'aria-live': 'polite'
  }, 'Memeriksa ketersediaan model…');

  const modelUkuran = h('p', { id: 'suara-model-ukuran', class: 'muted' }, '± 80 MB');
  const modelCara = h('p', { id: 'suara-model-cara', class: 'hint' }, CARA_VENDOR);
  const modelPeringatan = h('p', {
    id: 'suara-model-peringatan',
    class: 'voice-warning'
  }, PERINGATAN_MODEL);
  const modelPeringatanRingkas = h('p', { class: 'hint' }, PERINGATAN_MODEL_RINGKAS);
  const modelProgress = h('p', {
    id: 'suara-model-progress',
    class: 'hint',
    role: 'status',
    'aria-live': 'polite'
  }, '');
  const btnMuatModel = h('button', touch({
    id: 'btn-suara-muat-model',
    class: 'button button--primary voice-big-button',
    type: 'button',
    disabled: true,
    'aria-describedby': 'suara-model-status suara-model-cara'
  }), 'Muat model dari disk');

  modelCard.appendChild(modelStatus);
  modelCard.appendChild(modelUkuran);
  modelCard.appendChild(modelCara);
  modelCard.appendChild(modelPeringatan);
  modelCard.appendChild(modelPeringatanRingkas);
  modelCard.appendChild(btnMuatModel);
  modelCard.appendChild(modelProgress);

  screen.appendChild(mesinCard);
  screen.appendChild(persetujuanCard);
  screen.appendChild(ttsCard);
  screen.appendChild(modelCard);
  screen.appendChild(h('p', { class: 'hint' },
    'Layar ini tidak mengirim permintaan jaringan. Offline memproses audio di perangkat; ' +
    'Web Speech hanya setelah persetujuan di atas.'));
  root.appendChild(screen);

  // ---------------------------------------------------------------------
  // Sinkronisasi tampilan
  // ---------------------------------------------------------------------
  function perbaruiMesin() {
    if (disposed) return;
    const efektif = mesinAktif({ suara });
    offlineRadio.checked = efektif !== 'web-speech';
    webRadio.checked = efektif === 'web-speech';
    const labelOffline = 'Offline (di perangkat)';
    const labelWeb = MESIN_SUARA['web-speech'].label;
    let pesan = `Mesin aktif: ${efektif === 'web-speech' ? labelWeb : labelOffline}.`;
    if (suara.mesin === 'web-speech' && efektif !== 'web-speech') {
      pesan += ' Web Speech tersimpan tetapi belum dapat dipakai; pengenalan memakai Offline.';
    } else if (suara.mesin === 'offline' && statusPersetujuan({ suara }).berlaku) {
      pesan += ' Persetujuan Web Speech tetap tercatat dan dapat diaktifkan kembali.';
    }
    mesinStatus.textContent = pesan;
  }

  function perbaruiPersetujuan() {
    if (disposed) return;
    const status = statusPersetujuan({ suara });
    if (!status.diberikan) {
      persetujuanStatus.textContent = 'Belum ada persetujuan. Web Speech nonaktif bawaan.';
    } else if (status.berlaku) {
      persetujuanStatus.textContent =
        `Disetujui pada ${formatWaktu(status.diberikanPada)} · versi ${status.versi} (berlaku).`;
    } else {
      persetujuanStatus.textContent =
        `Persetujuan versi ${status.versi || 'tidak dikenal'} tidak berlaku lagi. ` +
        'Centang peringatan lalu setujui ulang.';
    }
    btnCabut.hidden = !status.diberikan;
  }

  function perbaruiTts() {
    if (disposed) return;
    ttsCheckbox.checked = suara.tts === true;
    const kecepatan = suara.kecepatan;
    rateInput.value = String(kecepatan);
    rateInput.setAttribute('aria-valuetext', `${kecepatan.toFixed(1)} kali`);
    rateValue.textContent = `${kecepatan.toFixed(1)}×`;
  }

  function perbaruiSemua() {
    perbaruiMesin();
    perbaruiPersetujuan();
    perbaruiTts();
    const bolehSetuju = webTersedia && setujuCheckbox.checked === true;
    btnSetuju.disabled = !bolehSetuju;
  }

  perbaruiSemua();
  const statusAwal = mesinStatus.textContent;
  umumkan(`${statusAwal} ${persetujuanStatus.textContent}`);

  // ---------------------------------------------------------------------
  // Status model offline: jujur, only same-origin manifest
  // ---------------------------------------------------------------------
  let modelSibuk = false;
  let statusModelTerakhir = null;

  function perbaruiModel(info, { memeriksa = false } = {}) {
    if (disposed) return;
    statusModelTerakhir = info;
    const status = info && info.status ? info.status : null;
    const pesan = memeriksa
      ? 'Memeriksa ketersediaan model…'
      : (PESAN_MODEL[status] || PESAN_MODEL[STATUS_MODEL.TIDAK_ADA]);
    modelStatus.textContent = pesan;
    modelUkuran.textContent = formatMB(info && info.bytes);
    const siap = status === STATUS_MODEL.SIAP;
    btnMuatModel.disabled = !siap || modelSibuk;
    btnMuatModel.title = siap
      ? 'Memuat model dari disk same-origin (bukan mengunduh).'
      : 'Model belum siap. Jalankan npm run vendor:whisper saat build.';
    btnMuatModel.setAttribute(
      'aria-describedby',
      'suara-model-status suara-model-cara'
    );
  }

  function teksProgres(info) {
    const persen = Number(info && info.progress);
    if (Number.isFinite(persen)) {
      const nilai = persen <= 1 ? persen * 100 : persen;
      return `Memuat model dari disk… ${Math.round(nilai)}%`;
    }
    if (info && typeof info.status === 'string' && info.status !== '') {
      return `Memuat model dari disk… (${info.status})`;
    }
    return 'Memuat model dari disk…';
  }

  async function periksaModel() {
    perbaruiModel(null, { memeriksa: true });
    let info = null;
    try {
      info = await statusModel();
    } catch {
      info = null;
    }
    if (disposed) return;
    perbaruiModel(info);
    if (info && info.status === STATUS_MODEL.TIDAK_ADA) {
      umumkan('Model offline belum tersedia. Jalankan npm run vendor:whisper untuk memasang.');
    }
  }

  btnMuatModel.addEventListener('click', async () => {
    if (disposed || modelSibuk) return;
    if (!statusModelTerakhir || statusModelTerakhir.status !== STATUS_MODEL.SIAP) {
      aturStatus(
        'Model offline belum siap. Jalankan npm run vendor:whisper lalu muat ulang layar.',
        'info'
      );
      return;
    }
    tampilkanError('');
    modelSibuk = true;
    perbaruiModel(statusModelTerakhir);
    modelProgress.textContent = 'Memuat model dari disk…';
    umumkan('Memuat model dari disk. Tidak ada unduhan jaringan.');
    try {
      const hasil = await muatModel({
        onProgress: (info) => {
          if (disposed) return;
          modelProgress.textContent = teksProgres(info);
          umumkan(modelProgress.textContent);
        }
      });
      if (disposed) return;
      modelProgress.textContent = 'Model berhasil dimuat dari disk. Tidak ada unduhan.';
      aturStatus('Model offline dimuat dari disk.', 'success');
      umumkan('Model offline berhasil dimuat dari disk.');
      if (hasil && typeof hasil.dispose === 'function') {
        try {
          await hasil.dispose();
        } catch {
          // pelepasan pipeline tidak wajib
        }
      }
    } catch (error) {
      const pesan = error && error.code === 'MODEL_TIDAK_TERSEDIA'
        ? 'Model offline tidak dapat dimuat. Jalankan npm run vendor:whisper saat build.'
        : (error && error.message) || 'Model offline gagal dimuat dari disk.';
      modelProgress.textContent = pesan;
      tampilkanError(pesan);
      aturStatus(pesan, 'error');
    } finally {
      modelSibuk = false;
      if (!disposed) perbaruiModel(statusModelTerakhir);
    }
  });

  // ---------------------------------------------------------------------
  // Penyimpanan & persetujuan
  // ---------------------------------------------------------------------
  async function simpanSuara(patch) {
    const kandidat = normalisasiPengaturanSuara({ suara: { ...suara, ...patch } }).suara;
    const hasil = await ctx.state.setSettings({ suara: kandidat });
    const dariHasil = suaraDariHasil(hasil);
    return dariHasil || kandidat;
  }

  async function muatModulPersetujuan() {
    try {
      const modul = await import('../suara/persetujuan.js');
      if (
        typeof modul?.berikanPersetujuan === 'function'
        && typeof modul?.cabutPersetujuan === 'function'
      ) {
        return modul;
      }
    } catch {
      // Modul t19 belum tersedia: pakai jalur kontrak lokal yang setara.
    }
    return null;
  }

  async function beriPersetujuanLokal() {
    const sekarang = new Date().toISOString();
    const next = {
      ...suara,
      mesin: 'web-speech',
      webSpeechPersetujuan: {
        diberikan: true,
        diberikanPada: sekarang,
        versi: WEB_SPEECH_CONSENT_VERSION
      }
    };
    const kandidat = normalisasiPengaturanSuara({ suara: next }).suara;
    const hasil = await ctx.state.setSettings({ suara: kandidat });
    return suaraDariHasil(hasil, kandidat);
  }

  async function cabutPersetujuanLokal() {
    const next = {
      ...suara,
      mesin: 'offline',
      webSpeechPersetujuan: { diberikan: false, diberikanPada: null, versi: null }
    };
    const kandidat = normalisasiPengaturanSuara({ suara: next }).suara;
    const hasil = await ctx.state.setSettings({ suara: kandidat });
    return suaraDariHasil(hasil, kandidat);
  }

  function kunciKontrol(nilai) {
    const sibuk = nilai === true;
    offlineRadio.disabled = sibuk;
    webRadio.disabled = sibuk || !webTersedia;
    setujuCheckbox.disabled = sibuk || !webTersedia;
    btnCabut.disabled = sibuk;
    ttsCheckbox.disabled = sibuk;
    rateInput.disabled = sibuk;
    btnSimulasi.disabled = sibuk;
    btnSetuju.disabled = sibuk || !webTersedia || !setujuCheckbox.checked;
  }

  offlineRadio.addEventListener('change', async () => {
    if (disposed || !offlineRadio.checked) return;
    tampilkanError('');
    kunciKontrol(true);
    try {
      suara = await simpanSuara({ mesin: 'offline' });
      perbaruiMesin();
      aturStatus('Mesin suara: Offline (di perangkat).', 'success');
      if (typeof ctx.toast === 'function') ctx.toast('Mesin suara disimpan.', 'success');
    } catch (error) {
      perbaruiMesin();
      const pesan = error?.message || 'Pengaturan gagal disimpan.';
      tampilkanError(pesan);
      if (typeof ctx.toast === 'function') ctx.toast(pesan, 'error');
    } finally {
      kunciKontrol(false);
      perbaruiSemua();
    }
  });

  webRadio.addEventListener('change', async () => {
    if (disposed || !webRadio.checked) return;
    tampilkanError('');

    if (!webTersedia) {
      perbaruiMesin();
      return;
    }

    // Memilih radio BUKAN persetujuan. Tanpa persetujuan sah, batalkan pilihan.
    if (!statusPersetujuan({ suara }).berlaku) {
      perbaruiMesin();
      aturStatus(
        'Web Speech belum diaktifkan. Centang pernyataan persetujuan lalu tekan ' +
        '“Setujui dan aktifkan Web Speech”.',
        'info'
      );
      try {
        setujuCheckbox.focus();
      } catch {
        // abaikan
      }
      return;
    }

    kunciKontrol(true);
    try {
      suara = await simpanSuara({ mesin: 'web-speech' });
      perbaruiMesin();
      aturStatus('Mesin suara: Web Speech (setelah persetujuan).', 'success');
      if (typeof ctx.toast === 'function') ctx.toast('Mesin suara disimpan.', 'success');
    } catch (error) {
      perbaruiMesin();
      const pesan = error?.message || 'Pengaturan gagal disimpan.';
      tampilkanError(pesan);
      if (typeof ctx.toast === 'function') ctx.toast(pesan, 'error');
    } finally {
      kunciKontrol(false);
      perbaruiSemua();
    }
  });

  setujuCheckbox.addEventListener('change', () => {
    if (disposed) return;
    btnSetuju.disabled = !webTersedia || !setujuCheckbox.checked;
  });

  btnSetuju.addEventListener('click', async () => {
    if (disposed) return;
    if (!webTersedia) return;
    if (!setujuCheckbox.checked) {
      aturStatus('Centang pernyataan persetujuan terlebih dahulu.', 'error');
      return;
    }
    tampilkanError('');
    kunciKontrol(true);
    aturStatus('Menyimpan persetujuan…', 'info');
    try {
      const modul = await muatModulPersetujuan();
      let hasil;
      if (modul) {
        hasil = await modul.berikanPersetujuan(ctx.state, { now: new Date() });
      } else {
        hasil = await beriPersetujuanLokal();
      }
      const kandidat = suaraDariHasil(hasil, normalisasiPengaturanSuara({
        suara: {
          ...suara,
          mesin: 'web-speech',
          webSpeechPersetujuan: {
            diberikan: true,
            diberikanPada: new Date().toISOString(),
            versi: WEB_SPEECH_CONSENT_VERSION
          }
        }
      }).suara);
      const dibaca = bacaSuara();
      suara = statusPersetujuan({ suara: dibaca }).berlaku ? dibaca : kandidat;
      setujuCheckbox.checked = false;
      perbaruiSemua();
      aturStatus('Persetujuan Web Speech dicatat. Audio akan dikirim ke pihak ketiga saat dipakai.', 'success');
      if (typeof ctx.toast === 'function') ctx.toast('Persetujuan Web Speech dicatat.', 'success');
    } catch (error) {
      const pesan = error?.message || 'Persetujuan gagal disimpan.';
      tampilkanError(pesan);
      aturStatus(pesan, 'error');
      if (typeof ctx.toast === 'function') ctx.toast(pesan, 'error');
    } finally {
      kunciKontrol(false);
      perbaruiSemua();
    }
  });

  btnCabut.addEventListener('click', async () => {
    if (disposed) return;
    tampilkanError('');
    kunciKontrol(true);
    try {
      const modul = await muatModulPersetujuan();
      let hasil;
      if (modul) {
        hasil = await modul.cabutPersetujuan(ctx.state, { now: new Date() });
      } else {
        hasil = await cabutPersetujuanLokal();
      }
      const kandidat = suaraDariHasil(hasil, {
        ...suara,
        mesin: 'offline',
        webSpeechPersetujuan: { diberikan: false, diberikanPada: null, versi: null }
      });
      // Pencabutan selalu memaksa offline & mengosongkan persetujuan.
      suara = {
        ...normalisasiPengaturanSuara({ suara: kandidat }).suara,
        mesin: 'offline',
        webSpeechPersetujuan: { diberikan: false, diberikanPada: null, versi: null }
      };
      setujuCheckbox.checked = false;
      perbaruiSemua();
      aturStatus('Persetujuan dicabut. Mesin suara kembali Offline.', 'success');
      umumkan('Persetujuan Web Speech dicabut. Mesin aktif: Offline (di perangkat).');
      if (typeof ctx.toast === 'function') ctx.toast('Persetujuan Web Speech dicabut.', 'success');
    } catch (error) {
      const pesan = error?.message || 'Persetujuan gagal dicabut.';
      tampilkanError(pesan);
      aturStatus(pesan, 'error');
      if (typeof ctx.toast === 'function') ctx.toast(pesan, 'error');
    } finally {
      kunciKontrol(false);
      perbaruiSemua();
    }
  });

  // ---------------------------------------------------------------------
  // TTS: on/off & kecepatan (tanpa reload)
  // ---------------------------------------------------------------------
  ttsCheckbox.addEventListener('change', async () => {
    if (disposed) return;
    tampilkanError('');
    ttsCheckbox.disabled = true;
    try {
      suara = await simpanSuara({ tts: ttsCheckbox.checked === true });
      perbaruiTts();
      aturStatus(suara.tts ? 'Pembaca suara diaktifkan.' : 'Pembaca suara dinonaktifkan.', 'success');
    } catch (error) {
      perbaruiTts();
      const pesan = error?.message || 'Pengaturan pembaca suara gagal disimpan.';
      tampilkanError(pesan);
    } finally {
      ttsCheckbox.disabled = false;
    }
  });

  rateInput.addEventListener('input', () => {
    if (disposed) return;
    const nilai = Number(rateInput.value);
    if (Number.isFinite(nilai)) {
      rateValue.textContent = `${nilai.toFixed(1)}×`;
      rateInput.setAttribute('aria-valuetext', `${nilai.toFixed(1)} kali`);
    }
  });

  rateInput.addEventListener('change', async () => {
    if (disposed) return;
    tampilkanError('');
    rateInput.disabled = true;
    try {
      suara = await simpanSuara({ kecepatan: Number(rateInput.value) });
      perbaruiTts();
      aturStatus(`Kecepatan bacaan: ${suara.kecepatan.toFixed(1)}×.`, 'success');
    } catch (error) {
      perbaruiTts();
      const pesan = error?.message || 'Kecepatan bacaan gagal disimpan.';
      tampilkanError(pesan);
    } finally {
      rateInput.disabled = false;
    }
  });

  // ---------------------------------------------------------------------
  // Simulasi bacaan (tanpa mikrofon, tanpa simpan data)
  // ---------------------------------------------------------------------
  btnSimulasi.addEventListener('click', async () => {
    if (disposed) return;
    tampilkanError('');
    btnSimulasi.disabled = true;
    try {
      let bacakan = null;
      try {
        const modul = await import('../suara/tts.js');
        if (typeof modul?.bacakan === 'function') bacakan = modul.bacakan;
      } catch {
        // t21 belum tersedia; coba speechSynthesis langsung sebagai fallback.
      }

      if (bacakan) {
        aturStatus('Membacakan contoh…', 'info');
        await bacakan(SAMPLE_TTS, { rate: suara.kecepatan });
        aturStatus('Contoh selesai dibacakan.', 'success');
        umumkan(`Contoh dibacakan: ${SAMPLE_TTS}`);
        return;
      }

      const sintesis = globalThis.speechSynthesis;
      const Ucapan = globalThis.SpeechSynthesisUtterance;
      if (sintesis && typeof Ucapan === 'function') {
        try {
          sintesis.cancel();
        } catch {
          // abaikan
        }
        const ucapan = new Ucapan(SAMPLE_TTS);
        ucapan.lang = 'id-ID';
        ucapan.rate = suara.kecepatan;
        sintesis.speak(ucapan);
        aturStatus('Membacakan contoh…', 'info');
        umumkan(`Contoh dibacakan: ${SAMPLE_TTS}`);
        return;
      }

      const pesan = 'Pembaca suara tidak tersedia. Bacaan ditampilkan sebagai teks; konfirmasi tetap wajib.';
      tampilkanError(pesan);
      aturStatus(pesan, 'error');
      umumkan(`${pesan} Contoh: ${SAMPLE_TTS}`);
    } catch (error) {
      const pesan = error?.code === 'TTS_TIDAK_TERSEDIA'
        ? error.message
        : (error?.message || 'Pembaca suara gagal membacakan contoh.');
      tampilkanError(pesan);
      aturStatus(pesan, 'error');
      umumkan(pesan);
    } finally {
      if (!disposed) btnSimulasi.disabled = false;
    }
  });

  periksaModel().catch(() => {
    // Status model tidak wajib berhasil; tampilkan jalur aman.
    if (!disposed) perbaruiModel(null);
  });

  return () => {
    disposed = true;
  };
}
