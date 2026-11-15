// Integrasi Whiper lokal (CONTRACT 8B.14/test 14.1) — t34.
//
// Test ini OPSIONAL dan di-skip dengan pesan jelas bila model / paket
// transformers belum tersedia. Bila tersedia:
//   - env Transformers dikunci ke model lokal (allowRemoteModels=false),
//   - pipeline q8 dimuat dari public/vendor/suara/models,
//   - transkripsi Float32Array sintetis 1 detik menghasilkan string,
//   - fetch ke host eksternal dilarang keras (tidak boleh ada unduhan),
//   - statusModel() diuji dengan fetch palsu (siap/belum/tidak-ada).
//
// Tidak ada dependency tambahan dan tidak ada jaringan.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  WHISPER_MODEL_FILES,
  WHISPER_MODEL_ID,
  STATUS_MODEL,
  muatModel,
  transkripsi,
  statusModel
} from '../app/js/suara/whisperEngine.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MODEL_DIR = path.join(ROOT, 'public', 'vendor', 'suara', 'models');
const TRANSFORMERS_DIR = path.join(ROOT, 'node_modules', '@huggingface', 'transformers');
const MANIFEST_PATH = '/vendor/suara/manifest.json';

const MODEL_FILES_ADA = WHISPER_MODEL_FILES.every((relatif) =>
  existsSync(path.join(MODEL_DIR, 'Xenova', 'whisper-base', relatif))
);
const TRANSFORMERS_ADA = existsSync(path.join(TRANSFORMERS_DIR, 'package.json'));
const MODEL_TERSEDIA = MODEL_FILES_ADA && TRANSFORMERS_ADA;

function manifestLengkap(jumlahBerkas = WHISPER_MODEL_FILES.length) {
  return {
    engine: 'whisper',
    model: { id: WHISPER_MODEL_ID, quantization: 'q8', bytes: 81_265_296 },
    runtimeExternalRequests: 0,
    files: WHISPER_MODEL_FILES.slice(0, jumlahBerkas).map((relatif) => ({
      path: relatif,
      bytes: 1024
    }))
  };
}

function fetchManifest(manifest) {
  const panggilan = [];
  const fetchImpl = async (url) => {
    panggilan.push(String(url));
    return { ok: true, status: 200, async json() { return manifest; } };
  };
  fetchImpl.panggilan = panggilan;
  return fetchImpl;
}

// ---------------------------------------------------------------------------
// statusModel — selalu dijalankan (tanpa model nyata)
// ---------------------------------------------------------------------------

test('statusModel: manifest engine whisper + 12 berkas -> siap', async () => {
  const fetchImpl = fetchManifest(manifestLengkap());
  const hasil = await statusModel({ fetchImpl });

  assert.equal(hasil.status, STATUS_MODEL.SIAP);
  assert.equal(hasil.engine, 'whisper');
  assert.equal(hasil.modelId, WHISPER_MODEL_ID);
  assert.equal(hasil.files, WHISPER_MODEL_FILES.length);
  assert.ok(hasil.bytes > 0);
  // Hanya manifest yang dibaca; model tidak dimuat.
  assert.deepEqual(fetchImpl.panggilan, [MANIFEST_PATH]);
});

test('statusModel: berkas kurang -> belum', async () => {
  const fetchImpl = fetchManifest(manifestLengkap(WHISPER_MODEL_FILES.length - 1));
  const hasil = await statusModel({ fetchImpl });
  assert.equal(hasil.status, STATUS_MODEL.BELUM);
  assert.equal(hasil.files, WHISPER_MODEL_FILES.length - 1);
});

test('statusModel: 404 / JSON rusak / manifest salah -> tidak-ada', async () => {
  const notFound = await statusModel({
    fetchImpl: async () => ({ ok: false, status: 404, async json() { throw new Error('no'); } })
  });
  assert.equal(notFound.status, STATUS_MODEL.TIDAK_ADA);

  const rusak = await statusModel({
    fetchImpl: async () => ({ ok: true, status: 200, async json() { throw new Error('rusak'); } })
  });
  assert.equal(rusak.status, STATUS_MODEL.TIDAK_ADA);

  const engineSalah = await statusModel({
    fetchImpl: fetchManifest({ ...manifestLengkap(), engine: 'vosk' })
  });
  assert.equal(engineSalah.status, STATUS_MODEL.TIDAK_ADA);

  const idSalah = await statusModel({
    fetchImpl: fetchManifest({
      ...manifestLengkap(),
      model: { id: 'Xenova/lain', quantization: 'q8' }
    })
  });
  assert.equal(idSalah.status, STATUS_MODEL.TIDAK_ADA);
});

// ---------------------------------------------------------------------------
// Integrasi model nyata — skip jelas bila belum di-vendor
// ---------------------------------------------------------------------------

test('integrasi Whisper lokal q8 (skip bila model/paket tidak ada)', { timeout: 120_000 }, async (t) => {
  if (!MODEL_TERSEDIA) {
    t.skip(
      'Model Whisper lokal tidak tersedia; jalankan npm run vendor:whisper'
    );
    return;
  }

  const mod = await import('@huggingface/transformers');
  const env = mod.env;
  assert.ok(env, 'transformers harus mengekspor env');

  // Kunci ke model lokal: tidak ada fallback CDN/unduhan.
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = MODEL_DIR;

  // Patch fetch: host eksternal dilarang. Same-origin/localhost diizinkan.
  const fetchAsli = globalThis.fetch;
  const eksternal = [];
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : String(input?.url ?? input);
    let host = '';
    try {
      host = new URL(url, 'file:///').hostname;
    } catch {
      host = '';
    }
    if (!['', 'localhost', '127.0.0.1', '::1'].includes(host)) {
      eksternal.push(url);
      throw new Error(`Unduhan eksternal dilarang saat verifikasi: ${url}`);
    }
    if (typeof fetchAsli !== 'function') throw new Error('fetch tidak tersedia.');
    return fetchAsli(input, init);
  };

  let pipeline = null;
  try {
    pipeline = await muatModel({ transformerModule: mod, modelPath: MODEL_DIR });
    assert.ok(pipeline && typeof pipeline.asr === 'function');

    // Audio sintetis 1 detik @ 16 kHz (senyap).
    const audio = new Float32Array(16_000);
    const hasil = await transkripsi(audio, { asr: pipeline.asr });

    assert.equal(typeof hasil.teks, 'string');
    assert.doesNotThrow(() => JSON.stringify(hasil));
    assert.equal(hasil.kepercayaan, null);
    assert.deepEqual(eksternal, [], 'tidak boleh ada request ke host eksternal');
  } finally {
    globalThis.fetch = fetchAsli;
    if (pipeline && typeof pipeline.dispose === 'function') {
      await pipeline.dispose();
    }
  }

  assert.deepEqual(eksternal, [], 'tidak boleh ada unduhan model saat verifikasi');
});
