// Rekam Medisku — metadata mesin suara & normalisasi pengaturan suara.
//
// Modul murni: bebas DOM, bebas storage, dan tidak melakukan request jaringan.
// Tidak pernah mengaktifkan Web Speech secara implisit. Persetujuan hanya sah
// bila pernah dicatat eksplisit oleh pengguna (lihat §8B.4) dengan versi yang
// berlaku dan waktu yang valid.

export const MESIN_SUARA = Object.freeze({
  offline: Object.freeze({
    id: 'offline',
    label: 'Offline (di perangkat)',
    lokal: true,
    butuhPersetujuan: false,
    enabled: true,
    bahasa: 'id-ID'
  }),
  'web-speech': Object.freeze({
    id: 'web-speech',
    label: 'Bawaan peramban (audio dikirim ke pihak ketiga)',
    lokal: false,
    butuhPersetujuan: true,
    enabled: false, // metadata: nonaktif bawaan; status efektif via bolehPakaiWebSpeech()
    bahasa: 'id-ID'
  })
});

export const DISCLAIMERS_SUARA =
  'Aplikasi hanya mencatat apa yang Anda ucapkan. Pengenalan suara bisa salah, terutama angka dan nama obat. ' +
  'Periksa ulang bacaan aplikasi. Rekam Medisku bukan alat medis dan tidak menyarankan dosis.';

export const PERINGATAN_WEB_SPEECH =
  'Mesin bawaan peramban mengirim rekaman suara Anda ke layanan pihak ketiga (di Chrome, audio ' +
  'diproses Google). Rekam Medisku tidak menyimpan audio, tetapi pengiriman ini di luar kendali ' +
  'aplikasi dan dapat memuat data kesehatan Anda. Aktifkan hanya jika Anda setuju.';

export const WEB_SPEECH_CONSENT_VERSION = 'web-speech-v1';

export const SUARA_DEFAULTS = Object.freeze({
  mesin: 'offline',
  tts: true,
  kecepatan: 0.9
});

const KECEPATAN_MIN = 0.5;
const KECEPATAN_MAX = 1.5;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clampKecepatan(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return SUARA_DEFAULTS.kecepatan;
  return Math.min(KECEPATAN_MAX, Math.max(KECEPATAN_MIN, numeric));
}

/** Apakah Web Speech API tersedia di lingkungan ini? (tanpa meminta izin) */
export function webSpeechApiTersedia(globalObject = globalThis) {
  if (!globalObject) return false;
  const api = globalObject.SpeechRecognition || globalObject.webkitSpeechRecognition;
  return typeof api === 'function';
}

/** Normalisasi blok persetujuan tanpa mengarang persetujuan baru. */
function normalisasiPersetujuan(raw) {
  const source = isPlainObject(raw) ? raw : {};
  const diberikan = source.diberikan === true;
  let diberikanPada = null;
  if (typeof source.diberikanPada === 'string' && source.diberikanPada.trim() !== '') {
    const waktu = new Date(source.diberikanPada);
    if (!Number.isNaN(waktu.getTime())) diberikanPada = waktu.toISOString();
  }
  const versi = typeof source.versi === 'string' && source.versi.trim() !== ''
    ? source.versi.trim()
    : null;
  return { diberikan, diberikanPada, versi };
}

/** Persetujuan sah bila eksplisit, versinya berlaku, dan waktunya valid. */
export function persetujuanBerlaku(persetujuan) {
  if (!isPlainObject(persetujuan)) return false;
  return persetujuan.diberikan === true
    && persetujuan.versi === WEB_SPEECH_CONSENT_VERSION;
}

/**
 * Normalisasi `settings.suara` — bentuk kontrak 8B.4: menerima objek settings
 * dan mengembalikan salinan settings utuh dengan `.suara` ternormalisasi.
 * Mesin `web-speech` hanya dipertahankan bila persetujuan tersimpan sah;
 * fungsi ini tidak pernah mengubah mesin menjadi `web-speech`.
 */
export function normalisasiPengaturanSuara(settings) {
  const dasar = isPlainObject(settings) ? settings : {};
  const source = isPlainObject(dasar.suara) ? dasar.suara : {};
  const webSpeechPersetujuan = normalisasiPersetujuan(source.webSpeechPersetujuan);
  const dimintaWeb = source.mesin === 'web-speech';
  // Persetujuan eksplisit + versi berlaku adalah satu-satunya jalan web-speech.
  const mesin = dimintaWeb && persetujuanBerlaku(webSpeechPersetujuan)
    ? 'web-speech'
    : 'offline';

  return {
    ...dasar,
    suara: {
      mesin,
      webSpeechPersetujuan,
      tts: source.tts !== false,
      kecepatan: clampKecepatan(source.kecepatan)
    }
  };
}

/** Status persetujuan untuk ditampilkan UI. */
export function statusPersetujuan(settings) {
  const suara = normalisasiPengaturanSuara(settings).suara;
  const persetujuan = suara.webSpeechPersetujuan;
  return {
    diberikan: persetujuan.diberikan,
    diberikanPada: persetujuan.diberikanPada,
    versi: persetujuan.versi,
    berlaku: persetujuanBerlaku(persetujuan)
  };
}

/** Boleh memakai web-speech: API ada DAN persetujuan versi berlaku. */
export function bolehPakaiWebSpeech(settings) {
  if (!webSpeechApiTersedia()) return false;
  return statusPersetujuan(settings).berlaku;
}

/** Mesin efektif: fallback ke offline bila tidak tersedia/tidak disetujui. */
export function pilihMesin(settings) {
  const suara = normalisasiPengaturanSuara(settings).suara;
  if (suara.mesin === 'web-speech' && bolehPakaiWebSpeech(settings)) return 'web-speech';
  return 'offline';
}

/** Alias kontrak: mesin yang benar-benar dipakai saat ini. */
export function mesinAktif(settings) {
  return pilihMesin(settings);
}
