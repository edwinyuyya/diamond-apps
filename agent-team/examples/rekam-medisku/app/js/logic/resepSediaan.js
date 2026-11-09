/**
 * Parser sediaan, kekuatan, durasi, dan jumlah resep (murni, tanpa DOM/dependency).
 *
 * Mengikuti CONTRACT.md 7.9.1. Modul ini hanya membaca apa yang tertulis:
 * tidak mengubah `minggu` menjadi hari dan tidak menyimpulkan dosis yang tidak ada.
 */

/** Bentuk sediaan yang dikenali beserta label & satuan tampilannya. */
export const BENTUK_SEDIAAN = {
  tab:  { kode: 'tab',  label: 'tablet',      satuan: 'tablet',      satuanLabel: 'tablet' },
  caps: { kode: 'caps', label: 'kapsul',      satuan: 'kapsul',      satuanLabel: 'kapsul' },
  syr:  { kode: 'syr',  label: 'sirup',       satuan: 'ml',          satuanLabel: 'ml' },
  cth:  { kode: 'cth',  label: 'sendok teh',  satuan: 'ml',          satuanLabel: 'sendok teh', faktorMl: 5 },
  gtt:  { kode: 'gtt',  label: 'tetes',       satuan: 'tetes',       satuanLabel: 'tetes' },
  supp: { kode: 'supp', label: 'supositoria', satuan: 'supositoria', satuanLabel: 'supositoria' },
  ung:  { kode: 'ung',  label: 'salep',       satuan: 'salep',       satuanLabel: 'salep' },
  inj:  { kode: 'inj',  label: 'suntikan',    satuan: 'suntikan',    satuanLabel: 'suntikan' }
};

/** Satuan kekuatan yang didukung (µg/ug dinormalisasi menjadi `mcg`). */
export const SATUAN_KEKUATAN = ['mg', 'mcg', 'g', 'ml', '%'];

/** Pemetaan token bentuk (huruf kecil) ke kode BENTUK_SEDIAAN. */
const TOKEN_BENTUK = {
  tab: 'tab', tbl: 'tab', tablet: 'tab',
  caps: 'caps', cap: 'caps', kapsul: 'caps', c: 'caps',
  syr: 'syr', sirup: 'syr',
  cth: 'cth',
  gtt: 'gtt', tetes: 'gtt',
  supp: 'supp', supositoria: 'supp',
  ung: 'ung', salep: 'ung',
  inj: 'inj', suntikan: 'inj'
};

/** Token bentuk yang dicari di teks bebas, urut dari yang paling spesifik. */
const POLA_BENTUK = [
  ['cth', /\bcth\b|\bsendok\s+teh\b/i],
  ['gtt', /\bgtt\b|\btetes\b/i],
  ['supp', /\bsupp\b|\bsupositoria\b/i],
  ['ung', /\bung\b|\bsalep\b/i],
  ['inj', /\binj\b|\bsuntikan\b/i],
  ['caps', /\bcaps\b|\bcap\b|\bkapsul\b/i],
  ['tab', /\btab\b|\btbl\b|\btablet\b/i],
  ['syr', /\bsyr\b|\bsirup\b/i]
];

/** Pecahan unicode yang lazim ditulis pada resep. */
const PECAHAN = {
  '¼': 0.25, '½': 0.5, '¾': 0.75,
  '⅓': 1 / 3, '⅔': 2 / 3,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1 / 6, '⅚': 5 / 6,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
};

const PECAHAN_CHARS = Object.keys(PECAHAN).join('');

/** Nilai angka dari input mentah, atau `null` bila bukan angka. */
function angkaDariTeks(mentah) {
  const teks = String(mentah).trim();
  if (teks === '') return null;

  // Bilangan campuran seperti `1½` -> 1.5
  const campuran = new RegExp(`^(\\d+)\\s*([${PECAHAN_CHARS}])$`).exec(teks);
  if (campuran) {
    return Number(campuran[1]) + PECAHAN[campuran[2]];
  }

  // Bilangan campuran dengan pecahan biasa: `1 1/2` -> 1.5
  const campuranBiasa = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(teks);
  if (campuranBiasa) {
    const penyebut = Number(campuranBiasa[3]);
    if (penyebut === 0) return null;
    return Number(campuranBiasa[1]) + Number(campuranBiasa[2]) / penyebut;
  }

  const satuPecahan = PECAHAN[teks];
  if (satuPecahan !== undefined) return satuPecahan;

  // Pecahan biasa `1/2`, boleh bertanda negatif.
  const bagi = /^(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/.exec(teks);
  if (bagi) {
    const pembilang = Number(bagi[1].replace(',', '.'));
    const penyebut = Number(bagi[2].replace(',', '.'));
    if (!Number.isFinite(pembilang) || !Number.isFinite(penyebut) || penyebut === 0) return null;
    return pembilang / penyebut;
  }

  const desimal = teks.replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/.test(desimal)) return null;
  const nilai = Number(desimal);
  return Number.isFinite(nilai) ? nilai : null;
}

/**
 * Normalisasi angka resep: `½`/`1/2` -> `0.5`, koma desimal -> titik.
 *
 * @param {string|number} teks
 * @returns {number|null} angka, atau `null` bila tidak dapat dibaca
 */
export function normalizeAngka(teks) {
  if (typeof teks === 'number') return Number.isFinite(teks) ? teks : null;
  if (teks === null || teks === undefined) return null;
  return angkaDariTeks(teks);
}

const ROMAN_NILAI = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
const ROMAN_TABEL = [
  [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'],
  [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
  [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']
];

/** Angka bulat -> angka Romawi kanonik (1..3999), atau `null`. */
function keRoman(nilai) {
  if (!Number.isInteger(nilai) || nilai < 1 || nilai > 3999) return null;
  let sisa = nilai;
  let hasil = '';
  for (const [angka, simbol] of ROMAN_TABEL) {
    while (sisa >= angka) {
      hasil += simbol;
      sisa -= angka;
    }
  }
  return hasil;
}

/**
 * Angka Romawi (`I`..`X`, juga `XI` dan seterusnya) atau angka biasa -> number.
 * Hanya bentuk kanonik yang diterima (`IIII`/`IC` -> `null`).
 *
 * @param {string|number} teks
 * @returns {number|null}
 */
export function parseRoman(teks) {
  if (typeof teks === 'number') {
    return Number.isInteger(teks) && teks >= 0 ? teks : null;
  }
  if (typeof teks !== 'string') return null;
  const s = teks.trim().toLowerCase();
  if (s === '') return null;
  if (/^\d+$/.test(s)) return Number(s);
  if (!/^[ivxlcdm]+$/.test(s)) return null;

  let total = 0;
  let sebelumnya = 0;
  for (let i = s.length - 1; i >= 0; i -= 1) {
    const nilai = ROMAN_NILAI[s[i]];
    if (nilai < sebelumnya) {
      total -= nilai;
    } else {
      total += nilai;
      sebelumnya = nilai;
    }
  }
  if (total < 1) return null;
  return keRoman(total) === s ? total : null;
}

/**
 * Cari bentuk sediaan pertama yang tertulis.
 *
 * @param {string} teks
 * @returns {object|null} `BENTUK_SEDIAAN[kode]` atau `null`
 */
export function parseBentukSediaan(teks) {
  if (typeof teks !== 'string' || teks === '') return null;
  for (const [kode, pola] of POLA_BENTUK) {
    if (pola.test(teks)) return BENTUK_SEDIAAN[kode];
  }
  return null;
}

const POLA_KEKUATAN = /(\d+(?:[.,]\d+)?|[0-9]+\s*\/\s*[0-9]+)\s*(mcg|µg|ug|mg|g|ml|%)(?![a-z])/i;

/**
 * Kekuatan obat yang tertulis, mis. `5 mg`, `500mcg`, `0,5 g`, `5 ml`, `2 %`.
 *
 * @param {string} teks
 * @returns {{nilai:number, satuan:string, teks:string}|null}
 */
export function parseKekuatan(teks) {
  if (typeof teks !== 'string') return null;
  const cocok = POLA_KEKUATAN.exec(teks);
  if (!cocok) return null;
  const nilai = normalizeAngka(cocok[1]);
  if (nilai === null) return null;
  let satuan = cocok[2].toLowerCase();
  if (satuan === 'µg' || satuan === 'ug') satuan = 'mcg';
  return { nilai, satuan, teks: `${nilai} ${satuan}` };
}

const POLA_DURASI_BERPENANDA = /\b(?:selama|untuk|x)\s*(\d+)\s*hari\b/i;
const POLA_DURASI = /\b(\d+)\s*hari\b/i;

/**
 * Durasi pemakaian dalam hari: `selama 5 hari`, `x 7 hari`, atau `7 hari`.
 * `minggu` sengaja tidak dikonversi.
 *
 * @param {string} teks
 * @returns {{hari:number, teksAsli:string}|null}
 */
export function parseDurasi(teks) {
  if (typeof teks !== 'string') return null;
  const berpenanda = POLA_DURASI_BERPENANDA.exec(teks);
  if (berpenanda) {
    return { hari: Number(berpenanda[1]), teksAsli: berpenanda[0].trim() };
  }
  const biasa = POLA_DURASI.exec(teks);
  if (biasa) {
    return { hari: Number(biasa[1]), teksAsli: biasa[0].trim() };
  }
  return null;
}

const POLA_JUMLAH = /(?:\bnomor\b|\bno\b\.?|#)\s*([ivxlcdm]+|\d+)\b/i;

/**
 * Jumlah total yang tertulis: `No. 10`, `No. X`, `#20`, `nomor 15`.
 * `satuan` diisi pemanggil bila bentuknya diketahui.
 *
 * @param {string} teks
 * @param {string|null} [satuan=null]
 * @returns {{jumlah:number, satuan:string|null, teksAsli:string}|null}
 */
export function parseJumlah(teks, satuan = null) {
  if (typeof teks !== 'string') return null;
  const cocok = POLA_JUMLAH.exec(teks);
  if (!cocok) return null;
  const mentah = cocok[1];
  const jumlah = /^\d+$/.test(mentah) ? Number(mentah) : parseRoman(mentah);
  if (jumlah === null || !Number.isFinite(jumlah)) return null;
  return {
    jumlah,
    satuan: typeof satuan === 'string' && satuan !== '' ? satuan : null,
    teksAsli: cocok[0].trim()
  };
}

/**
 * Satuan takaran dari satu token bentuk (mis. `c` -> `kapsul`, `tab` -> `tablet`).
 * Tidak diekspor pada kontrak, dipakai `resepJadwal.js`.
 *
 * @param {string|null|undefined} token
 * @returns {string|null}
 */
export function satuanDariTokenBentuk(token) {
  if (typeof token !== 'string') return null;
  const kode = TOKEN_BENTUK[token.trim().toLowerCase()];
  return kode ? BENTUK_SEDIAAN[kode].satuan : null;
}
