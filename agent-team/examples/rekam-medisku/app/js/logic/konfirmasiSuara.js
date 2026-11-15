/**
 * Mesin keadaan konfirmasi ya/tidak (CONTRACT.md 8B.6).
 *
 * Murni: bebas DOM, tanpa timer, tanpa efek samping, deterministik.
 * Objek sesi tidak pernah dimutasi; setiap jawaban mengembalikan sesi baru.
 */

/** Pertanyaan wajib yang dibacakan/ditampilkan sebelum menyimpan. */
export const PERTANYAAN_KONFIRMASI = 'Apakah benar yang sudah dicatat?';

/** Jumlah maksimum pertanyaan ulang sebelum sesi dibatalkan. */
export const MAKS_PERTANYAAN_ULANG = 2;

const JAWABAN_YA = new Set([
  'ya',
  'iya',
  'benar',
  'betul',
  'benar sekali',
  'ya benar',
  'sudah benar',
  'ok',
  'oke'
]);

const JAWABAN_TIDAK = new Set([
  'tidak',
  'nggak',
  'enggak',
  'gak',
  'bukan',
  'salah',
  'tidak benar',
  'keliru',
  'no'
]);

const UCAPAN_SIMPAN = 'Baik, saya simpan.';
const UCAPAN_ULANGI = 'Baik, tidak saya simpan. Silakan ulangi.';
const UCAPAN_BATAL = 'Saya tidak menyimpan karena tidak ada jawaban yang jelas.';

/**
 * Normalisasi teks jawaban: NFKC, huruf kecil, buang tanda baca, rapikan spasi.
 *
 * @param {unknown} teks
 * @returns {string}
 */
export function normalisasiJawaban(teks) {
  if (typeof teks !== 'string') return '';
  return teks
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Klasifikasi satu ucapan jawaban secara utuh (bukan substring).
 *
 * @param {unknown} teks
 * @returns {'ya'|'tidak'|'lain'}
 */
export function klasifikasiJawaban(teks) {
  const norm = normalisasiJawaban(teks);
  if (norm === '') return 'lain';
  if (JAWABAN_YA.has(norm)) return 'ya';
  if (JAWABAN_TIDAK.has(norm)) return 'tidak';
  return 'lain';
}

/**
 * Buat sesi konfirmasi baru berstatus `'menunggu'`.
 *
 * @param {{ringkasan?:string, maksUlang?:number}} [opsi]
 * @returns {object} Sesi
 */
export function buatSesiKonfirmasi({ ringkasan = '', maksUlang = MAKS_PERTANYAAN_ULANG } = {}) {
  const maks = Number.isInteger(maksUlang) && maksUlang >= 0
    ? maksUlang
    : MAKS_PERTANYAAN_ULANG;
  return {
    ringkasan: typeof ringkasan === 'string' ? ringkasan : String(ringkasan ?? ''),
    pertanyaan: PERTANYAAN_KONFIRMASI,
    status: 'menunggu',
    maksUlang: maks,
    jumlahTanyaUlang: 0,
    jawabanTerakhir: null,
    riwayat: []
  };
}

/** Jumlah pertanyaan ulang yang sudah dipakai (aman untuk sesi lama). */
function jumlahUlang(sesi) {
  return Number.isInteger(sesi.jumlahTanyaUlang) && sesi.jumlahTanyaUlang >= 0
    ? sesi.jumlahTanyaUlang
    : 0;
}

/** Maksimum ulang efektif pada sesi (aman untuk sesi lama/tak valid). */
function maksUlangSesi(sesi) {
  return Number.isInteger(sesi.maksUlang) && sesi.maksUlang >= 0
    ? sesi.maksUlang
    : MAKS_PERTANYAAN_ULANG;
}

/**
 * Terapkan satu jawaban pada sesi konfirmasi.
 *
 * Sesi yang sudah selesai bersifat idempoten: pemanggilan berikutnya
 * mengembalikan `aksi:'tidak-berlaku'` tanpa mengubah sesi/riwayat.
 *
 * @param {object} sesi
 * @param {unknown} teks jawaban mentah
 * @returns {{sesi:object, aksi:'simpan'|'ulangi-entri'|'tanya-ulang'|'batal'|'tidak-berlaku', ucapan:string}}
 */
export function jawabKonfirmasi(sesi, teks) {
  const aman = sesi && typeof sesi === 'object' ? sesi : buatSesiKonfirmasi();

  if (aman.status !== 'menunggu') {
    return { sesi: aman, aksi: 'tidak-berlaku', ucapan: '' };
  }

  const jawaban = typeof teks === 'string'
    ? teks
    : (teks === null || teks === undefined ? '' : String(teks));
  const klasifikasi = klasifikasiJawaban(jawaban);

  let aksi;
  let status;
  let ucapan;
  let jumlah = jumlahUlang(aman);

  if (klasifikasi === 'ya') {
    aksi = 'simpan';
    status = 'selesai-simpan';
    ucapan = UCAPAN_SIMPAN;
  } else if (klasifikasi === 'tidak') {
    aksi = 'ulangi-entri';
    status = 'selesai-ulangi';
    ucapan = UCAPAN_ULANGI;
  } else if (jumlah < maksUlangSesi(aman)) {
    // Bandingkan jumlah SEBELUM dinaikkan agar tepat `maksUlang` pertanyaan ulang.
    jumlah += 1;
    aksi = 'tanya-ulang';
    status = 'menunggu';
    ucapan = PERTANYAAN_KONFIRMASI;
  } else {
    jumlah += 1;
    aksi = 'batal';
    status = 'selesai-batal';
    ucapan = UCAPAN_BATAL;
  }

  const riwayat = Array.isArray(aman.riwayat) ? aman.riwayat : [];
  const baru = {
    ...aman,
    status,
    jumlahTanyaUlang: jumlah,
    jawabanTerakhir: jawaban,
    riwayat: [...riwayat, { jawaban, klasifikasi, aksi }]
  };

  return { sesi: baru, aksi, ucapan };
}
