#!/usr/bin/env node
// scripts/vendor-ocr.mjs — menyalin Tesseract.js + WASM + traineddata ke public/vendor.
//
// Skrip ini HANYA membaca node_modules (devDependencies) dan menulis ke public/vendor/.
// Tidak ada unduhan dari internet. Aman dijalankan berulang (idempoten): folder vendor
// dibersihkan lalu diisi ulang, sehingga tidak ada berkas asing yang tertinggal.
//
// Pemakaian:
//   npm install
//   npm run vendor:ocr

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rm, readdir, copyFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
const VENDOR_DIR = path.resolve(
  process.env.VENDOR_DIR || path.join(ROOT_DIR, 'public', 'vendor')
);
const requireFromRoot = createRequire(path.join(ROOT_DIR, 'package.json'));

const PACKAGE_NAMES = {
  tesseract: 'tesseract.js',
  core: 'tesseract.js-core',
  ind: '@tesseract.js-data/ind',
  eng: '@tesseract.js-data/eng'
};

const INSTALL_HINT = [
  'Paket OCR belum terpasang.',
  'Jalankan dari root proyek:',
  '  npm install',
  '  npm run vendor:ocr'
].join('\n');

/** Cari direktori paket lewat node_modules; lempar pesan jelas bila belum di-install. */
function resolvePackageDir(name) {
  try {
    const pkgJson = requireFromRoot.resolve(`${name}/package.json`);
    return { dir: path.dirname(pkgJson), version: null };
  } catch {
    throw new Error(`Paket "${name}" tidak ditemukan di node_modules.\n${INSTALL_HINT}`);
  }
}

async function readPackageVersion(dir) {
  try {
    const raw = await readFile(path.join(dir, 'package.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed.version === 'string' ? parsed.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function assertFile(filePath, label) {
  let info;
  try {
    info = await stat(filePath);
  } catch {
    throw new Error(`Berkas wajib tidak ditemukan: ${label} (${filePath}).\n${INSTALL_HINT}`);
  }
  if (!info.isFile() || info.size === 0) {
    throw new Error(`Berkas wajib kosong/tidak valid: ${label} (${filePath}).`);
  }
  return info;
}

async function listDir(dir) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Pilih versi traineddata yang dipakai paket (biasanya 4.0.0). */
async function resolveTraineddataVersion(pkgDir, langCode) {
  const indexPath = path.join(pkgDir, 'index.js');
  try {
    const indexSource = await readFile(indexPath, 'utf8');
    const match = indexSource.match(/langPath\s*:\s*path\.join\(\s*__dirname\s*,\s*['"]([^'"]+)['"]\s*\)/);
    if (match) {
      const candidate = match[1];
      const file = path.join(pkgDir, candidate, `${langCode}.traineddata.gz`);
      const info = await assertFile(file, `${langCode}.traineddata.gz`).catch(() => null);
      if (info) return candidate;
    }
  } catch {
    // Abaikan: lanjut ke pemindaian direktori di bawah.
  }

  const dirs = (await listDir(pkgDir))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
  const preferred = dirs.find((name) => name === '4.0.0') || dirs[0];
  if (!preferred) {
    throw new Error(`Data bahasa "${langCode}" tidak ditemukan di ${pkgDir}.\n${INSTALL_HINT}`);
  }
  const file = path.join(pkgDir, preferred, `${langCode}.traineddata.gz`);
  await assertFile(file, `${langCode}.traineddata.gz`);
  return preferred;
}

async function copyInto(sourceFile, destinationRelative) {
  const destination = path.join(VENDOR_DIR, destinationRelative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(sourceFile, destination);
  const info = await stat(destination);
  if (!info.isFile() || info.size === 0) {
    throw new Error(`Gagal menyalin berkas: ${destinationRelative}`);
  }
  return destinationRelative;
}

async function sha256Of(filePath) {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

async function buildManifest() {
  const files = [];
  async function walk(relativeDir) {
    const entries = await listDir(path.join(VENDOR_DIR, relativeDir));
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(rel);
      } else if (entry.isFile()) {
        const absolute = path.join(VENDOR_DIR, rel);
        const info = await stat(absolute);
        files.push({
          path: rel.split(path.sep).join('/'),
          bytes: info.size,
          sha256: await sha256Of(absolute)
        });
      }
    }
  }
  await walk('');
  return files;
}

async function main() {
  const tesseractPkg = resolvePackageDir(PACKAGE_NAMES.tesseract);
  const corePkg = resolvePackageDir(PACKAGE_NAMES.core);
  const indPkg = resolvePackageDir(PACKAGE_NAMES.ind);
  const engPkg = resolvePackageDir(PACKAGE_NAMES.eng);

  const versions = {
    'tesseract.js': await readPackageVersion(tesseractPkg.dir),
    'tesseract.js-core': await readPackageVersion(corePkg.dir),
    '@tesseract.js-data/ind': await readPackageVersion(indPkg.dir),
    '@tesseract.js-data/eng': await readPackageVersion(engPkg.dir)
  };

  // 1) Sumber yang wajib ada (gagal jelas bila paket/dist tidak lengkap).
  const moduleSource = path.join(tesseractPkg.dir, 'dist', 'tesseract.esm.min.js');
  const workerSource = path.join(tesseractPkg.dir, 'dist', 'worker.min.js');
  await assertFile(moduleSource, 'tesseract.js/dist/tesseract.esm.min.js');
  await assertFile(workerSource, 'tesseract.js/dist/worker.min.js');

  const coreEntries = await listDir(corePkg.dir);
  const coreFiles = coreEntries
    .filter((entry) => entry.isFile() && /^tesseract-core.*\.wasm(\.js)?$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const wasmFiles = coreFiles.filter((name) => name.endsWith('.wasm'));
  const wasmJsFiles = coreFiles.filter((name) => name.endsWith('.wasm.js'));
  if (wasmFiles.length === 0 || wasmJsFiles.length === 0) {
    throw new Error(
      'Paket "tesseract.js-core" tidak memuat tesseract-core*.wasm / *.wasm.js.\n' + INSTALL_HINT
    );
  }

  const indVersion = await resolveTraineddataVersion(indPkg.dir, 'ind');
  const engVersion = await resolveTraineddataVersion(engPkg.dir, 'eng');
  const indSource = path.join(indPkg.dir, indVersion, 'ind.traineddata.gz');
  const engSource = path.join(engPkg.dir, engVersion, 'eng.traineddata.gz');
  await assertFile(indSource, 'ind.traineddata.gz');
  await assertFile(engSource, 'eng.traineddata.gz');

  // 2) Bersihkan folder vendor agar tidak ada berkas asing dari percobaan sebelumnya.
  await rm(VENDOR_DIR, { recursive: true, force: true });
  await mkdir(VENDOR_DIR, { recursive: true });

  const copied = [];
  copied.push(await copyInto(moduleSource, 'tesseract/tesseract.esm.min.js'));
  copied.push(await copyInto(workerSource, 'tesseract/worker.min.js'));
  for (const name of coreFiles) {
    copied.push(await copyInto(path.join(corePkg.dir, name), `tesseract-core/${name}`));
  }
  copied.push(await copyInto(indSource, 'lang/ind.traineddata.gz'));
  copied.push(await copyInto(engSource, 'lang/eng.traineddata.gz'));

  // 3) Verifikasi akhir: semua yang dirujuk entry ada dan non-kosong.
  const required = [
    'tesseract/tesseract.esm.min.js',
    'tesseract/worker.min.js',
    'lang/ind.traineddata.gz',
    'lang/eng.traineddata.gz'
  ];
  for (const rel of required) await assertFile(path.join(VENDOR_DIR, rel), rel);
  for (const name of coreFiles) {
    await assertFile(path.join(VENDOR_DIR, 'tesseract-core', name), `tesseract-core/${name}`);
  }

  const files = await buildManifest();
  const manifest = {
    version: '1.1.0',
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    packages: versions,
    files,
    entry: {
      module: '/vendor/tesseract/tesseract.esm.min.js',
      worker: '/vendor/tesseract/worker.min.js',
      corePath: '/vendor/tesseract-core',
      langPath: '/vendor/lang'
    }
  };
  await writeFile(
    path.join(VENDOR_DIR, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );

  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  console.log(`Vendor OCR siap di ${path.relative(ROOT_DIR, VENDOR_DIR) || VENDOR_DIR}`);
  console.log(`  ${files.length} berkas, ${totalBytes} byte`);
  console.log(`  tesseract.js ${versions['tesseract.js']} · data ind ${indVersion} · data eng ${engVersion}`);
  return manifest;
}

main().catch((error) => {
  console.error(`vendor:ocr GAGAL — ${error.message}`);
  process.exitCode = 1;
});
