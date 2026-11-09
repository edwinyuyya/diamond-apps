// Rekam Medisku — mesin OCR Tesseract.js yang dimuat dari salinan vendor same-origin.
//
// Tidak ada fallback ke CDN/cloud. Semua aset (modul ESM, worker, core WASM,
// traineddata) berasal dari /vendor/* yang disajikan server sendiri.
// Modul ini hanya dijalankan di browser; di Node/test, adaptor memakai fake engine.

import { OcrError } from './adaptor.js';

export const VENDOR_BASE = '/vendor';

export const TESSERACT_VENDOR = {
  modulePath: '/vendor/tesseract/tesseract.esm.min.js',
  workerPath: '/vendor/tesseract/worker.min.js',
  corePath: '/vendor/tesseract-core',
  langPath: '/vendor/lang'
};

const OEM_LSTM_ONLY = 1;
const DEFAULT_LANGUAGES = ['ind', 'eng'];

function isBrowserOcrSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof Worker === 'function' &&
    typeof WebAssembly === 'object' &&
    WebAssembly !== null
  );
}

function assertLocalPath(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new OcrError(`Jalur ${label} OCR tidak valid.`, { code: 'OCR_TIDAK_TERSEDIA' });
  }
  const trimmed = value.trim();
  // Tolak URL absolut/skema apa pun dan protocol-relative URL.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('//')) {
    throw new OcrError(
      `Jalur ${label} OCR harus same-origin (${VENDOR_BASE}/...), bukan URL eksternal.`,
      { code: 'OCR_TIDAK_TERSEDIA' }
    );
  }
  return trimmed;
}

function normalizeConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const scaled = numeric > 1 ? numeric / 100 : numeric;
  return Math.min(1, Math.max(0, scaled));
}

function normalizeProgress(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const scaled = numeric > 1 ? numeric / 100 : numeric;
  return Math.min(1, Math.max(0, scaled));
}

function lineToBaris(line) {
  if (!line || typeof line !== 'object') return null;
  const teks = String(line.text ?? line.teks ?? '').trim();
  if (!teks) return null;
  const baris = { teks, kepercayaan: normalizeConfidence(line.confidence ?? line.kepercayaan) };
  const bbox = line.bbox;
  if (bbox && typeof bbox === 'object') {
    const x0 = Number(bbox.x0);
    const y0 = Number(bbox.y0);
    const x1 = Number(bbox.x1);
    const y1 = Number(bbox.y1);
    if ([x0, y0, x1, y1].every(Number.isFinite)) {
      baris.bbox = { x0, y0, x1, y1 };
    }
  }
  return baris;
}

function extractBaris(data) {
  const baris = [];
  if (data && Array.isArray(data.blocks)) {
    for (const block of data.blocks) {
      if (!block || !Array.isArray(block.paragraphs)) continue;
      for (const paragraph of block.paragraphs) {
        if (!paragraph || !Array.isArray(paragraph.lines)) continue;
        for (const line of paragraph.lines) {
          const converted = lineToBaris(line);
          if (converted) baris.push(converted);
        }
      }
    }
  }
  if (baris.length === 0 && data && typeof data.text === 'string') {
    const overall = normalizeConfidence(data.confidence);
    for (const line of data.text.split('\n')) {
      const teks = line.trim();
      if (teks) baris.push({ teks, kepercayaan: overall });
    }
  }
  return baris;
}

/** Batas waktu memuat mesin OCR agar layar tidak menggantung tanpa akhir (HP lama butuh puluhan detik). */
export const BATAS_MUAT_OCR_MS = 90000;

/**
 * Apakah data bahasa tersedia dalam bentuk `.traineddata.gz`?
 *
 * Pengemasan APK (Android) membuka kompresi berkas `.gz` dan membuang akhirannya, sehingga
 * `/vendor/lang/ind.traineddata.gz` menjadi 404 dan OCR menunggu selamanya. Bila `.gz` tidak ada,
 * pakai `gzip:false` agar Tesseract meminta `.traineddata` biasa (yang justru ada di APK).
 */
export async function bahasaGzipTersedia(langPath, languages, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') return true;
  for (const bahasa of languages) {
    const kendali = typeof AbortController === 'function' ? new AbortController() : null;
    try {
      const respons = await fetchImpl(`${langPath}/${bahasa}.traineddata.gz`, {
        signal: kendali ? kendali.signal : undefined
      });
      const jenis = respons.headers && typeof respons.headers.get === 'function'
        ? String(respons.headers.get('content-type') || '')
        : '';
      if (kendali) kendali.abort();
      // 404, atau "berhasil" berupa halaman HTML pengganti, berarti berkas .gz tidak ada.
      if (!respons.ok || /text\/html/i.test(jenis)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/** Jalankan `janji` dengan batas waktu; lewat batas -> OcrError yang jelas, bukan menggantung. */
function denganBatasWaktu(janji, ms, pesan, kode) {
  let pewaktu;
  const batas = new Promise((_, tolak) => {
    pewaktu = setTimeout(() => tolak(new OcrError(pesan, { code: kode })), ms);
  });
  return Promise.race([janji, batas]).finally(() => clearTimeout(pewaktu));
}

/**
 * Muat modul ESM Tesseract.js dari vendor dan buat worker lokal.
 * Gagal memuat/membuat worker → OcrError OCR_TIDAK_TERSEDIA (tanpa fallback cloud).
 */
export async function createTesseractEngine({
  modulePath = TESSERACT_VENDOR.modulePath,
  workerPath = TESSERACT_VENDOR.workerPath,
  corePath = TESSERACT_VENDOR.corePath,
  langPath = TESSERACT_VENDOR.langPath,
  logger = null,
  languages = DEFAULT_LANGUAGES
} = {}) {
  const resolvedModulePath = assertLocalPath(modulePath, 'modul');
  const resolvedWorkerPath = assertLocalPath(workerPath, 'worker');
  const resolvedCorePath = assertLocalPath(corePath, 'core');
  const resolvedLangPath = assertLocalPath(langPath, 'bahasa');

  if (!isBrowserOcrSupported()) {
    throw new OcrError(
      'OCR lokal tidak tersedia di peramban ini (butuh WebAssembly + Web Worker).',
      { code: 'OCR_TIDAK_TERSEDIA' }
    );
  }

  const requestedLanguages = Array.isArray(languages) && languages.length
    ? [...languages]
    : [...DEFAULT_LANGUAGES];

  // Sink progress hanya aktif selama recognize(); logger tidak pernah mencatat teks/gambar.
  let progressSink = null;
  const safeLogger = (message) => {
    const info = {
      status: message && typeof message.status === 'string' ? message.status : 'recognizing',
      progress: normalizeProgress(message ? message.progress : 0)
    };
    try {
      if (typeof logger === 'function') logger(info);
    } catch {
      // Logger pemanggil tidak boleh menggagalkan OCR.
    }
    try {
      if (typeof progressSink === 'function') progressSink(info);
    } catch {
      // Callback progress tidak boleh menggagalkan OCR.
    }
  };

  let moduleNamespace;
  try {
    // Impor dinamis same-origin; tidak ada URL eksternal.
    moduleNamespace = await import(resolvedModulePath);
  } catch (error) {
    throw new OcrError(
      'Modul OCR lokal tidak dapat dimuat dari /vendor. Jalankan npm run vendor:ocr.',
      { code: 'OCR_TIDAK_TERSEDIA', cause: error }
    );
  }

  const createWorker =
    moduleNamespace && typeof moduleNamespace.createWorker === 'function'
      ? moduleNamespace.createWorker
      : moduleNamespace?.default?.createWorker;
  if (typeof createWorker !== 'function') {
    throw new OcrError('Modul OCR lokal tidak mengekspor createWorker.', {
      code: 'OCR_TIDAK_TERSEDIA'
    });
  }

  let worker = null;
  let currentLangs = requestedLanguages.join('+');
  try {
    const pakaiGzip = await bahasaGzipTersedia(resolvedLangPath, requestedLanguages);
    worker = await denganBatasWaktu(
      createWorker(currentLangs, OEM_LSTM_ONLY, {
        workerPath: resolvedWorkerPath,
        corePath: resolvedCorePath,
        langPath: resolvedLangPath,
        gzip: pakaiGzip,
        logger: safeLogger
      }),
      BATAS_MUAT_OCR_MS,
      'Mesin OCR terlalu lama dimuat. Tutup aplikasi lalu buka lagi, atau gunakan jalur ketik/tempel teks resep.',
      'OCR_TIDAK_TERSEDIA'
    );
  } catch (error) {
    if (error instanceof OcrError) throw error;
    throw new OcrError(
      'Mesin OCR lokal gagal dimulai. Periksa aset /vendor atau gunakan jalur teks.',
      { code: 'OCR_TIDAK_TERSEDIA', cause: error }
    );
  }

  let terminated = false;

  return {
    id: 'tesseract',
    label: 'Tesseract.js (lokal)',
    lokal: true,

    async recognize(source, {
      languages: recognizeLanguages = requestedLanguages,
      onProgress = null,
      signal = null
    } = {}) {
      if (terminated) {
        throw new OcrError('Mesin OCR sudah dihentikan.', { code: 'OCR_GAGAL' });
      }
      if (signal && signal.aborted) {
        throw new OcrError('OCR dibatalkan.', { code: 'OCR_GAGAL' });
      }

      const wanted = Array.isArray(recognizeLanguages) && recognizeLanguages.length
        ? recognizeLanguages.join('+')
        : currentLangs;

      progressSink = typeof onProgress === 'function'
        ? (info) => {
            try {
              onProgress({ status: info.status, progress: info.progress });
            } catch {
              // Callback UI tidak boleh menggagalkan OCR.
            }
          }
        : null;

      try {
        if (wanted !== currentLangs && typeof worker.reinitialize === 'function') {
          await worker.reinitialize(wanted, OEM_LSTM_ONLY);
          currentLangs = wanted;
        }

        let output;
        try {
          output = await worker.recognize(source, {}, { text: true, blocks: true });
        } catch (error) {
          throw new OcrError(
            'OCR gagal membaca gambar. Coba foto lebih tajam atau gunakan jalur teks.',
            { code: 'OCR_GAGAL', cause: error }
          );
        }

        if (signal && signal.aborted) {
          throw new OcrError('OCR dibatalkan.', { code: 'OCR_GAGAL' });
        }

        const data = output && output.data ? output.data : {};
        const baris = extractBaris(data);
        const teks = baris.map((row) => row.teks).join('\n');
        return { baris, teks };
      } finally {
        progressSink = null;
      }
    },

    async terminate() {
      if (terminated) return;
      terminated = true;
      progressSink = null;
      const activeWorker = worker;
      worker = null;
      if (activeWorker && typeof activeWorker.terminate === 'function') {
        try {
          await activeWorker.terminate();
        } catch {
          // Worker mungkin sudah berhenti; abaikan.
        }
      }
    }
  };
}
