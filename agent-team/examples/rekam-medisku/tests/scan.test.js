// t16 QA — pindai: fake OCR engine, sesi memori, parser resep/rekam/lab, gate verifikasi, foto.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { kenaliTeks, createOcrAdapter, OcrError } from '../app/js/ocr/adaptor.js';
import {
  getScanDraft,
  setScanDraft,
  clearScanDraft,
  subscribeScanDraft
} from '../app/js/scanSession.js';
import {
  createPhotoStore,
  validatePhotoRecord,
  photoBytes,
  PhotoError
} from '../app/js/photos.js';
import {
  validateSourceMeta,
  normalizeState,
  createEmptyState
} from '../app/js/model.js';
import { createState } from '../app/js/state.js';
import { createStorage } from '../app/js/storage.js';
import {
  parseBentukSediaan,
  parseKekuatan,
  parseDurasi,
  parseJumlah,
  parseRoman,
  normalizeAngka
} from '../app/js/logic/resepSediaan.js';
import {
  jadwalBawaan,
  parseFrekuensi,
  parseAturanMakan,
  jadwalUntukObat
} from '../app/js/logic/resepJadwal.js';
import { obatKeMedication } from '../app/js/logic/resep.js';
import {
  kenaliRekamMedis,
  rekamKeKunjungan,
  labKeLab
} from '../app/js/logic/rekam.js';
import { parseAngkaLab, parseRujukan, parseHasilLab } from '../app/js/logic/labParse.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CLOCK = () => new Date(2026, 10, 9, 7, 0, 0);
const IMAGE = 'data:image/png;base64,AAECAwQFBgc=';

function makeFakeEngine({ lines = ['Baris satu', '', 'Baris dua'], confidence = 87, fail = false } = {}) {
  const state = { terminated: false, recognized: 0, source: null };
  const engine = {
    async recognize(source, { onProgress } = {}) {
      state.recognized += 1;
      state.source = source;
      if (typeof onProgress === 'function') onProgress({ status: 'recognizing', progress: 50 });
      if (fail) throw new Error('mesin gagal');
      return { data: { confidence, text: lines.join('\n') } };
    },
    async terminate() {
      state.terminated = true;
    }
  };
  return { engine, state };
}

// ---------------------------------------------------------------------------
// OCR adaptor dengan fake engine (tanpa Tesseract nyata)
// ---------------------------------------------------------------------------

test('scan: kenaliTeks fake engine menormalkan confidence, membuang baris kosong, progress, terminate', async () => {
  const { engine, state } = makeFakeEngine();
  const progress = [];
  const result = await kenaliTeks(IMAGE, {
    engineImpl: () => engine,
    onProgress: (info) => progress.push(info)
  });

  assert.equal(result.teks, 'Baris satu\nBaris dua');
  assert.equal(result.kepercayaan, 0.87);
  assert.equal(result.baris.length, 2);
  assert.equal(result.baris[0].teks, 'Baris satu');
  assert.equal(result.baris[0].kepercayaan, 0.87);
  assert.equal(result.mesin, 'tesseract');
  assert.deepEqual(result.bahasa, ['ind', 'eng']);
  assert.ok(Array.isArray(result.peringatan) && result.peringatan.length > 0);
  assert.equal(state.recognized, 1);
  assert.equal(state.terminated, true, 'terminate wajib dipanggil');
  assert.ok(progress.some((p) => p.status === 'loading'));
  assert.ok(progress.some((p) => p.status === 'recognizing' && p.progress === 0.5));
  assert.ok(progress.some((p) => p.status === 'done' && p.progress === 1));
});

test('scan: engine melempar → OCR_GAGAL; tidak menyentuh state/storage', async () => {
  const { engine, state } = makeFakeEngine({ fail: true });
  const fakeState = { writes: 0, put() { this.writes += 1; } };

  await assert.rejects(
    () => kenaliTeks(IMAGE, { engineImpl: () => engine }),
    (error) => error instanceof OcrError && error.code === 'OCR_GAGAL'
  );
  assert.equal(state.terminated, true);
  assert.equal(fakeState.writes, 0);

  const source = await readFile(path.join(ROOT, 'app/js/ocr/adaptor.js'), 'utf8');
  assert.doesNotMatch(source, /from ['"].*(?:storage|state|backup)\.js['"]/);
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest/);
  assert.throws(() => createOcrAdapter({ engine: 'cloud' }),
    (error) => error.code === 'OCR_CLOUD_NONAKTIF');
});

// ---------------------------------------------------------------------------
// Parser resep: sediaan & jadwal
// ---------------------------------------------------------------------------

test('scan: resepSediaan/resepJadwal semua pola frekuensi dan tabel jadwal', () => {
  assert.equal(parseBentukSediaan('tab').kode, 'tab');
  assert.equal(parseBentukSediaan('kapsul').kode, 'caps');
  assert.equal(parseBentukSediaan('sendok teh').kode, 'cth');
  assert.equal(parseBentukSediaan('salep').kode, 'ung');
  assert.deepEqual(parseKekuatan('Amlodipin 5 mg'), { nilai: 5, satuan: 'mg', teks: '5 mg' });
  assert.equal(parseKekuatan('tidak ada'), null);
  assert.equal(parseDurasi('selama 5 hari').hari, 5);
  assert.equal(parseDurasi('x 7 hari').hari, 7);
  assert.equal(parseJumlah('No. 10').jumlah, 10);
  assert.equal(parseJumlah('#20').jumlah, 20);
  assert.equal(parseRoman('IV'), 4);
  assert.equal(normalizeAngka('1/2'), 0.5);
  assert.equal(normalizeAngka('0,5'), 0.5);

  assert.deepEqual(jadwalBawaan(null), []);
  assert.deepEqual(jadwalBawaan(0), []);
  assert.deepEqual(jadwalBawaan(1), ['07:00']);
  assert.deepEqual(jadwalBawaan(2), ['07:00', '19:00']);
  assert.deepEqual(jadwalBawaan(3), ['07:00', '13:00', '19:00']);
  assert.deepEqual(jadwalBawaan(4), ['07:00', '12:00', '17:00', '21:00']);
  assert.deepEqual(jadwalBawaan(5), ['07:00', '10:30', '14:00', '17:30', '21:00']);

  const frekuensi = parseFrekuensi('3 dd 1 tab');
  assert.ok(frekuensi);
  assert.equal(frekuensi.kaliSehari, 3);
  assert.equal(frekuensi.takaranPerDosis, 1);

  const pola = parseFrekuensi('1-0-1');
  assert.ok(pola);
  assert.equal(pola.kaliSehari, 2);
  assert.deepEqual(pola.polaHarian, [1, 0, 1]);

  assert.equal(parseAturanMakan('pc').aturanMakan, 'sesudah');
  assert.equal(parseAturanMakan('sebelum makan').aturanMakan, 'sebelum');
  assert.equal(parseAturanMakan('prn').aturanMakan, 'bila-perlu');
  assert.deepEqual(jadwalUntukObat({ aturanMakan: 'bila-perlu', jadwalJam: [] }), []);
});

// ---------------------------------------------------------------------------
// Parser rekam medis & lab
// ---------------------------------------------------------------------------

const REKAM_TEXT = [
  'RS Sehat Sentosa',
  'Tanggal: 01/11/2026',
  'Dokter: dr. Sari',
  'Diagnosa: hipertensi, dislipidemia',
  'Keluhan: pusing',
  'Nomor RM: 12345',
  '',
  'Hasil Lab',
  'HbA1c 7.2 % 4.0 - 5.6',
  'Kolesterol 210 mg/dL 150 - 200'
].join('\n');

test('scan: labParse membaca nama-nilai-satuan-rujukan dan tidak mendiagnosis', () => {
  assert.equal(parseAngkaLab('7,2'), 7.2);
  assert.equal(parseAngkaLab('1.200'), 1200);
  assert.equal(parseAngkaLab('tidak ada'), null);
  assert.deepEqual(parseRujukan('4.0 - 5.6'), { low: 4, high: 5.6, teks: '4.0 - 5.6' });

  const rows = parseHasilLab(REKAM_TEXT);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].nama, 'HbA1c');
  assert.equal(rows[0].nilai, 7.2);
  assert.equal(rows[0].satuan, '%');
  assert.deepEqual(rows[0].rujukan, { low: 4, high: 5.6, teks: '4.0 - 5.6' });
  assert.equal(rows[1].nama, 'Kolesterol');
  assert.equal(rows[1].nilai, 210);
  assert.equal(rows[1].satuan, 'mg/dL');
});

test('scan: rekam.js menyalin teks tertulis, tidak menambah diagnosis, source sesuai verifiedAt', () => {
  const parsed = kenaliRekamMedis(REKAM_TEXT, { now: CLOCK() });
  assert.equal(parsed.draf.tanggal, '2026-11-01');
  assert.equal(parsed.draf.faskes, 'RS Sehat Sentosa');
  assert.equal(parsed.draf.dokter, 'dr. Sari');
  assert.deepEqual(parsed.draf.diagnosisTertulis, ['hipertensi', 'dislipidemia']);
  assert.equal(parsed.draf.keluhan, 'pusing');
  assert.equal(parsed.draf.nomorRekamMedis, '12345');
  assert.equal(parsed.hasilLab.length, 2);
  assert.equal(parsed.parserVersion, 'rekam-v1');
  assert.equal(parsed.isMedicalAdvice, false);

  const unverified = rekamKeKunjungan(parsed.draf, { profileId: 'prf_1', ocrText: 'teks' });
  assert.equal(unverified.source.verifiedByUser, false);
  assert.equal(unverified.source.verifiedAt, null);
  assert.equal(unverified.source.kind, 'rekam-medis');
  assert.equal(unverified.source.parserVersion, 'rekam-v1');
  assert.equal(unverified.diagnosis, 'hipertensi, dislipidemia');

  const verifiedAt = '2026-11-09T10:00:00.000Z';
  const verified = rekamKeKunjungan(parsed.draf, {
    profileId: 'prf_1', photoId: 'pho_1', photoMime: 'image/jpeg',
    ocrText: 'teks', ocrConfidence: 0.8, verifiedAt
  });
  assert.equal(verified.source.verifiedByUser, true);
  assert.equal(verified.source.verifiedAt, verifiedAt);
  validateSourceMeta(verified.source);

  const lab = labKeLab(parsed.hasilLab[0], {
    profileId: 'prf_1', date: '2026-11-01', photoId: 'pho_1', verifiedAt
  });
  assert.equal(lab.name, 'HbA1c');
  assert.equal(lab.value, 7.2);
  assert.equal(lab.unit, '%');
  assert.equal(lab.refLow, 4);
  assert.equal(lab.refHigh, 5.6);
  assert.equal(lab.source.kind, 'rekam-medis');
  assert.equal(lab.source.verifiedByUser, true);
  validateSourceMeta(lab.source);
});

// ---------------------------------------------------------------------------
// Sesi pindai (hanya memori)
// ---------------------------------------------------------------------------

test('scanSession: set/get/clear, satu draf, listener, tanpa storage', async () => {
  clearScanDraft();
  const events = [];
  const unsubscribe = subscribeScanDraft((draft) => events.push(draft));

  const first = { kind: 'resep', teks: 'A' };
  assert.equal(setScanDraft(first), first);
  assert.equal(getScanDraft(), first);

  const second = { kind: 'etiket', teks: 'B' };
  setScanDraft(second);
  assert.equal(getScanDraft(), second, 'hanya satu draf aktif');

  clearScanDraft();
  assert.equal(getScanDraft(), null);
  assert.deepEqual(events, [first, second, null]);

  unsubscribe();
  setScanDraft({ kind: 'rekam-medis' });
  assert.equal(events.length, 3, 'unsubscribe menghentikan listener');
  clearScanDraft();

  assert.throws(() => subscribeScanDraft(null), TypeError);
  const source = await readFile(path.join(ROOT, 'app/js/scanSession.js'), 'utf8');
  assert.doesNotMatch(source, /localStorage\s*[.[]|sessionStorage\s*[.[]|indexedDB/);
});

// ---------------------------------------------------------------------------
// PhotoStore & State foto
// ---------------------------------------------------------------------------

function photoRecord(overrides = {}) {
  return {
    id: 'pho_1', profileId: 'prf_1', kind: 'resep', mime: 'image/jpeg',
    bytes: 4, width: 10, height: 10, dataBase64: 'AAECAw==', crypto: null,
    encrypted: false, createdAt: '2026-11-09T00:00:00.000Z', updatedAt: '2026-11-09T00:00:00.000Z',
    ...overrides
  };
}

test('photos: PhotoStore memori put/get/list/delete/clear/usage dan validasi mime/ukuran', async () => {
  const store = createPhotoStore({ indexedDB: null });
  assert.equal(store.kind, 'memory');

  await store.put(photoRecord());
  assert.deepEqual((await store.get('pho_1')).dataBase64, 'AAECAw==');
  assert.equal((await store.list()).length, 1);
  assert.equal((await store.list({ profileId: 'prf_1' })).length, 1);
  assert.equal((await store.list({ profileId: 'prf_lain' })).length, 0);
  const usage = await store.usage();
  assert.equal(typeof usage.bytes, 'number');
  assert.ok(usage.bytes > 0);

  assert.equal(photoBytes(photoRecord()), 4);

  await assert.rejects(
    () => store.put(photoRecord({ id: 'pho_2', mime: 'image/gif' })),
    (error) => error instanceof PhotoError && error.code === 'FOTO_TIDAK_VALID'
  );
  await assert.rejects(
    () => store.put(photoRecord({ id: 'pho_3', bytes: 2097153 })),
    (error) => error.code === 'FOTO_TERLALU_BESAR'
  );
  assert.throws(() => validatePhotoRecord(photoRecord({ dataBase64: null })),	// tepat satu isi
    (error) => error.code === 'FOTO_TIDAK_VALID');

  await store.delete('pho_1');
  assert.equal(await store.get('pho_1'), null);
  await store.put(photoRecord());
  await store.clear();
  assert.equal((await store.list()).length, 0);
});

test('state: saveSourcePhoto plain → cadangan tanpa byte foto; removeProfile/resetAll', async () => {
  const state = createState({
    storage: createStorage({}),
    photoStore: createPhotoStore({ indexedDB: null }),
    clock: CLOCK,
    kdfIterations: 1000
  });
  await state.init();
  const profileId = state.getActiveProfile().id;
  const uniqueB64 = 'AAECAwQFBgcICQ==';

  const photo = await state.saveSourcePhoto({
    profileId, kind: 'resep', mime: 'image/jpeg', dataBase64: uniqueB64, width: 100, height: 80
  });
  assert.equal(photo.encrypted, false);
  assert.equal(photo.dataBase64, undefined, 'byte foto tidak dikembalikan state');
  assert.equal((await state.getSourcePhoto(photo.id)).dataBase64, uniqueB64);
  assert.doesNotThrow(() => validatePhotoRecord({ ...photo, dataBase64: uniqueB64 }));

  const backup = await state.exportBackup();
  assert.equal(backup.meta.photoCount, 1);
  assert.equal(backup.text.includes(uniqueB64), false, 'byte foto tidak boleh masuk cadangan JSON');
  assert.equal(backup.text.includes(photo.id), false);

  const child = await state.addProfile({ name: 'Anak' });
  await state.saveSourcePhoto({ profileId: child.id, kind: 'etiket', mime: 'image/png', dataBase64: uniqueB64 });
  assert.equal((await state.listSourcePhotos({ profileId: child.id })).length, 1);
  await state.removeProfile(child.id);
  assert.equal((await state.listSourcePhotos({ profileId: child.id })).length, 0);

  await state.saveSourcePhoto({ kind: 'resep', mime: 'image/webp', dataBase64: uniqueB64 });
  assert.equal((await state.listSourcePhotos()).length, 2);
  await state.resetAll();
  assert.equal((await state.listSourcePhotos()).length, 0);
});

// ---------------------------------------------------------------------------
// Gate verifikasi (tanpa DOM: kontrak UI diperiksa statis)
// ---------------------------------------------------------------------------

test('scan-review: simpan ditolak tanpa centang verifiedByUser', async () => {
  const source = await readFile(path.join(ROOT, 'app/js/ui/scan-review.js'), 'utf8');
  assert.match(source, /id:\s*'review-verified'/);
  assert.match(source, /id:\s*'btn-save-reviewed'/);
  assert.match(source, /REVIEW_BELUM_DIVERIFIKASI/);
  assert.match(source, /if\s*\(!verified\.checked\)/);
  assert.match(source, /saveButton\.disabled\s*=\s*!verified\.checked/);
  assert.match(source, /verifiedByUser:\s*true/);

  // Model: metadata dengan verifiedByUser=false sah, tetapi bukan hasil verifikasi.
  const unverified = rekamKeKunjungan({ tanggal: '2026-11-01', dokter: '', faskes: '', keluhan: '', diagnosisTertulis: [], catatan: '' });
  assert.equal(unverified.source.verifiedByUser, false);
  assert.doesNotThrow(() => validateSourceMeta(unverified.source));
});

// ---------------------------------------------------------------------------
// SourceMeta pada medication/visit/lab + normalisasi sumber lama
// ---------------------------------------------------------------------------

test('scan: SourceMeta medication/visit/lab dan normalizeState mengisi/mengosongkan source', () => {
  const source = {
    kind: 'resep',
    photoId: null,
    photoMime: null,
    ocrText: 'Amlodipin 5 mg 3 dd 1 tab pc',
    ocrConfidence: 0.87,
    translatedText: 'Diminum 3 kali sehari',
    verifiedByUser: true,
    verifiedAt: '2026-11-09T10:00:00.000Z',
    parserVersion: 'resep-v1'
  };
  assert.doesNotThrow(() => validateSourceMeta(source));
  assert.throws(() => validateSourceMeta({ ...source, kind: 'x' }), (e) => e.code === 'DATA_TIDAK_VALID');
  assert.throws(() => validateSourceMeta({ ...source, ocrConfidence: 2 }), (e) => e.code === 'DATA_TIDAK_VALID');
  assert.throws(() => validateSourceMeta({ ...source, verifiedByUser: true, verifiedAt: null }),
    (e) => e.code === 'DATA_TIDAK_VALID');

  const obat = {
    nama: 'Amlodipin', kekuatan: { nilai: 5, satuan: 'mg', teks: '5 mg' },
    bentukSediaan: { kode: 'tab', label: 'tablet', satuan: 'tablet', satuanLabel: 'tablet' },
    kaliSehari: 3, takaranPerDosis: 1, satuanTakaran: 'tablet',
    waktuMinum: ['pagi', 'siang', 'malam'], aturanMakan: 'sesudah', durasiHari: 5,
    jumlahTotal: { jumlah: 15, satuan: 'tablet' }, jadwalJam: ['07:00', '13:00', '19:00'],
    polaHarian: null, teksAsli: 'Amlodipin 5 mg 3 dd 1 tab pc selama 5 hari',
    teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet, sesudah makan, selama 5 hari',
    kepercayaan: 0.85, bagianTidakDipahami: []
  };
  const med = obatKeMedication(obat, { profileId: 'prf_1', today: '2026-11-09', source });
  assert.equal(med.source, source);
  assert.equal(med.endDate, '2026-11-13');
  assert.equal(med.stock.remaining, 15);
  validateSourceMeta(med.source);

  const raw = createEmptyState({ now: CLOCK() });
  const body = {
    profileId: raw.profiles[0].id, date: '2026-11-01', doctorName: '', facility: '',
    complaint: '', diagnosis: '', notes: '', attachments: [],
    createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z'
  };
  const normalized = normalizeState({
    ...raw,
    visits: [
      { ...body, id: 'vis_lama' },
      { ...body, id: 'vis_rusak', source: { kind: 'salah' } }
    ],
    medications: [{ ...med, id: 'med_lama', source: null }],
    labs: [{ id: 'lab_lama', profileId: body.profileId, date: '2026-11-01', name: 'HbA1c', value: 7.2, unit: '%', refLow: 4, refHigh: 5.6, note: '', facility: '', createdAt: body.createdAt, updatedAt: body.updatedAt }]
  });
  assert.equal(normalized.visits.find((v) => v.id === 'vis_lama').source, null);
  assert.equal(normalized.visits.find((v) => v.id === 'vis_rusak').source, null);
  assert.equal(normalized.medications[0].source, null);
  assert.equal(normalized.labs[0].source, null);
});
