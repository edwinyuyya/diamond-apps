// Rekam Medisku — satu adaptor suara untuk dua mesin (offline & web-speech).
//
// Semua UI wajib memanggil `kenaliSuara(opsi)`; tidak ada layar yang menyentuh
// SpeechRecognition langsung. Modul ini bebas DOM, bebas penyimpanan, dan
// tidak melakukan request jaringan. Audio tidak pernah disimpan.
//
// Mesin default dimuat malas (dynamic import same-origin) hanya saat dipakai.
// Untuk test, `engineImpl` dapat diinjeksi dengan antarmuka:
//   { id, lokal, async start(), async stop(), async recognize({bahasa, signal, onStatus}) }

import {
  MESIN_SUARA,
  DISCLAIMERS_SUARA,
  PERINGATAN_WEB_SPEECH,
  statusPersetujuan,
  webSpeechApiTersedia
} from './mesin.js';
import {
  MAKS_DURASI_REKAM_MS,
  MAKS_TOKEN_KELUARAN,
  periksaHasilAsr,
  ringkasTolakAsr
} from './penjagaAsr.js';

export { MESIN_SUARA, DISCLAIMERS_SUARA, PERINGATAN_WEB_SPEECH };

const ERROR_MESSAGES = {
  SUARA_TIDAK_TERSEDIA: 'Pengenalan suara tidak tersedia. Gunakan tombol dan isian biasa.',
  MIKROFON_DITOLAK: 'Izin mikrofon ditolak. Semua fitur tetap dapat dipakai dengan tombol dan keyboard.',
  SUARA_GAGAL: 'Suara tidak dapat diproses. Coba lagi atau gunakan isian biasa.',
  SUARA_TIMEOUT: 'Tidak ada suara yang terdengar. Tekan Mulai bicara lalu ucapkan lagi.',
  SUARA_KOSONG: 'Tidak ada ucapan yang dikenali. Coba lagi dengan suara lebih jelas.',
  MESIN_TIDAK_DIKENAL: 'Mesin suara tidak dikenali. Pilih mesin di Pengaturan Suara.',
  PERSETUJUAN_DIPERLUKAN: 'Mesin bawaan peramban memerlukan persetujuan eksplisit sebelum dipakai.',
  MODEL_TIDAK_TERSEDIA: 'Model suara offline belum tersedia. Jalankan `npm run vendor:whisper` atau gunakan isian biasa.',
  TTS_TIDAK_TERSEDIA: 'Pembaca suara tidak tersedia. Bacaan ditampilkan sebagai teks; konfirmasi tetap wajib.',
  // Penjaga ASR (8B.11): hasil ditolak diperlakukan sebagai "tidak terdengar".
  ASR_TIDAK_TERDENGAR: 'Tidak terdengar dengan jelas. Ulangi jawaban singkat atau pilih tombol.',
  ASR_TERLALU_LAMA: 'Rekaman terlalu lama. Jawab maksimal delapan detik.',
  ASR_BERULANG: 'Tidak terdengar dengan jelas. Silakan ulangi atau pilih tombol.'
};

export class SuaraError extends Error {
  constructor(message, { code = 'SUARA_GAGAL', cause = null } = {}) {
    super(String(message || ERROR_MESSAGES[code] || ERROR_MESSAGES.SUARA_GAGAL));
    this.name = 'SuaraError';
    this.code = code;
    if (cause !== null && cause !== undefined) this.cause = cause;
  }
}

function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return 1;
  if (value < 0) return 0;
  return value;
}

/** Kepercayaan engine 0..100 dinormalisasi ke 0..1. Null = tidak tersedia. */
function normalizeConfidence(raw) {
  if (raw === null || raw === undefined || raw === '') {
    return { value: 0, tersedia: false };
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return { value: 0, tersedia: false };
  return { value: clamp01(numeric > 1 ? numeric / 100 : numeric), tersedia: true };
}

function normalizeAlternatif(raw, utama) {
  if (!Array.isArray(raw)) return [];
  const hasil = [];
  for (const item of raw) {
    const teks = typeof item === 'string'
      ? item
      : (item && typeof item === 'object' ? String(item.teks ?? item.text ?? '') : '');
    const trimmed = teks.trim();
    if (!trimmed || trimmed === utama || hasil.includes(trimmed)) continue;
    hasil.push(trimmed);
    if (hasil.length >= 3) break;
  }
  return hasil;
}

const KODE_SUARA_DIKENAL = new Set(Object.keys(ERROR_MESSAGES));

function mapEngineError(error, { saatMulai = false } = {}) {
  if (error instanceof SuaraError) return error;
  if (typeof error?.code === 'string' && KODE_SUARA_DIKENAL.has(error.code)) {
    return new SuaraError(error.message || ERROR_MESSAGES[error.code], {
      code: error.code,
      cause: error
    });
  }
  const name = String(error?.name || '');
  const message = String(error?.message || '').toLowerCase();
  if (
    name === 'NotAllowedError'
    || name === 'PermissionDeniedError'
    || name === 'SecurityError'
    || /izin|permission|not-allowed/.test(message)
  ) {
    return new SuaraError(ERROR_MESSAGES.MIKROFON_DITOLAK, {
      code: 'MIKROFON_DITOLAK',
      cause: error
    });
  }
  if (name === 'NotFoundError' || name === 'NotSupportedError') {
    return new SuaraError(ERROR_MESSAGES.SUARA_TIDAK_TERSEDIA, {
      code: 'SUARA_TIDAK_TERSEDIA',
      cause: error
    });
  }
  if (!saatMulai && /no[- ]?speech|kosong|empty/.test(message)) {
    return new SuaraError(ERROR_MESSAGES.SUARA_KOSONG, {
      code: 'SUARA_KOSONG',
      cause: error
    });
  }
  if (/model|vendor|wasm/.test(message) && /tidak|belum|missing|not found/.test(message)) {
    return new SuaraError(ERROR_MESSAGES.MODEL_TIDAK_TERSEDIA, {
      code: 'MODEL_TIDAK_TERSEDIA',
      cause: error
    });
  }
  return new SuaraError(ERROR_MESSAGES.SUARA_GAGAL, { code: 'SUARA_GAGAL', cause: error });
}

/**
 * Apakah mesin suara tersedia di lingkungan ini?
 * - offline: hanya KEMAMPUAN PLATFORM (WebAssembly + AudioContext + getUserMedia).
 *   Kesiapan model diperiksa asinkron lewat statusModel() (whisperEngine.js) dan
 *   ditampilkan jujur di Pengaturan Suara. Manifest tidak di-fetch di sini.
 *   Status dapat dipaksa lewat `globalThis.__SUARA_VENDOR_TERSEDIA__` (test).
 * - web-speech: API peramban ada DAN persetujuan versi berlaku.
 */
export function suaraTersedia(mesinId = 'offline', settings = null) {
  const meta = MESIN_SUARA[mesinId];
  if (!meta) return false;

  if (meta.id === 'web-speech') {
    return webSpeechApiTersedia() && statusPersetujuan(settings).berlaku;
  }

  if (typeof WebAssembly !== 'object' || WebAssembly === null) return false;
  const AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (typeof AudioCtor !== 'function') return false;
  const media = globalThis.navigator && globalThis.navigator.mediaDevices;
  if (!media || typeof media.getUserMedia !== 'function') return false;
  const flag = globalThis.__SUARA_VENDOR_TERSEDIA__ ?? globalThis.SUARA_VENDOR_TERSEDIA;
  if (flag === false) return false;
  return true;
}

async function engineDefault(mesinId, bahasa) {
  if (mesinId === 'web-speech') {
    let modul;
    try {
      modul = await import('./webSpeech.js');
    } catch (error) {
      throw new SuaraError(ERROR_MESSAGES.SUARA_TIDAK_TERSEDIA, {
        code: 'SUARA_TIDAK_TERSEDIA',
        cause: error
      });
    }
    if (!modul || typeof modul.buatWebSpeechEngine !== 'function') {
      throw new SuaraError(ERROR_MESSAGES.SUARA_TIDAK_TERSEDIA, {
        code: 'SUARA_TIDAK_TERSEDIA'
      });
    }
    let engine = null;
    try {
      engine = modul.buatWebSpeechEngine({ lang: bahasa });
    } catch (error) {
      throw mapEngineError(error);
    }
    if (!engine) {
      throw new SuaraError(ERROR_MESSAGES.SUARA_TIDAK_TERSEDIA, {
        code: 'SUARA_TIDAK_TERSEDIA'
      });
    }
    return engine;
  }

  let modul;
  try {
    modul = await import('./offlineEngine.js');
  } catch (error) {
    throw new SuaraError(ERROR_MESSAGES.SUARA_TIDAK_TERSEDIA, {
      code: 'SUARA_TIDAK_TERSEDIA',
      cause: error
    });
  }
  if (!modul || typeof modul.createOfflineEngine !== 'function') {
    throw new SuaraError(ERROR_MESSAGES.SUARA_TIDAK_TERSEDIA, {
      code: 'SUARA_TIDAK_TERSEDIA'
    });
  }
  try {
    return await modul.createOfflineEngine({ bahasa });
  } catch (error) {
    throw mapEngineError(error);
  }
}

/**
 * Membuat adaptor suara.
 * @returns {{id:string,label:string,lokal:boolean,mulai:Function,berhenti:Function,kenali:Function,terminate:Function}}
 */
export function createAdaptorSuara({
  mesin = 'offline',
  engineImpl = null,
  bahasa = 'id-ID',
  settings = null,
  maksDurasiMs = MAKS_DURASI_REKAM_MS
} = {}) {
  const meta = MESIN_SUARA[mesin];
  if (!meta) {
    throw new SuaraError(`Mesin suara "${String(mesin)}" tidak dikenal.`, {
      code: 'MESIN_TIDAK_DIKENAL'
    });
  }

  const bahasaAktif = typeof bahasa === 'string' && bahasa.trim()
    ? bahasa.trim()
    : meta.bahasa;

  const batasDurasi =
    Number.isFinite(Number(maksDurasiMs)) && Number(maksDurasiMs) > 0
      ? Math.floor(Number(maksDurasiMs))
      : MAKS_DURASI_REKAM_MS;

  if (meta.id === 'web-speech') {
    // Persetujuan diperiksa SEBELUM mikrofon diminta (validasi ini sinkron).
    if (!statusPersetujuan(settings).berlaku) {
      throw new SuaraError(ERROR_MESSAGES.PERSETUJUAN_DIPERLUKAN, {
        code: 'PERSETUJUAN_DIPERLUKAN'
      });
    }
    // Dengan engineImpl (test), API peramban boleh tidak ada.
    if (!engineImpl && !webSpeechApiTersedia()) {
      throw new SuaraError(ERROR_MESSAGES.SUARA_TIDAK_TERSEDIA, {
        code: 'SUARA_TIDAK_TERSEDIA'
      });
    }
  }

  let enginePromise = null;
  let engineId = meta.id;
  let engineLokal = meta.lokal;
  let started = false;
  let terminated = false;

  async function getEngine() {
    if (!enginePromise) {
      enginePromise = (async () => {
        let engine;
        if (engineImpl) {
          engine = typeof engineImpl === 'function'
            ? await engineImpl({ bahasa: bahasaAktif })
            : engineImpl;
        } else {
          engine = await engineDefault(meta.id, bahasaAktif);
        }
        if (!engine || typeof engine.recognize !== 'function') {
          throw new SuaraError(ERROR_MESSAGES.MESIN_TIDAK_DIKENAL, {
            code: 'MESIN_TIDAK_DIKENAL'
          });
        }
        if (typeof engine.id === 'string' && engine.id.trim()) engineId = engine.id.trim();
        if (typeof engine.lokal === 'boolean') engineLokal = engine.lokal;
        return engine;
      })();
      // Jangan biarkan rejection tanpa penanganan bila terminate() dipanggil lebih dulu.
      enginePromise.catch(() => {});
    }
    return enginePromise;
  }

  async function mulai() {
    if (terminated) {
      throw new SuaraError(ERROR_MESSAGES.SUARA_GAGAL, { code: 'SUARA_GAGAL' });
    }
    if (meta.id === 'web-speech' && !statusPersetujuan(settings).berlaku) {
      throw new SuaraError(ERROR_MESSAGES.PERSETUJUAN_DIPERLUKAN, {
        code: 'PERSETUJUAN_DIPERLUKAN'
      });
    }
    if (started) return;
    let engine;
    try {
      engine = await getEngine();
    } catch (error) {
      throw mapEngineError(error, { saatMulai: true });
    }
    try {
      if (typeof engine.start === 'function') await engine.start();
    } catch (error) {
      throw mapEngineError(error, { saatMulai: true });
    }
    started = true;
  }

  async function berhenti() {
    if (!enginePromise) {
      started = false;
      return;
    }
    try {
      const engine = await enginePromise;
      if (typeof engine.stop === 'function') await engine.stop();
    } catch {
      // Penghentian mikrofon tidak boleh menggagalkan hasil.
    } finally {
      started = false;
    }
  }

  async function kenali({ signal = null, onStatus = null, maksDurasiMs: batasOverride = null } = {}) {
    if (terminated) {
      throw new SuaraError(ERROR_MESSAGES.SUARA_GAGAL, { code: 'SUARA_GAGAL' });
    }
    if (signal && signal.aborted) {
      throw new SuaraError('Pengenalan suara dibatalkan.', { code: 'SUARA_GAGAL' });
    }
    await mulai();

    let engine;
    try {
      engine = await getEngine();
    } catch (error) {
      throw mapEngineError(error);
    }

    const batas = Number.isFinite(Number(batasOverride)) && Number(batasOverride) > 0
      ? Math.floor(Number(batasOverride))
      : batasDurasi;
    const mulaiKenali = now();

    let raw;
    try {
      raw = await engine.recognize({
        bahasa: bahasaAktif,
        signal,
        onStatus,
        maksDurasiMs: batas
      });
    } catch (error) {
      throw mapEngineError(error);
    }

    const data = raw && typeof raw === 'object' ? raw : { teks: raw };
    const teksAwal = String(data.teks ?? data.text ?? '').trim();
    if (!teksAwal) {
      // Teks kosong tetap SUARA_KOSONG (8B.2), sebelum penjaga keluaran.
      throw new SuaraError(ERROR_MESSAGES.SUARA_KOSONG, { code: 'SUARA_KOSONG' });
    }

    // Durasi rekaman dari engine bila tersedia; selain itu ukur di adaptor
    // sebagai lapisan kedua. Ini BUKAN waktu inferensi/model.
    const durasiDariEngine = Number(data.durasiMs);
    const durasiMs = Number.isFinite(durasiDariEngine) && durasiDariEngine >= 0
      ? durasiDariEngine
      : Math.max(0, Math.round(now() - mulaiKenali));

    // Setiap hasil engine WAJIB melewati penjaga ASR sebelum dikembalikan.
    // Hasil yang ditolak tidak boleh di-parse/disimpan oleh pemanggil.
    const cek = periksaHasilAsr(
      { ...data, teks: teksAwal, durasiMs },
      { maksDurasiMs: batas, maksToken: MAKS_TOKEN_KELUARAN }
    );
    if (!cek.ok) {
      throw new SuaraError(ringkasTolakAsr(cek.kode), {
        code: cek.kode || 'ASR_TIDAK_TERDENGAR'
      });
    }

    const teks = cek.hasil.teks;
    const kepercayaan = normalizeConfidence(
      cek.hasil.kepercayaan ?? cek.hasil.confidence ?? null
    );
    const alternatif = normalizeAlternatif(
      cek.hasil.alternatif ?? cek.hasil.alternatives,
      teks
    );

    return {
      teks,
      kepercayaan: kepercayaan.value,
      kepercayaanTersedia: kepercayaan.tersedia,
      alternatif,
      mesin: engineId,
      durasiMs
    };
  }

  async function terminate() {
    if (terminated) return;
    terminated = true;
    if (!enginePromise) {
      started = false;
      return;
    }
    try {
      const engine = await enginePromise;
      if (started && typeof engine.stop === 'function') await engine.stop();
      if (typeof engine.terminate === 'function') await engine.terminate();
    } catch {
      // Pelepasan mesin tidak boleh menggagalkan pemanggil.
    } finally {
      started = false;
    }
  }

  return {
    id: meta.id,
    label: meta.label,
    get lokal() {
      return engineLokal;
    },
    mulai,
    berhenti,
    kenali,
    terminate
  };
}

function makeTimeoutError(timeoutMs) {
  return new SuaraError(
    `${ERROR_MESSAGES.SUARA_TIMEOUT} (batas ${timeoutMs} ms)`,
    { code: 'SUARA_TIMEOUT' }
  );
}

/**
 * Pintu masuk tunggal pengenalan suara.
 * Membuat adaptor, mulai(), kenali(), lalu berhenti() + terminate() di finally.
 * Tidak menulis storage, tidak menyimpan audio, tidak memanggil jaringan.
 */
export async function kenaliSuara({
  mesin = 'offline',
  engineImpl = null,
  bahasa = 'id-ID',
  settings = null,
  onStatus = null,
  signal = null,
  timeoutMs = 20000,
  maksDurasiMs = MAKS_DURASI_REKAM_MS
} = {}) {
  const startedAt = now();
  const adapter = createAdaptorSuara({
    mesin,
    engineImpl,
    bahasa,
    settings,
    maksDurasiMs
  });

  const emit = (status) => {
    if (typeof onStatus !== 'function') return;
    try {
      onStatus({ status: String(status || 'mendengarkan'), mesin: adapter.id });
    } catch {
      // Callback UI tidak boleh menggagalkan pengenalan.
    }
  };

  const controller = new AbortController();
  let timedOut = false;

  const callerSignal = signal && typeof signal.addEventListener === 'function' ? signal : null;

  let abortReject = null;
  const abortPromise = new Promise((_, reject) => {
    abortReject = reject;
  });
  const onCallerAbort = () => {
    if (timedOut) return;
    abortReject(new SuaraError('Pengenalan suara dibatalkan.', { code: 'SUARA_GAGAL' }));
    controller.abort();
  };
  if (callerSignal) {
    if (callerSignal.aborted) onCallerAbort();
    else callerSignal.addEventListener('abort', onCallerAbort, { once: true });
  }

  let timeoutReject = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutReject = reject;
  });
  const hasTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0;
  const timer = hasTimeout
    ? setTimeout(() => {
        timedOut = true;
        timeoutReject(makeTimeoutError(timeoutMs));
        controller.abort();
      }, timeoutMs)
    : null;

  const run = (async () => {
    emit('mulai');
    // Jangan minta mikrofon bila pembatalan sudah terjadi sebelum mulai.
    if (controller.signal.aborted) {
      throw new SuaraError('Pengenalan suara dibatalkan.', { code: 'SUARA_GAGAL' });
    }
    await adapter.mulai();
    emit('mendengarkan');
    const hasil = await adapter.kenali({
      signal: controller.signal,
      onStatus: (info) => emit(info && info.status ? info.status : 'mendengarkan'),
      maksDurasiMs
    });
    emit('selesai');
    return hasil;
  })();
  run.catch(() => {}); // hindari unhandled rejection saat timeout/abort menang

  try {
    const racers = [run];
    if (hasTimeout) racers.push(timeoutPromise);
    if (callerSignal) racers.push(abortPromise);
    const hasil = await Promise.race(racers);

    const peringatan = [DISCLAIMERS_SUARA];
    if (adapter.id === 'web-speech' || hasil.mesin === 'web-speech') {
      peringatan.push(PERINGATAN_WEB_SPEECH);
    }
    if (hasil.kepercayaanTersedia === false) {
      peringatan.push('Kepercayaan mesin tidak tersedia.');
    }

    const durasiDariAdaptor = Number(hasil.durasiMs);
    const durasiMs = Number.isFinite(durasiDariAdaptor) && durasiDariAdaptor >= 0
      ? Math.max(0, Math.round(durasiDariAdaptor))
      : Math.max(0, Math.round(now() - startedAt));

    return {
      teks: hasil.teks,
      kepercayaan: hasil.kepercayaan,
      mesin: hasil.mesin || adapter.id,
      durasiMs,
      alternatif: Array.isArray(hasil.alternatif) ? hasil.alternatif : [],
      peringatan
    };
  } catch (error) {
    emit('gagal');
    if (error instanceof SuaraError) throw error;
    if (timedOut) throw makeTimeoutError(timeoutMs);
    if (controller.signal.aborted) {
      throw new SuaraError('Pengenalan suara dibatalkan.', {
        code: 'SUARA_GAGAL',
        cause: error
      });
    }
    throw mapEngineError(error);
  } finally {
    if (timer !== null) clearTimeout(timer);
    if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
    emit('berhenti');
    try {
      await adapter.berhenti();
    } catch {
      // abaikan
    }
    try {
      await adapter.terminate();
    } catch {
      // abaikan
    }
  }
}
