/**
 * Pemilih nama obat (CONTRACT.md 8B.14).
 *
 * Murni dan bebas DOM/ASR: nama obat hanya boleh berasal dari empat sumber
 * tertutup (`daftar`, `pindai`, `ketik`, `ejaan`). Teks bebas hasil pengenalan
 * suara tidak pernah diperlakukan sebagai nama di modul ini. Tidak ada
 * penyimpanan, jaringan, timer, atau efek samping; objek sesi lama tidak
 * pernah dimutasi.
 */

import { klasifikasiJawaban } from './konfirmasiSuara.js';

/** Sumber nama obat yang diizinkan. */
export const SUMBER_NAMA_OBAT = ['daftar', 'pindai', 'ketik', 'ejaan'];

/** Alfabet tertutup untuk ejaan nama obat. */
export const HURUF_EJAAN = 'abcdefghijklmnopqrstuvwxyz0123456789- ';

/** Nama huruf Indonesia -> huruf; persis bentuk kontrak. */
export const NAMA_HURUF = {
  a: 'a',
  be: 'b',
  ce: 'c',
  de: 'd',
  e: 'e',
  ef: 'f',
  ge: 'g',
  ha: 'h',
  i: 'i',
  je: 'j',
  ka: 'k',
  el: 'l',
  em: 'm',
  en: 'n',
  o: 'o',
  pe: 'p',
  ki: 'q',
  er: 'r',
  es: 's',
  te: 't',
  u: 'u',
  ve: 'v',
  we: 'w',
  eks: 'x',
  ye: 'y',
  zet: 'z'
};

/** Awalan pertanyaan konfirmasi ejaan; nama + `?` ditambahkan pemanggil. */
export const PERTANYAAN_EJAAN = 'Apakah nama obatnya ';

/** Pesan validasi nama yang dipakai seluruh modul. */
export const PESAN_NAMA_TIDAK_VALID =
  'Nama obat tidak valid. Pilih dari daftar, ketik, atau eja huruf per huruf.';

/** Kode error kontrak. */
const KODE_NAMA_TIDAK_VALID = 'NAMA_TIDAK_VALID';

/** Karakter kontrol yang tidak boleh ada pada nama. */
const POLA_KONTROL = /[\u0000-\u001F\u007F]/;

function galatNama(pesan = PESAN_NAMA_TIDAK_VALID) {
  return { code: KODE_NAMA_TIDAK_VALID, pesan };
}

/** Beri alias `sesi` non-enumerable agar pemanggil bisa memakai kedua bentuk. */
function sebagaiSesi(sesi) {
  if (!Object.prototype.hasOwnProperty.call(sesi, 'sesi')) {
    Object.defineProperty(sesi, 'sesi', {
      value: sesi,
      enumerable: false,
      configurable: true
    });
  }
  return sesi;
}

/** Tempelkan error sebagai properti non-enumerable agar bentuk sesi tetap. */
function denganGalat(sesi, galat) {
  if (galat) {
    Object.defineProperty(sesi, 'error', {
      value: galat,
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(sesi, 'kode', {
      value: galat.code,
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(sesi, 'pesan', {
      value: galat.pesan,
      enumerable: false,
      configurable: true
    });
  }
  return sebagaiSesi(sesi);
}

/**
 * Validasi nama obat: trim, 2-80 karakter, minimal 2 huruf, bukan hanya
 * angka/tanda baca, dan tanpa karakter kontrol.
 *
 * @param {unknown} nama
 * @returns {{ok:boolean, nama:string, kode:null|'NAMA_TIDAK_VALID', pesan:string}}
 */
export function validasiNamaObat(nama) {
  if (typeof nama !== 'string') {
    return { ok: false, nama: '', kode: KODE_NAMA_TIDAK_VALID, pesan: PESAN_NAMA_TIDAK_VALID };
  }

  const teks = nama.normalize('NFKC').trim();
  if (teks.length < 2 || teks.length > 80 || POLA_KONTROL.test(teks)) {
    return { ok: false, nama: '', kode: KODE_NAMA_TIDAK_VALID, pesan: PESAN_NAMA_TIDAK_VALID };
  }

  const huruf = teks.match(/\p{L}/gu);
  if (!huruf || huruf.length < 2) {
    return { ok: false, nama: '', kode: KODE_NAMA_TIDAK_VALID, pesan: PESAN_NAMA_TIDAK_VALID };
  }

  return { ok: true, nama: teks, kode: null, pesan: '' };
}

/** Ambil nama dari sebuah item (string atau objek obat). */
function namaDariItem(item) {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    if (typeof item.nama === 'string') return item.nama;
    if (typeof item.name === 'string') return item.name;
  }
  return null;
}

/** Kumpulan nama unik, trim, tanpa karakter kontrol, urut abjad. */
function kumpulkanNama(daftar) {
  const hasil = [];
  const terlihat = new Set();

  const telusuri = (item) => {
    if (Array.isArray(item)) {
      for (const bagian of item) telusuri(bagian);
      return;
    }
    const mentah = namaDariItem(item);
    if (typeof mentah === 'string') {
      const nama = mentah.normalize('NFKC').trim();
      if (nama !== '' && !POLA_KONTROL.test(nama)) {
        const kunci = nama.toLowerCase();
        if (!terlihat.has(kunci)) {
          terlihat.add(kunci);
          hasil.push(nama);
        }
      }
      return;
    }
    if (item && typeof item === 'object') {
      for (const kunci of ['obat', 'medications', 'hasil', 'items', 'daftarObat', 'hasilPindai']) {
        if (Array.isArray(item[kunci])) telusuri(item[kunci]);
      }
    }
  };

  telusuri(daftar);

  hasil.sort((a, b) => {
    const kiri = a.toLowerCase();
    const kanan = b.toLowerCase();
    if (kiri < kanan) return -1;
    if (kiri > kanan) return 1;
    return 0;
  });
  return hasil;
}

/**
 * Daftar nama unik dari obat tersimpan (urut abjad).
 *
 * @param {Array<string|object>} medications
 * @returns {string[]}
 */
export function daftarNamaDariObat(medications = []) {
  return kumpulkanNama(medications);
}

/** Ambil daftar obat dari berbagai bentuk hasil pindai/kenaliResep. */
function daftarPindai(hasilPindai) {
  if (Array.isArray(hasilPindai)) return hasilPindai;
  if (hasilPindai && typeof hasilPindai === 'object') {
    for (const kunci of ['obat', 'medications', 'hasil', 'items', 'daftarObat']) {
      if (Array.isArray(hasilPindai[kunci])) return hasilPindai[kunci];
    }
    if (typeof hasilPindai.nama === 'string' || typeof hasilPindai.name === 'string') {
      return [hasilPindai];
    }
  }
  return [];
}

/**
 * Daftar nama unik dari hasil pindai resep/scan review (urut abjad).
 *
 * @param {Array<string|object>|object} hasilPindai
 * @returns {string[]}
 */
export function daftarNamaDariPindai(hasilPindai = []) {
  return kumpulkanNama(daftarPindai(hasilPindai));
}

/**
 * Bacaan satu per satu untuk daftar nama.
 *
 * @param {Array<string|object>} namaList
 * @returns {Array<{nama:string, pertanyaan:string}>}
 */
export function bacaSatuPerSatu(namaList = []) {
  const hasil = [];
  const terlihat = new Set();
  if (!Array.isArray(namaList)) return hasil;

  for (const item of namaList) {
    const mentah = namaDariItem(item);
    if (typeof mentah !== 'string') continue;
    const nama = mentah.normalize('NFKC').trim();
    if (nama === '' || POLA_KONTROL.test(nama)) continue;
    const kunci = nama.toLowerCase();
    if (terlihat.has(kunci)) continue;
    terlihat.add(kunci);
    hasil.push({ nama, pertanyaan: `${nama}? ya atau tidak` });
  }
  return hasil;
}

/**
 * Klasifikasi jawaban ya/tidak memakai aturan konfirmasi 8B.6.
 *
 * @param {string} teks
 * @returns {'ya'|'tidak'|'lain'}
 */
export function cocokkanYaTidak(teks) {
  return klasifikasiJawaban(teks);
}

/** Normalisasi daftar kandidat menjadi nama unik dengan urutan tetap. */
function normalisasiKandidat(kandidat) {
  const hasil = [];
  const terlihat = new Set();
  if (!Array.isArray(kandidat)) return hasil;
  for (const item of kandidat) {
    const mentah = namaDariItem(item);
    if (typeof mentah !== 'string') continue;
    const nama = mentah.normalize('NFKC').trim();
    if (nama === '' || POLA_KONTROL.test(nama)) continue;
    const kunci = nama.toLowerCase();
    if (terlihat.has(kunci)) continue;
    terlihat.add(kunci);
    hasil.push(nama);
  }
  return hasil;
}

/** Salinan sesi nama tanpa mutasi objek lama. */
function klonSesi(sesi) {
  const sumber = sesi && SUMBER_NAMA_OBAT.includes(sesi.sumber) ? sesi.sumber : null;
  return {
    sumber,
    kandidat: Array.isArray(sesi?.kandidat) ? sesi.kandidat.slice() : [],
    indeks: Number.isInteger(sesi?.indeks) && sesi.indeks >= 0 ? sesi.indeks : 0,
    nama: typeof sesi?.nama === 'string' ? sesi.nama : null,
    ejaan: typeof sesi?.ejaan === 'string' ? sesi.ejaan : '',
    status: typeof sesi?.status === 'string' ? sesi.status : 'memilih',
    jumlahTanyaUlang:
      Number.isInteger(sesi?.jumlahTanyaUlang) && sesi.jumlahTanyaUlang >= 0
        ? sesi.jumlahTanyaUlang
        : 0,
    riwayat: Array.isArray(sesi?.riwayat) ? sesi.riwayat.map((item) => ({ ...item })) : []
  };
}

/**
 * Buat sesi pemilihan nama baru.
 *
 * @param {{sumber?:string|null, kandidat?:Array<string|object>}} [options]
 * @returns {object} SesiNama
 */
export function buatSesiNama({ sumber = null, kandidat = [] } = {}) {
  return {
    sumber: SUMBER_NAMA_OBAT.includes(sumber) ? sumber : null,
    kandidat: normalisasiKandidat(kandidat),
    indeks: 0,
    nama: null,
    ejaan: '',
    status: 'memilih',
    jumlahTanyaUlang: 0,
    riwayat: []
  };
}

/** Hasil aksi pemilih nama; field sesi juga tersedia lewat getter. */
function hasilNama(sesi, aksi, pertanyaan = null, ucapan = '', error = null) {
  const hasil = { sesi, aksi, pertanyaan, ucapan, error };
  for (const kunci of Object.keys(sesi)) {
    Object.defineProperty(hasil, kunci, {
      get: () => sesi[kunci],
      enumerable: false,
      configurable: true
    });
  }
  return hasil;
}

/** Pertanyaan yang sedang aktif untuk sesi nama. */
function pertanyaanSesi(sesi) {
  if (!sesi || sesi.status === 'selesai' || sesi.status === 'batal') return null;
  if (sesi.status === 'menunggu-konfirmasi-ejaan') {
    return `${PERTANYAAN_EJAAN}${sesi.nama || sesi.ejaan}?`;
  }
  if (sesi.sumber === 'daftar' || sesi.sumber === 'pindai') {
    const nama = sesi.kandidat[sesi.indeks];
    return typeof nama === 'string' ? `${nama}? ya atau tidak` : null;
  }
  if (sesi.sumber === 'ejaan') return 'Eja nama obat huruf per huruf.';
  if (sesi.sumber === 'ketik') return 'Ketik nama obat.';
  return 'Pilih sumber nama obat: daftar, pindai, ketik, atau ejaan.';
}

/** Catat satu langkah ke riwayat sesi baru. */
function catat(sesi, teks, klasifikasi, aksi, nama = null) {
  sesi.riwayat.push({
    teks: typeof teks === 'string' ? teks : '',
    klasifikasi,
    aksi,
    nama: nama === null ? null : nama
  });
}

/**
 * Pilih sumber nama (dan opsional nama final) tanpa memanggil ASR.
 *
 * @param {object} sesi
 * @param {{sumber?:string, nama?:string|null, medications?:Array,
 *          hasilPindai?:Array|object}} [options]
 * @returns {object} SesiNama baru
 */
export function pilihNama(sesi, {
  sumber = null,
  nama = null,
  medications = [],
  hasilPindai = []
} = {}) {
  const lama = sesi && typeof sesi === 'object' ? sesi : buatSesiNama();
  const baru = klonSesi(lama);

  if (sumber !== null && !SUMBER_NAMA_OBAT.includes(sumber)) {
    return denganGalat(baru, galatNama());
  }

  if (sumber !== null) baru.sumber = sumber;
  baru.indeks = 0;
  baru.nama = null;
  baru.status = 'memilih';
  baru.jumlahTanyaUlang = 0;
  baru.ejaan = '';

  if (baru.sumber === 'daftar') {
    baru.kandidat = daftarNamaDariObat(medications);
  } else if (baru.sumber === 'pindai') {
    baru.kandidat = daftarNamaDariPindai(hasilPindai);
  } else if (baru.sumber === 'ketik' || baru.sumber === 'ejaan') {
    baru.kandidat = [];
  }

  if (nama !== null && nama !== undefined) {
    const valid = validasiNamaObat(nama);
    if (!valid.ok) return denganGalat(baru, galatNama(valid.pesan));
    baru.nama = valid.nama;
    baru.status = 'selesai';
    if (baru.sumber === null) baru.sumber = 'ketik';
  }

  return sebagaiSesi(baru);
}

/**
 * Jawab pertanyaan daftar/pindai dengan ya/tidak/lain. Tidak pernah
 * menafsirkan teks bebas sebagai nama.
 *
 * @param {object} sesi
 * @param {string} teks
 * @returns {{sesi:object, aksi:string, pertanyaan:string|null, ucapan:string,
 *            error:null|{code:string,pesan:string}}}
 */
export function jawabNama(sesi, teks) {
  const lama = sesi && typeof sesi === 'object' ? sesi : buatSesiNama();
  const baru = klonSesi(lama);

  if (baru.status !== 'memilih' || !['daftar', 'pindai'].includes(baru.sumber)) {
    return hasilNama(baru, 'tidak-berlaku', pertanyaanSesi(baru), '');
  }

  const klasifikasi = cocokkanYaTidak(teks);
  const namaSaatIni = baru.kandidat[baru.indeks] || null;

  if (klasifikasi === 'ya') {
    if (!namaSaatIni) {
      baru.status = 'batal';
      baru.nama = null;
      catat(baru, teks, klasifikasi, 'batal');
      return hasilNama(
        baru,
        'batal',
        null,
        'Nama tidak ditemukan. Ketik atau eja nama obat.'
      );
    }
    baru.nama = namaSaatIni;
    baru.status = 'selesai';
    catat(baru, teks, klasifikasi, 'selesai', namaSaatIni);
    return hasilNama(baru, 'selesai', null, `Baik, nama obat ${namaSaatIni}.`);
  }

  if (klasifikasi === 'tidak') {
    baru.indeks += 1;
    if (baru.indeks >= baru.kandidat.length) {
      baru.status = 'batal';
      baru.nama = null;
      catat(baru, teks, klasifikasi, 'batal');
      return hasilNama(
        baru,
        'batal',
        null,
        'Nama tidak ditemukan. Ketik atau eja nama obat.'
      );
    }
    const pertanyaan = pertanyaanSesi(baru);
    catat(baru, teks, klasifikasi, 'lanjut');
    return hasilNama(baru, 'lanjut', pertanyaan, pertanyaan || '');
  }

  const sudahTombol = baru.jumlahTanyaUlang >= 2;
  if (!sudahTombol) {
    baru.jumlahTanyaUlang = Math.min(2, baru.jumlahTanyaUlang + 1);
  }
  const pertanyaan = pertanyaanSesi(baru);

  if (baru.jumlahTanyaUlang >= 2) {
    catat(baru, teks, klasifikasi, 'tombol');
    const ucapan = sudahTombol
      ? ''
      : `${pertanyaan || ''} Silakan pilih tombol atau ketik nama obat.`.trim();
    return hasilNama(baru, 'tombol', pertanyaan, ucapan);
  }

  catat(baru, teks, klasifikasi, 'ulangi');
  return hasilNama(baru, 'ulangi', pertanyaan, pertanyaan || '');
}

/**
 * Terima nama yang diketik/ditempel pendamping. Parameter ini tidak boleh
 * diisi dari hasil pengenalan suara; UI wajib memakai input teks.
 *
 * @param {object} sesi
 * @param {string} teks
 * @returns {{sesi:object, aksi:string, pertanyaan:string|null, ucapan:string,
 *            error:null|{code:string,pesan:string}}}
 */
export function ketikNama(sesi, teks) {
  const lama = sesi && typeof sesi === 'object' ? sesi : buatSesiNama();
  const baru = klonSesi(lama);

  if (baru.status === 'selesai' || baru.status === 'batal') {
    return hasilNama(baru, 'tidak-berlaku', pertanyaanSesi(baru), '');
  }

  const valid = validasiNamaObat(teks);
  if (!valid.ok) {
    catat(baru, teks, 'ketik', 'tidak-berlaku');
    return hasilNama(
      baru,
      'tidak-berlaku',
      pertanyaanSesi(baru),
      valid.pesan,
      galatNama(valid.pesan)
    );
  }

  baru.sumber = 'ketik';
  baru.nama = valid.nama;
  baru.ejaan = '';
  baru.status = 'selesai';
  catat(baru, teks, 'ketik', 'selesai', valid.nama);
  return hasilNama(baru, 'selesai', null, `Baik, nama obat ${valid.nama}.`);
}

/**
 * Mulai mode ejaan (alfabet tertutup).
 *
 * @param {object} sesi
 * @returns {object} SesiNama baru
 */
export function mulaiEjaan(sesi) {
  const lama = sesi && typeof sesi === 'object' ? sesi : buatSesiNama();
  const baru = klonSesi(lama);
  baru.sumber = 'ejaan';
  baru.kandidat = [];
  baru.indeks = 0;
  baru.nama = null;
  baru.ejaan = '';
  baru.status = 'memilih';
  baru.jumlahTanyaUlang = 0;
  return sebagaiSesi(baru);
}

/** Ubah satu masukan menjadi satu karakter alfabet ejaan, atau null. */
function hurufDariMasukan(teks) {
  if (typeof teks !== 'string') return null;
  if (teks === ' ') return ' ';
  const bersih = teks.normalize('NFKC').toLowerCase().trim();
  if (bersih === '') return null;
  if (bersih.length === 1 && HURUF_EJAAN.includes(bersih)) return bersih;
  if (Object.prototype.hasOwnProperty.call(NAMA_HURUF, bersih)) {
    return NAMA_HURUF[bersih];
  }
  return null;
}

/**
 * Tambah satu huruf/nama huruf ke ejaan. Masukan di luar alfabet tertutup
 * ditolak dengan `NAMA_TIDAK_VALID` dan ejaan tidak berubah.
 *
 * @param {object} sesi
 * @param {string} teks
 * @returns {object} SesiNama baru (dengan `error` non-enumerable bila ditolak)
 */
export function tambahHuruf(sesi, teks) {
  const lama = sesi && typeof sesi === 'object' ? sesi : buatSesiNama();
  const baru = klonSesi(lama);

  if (baru.status !== 'memilih' || baru.sumber !== 'ejaan') {
    return denganGalat(baru, galatNama('Mulai mode ejaan terlebih dahulu.'));
  }

  const huruf = hurufDariMasukan(teks);
  if (huruf === null) {
    return denganGalat(
      baru,
      galatNama('Huruf tidak dikenal. Sebutkan satu huruf atau nama hurufnya.')
    );
  }

  baru.ejaan += huruf;
  return sebagaiSesi(baru);
}

/**
 * Hapus karakter terakhir ejaan.
 *
 * @param {object} sesi
 * @returns {object} SesiNama baru
 */
export function hapusHuruf(sesi) {
  const lama = sesi && typeof sesi === 'object' ? sesi : buatSesiNama();
  const baru = klonSesi(lama);
  if (baru.status === 'memilih' && baru.ejaan.length > 0) {
    baru.ejaan = baru.ejaan.slice(0, -1);
  }
  return sebagaiSesi(baru);
}

/**
 * Selesai mengeja: validasi hasil ejaan lalu masuk status menunggu
 * konfirmasi ya/tidak.
 *
 * @param {object} sesi
 * @returns {object} SesiNama baru (dengan `error` non-enumerable bila invalid)
 */
export function selesaiEjaan(sesi) {
  const lama = sesi && typeof sesi === 'object' ? sesi : buatSesiNama();
  const baru = klonSesi(lama);

  if (baru.status !== 'memilih' || baru.sumber !== 'ejaan') {
    return denganGalat(baru, galatNama('Mulai mode ejaan terlebih dahulu.'));
  }

  const valid = validasiNamaObat(baru.ejaan);
  if (!valid.ok) return denganGalat(baru, galatNama(valid.pesan));

  baru.nama = valid.nama;
  baru.ejaan = valid.nama;
  baru.status = 'menunggu-konfirmasi-ejaan';
  baru.jumlahTanyaUlang = 0;
  Object.defineProperty(baru, 'pertanyaan', {
    value: `${PERTANYAAN_EJAAN}${valid.nama}?`,
    enumerable: false,
    configurable: true
  });
  return sebagaiSesi(baru);
}

/**
 * Konfirmasi hasil ejaan: `ya` menyelesaikan nama, `tidak` mengulang ejaan,
 * `lain` diulang maksimum 2 lalu tombol/ketik.
 *
 * @param {object} sesi
 * @param {string} teks
 * @returns {{sesi:object, aksi:string, pertanyaan:string|null, ucapan:string,
 *            error:null|{code:string,pesan:string}}}
 */
export function konfirmasiEjaan(sesi, teks) {
  const lama = sesi && typeof sesi === 'object' ? sesi : buatSesiNama();
  const baru = klonSesi(lama);

  if (baru.status !== 'menunggu-konfirmasi-ejaan' || !baru.nama) {
    return hasilNama(baru, 'tidak-berlaku', pertanyaanSesi(baru), '');
  }

  const klasifikasi = cocokkanYaTidak(teks);

  if (klasifikasi === 'ya') {
    baru.status = 'selesai';
    catat(baru, teks, klasifikasi, 'selesai', baru.nama);
    return hasilNama(baru, 'selesai', null, `Baik, nama obat ${baru.nama}.`);
  }

  if (klasifikasi === 'tidak') {
    baru.status = 'memilih';
    baru.nama = null;
    baru.ejaan = '';
    baru.jumlahTanyaUlang = 0;
    catat(baru, teks, klasifikasi, 'ulangi');
    return hasilNama(
      baru,
      'ulangi',
      pertanyaanSesi(baru),
      'Baik, silakan eja nama obat lagi.'
    );
  }

  const sudahTombol = baru.jumlahTanyaUlang >= 2;
  if (!sudahTombol) {
    baru.jumlahTanyaUlang = Math.min(2, baru.jumlahTanyaUlang + 1);
  }
  const pertanyaan = pertanyaanSesi(baru);

  if (baru.jumlahTanyaUlang >= 2) {
    catat(baru, teks, klasifikasi, 'tombol');
    const ucapan = sudahTombol
      ? ''
      : `${pertanyaan || ''} Silakan pilih tombol atau ketik nama obat.`.trim();
    return hasilNama(baru, 'tombol', pertanyaan, ucapan);
  }

  catat(baru, teks, klasifikasi, 'ulangi');
  return hasilNama(baru, 'ulangi', pertanyaan, pertanyaan || '');
}
