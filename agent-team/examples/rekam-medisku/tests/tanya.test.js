// Test alur tanya obat satu per satu (CONTRACT 8B.12–8B.16) — t34.
//
// node:test + node:assert/strict saja; tanpa DOM, dependency, atau jaringan.
// Mencakup korpus ≥ 60, pencocok tertutup, mesin keadaan, pemilih nama,
// orkestrasi TTS/ASR, dan teks TTS.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { TANYA_CASES, KATA_RUSAK, MINIMAL_KASUS } from './fixtures/tanya-cases.js';
import {
  PERTANYAAN_TANYA,
  URUTAN_PERTANYAAN,
  pertanyaanUntuk,
  pilihanUntuk,
  labelPilihan,
  semuaNilai
} from '../app/js/logic/kosakataTertutup.js';
import {
  AMBANG_COCOK,
  MARGIN_AMBIGU,
  cocokkanJawaban,
  cocokkanBanyak,
  normalisasiJawaban,
  jarakEdit,
  kodeFonetis,
  skorKemiripan
} from '../app/js/logic/pencocokJawaban.js';
import {
  LANGKAH_TANYA,
  MAKS_GAGAL_PAHAM,
  buatSesiTanya,
  pertanyaanSaatIni,
  jawabTanya,
  pilihJawabanTombol,
  ketikJawaban,
  lanjutKeKonfirmasi,
  ringkasSesi,
  selesaikanSesi,
  bangunMedicationDariSesi
} from '../app/js/logic/tanyaSatuPerSatu.js';
import {
  SUMBER_NAMA_OBAT,
  PERTANYAAN_EJAAN,
  validasiNamaObat,
  daftarNamaDariObat,
  daftarNamaDariPindai,
  bacaSatuPerSatu,
  cocokkanYaTidak,
  buatSesiNama,
  pilihNama,
  jawabNama,
  ketikNama,
  mulaiEjaan,
  tambahHuruf,
  hapusHuruf,
  selesaiEjaan,
  konfirmasiEjaan
} from '../app/js/logic/pemilihNamaObat.js';
import { PERTANYAAN_KONFIRMASI } from '../app/js/logic/konfirmasiSuara.js';
import {
  PERTANYAAN_TANYA_TEKS,
  teksPertanyaan,
  teksPilihan,
  teksNamaDariDaftar,
  teksEjaan,
  teksKonfirmasiTanya,
  bacakanPertanyaan
} from '../app/js/suara/ttsTanya.js';
import { jalankanTanyaSatuPerSatu } from '../app/js/suara/alurTanya.js';
import { SuaraError } from '../app/js/suara/adaptor.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const NOW = new Date(2026, 10, 9, 7, 0, 0);

const JAWABAN_LIMA = ['2 kali', 'satu tablet', 'sesudah makan', 'pagi dan malam', 'tidak perlu'];

function cocok(pertanyaan, ucapan) {
  return pertanyaan === 'waktu'
    ? cocokkanBanyak(ucapan, pertanyaan)
    : cocokkanJawaban(ucapan, pertanyaan);
}

function sesiSetelahLima(jawaban = JAWABAN_LIMA) {
  let sesi = buatSesiTanya({ nama: 'Captopril', sumberNama: 'daftar', now: NOW });
  for (const teks of jawaban) {
    const hasil = jawabTanya(sesi, teks);
    assert.equal(hasil.aksi, 'terima', `jawaban "${teks}" harus diterima`);
    sesi = hasil.sesi;
  }
  return sesi;
}

function bacaSumber(relatif) {
  return readFileSync(`${ROOT}/${relatif}`, 'utf8');
}

// ===========================================================================
// 1. Korpus ≥ 60 (8B.12.3)
// ===========================================================================

test('korpus tanya memuat minimal 60 kasus realistis', () => {
  assert.ok(TANYA_CASES.length >= MINIMAL_KASUS, `korpus ${TANYA_CASES.length} < ${MINIMAL_KASUS}`);
  const id = new Set(TANYA_CASES.map((kasus) => kasus.id));
  assert.equal(id.size, TANYA_CASES.length, 'id kasus harus unik');

  for (const kasus of TANYA_CASES) {
    assert.equal(typeof kasus.id, 'string');
    assert.ok(Object.prototype.hasOwnProperty.call(PERTANYAAN_TANYA, kasus.pertanyaan));
    assert.equal(typeof kasus.ucapan, 'string');
    assert.ok(['cocok', 'ambigu', 'tidak-cocok'].includes(kasus.harapan.status));
  }
});

test('korpus memuat varian salah dengar dan frasa wajib kontrak', () => {
  const daftar = TANYA_CASES.map((kasus) => `${kasus.pertanyaan}|${kasus.ucapan}`);
  const wajib = [
    'frekuensi|Dua Kalisahari',
    'aturanMakan|Semelum',
    'frekuensi|sahurabla',
    'frekuensi|dua kali sehari',
    'frekuensi|2 kali',
    'takaran|setengah',
    'takaran|satu setengah',
    'takaran|dua koma lima',
    'waktu|pagi dan malam',
    'waktu|sebelum tidur',
    'bilaPerlu|kalau perlu',
    'bilaPerlu|tidak perlu'
  ];
  for (const frasa of wajib) {
    assert.ok(daftar.includes(frasa), `korpus harus memuat "${frasa}"`);
  }

  assert.ok(
    TANYA_CASES.filter((kasus) => kasus.id.startsWith('n')
      && kasus.harapan.status === 'tidak-cocok').length >= 8,
    'minimal 8 kasus negatif lintas-pertanyaan'
  );
  assert.ok(
    TANYA_CASES.filter((kasus) => kasus.harapan.status === 'ambigu').length >= 4,
    'minimal 4 kasus ambigu'
  );
});

test('setiap kasus korpus cocok dengan harapannya (status + nilai)', () => {
  for (const kasus of TANYA_CASES) {
    const hasil = cocok(kasus.pertanyaan, kasus.ucapan);
    assert.equal(hasil.status, kasus.harapan.status, `kasus ${kasus.id} (${kasus.ucapan})`);
    assert.deepEqual(hasil.nilai, kasus.harapan.nilai, `kasus ${kasus.id} (${kasus.ucapan})`);
  }
});

test('pencocok tidak pernah mengembalikan nilai di luar pilihan & deterministik', () => {
  for (const kasus of TANYA_CASES) {
    const hasil = cocok(kasus.pertanyaan, kasus.ucapan);
    const hasilKedua = cocok(kasus.pertanyaan, kasus.ucapan);
    assert.deepEqual(hasil, hasilKedua, `kasus ${kasus.id} harus deterministik`);

    const pilihan = pilihanUntuk(kasus.pertanyaan);
    if (hasil.status === 'cocok') {
      if (Array.isArray(hasil.nilai)) {
        assert.ok(hasil.nilai.length > 0);
        assert.equal(new Set(hasil.nilai).size, hasil.nilai.length, 'tanpa duplikat');
        for (const nilai of hasil.nilai) {
          assert.ok(pilihan.includes(nilai), `nilai ${nilai} di luar pilihan`);
        }
        const urut = pilihan.filter((nilai) => hasil.nilai.includes(nilai));
        assert.deepEqual(hasil.nilai, urut, 'urutan waktu sesuai kosakata');
      } else {
        assert.ok(pilihan.includes(hasil.nilai), `nilai ${hasil.nilai} di luar pilihan`);
      }
    } else {
      assert.equal(hasil.nilai, null, 'ambigu/tidak-cocok tidak menghasilkan nilai');
    }
  }
});

test('"sahurabla" ditolak untuk semua pertanyaan', () => {
  for (const kata of KATA_RUSAK) {
    for (const id of URUTAN_PERTANYAAN) {
      const hasil = cocok(id, kata);
      assert.equal(hasil.status, 'tidak-cocok', `${kata} untuk ${id}`);
      assert.equal(hasil.nilai, null);
    }
  }
});

test('larangan memaksa: jawaban pertanyaan lain tidak dipetakan', () => {
  assert.equal(cocokkanJawaban('pagi', 'frekuensi').status, 'tidak-cocok');
  assert.equal(cocokkanJawaban('dua kali sehari', 'aturanMakan').status, 'tidak-cocok');
  assert.equal(cocokkanJawaban('sesudah makan', 'takaran').status, 'tidak-cocok');
  assert.equal(cocokkanJawaban('sebelum makan', 'waktu').status, 'tidak-cocok');
  assert.equal(cocokkanJawaban('malam', 'bilaPerlu').status, 'tidak-cocok');
});

test('pencocok: normalisasi, jarakEdit, fonetis, skor, dan ambang', () => {
  assert.equal(normalisasiJawaban('  Dua, KALI sehari! '), 'dua kali sehari');
  assert.equal(jarakEdit('kucing', 'kucung'), 1);
  assert.equal(jarakEdit('', 'abc'), 3);
  assert.equal(kodeFonetis('photo'), 'foto');
  assert.equal(kodeFonetis('vita'), 'fita');
  assert.equal(kodeFonetis('sya'), 'sa');
  assert.ok(skorKemiripan('Semelum', 'sebelum') >= 0.8);
  assert.ok(skorKemiripan('sahurabla', 'sebelum') < AMBANG_COCOK);
  assert.equal(AMBANG_COCOK, 0.72);
  assert.equal(MARGIN_AMBIGU, 0.08);
});

// ===========================================================================
// 2. Kosakata tertutup (8B.12.1)
// ===========================================================================

test('kosakata: lima pertanyaan persis dan urutannya', () => {
  assert.deepEqual(URUTAN_PERTANYAAN, [
    'frekuensi', 'takaran', 'aturanMakan', 'waktu', 'bilaPerlu'
  ]);
  assert.deepEqual(Object.keys(PERTANYAAN_TANYA), URUTAN_PERTANYAAN);
  assert.equal(pertanyaanUntuk('frekuensi').pertanyaan, 'Berapa kali sehari?');
  assert.equal(pertanyaanUntuk('takaran').pertanyaan, 'Berapa tablet sekali minum?');
  assert.equal(pertanyaanUntuk('aturanMakan').pertanyaan, 'Sebelum, sesudah, atau saat makan?');
  assert.equal(pertanyaanUntuk('waktu').pertanyaan, 'Pagi, siang, sore, malam, atau sebelum tidur?');
  assert.equal(pertanyaanUntuk('bilaPerlu').pertanyaan, 'Hanya kalau perlu?');
  assert.equal(pertanyaanUntuk('lain'), null);
  assert.deepEqual(pilihanUntuk('frekuensi'), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(pilihanUntuk('takaran'), [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]);
  assert.deepEqual(pilihanUntuk('waktu'), ['pagi', 'siang', 'sore', 'malam', 'sebelum-tidur']);
  assert.equal(pertanyaanUntuk('waktu').tipe, 'multi');
  assert.equal(pertanyaanUntuk('bilaPerlu').tipe, 'ya-tidak');
});

test('kosakata: label Indonesia dan tidak ada pilihan bebas/lain', () => {
  assert.equal(labelPilihan('frekuensi', 2), '2 kali');
  assert.equal(labelPilihan('takaran', 0.5), 'setengah tablet');
  assert.equal(labelPilihan('takaran', 2.5), 'dua setengah tablet');
  assert.equal(labelPilihan('aturanMakan', 'sesudah'), 'sesudah makan');
  assert.equal(labelPilihan('waktu', 'sebelum-tidur'), 'sebelum tidur');
  assert.equal(labelPilihan('bilaPerlu', true), 'Ya, hanya kalau perlu');
  assert.equal(labelPilihan('frekuensi', 99), null);
  assert.deepEqual(semuaNilai('takaran'), pilihanUntuk('takaran'));

  const terlarang = new Set(['lain', 'bebas', 'lainnya', 'terserah']);
  for (const id of URUTAN_PERTANYAAN) {
    for (const nilai of pilihanUntuk(id)) {
      assert.ok(!terlarang.has(String(nilai).toLowerCase()));
    }
  }
});

// ===========================================================================
// 3. Mesin keadaan tanya satu per satu (8B.13)
// ===========================================================================

test('langkah nama menolak ASR bebas tanpa mengubah nama', () => {
  const sesi = buatSesiTanya({ now: NOW });
  assert.equal(sesi.langkah, 'nama');
  assert.equal(sesi.nama, null);

  const hasil = jawabTanya(sesi, 'Captopril', { sumber: 'suara' });
  assert.equal(hasil.aksi, 'tolak-nama-dari-suara');
  assert.equal(hasil.error.code, 'NAMA_TIDAK_VALID');
  assert.equal(
    hasil.ucapan,
    'Nama obat tidak bisa dari suara bebas. Pilih dari daftar, ketik, atau eja.'
  );
  assert.equal(hasil.sesi.nama, null);
  assert.equal(hasil.sesi.langkah, 'nama');
  // Objek lama tidak dimutasi.
  assert.equal(sesi.nama, null);
  assert.equal(sesi.riwayat.length, 0);
});

test('nama dari tombol/ketikan diterima dan maju ke frekuensi', () => {
  const sesi = buatSesiTanya({ now: NOW });

  const tombol = pilihJawabanTombol(sesi, { nama: 'Captopril', sumber: 'daftar' });
  assert.equal(tombol.sesi.nama, 'Captopril');
  assert.equal(tombol.sesi.sumberNama, 'daftar');
  assert.equal(tombol.sesi.langkah, 'frekuensi');

  const ketik = ketikJawaban(sesi, 'Amlodipin');
  assert.equal(ketik.aksi, 'terima');
  assert.equal(ketik.sesi.nama, 'Amlodipin');
  assert.equal(ketik.sesi.sumberNama, 'ketik');
  assert.equal(ketik.sesi.langkah, 'frekuensi');
});

test('nama invalid ditolak dan tetap di langkah nama', () => {
  const sesi = buatSesiTanya({ now: NOW });
  for (const buruk of ['12', 'A', '   ', '#@!']) {
    const hasil = ketikJawaban(sesi, buruk);
    assert.equal(hasil.aksi, 'tidak-berlaku');
    assert.equal(hasil.error.code, 'NAMA_TIDAK_VALID');
    assert.equal(hasil.sesi.nama, null);
    assert.equal(hasil.sesi.langkah, 'nama');
  }
});

test('lima jawaban valid maju langkah dan tidak memutasi sesi lama', () => {
  let sesi = buatSesiTanya({ nama: 'Captopril', sumberNama: 'daftar', now: NOW });
  const langkahAwal = sesi.langkah;
  const urutan = [];

  for (const teks of JAWABAN_LIMA) {
    const sebelum = structuredClone(sesi);
    const hasil = jawabTanya(sesi, teks);
    assert.equal(hasil.aksi, 'terima');
    assert.deepEqual(sesi, sebelum, 'sesi lama tidak boleh berubah');
    sesi = hasil.sesi;
    urutan.push(sesi.langkah);
  }

  assert.equal(langkahAwal, 'frekuensi');
  assert.deepEqual(urutan, ['takaran', 'aturanMakan', 'waktu', 'bilaPerlu', 'konfirmasi']);
  assert.deepEqual(sesi.jawaban, {
    frekuensi: 2,
    takaran: 1,
    aturanMakan: 'sesudah',
    waktu: ['pagi', 'malam'],
    bilaPerlu: false
  });
  assert.equal(LANGKAH_TANYA.includes('selesai'), true);
});

test('gagal paham maksimum 2 lalu mode tombol tanpa memaksa cocok', () => {
  let sesi = buatSesiTanya({ nama: 'Captopril', now: NOW });
  assert.equal(MAKS_GAGAL_PAHAM, 2);

  const pertama = jawabTanya(sesi, 'sahurabla');
  assert.equal(pertama.aksi, 'ulangi');
  assert.equal(pertama.sesi.gagalPaham.frekuensi, 1);
  assert.equal(pertama.ucapan, 'Berapa kali sehari?');

  const kedua = jawabTanya(pertama.sesi, 'sahurabla');
  assert.equal(kedua.aksi, 'tombol');
  assert.equal(kedua.sesi.gagalPaham.frekuensi, 2);
  assert.equal(kedua.sesi.modeTombol, true);
  assert.equal(kedua.pertanyaan.modeTombol, true);
  assert.equal(kedua.pertanyaan.bolehTombol, true);
  assert.equal(kedua.pertanyaan.bolehKetik, true);
  assert.match(kedua.ucapan, /Silakan pilih tombol atau ketik jawaban\./);

  const ketiga = jawabTanya(kedua.sesi, 'sahurabla');
  assert.equal(ketiga.aksi, 'tombol');
  assert.equal(ketiga.sesi.gagalPaham.frekuensi, 2, 'counter tidak bertambah');
  assert.equal(ketiga.ucapan, '', 'TTS tidak diulang berkali-kali');
});

test('tombol dan ketikan selalu dapat menyelesaikan lima langkah', () => {
  // Jalur tombol.
  let sesi = buatSesiTanya({ nama: 'Captopril', now: NOW });
  const lewatTombol = [
    [2],
    [1],
    ['sesudah'],
    [['pagi', 'malam', 'pagi']],
    [false]
  ];
  for (const [nilai] of lewatTombol) {
    const hasil = pilihJawabanTombol(sesi, nilai);
    assert.ok(['terima', 'tombol'].includes(hasil.aksi), `aksi ${hasil.aksi}`);
    sesi = hasil.sesi;
  }
  assert.equal(sesi.langkah, 'konfirmasi');
  assert.deepEqual(sesi.jawaban.waktu, ['pagi', 'malam'], 'urut & tanpa duplikat');

  // Jalur ketikan.
  const lewatKetik = ['dua kali sehari', 'satu setengah', 'sebelum makan', 'malam dan pagi', 'kalau perlu'];
  let sesiKetik = buatSesiTanya({ nama: 'Captopril', now: NOW });
  for (const teks of lewatKetik) {
    const hasil = ketikJawaban(sesiKetik, teks);
    assert.equal(hasil.aksi, 'terima', `ketikan "${teks}"`);
    sesiKetik = hasil.sesi;
  }
  assert.equal(sesiKetik.langkah, 'konfirmasi');
  assert.deepEqual(sesiKetik.jawaban.waktu, ['pagi', 'malam']);
  assert.equal(sesiKetik.jawaban.bilaPerlu, true);
});

test('nilai tombol/ketikan di luar pilihan ditolak TANYA_TIDAK_VALID', () => {
  const sesi = buatSesiTanya({ nama: 'Captopril', now: NOW });
  const salah = pilihJawabanTombol(sesi, 99);
  assert.equal(salah.aksi, 'tidak-berlaku');
  assert.equal(salah.error.code, 'TANYA_TIDAK_VALID');

  const salahKetik = ketikJawaban(sesi, 'entah berapa');
  assert.equal(salahKetik.aksi, 'tidak-berlaku');
  assert.equal(salahKetik.error.code, 'TANYA_TIDAK_VALID');
  assert.equal(salahKetik.sesi.langkah, 'frekuensi');
});

test('ringkasSesi memuat semua isian + status belum diperiksa', () => {
  const sesi = sesiSetelahLima();
  const ringkas = ringkasSesi(sesi);

  assert.match(ringkas, /Captopril/);
  assert.match(ringkas, /satu tablet/);
  assert.match(ringkas, /dua kali sehari/); // ucapkanAngka(2)
  assert.match(ringkas, /sesudah makan/);
  assert.match(ringkas, /pagi dan malam/);
  assert.match(ringkas, /hanya kalau perlu: tidak/);
  assert.match(ringkas, /belum diperiksa/i);
  assert.doesNotMatch(ringkas, /Captopril, 1 kali/i, 'angka tidak boleh digit mentah');
});

test('lanjutKeKonfirmasi hanya setelah lengkap dan tidak menyimpan', () => {
  const belum = buatSesiTanya({ nama: 'Captopril', now: NOW });
  const gagal = lanjutKeKonfirmasi(belum);
  assert.equal(gagal.aksi, 'tidak-berlaku');
  assert.equal(gagal.error.code, 'TANYA_TIDAK_VALID');

  const lengkap = sesiSetelahLima();
  const siap = lanjutKeKonfirmasi(lengkap);
  assert.equal(siap.aksi, 'konfirmasi');
  assert.equal(siap.pertanyaan.pertanyaan, PERTANYAAN_KONFIRMASI);
  assert.match(siap.ucapan, new RegExp(PERTANYAAN_KONFIRMASI.replace('?', '\\?')));
});

test('selesaikanSesi(simpan:true) hanya setelah lengkap; simpan:false = batal', () => {
  const belum = buatSesiTanya({ nama: 'Captopril', now: NOW });
  const takLengkap = selesaikanSesi(belum, { simpan: true, now: NOW });
  assert.equal(takLengkap.medication, null);
  assert.equal(takLengkap.aksi, 'tidak-berlaku');
  assert.equal(takLengkap.error.code, 'TANYA_TIDAK_VALID');

  const lengkap = sesiSetelahLima();
  const batal = selesaikanSesi(lengkap, { simpan: false, now: NOW });
  assert.equal(batal.medication, null);
  assert.equal(batal.aksi, 'batal');
  assert.equal(batal.sesi.status, 'batal');
});

test('medication hasil sesi memuat bentuk 8B.15 dan pemeriksaan belum', () => {
  const sesi = sesiSetelahLima();
  const hasil = selesaikanSesi(sesi, { simpan: true, now: NOW });
  assert.equal(hasil.aksi, 'selesai');
  const med = hasil.medication;

  assert.ok(med);
  assert.equal(med.name, 'Captopril');
  assert.equal(med.profileId, null);
  assert.equal(med.dose, '');
  assert.equal(med.doseUnit, '');
  assert.equal(med.source, null);
  assert.equal(med.dibuatDengan, 'suara');
  assert.equal(med.dikonfirmasiDengan, 'suara');
  assert.equal(med.pemeriksaanOrangLain.status, 'belum');
  assert.equal(med.pemeriksaanOrangLain.sumber, 'belum-diperiksa');
  assert.equal(med.stock.unit, 'tablet');
  assert.equal(med.stock.unitsPerDose, 1);
  assert.equal(med.stock.remaining, null);
  assert.deepEqual(med.times, ['07:00', '19:00']);
  assert.equal(med.instructions, '2 kali sehari, sesudah makan, pagi dan malam');
  assert.match(med.startDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(med.endDate, null);
  assert.deepEqual(med.daysOfWeek, [0, 1, 2, 3, 4, 5, 6]);
});

test('bilaPerlu:true mencatat waktu untuk ringkasan tetapi times kosong', () => {
  const sesi = sesiSetelahLima(['2 kali', 'satu tablet', 'sesudah makan', 'pagi dan malam', 'kalau perlu']);
  assert.deepEqual(sesi.jawaban.waktu, ['pagi', 'malam']);
  assert.equal(sesi.jawaban.bilaPerlu, true);
  assert.match(ringkasSesi(sesi), /hanya kalau perlu: ya/);

  const med = bangunMedicationDariSesi(sesi, { now: NOW });
  assert.deepEqual(med.times, []);
  assert.match(med.instructions, /hanya kalau perlu/);
});

test('pagar dosis > 4 tablet / > 8 kali ditolak TANYA_TIDAK_VALID', () => {
  const sesi = sesiSetelahLima();
  const terlaluBanyakTablet = {
    ...sesi,
    jawaban: { ...sesi.jawaban, takaran: 4.5 }
  };
  const hasilTablet = selesaikanSesi(terlaluBanyakTablet, { simpan: true, now: NOW });
  assert.equal(hasilTablet.medication, null);
  assert.equal(hasilTablet.error.code, 'TANYA_TIDAK_VALID');

  const terlaluSering = {
    ...sesi,
    jawaban: { ...sesi.jawaban, frekuensi: 9 }
  };
  const hasilFrekuensi = selesaikanSesi(terlaluSering, { simpan: true, now: NOW });
  assert.equal(hasilFrekuensi.medication, null);
  assert.equal(hasilFrekuensi.error.code, 'TANYA_TIDAK_VALID');

  const konfirmasi = lanjutKeKonfirmasi(terlaluBanyakTablet);
  assert.equal(konfirmasi.aksi, 'tidak-berlaku');
  assert.equal(konfirmasi.error.code, 'TANYA_TIDAK_VALID');
});

// ===========================================================================
// 4. Pemilih nama obat (8B.14)
// ===========================================================================

test('pemilih nama: daftar/pindai unik, urut abjad, dan bacaan satu per satu', () => {
  assert.equal(validasiNamaObat('Captopril').ok, true);
  for (const buruk of ['', 'A', '12', '#@!', 'x'.repeat(81), 'a\nb']) {
    assert.equal(validasiNamaObat(buruk).ok, false, `nama "${buruk}" harus invalid`);
  }

  assert.deepEqual(
    daftarNamaDariObat([{ name: 'Captopril' }, { name: 'Amlodipin' }, { name: 'captopril' }, 'Metformin']),
    ['Amlodipin', 'Captopril', 'Metformin']
  );
  assert.deepEqual(
    daftarNamaDariPindai({ obat: [{ nama: 'Simvastatin' }, { nama: 'Amlodipin' }] }),
    ['Amlodipin', 'Simvastatin']
  );
  assert.deepEqual(bacaSatuPerSatu(['Captopril']), [
    { nama: 'Captopril', pertanyaan: 'Captopril? ya atau tidak' }
  ]);
  assert.deepEqual(bacaSatuPerSatu(['Sama', 'sama']).length, 1);
  assert.equal(cocokkanYaTidak('ya'), 'ya');
  assert.equal(cocokkanYaTidak('tidak'), 'tidak');
  assert.equal(cocokkanYaTidak('entah'), 'lain');
  assert.deepEqual(SUMBER_NAMA_OBAT, ['daftar', 'pindai', 'ketik', 'ejaan']);
});

test('pemilih nama: ya/tidak/lain, lalu tombol/ketik bila buntu', () => {
  const sesi = buatSesiNama({ sumber: 'daftar', kandidat: ['Captopril', 'Amlodipin'] });

  const ya = jawabNama(sesi, 'ya');
  assert.equal(ya.aksi, 'selesai');
  assert.equal(ya.sesi.nama, 'Captopril');
  assert.equal(ya.sesi.status, 'selesai');

  const tidak = jawabNama(sesi, 'tidak');
  assert.equal(tidak.aksi, 'lanjut');
  assert.equal(tidak.pertanyaan, 'Amlodipin? ya atau tidak');

  const habis = jawabNama(tidak.sesi, 'tidak');
  assert.equal(habis.aksi, 'batal');
  assert.match(habis.ucapan, /Ketik atau eja nama obat/);

  const lain1 = jawabNama(sesi, 'hmm');
  assert.equal(lain1.aksi, 'ulangi');
  const lain2 = jawabNama(lain1.sesi, 'hmm');
  assert.equal(lain2.aksi, 'tombol');
  assert.equal(lain2.sesi.jumlahTanyaUlang, 2);
});

test('pemilih nama: ketikan divalidasi, ejaan tertutup + konfirmasi', () => {
  assert.equal(ketikNama(buatSesiNama(), '12').error.code, 'NAMA_TIDAK_VALID');
  const ketik = ketikNama(buatSesiNama(), 'Amlodipin');
  assert.equal(ketik.aksi, 'selesai');
  assert.equal(ketik.sesi.nama, 'Amlodipin');
  assert.equal(ketik.sesi.sumber, 'ketik');

  let eja = mulaiEjaan(buatSesiNama());
  assert.equal(eja.sumber, 'ejaan');
  for (const huruf of ['ce', 'a', 'pe', 'te', 'o', 'pe', 'er', 'i', 'el']) {
    eja = tambahHuruf(eja, huruf);
  }
  assert.equal(eja.ejaan, 'captopril');
  eja = hapusHuruf(eja);
  assert.equal(eja.ejaan, 'captopri');

  const salahHuruf = tambahHuruf(mulaiEjaan(buatSesiNama()), 'zz');
  assert.equal(salahHuruf.error.code, 'NAMA_TIDAK_VALID');
  assert.equal(salahHuruf.sesi.ejaan, '');

  const selesai = selesaiEjaan(eja);
  assert.equal(selesai.status, 'menunggu-konfirmasi-ejaan');
  assert.equal(selesai.pertanyaan, 'Apakah nama obatnya captopri?');
  assert.ok(PERTANYAAN_EJAAN.startsWith('Apakah nama obatnya '));

  const ya = konfirmasiEjaan(selesai, 'ya');
  assert.equal(ya.aksi, 'selesai');
  assert.equal(ya.sesi.nama, 'captopri');

  const tidak = konfirmasiEjaan(selesai, 'tidak');
  assert.equal(tidak.aksi, 'ulangi');
  assert.equal(tidak.sesi.ejaan, '');
  assert.equal(tidak.sesi.status, 'memilih');
});

test('nama tidak pernah berasal dari teks ASR (tidak impor adaptor/suara)', () => {
  for (const berkas of [
    'app/js/logic/pemilihNamaObat.js',
    'app/js/logic/tanyaSatuPerSatu.js'
  ]) {
    const sumber = bacaSumber(berkas);
    assert.doesNotMatch(sumber, /suara\/(adaptor|whisperEngine|webSpeech)/, berkas);
    assert.doesNotMatch(sumber, /\bkenaliSuara\s*\(/, berkas);
    assert.doesNotMatch(sumber, /\bfetch\s*\(/, berkas);
  }
});

// ===========================================================================
// 5. Orkestrasi alurTanya (8B.15)
// ===========================================================================

function buatFakeAdaptor({ jawaban = [], gagalKode = [], events = [] } = {}) {
  let indeks = 0;
  let gagalTersisa = [...gagalKode];
  let started = false;
  return {
    events,
    get started() {
      return started;
    },
    async berhenti() {
      events.push('berhenti');
      started = false;
    },
    async mulai() {
      events.push('mulai');
      started = true;
    },
    async kenali() {
      events.push(started ? 'kenali' : 'kenali-tanpa-mulai');
      if (gagalTersisa.length > 0) {
        const kode = gagalTersisa.shift();
        throw new SuaraError('ditolak penjaga', { code: kode });
      }
      const teks = jawaban[indeks] ?? jawaban[jawaban.length - 1] ?? '';
      indeks += 1;
      return { teks, durasiMs: 1000 };
    }
  };
}

function buatFakeTts(events = [], catatan = []) {
  return {
    async bacakan(teks) {
      events.push('tts');
      catatan.push(teks);
      return { selesai: true };
    }
  };
}

function buatFakeState() {
  return {
    upsertCalls: [],
    async upsert(koleksi, item) {
      this.upsertCalls.push([koleksi, item]);
    }
  };
}

test('alurTanya: mikrofon berhenti sebelum TTS, lalu mulai sebelum kenali', async () => {
  const events = [];
  const adaptor = buatFakeAdaptor({ jawaban: JAWABAN_LIMA, events });
  const tts = buatFakeTts(events, []);
  const state = buatFakeState();

  const hasil = await jalankanTanyaSatuPerSatu({
    adaptor,
    tts,
    state,
    namaAwal: 'Captopril',
    mintaJawaban: async (pertanyaan) => (pertanyaan.id === 'konfirmasi' ? true : null),
    now: NOW
  });

  assert.equal(hasil.keputusan, 'simpan');
  // Empat event pertama: berhenti -> tts -> mulai -> kenali.
  assert.deepEqual(events.slice(0, 4), ['berhenti', 'tts', 'mulai', 'kenali']);

  let started = false;
  for (const event of events) {
    if (event === 'mulai') started = true;
    else if (event === 'berhenti') started = false;
    else if (event === 'tts') assert.equal(started, false, 'TTS tidak boleh saat mikrofon aktif');
    else if (event === 'kenali') assert.equal(started, true, 'kenali harus setelah mulai');
    else if (event === 'kenali-tanpa-mulai') assert.fail('kenali dipanggil tanpa mulai');
  }
  assert.equal(state.upsertCalls.length, 1);
  assert.equal(state.upsertCalls[0][0], 'medications');
});

test('alurTanya: konfirmasi persis PERTANYAAN_KONFIRMASI dan TTS memuatnya', async () => {
  const events = [];
  const catatanTts = [];
  const adaptor = buatFakeAdaptor({ jawaban: JAWABAN_LIMA, events });
  const tts = buatFakeTts(events, catatanTts);
  const pertanyaanDilihat = [];

  const hasil = await jalankanTanyaSatuPerSatu({
    adaptor,
    tts,
    state: buatFakeState(),
    namaAwal: 'Captopril',
    onPertanyaan: (pertanyaan) => pertanyaanDilihat.push(pertanyaan),
    mintaJawaban: async (pertanyaan) => (pertanyaan.id === 'konfirmasi' ? true : null),
    now: NOW
  });

  assert.equal(hasil.keputusan, 'simpan');
  assert.ok(
    pertanyaanDilihat.some((pertanyaan) => pertanyaan.pertanyaan === PERTANYAAN_KONFIRMASI),
    'pertanyaan konfirmasi harus persis'
  );
  assert.ok(
    catatanTts.some((teks) => teks.includes(PERTANYAAN_KONFIRMASI)),
    'TTS konfirmasi harus memuat pertanyaan persis'
  );
});

test('alurTanya: penjaga ASR ditolak dihitung gagal paham lalu tombol', async () => {
  const events = [];
  const tolok = [];
  const adaptor = buatFakeAdaptor({
    jawaban: ['satu tablet', 'sesudah makan', 'pagi dan malam', 'tidak perlu'],
    gagalKode: ['ASR_BERULANG', 'ASR_BERULANG'],
    events
  });
  const state = buatFakeState();

  const hasil = await jalankanTanyaSatuPerSatu({
    adaptor,
    tts: buatFakeTts(events, []),
    state,
    namaAwal: 'Captopril',
    onTolakAsr: (kode) => tolok.push(kode),
    mintaJawaban: async (pertanyaan) => {
      if (pertanyaan.id === 'konfirmasi') return true;
      if (pertanyaan.id === 'frekuensi') return { nilai: 2 };
      return null;
    },
    now: NOW
  });

  assert.equal(hasil.keputusan, 'simpan');
  assert.deepEqual(tolok, ['ASR_BERULANG', 'ASR_BERULANG']);
  assert.equal(hasil.sesi.langkah, 'selesai');
  assert.equal(state.upsertCalls.length, 1);
});

test('alurTanya: state.upsert hanya pada simpan; ulangi/batal tidak menulis', async () => {
  // ulangi: konfirmasi "tidak" -> keputusan ulangi, tanpa tulisan.
  const stateUlangi = buatFakeState();
  const hasilUlangi = await jalankanTanyaSatuPerSatu({
    adaptor: buatFakeAdaptor({ jawaban: JAWABAN_LIMA }),
    tts: buatFakeTts(),
    state: stateUlangi,
    namaAwal: 'Captopril',
    mintaJawaban: async (pertanyaan) => (pertanyaan.id === 'konfirmasi' ? 'tidak' : null),
    now: NOW
  });
  assert.equal(hasilUlangi.keputusan, 'ulangi');
  assert.equal(hasilUlangi.medication, null);
  assert.equal(stateUlangi.upsertCalls.length, 0);

  // batal: dua jawaban konfirmasi tidak jelas -> batal, tanpa tulisan.
  const stateBatal = buatFakeState();
  const hasilBatal = await jalankanTanyaSatuPerSatu({
    adaptor: buatFakeAdaptor({ jawaban: JAWABAN_LIMA }),
    tts: buatFakeTts(),
    state: stateBatal,
    namaAwal: 'Captopril',
    mintaJawaban: async (pertanyaan) => (pertanyaan.id === 'konfirmasi' ? 'entah' : null),
    now: NOW
  });
  assert.equal(hasilBatal.keputusan, 'batal');
  assert.equal(hasilBatal.medication, null);
  assert.equal(stateBatal.upsertCalls.length, 0);
});

test('alurTanya: signal abort -> batal tanpa menyimpan', async () => {
  const controller = new AbortController();
  controller.abort();
  const state = buatFakeState();
  const hasil = await jalankanTanyaSatuPerSatu({
    adaptor: buatFakeAdaptor({ jawaban: JAWABAN_LIMA }),
    tts: buatFakeTts(),
    state,
    namaAwal: 'Captopril',
    signal: controller.signal,
    now: NOW
  });
  assert.equal(hasil.keputusan, 'batal');
  assert.equal(state.upsertCalls.length, 0);
});

test('alurTanya: modul orkestrasi tidak memuat jaringan', () => {
  for (const berkas of ['app/js/suara/alurTanya.js', 'app/js/suara/ttsTanya.js']) {
    const sumber = bacaSumber(berkas);
    assert.doesNotMatch(sumber, /\bfetch\s*\(/, berkas);
    assert.doesNotMatch(sumber, /XMLHttpRequest|WebSocket|EventSource/, berkas);
    assert.doesNotMatch(sumber, /https?:\/\//, berkas);
  }
});

// ===========================================================================
// 6. ttsTanya (8B.15)
// ===========================================================================

test('ttsTanya: lima pertanyaan persis', () => {
  assert.deepEqual(PERTANYAAN_TANYA_TEKS, {
    frekuensi: 'Berapa kali sehari?',
    takaran: 'Berapa tablet sekali minum?',
    aturanMakan: 'Sebelum, sesudah, atau saat makan?',
    waktu: 'Pagi, siang, sore, malam, atau sebelum tidur?',
    bilaPerlu: 'Hanya kalau perlu?'
  });
  for (const id of URUTAN_PERTANYAAN) {
    assert.equal(teksPertanyaan(id), PERTANYAAN_TANYA_TEKS[id]);
  }
  assert.equal(teksPertanyaan('nama'), '');
});

test('ttsTanya: pilihan, nama daftar, ejaan, konfirmasi', () => {
  const pilihan = teksPilihan('frekuensi');
  assert.match(pilihan, /^Satu kali/);
  assert.match(pilihan, /dua kali/);
  assert.match(teksPilihan('takaran'), /setengah tablet/);
  assert.equal(teksNamaDariDaftar('Captopril'), 'Captopril? ya atau tidak');
  assert.equal(teksEjaan('BETA'), 'B, e, t, a');
  assert.equal(teksEjaan('12'), 'satu dua');
  const konfirmasi = teksKonfirmasiTanya('Captopril, satu tablet');
  assert.ok(konfirmasi.includes(PERTANYAAN_KONFIRMASI));
  assert.ok(konfirmasi.startsWith('Captopril, satu tablet'));
});

test('bacakanPertanyaan memakai tts dan membacakan pertanyaan persis', async () => {
  const catatan = [];
  const tts = { async bacakan(teks) { catatan.push(teks); return { selesai: true }; } };

  const hasil = await bacakanPertanyaan(tts, 'frekuensi');
  assert.equal(hasil.selesai, true);
  assert.equal(catatan.length, 1);
  assert.ok(catatan[0].startsWith('Berapa kali sehari?'));
});

test('bacakanPertanyaan tanpa TTS mengembalikan selesai:false tanpa melempar', async () => {
  const hasil = await bacakanPertanyaan(null, 'waktu');
  assert.deepEqual(hasil, { selesai: false, dibatalkan: false });
});
