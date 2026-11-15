/**
 * Mesin keadaan tanya obat satu per satu (CONTRACT.md 8B.13).
 *
 * Murni dan deterministik: bebas DOM, timer, jaringan, ASR, TTS, dan storage.
 * UI/orkestrator yang membacakan pertanyaan dan menyimpan hasil. Objek sesi
 * lama tidak pernah dimutasi; setiap aksi mengembalikan sesi baru.
 *
 * Langkah `nama` sengaja menolak `jawabTanya` (jalur suara bebas); nama hanya
 * masuk lewat `pilihJawabanTombol`/`ketikJawaban` dari pemilih nama 8B.14.
 */

import { PERTANYAAN_KONFIRMASI, klasifikasiJawaban } from './konfirmasiSuara.js';
import {
  PERTANYAAN_TANYA,
  URUTAN_PERTANYAAN,
  labelPilihan,
  pilihanUntuk
} from './kosakataTertutup.js';
import { cocokkanBanyak, cocokkanJawaban } from './pencocokJawaban.js';
import { LABEL_BELUM_DIPERIKSA, defaultPemeriksaan } from './pemeriksaan.js';
import { jadwalBawaan } from './resepJadwal.js';
import { todayISO } from './dates.js';
import { ucapkanAngka } from './ucapanAngka.js';
import { pagarKewajaranDosis } from './ucapanObat.js';
import {
  PESAN_NAMA_TIDAK_VALID,
  SUMBER_NAMA_OBAT,
  validasiNamaObat
} from './pemilihNamaObat.js';

/** Urutan lengkap langkah sesi. */
export const LANGKAH_TANYA = [
  'nama',
  'frekuensi',
  'takaran',
  'aturanMakan',
  'waktu',
  'bilaPerlu',
  'konfirmasi',
  'selesai'
];

/** Maksimum kegagalan paham per langkah sebelum mode tombol/ketik. */
export const MAKS_GAGAL_PAHAM = 2;

/** Pertanyaan nama tidak boleh dijawab lewat ASR bebas. */
const PERTANYAAN_NAMA =
  'Nama obat apa? Pilih dari daftar, ketik, atau eja nama obat.';

/** Ucapan penolakan nama dari suara (persis kontrak). */
const UCAPAN_TOLAK_NAMA =
  'Nama obat tidak bisa dari suara bebas. Pilih dari daftar, ketik, atau eja.';

/** Jam representatif untuk label waktu. */
const JAM_WAKTU = {
  pagi: '07:00',
  siang: '13:00',
  sore: '17:00',
  malam: '19:00',
  'sebelum-tidur': '21:00'
};

const KODE_TANYA_TIDAK_VALID = 'TANYA_TIDAK_VALID';
const KODE_NAMA_TIDAK_VALID = 'NAMA_TIDAK_VALID';

/** Buat id sesi/obat tanpa menyentuh storage. */
function buatId(prefix) {
  const kripto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (kripto && typeof kripto.randomUUID === 'function') {
    return `${prefix}_${kripto.randomUUID().replace(/-/g, '')}`;
  }
  let acak = '';
  for (let i = 0; i < 4; i += 1) {
    acak += Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
  }
  return `${prefix}_${acak}`;
}

/** ISO yang aman untuk `now` apa pun. */
function waktuISO(now = new Date()) {
  const tanggal = now instanceof Date ? now : new Date(now);
  return Number.isNaN(tanggal.getTime())
    ? new Date().toISOString()
    : tanggal.toISOString();
}

/** Waktu pencatatan riwayat. */
function sekarangISO() {
  return new Date().toISOString();
}

function galatTanya(pesan) {
  return { code: KODE_TANYA_TIDAK_VALID, pesan };
}

function galatNama(pesan = PESAN_NAMA_TIDAK_VALID) {
  return { code: KODE_NAMA_TIDAK_VALID, pesan };
}

/** Salin nilai jawaban agar array tidak dibagi antar sesi. */
function salinNilai(nilai) {
  return Array.isArray(nilai) ? nilai.slice() : nilai;
}

/** Salinan sesi baru; objek lama tidak pernah disentuh. */
function klonSesi(sesi) {
  const sumber = sesi && typeof sesi === 'object' ? sesi : {};
  const jawaban = sumber.jawaban && typeof sumber.jawaban === 'object' ? sumber.jawaban : {};
  const gagal = sumber.gagalPaham && typeof sumber.gagalPaham === 'object'
    ? sumber.gagalPaham
    : {};

  return {
    ...sumber,
    jawaban: {
      frekuensi: jawaban.frekuensi ?? null,
      takaran: jawaban.takaran ?? null,
      aturanMakan: jawaban.aturanMakan ?? null,
      waktu: Array.isArray(jawaban.waktu) ? jawaban.waktu.slice() : [],
      bilaPerlu: jawaban.bilaPerlu ?? null
    },
    gagalPaham: {
      frekuensi: Number.isInteger(gagal.frekuensi) ? gagal.frekuensi : 0,
      takaran: Number.isInteger(gagal.takaran) ? gagal.takaran : 0,
      aturanMakan: Number.isInteger(gagal.aturanMakan) ? gagal.aturanMakan : 0,
      waktu: Number.isInteger(gagal.waktu) ? gagal.waktu : 0,
      bilaPerlu: Number.isInteger(gagal.bilaPerlu) ? gagal.bilaPerlu : 0
    },
    riwayat: Array.isArray(sumber.riwayat)
      ? sumber.riwayat.map((item) => ({ ...item }))
      : []
  };
}

/** Catat satu jawaban/percobaan pada sesi baru. */
function catat(sesi, langkah, teks, status, nilai) {
  sesi.riwayat.push({
    langkah,
    teks: typeof teks === 'string' ? teks : '',
    status,
    nilai: salinNilai(nilai ?? null),
    waktu: sekarangISO()
  });
}

/** Bentuk HasilLangkah. */
function hasilLangkah(sesi, aksi, pertanyaan, ucapan, error = null) {
  return {
    sesi,
    aksi,
    pertanyaan: pertanyaan || null,
    ucapan: typeof ucapan === 'string' ? ucapan : '',
    error: error || null
  };
}

/** Apakah sesi masih aktif. */
function sesiAktif(sesi) {
  return Boolean(sesi) && sesi.status === 'aktif';
}

/** Definisi pertanyaan aktif untuk sebuah langkah. */
function pertanyaanLangkah(langkah, sesi) {
  if (langkah === 'nama') {
    return {
      id: 'nama',
      tipe: 'nama',
      pertanyaan: PERTANYAAN_NAMA,
      pilihan: [],
      label: {},
      bolehTombol: false,
      bolehKetik: true,
      modeTombol: false
    };
  }

  if (langkah === 'konfirmasi') {
    return {
      id: 'konfirmasi',
      tipe: 'konfirmasi',
      pertanyaan: PERTANYAAN_KONFIRMASI,
      pilihan: [true, false],
      label: { true: 'Ya, benar', false: 'Tidak' },
      bolehTombol: true,
      bolehKetik: true,
      modeTombol: false
    };
  }

  const def = PERTANYAAN_TANYA[langkah];
  if (!def) return null;

  return {
    id: langkah,
    tipe: def.tipe,
    pertanyaan: def.pertanyaan,
    pilihan: def.pilihan.slice(),
    label: { ...def.label },
    bolehTombol: true,
    bolehKetik: true,
    modeTombol: Boolean(sesi && sesi.modeTombol)
  };
}

/**
 * Pertanyaan yang sedang aktif (untuk ditampilkan/dibacakan).
 *
 * @param {object} sesi
 * @returns {object|null}
 */
export function pertanyaanSaatIni(sesi) {
  if (!sesi || typeof sesi !== 'object') return null;
  if (sesi.status !== 'aktif') return null;
  if (sesi.langkah === 'selesai') return null;
  return pertanyaanLangkah(sesi.langkah, sesi);
}

/**
 * Buat sesi tanya baru. Bila `nama` yang sudah dikonfirmasi diberikan dan
 * valid, sesi langsung mulai dari langkah `frekuensi`.
 *
 * @param {{profileId?:string|null, sumberNama?:string|null, nama?:string|null,
 *          now?:Date|string}} [options]
 * @returns {object} SesiTanya
 */
export function buatSesiTanya({
  profileId = null,
  sumberNama = null,
  nama = null,
  now = new Date()
} = {}) {
  const sesi = {
    id: buatId('tny'),
    profileId,
    langkah: 'nama',
    status: 'aktif',
    nama: null,
    sumberNama: null,
    jawaban: {
      frekuensi: null,
      takaran: null,
      aturanMakan: null,
      waktu: [],
      bilaPerlu: null
    },
    gagalPaham: {
      frekuensi: 0,
      takaran: 0,
      aturanMakan: 0,
      waktu: 0,
      bilaPerlu: 0
    },
    modeTombol: false,
    riwayat: [],
    dibuatPada: waktuISO(now)
  };

  if (nama !== null && nama !== undefined) {
    const valid = validasiNamaObat(nama);
    if (valid.ok) {
      sesi.nama = valid.nama;
      sesi.sumberNama = SUMBER_NAMA_OBAT.includes(sumberNama) ? sumberNama : null;
      sesi.langkah = 'frekuensi';
    } else {
      Object.defineProperty(sesi, 'error', {
        value: galatNama(valid.pesan),
        enumerable: false,
        configurable: true
      });
    }
  }

  return sesi;
}

/** Normalisasi nilai `waktu` (multi, unik, terurut sesuai pilihan). */
function normalisasiWaktu(nilai) {
  const pilihan = pilihanUntuk('waktu');
  const masukan = Array.isArray(nilai) ? nilai : [nilai];
  const hasil = [];
  for (const item of masukan) {
    if (!pilihan.includes(item) || hasil.includes(item)) continue;
    hasil.push(item);
  }
  hasil.sort((a, b) => pilihan.indexOf(a) - pilihan.indexOf(b));
  return hasil;
}

/** Cari nilai pilihan yang sah (tombol/ketikan) untuk langkah tertutup. */
function nilaiPilihan(langkah, nilai) {
  const pilihan = pilihanUntuk(langkah);
  for (const opsi of pilihan) {
    if (opsi === nilai) return { ok: true, nilai: opsi };
    if (typeof opsi === 'number' && typeof nilai !== 'boolean') {
      const angka = Number(String(nilai).replace(',', '.').trim());
      if (Number.isFinite(angka) && angka === opsi) return { ok: true, nilai: opsi };
    }
    if (typeof opsi === 'boolean' && typeof nilai === 'string') {
      const teks = nilai.trim().toLowerCase();
      if ((opsi === true && (teks === 'ya' || teks === 'true')) ||
          (opsi === false && (teks === 'tidak' || teks === 'false'))) {
        return { ok: true, nilai: opsi };
      }
    }
  }
  return { ok: false, nilai: null };
}

/** Ambil nilai sah dari tombol; dukung waktu sebagai array. */
function nilaiDariTombol(langkah, nilai) {
  if (langkah === 'waktu') {
    const waktu = normalisasiWaktu(nilai);
    return waktu.length > 0 ? { ok: true, nilai: waktu } : { ok: false, nilai: null };
  }
  return nilaiPilihan(langkah, nilai);
}

/** Langkah berikutnya setelah langkah tertutup dijawab. */
function langkahBerikut(langkah) {
  const posisi = URUTAN_PERTANYAAN.indexOf(langkah);
  if (posisi < 0 || posisi >= URUTAN_PERTANYAAN.length - 1) return 'konfirmasi';
  return URUTAN_PERTANYAAN[posisi + 1];
}

/** Terapkan jawaban valid dan maju ke langkah berikutnya. */
function terimaJawaban(sesi, langkah, nilai, teks, aksi) {
  const baru = klonSesi(sesi);
  baru.jawaban[langkah] = salinNilai(nilai);
  baru.gagalPaham[langkah] = 0;
  baru.modeTombol = false;
  baru.langkah = langkahBerikut(langkah);
  catat(baru, langkah, teks, aksi, nilai);
  const pertanyaan = pertanyaanSaatIni(baru);
  return hasilLangkah(
    baru,
    aksi,
    pertanyaan,
    pertanyaan ? pertanyaan.pertanyaan : ''
  );
}

/** Catat kegagalan paham; kembalikan ulangi/tombol tanpa memaksa cocok. */
function gagalPaham(sesi, langkah, teks) {
  const baru = klonSesi(sesi);
  const jumlahLama = baru.gagalPaham[langkah];
  const sudahTombol = baru.modeTombol || jumlahLama >= MAKS_GAGAL_PAHAM;

  if (sudahTombol) {
    baru.modeTombol = true;
    catat(baru, langkah, teks, 'tombol', null);
    return hasilLangkah(baru, 'tombol', pertanyaanSaatIni(baru), '');
  }

  baru.gagalPaham[langkah] = Math.min(MAKS_GAGAL_PAHAM, jumlahLama + 1);

  if (baru.gagalPaham[langkah] >= MAKS_GAGAL_PAHAM) {
    baru.modeTombol = true;
    const pertanyaan = pertanyaanSaatIni(baru);
    catat(baru, langkah, teks, 'tombol', null);
    return hasilLangkah(
      baru,
      'tombol',
      pertanyaan,
      `${pertanyaan ? pertanyaan.pertanyaan : ''} Silakan pilih tombol atau ketik jawaban.`.trim()
    );
  }

  const pertanyaan = pertanyaanSaatIni(baru);
  catat(baru, langkah, teks, 'ulangi', null);
  return hasilLangkah(baru, 'ulangi', pertanyaan, pertanyaan ? pertanyaan.pertanyaan : '');
}

/** Cocokkan satu jawaban tertutup. */
function cocokkanLangkah(langkah, teks) {
  return langkah === 'waktu'
    ? cocokkanBanyak(teks, langkah)
    : cocokkanJawaban(teks, langkah);
}

/** Nilai hasil pencocok yang benar-benar berada di pilihan. */
function nilaiHasilCocok(langkah, nilai) {
  if (langkah === 'waktu') {
    const waktu = normalisasiWaktu(nilai);
    return waktu.length > 0 ? { ok: true, nilai: waktu } : { ok: false, nilai: null };
  }
  const pilihan = pilihanUntuk(langkah);
  return pilihan.includes(nilai)
    ? { ok: true, nilai }
    : { ok: false, nilai: null };
}

/** Terima nama hasil tombol/ketikan terverifikasi. */
function terimaNama(sesi, nama, sumber, teks, aksi) {
  const valid = validasiNamaObat(nama);
  if (!valid.ok) {
    return hasilLangkah(
      klonSesi(sesi),
      'tidak-berlaku',
      pertanyaanSaatIni(sesi),
      valid.pesan,
      galatNama(valid.pesan)
    );
  }

  const baru = klonSesi(sesi);
  baru.nama = valid.nama;
  baru.sumberNama = SUMBER_NAMA_OBAT.includes(sumber) ? sumber : baru.sumberNama || null;
  baru.modeTombol = false;
  baru.langkah = 'frekuensi';
  catat(baru, 'nama', teks, aksi, valid.nama);
  const pertanyaan = pertanyaanSaatIni(baru);
  return hasilLangkah(
    baru,
    aksi === 'tombol' ? 'tombol' : 'terima',
    pertanyaan,
    pertanyaan ? pertanyaan.pertanyaan : ''
  );
}

/** Jawab langkah konfirmasi dengan ya/tidak/lain. */
function jawabKonfirmasiLangkah(sesi, teks, aksiUlang) {
  const baru = klonSesi(sesi);
  const klasifikasi = klasifikasiJawaban(teks);

  if (klasifikasi === 'ya') {
    baru.status = 'selesai';
    baru.langkah = 'selesai';
    catat(baru, 'konfirmasi', teks, 'selesai', true);
    return hasilLangkah(baru, 'selesai', null, 'Baik, saya simpan.');
  }

  if (klasifikasi === 'tidak') {
    baru.status = 'batal';
    baru.langkah = 'selesai';
    catat(baru, 'konfirmasi', teks, 'batal', false);
    return hasilLangkah(baru, 'batal', null, 'Baik, tidak saya simpan. Silakan ulangi.');
  }

  catat(baru, 'konfirmasi', teks, aksiUlang, null);
  return hasilLangkah(baru, aksiUlang, pertanyaanLangkah('konfirmasi', baru), PERTANYAAN_KONFIRMASI);
}

/**
 * Jawab langkah aktif dari jalur suara. Pada langkah `nama` jawaban ASR
 * selalu ditolak dan nama tidak berubah.
 *
 * @param {object} sesi
 * @param {string} teks
 * @param {{sumber?:string}} [options]
 * @returns {{sesi:object, aksi:string, pertanyaan:object|null, ucapan:string,
 *            error:null|{code:string,pesan:string}}}
 */
export function jawabTanya(sesi, teks, { sumber = 'suara' } = {}) {
  if (!sesiAktif(sesi)) {
    return hasilLangkah(sesi ? klonSesi(sesi) : sesi, 'tidak-berlaku', null, '');
  }

  if (sesi.langkah === 'nama') {
    const baru = klonSesi(sesi);
    const dariSuara = sumber === 'suara';
    const pesan = dariSuara
      ? UCAPAN_TOLAK_NAMA
      : 'Nama obat harus dipilih dari daftar, ketik, atau eja.';
    catat(baru, 'nama', teks, 'tolak-nama-dari-suara', null);
    return hasilLangkah(
      baru,
      'tolak-nama-dari-suara',
      pertanyaanSaatIni(baru),
      pesan,
      galatNama(pesan)
    );
  }

  if (sesi.langkah === 'konfirmasi') {
    return jawabKonfirmasiLangkah(sesi, teks, 'ulangi');
  }

  if (sesi.langkah === 'selesai' || !PERTANYAAN_TANYA[sesi.langkah]) {
    return hasilLangkah(klonSesi(sesi), 'tidak-berlaku', null, '');
  }

  const cocok = cocokkanLangkah(sesi.langkah, teks);
  if (cocok.status === 'cocok') {
    const sah = nilaiHasilCocok(sesi.langkah, cocok.nilai);
    if (sah.ok) {
      return terimaJawaban(sesi, sesi.langkah, sah.nilai, teks, 'terima');
    }
  }

  return gagalPaham(sesi, sesi.langkah, teks);
}

/**
 * Jawab dengan pilihan tombol. Tombol selalu tersedia dan tidak memakai ASR.
 *
 * @param {object} sesi
 * @param {unknown} nilai
 * @returns {{sesi:object, aksi:string, pertanyaan:object|null, ucapan:string,
 *            error:null|{code:string,pesan:string}}}
 */
export function pilihJawabanTombol(sesi, nilai) {
  if (!sesiAktif(sesi)) {
    return hasilLangkah(sesi ? klonSesi(sesi) : sesi, 'tidak-berlaku', null, '');
  }

  if (sesi.langkah === 'nama') {
    const data = nilai && typeof nilai === 'object'
      ? nilai
      : { nama: nilai };
    return terimaNama(
      sesi,
      data.nama ?? data.name,
      data.sumber ?? data.sumberNama ?? sesi.sumberNama,
      typeof (data.nama ?? data.name) === 'string' ? (data.nama ?? data.name) : '',
      'tombol'
    );
  }

  if (sesi.langkah === 'konfirmasi') {
    let ya = null;
    if (nilai === true) ya = true;
    else if (nilai === false) ya = false;
    else if (typeof nilai === 'string') {
      const klasifikasi = klasifikasiJawaban(nilai);
      if (klasifikasi === 'ya') ya = true;
      else if (klasifikasi === 'tidak') ya = false;
    }
    if (ya === null) {
      return hasilLangkah(
        klonSesi(sesi),
        'tidak-berlaku',
        pertanyaanSaatIni(sesi),
        '',
        galatTanya('Pilihan konfirmasi harus ya atau tidak.')
      );
    }
    return jawabKonfirmasiLangkah(sesi, ya ? 'ya' : 'tidak', 'ulangi');
  }

  if (!PERTANYAAN_TANYA[sesi.langkah]) {
    return hasilLangkah(klonSesi(sesi), 'tidak-berlaku', null, '');
  }

  const sah = nilaiDariTombol(sesi.langkah, nilai);
  if (!sah.ok) {
    return hasilLangkah(
      klonSesi(sesi),
      'tidak-berlaku',
      pertanyaanSaatIni(sesi),
      '',
      galatTanya('Jawaban tombol tidak ada di pilihan.')
    );
  }

  return terimaJawaban(sesi, sesi.langkah, sah.nilai, String(nilai), 'tombol');
}

/**
 * Jawab dengan teks yang diketik/ditempel pendamping (bukan ASR). Untuk nama,
 * teks divalidasi sebagai nama; untuk langkah tertutup, teks dicocokkan.
 *
 * @param {object} sesi
 * @param {string} teks
 * @returns {{sesi:object, aksi:string, pertanyaan:object|null, ucapan:string,
 *            error:null|{code:string,pesan:string}}}
 */
export function ketikJawaban(sesi, teks) {
  if (!sesiAktif(sesi)) {
    return hasilLangkah(sesi ? klonSesi(sesi) : sesi, 'tidak-berlaku', null, '');
  }

  if (sesi.langkah === 'nama') {
    return terimaNama(sesi, teks, 'ketik', teks, 'terima');
  }

  if (sesi.langkah === 'konfirmasi') {
    return jawabKonfirmasiLangkah(sesi, teks, 'ulangi');
  }

  if (sesi.langkah === 'selesai' || !PERTANYAAN_TANYA[sesi.langkah]) {
    return hasilLangkah(klonSesi(sesi), 'tidak-berlaku', null, '');
  }

  const cocok = cocokkanLangkah(sesi.langkah, teks);
  if (cocok.status === 'cocok') {
    const sah = nilaiHasilCocok(sesi.langkah, cocok.nilai);
    if (sah.ok) {
      return terimaJawaban(sesi, sesi.langkah, sah.nilai, teks, 'terima');
    }
  }

  return hasilLangkah(
    klonSesi(sesi),
    'tidak-berlaku',
    pertanyaanSaatIni(sesi),
    '',
    galatTanya('Jawaban yang diketik tidak cocok dengan pilihan.')
  );
}

/** Apakah lima pertanyaan tertutup sudah terjawab. */
function semuaTerjawab(sesi) {
  if (!sesi || !sesi.jawaban) return false;
  const jawaban = sesi.jawaban;
  return Number.isFinite(jawaban.frekuensi)
    && Number.isFinite(jawaban.takaran)
    && typeof jawaban.aturanMakan === 'string'
    && jawaban.aturanMakan !== ''
    && Array.isArray(jawaban.waktu)
    && jawaban.waktu.length > 0
    && typeof jawaban.bilaPerlu === 'boolean';
}

/** Pagar kewajaran dosis memakai nilai sesi. */
function periksaPagar(sesi) {
  return pagarKewajaranDosis({
    takaranPerDosis: sesi.jawaban.takaran,
    kaliSehari: sesi.jawaban.frekuensi,
    satuanTakaran: 'tablet'
  });
}

/**
 * Setelah lima jawaban, masuk ke langkah konfirmasi. Tidak menyimpan apa pun.
 *
 * @param {object} sesi
 * @returns {{sesi:object, aksi:string, pertanyaan:object|null, ucapan:string,
 *            error:null|{code:string,pesan:string}}}
 */
export function lanjutKeKonfirmasi(sesi) {
  if (!sesiAktif(sesi)) {
    return hasilLangkah(sesi ? klonSesi(sesi) : sesi, 'tidak-berlaku', null, '');
  }

  if (!semuaTerjawab(sesi)) {
    return hasilLangkah(
      klonSesi(sesi),
      'tidak-berlaku',
      pertanyaanSaatIni(sesi),
      '',
      galatTanya('Masih ada pertanyaan yang belum dijawab.')
    );
  }

  const pagar = periksaPagar(sesi);
  if (!pagar.ok) {
    return hasilLangkah(
      klonSesi(sesi),
      'tidak-berlaku',
      pertanyaanSaatIni(sesi),
      '',
      galatTanya(pagar.pesan)
    );
  }

  const baru = klonSesi(sesi);
  baru.langkah = 'konfirmasi';
  baru.modeTombol = false;
  return hasilLangkah(
    baru,
    'konfirmasi',
    pertanyaanLangkah('konfirmasi', baru),
    `${ringkasSesi(baru)} ${PERTANYAAN_KONFIRMASI}`
  );
}

/** Label waktu yang diurutkan sesuai kosakata. */
function labelWaktu(waktu) {
  return normalisasiWaktu(waktu)
    .map((nilai) => labelPilihan('waktu', nilai) || nilai);
}

/**
 * Ringkasan semua isian untuk TTS/konfirmasi. Angka diucapkan lewat label
 * kosakata/`ucapkanAngka`, bukan digit mentah.
 *
 * @param {object} sesi
 * @returns {string}
 */
export function ringkasSesi(sesi) {
  const nama = sesi && typeof sesi.nama === 'string' && sesi.nama !== ''
    ? sesi.nama
    : 'nama belum dipilih';
  const jawaban = sesi && sesi.jawaban ? sesi.jawaban : {};
  const bagian = [nama];

  if (Number.isFinite(jawaban.takaran)) {
    const label = labelPilihan('takaran', jawaban.takaran);
    bagian.push(label || `${jawaban.takaran} tablet`);
  }

  if (Number.isFinite(jawaban.frekuensi)) {
    bagian.push(`${ucapkanAngka(jawaban.frekuensi)} kali sehari`);
  }

  if (typeof jawaban.aturanMakan === 'string' && jawaban.aturanMakan !== '') {
    bagian.push(labelPilihan('aturanMakan', jawaban.aturanMakan) || jawaban.aturanMakan);
  }

  const waktu = labelWaktu(jawaban.waktu);
  if (waktu.length > 0) bagian.push(waktu.join(' dan '));

  if (typeof jawaban.bilaPerlu === 'boolean') {
    bagian.push(`hanya kalau perlu: ${jawaban.bilaPerlu ? 'ya' : 'tidak'}`);
  } else {
    bagian.push('hanya kalau perlu: belum dijawab');
  }

  return `${bagian.join(', ')}. Status: ${LABEL_BELUM_DIPERIKSA}.`;
}

/** Petakan label waktu ke jam unik dan terurut. */
function petaWaktu(waktu) {
  const jam = [];
  for (const label of Array.isArray(waktu) ? waktu : []) {
    const nilai = JAM_WAKTU[label];
    if (typeof nilai === 'string' && !jam.includes(nilai)) jam.push(nilai);
  }
  return jam.sort();
}

/**
 * Bangun Medication (8B.15) dari sesi yang sudah lengkap. Tidak menyimpan.
 *
 * @param {object} sesi
 * @param {{now?:Date|string, profileId?:string|null}} [options]
 * @returns {object} Medication
 */
export function bangunMedicationDariSesi(sesi, {
  now = new Date(),
  profileId = null
} = {}) {
  const jawaban = sesi && sesi.jawaban ? sesi.jawaban : {};
  const bilaPerlu = jawaban.bilaPerlu === true;
  let times = bilaPerlu ? [] : petaWaktu(jawaban.waktu);
  if (!bilaPerlu && times.length === 0 && Number.isInteger(jawaban.frekuensi)) {
    times = jadwalBawaan(jawaban.frekuensi);
  }

  const petunjuk = [];
  if (Number.isFinite(jawaban.frekuensi)) {
    petunjuk.push(`${jawaban.frekuensi} kali sehari`);
  }
  if (typeof jawaban.aturanMakan === 'string' && jawaban.aturanMakan !== '') {
    petunjuk.push(labelPilihan('aturanMakan', jawaban.aturanMakan) || jawaban.aturanMakan);
  }
  const waktu = labelWaktu(jawaban.waktu);
  if (waktu.length > 0) petunjuk.push(waktu.join(' dan '));
  if (bilaPerlu) petunjuk.push('hanya kalau perlu');

  const iso = waktuISO(now);
  const tanggal = now instanceof Date ? now : new Date(now);
  const tanggalAman = Number.isNaN(tanggal.getTime()) ? new Date() : tanggal;

  return {
    id: buatId('med'),
    profileId: profileId ?? (sesi ? sesi.profileId : null),
    name: sesi ? sesi.nama : null,
    activeIngredient: '',
    dose: '',
    doseUnit: '',
    instructions: petunjuk.join(', '),
    times,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: todayISO(tanggalAman),
    endDate: null,
    stock: {
      remaining: null,
      unit: 'tablet',
      unitsPerDose: jawaban.takaran
    },
    refillReminderDays: 3,
    active: true,
    notes: '',
    source: null,
    dibuatDengan: 'suara',
    dikonfirmasiDengan: 'suara',
    pemeriksaanOrangLain: defaultPemeriksaan(),
    createdAt: iso,
    updatedAt: iso
  };
}

/** Hasil selesaikanSesi dengan `error` non-enumerable agar bentuk tetap. */
function hasilSelesai(sesi, medication, aksi, error = null) {
  const hasil = { sesi, medication, aksi };
  if (error) {
    Object.defineProperty(hasil, 'error', {
      value: error,
      enumerable: false,
      configurable: true
    });
  }
  return hasil;
}

/**
 * Selesaikan sesi. `simpan:false` membatalkan; `simpan:true` hanya membangun
 * Medication bila semua jawaban ada dan pagar dosis lolos. Tidak pernah
 * menyimpan sendiri.
 *
 * @param {object} sesi
 * @param {{simpan?:boolean, now?:Date|string}} [options]
 * @returns {{sesi:object, medication:object|null, aksi:string}}
 */
export function selesaikanSesi(sesi, { simpan = false, now = new Date() } = {}) {
  const lama = sesi && typeof sesi === 'object' ? sesi : {};
  const baru = klonSesi(lama);

  if (!simpan) {
    baru.status = 'batal';
    baru.langkah = 'selesai';
    return hasilSelesai(baru, null, 'batal');
  }

  if (lama.status === 'batal') {
    return hasilSelesai(baru, null, 'batal');
  }

  if (!semuaTerjawab(baru)) {
    return hasilSelesai(
      baru,
      null,
      'tidak-berlaku',
      galatTanya('Masih ada pertanyaan yang belum dijawab.')
    );
  }

  const namaValid = validasiNamaObat(baru.nama);
  if (!namaValid.ok) {
    return hasilSelesai(baru, null, 'tidak-berlaku', galatNama(namaValid.pesan));
  }

  const pagar = periksaPagar(baru);
  if (!pagar.ok) {
    return hasilSelesai(baru, null, 'tidak-berlaku', galatTanya(pagar.pesan));
  }

  baru.status = 'selesai';
  baru.langkah = 'selesai';
  const medication = bangunMedicationDariSesi(baru, {
    now,
    profileId: baru.profileId ?? null
  });
  return hasilSelesai(baru, medication, 'selesai');
}
