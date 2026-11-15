// Regresi (laporan uji APK di Android): OCR menggantung di "membaca teks dokumen" karena pengemasan APK
// membuka kompresi berkas .gz dan membuang akhirannya, sehingga /vendor/lang/*.traineddata.gz = 404.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bahasaGzipTersedia, BATAS_MUAT_OCR_MS } from '../app/js/ocr/tesseractEngine.js';

const respons = (status, jenis = 'application/gzip') => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => (k.toLowerCase() === 'content-type' ? jenis : null) }
});

test('data bahasa .gz tersedia -> gzip dipakai', async () => {
  const diminta = [];
  const fetchImpl = async (url) => { diminta.push(url); return respons(200); };
  assert.equal(await bahasaGzipTersedia('/vendor/lang', ['ind', 'eng'], fetchImpl), true);
  assert.deepEqual(diminta, ['/vendor/lang/ind.traineddata.gz', '/vendor/lang/eng.traineddata.gz']);
});

test('APK: .gz tidak ada (404) -> gzip dimatikan agar memakai .traineddata biasa', async () => {
  const fetchImpl = async () => respons(404, 'text/plain');
  assert.equal(await bahasaGzipTersedia('/vendor/lang', ['ind', 'eng'], fetchImpl), false);
});

test('"berhasil" tetapi berupa halaman HTML pengganti -> dianggap tidak ada', async () => {
  const fetchImpl = async () => respons(200, 'text/html; charset=utf-8');
  assert.equal(await bahasaGzipTersedia('/vendor/lang', ['ind'], fetchImpl), false);
});

test('salah satu bahasa tidak ada atau jaringan error -> gzip dimatikan, tidak melempar', async () => {
  const sebagian = async (url) => (url.includes('/eng.') ? respons(404) : respons(200));
  assert.equal(await bahasaGzipTersedia('/vendor/lang', ['ind', 'eng'], sebagian), false);
  const rusak = async () => { throw new TypeError('network'); };
  assert.equal(await bahasaGzipTersedia('/vendor/lang', ['ind'], rusak), false);
});

test('ada batas waktu memuat mesin OCR (tidak menggantung tanpa akhir)', () => {
  assert.ok(Number.isFinite(BATAS_MUAT_OCR_MS) && BATAS_MUAT_OCR_MS > 0 && BATAS_MUAT_OCR_MS <= 180000);
});
