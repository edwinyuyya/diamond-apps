// Rekam Medisku — mesin ASR offline Whisper (CONTRACT.md 8B.3).
//
// Model: Xenova/whisper-base multilingual, quantized q8, Apache-2.0.
// Semua aset (modul, WASM ONNX Runtime, model) disajikan SAME-ORIGIN dari
// /vendor/suara/. Tidak ada fallback CDN, tidak ada unduhan saat runtime,
// tidak ada penyimpanan audio/transkrip, dan tidak ada request jaringan selain
// aset same-origin tersebut.
//
// Antarmuka engine mengikuti 8B.2: { id, lokal, start, stop, recognize, terminate }.
// Pipeline dimuat MALAS: hanya pada recognize pertama (bukan saat modul diimpor).

import {
  MAKS_DURASI_REKAM_MS,
  MAKS_TOKEN_KELUARAN
} from './penjagaAsr.js';

export const WHISPER_VENDOR = Object.freeze({
  modulePath: '/vendor/suara/transformers/transformers.min.js',
  wasmPath: '/vendor/suara/onnx/',
  modelPath: '/vendor/suara/models/',
  manifestPath: '/vendor/suara/manifest.json'
});

export const WHISPER_MODEL_ID = 'Xenova/whisper-base';
export const WHISPER_SAMPLE_RATE = 16000;
export const WHISPER_DTYPE = Object.freeze({
  encoder_model: 'q8',
  decoder_model_merged: 'q8'
});
export const WHISPER_LANGUAGE = 'indonesian';
export const STATUS_MODEL = Object.freeze({
  SIAP: 'siap',
  BELUM: 'belum',
  TIDAK_ADA: 'tidak-ada'
});

// 12 berkas model wajib, relatif terhadap models/Xenova/whisper-base/.
export const WHISPER_MODEL_FILES = Object.freeze([
  'config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'vocab.json',
  'merges.txt',
  'normalizer.json',
  'added_tokens.json',
  'special_tokens_map.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx'
]);

const PESAN_MODEL_HILANG =
  'Model Whisper offline tidak ditemukan. Jalankan "npm run vendor:whisper" saat build, ' +
  'lalu muat ulang aplikasi.';

function buatError(pesan, code = 'MODEL_TIDAK_TERSEDIA', cause = null) {
  const error = new Error(String(pesan));
  error.name = 'SuaraError';
  error.code = code;
  if (cause !== null && cause !== undefined) error.cause = cause;
  return error;
}

function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function pathSameOrigin(nilai) {
  if (typeof nilai !== 'string' || nilai.length === 0) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(nilai) || nilai.startsWith('//')) return false;
  return nilai.startsWith('/') || nilai.startsWith('./') || nilai.startsWith('../');
}

function normalkanPathBerkas(nilai) {
  if (typeof nilai !== 'string') return '';
  let path = nilai.trim().replace(/\\/g, '/');
  if (path.startsWith('./')) path = path.slice(2);
  while (path.startsWith('/')) path = path.slice(1);
  return path;
}

function pathModel(relatif) {
  const bersih = normalkanPathBerkas(relatif);
  return [
    bersih,
    `Xenova/whisper-base/${bersih}`,
    `models/Xenova/whisper-base/${bersih}`
  ];
}

// ---------------------------------------------------------------------------
// Kemampuan platform
// ---------------------------------------------------------------------------

/** True bila platform mendukung WebAssembly + AudioContext + getUserMedia. */
export function whisperTersedia() {
  if (typeof WebAssembly !== 'object' || WebAssembly === null) return false;
  if (typeof WebAssembly.instantiate !== 'function') return false;
  const AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (typeof AudioCtor !== 'function') return false;
  const media = globalThis.navigator && globalThis.navigator.mediaDevices;
  return Boolean(media && typeof media.getUserMedia === 'function');
}

// ---------------------------------------------------------------------------
// Status model — hanya membaca manifest same-origin, tanpa memuat model
// ---------------------------------------------------------------------------

function ambilPathEntri(entri) {
  if (typeof entri === 'string') return normalkanPathBerkas(entri);
  if (entri && typeof entri === 'object' && typeof entri.path === 'string') {
    return normalkanPathBerkas(entri.path);
  }
  return '';
}

function ambilBytesEntri(entri) {
  if (entri && typeof entri === 'object') {
    const nilai = Number(entri.bytes);
    if (Number.isFinite(nilai) && nilai > 0) return nilai;
  }
  return 0;
}

function hasilStatus(status, { bytes = 0, files = 0, pesan = '' } = {}) {
  return {
    status,
    modelId: WHISPER_MODEL_ID,
    bytes,
    files,
    engine: 'whisper',
    pesan
  };
}

/**
 * Membaca `/vendor/suara/manifest.json` same-origin dan memeriksa 12 berkas model.
 * Tidak memuat model dan tidak mengunduh apa pun.
 * - manifest hilang/rusak/engine salah -> 'tidak-ada'
 * - manifest valid tetapi berkas belum lengkap -> 'belum'
 * - 12 berkas lengkap -> 'siap'
 */
export async function statusModel({ fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') {
    return hasilStatus(STATUS_MODEL.TIDAK_ADA, { pesan: PESAN_MODEL_HILANG });
  }

  let response;
  try {
    response = await fetchImpl(WHISPER_VENDOR.manifestPath, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-cache',
      headers: { Accept: 'application/json' }
    });
  } catch {
    return hasilStatus(STATUS_MODEL.TIDAK_ADA, { pesan: PESAN_MODEL_HILANG });
  }

  if (!response || response.ok === false) {
    return hasilStatus(STATUS_MODEL.TIDAK_ADA, { pesan: PESAN_MODEL_HILANG });
  }

  let manifest;
  try {
    // Dukung fetchImpl palsu yang mengembalikan manifest langsung (test).
    manifest = typeof response.json === 'function' ? await response.json() : response;
  } catch {
    return hasilStatus(STATUS_MODEL.TIDAK_ADA, { pesan: PESAN_MODEL_HILANG });
  }

  if (
    !manifest ||
    typeof manifest !== 'object' ||
    manifest.engine !== 'whisper' ||
    !manifest.model ||
    manifest.model.id !== WHISPER_MODEL_ID
  ) {
    return hasilStatus(STATUS_MODEL.TIDAK_ADA, { pesan: PESAN_MODEL_HILANG });
  }

  const daftar = Array.isArray(manifest.files) ? manifest.files : [];
  const ditemukan = new Map();
  for (const entri of daftar) {
    const path = ambilPathEntri(entri);
    if (!path) continue;
    for (const relatif of WHISPER_MODEL_FILES) {
      if (ditemukan.has(relatif)) continue;
      if (pathModel(relatif).includes(path)) {
        ditemukan.set(relatif, ambilBytesEntri(entri));
      }
    }
  }

  const files = ditemukan.size;
  const bytesDariBerkas = [...ditemukan.values()].reduce((total, n) => total + n, 0);
  const bytesModel = Number(manifest.model.bytes);
  const bytes = bytesDariBerkas > 0
    ? bytesDariBerkas
    : (Number.isFinite(bytesModel) && bytesModel > 0 ? bytesModel : 0);

  if (files >= WHISPER_MODEL_FILES.length) {
    return hasilStatus(STATUS_MODEL.SIAP, {
      bytes,
      files,
      pesan: 'Model Whisper offline siap dimuat dari perangkat.'
    });
  }

  return hasilStatus(STATUS_MODEL.BELUM, {
    bytes,
    files,
    pesan:
      `Model Whisper offline belum lengkap (${files}/${WHISPER_MODEL_FILES.length} berkas). ` +
      'Jalankan "npm run vendor:whisper" saat build.'
  });
}

// ---------------------------------------------------------------------------
// Pemuatan pipeline (malas, hanya same-origin)
// ---------------------------------------------------------------------------

function ambilEnv(modul) {
  if (modul && modul.env) return modul.env;
  if (modul && modul.default && modul.default.env) return modul.default.env;
  return null;
}

function ambilPipeline(modul) {
  if (modul && typeof modul.pipeline === 'function') return modul.pipeline;
  if (modul && modul.default && typeof modul.default.pipeline === 'function') {
    return modul.default.pipeline;
  }
  return null;
}

/**
 * Memuat @huggingface/transformers dan pipeline Whisper dari /vendor/suara.
 * `transformerModule` dapat diinjeksi untuk test. Tidak pernah memakai host lain.
 * -> { asr, dispose }
 */
export async function muatModel({
  modulePath = WHISPER_VENDOR.modulePath,
  wasmPath = WHISPER_VENDOR.wasmPath,
  modelPath = WHISPER_VENDOR.modelPath,
  onProgress = null,
  transformerModule = null
} = {}) {
  if (!pathSameOrigin(modulePath) || !pathSameOrigin(wasmPath) || !pathSameOrigin(modelPath)) {
    throw buatError(
      'Aset Whisper harus disajikan same-origin dari /vendor/suara/.',
      'MODEL_TIDAK_TERSEDIA'
    );
  }

  let modul = transformerModule;
  if (!modul) {
    try {
      modul = await import(modulePath);
    } catch (error) {
      throw buatError(PESAN_MODEL_HILANG, 'MODEL_TIDAK_TERSEDIA', error);
    }
  }

  const env = ambilEnv(modul);
  const pipeline = ambilPipeline(modul);
  if (!env || typeof pipeline !== 'function') {
    throw buatError(
      'Modul Transformers tidak mengekspor env/pipeline.',
      'MODEL_TIDAK_TERSEDIA'
    );
  }

  try {
    // Konfigurasi wajib sebelum pipeline dibuat (8B.3).
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = modelPath;
    if (!env.backends) env.backends = {};
    if (!env.backends.onnx) env.backends.onnx = {};
    if (!env.backends.onnx.wasm) env.backends.onnx.wasm = {};
    env.backends.onnx.wasm.wasmPaths = wasmPath;
    env.backends.onnx.wasm.numThreads = 1;

    const opsi = { dtype: { ...WHISPER_DTYPE } };
    if (typeof onProgress === 'function') {
      opsi.progress_callback = (info) => {
        try {
          onProgress(info);
        } catch {
          // Callback progres tidak boleh menggagalkan pemuatan model.
        }
      };
    }

    const asr = await pipeline(
      'automatic-speech-recognition',
      WHISPER_MODEL_ID,
      opsi
    );
    if (!asr || typeof asr !== 'function') {
      throw new Error('Pipeline automatic-speech-recognition tidak tersedia.');
    }

    const dispose = async () => {
      try {
        if (typeof asr.dispose === 'function') await asr.dispose();
      } catch {
        // Pelepasan pipeline tidak boleh menggagalkan pemanggil.
      }
    };

    return { asr, dispose };
  } catch (error) {
    if (error && error.code === 'MODEL_TIDAK_TERSEDIA') throw error;
    throw buatError(PESAN_MODEL_HILANG, 'MODEL_TIDAK_TERSEDIA', error);
  }
}

// ---------------------------------------------------------------------------
// Transkripsi satu buffer audio
// ---------------------------------------------------------------------------

function ambilTeks(keluaran) {
  if (typeof keluaran === 'string') return keluaran.trim();
  if (Array.isArray(keluaran)) {
    return keluaran
      .map((bagian) => ambilTeks(bagian))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (keluaran && typeof keluaran === 'object') {
    if (typeof keluaran.text === 'string') return keluaran.text.trim();
  }
  return '';
}

function normalkanBahasa(bahasa) {
  if (typeof bahasa !== 'string' || !bahasa.trim()) return WHISPER_LANGUAGE;
  const kode = bahasa.trim().toLowerCase();
  if (kode === 'id' || kode === 'id-id' || kode === 'indonesia' || kode === 'indonesian') {
    return WHISPER_LANGUAGE;
  }
  return bahasa.trim();
}

/**
 * Menjalankan ASR pada Float32Array 16 kHz.
 * `kepercayaan` selalu null: pipeline Whisper tidak memberi confidence per kalimat.
 * -> { teks, kepercayaan, alternatif, durasiMs }
 */
export async function transkripsi(audioFloat32, {
  asr,
  bahasa = WHISPER_LANGUAGE,
  maksToken = MAKS_TOKEN_KELUARAN,
  onStatus = null
} = {}) {
  if (typeof asr !== 'function') {
    throw buatError('Pipeline ASR Whisper belum dimuat.', 'MODEL_TIDAK_TERSEDIA');
  }
  if (!audioFloat32 || typeof audioFloat32.length !== 'number') {
    throw buatError('Audio tidak valid.', 'SUARA_GAGAL');
  }

  const batasToken = Number.isFinite(Number(maksToken))
    ? Math.max(1, Math.floor(Number(maksToken)))
    : MAKS_TOKEN_KELUARAN;

  const lapor = (status) => {
    if (typeof onStatus !== 'function') return;
    try {
      onStatus({ status, mesin: 'offline' });
    } catch {
      // Callback UI tidak boleh menggagalkan transkripsi.
    }
  };

  lapor('mengenali');
  const mulai = now();
  let keluaran;
  try {
    keluaran = await asr(audioFloat32, {
      language: normalkanBahasa(bahasa),
      task: 'transcribe',
      max_new_tokens: batasToken
    });
  } catch (error) {
    throw buatError('Transkripsi offline gagal.', 'SUARA_GAGAL', error);
  }

  const durasiMs = Math.max(0, Math.round(now() - mulai));
  lapor('selesai');

  return {
    teks: ambilTeks(keluaran),
    kepercayaan: null,
    alternatif: [],
    durasiMs
  };
}

// ---------------------------------------------------------------------------
// Perekaman mikrofon + engine
// ---------------------------------------------------------------------------

function gabungPotongan(potongan, sampleRate) {
  const total = potongan.reduce((jumlah, bagian) => jumlah + bagian.length, 0);
  if (total === 0) return new Float32Array(0);

  const sumber = new Float32Array(total);
  let offset = 0;
  for (const bagian of potongan) {
    sumber.set(bagian, offset);
    offset += bagian.length;
  }

  if (sampleRate === WHISPER_SAMPLE_RATE || sumber.length === 0) return sumber;

  // Resampling linear sederhana ke 16 kHz bila AudioContext memakai laju lain.
  const rasio = sampleRate / WHISPER_SAMPLE_RATE;
  const panjang = Math.max(1, Math.floor(sumber.length / rasio));
  const hasil = new Float32Array(panjang);
  for (let i = 0; i < panjang; i += 1) {
    const posisi = i * rasio;
    const indeks = Math.floor(posisi);
    const pecahan = posisi - indeks;
    const berikut = indeks + 1 < sumber.length ? sumber[indeks + 1] : sumber[indeks];
    hasil[i] = sumber[indeks] + (berikut - sumber[indeks]) * pecahan;
  }
  return hasil;
}

function tunggu(ms, signal) {
  return new Promise((resolve) => {
    let selesai = false;
    const beres = () => {
      if (selesai) return;
      selesai = true;
      clearTimeout(timer);
      if (signal && typeof signal.removeEventListener === 'function') {
        signal.removeEventListener('abort', beres);
      }
      resolve();
    };
    const timer = setTimeout(beres, ms);
    if (signal && typeof signal.addEventListener === 'function') {
      signal.addEventListener('abort', beres, { once: true });
    }
  });
}

class WhisperEngine {
  constructor({ modulePath, wasmPath, modelPath, sampleRate, maksDurasiMs }) {
    this.id = 'offline';
    this.lokal = true;
    this.sampleRate = sampleRate;
    this.maksDurasiMs = maksDurasiMs;
    this._modulePath = modulePath;
    this._wasmPath = wasmPath;
    this._modelPath = modelPath;
    this._stream = null;
    this._context = null;
    this._source = null;
    this._processor = null;
    this._gain = null;
    this._potongan = [];
    this._lajuRekam = sampleRate;
    this._aktif = false;
    this._pipelinePromise = null;
    this._asr = null;
    this._dispose = null;
  }

  async start() {
    if (this._aktif) return this;

    const media = globalThis.navigator && globalThis.navigator.mediaDevices;
    if (!media || typeof media.getUserMedia !== 'function') {
      throw buatError('Mikrofon tidak tersedia di peramban ini.', 'SUARA_TIDAK_TERSEDIA');
    }
    const AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (typeof AudioCtor !== 'function') {
      throw buatError('AudioContext tidak tersedia di peramban ini.', 'SUARA_TIDAK_TERSEDIA');
    }

    let stream;
    try {
      stream = await media.getUserMedia({
        audio: {
          sampleRate: WHISPER_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
    } catch (error) {
      throw buatError(
        'Izin mikrofon ditolak atau mikrofon tidak tersedia.',
        'MIKROFON_DITOLAK',
        error
      );
    }

    // Simpan stream lebih dulu agar track tetap dilepas bila AudioContext gagal.
    this._stream = stream;

    try {
      let context;
      try {
        context = new AudioCtor({ sampleRate: WHISPER_SAMPLE_RATE });
      } catch {
        context = new AudioCtor();
      }

      this._context = context;
      this._lajuRekam = Number(context.sampleRate) > 0
        ? Number(context.sampleRate)
        : WHISPER_SAMPLE_RATE;
      this._potongan = [];

      this._source = context.createMediaStreamSource(stream);
      this._processor = context.createScriptProcessor(4096, 1, 1);
      this._processor.onaudioprocess = (event) => {
        if (!this._aktif) return;
        const data = event.inputBuffer.getChannelData(0);
        // Salin karena buffer input dipakai ulang oleh peramban.
        this._potongan.push(new Float32Array(data));
      };
      // Gain nol: audio diproses tanpa dipantulkan ke speaker.
      this._gain = context.createGain();
      this._gain.gain.value = 0;
      this._source.connect(this._processor);
      this._processor.connect(this._gain);
      this._gain.connect(context.destination);

      this._aktif = true;
      return this;
    } catch (error) {
      await this.stop();
      if (error && error.code) throw error;
      throw buatError('Mesin suara offline gagal dimulai.', 'SUARA_GAGAL', error);
    }
  }

  _kumpulkanAudio() {
    const audio = gabungPotongan(this._potongan, this._lajuRekam);
    this._potongan = [];
    return audio;
  }

  async stop() {
    this._aktif = false;

    if (this._processor) {
      this._processor.onaudioprocess = null;
      try {
        this._processor.disconnect();
      } catch {
        // abaikan
      }
    }
    if (this._source) {
      try {
        this._source.disconnect();
      } catch {
        // abaikan
      }
    }
    if (this._gain) {
      try {
        this._gain.disconnect();
      } catch {
        // abaikan
      }
    }

    const audio = this._kumpulkanAudio();

    const context = this._context;
    this._context = null;
    if (context && typeof context.close === 'function') {
      try {
        await context.close();
      } catch {
        // abaikan
      }
    }

    const stream = this._stream;
    this._stream = null;
    if (stream && typeof stream.getTracks === 'function') {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // abaikan
        }
      }
    }

    this._processor = null;
    this._source = null;
    this._gain = null;
    return audio;
  }

  async _pastikanPipeline() {
    if (this._asr) return this._asr;
    if (!this._pipelinePromise) {
      this._pipelinePromise = muatModel({
        modulePath: this._modulePath,
        wasmPath: this._wasmPath,
        modelPath: this._modelPath
      })
        .then(({ asr, dispose }) => {
          this._asr = asr;
          this._dispose = dispose;
          return asr;
        })
        .catch((error) => {
          this._pipelinePromise = null;
          throw error && error.code
            ? error
            : buatError(PESAN_MODEL_HILANG, 'MODEL_TIDAK_TERSEDIA', error);
        });
    }
    return this._pipelinePromise;
  }

  /**
   * Merekam mono lalu mentranskripsi. Rekaman berhenti otomatis pada maksDurasiMs
   * (default 8000 ms). Audio dibuang setelah dikenali.
   * -> { teks, kepercayaan:null, alternatif:[], durasiMs }
   */
  async recognize({
    bahasa = 'id-ID',
    signal = null,
    onStatus = null,
    maksDurasiMs = this.maksDurasiMs
  } = {}) {
    if (signal && signal.aborted) {
      throw buatError('Pengenalan suara dibatalkan.', 'SUARA_GAGAL');
    }
    if (!this._aktif) await this.start();

    const batas = Number.isFinite(Number(maksDurasiMs)) && Number(maksDurasiMs) > 0
      ? Math.floor(Number(maksDurasiMs))
      : this.maksDurasiMs;
    const mulai = now();

    if (typeof onStatus === 'function') {
      try {
        onStatus({ status: 'mendengarkan', mesin: this.id });
      } catch {
        // abaikan
      }
    }

    // Rekaman berhenti otomatis pada batas, atau saat dibatalkan.
    await tunggu(batas, signal);
    const durasiMs = Math.max(0, Math.round(now() - mulai));

    let audio;
    try {
      audio = await this.stop();
    } catch {
      audio = new Float32Array(0);
    }

    if (signal && signal.aborted) {
      throw buatError('Pengenalan suara dibatalkan.', 'SUARA_GAGAL');
    }

    if (!audio || audio.length === 0) {
      return { teks: '', kepercayaan: null, alternatif: [], durasiMs };
    }

    let asr;
    try {
      asr = await this._pastikanPipeline();
    } catch (error) {
      if (error && error.code) throw error;
      throw buatError(PESAN_MODEL_HILANG, 'MODEL_TIDAK_TERSEDIA', error);
    }

    if (signal && signal.aborted) {
      throw buatError('Pengenalan suara dibatalkan.', 'SUARA_GAGAL');
    }

    const hasil = await transkripsi(audio, {
      asr,
      bahasa,
      maksToken: MAKS_TOKEN_KELUARAN,
      onStatus
    });

    // Audio tidak disimpan: buffer lokal dilepas setelah transkripsi.
    audio = null;

    return {
      teks: hasil.teks,
      kepercayaan: null,
      alternatif: [],
      durasiMs
    };
  }

  async terminate() {
    try {
      await this.stop();
    } catch {
      // abaikan
    }

    if (this._pipelinePromise) {
      try {
        await this._pipelinePromise;
      } catch {
        // pipeline gagal dimuat; tidak ada yang perlu dilepas
      }
    }
    if (typeof this._dispose === 'function') {
      try {
        await this._dispose();
      } catch {
        // abaikan
      }
    }

    this._asr = null;
    this._dispose = null;
    this._pipelinePromise = null;
    this._potongan = [];
  }
}

/**
 * Membuat engine Whisper. Pipeline belum dimuat di sini; pemuatan terjadi pada
 * recognize pertama, hanya dari /vendor/suara/.
 */
export async function createWhisperEngine({
  modulePath = WHISPER_VENDOR.modulePath,
  wasmPath = WHISPER_VENDOR.wasmPath,
  modelPath = WHISPER_VENDOR.modelPath,
  sampleRate = WHISPER_SAMPLE_RATE,
  maksDurasiMs = MAKS_DURASI_REKAM_MS
} = {}) {
  if (!pathSameOrigin(modulePath) || !pathSameOrigin(wasmPath) || !pathSameOrigin(modelPath)) {
    throw buatError(
      'Aset Whisper harus disajikan same-origin dari /vendor/suara/.',
      'MODEL_TIDAK_TERSEDIA'
    );
  }

  const laju = Number.isFinite(Number(sampleRate)) && Number(sampleRate) > 0
    ? Number(sampleRate)
    : WHISPER_SAMPLE_RATE;
  const batas = Number.isFinite(Number(maksDurasiMs)) && Number(maksDurasiMs) > 0
    ? Math.floor(Number(maksDurasiMs))
    : MAKS_DURASI_REKAM_MS;

  return new WhisperEngine({
    modulePath,
    wasmPath,
    modelPath,
    sampleRate: laju,
    maksDurasiMs: batas
  });
}

// Alias kompatibilitas untuk impor lama (CONTRACT.md 8B.3).
export const createOfflineEngine = createWhisperEngine;
export const offlineTersedia = whisperTersedia;
