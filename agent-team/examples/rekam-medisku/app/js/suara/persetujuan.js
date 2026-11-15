// Rekam Medisku — persetujuan penggunaan mesin Web Speech (pihak ketiga).
// Web Speech nonaktif secara bawaan; tidak ada persetujuan implisit. Persetujuan hanya
// dicatat lewat aksi eksplisit pengguna dan dapat dicabut kapan saja.

import { webSpeechTersedia } from './webSpeech.js';

export const WEB_SPEECH_CONSENT_VERSION = 'web-speech-v1';
export const PERINGATAN_WEB_SPEECH =
  'Mesin bawaan peramban mengirim rekaman suara Anda ke layanan pihak ketiga (di Chrome, audio ' +
  'diproses Google). Rekam Medisku tidak menyimpan audio, tetapi pengiriman ini di luar kendali ' +
  'aplikasi dan dapat memuat data kesehatan Anda. Aktifkan hanya jika Anda setuju.';

const MESIN_VALID = ['offline', 'web-speech'];
const KECEPATAN_MIN = 0.5;
const KECEPATAN_MAX = 1.5;
const KECEPATAN_DEFAULT = 0.9;

const PERSETUJUAN_KOSONG = {
  diberikan: false,
  diberikanPada: null,
  versi: null
};

function isObjek(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function waktuIso(now) {
  if (now instanceof Date) {
    if (!Number.isNaN(now.getTime())) return now.toISOString();
  } else if (typeof now === 'string' || typeof now === 'number') {
    const tanggal = new Date(now);
    if (!Number.isNaN(tanggal.getTime())) return tanggal.toISOString();
  }
  return new Date().toISOString();
}

function normalisasiPersetujuan(nilai) {
  if (!isObjek(nilai)) return { ...PERSETUJUAN_KOSONG };
  return {
    diberikan: nilai.diberikan === true,
    diberikanPada: typeof nilai.diberikanPada === 'string' && nilai.diberikanPada
      ? nilai.diberikanPada
      : null,
    versi: typeof nilai.versi === 'string' && nilai.versi ? nilai.versi : null
  };
}

function normalisasiKecepatan(nilai) {
  if (typeof nilai !== 'number' || !Number.isFinite(nilai)) return KECEPATAN_DEFAULT;
  return Math.min(KECEPATAN_MAX, Math.max(KECEPATAN_MIN, nilai));
}

// Versi lama (atau versi yang tidak dikenal) tidak pernah berlaku; UI wajib meminta
// persetujuan ulang. Persetujuan implisit tidak pernah dianggap ada.
function persetujuanBerlaku(persetujuan) {
  return persetujuan.diberikan === true
    && persetujuan.versi === WEB_SPEECH_CONSENT_VERSION;
}

// Mengisi default tanpa pernah mengaktifkan web-speech. Mesin 'web-speech' hanya
// dipertahankan bila persetujuan versi berlaku masih tercatat.
export function normalisasiPengaturanSuara(settings) {
  const dasar = isObjek(settings) ? settings : {};
  const suara = isObjek(dasar.suara) ? dasar.suara : {};
  const persetujuan = normalisasiPersetujuan(suara.webSpeechPersetujuan);
  const mesinTersimpan = MESIN_VALID.includes(suara.mesin) ? suara.mesin : 'offline';
  const mesin = mesinTersimpan === 'web-speech' && persetujuanBerlaku(persetujuan)
    ? 'web-speech'
    : 'offline';

  return {
    ...dasar,
    suara: {
      mesin,
      webSpeechPersetujuan: persetujuan,
      tts: typeof suara.tts === 'boolean' ? suara.tts : true,
      kecepatan: normalisasiKecepatan(suara.kecepatan)
    }
  };
}

export function statusPersetujuan(settings) {
  const persetujuan = normalisasiPengaturanSuara(settings).suara.webSpeechPersetujuan;
  return {
    diberikan: persetujuan.diberikan,
    diberikanPada: persetujuan.diberikanPada,
    versi: persetujuan.versi,
    berlaku: persetujuanBerlaku(persetujuan)
  };
}

export function bolehPakaiWebSpeech(settings) {
  return webSpeechTersedia() && statusPersetujuan(settings).berlaku;
}

function bacaSettings(state) {
  if (!isObjek(state)) return {};
  if (typeof state.getState === 'function') {
    const isi = state.getState();
    return isObjek(isi) && isObjek(isi.settings) ? isi.settings : {};
  }
  return isObjek(state.settings) ? state.settings : {};
}

// Wajib dipanggil dari aksi eksplisit pengguna (checkbox peringatan + tombol setuju).
// Tidak pernah dipanggil otomatis ketika pengguna memilih opsi mesin.
export async function berikanPersetujuan(state, {
  now = new Date(),
  versi = WEB_SPEECH_CONSENT_VERSION,
  aktifkan = true
} = {}) {
  if (!state || typeof state.setSettings !== 'function') {
    const error = new Error('Penyimpanan pengaturan tidak tersedia.');
    error.code = 'PENGATURAN_TIDAK_TERSEDIA';
    throw error;
  }

  const sekarang = normalisasiPengaturanSuara(bacaSettings(state)).suara;
  const suaraBaru = {
    ...sekarang,
    mesin: aktifkan ? 'web-speech' : sekarang.mesin,
    webSpeechPersetujuan: {
      diberikan: true,
      diberikanPada: waktuIso(now),
      versi: typeof versi === 'string' && versi ? versi : WEB_SPEECH_CONSENT_VERSION
    }
  };

  await state.setSettings({ suara: suaraBaru });
  return suaraBaru;
}

// Pencabutan langsung berlaku: persetujuan dikosongkan dan mesin dipaksa offline.
export async function cabutPersetujuan(state, { now = new Date() } = {}) {
  if (!state || typeof state.setSettings !== 'function') {
    const error = new Error('Penyimpanan pengaturan tidak tersedia.');
    error.code = 'PENGATURAN_TIDAK_TERSEDIA';
    throw error;
  }

  const sekarang = normalisasiPengaturanSuara(bacaSettings(state)).suara;
  const suaraBaru = {
    ...sekarang,
    mesin: 'offline',
    webSpeechPersetujuan: { ...PERSETUJUAN_KOSONG }
  };

  // `now` disediakan kontrak untuk jejak waktu pencabutan oleh pemanggil/UI.
  void now;
  await state.setSettings({ suara: suaraBaru });
  return suaraBaru;
}
