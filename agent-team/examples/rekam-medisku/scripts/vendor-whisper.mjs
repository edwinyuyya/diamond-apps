#!/usr/bin/env node
// scripts/vendor-whisper.mjs — menyiapkan aset ASR offline Whisper (CONTRACT.md 2, 8B.3).
//
// HANYA berjalan saat build/vendoring. Yang disalin:
//   1. `@huggingface/transformers@4.3.2` dari node_modules -> transformers/transformers.min.js
//   2. ONNX Runtime WASM dari `onnxruntime-web` -> onnx/ort-wasm-simd-threaded.{wasm,mjs}
//      (plus varian .jsep.* bila paket menyediakannya)
//   3. 12 berkas model Xenova/whisper-base q8 dari WHISPER_MODEL_SOURCE (lokal) atau,
//      bila diizinkan, diunduh saat vendoring dari WHISPER_MODEL_BASE_URL.
//
// Unduhan hanya terjadi saat build. Aplikasi tidak pernah memuat apa pun dari jaringan:
// semua aset disajikan same-origin dari /vendor/suara/.
//
// Pemakaian:
//   npm install
//   npm run vendor:whisper
//
// Env (lihat CONTRACT.md bagian 2):
//   WHISPER_VENDOR_DIR, WHISPER_MODEL_ID, WHISPER_MODEL_BASE_URL,
//   WHISPER_MODEL_SOURCE, WHISPER_ALLOW_DOWNLOAD

import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Node < 24 tidak memakai HTTPS_PROXY pada fetch global. Bila proxy diatur,
// jalankan ulang proses dengan flag resmi --use-env-proxy (build-time saja).
// Di lingkungan tanpa proxy, tidak ada re-exec dan fetch berjalan normal.
const PROXY_ENV =
  process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY;
if (PROXY_ENV && !process.execArgv.includes('--use-env-proxy')) {
  const hasil = spawnSync(
    process.execPath,
    ['--use-env-proxy', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: 'inherit', env: process.env }
  );
  process.exit(hasil.status ?? 1);
}

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
const VENDOR_DIR = path.resolve(
  process.env.WHISPER_VENDOR_DIR || path.join(ROOT_DIR, 'public', 'vendor', 'suara')
);
const REQUIRED_TRANSFORMERS_VERSION = '4.3.2';
const MODEL_ID = (process.env.WHISPER_MODEL_ID || 'Xenova/whisper-base').trim();
const MODEL_BASE_URL = (
  process.env.WHISPER_MODEL_BASE_URL ||
  `https://huggingface.co/${MODEL_ID}/resolve/main/`
).trim();
const MODEL_SOURCE = path.resolve(
  process.env.WHISPER_MODEL_SOURCE || path.join(ROOT_DIR, 'vendor-src', 'whisper-base')
);
const ALLOW_DOWNLOAD = String(process.env.WHISPER_ALLOW_DOWNLOAD ?? '1').trim() !== '0';
const ALLOWED_HOSTS = new Set(['huggingface.co', 'us.aws.cdn.hf.co']);

const MODULE_REL = 'transformers/transformers.min.js';
// Varian `asyncify` dipakai transformers.js 4.x untuk backend WASM (CPU): tanpa itu mesin gagal memuat
// di browser (404) walau semua berkas model ada. Ditemukan lewat uji browser sungguhan.
const WASM_REQUIRED = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.asyncify.wasm',
  'ort-wasm-simd-threaded.asyncify.mjs'
];
const WASM_OPTIONAL = [
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.mjs'
];
// 12 berkas model wajib, relatif terhadap models/<MODEL_ID>/.
const MODEL_FILES = [
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
];

const INSTALL_HINT = [
  'Paket vendoring ASR belum terpasang atau versinya salah.',
  'Jalankan dari root proyek:',
  '  npm install',
  '  npm run vendor:whisper',
  `Wajib @huggingface/transformers@${REQUIRED_TRANSFORMERS_VERSION} dan onnxruntime-web.`
].join('\n');

function log(pesan) {
  process.stdout.write(`${pesan}\n`);
}

async function adaFile(filePath) {
  try {
    const info = await stat(filePath);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

async function ukuran(filePath) {
  try {
    const info = await stat(filePath);
    return info.isFile() ? info.size : 0;
  } catch {
    return 0;
  }
}

async function sha256File(filePath) {
  const hash = createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

// Resolve `package.json` paket tanpa mengandalkan subpath "./package.json"
// (beberapa paket membatasi "exports"). Kita resolve entry point lalu naik
// sampai menemukan package.json dengan nama paket yang cocok.
function resolveDariPaket(namaPaket, dariPackageJson = path.join(ROOT_DIR, 'package.json')) {
  const requireFrom = createRequire(dariPackageJson);
  let entry;
  try {
    entry = requireFrom.resolve(namaPaket);
  } catch (error) {
    const gagal = new Error(`${INSTALL_HINT}\n\nDetail: ${error.message}`);
    gagal.penyebab = 'INSTALL';
    throw gagal;
  }
  let dir = path.dirname(entry);
  for (;;) {
    const kandidat = path.join(dir, 'package.json');
    if (existsSync(kandidat)) {
      try {
        const data = JSON.parse(readFileSync(kandidat, 'utf8'));
        if (data.name === namaPaket) return kandidat;
      } catch {
        // Lanjut naik.
      }
    }
    const induk = path.dirname(dir);
    if (induk === dir) break;
    dir = induk;
  }
  const gagal = new Error(
    `${INSTALL_HINT}\n\nTidak menemukan package.json untuk ${namaPaket}.`
  );
  gagal.penyebab = 'INSTALL';
  throw gagal;
}

async function bacaVersi(packageJsonPath) {
  const data = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  return data;
}

function normalisasiBaseUrl(baseUrl) {
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:') {
    throw new Error(`WHISPER_MODEL_BASE_URL harus https: ${baseUrl}`);
  }
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(
      `Host WHISPER_MODEL_BASE_URL tidak diizinkan: ${url.hostname}. ` +
        `Hanya ${[...ALLOWED_HOSTS].join(', ')}.`
    );
  }
  return url.href.endsWith('/') ? url.href : `${url.href}/`;
}

function pastikanUrlDiizinkan(rawUrl, konteks) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`${konteks}: URL tidak valid: ${rawUrl}`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`${konteks}: hanya https yang diizinkan: ${url.href}`);
  }
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(
      `${konteks}: host tidak diizinkan: ${url.hostname} (${url.href}). ` +
        `Hanya ${[...ALLOWED_HOSTS].join(', ')}.`
    );
  }
  return url;
}

// fetch yang memvalidasi host setiap URL, termasuk setiap redirect.
async function fetchDiizinkan(rawUrl, konteks) {
  let current = pastikanUrlDiizinkan(rawUrl, konteks);
  for (let langkah = 0; langkah < 6; langkah += 1) {
    const response = await fetch(current.href, { redirect: 'manual' });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`${konteks}: redirect ${response.status} tanpa Location.`);
      }
      const berikutnya = new URL(location, current);
      current = pastikanUrlDiizinkan(berikutnya.href, `${konteks} (redirect)`);
      continue;
    }
    if (!response.ok) {
      throw new Error(`${konteks}: HTTP ${response.status} dari ${current.href}`);
    }
    return response;
  }
  throw new Error(`${konteks}: terlalu banyak redirect.`);
}

async function unduhBerkas(url, tujuan, konteks) {
  const response = await fetchDiizinkan(url, konteks);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error(`${konteks}: unduhan kosong dari ${url}`);
  }
  await mkdir(path.dirname(tujuan), { recursive: true });
  await writeFile(tujuan, buffer);
}

// Salin 12 berkas model dari sumber lokal; true bila lengkap.
async function salinModelLokal(tujuanModel) {
  if (!(await stat(MODEL_SOURCE).catch(() => null))) return false;
  for (const rel of MODEL_FILES) {
    if (!(await adaFile(path.join(MODEL_SOURCE, rel)))) return false;
  }
  for (const rel of MODEL_FILES) {
    const dari = path.join(MODEL_SOURCE, rel);
    const ke = path.join(tujuanModel, rel);
    await mkdir(path.dirname(ke), { recursive: true });
    await copyFile(dari, ke);
  }
  log(`Model disalin dari sumber lokal: ${MODEL_SOURCE}`);
  return true;
}

async function unduhModel(tujuanModel, baseUrl) {
  const dasar = normalisasiBaseUrl(baseUrl);
  log(`Mengunduh 12 berkas model (build-time) dari ${dasar}`);
  for (const rel of MODEL_FILES) {
    const url = new URL(rel, dasar).href;
    const ke = path.join(tujuanModel, rel);
    log(`  - ${rel}`);
    await unduhBerkas(url, ke, `model ${rel}`);
  }
}

async function salinRuntime(tujuanVendor) {
  // 1. transformers.js
  const transformersPkgJson = resolveDariPaket('@huggingface/transformers');
  const transformersPkg = await bacaVersi(transformersPkgJson);
  if (transformersPkg.version !== REQUIRED_TRANSFORMERS_VERSION) {
    throw new Error(
      `${INSTALL_HINT}\n\nVersi terpasang: ${transformersPkg.version}; ` +
        `wajib ${REQUIRED_TRANSFORMERS_VERSION}.`
    );
  }
  const distDir = path.join(path.dirname(transformersPkgJson), 'dist');
  let modulSumber = path.join(distDir, 'transformers.min.js');
  if (!(await adaFile(modulSumber))) {
    modulSumber = path.join(distDir, 'transformers.js');
  }
  if (!(await adaFile(modulSumber))) {
    throw new Error(
      `Tidak menemukan dist/transformers.min.js atau dist/transformers.js di ` +
        `@huggingface/transformers@${REQUIRED_TRANSFORMERS_VERSION}.`
    );
  }
  const modulTujuan = path.join(tujuanVendor, MODULE_REL);
  await mkdir(path.dirname(modulTujuan), { recursive: true });
  await copyFile(modulSumber, modulTujuan);

  // 2. ONNX Runtime WASM — resolve dari paket transformers agar menemukan
  //    dependensi bersarang bila npm tidak meng-hoist-nya.
  let onnxPkgJson;
  try {
    onnxPkgJson = resolveDariPaket('onnxruntime-web', transformersPkgJson);
  } catch {
    onnxPkgJson = resolveDariPaket('onnxruntime-web');
  }
  const onnxDist = path.join(path.dirname(onnxPkgJson), 'dist');
  const onnxTujuan = path.join(tujuanVendor, 'onnx');
  await mkdir(onnxTujuan, { recursive: true });

  for (const nama of WASM_REQUIRED) {
    const sumber = path.join(onnxDist, nama);
    if (!(await adaFile(sumber))) {
      throw new Error(
        `Aset ONNX Runtime wajib tidak ditemukan: onnxruntime-web/dist/${nama}. ` +
          'Pastikan onnxruntime-web terpasang (npm install).'
      );
    }
    await copyFile(sumber, path.join(onnxTujuan, nama));
  }
  for (const nama of WASM_OPTIONAL) {
    const sumber = path.join(onnxDist, nama);
    if (await adaFile(sumber)) {
      await copyFile(sumber, path.join(onnxTujuan, nama));
    }
  }
}

function daftarAset(vendorDir, wasmNames) {
  return [
    MODULE_REL,
    ...wasmNames.map((nama) => `onnx/${nama}`)
  ];
}

async function tulisManifest(stagingDir, wasmNames) {
  const relatifAset = daftarAset(stagingDir, wasmNames);
  const modelDirRel = path.posix.join('models', MODEL_ID);
  const relatifModel = MODEL_FILES.map((rel) => path.posix.join(modelDirRel, rel));
  const semua = [...relatifAset, ...relatifModel];

  const files = [];
  let totalModelBytes = 0;
  for (const rel of semua) {
    const absolut = path.join(stagingDir, ...rel.split('/'));
    const bytes = await ukuran(absolut);
    if (bytes <= 0) {
      throw new Error(`Berkas hasil vendoring kosong/tidak ada: ${rel}`);
    }
    if (rel.endsWith('.onnx') && bytes < 1024 * 1024) {
      throw new Error(`Berkas .onnx terlalu kecil (${bytes} byte): ${rel}`);
    }
    const sha256 = await sha256File(absolut);
    files.push({ path: rel, bytes, sha256 });
    if (rel.startsWith(`${modelDirRel}/`)) totalModelBytes += bytes;
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    engine: 'whisper',
    license: 'Apache-2.0',
    packages: { '@huggingface/transformers': REQUIRED_TRANSFORMERS_VERSION },
    model: {
      id: MODEL_ID,
      quantization: 'q8',
      sampleRate: 16000,
      language: 'indonesian',
      bytes: totalModelBytes,
      source: 'build-time-only'
    },
    entry: {
      module: '/vendor/suara/transformers/transformers.min.js',
      wasmPath: '/vendor/suara/onnx/',
      modelPath: '/vendor/suara/models/',
      modelId: MODEL_ID
    },
    files,
    runtimeExternalRequests: 0
  };

  await writeFile(
    path.join(stagingDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );
  return { manifest, files, totalModelBytes };
}

async function verifikasiAkhir(vendorDir, wasmNames) {
  for (const rel of daftarAset(vendorDir, wasmNames)) {
    if (!(await adaFile(path.join(vendorDir, ...rel.split('/'))))) {
      throw new Error(`Verifikasi gagal: aset runtime tidak ada/kosong: ${rel}`);
    }
  }
  const modelDirRel = path.posix.join('models', MODEL_ID);
  for (const rel of MODEL_FILES) {
    const absolut = path.join(vendorDir, ...path.posix.join(modelDirRel, rel).split('/'));
    const bytes = await ukuran(absolut);
    if (bytes <= 0) {
      throw new Error(`Verifikasi gagal: berkas model tidak ada/kosong: ${rel}`);
    }
    if (rel.endsWith('.onnx') && bytes < 1024 * 1024) {
      throw new Error(`Verifikasi gagal: .onnx terlalu kecil (${bytes} byte): ${rel}`);
    }
  }
  const teks = await readFile(path.join(vendorDir, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(teks);
  if (manifest.files.length < 15) {
    throw new Error(`Verifikasi gagal: files.length=${manifest.files.length}, wajib >= 15.`);
  }
  if (teks.includes('PLACEHOLDER')) {
    throw new Error('Verifikasi gagal: manifest masih memuat string PLACEHOLDER.');
  }
  if (manifest.engine !== 'whisper' || manifest.runtimeExternalRequests !== 0) {
    throw new Error('Verifikasi gagal: field manifest engine/runtimeExternalRequests salah.');
  }
}

async function main() {
  log('Vendoring aset Whisper offline...');

  // Resolve paket lebih dulu supaya pesan "npm install" muncul sebelum
  // menyentuh public/vendor/suara.
  const transformersPkgJson = resolveDariPaket('@huggingface/transformers');
  const transformersPkg = await bacaVersi(transformersPkgJson);
  if (transformersPkg.version !== REQUIRED_TRANSFORMERS_VERSION) {
    throw new Error(
      `${INSTALL_HINT}\n\nVersi terpasang: ${transformersPkg.version}; ` +
        `wajib ${REQUIRED_TRANSFORMERS_VERSION}.`
    );
  }

  const vendorParent = path.dirname(VENDOR_DIR);
  await mkdir(vendorParent, { recursive: true });
  // Staging di filesystem yang sama agar rename() tidak gagal EXDEV.
  const stagingParent = await mkdtemp(path.join(vendorParent, '.suara-staging-'));
  const stagingDir = path.join(stagingParent, 'suara');
  await mkdir(stagingDir, { recursive: true });

  try {
    await salinRuntime(stagingDir);
    log('Runtime transformers + ONNX WASM disalin.');

    const wasmNames = [];
    for (const nama of WASM_REQUIRED) wasmNames.push(nama);
    for (const nama of WASM_OPTIONAL) {
      if (await adaFile(path.join(stagingDir, 'onnx', nama))) wasmNames.push(nama);
    }

    const modelDirRel = path.posix.join('models', MODEL_ID);
    const tujuanModel = path.join(stagingDir, ...modelDirRel.split('/'));
    await mkdir(tujuanModel, { recursive: true });

    const dariLokal = await salinModelLokal(tujuanModel);
    if (!dariLokal) {
      if (!ALLOW_DOWNLOAD) {
        throw new Error(
          `WHISPER_MODEL_SOURCE tidak lengkap (${MODEL_SOURCE}) dan ` +
            'WHISPER_ALLOW_DOWNLOAD=0. Tidak ada berkas model yang dapat disalin.'
        );
      }
      await unduhModel(tujuanModel, MODEL_BASE_URL);
    }

    // Validasi model sebelum manifest ditulis.
    for (const rel of MODEL_FILES) {
      const bytes = await ukuran(path.join(tujuanModel, ...rel.split('/')));
      if (bytes <= 0) throw new Error(`Berkas model kosong: ${rel}`);
      if (rel.endsWith('.onnx') && bytes < 1024 * 1024) {
        throw new Error(`Berkas .onnx terlalu kecil (${bytes} byte): ${rel}`);
      }
    }

    const { manifest, totalModelBytes } = await tulisManifest(stagingDir, wasmNames);

    // Ganti folder secara atomik agar tidak ada artefak ASR lama yang tersisa.
    await rm(VENDOR_DIR, { recursive: true, force: true });
    await rename(stagingDir, VENDOR_DIR);
    await verifikasiAkhir(VENDOR_DIR, wasmNames);

    log('');
    log(`Manifest: ${path.join(VENDOR_DIR, 'manifest.json')}`);
    log(`Engine: ${manifest.engine} | Model: ${manifest.model.id} (q8)`);
    log(`Aset: ${manifest.files.length} berkas | model ${totalModelBytes} byte`);
    log('Vendoring Whisper selesai. Tidak ada unduhan saat runtime.');
  } finally {
    await rm(stagingParent, { recursive: true, force: true });
  }
}

main().catch(async (error) => {
  process.stderr.write(`\nGAGAL vendoring Whisper: ${error.message}\n`);
  process.exitCode = 1;
});
