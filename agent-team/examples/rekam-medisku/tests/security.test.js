// t16 QA — keamanan: kripto, cadangan, QR, larangan URL eksternal, CSP, OCR cloud nonaktif, vendor.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as cryptoApi from '../app/js/crypto.js';
import * as backup from '../app/js/backup.js';
import { encodeQR, qrToSvg, emergencyPayload, utf8Length, QRError } from '../app/js/qr.js';
import { OCR_ENGINES, createCloudOcrAdapter } from '../app/js/ocr/adaptor.js';
import { createEmptyState } from '../app/js/model.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ITERATIONS = 1000; // iterasi rendah khusus test

async function filesUnder(dir, extensions) {
  const result = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...await filesUnder(full, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      result.push(full);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// crypto
// ---------------------------------------------------------------------------

test('crypto: roundtrip AES-GCM/PBKDF2, envelope, base64, kata sandi salah', async () => {
  const payload = { app: 'rawatku', n: 42, teks: 'halo dunia' };
  const envelope = await cryptoApi.encryptJSON(payload, 'kata-sandi-uji', { iterations: ITERATIONS });

  assert.equal(envelope.alg, 'AES-GCM-256');
  assert.equal(envelope.kdf, 'PBKDF2-SHA256');
  assert.equal(envelope.iterations, ITERATIONS);
  assert.equal(typeof envelope.salt, 'string');
  assert.equal(typeof envelope.iv, 'string');
  assert.equal(typeof envelope.ciphertext, 'string');
  assert.equal(cryptoApi.fromBase64(envelope.salt).length, 16);
  assert.equal(cryptoApi.fromBase64(envelope.iv).length, 12);
  assert.notDeepEqual(cryptoApi.fromBase64(envelope.ciphertext), Buffer.from(JSON.stringify(payload)));

  assert.deepEqual(await cryptoApi.decryptJSON(envelope, 'kata-sandi-uji'), payload);

  await assert.rejects(
    () => cryptoApi.decryptJSON(envelope, 'salah'),
    (error) => error instanceof cryptoApi.CryptoError && error.code === 'KATA_SANDI_SALAH'
  );

  const bytes = cryptoApi.randomBytes(32);
  assert.ok(bytes instanceof Uint8Array);
  assert.equal(bytes.length, 32);
  assert.deepEqual(cryptoApi.fromBase64(cryptoApi.toBase64(bytes)), bytes);

  const key = await cryptoApi.deriveKey('sandi', cryptoApi.randomBytes(16), ITERATIONS);
  const sealedA = await cryptoApi.sealWithKey({ rahasia: 'x' }, key);
  const sealedB = await cryptoApi.sealWithKey({ rahasia: 'x' }, key);
  assert.notEqual(sealedA.iv, sealedB.iv);
  assert.deepEqual(await cryptoApi.openWithKey(sealedA, key), { rahasia: 'x' });
  assert.equal(cryptoApi.cryptoAvailable(), true);
});

// ---------------------------------------------------------------------------
// backup
// ---------------------------------------------------------------------------

test('backup: plain & terenkripsi, filename, photoCount, semua kode error', async () => {
  const state = createEmptyState({ now: new Date(2026, 10, 9, 10, 5, 0) });
  const now = new Date(2026, 10, 9, 10, 5, 0);

  const plain = await backup.createBackup(state, { now, photoCount: 2 });
  assert.equal(plain.filename, 'rawatku-cadangan-20261109-1005.rawatku.json');
  assert.equal(plain.meta.encrypted, false);
  assert.equal(plain.meta.photoCount, 2);
  assert.equal(plain.meta.schemaVersion, 1);
  const plainFile = JSON.parse(plain.text);
  assert.equal(plainFile.app, 'rawatku');
  assert.equal(plainFile.format, 'rawatku-backup');
  assert.equal(plainFile.version, 1);
  assert.equal(plainFile.encrypted, false);

  const readPlain = await backup.readBackup(plain.text);
  assert.equal(readPlain.state.profiles.length, 1);
  assert.equal(readPlain.meta.encrypted, false);

  const encrypted = await backup.createBackup(state, { password: 'sandi', now });
  assert.equal(encrypted.meta.encrypted, true);
  assert.equal(JSON.parse(encrypted.text).encrypted, true);
  const readEncrypted = await backup.readBackup(encrypted.text, { password: 'sandi' });
  assert.equal(readEncrypted.state.profiles.length, 1);

  const wrongFormat = JSON.stringify({ app: 'rawatku', format: 'lain', version: 1 });
  await assert.rejects(() => backup.readBackup(wrongFormat),
    (e) => e instanceof backup.BackupError && e.code === 'BUKAN_CADANGAN_RAWATKU');
  await assert.rejects(() => backup.readBackup(JSON.stringify({ app: 'rawatku', format: 'rawatku-backup', version: 2 })),
    (e) => e.code === 'VERSI_TIDAK_DIDUKUNG');
  await assert.rejects(() => backup.readBackup(encrypted.text),
    (e) => e.code === 'CADANGAN_TERKUNCI');
  await assert.rejects(() => backup.readBackup(encrypted.text, { password: 'salah' }),
    (e) => e.code === 'KATA_SANDI_SALAH');
});

// ---------------------------------------------------------------------------
// QR
// ---------------------------------------------------------------------------

test('qr: versi 1 ukuran 21, finder pattern, determinisme, kapasitas, payload <= 200 byte', () => {
  const qr = encodeQR('RAWATKU');
  assert.equal(qr.version, 1);
  assert.equal(qr.size, 21);
  assert.equal(qr.modules.length, 21);
  assert.equal(qr.modules[0].length, 21);
  // Finder pattern 7x7 di tiga sudut: modul luar gelap, cincin dalam terang, pusat gelap.
  for (const [row, col] of [[0, 0], [0, 14], [14, 0]]) {
    assert.ok(qr.modules[row][col]);
    assert.equal(qr.modules[row + 1][col + 1], false);
    assert.ok(qr.modules[row + 3][col + 3]);
  }
  assert.deepEqual(encodeQR('RAWATKU'), qr);

  assert.throws(() => encodeQR('X'.repeat(5000)), (error) => error instanceof QRError && error.code === 'QR_TERLALU_PANJANG');

  const payload = emergencyPayload({
    name: 'Budi Santoso',
    bloodType: 'O+',
    allergies: ['penisilin'],
    chronicConditions: ['hipertensi'],
    emergencyContacts: [{ name: 'Siti', relation: 'Istri', phone: '081234567890' }]
  }, [
    { name: 'Amlodipin', dose: '5', doseUnit: 'mg', times: ['08:00'], active: true }
  ]);
  assert.ok(utf8Length(payload.text) <= 200);
  assert.equal(payload.bytes, utf8Length(payload.text));
  assert.match(payload.text, /112/);
  assert.match(payload.text, /119/);
  assert.match(payload.text, /REKAM-MEDISKU-DARURAT v1/);

  assert.throws(
    () => emergencyPayload({ name: 'Budi' }, [], { maxBytes: 10 }),
    (error) => error instanceof QRError && error.code === 'QR_TERLALU_PANJANG'
  );

  const svg = qrToSvg(qr, { ariaLabel: '<script>alert(1)</script>' });
  assert.match(svg, /role="img"/);
  assert.match(svg, /<title>/);
  assert.match(svg, /viewBox/);
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;/);
});

// ---------------------------------------------------------------------------
// Larangan jaringan eksternal & CSP
// ---------------------------------------------------------------------------

test('sumber aplikasi tidak memuat URL eksternal selain namespace SVG w3.org', async () => {
  const files = [
    path.join(ROOT, 'app', 'index.html'),
    ...await filesUnder(path.join(ROOT, 'app', 'js'), ['.js']),
    ...await filesUnder(path.join(ROOT, 'app', 'css'), ['.css'])
  ];
  const urlPattern = /https?:\/\/[^\s"'<>)]+/g;
  const offending = [];
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const match of text.match(urlPattern) || []) {
      const allowed = match === 'http://www.w3.org/2000/svg'
        || match.startsWith('http://www.w3.org/2000/svg');
      if (!allowed) offending.push(`${path.relative(ROOT, file)}: ${match}`);
    }
  }
  assert.deepEqual(offending, [], `URL eksternal ditemukan:\n${offending.join('\n')}`);
});

test('CSP memuat wasm-unsafe-eval, worker-src self blob, dan connect-src self', async () => {
  const html = await readFile(path.join(ROOT, 'app', 'index.html'), 'utf8');
  const meta = html.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i);
  assert.ok(meta, 'meta CSP tidak ditemukan');
  const content = meta[0].match(/content="([^"]+)"/i)[1];

  assert.match(content, /connect-src\s+'self'/);
  assert.doesNotMatch(content, /connect-src\s+[^;]*(?:\*|https:)/);
  assert.match(content, /'wasm-unsafe-eval'/);
  assert.match(content, /worker-src\s+'self'\s+blob:/);
  assert.match(content, /object-src\s+'none'/);
});

test('OCR cloud nonaktif: metadata enabled=false, adaptor melempar, tidak ada API key', async () => {
  assert.equal(OCR_ENGINES.cloud.enabled, false);
  assert.equal(OCR_ENGINES.cloud.documentationOnly, true);
  assert.throws(() => createCloudOcrAdapter(),
    (error) => error.code === 'OCR_CLOUD_NONAKTIF');

  const sources = [
    await readFile(path.join(ROOT, 'app', 'js', 'ocr', 'adaptor.js'), 'utf8'),
    await readFile(path.join(ROOT, 'app', 'js', 'ocr', 'tesseractEngine.js'), 'utf8')
  ].join('\n');
  assert.doesNotMatch(sources, /api[_-]?key|authorization|bearer\s+[a-z0-9]/i);
  assert.doesNotMatch(sources, /https?:\/\//i);
});

test('vendor manifest tidak memuat URL eksternal dan semua path berada di folder vendor', async () => {
  const manifestPath = path.join(ROOT, 'public', 'vendor', 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.ok(Array.isArray(manifest.files) && manifest.files.length > 0);
  for (const file of manifest.files) {
    assert.equal(typeof file.path, 'string');
    assert.doesNotMatch(file.path, /https?:|^\/|^[A-Za-z]:|\0/);
    assert.equal(file.path.split('/').includes('..'), false, `path keluar vendor: ${file.path}`);
  }
  const text = await readFile(manifestPath, 'utf8');
  assert.doesNotMatch(text, /https?:\/\//i);
});

test('draf pindai tidak memakai localStorage/sessionStorage', async () => {
  const files = [
    'scanSession.js',
    path.join('ui', 'scan.js'),
    path.join('ui', 'photo-capture.js'),
    path.join('ui', 'scan-review.js'),
    'photos.js'
  ];
  for (const relative of files) {
    const text = await readFile(path.join(ROOT, 'app', 'js', relative), 'utf8');
    assert.doesNotMatch(text, /\b(?:localStorage|sessionStorage)\s*[.[]/, `${relative} memakai storage draf`);
  }
  const session = await readFile(path.join(ROOT, 'app', 'js', 'scanSession.js'), 'utf8');
  assert.doesNotMatch(session, /\bindexedDB\b|\bindexedDB\./);
});
