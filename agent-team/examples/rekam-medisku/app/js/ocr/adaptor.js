// Rekam Medisku — adaptor OCR lokal.
//
// Satu-satunya pintu masuk OCR untuk UI. Modul ini bebas DOM dan bebas penyimpanan:
// tidak menulis state/storage, tidak menerjemahkan, dan tidak melakukan request jaringan.
// Mesin dapat ditukar (mis. fake engine pada test) tanpa mengubah pemanggil.
//
// OCR cloud hanya metadata dan sengaja NONAKTIF (§8A.5 CONTRACT.md).

import { DISCLAIMERS } from '../model.js';

export const OCR_DEFAULTS = {
  languages: ['ind', 'eng'],
  lowConfidence: 0.6,
  maxImageBytes: 10 * 1024 * 1024,
  timeoutMs: 120000
};

export const OCR_ENGINES = {
  tesseract: { id: 'tesseract', label: 'Tesseract.js (lokal)', lokal: true, enabled: true },
  cloud: {
    id: 'cloud',
    label: 'Layanan visi eksternal (nonaktif)',
    lokal: false,
    enabled: false,
    requiresConsent: true,
    documentationOnly: true
  }
};

const ERROR_MESSAGES = {
  OCR_TIDAK_TERSEDIA:
    'OCR lokal tidak tersedia di peramban ini. Gunakan jalur Ketik/Tempel teks.',
  OCR_GAGAL: 'OCR gagal membaca gambar. Coba foto lebih tajam atau Ketik/Tempel teks.',
  GAMBAR_TIDAK_VALID: 'Gambar tidak valid. Pilih foto atau ketik teks secara manual.',
  OCR_TERLALU_BESAR: 'Gambar terlalu besar. Kompres atau pilih foto lain.',
  OCR_CLOUD_NONAKTIF:
    'OCR cloud tidak diaktifkan. Fitur ini hanya titik ekstensi dan memerlukan persetujuan eksplisit pengguna.',
  ADAPTOR_TIDAK_DIKENAL: 'Mesin OCR tidak dikenal.'
};

export class OcrError extends Error {
  constructor(message, { code = 'OCR_GAGAL', cause = null } = {}) {
    super(String(message || ERROR_MESSAGES[code] || ERROR_MESSAGES.OCR_GAGAL));
    this.name = 'OcrError';
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

/** Normalisasi kepercayaan: 0–100 dari Tesseract → 0..1; nilai 0..1 dibiarkan. */
function normalizeConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return clamp01(numeric > 1 ? numeric / 100 : numeric);
}

function normalizeProgress(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return clamp01(numeric > 1 ? numeric / 100 : numeric);
}

function normalizeBbox(bbox) {
  if (!bbox || typeof bbox !== 'object') return null;
  const keys = ['x0', 'y0', 'x1', 'y1'];
  if (!keys.every((key) => Number.isFinite(Number(bbox[key])))) return null;
  return {
    x0: Number(bbox.x0),
    y0: Number(bbox.y0),
    x1: Number(bbox.x1),
    y1: Number(bbox.y1)
  };
}

/** Ubah keluaran mesin apa pun menjadi { baris, teks } yang konsisten. */
function normalizeEngineResult(raw) {
  const result = raw && typeof raw === 'object' ? raw : {};
  const data = result.data && typeof result.data === 'object' ? result.data : {};
  const overallConfidence = normalizeConfidence(
    result.kepercayaan ?? result.confidence ?? data.confidence
  );

  let sourceRows = result.baris ?? result.lines ?? data.lines;
  if (!Array.isArray(sourceRows) && data.blocks && Array.isArray(data.blocks)) {
    sourceRows = data.blocks.flatMap((block) =>
      Array.isArray(block?.paragraphs)
        ? block.paragraphs.flatMap((paragraph) =>
            Array.isArray(paragraph?.lines) ? paragraph.lines : []
          )
        : []
    );
  }

  const baris = [];
  if (Array.isArray(sourceRows)) {
    for (const row of sourceRows) {
      if (!row || typeof row !== 'object') continue;
      const teks = String(row.teks ?? row.text ?? '').trim();
      if (!teks) continue;
      const kepercayaan = normalizeConfidence(
        row.kepercayaan ?? row.confidence ?? overallConfidence
      );
      const bbox = normalizeBbox(row.bbox);
      baris.push(bbox ? { teks, kepercayaan, bbox } : { teks, kepercayaan });
    }
  }

  // Fallback: mesin hanya memberi teks utuh (tanpa baris).
  if (baris.length === 0) {
    const text = String(result.teks ?? result.text ?? data.text ?? '');
    for (const line of text.split('\n')) {
      const teks = line.trim();
      if (teks) baris.push({ teks, kepercayaan: overallConfidence });
    }
  }

  const teks = baris.map((row) => row.teks).join('\n');
  return { baris, teks };
}

function dataUrlBytes(value) {
  const comma = value.indexOf(',');
  if (!value.startsWith('data:') || comma < 0) return 0;
  const payload = value.slice(comma + 1).replace(/\s+/g, '');
  if (!payload) return 0;
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

/** Validasi gambar & kumpulkan metadata ringan tanpa menyentuh DOM. */
function describeImage(source, maxImageBytes) {
  if (source === null || source === undefined) {
    throw new OcrError(ERROR_MESSAGES.GAMBAR_TIDAK_VALID, { code: 'GAMBAR_TIDAK_VALID' });
  }

  const sourceType = typeof source;
  if (sourceType === 'number' || sourceType === 'boolean' || sourceType === 'symbol' || sourceType === 'bigint' || sourceType === 'function') {
    throw new OcrError(ERROR_MESSAGES.GAMBAR_TIDAK_VALID, { code: 'GAMBAR_TIDAK_VALID' });
  }

  if (sourceType === 'string') {
    if (source.trim() === '') {
      throw new OcrError(ERROR_MESSAGES.GAMBAR_TIDAK_VALID, { code: 'GAMBAR_TIDAK_VALID' });
    }
    const bytes = dataUrlBytes(source);
    if (bytes > maxImageBytes) {
      throw new OcrError(ERROR_MESSAGES.OCR_TERLALU_BESAR, { code: 'OCR_TERLALU_BESAR' });
    }
    return { lebar: 0, tinggi: 0, bytes };
  }

  if (sourceType !== 'object') {
    throw new OcrError(ERROR_MESSAGES.GAMBAR_TIDAK_VALID, { code: 'GAMBAR_TIDAK_VALID' });
  }

  const bytes = Number.isFinite(Number(source.size)) ? Number(source.size) : 0;
  if (bytes > maxImageBytes) {
    throw new OcrError(ERROR_MESSAGES.OCR_TERLALU_BESAR, { code: 'OCR_TERLALU_BESAR' });
  }

  const lebar = Number(
    source.naturalWidth ?? source.videoWidth ?? source.width ?? 0
  );
  const tinggi = Number(
    source.naturalHeight ?? source.videoHeight ?? source.height ?? 0
  );
  let measuredBytes = bytes;
  if (!measuredBytes && source.data && Number.isFinite(Number(source.data.length))) {
    measuredBytes = Number(source.data.length);
  }

  return {
    lebar: Number.isFinite(lebar) ? Math.max(0, Math.round(lebar)) : 0,
    tinggi: Number.isFinite(tinggi) ? Math.max(0, Math.round(tinggi)) : 0,
    bytes: Number.isFinite(measuredBytes) ? Math.max(0, Math.round(measuredBytes)) : 0
  };
}

/** Apakah OCR lokal tersedia di lingkungan ini? */
export function ocrTersedia(engineId = 'tesseract') {
  const meta = OCR_ENGINES[engineId];
  if (!meta || !meta.enabled || !meta.lokal) return false;
  if (typeof window === 'undefined') return false;
  if (typeof Worker !== 'function') return false;
  if (typeof WebAssembly !== 'object' || WebAssembly === null) return false;
  return true;
}

export function createCloudOcrAdapter() {
  throw new OcrError(ERROR_MESSAGES.OCR_CLOUD_NONAKTIF, { code: 'OCR_CLOUD_NONAKTIF' });
}

export function createOcrAdapter({
  engine = 'tesseract',
  engineImpl = null,
  languages = OCR_DEFAULTS.languages
} = {}) {
  if (engine === 'cloud') {
    // Selalu melempar; tidak ada kode jaringan di sini.
    createCloudOcrAdapter();
  }
  const meta = OCR_ENGINES[engine];
  if (!meta) {
    throw new OcrError(`Mesin OCR "${String(engine)}" tidak dikenal.`, {
      code: 'ADAPTOR_TIDAK_DIKENAL'
    });
  }

  const defaultLanguages = Array.isArray(languages) && languages.length
    ? [...languages]
    : [...OCR_DEFAULTS.languages];

  let enginePromise = null;
  let terminated = false;

  function getEngine() {
    if (!enginePromise) {
      if (engineImpl) {
        enginePromise = Promise.resolve().then(() =>
          typeof engineImpl === 'function' ? engineImpl({ languages: defaultLanguages }) : engineImpl
        );
      } else if (meta.id === 'tesseract') {
        // Impor dinamis: hanya dimuat saat OCR benar-benar dipakai (same-origin).
        enginePromise = import('./tesseractEngine.js').then((module) =>
          module.createTesseractEngine({ languages: defaultLanguages })
        );
      } else {
        enginePromise = Promise.reject(
          new OcrError(`Mesin OCR "${meta.id}" belum diimplementasikan.`, {
            code: 'ADAPTOR_TIDAK_DIKENAL'
          })
        );
      }
      // Jangan biarkan rejection tanpa penanganan bila terminate dipanggil lebih dulu.
      enginePromise.catch(() => {});
    }
    return enginePromise;
  }

  return {
    id: meta.id,
    label: meta.label,
    lokal: meta.lokal,

    async recognize(source, {
      languages: recognizeLanguages = defaultLanguages,
      onProgress = null,
      signal = null
    } = {}) {
      const implementation = await getEngine();
      if (!implementation || typeof implementation.recognize !== 'function') {
        throw new OcrError(ERROR_MESSAGES.ADAPTOR_TIDAK_DIKENAL, {
          code: 'ADAPTOR_TIDAK_DIKENAL'
        });
      }
      let raw;
      try {
        raw = await implementation.recognize(source, {
          languages: [...recognizeLanguages],
          onProgress,
          signal
        });
      } catch (error) {
        if (error instanceof OcrError) throw error;
        throw new OcrError(ERROR_MESSAGES.OCR_GAGAL, { code: 'OCR_GAGAL', cause: error });
      }
      return normalizeEngineResult(raw);
    },

    async terminate() {
      if (terminated) return;
      terminated = true;
      try {
        const implementation = await getEngine();
        if (implementation && typeof implementation.terminate === 'function') {
          await implementation.terminate();
        }
      } catch {
        // Penghentian worker tidak boleh menggagalkan hasil OCR.
      }
    }
  };
}

/**
 * Pintu masuk OCR tingkat tinggi.
 * Selalu membuat adaptor, memanggil recognize, lalu terminate() di finally.
 */
export async function kenaliTeks(gambar, {
  engine = 'tesseract',
  engineImpl = null,
  languages = OCR_DEFAULTS.languages,
  onProgress = null,
  signal = null,
  timeoutMs = OCR_DEFAULTS.timeoutMs
} = {}) {
  const startedAt = now();
  const adapter = createOcrAdapter({ engine, engineImpl, languages });

  const metadata = describeImage(gambar, OCR_DEFAULTS.maxImageBytes);
  const bahasa = Array.isArray(languages) && languages.length
    ? [...languages]
    : [...OCR_DEFAULTS.languages];

  const emitProgress = (status, progress) => {
    if (typeof onProgress !== 'function') return;
    try {
      onProgress({ status, progress: normalizeProgress(progress) });
    } catch {
      // Callback UI tidak boleh menggagalkan OCR.
    }
  };

  const controller = new AbortController();
  let timedOut = false;

  const onCallerAbort = () => controller.abort();
  const callerSignal = signal && typeof signal.addEventListener === 'function' ? signal : null;
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', onCallerAbort, { once: true });
  }

  let timer = null;
  let timeoutReject = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutReject = reject;
  });
  const hasTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0;
  if (hasTimeout) {
    timer = setTimeout(() => {
      timedOut = true;
      timeoutReject(
        new OcrError(
          `OCR melebihi batas waktu ${timeoutMs} ms. Coba foto lebih kecil/tajam atau gunakan jalur teks.`,
          { code: 'OCR_GAGAL' }
        )
      );
      controller.abort();
    }, timeoutMs);
  }

  let abortReject = null;
  const abortPromise = new Promise((_, reject) => {
    abortReject = reject;
  });
  const onControllerAbort = () => {
    if (timedOut) return; // error timeout sudah dipilih
    abortReject(new OcrError('OCR dibatalkan.', { code: 'OCR_GAGAL' }));
  };
  if (controller.signal.aborted) onControllerAbort();
  else controller.signal.addEventListener('abort', onControllerAbort, { once: true });

  emitProgress('loading', 0);

  try {
    emitProgress('recognizing', 0.01);
    const racers = [
      adapter.recognize(gambar, {
        languages: bahasa,
        onProgress: (info) => {
          const status = info && info.status ? String(info.status) : 'recognizing';
          emitProgress(status, info ? info.progress : 0);
        },
        signal: controller.signal
      })
    ];
    if (hasTimeout) racers.push(timeoutPromise);
    if (callerSignal) racers.push(abortPromise);

    const recognized = await Promise.race(racers);
    const baris = Array.isArray(recognized?.baris) ? recognized.baris : [];
    const teks = baris.map((row) => row.teks).join('\n');
    const kepercayaan = baris.length
      ? baris.reduce((sum, row) => sum + normalizeConfidence(row.kepercayaan), 0) / baris.length
      : 0;

    emitProgress('done', 1);

    return {
      teks,
      kepercayaan,
      baris,
      bahasa,
      mesin: adapter.id,
      durasiMs: Math.max(0, Math.round(now() - startedAt)),
      gambar: metadata,
      peringatan: [DISCLAIMERS.ocr]
    };
  } catch (error) {
    if (error instanceof OcrError) throw error;
    if (timedOut) {
      throw new OcrError(
        `OCR melebihi batas waktu ${timeoutMs} ms. Coba foto lebih kecil/tajam atau gunakan jalur teks.`,
        { code: 'OCR_GAGAL', cause: error }
      );
    }
    if (controller.signal.aborted) {
      throw new OcrError('OCR dibatalkan.', { code: 'OCR_GAGAL', cause: error });
    }
    throw new OcrError(ERROR_MESSAGES.OCR_GAGAL, { code: 'OCR_GAGAL', cause: error });
  } finally {
    if (timer !== null) clearTimeout(timer);
    if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
    controller.signal.removeEventListener('abort', onControllerAbort);
    await adapter.terminate();
  }
}
