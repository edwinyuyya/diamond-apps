/**
 * Tes korpus penerjemah resep — t15 (CONTRACT.md 7.8–7.9, 14.1).
 *
 * Menguji `tests/fixtures/resep-cases.js` (minimal 40 kasus) dengan
 * `node:test` + `node:assert/strict`. Tidak ada DOM, jaringan, atau dependency
 * test. Semua waktu diuji dengan `new Date(2026, 10, 9, 7, 0, 0)` (lokal).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { RESEP_CASES } from './fixtures/resep-cases.js';
import {
  PARSER_RESEP_VERSION,
  PERINGATAN_RESEP,
  jadwalUntukObat,
  kenaliResep,
  obatKeMedication,
  terjemahkanBaris
} from '../app/js/logic/resep.js';
import {
  JADWAL_BAWAAN,
  jadwalBawaan,
  parseAturanMakan,
  parseFrekuensi,
  waktuMinumDariJam
} from '../app/js/logic/resepJadwal.js';
import {
  normalizeAngka,
  parseBentukSediaan,
  parseDurasi,
  parseJumlah,
  parseKekuatan,
  parseRoman
} from '../app/js/logic/resepSediaan.js';
import { frasaTerjemahan } from '../app/js/logic/resepKamus.js';

/** Waktu tetap untuk seluruh tes (CONTRACT.md 14.1). */
const WAKTU_UJI = new Date(2026, 10, 9, 7, 0, 0);

/** Seluruh bidang wajib `ObatTerjemahan` (CONTRACT.md 7.8.2). */
const BIDANG_WAJIB = [
  'nama',
  'kekuatan',
  'bentukSediaan',
  'kaliSehari',
  'takaranPerDosis',
  'satuanTakaran',
  'waktuMinum',
  'aturanMakan',
  'durasiHari',
  'jumlahTotal',
  'jadwalJam',
  'polaHarian',
  'teksAsli',
  'teksTerjemahan',
  'kepercayaan',
  'bagianTidakDipahami'
];

/** Kata/frasa saran dosis yang tidak boleh muncul pada kalimat terjemahan. */
const POLA_SARAN_DOSIS =
  /\b(?:tingkatkan|kurangi|naikkan|turunkan|tambah(?:kan)?|sarankan|sebaiknya|saran\s+dosis|anjuran\s+dosis|dosis)\b/i;

/** Judul singkat untuk nama tes (satu baris pertama, maks. 60 karakter). */
function ringkas(teks) {
  const baris = String(teks).split(/\r?\n/).find((b) => b.trim() !== '') || '';
  const bersih = baris.trim().replace(/\s+/g, ' ');
  return bersih.length > 60 ? `${bersih.slice(0, 57)}...` : bersih;
}

/** Bandingkan ekspektasi sebagian dengan obat aktual, kunci demi kunci. */
function bandingkanObat(aktual, harapan, label) {
  assert.ok(aktual && typeof aktual === 'object', `${label}: obat tidak ada`);
  for (const kunci of Object.keys(harapan)) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(aktual, kunci),
      `${label}: bidang ${kunci} tidak ada`
    );
    assert.deepEqual(aktual[kunci], harapan[kunci], `${label}: bidang ${kunci}`);
  }
}

/** Semua obat wajib memuat seluruh bidang kontrak dan kalimat yang aman. */
function periksaBidangWajib(hasil, label) {
  for (const [i, obat] of hasil.obat.entries()) {
    for (const kunci of BIDANG_WAJIB) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(obat, kunci),
        `${label}: obat[${i}] tidak memuat ${kunci}`
      );
    }
    if (typeof obat.teksTerjemahan === 'string') {
      assert.doesNotMatch(
        obat.teksTerjemahan,
        POLA_SARAN_DOSIS,
        `${label}: obat[${i}] memuat kata saran dosis`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Korpus: satu tes per kasus (>= 40 kasus).
// ---------------------------------------------------------------------------

for (const kasus of RESEP_CASES) {
  test(`korpus ${kasus.id}: ${ringkas(kasus.teks)}`, () => {
    const hasil = kenaliResep(kasus.teks, { now: WAKTU_UJI });

    assert.equal(hasil.teksAsli, kasus.teks, 'teksAsli harus disalin apa adanya');
    assert.equal(hasil.parserVersion, PARSER_RESEP_VERSION);
    assert.equal(hasil.isMedicalAdvice, false);
    assert.ok(Array.isArray(hasil.peringatan));

    const daftarHarapan = kasus.harapan
      ? [kasus.harapan, ...(kasus.sisaObat || [])]
      : [];
    const totalDiharapkan = kasus.totalObat ?? daftarHarapan.length;

    assert.equal(
      hasil.obat.length,
      totalDiharapkan,
      `${kasus.id}: jumlah obat`
    );

    daftarHarapan.forEach((harapan, i) => {
      bandingkanObat(hasil.obat[i], harapan, `${kasus.id} obat[${i}]`);
    });

    periksaBidangWajib(hasil, kasus.id);

    if (Object.prototype.hasOwnProperty.call(kasus, 'kepercayaanHasil')) {
      assert.deepEqual(hasil.kepercayaan, kasus.kepercayaanHasil, `${kasus.id}: kepercayaan`);
    }
    if (Object.prototype.hasOwnProperty.call(kasus, 'bagianTidakDipahamiGlobal')) {
      assert.deepEqual(
        hasil.bagianTidakDipahami,
        kasus.bagianTidakDipahamiGlobal,
        `${kasus.id}: bagianTidakDipahami global`
      );
    }

    // Catatan per obat harus ikut terhimpun (dan ter-dedupe) di tingkat hasil.
    for (const obat of hasil.obat) {
      for (const catatan of obat.bagianTidakDipahami) {
        assert.ok(
          hasil.bagianTidakDipahami.includes(catatan),
          `${kasus.id}: catatan "${catatan}" tidak masuk bagianTidakDipahami global`
        );
      }
    }
    assert.equal(
      new Set(hasil.bagianTidakDipahami).size,
      hasil.bagianTidakDipahami.length,
      `${kasus.id}: bagianTidakDipahami harus dedupe`
    );

    // Determinisme: panggilan kedua identik, termasuk dengan `now` berbeda.
    const ulang = kenaliResep(kasus.teks, { now: WAKTU_UJI });
    const ulangLain = kenaliResep(kasus.teks, { now: new Date(2030, 0, 1, 12, 30, 0) });
    assert.deepEqual(ulang, hasil, `${kasus.id}: panggilan kedua harus sama`);
    assert.deepEqual(ulangLain, hasil, `${kasus.id}: now tidak boleh mengubah hasil`);
  });
}

// ---------------------------------------------------------------------------
// Persyaratan korpus & determinisme tingkat API.
// ---------------------------------------------------------------------------

test('korpus memuat minimal 40 kasus dengan id unik', () => {
  assert.ok(RESEP_CASES.length >= 40, `kasus: ${RESEP_CASES.length}`);
  const id = new Set(RESEP_CASES.map((kasus) => kasus.id));
  assert.equal(id.size, RESEP_CASES.length, 'id kasus harus unik');
  for (const kasus of RESEP_CASES) {
    assert.equal(typeof kasus.id, 'string');
    assert.equal(typeof kasus.teks, 'string');
    assert.ok(
      kasus.harapan !== undefined,
      `${kasus.id}: harus menetapkan harapan (boleh null)`
    );
    for (const harapan of [kasus.harapan, ...(kasus.sisaObat || [])]) {
      if (harapan === null) continue;
      assert.ok(
        Object.prototype.hasOwnProperty.call(harapan, 'teksTerjemahan'),
        `${kasus.id}: harapan wajib memuat teksTerjemahan`
      );
      assert.ok(
        Object.prototype.hasOwnProperty.call(harapan, 'bagianTidakDipahami'),
        `${kasus.id}: harapan wajib memuat bagianTidakDipahami`
      );
    }
  }
});

test('korpus mencakup seluruh pola wajib CONTRACT.md 14.1', () => {
  const semuaTeks = RESEP_CASES.map((kasus) => kasus.teks).join('\n');
  const wajib = [
    '3 dd 1',
    '3x1',
    '3 x 1 tab',
    'S 3 dd tab I',
    'S.2.d.d.C.I',
    '1-0-1',
    'p.c.',
    ' pc',
    'a.c.',
    'd.c.',
    'h.s.',
    'prn',
    'k.p.',
    'mane',
    'nocte',
    'tab',
    'caps',
    'syr',
    'cth',
    'gtt',
    'supp',
    'ung',
    'inj',
    'mg',
    'mcg',
    ' ug ',
    ' g ',
    ' ml ',
    'selama 5 hari',
    'x 7 hari',
    'No. 10',
    'No. X',
    '#20',
    '#X'
  ];
  for (const pola of wajib) {
    assert.ok(
      semuaTeks.includes(pola),
      `korpus tidak memuat pola wajib ${JSON.stringify(pola)}`
    );
  }
  // Resume multi-obat dan kasus tidak lengkap/kotor.
  assert.ok(RESEP_CASES.some((kasus) => (kasus.sisaObat || []).length >= 2));
  assert.ok(RESEP_CASES.some((kasus) => kasus.harapan === null));
  assert.ok(RESEP_CASES.some((kasus) => /habiskan|minggu|qid|tanpa dosis/i.test(kasus.teks)));
  assert.ok(RESEP_CASES.some((kasus) => /Bodrex 1\b/.test(kasus.teks)), 'nama dengan angka');
});

test('kenaliResep deterministik untuk teks multi-obat', () => {
  const teks = [
    'R/ Amlodipin 5 mg 3 dd 1 tab pc selama 5 hari',
    'R/ Metformin 500 mg 2 dd 1 tab ac',
    'R/ Simvastatin 20 mg 1 dd 1 tab nocte'
  ].join('\n');
  const a = kenaliResep(teks, { now: WAKTU_UJI });
  const b = kenaliResep(teks, { now: WAKTU_UJI });
  const c = kenaliResep(teks, { now: new Date(2031, 5, 1, 0, 0, 0) });
  assert.deepEqual(b, a);
  assert.deepEqual(c, a);
  assert.equal(a.obat.length, 3);
});

test('konstanta & metadata hasil sesuai kontrak', () => {
  assert.equal(PARSER_RESEP_VERSION, 'resep-v1');
  assert.deepEqual(PERINGATAN_RESEP, [
    'Hasil ini adalah draf yang harus dicocokkan dengan resep asli.',
    'Kesalahan membaca dosis bisa berbahaya. Konsultasikan dengan apoteker atau dokter.'
  ]);

  const hasil = kenaliResep('Amlodipin 5 mg 3 dd 1 tab pc selama 5 hari', { now: WAKTU_UJI });
  assert.equal(hasil.parserVersion, 'resep-v1');
  assert.equal(hasil.isMedicalAdvice, false);
  assert.equal(hasil.kepercayaan, 1);
  assert.equal(hasil.peringatan.length, 4, 'dua disclaimer + dua peringatan resep');
  for (const teks of PERINGATAN_RESEP) assert.ok(hasil.peringatan.includes(teks));
  assert.match(hasil.peringatan[0], /pemindaian foto/i);
  assert.match(hasil.peringatan[1], /bukan saran dosis/i);
});

test('maxObat membatasi jumlah obat dan mencatat sisanya', () => {
  const teks = [
    'Amlodipin 5 mg 3 dd 1 tab',
    'Metformin 500 mg 2 dd 1 tab',
    'Simvastatin 20 mg 1 dd 1 tab'
  ].join('\n');
  const hasil = kenaliResep(teks, { maxObat: 2, now: WAKTU_UJI });
  assert.equal(hasil.obat.length, 2);
  assert.ok(
    hasil.bagianTidakDipahami.some((catatan) => catatan.startsWith('baris tidak diproses: ')),
    'baris berlebih harus dicatat'
  );
});

test('terjemahkanBaris mengembalikan ObatTerjemahan atau null', () => {
  assert.equal(terjemahkanBaris('RESEP'), null);
  assert.equal(terjemahkanBaris(''), null);
  assert.equal(terjemahkanBaris('12345'), null);

  const obat = terjemahkanBaris('Amlodipin 5 mg 3 dd 1 tab pc selama 5 hari', { indeks: 0 });
  assert.ok(obat);
  assert.equal(obat.nama, 'Amlodipin');
  assert.equal(obat.teksTerjemahan, 'Diminum 3 kali sehari, 1 tablet, sesudah makan, selama 5 hari');
  for (const kunci of BIDANG_WAJIB) assert.ok(kunci in obat);
});

test('teksTerjemahan persis contoh kontrak', () => {
  const kasus = RESEP_CASES.find((item) => item.teks === 'Amlodipin 5 mg 3 dd 1 tab pc selama 5 hari');
  assert.ok(kasus);
  const obat = kenaliResep(kasus.teks, { now: WAKTU_UJI }).obat[0];
  assert.equal(
    obat.teksTerjemahan,
    'Diminum 3 kali sehari, 1 tablet, sesudah makan, selama 5 hari'
  );
  assert.equal(frasaTerjemahan(obat), obat.teksTerjemahan);
});

test('tidak ada kata saran dosis pada seluruh kalimat terjemahan korpus', () => {
  for (const kasus of RESEP_CASES) {
    const hasil = kenaliResep(kasus.teks, { now: WAKTU_UJI });
    for (const obat of hasil.obat) {
      assert.doesNotMatch(obat.teksTerjemahan, POLA_SARAN_DOSIS, `${kasus.id}: ${obat.teksTerjemahan}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Unit: parseFrekuensi.
// ---------------------------------------------------------------------------

test('parseFrekuensi: seluruh pola prioritas kontrak', () => {
  const tabel = [
    ['3 dd 1', { kaliSehari: 3, takaranPerDosis: 1, satuanTakaran: null, polaHarian: null, teksAsli: '3 dd 1' }],
    ['3 dd 1 tab', { kaliSehari: 3, takaranPerDosis: 1, satuanTakaran: 'tablet', polaHarian: null, teksAsli: '3 dd 1 tab' }],
    ['3x1', { kaliSehari: 3, takaranPerDosis: 1, satuanTakaran: null, polaHarian: null, teksAsli: '3x1' }],
    ['3x1 tab', { kaliSehari: 3, takaranPerDosis: 1, satuanTakaran: 'tablet', polaHarian: null, teksAsli: '3x1 tab' }],
    ['3 x 1 tab', { kaliSehari: 3, takaranPerDosis: 1, satuanTakaran: 'tablet', polaHarian: null, teksAsli: '3 x 1 tab' }],
    ['s 3 dd tab i', { kaliSehari: 3, takaranPerDosis: 1, satuanTakaran: 'tablet', polaHarian: null, teksAsli: 's 3 dd tab i' }],
    ['S.2.d.d.C.I', { kaliSehari: 2, takaranPerDosis: 1, satuanTakaran: 'kapsul', polaHarian: null, teksAsli: 'S.2.d.d.C.I' }],
    ['S 3 dd tab I', { kaliSehari: 3, takaranPerDosis: 1, satuanTakaran: 'tablet', polaHarian: null, teksAsli: 'S 3 dd tab I' }],
    ['1-0-1', { kaliSehari: 2, takaranPerDosis: 1, satuanTakaran: 'tablet', polaHarian: [1, 0, 1], teksAsli: '1-0-1' }],
    ['1 - 0 - 2', { kaliSehari: 2, takaranPerDosis: 2, satuanTakaran: 'tablet', polaHarian: [1, 0, 2], teksAsli: '1 - 0 - 2' }],
    ['3 kali sehari', { kaliSehari: 3, takaranPerDosis: 1, satuanTakaran: null, polaHarian: null, teksAsli: '3 kali sehari' }],
    ['3 dd', { kaliSehari: 3, takaranPerDosis: 1, satuanTakaran: null, polaHarian: null, teksAsli: '3 dd' }],
    ['2 dd 2 tab', { kaliSehari: 2, takaranPerDosis: 2, satuanTakaran: 'tablet', polaHarian: null, teksAsli: '2 dd 2 tab' }],
    ['2 x 3 tab', { kaliSehari: 2, takaranPerDosis: 3, satuanTakaran: 'tablet', polaHarian: null, teksAsli: '2 x 3 tab' }]
  ];
  for (const [masukan, harapan] of tabel) {
    assert.deepEqual(parseFrekuensi(masukan), harapan, masukan);
  }
  assert.equal(parseFrekuensi('tidak ada pola'), null);
  assert.equal(parseFrekuensi(''), null);
  assert.equal(parseFrekuensi(null), null);

  // `3 dd` default 1 dengan catatan non-enumerable, bukan tebakan diam-diam.
  assert.equal(parseFrekuensi('3 dd').catatan[0], 'takaran tidak tertulis; default 1');
  assert.equal(
    parseFrekuensi('1-0-2').catatan[0],
    'pola dosis tidak seragam: 1-0-2'
  );
});

// ---------------------------------------------------------------------------
// Unit: parseAturanMakan.
// ---------------------------------------------------------------------------

test('parseAturanMakan: p.c./a.c./d.c./prn/k.p./h.s./mane/nocte', () => {
  const tabel = [
    ['pc', { aturanMakan: 'sesudah', waktuMinum: [] }],
    ['p.c.', { aturanMakan: 'sesudah', waktuMinum: [] }],
    ['sesudah makan', { aturanMakan: 'sesudah', waktuMinum: [] }],
    ['setelah makan', { aturanMakan: 'sesudah', waktuMinum: [] }],
    ['ac', { aturanMakan: 'sebelum', waktuMinum: [] }],
    ['a.c.', { aturanMakan: 'sebelum', waktuMinum: [] }],
    ['sebelum makan', { aturanMakan: 'sebelum', waktuMinum: [] }],
    ['dc', { aturanMakan: 'saat', waktuMinum: [] }],
    ['d.c.', { aturanMakan: 'saat', waktuMinum: [] }],
    ['saat makan', { aturanMakan: 'saat', waktuMinum: [] }],
    ['bersama makan', { aturanMakan: 'saat', waktuMinum: [] }],
    ['prn', { aturanMakan: 'bila-perlu', waktuMinum: [] }],
    ['k.p.', { aturanMakan: 'bila-perlu', waktuMinum: [] }],
    ['kp', { aturanMakan: 'bila-perlu', waktuMinum: [] }],
    ['bila perlu', { aturanMakan: 'bila-perlu', waktuMinum: [] }],
    ['hs', { aturanMakan: null, waktuMinum: ['sebelum-tidur'] }],
    ['h.s.', { aturanMakan: null, waktuMinum: ['sebelum-tidur'] }],
    ['sebelum tidur', { aturanMakan: null, waktuMinum: ['sebelum-tidur'] }],
    ['mane', { aturanMakan: null, waktuMinum: ['pagi'] }],
    ['pagi', { aturanMakan: null, waktuMinum: ['pagi'] }],
    ['nocte', { aturanMakan: null, waktuMinum: ['malam'] }],
    ['malam', { aturanMakan: null, waktuMinum: ['malam'] }],
    ['', { aturanMakan: null, waktuMinum: [] }]
  ];
  for (const [masukan, harapan] of tabel) {
    assert.deepEqual(parseAturanMakan(masukan), harapan, masukan);
  }

  // Aturan berbeda: yang pertama menang, sisanya dicatat.
  const ganda = parseAturanMakan('pc ac');
  assert.equal(ganda.aturanMakan, 'sesudah');
  assert.deepEqual(ganda.catatan, ['aturan makan ganda: sesudah + sebelum']);
});

// ---------------------------------------------------------------------------
// Unit: sediaan, kekuatan, durasi, jumlah.
// ---------------------------------------------------------------------------

test('parseBentukSediaan: tab, caps, syr, cth, gtt, supp, ung, inj', () => {
  const tabel = [
    ['tab', 'tab'], ['tbl', 'tab'], ['tablet', 'tab'],
    ['caps', 'caps'], ['cap', 'caps'], ['kapsul', 'caps'],
    ['syr', 'syr'], ['sirup', 'syr'],
    ['cth', 'cth'], ['sendok teh', 'cth'],
    ['gtt', 'gtt'], ['tetes', 'gtt'],
    ['supp', 'supp'], ['supositoria', 'supp'],
    ['ung', 'ung'], ['salep', 'ung'],
    ['inj', 'inj'], ['suntikan', 'inj'],
    ['TABLET', 'tab'], ['Kapsul', 'caps']
  ];
  for (const [masukan, kode] of tabel) {
    assert.equal(parseBentukSediaan(masukan).kode, kode, masukan);
  }
  assert.equal(parseBentukSediaan('tidak ada bentuk'), null);
  assert.equal(parseBentukSediaan(''), null);
});

test('parseKekuatan: mg, mcg, ug, g, ml, %', () => {
  assert.deepEqual(parseKekuatan('5 mg'), { nilai: 5, satuan: 'mg', teks: '5 mg' });
  assert.deepEqual(parseKekuatan('500mcg'), { nilai: 500, satuan: 'mcg', teks: '500 mcg' });
  assert.deepEqual(parseKekuatan('400 ug'), { nilai: 400, satuan: 'mcg', teks: '400 mcg' });
  assert.deepEqual(parseKekuatan('400 µg'), { nilai: 400, satuan: 'mcg', teks: '400 mcg' });
  assert.deepEqual(parseKekuatan('1 g'), { nilai: 1, satuan: 'g', teks: '1 g' });
  assert.deepEqual(parseKekuatan('100 ml'), { nilai: 100, satuan: 'ml', teks: '100 ml' });
  assert.deepEqual(parseKekuatan('2 %'), { nilai: 2, satuan: '%', teks: '2 %' });
  assert.deepEqual(parseKekuatan('7.2 mg'), { nilai: 7.2, satuan: 'mg', teks: '7.2 mg' });
  assert.deepEqual(parseKekuatan('0,5 mg'), { nilai: 0.5, satuan: 'mg', teks: '0.5 mg' });
  // Kekuatan pertama yang tertulis dipakai; konsentrasi majemuk tidak digabung.
  assert.deepEqual(parseKekuatan('120 mg/5 ml'), { nilai: 120, satuan: 'mg', teks: '120 mg' });
  assert.equal(parseKekuatan('tanpa satuan'), null);
});

test('parseDurasi: selama/x/untuk hari; minggu tidak dikonversi', () => {
  assert.deepEqual(parseDurasi('selama 5 hari'), { hari: 5, teksAsli: 'selama 5 hari' });
  assert.deepEqual(parseDurasi('x 7 hari'), { hari: 7, teksAsli: 'x 7 hari' });
  assert.deepEqual(parseDurasi('untuk 3 hari'), { hari: 3, teksAsli: 'untuk 3 hari' });
  assert.deepEqual(parseDurasi('7 hari'), { hari: 7, teksAsli: '7 hari' });
  assert.equal(parseDurasi('2 minggu'), null);
  assert.equal(parseDurasi('selama 1 minggu'), null);
  assert.equal(parseDurasi(''), null);
});

test('parseJumlah: No. 10, No. X, #20, #X, nomor 15', () => {
  assert.deepEqual(parseJumlah('No. 10'), { jumlah: 10, satuan: null, teksAsli: 'No. 10' });
  assert.deepEqual(parseJumlah('no. X'), { jumlah: 10, satuan: null, teksAsli: 'no. X' });
  assert.deepEqual(parseJumlah('#20'), { jumlah: 20, satuan: null, teksAsli: '#20' });
  assert.deepEqual(parseJumlah('#X'), { jumlah: 10, satuan: null, teksAsli: '#X' });
  assert.deepEqual(parseJumlah('nomor 15'), { jumlah: 15, satuan: null, teksAsli: 'nomor 15' });
  assert.deepEqual(parseJumlah('No. IV'), { jumlah: 4, satuan: null, teksAsli: 'No. IV' });
  assert.equal(parseJumlah('tanpa nomor'), null);
});

test('normalizeAngka & parseRoman', () => {
  assert.equal(normalizeAngka('½'), 0.5);
  assert.equal(normalizeAngka('1/2'), 0.5);
  assert.equal(normalizeAngka('0,5'), 0.5);
  assert.equal(normalizeAngka('1½'), 1.5);
  assert.equal(normalizeAngka('2'), 2);
  assert.equal(normalizeAngka('bukan angka'), null);

  assert.equal(parseRoman('I'), 1);
  assert.equal(parseRoman('V'), 5);
  assert.equal(parseRoman('X'), 10);
  assert.equal(parseRoman('IV'), 4);
  assert.equal(parseRoman('ix'), 9);
  assert.equal(parseRoman('1'), 1);
  assert.equal(parseRoman('IIII'), null);
  assert.equal(parseRoman('bukan'), null);
});

// ---------------------------------------------------------------------------
// Unit: jadwal.
// ---------------------------------------------------------------------------

test('jadwalBawaan: tabel 1–4, contoh 5, dan nilai tidak valid', () => {
  assert.deepEqual(jadwalBawaan(1), ['07:00']);
  assert.deepEqual(jadwalBawaan(2), ['07:00', '19:00']);
  assert.deepEqual(jadwalBawaan(3), ['07:00', '13:00', '19:00']);
  assert.deepEqual(jadwalBawaan(4), ['07:00', '12:00', '17:00', '21:00']);
  assert.deepEqual(jadwalBawaan(5), ['07:00', '10:30', '14:00', '17:30', '21:00']);
  assert.deepEqual(JADWAL_BAWAAN[3], ['07:00', '13:00', '19:00']);

  for (const tidakValid of [null, undefined, 0, -1, 0.5, 2.5, '3', NaN]) {
    assert.deepEqual(jadwalBawaan(tidakValid), [], String(tidakValid));
  }
});

test('waktuMinumDariJam memetakan jam ke label dan mengurutkan', () => {
  assert.deepEqual(
    waktuMinumDariJam(['07:00', '13:00', '19:00', '23:00']),
    ['pagi', 'siang', 'malam', 'sebelum-tidur']
  );
  assert.deepEqual(waktuMinumDariJam(['05:00', '10:59', '11:00', '14:59']), ['pagi', 'siang']);
  assert.deepEqual(waktuMinumDariJam([]), []);
  assert.deepEqual(waktuMinumDariJam(['bukan jam']), []);
});

test('jadwalUntukObat: 3x sehari, pola harian, bila-perlu', () => {
  assert.deepEqual(
    jadwalUntukObat({ kaliSehari: 3 }),
    ['07:00', '13:00', '19:00']
  );
  assert.deepEqual(
    jadwalUntukObat({ kaliSehari: 2, polaHarian: [1, 0, 1] }),
    ['07:00', '19:00']
  );
  assert.deepEqual(
    jadwalUntukObat({ kaliSehari: 3, aturanMakan: 'bila-perlu' }),
    []
  );
  assert.deepEqual(jadwalUntukObat({ kaliSehari: null, waktuMinum: ['pagi', 'malam'] }), ['07:00', '19:00']);
  assert.deepEqual(jadwalUntukObat(null), []);
});

// ---------------------------------------------------------------------------
// obatKeMedication.
// ---------------------------------------------------------------------------

test('obatKeMedication: times, stock, endDate, source, instructions', () => {
  const obat = kenaliResep(
    'Amlodipin 5 mg 3 dd 1 tab pc selama 5 hari',
    { now: WAKTU_UJI }
  ).obat[0];
  const source = { kind: 'resep', photoId: 'foto-1', verifiedByUser: true };
  const med = obatKeMedication(obat, {
    profileId: 'p1',
    today: '2026-11-09',
    source,
    now: WAKTU_UJI
  });

  assert.equal(med.name, 'Amlodipin');
  assert.equal(med.activeIngredient, '');
  assert.equal(med.dose, '5');
  assert.equal(med.doseUnit, 'mg');
  assert.equal(med.instructions, obat.teksTerjemahan);
  assert.deepEqual(med.times, ['07:00', '13:00', '19:00']);
  assert.deepEqual(med.daysOfWeek, [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(med.startDate, '2026-11-09');
  assert.equal(med.endDate, '2026-11-13');
  assert.deepEqual(med.stock, { remaining: 15, unit: 'tablet', unitsPerDose: 1 });
  assert.equal(med.refillReminderDays, 3);
  assert.equal(med.active, true);
  assert.equal(med.notes, 'Diterjemahkan dari resep: Amlodipin 5 mg 3 dd 1 tab pc selama 5 hari');
  assert.equal(med.source, source);

  // Tanpa `today`, tanggal mulai dari `now` lokal.
  const tanpaToday = obatKeMedication(obat, { now: WAKTU_UJI });
  assert.equal(tanpaToday.startDate, '2026-11-09');
  assert.equal(tanpaToday.endDate, '2026-11-13');
  assert.equal(tanpaToday.source, null);
});

test('obatKeMedication: bila-perlu tanpa jadwal dan tanpa tanggal selesai', () => {
  const obat = kenaliResep('Paracetamol 500 mg 3 dd 1 tab prn', { now: WAKTU_UJI }).obat[0];
  const med = obatKeMedication(obat, { today: '2026-11-09', now: WAKTU_UJI });
  assert.deepEqual(med.times, []);
  assert.equal(med.endDate, null);
  assert.deepEqual(med.stock, { remaining: null, unit: 'tablet', unitsPerDose: 1 });
  assert.equal(med.instructions, 'Diminum bila perlu, 1 tablet');
});

test('obatKeMedication: obat tanpa kekuatan/jumlah memakai nilai aman', () => {
  const obat = kenaliResep('Vitamin B complex 1 dd 1 tab', { now: WAKTU_UJI }).obat[0];
  const med = obatKeMedication(obat, { today: '2026-11-09', now: WAKTU_UJI });
  assert.equal(med.dose, '');
  assert.equal(med.doseUnit, '');
  assert.equal(med.endDate, null);
  assert.deepEqual(med.stock, { remaining: null, unit: 'tablet', unitsPerDose: 1 });
  assert.deepEqual(med.times, ['07:00']);
});
