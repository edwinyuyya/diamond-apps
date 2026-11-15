// Test penjaga ASR (CONTRACT 8B.11) — t34.
//
// Murni: node:test + node:assert/strict, tanpa dependency/DOM/jaringan.
// Fokus: batas durasi, keluaran kosong/terlalu panjang/berulang/rasio huruf,
// penggabungan periksaHasilAsr, ringkasan pesan, dan integrasi adaptor yang
// wajib menolak keluaran palsu sebelum dikembalikan ke pemanggil.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAKS_DURASI_REKAM_MS,
  MAKS_TOKEN_KELUARAN,
  MAKS_KARAKTER,
  RASIO_HURUF_MIN,
  PENGULANGAN_MAKS,
  periksaDurasi,
  deteksiPengulangan,
  periksaKeluaranAsr,
  periksaHasilAsr,
  ringkasTolakAsr
} from '../app/js/suara/penjagaAsr.js';
import { SuaraError, kenaliSuara } from '../app/js/suara/adaptor.js';

function fakeEngine({ teks = '', durasiMs = 1000, kepercayaan = 0.9 } = {}) {
  const calls = { start: 0, stop: 0, terminate: 0, recognize: 0 };
  return {
    id: 'fake',
    lokal: true,
    calls,
    async start() {
      calls.start += 1;
    },
    async stop() {
      calls.stop += 1;
    },
    async terminate() {
      calls.terminate += 1;
    },
    async recognize() {
      calls.recognize += 1;
      return { teks, durasiMs, kepercayaan };
    }
  };
}

test('konstanta penjaga sesuai kontrak 8B.11', () => {
  assert.equal(MAKS_DURASI_REKAM_MS, 8000);
  assert.equal(MAKS_TOKEN_KELUARAN, 48);
  assert.equal(MAKS_KARAKTER, 240);
  assert.ok(Math.abs(RASIO_HURUF_MIN - 0.55) < 1e-9);
  assert.equal(PENGULANGAN_MAKS, 3);
});

test('periksaDurasi: 8000 lolos, 8500 masih toleransi, 8501 ditolak', () => {
  assert.equal(periksaDurasi(8000).ok, true);
  assert.equal(periksaDurasi(8000).kode, null);
  assert.equal(periksaDurasi(8500).ok, true);
  const lama = periksaDurasi(8501);
  assert.equal(lama.ok, false);
  assert.equal(lama.kode, 'ASR_TERLALU_LAMA');
  assert.match(lama.pesan, /delapan detik/i);
});

test('periksaDurasi: negatif, NaN, dan bukan angka ditolak', () => {
  for (const nilai of [-1, Number.NaN, undefined, 'abc', Infinity]) {
    const hasil = periksaDurasi(nilai);
    assert.equal(hasil.ok, false, `durasi ${String(nilai)} harus ditolak`);
    assert.equal(hasil.kode, 'ASR_TERLALU_LAMA');
  }
});

test('periksaDurasi: batas kustom dipakai', () => {
  assert.equal(periksaDurasi(3000, { maksMs: 2000 }).ok, false);
  assert.equal(periksaDurasi(2500, { maksMs: 2000 }).ok, true);
});

test('periksaKeluaranAsr: kosong/whitespace -> ASR_TIDAK_TERDENGAR', () => {
  for (const teks of ['', '   ', '\n\t ']) {
    const hasil = periksaKeluaranAsr(teks);
    assert.equal(hasil.ok, false);
    assert.equal(hasil.kode, 'ASR_TIDAK_TERDENGAR');
    assert.equal(hasil.alasan, 'kosong');
    assert.equal(hasil.teksBersih, '');
  }
});

test('periksaKeluaranAsr: > 240 karakter atau > 48 token -> terlalu-panjang', () => {
  const panjang = 'a'.repeat(MAKS_KARAKTER + 1);
  const hasilKarakter = periksaKeluaranAsr(panjang);
  assert.equal(hasilKarakter.ok, false);
  assert.equal(hasilKarakter.kode, 'ASR_TIDAK_TERDENGAR');
  assert.equal(hasilKarakter.alasan, 'terlalu-panjang');

  const banyakToken = Array.from({ length: MAKS_TOKEN_KELUARAN + 1 }, (_, i) => `k${i}`).join(' ');
  const hasilToken = periksaKeluaranAsr(banyakToken);
  assert.equal(hasilToken.ok, false);
  assert.equal(hasilToken.alasan, 'terlalu-panjang');

  // Tepat di batas token (48 kata huruf murni) tetap lolos.
  const pasangan = [];
  for (const awal of 'abcdefghijklmnopqrstuvwx') {
    for (const akhir of 'abcdefghijklmnopqrstuvwxyz') {
      if (pasangan.length < MAKS_TOKEN_KELUARAN) pasangan.push(`${awal}${akhir}`);
    }
  }
  assert.equal(pasangan.length, MAKS_TOKEN_KELUARAN);
  assert.equal(periksaKeluaranAsr(pasangan.join(' ')).ok, true);
});

test('pengulangan: token/pola berulang >= 4 ditolak', () => {
  for (const teks of [
    '2.2.2.2.2.2.2.2',
    'bla bla bla bla bla',
    'aaaaaaa',
    'ya ya ya ya'
  ]) {
    const cek = deteksiPengulangan(teks);
    assert.equal(cek.berulang, true, `harus terdeteksi berulang: ${teks}`);
    assert.ok(cek.jumlah >= 4);

    const hasil = periksaKeluaranAsr(teks);
    assert.equal(hasil.ok, false, `harus ditolak: ${teks}`);
    assert.equal(hasil.kode, 'ASR_BERULANG');
  }
});

test('pengulangan: kalimat wajar dengan satu kata dua kali tetap lolos', () => {
  const teks = 'minum pagi dan pagi lagi';
  assert.equal(deteksiPengulangan(teks).berulang, false);
  assert.equal(periksaKeluaranAsr(teks).ok, true);
});

test('rasio huruf rendah ditolak, angka pendek tetap diterima', () => {
  const simbol = periksaKeluaranAsr('#@$%^&*()');
  assert.equal(simbol.ok, false);
  assert.equal(simbol.kode, 'ASR_TIDAK_TERDENGAR');
  assert.equal(simbol.alasan, 'bukan-kata');

  for (const angka of ['2', '12', '8']) {
    const hasil = periksaKeluaranAsr(angka);
    assert.equal(hasil.ok, true, `angka pendek ${angka} harus lolos`);
  }
});

test('periksaKeluaranAsr mengembalikan teks bersih (NFKC + spasi rapi)', () => {
  const hasil = periksaKeluaranAsr('  dua   kali sehari  ');
  assert.equal(hasil.ok, true);
  assert.equal(hasil.teksBersih, 'dua kali sehari');
  // Teks tidak "diperbaiki"/ditebak.
  assert.equal(periksaKeluaranAsr('semelum').teksBersih, 'semelum');
});

test('periksaHasilAsr menggabungkan durasi + keluaran tanpa memutasi input', () => {
  const masukan = { teks: '  dua kali sehari ', durasiMs: 1200, tambahan: 'x' };
  const salinan = { ...masukan };
  const hasil = periksaHasilAsr(masukan);

  assert.equal(hasil.ok, true);
  assert.equal(hasil.kode, null);
  assert.equal(hasil.hasil.teks, 'dua kali sehari');
  assert.equal(hasil.hasil.tambahan, 'x');
  assert.deepEqual(masukan, salinan, 'input tidak boleh dimutasi');

  // Deterministik.
  assert.deepEqual(periksaHasilAsr(masukan), hasil);
});

test('periksaHasilAsr: durasi terlalu lama menang atas teks valid', () => {
  const hasil = periksaHasilAsr({ teks: 'dua kali sehari', durasiMs: 8600 });
  assert.equal(hasil.ok, false);
  assert.equal(hasil.kode, 'ASR_TERLALU_LAMA');
  assert.equal(hasil.alasan, 'durasi');
  assert.equal(hasil.hasil, null);
});

test('periksaHasilAsr: keluaran rusak -> hasil:null', () => {
  const hasil = periksaHasilAsr({ teks: '2.2.2.2.2.2.2.2', durasiMs: 1000 });
  assert.equal(hasil.ok, false);
  assert.equal(hasil.kode, 'ASR_BERULANG');
  assert.equal(hasil.hasil, null);
});

test('ringkasTolakAsr memberi pesan Indonesia untuk setiap kode', () => {
  assert.match(ringkasTolakAsr('ASR_TERLALU_LAMA'), /terlalu lama/i);
  assert.match(ringkasTolakAsr('ASR_TERLALU_LAMA'), /delapan detik/i);
  for (const kode of ['ASR_BERULANG', 'ASR_TIDAK_TERDENGAR', 'KODE_TAK_DIKENAL', undefined]) {
    const pesan = ringkasTolakAsr(kode);
    assert.match(pesan, /tidak terdengar/i);
    assert.match(pesan, /ulangi|tombol/i);
  }
});

test('adaptor menolak keluaran palsu berulang sebelum dikembalikan', async () => {
  const engine = fakeEngine({ teks: '2.2.2.2.2.2.2.2', durasiMs: 1000 });

  await assert.rejects(
    () => kenaliSuara({ engineImpl: engine }),
    (error) => {
      assert.ok(error instanceof SuaraError);
      assert.equal(error.code, 'ASR_BERULANG');
      assert.doesNotMatch(error.message, /2\.2\.2/);
      return true;
    }
  );

  assert.equal(engine.calls.recognize, 1);
  assert.ok(engine.calls.stop >= 1, 'stop harus dipanggil');
  assert.equal(engine.calls.terminate, 1, 'terminate harus dipanggil');
});

test('adaptor menolak durasi > 8500 ms dengan ASR_TERLALU_LAMA', async () => {
  const engine = fakeEngine({ teks: 'dua kali sehari', durasiMs: 8501 });
  await assert.rejects(
    () => kenaliSuara({ engineImpl: engine }),
    (error) => {
      assert.ok(error instanceof SuaraError);
      assert.equal(error.code, 'ASR_TERLALU_LAMA');
      return true;
    }
  );
  assert.equal(engine.calls.terminate, 1);
});

test('adaptor meneruskan hasil wajar apa adanya setelah penjaga lolos', async () => {
  const engine = fakeEngine({ teks: 'dua kali sehari', durasiMs: 1200 });
  const hasil = await kenaliSuara({ engineImpl: engine });
  assert.equal(hasil.teks, 'dua kali sehari');
  assert.equal(hasil.mesin, 'fake');
  assert.equal(engine.calls.terminate, 1);
});
