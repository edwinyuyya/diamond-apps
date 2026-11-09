/**
 * Tes korpus ucapan angka/satuan Indonesia — t17 (CONTRACT.md 8B.7.4).
 *
 * Menguji `tests/fixtures/ucapan-cases.js` (minimal 40 kasus) dengan
 * `node:test` + `node:assert/strict`. Tanpa DOM, jaringan, AI, atau dependency.
 * Waktu dipatok agar hasil deterministik.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { UCAPAN_CASES } from './fixtures/ucapan-cases.js';
import {
  KATA_ANGKA,
  normalisasiUcapan,
  parseAngkaDalamTeks,
  parseDeretAngka,
  ucapkanAngka,
  ucapkanKeAngka
} from '../app/js/logic/ucapanAngka.js';
import {
  PAGAR_FREKUENSI_MAKS,
  PAGAR_TAKARAN_MAKS,
  dikteKeObat,
  dikteKeTeksResep,
  pagarKewajaranDosis,
  parseDikteObat
} from '../app/js/logic/ucapanObat.js';
import { parseDikteVital } from '../app/js/logic/ucapanVital.js';
import { jadwalUntukObat, kenaliResep } from '../app/js/logic/resep.js';

const SEKARANG = new Date(2026, 10, 9, 7, 0, 0);

const KASUS_ANGKA = UCAPAN_CASES.filter((kasus) => kasus.jenis === 'angka');
const KASUS_OBAT = UCAPAN_CASES.filter((kasus) => kasus.jenis === 'obat');
const KASUS_VITAL = UCAPAN_CASES.filter((kasus) => kasus.jenis === 'vital');

/** Cocokkan sebagian bidang tanpa menuntut bidang lain. */
function cocokSebagian(actual, expected, jalur) {
  for (const [kunci, nilai] of Object.entries(expected)) {
    const lokasi = `${jalur}.${kunci}`;
    assert.ok(
      actual !== null && typeof actual === 'object'
        && Object.prototype.hasOwnProperty.call(actual, kunci),
      `${lokasi} tidak ada`
    );
    if (nilai !== null && typeof nilai === 'object' && !Array.isArray(nilai)) {
      cocokSebagian(actual[kunci], nilai, lokasi);
    } else {
      assert.deepEqual(actual[kunci], nilai, `${lokasi} tidak sesuai`);
    }
  }
}

test('korpus memuat minimal 40 kasus dengan id unik', () => {
  assert.ok(UCAPAN_CASES.length >= 40, `hanya ${UCAPAN_CASES.length} kasus`);
  const id = UCAPAN_CASES.map((kasus) => kasus.id);
  assert.equal(new Set(id).size, id.length);
  assert.ok(KASUS_ANGKA.length >= 20, 'kasus angka kurang');
  assert.ok(KASUS_OBAT.length >= 10, 'kasus obat kurang');
  assert.ok(KASUS_VITAL.length >= 7, 'kasus vital kurang');
});

test('normalisasiUcapan: NFKC, huruf kecil, spasi/tanda baca rapi', () => {
  assert.equal(normalisasiUcapan('  DUA   Belas, koma LIMA! '), 'dua belas, koma lima');
  assert.equal(normalisasiUcapan('１２．５'), '12.5');
  assert.equal(normalisasiUcapan(null), '');
  assert.equal(normalisasiUcapan(''), '');
});

test('KATA_ANGKA sesuai kontrak', () => {
  assert.equal(KATA_ANGKA.nol, 0);
  assert.equal(KATA_ANGKA.sebelas, 11);
  assert.equal(KATA_ANGKA.seratus, 100);
  assert.equal(KATA_ANGKA.seribu, 1000);
  assert.equal(KATA_ANGKA.setengah, 0.5);
  assert.equal(KATA_ANGKA.seperempat, 0.25);
  assert.equal(KATA_ANGKA.seperdua, 0.5);
});

test('kasus angka: ucapkanKeAngka, deret, dan determinisme', () => {
  for (const kasus of KASUS_ANGKA) {
    if (Object.prototype.hasOwnProperty.call(kasus.harapan, 'deret')) {
      assert.deepEqual(
        parseDeretAngka(kasus.ucapan),
        kasus.harapan.deret,
        `${kasus.id} deret`
      );
      assert.deepEqual(parseDeretAngka(kasus.ucapan), parseDeretAngka(kasus.ucapan));
      continue;
    }

    const nilai = ucapkanKeAngka(kasus.ucapan);
    assert.equal(nilai, kasus.harapan.nilai, `${kasus.id} (${kasus.ucapan})`);
    assert.equal(ucapkanKeAngka(kasus.ucapan), nilai, `${kasus.id} determinisme`);

    if (kasus.harapan.nilai !== null) {
      const ditemukan = parseAngkaDalamTeks(kasus.ucapan);
      assert.ok(ditemukan !== null, `${kasus.id} parseAngkaDalamTeks null`);
      assert.equal(ditemukan.nilai, kasus.harapan.nilai, `${kasus.id} posisi`);
      assert.ok(ditemukan.awal >= 0 && ditemukan.akhir > ditemukan.awal, `${kasus.id} rentang`);
      assert.equal(
        kasus.ucapan.slice(ditemukan.awal, ditemukan.akhir),
        ditemukan.teksAsli,
        `${kasus.id} teksAsli`
      );
    }
  }
});

test('ucapkanAngka: TTS Indonesia dan bolak-balik deterministik', () => {
  assert.equal(ucapkanAngka(12.5), 'dua belas koma lima');
  assert.equal(ucapkanAngka(0.5), 'nol koma lima');
  assert.equal(ucapkanAngka(140), 'seratus empat puluh');
  assert.equal(ucapkanAngka(1000), 'seribu');
  assert.equal(ucapkanAngka(2500), 'dua ribu lima ratus');
  assert.ok(!ucapkanAngka(12.5).includes('titik'));
  assert.equal(ucapkanAngka(Number.NaN), '');

  for (const kasus of KASUS_ANGKA) {
    if (typeof kasus.harapan.nilai !== 'number') continue;
    const tts = ucapkanAngka(kasus.harapan.nilai);
    assert.equal(typeof tts, 'string');
    assert.notEqual(tts, '', `${kasus.id} TTS kosong`);
    assert.equal(
      ucapkanKeAngka(tts),
      kasus.harapan.nilai,
      `${kasus.id} TTS tidak bolak-balik (${tts})`
    );
    assert.equal(ucapkanAngka(kasus.harapan.nilai), tts, `${kasus.id} TTS determinisme`);
  }
});

test('kasus obat: DikteObat, teks resep kanonik, dan determinisme', () => {
  for (const kasus of KASUS_OBAT) {
    const dikte = parseDikteObat(kasus.ucapan);
    assert.deepEqual(dikte, parseDikteObat(kasus.ucapan), `${kasus.id} determinisme`);

    if (kasus.harapan === null) {
      assert.equal(dikte, null, `${kasus.id} seharusnya null`);
      assert.equal(dikteKeTeksResep(kasus.ucapan), null, `${kasus.id} teks null`);
      assert.equal(dikteKeObat(kasus.ucapan, { now: SEKARANG }), null, `${kasus.id} obat null`);
      continue;
    }

    assert.ok(dikte !== null, `${kasus.id} tidak terurai`);
    cocokSebagian(dikte, kasus.harapan, kasus.id);
    assert.equal(dikte.ucapanAsli, kasus.ucapan);
    assert.ok(Array.isArray(dikte.bagianTidakDipahami), `${kasus.id} bagian`);
    assert.deepEqual(dikte.jadwalJam, jadwalUntukObat(dikte), `${kasus.id} jadwal`);

    const teks = dikteKeTeksResep(kasus.ucapan);
    assert.ok(teks !== null, `${kasus.id} teks null`);
    assert.equal(teks.resepteks, kasus.harapan.resepteks, `${kasus.id} resepteks`);
  }
});

test('dikteKeObat memakai kenaliResep/jadwalUntukObat, bukan parser kedua', () => {
  for (const kasus of KASUS_OBAT) {
    if (kasus.harapan === null) continue;

    const dikte = parseDikteObat(kasus.ucapan);
    const hasil = dikteKeObat(kasus.ucapan, { now: SEKARANG });

    assert.ok(hasil !== null, `${kasus.id} hasil null`);
    assert.equal(hasil.isMedicalAdvice, false, `${kasus.id} klaim medis`);
    assert.ok(Array.isArray(hasil.peringatan), `${kasus.id} peringatan`);
    assert.ok(Array.isArray(hasil.bagianTidakDipahami), `${kasus.id} bagian`);
    assert.equal(hasil.teksAsli, kasus.ucapan);

    const dasar = kenaliResep(dikte.resepteks, { now: SEKARANG }).obat[0];
    assert.ok(dasar, `${kasus.id} kenaliResep tidak menghasilkan obat`);
    assert.deepEqual(
      hasil.obat,
      { ...dasar, jadwalJam: jadwalUntukObat(dasar) },
      `${kasus.id} obat bukan hasil kenaliResep`
    );
    assert.deepEqual(hasil.hasilResep.obat[0], dasar, `${kasus.id} hasilResep`);
    assert.equal(hasil.hasilResep.isMedicalAdvice, false);

    assert.deepEqual(
      dikteKeObat(kasus.ucapan, { now: SEKARANG }),
      hasil,
      `${kasus.id} determinisme dikteKeObat`
    );

    if (kasus.pagar) {
      assert.equal(hasil.pagar.ok, kasus.pagar.ok, `${kasus.id} pagar.ok`);
      assert.equal(hasil.pagar.kode, kasus.pagar.kode, `${kasus.id} pagar.kode`);
      assert.ok(hasil.peringatan.length > 0, `${kasus.id} peringatan pagar`);
    } else {
      assert.equal(hasil.pagar.ok, true, `${kasus.id} pagar harus ok`);
      assert.equal(hasil.pagar.kode, null);
    }
  }
});

test('pagarKewajaranDosis menolak nilai tidak wajar', () => {
  assert.equal(PAGAR_TAKARAN_MAKS, 4);
  assert.equal(PAGAR_FREKUENSI_MAKS, 8);

  const wajar = pagarKewajaranDosis({
    takaranPerDosis: 4,
    kaliSehari: 8,
    satuanTakaran: 'tablet'
  });
  assert.equal(wajar.ok, true);
  assert.equal(wajar.kode, null);
  assert.equal(wajar.pesan, '');

  const takaran = pagarKewajaranDosis({
    takaranPerDosis: 4.5,
    kaliSehari: 2,
    satuanTakaran: 'tablet'
  });
  assert.equal(takaran.ok, false);
  assert.equal(takaran.kode, 'TAKARAN_TIDAK_WAJAR');
  assert.equal(typeof takaran.pesan, 'string');
  assert.ok(takaran.pesan.length > 0);

  const frekuensi = pagarKewajaranDosis({
    takaranPerDosis: 1,
    kaliSehari: 9,
    satuanTakaran: 'kapsul'
  });
  assert.equal(frekuensi.ok, false);
  assert.equal(frekuensi.kode, 'FREKUENSI_TIDAK_WAJAR');

  // Satuan bukan tablet/kapsul tidak terkena batas takaran padat.
  const cair = pagarKewajaranDosis({
    takaranPerDosis: 10,
    kaliSehari: 2,
    satuanTakaran: 'ml'
  });
  assert.equal(cair.ok, true);

  const kosong = pagarKewajaranDosis();
  assert.equal(kosong.ok, true);
});

test('kasus vital: DikteVital dan determinisme', () => {
  for (const kasus of KASUS_VITAL) {
    const hasil = parseDikteVital(kasus.ucapan);
    assert.ok(hasil !== null, `${kasus.id} null`);
    assert.deepEqual(hasil, parseDikteVital(kasus.ucapan), `${kasus.id} determinisme`);
    cocokSebagian(hasil, kasus.harapan, kasus.id);
    assert.equal(hasil.teksAsli, kasus.ucapan);
    assert.deepEqual(hasil.bagianTidakDipahami, []);
    assert.deepEqual(hasil.peringatan, []);
    assert.equal(Object.prototype.hasOwnProperty.call(hasil, 'diagnosis'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(hasil, 'normal'), false);
  }
});

test('parseDikteVital menolak kalimat di luar jenis yang didukung', () => {
  assert.equal(parseDikteVital('makan siang nasi goreng'), null);
  assert.equal(parseDikteVital('tensi tanpa angka'), null);
  assert.equal(parseDikteVital('tekanan darah seratus empat puluh'), null);
  assert.equal(parseDikteVital(''), null);
  assert.equal(parseDikteVital(null), null);
});
