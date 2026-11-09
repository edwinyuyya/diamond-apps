/**
 * Kamus singkatan resep, normalisasi teks, tokenisasi, dan penyusun kalimat
 * terjemahan Indonesia awam (CONTRACT.md 7.8.1).
 *
 * Murni: tanpa DOM, tanpa jaringan, tanpa database obat, tanpa AI. Modul ini
 * hanya membaca singkatan yang tertulis dan tidak menambah dosis baru.
 */

/**
 * Kamus singkatan minimal (boleh ditambah, arti tidak boleh diubah).
 * Setiap entri: `{ arti, jenis }`.
 */
export const KAMUS_SINGKATAN = {
  // Frekuensi
  dd: { arti: 'kali sehari', jenis: 'frekuensi' },
  'd.d.': { arti: 'kali sehari', jenis: 'frekuensi' },
  x: { arti: 'kali', jenis: 'frekuensi' },

  // Label / penanda resep
  s: { arti: 'tanda/tulis resep', jenis: 'label' },
  S: { arti: 'tanda/tulis resep', jenis: 'label' },
  signa: { arti: 'tanda/tulis resep', jenis: 'label' },
  'r/': { arti: 'resep', jenis: 'label' },
  'r.': { arti: 'resep', jenis: 'label' },

  // Bentuk sediaan
  tab: { arti: 'tablet', jenis: 'bentuk' },
  tbl: { arti: 'tablet', jenis: 'bentuk' },
  tablet: { arti: 'tablet', jenis: 'bentuk' },
  caps: { arti: 'kapsul', jenis: 'bentuk' },
  cap: { arti: 'kapsul', jenis: 'bentuk' },
  kapsul: { arti: 'kapsul', jenis: 'bentuk' },
  c: { arti: 'kapsul', jenis: 'bentuk' },
  syr: { arti: 'sirup', jenis: 'bentuk' },
  sirup: { arti: 'sirup', jenis: 'bentuk' },
  cth: { arti: 'sendok teh', jenis: 'bentuk' },
  'sendok teh': { arti: 'sendok teh', jenis: 'bentuk' },
  gtt: { arti: 'tetes', jenis: 'bentuk' },
  tetes: { arti: 'tetes', jenis: 'bentuk' },
  supp: { arti: 'supositoria', jenis: 'bentuk' },
  supositoria: { arti: 'supositoria', jenis: 'bentuk' },
  ung: { arti: 'salep', jenis: 'bentuk' },
  salep: { arti: 'salep', jenis: 'bentuk' },
  inj: { arti: 'suntikan', jenis: 'bentuk' },
  suntikan: { arti: 'suntikan', jenis: 'bentuk' },

  // Aturan makan
  pc: { arti: 'sesudah makan', jenis: 'aturan makan' },
  'p.c.': { arti: 'sesudah makan', jenis: 'aturan makan' },
  'sesudah makan': { arti: 'sesudah makan', jenis: 'aturan makan' },
  'setelah makan': { arti: 'sesudah makan', jenis: 'aturan makan' },
  ac: { arti: 'sebelum makan', jenis: 'aturan makan' },
  'a.c.': { arti: 'sebelum makan', jenis: 'aturan makan' },
  'sebelum makan': { arti: 'sebelum makan', jenis: 'aturan makan' },
  dc: { arti: 'saat makan', jenis: 'aturan makan' },
  'd.c.': { arti: 'saat makan', jenis: 'aturan makan' },
  'saat makan': { arti: 'saat makan', jenis: 'aturan makan' },
  'bersama makan': { arti: 'saat makan', jenis: 'aturan makan' },

  // Aturan khusus
  prn: { arti: 'bila perlu', jenis: 'aturan' },
  'k.p.': { arti: 'bila perlu', jenis: 'aturan' },
  kp: { arti: 'bila perlu', jenis: 'aturan' },
  'bila perlu': { arti: 'bila perlu', jenis: 'aturan' },

  // Waktu minum
  hs: { arti: 'sebelum tidur', jenis: 'waktu' },
  'h.s.': { arti: 'sebelum tidur', jenis: 'waktu' },
  'sebelum tidur': { arti: 'sebelum tidur', jenis: 'waktu' },
  mane: { arti: 'pagi', jenis: 'waktu' },
  pagi: { arti: 'pagi', jenis: 'waktu' },
  siang: { arti: 'siang', jenis: 'waktu' },
  nocte: { arti: 'malam', jenis: 'waktu' },
  malam: { arti: 'malam', jenis: 'waktu' },

  // Durasi & jumlah
  d: { arti: 'hari', jenis: 'waktu' },
  hari: { arti: 'hari', jenis: 'waktu' },
  selama: { arti: 'selama', jenis: 'durasi' },
  minggu: { arti: 'minggu', jenis: 'waktu' },
  'No.': { arti: 'jumlah', jenis: 'jumlah' },
  'no.': { arti: 'jumlah', jenis: 'jumlah' },
  no: { arti: 'jumlah', jenis: 'jumlah' },
  nomor: { arti: 'jumlah', jenis: 'jumlah' },
  '#': { arti: 'jumlah', jenis: 'jumlah' },

  // Satuan kekuatan
  mg: { arti: 'satuan kekuatan', jenis: 'satuan' },
  mcg: { arti: 'satuan kekuatan', jenis: 'satuan' },
  µg: { arti: 'satuan kekuatan', jenis: 'satuan' },
  ug: { arti: 'satuan kekuatan', jenis: 'satuan' },
  g: { arti: 'satuan kekuatan', jenis: 'satuan' },
  ml: { arti: 'satuan kekuatan', jenis: 'satuan' },
  '%': { arti: 'satuan kekuatan', jenis: 'satuan' }
};

/** Label bentuk sediaan untuk kalimat terjemahan. */
export const LABEL_BENTUK = {
  tab: 'tablet',
  caps: 'kapsul',
  syr: 'sirup',
  cth: 'sendok teh',
  gtt: 'tetes',
  supp: 'supositoria',
  ung: 'salep',
  inj: 'suntikan'
};

/** Label aturan makan untuk kalimat terjemahan. */
export const LABEL_ATURAN_MAKAN = {
  sebelum: 'sebelum makan',
  sesudah: 'sesudah makan',
  saat: 'saat makan',
  'bila-perlu': 'bila perlu'
};

/** Label waktu minum untuk kalimat/daftar waktu. */
export const LABEL_WAKTU = {
  pagi: 'pagi',
  siang: 'siang',
  malam: 'malam',
  'sebelum-tidur': 'sebelum tidur'
};

/** Kalimat pengganti bila frekuensi tidak dapat dibaca (persis kontrak). */
const KALIMAT_FREKUENSI_TIDAK_DIKENAL =
  'Aturan minum belum dikenali; cocokkan dengan apoteker atau dokter.';

/** Formatter angka Indonesia: desimal memakai koma (0,5). */
const FORMAT_ANGKA = new Intl.NumberFormat('id-ID');

/** Satuan kalimat per kode bentuk sediaan (dosis, bukan nama sediaan). */
const SATUAN_FRASA = {
  tab: 'tablet',
  caps: 'kapsul',
  syr: 'ml',
  cth: 'sendok teh',
  gtt: 'tetes',
  supp: 'supositoria',
  ung: 'salep',
  inj: 'suntikan'
};

/** Ubah angka menjadi teks Indonesia; non-angka dikembalikan apa adanya. */
function angkaID(nilai) {
  const angka = Number(nilai);
  if (!Number.isFinite(angka)) return String(nilai ?? '');
  return FORMAT_ANGKA.format(angka);
}

/** Pecahan unicode -> `n/d`. Harus dilakukan SEBELUM NFKC: `1½` kalau tidak akan menjadi `11/2` (5,5!). */
const PECAHAN_ASCII = {
  '¼': '1/4', '½': '1/2', '¾': '3/4', '⅓': '1/3', '⅔': '2/3', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5',
  '⅘': '4/5', '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8'
};
const KELAS_PECAHAN = Object.keys(PECAHAN_ASCII).join('');
function pecahanUnicodeKeAscii(teks) {
  return teks
    // bilangan campuran: `1½` / `1 ½` -> `1 1/2`
    .replace(new RegExp(`(\\d)\\s*([${KELAS_PECAHAN}])`, 'g'), (_, d, f) => `${d} ${PECAHAN_ASCII[f]}`)
    // pecahan tunggal: `½` -> ` 1/2 `
    .replace(new RegExp(`([${KELAS_PECAHAN}])`, 'g'), (_, f) => ` ${PECAHAN_ASCII[f]} `);
}

/**
 * Normalisasi teks resep (CONTRACT.md 7.8.1).
 *
 * NFKC + lowercase, singkatan bertitik diseragamkan, mikrogram -> `mcg`,
 * tanda kali -> `x`, spasi dirapikan. Titik desimal (`7.2`) dipertahankan.
 *
 * @param {string} teks
 * @returns {string}
 */
export function normalisasiResep(teks) {
  if (teks === null || teks === undefined) return '';

  let hasil = pecahanUnicodeKeAscii(String(teks)).normalize('NFKC').toLowerCase();

  // Urutan penggantian mengikuti CONTRACT.md 7.8.1.
  hasil = hasil
    .replace(/p\.c\./g, 'pc')
    .replace(/a\.c\./g, 'ac')
    .replace(/d\.c\./g, 'dc')
    .replace(/h\.s\./g, 'hs')
    .replace(/k\.p\./g, 'kp')
    .replace(/d\.d\./g, 'dd');

  // NFKC mengubah micro sign (U+00B5) menjadi Greek mu (U+03BC).
  hasil = hasil.replace(/[µμ]g/g, 'mcg');
  hasil = hasil.replace(/\bug\b/g, 'mcg');

  // Tanda perkalian unicode -> x.
  hasil = hasil.replace(/[×✕✖]/g, 'x');

  // NFKC mengubah pecahan seperti ½ menjadi `1⁄2` (fraction slash U+2044).
  hasil = hasil.replace(/⁄/g, '/');

  // Rapikan spasi ganda dan spasi di ujung.
  return hasil.replace(/\s+/g, ' ').trim();
}

/** Buang tanda baca di awal/akhir token; `#`, `/`, dan `%` dipertahankan. */
function rapikanToken(token) {
  return token
    .replace(/^[.,;:!?()[\]{}'"“”‘’–—-]+/, '')
    .replace(/[.,;:!?()[\]{}'"“”‘’–—-]+$/, '');
}

/**
 * Pecah teks resep yang sudah dinormalisasi menjadi token.
 *
 * Pemisah adalah spasi; tanda baca di ujung token dibuang. Titik di dalam
 * token (mis. `s.2.dd.c.i`, `7.2`) dan `#20`/`r/` dipertahankan.
 *
 * @param {string} teks
 * @returns {string[]}
 */
export function tokenisasiResep(teks) {
  const normal = normalisasiResep(teks);
  if (normal === '') return [];
  const hasil = [];
  for (const mentah of normal.split(' ')) {
    const token = rapikanToken(mentah);
    if (token === '') continue;
    if (!/[0-9a-z#%\/]/.test(token)) continue;
    hasil.push(token);
  }
  return hasil;
}

/**
 * Bagian takaran pada kalimat, mis. `1 tablet`, `3 tetes`,
 * `1 sendok teh (5 ml)`. String kosong bila takaran/satuan tidak diketahui.
 */
function frasaTakaran(obat) {
  if (obat.takaranPerDosis === null || obat.takaranPerDosis === undefined) return '';
  const nilai = Number(obat.takaranPerDosis);
  if (!Number.isFinite(nilai)) return '';

  const kode = obat.bentukSediaan && obat.bentukSediaan.kode
    ? obat.bentukSediaan.kode
    : null;
  const satuan = typeof obat.satuanTakaran === 'string' ? obat.satuanTakaran : '';

  if (kode === 'cth' || satuan === 'sendok teh' || satuan === 'cth') {
    return `${angkaID(nilai)} sendok teh (${angkaID(nilai * 5)} ml)`;
  }

  let label = '';
  if (kode && SATUAN_FRASA[kode]) label = SATUAN_FRASA[kode];
  else if (kode && LABEL_BENTUK[kode]) label = LABEL_BENTUK[kode];
  else if (satuan) label = satuan;

  if (label === '') return '';
  return `${angkaID(nilai)} ${label}`;
}

/**
 * Susun kalimat Indonesia awam dari satu `ObatTerjemahan`.
 *
 * Template persis CONTRACT.md 7.8.1:
 * `Diminum {kali} kali sehari, {takaran} {satuan}, {aturanMakan}, selama {n} hari`
 * dengan klausa null dihilangkan; `bila-perlu` memakai bentuk khusus; frekuensi
 * yang tidak dikenal memakai kalimat pengganti tetap.
 *
 * @param {object} obat
 * @returns {string}
 */
export function frasaTerjemahan(obat) {
  if (!obat || typeof obat !== 'object') return KALIMAT_FREKUENSI_TIDAK_DIKENAL;

  const kali = Number(obat.kaliSehari);
  const adaKali = obat.kaliSehari !== null
    && obat.kaliSehari !== undefined
    && Number.isFinite(kali)
    && kali > 0;

  const aturan = typeof obat.aturanMakan === 'string' ? obat.aturanMakan : null;
  const durasi = Number(obat.durasiHari);
  const adaDurasi = obat.durasiHari !== null
    && obat.durasiHari !== undefined
    && Number.isFinite(durasi)
    && durasi > 0;

  const dosis = frasaTakaran(obat);
  const potonganDurasi = adaDurasi ? `, selama ${angkaID(durasi)} hari` : '';

  if (aturan === 'bila-perlu') {
    return `Diminum bila perlu${dosis ? `, ${dosis}` : ''}${potonganDurasi}`;
  }

  if (!adaKali) return KALIMAT_FREKUENSI_TIDAK_DIKENAL;

  let kalimat = `Diminum ${angkaID(kali)} kali sehari`;
  if (dosis) kalimat += `, ${dosis}`;
  if (aturan) kalimat += `, ${LABEL_ATURAN_MAKAN[aturan] || aturan}`;
  kalimat += potonganDurasi;
  return kalimat;
}
