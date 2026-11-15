/**
 * Parser ucapan angka Indonesia deterministik (CONTRACT.md 8B.7.1).
 *
 * Murni, tanpa DOM/AI/dependency. Hanya mengurai yang benar-benar diucapkan:
 * frasa yang tidak lengkap atau ambigu dikembalikan `null`, bukan ditebak.
 */

/** Kata angka dasar sesuai kontrak. */
export const KATA_ANGKA = {
  nol: 0,
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
  sebelas: 11,
  seratus: 100,
  seribu: 1000,
  setengah: 0.5,
  seperempat: 0.25,
  seperdua: 0.5
};

/** Satuan 0–11 yang boleh berdiri sendiri. */
const SATUAN = {
  nol: 0,
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
  sebelas: 11
};

/** Kata pecahan yang bisa mengikuti bilangan bulat (`dua setengah`). */
const PECAHAN_KATA = {
  setengah: 0.5,
  seperdua: 0.5,
  seperempat: 0.25
};

const KATA_SATUAN_TTS = [
  'nol', 'satu', 'dua', 'tiga', 'empat',
  'lima', 'enam', 'tujuh', 'delapan', 'sembilan'
];

const POLA_TOKEN = /[a-z]+|\d+(?:[.,]\d+)?/g;
const POLA_TOKEN_DERET = /[a-z]+|\d+(?:[.,]\d+)?|\//g;

/** Bulatkan artefak floating point kecil (0.1 + 0.2). */
function bulatkan(nilai) {
  return Math.round((nilai + Number.EPSILON) * 1e6) / 1e6;
}

/**
 * Normalisasi teks ucapan: NFKC, huruf kecil, tanda baca dirapikan.
 *
 * Koma dan titik dipertahankan karena dipakai sebagai desimal
 * (`12,5`/`12.5`). Karakter selain huruf/angka/desimal/persen/garis miring
 * diganti spasi.
 *
 * @param {string} teks
 * @returns {string}
 */
export function normalisasiUcapan(teks) {
  if (typeof teks !== 'string' || teks === '') return '';
  return teks
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/[^a-z0-9.,%/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tokenisasi dengan posisi pada teks yang sudah dinormalisasi. */
function tokenisasi(teks, pola = POLA_TOKEN) {
  const hasil = [];
  const re = new RegExp(pola.source, 'g');
  let cocok = re.exec(teks);
  while (cocok !== null) {
    hasil.push({
      teks: cocok[0],
      norm: cocok[0].toLowerCase(),
      awal: cocok.index,
      akhir: cocok.index + cocok[0].length
    });
    if (cocok[0] === '') re.lastIndex += 1;
    cocok = re.exec(teks);
  }
  return hasil;
}

/** Nilai satuan tunggal (0–11) atau `null`. */
function uraiSatuan(token) {
  if (typeof token !== 'string') return null;
  if (/^\d+$/.test(token)) return Number(token);
  if (Object.prototype.hasOwnProperty.call(SATUAN, token)) return SATUAN[token];
  return null;
}

/** Pecahan desimal dari rangkaian digit (`lima` -> 0.5, `dua lima` -> 0.25). */
function desimalDariDigit(teksDigit) {
  if (!/^\d+$/.test(teksDigit)) return null;
  return Number(`0.${teksDigit}`);
}

/**
 * Bagian pecahan setelah kata `koma`.
 * Menerima angka (`lima` -> 5 -> 0.5), rangkaian digit (`dua lima` -> 0.25),
 * atau bilangan (`dua puluh lima` -> 25 -> 0.25).
 */
function uraiPecahan(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return null;

  if (tokens.length === 1) {
    const token = tokens[0];
    if (/^\d+$/.test(token)) return desimalDariDigit(token);
    const satuan = uraiSatuan(token);
    if (satuan !== null) return desimalDariDigit(String(satuan));
    const nilai = uraiBulat(tokens);
    if (nilai === null || nilai < 0) return null;
    return desimalDariDigit(String(nilai));
  }

  const semuaDigitTunggal = tokens.every(
    (token) => /^\d$/.test(token)
      || (Object.prototype.hasOwnProperty.call(SATUAN, token) && SATUAN[token] <= 9)
  );
  if (semuaDigitTunggal) {
    const digit = tokens.map((token) => String(uraiSatuan(token))).join('');
    return desimalDariDigit(digit);
  }

  const nilai = uraiBulat(tokens);
  if (nilai === null || nilai < 0) return null;
  return desimalDariDigit(String(nilai));
}

/** Puluhan/belas: `dua puluh`, `dua puluh lima`, `lima belas`, `sepuluh`. */
function uraiPuluhan(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return null;

  if (tokens.length === 1) {
    return uraiSatuan(tokens[0]);
  }

  if (tokens.length === 2 && tokens[1] === 'belas') {
    const digit = uraiSatuan(tokens[0]);
    if (digit === null || digit < 1 || digit > 9) return null;
    return 10 + digit;
  }

  const indeksPuluh = tokens.lastIndexOf('puluh');
  if (indeksPuluh !== -1) {
    const kiri = tokens.slice(0, indeksPuluh);
    const kanan = tokens.slice(indeksPuluh + 1);
    if (kiri.length !== 1) return null;
    const digit = uraiSatuan(kiri[0]);
    if (digit === null || digit < 1 || digit > 9) return null;
    const dasar = digit * 10;
    if (kanan.length === 0) return dasar;
    if (kanan.length !== 1) return null;
    const sisa = uraiSatuan(kanan[0]);
    if (sisa === null || sisa < 1 || sisa > 9) return null;
    return dasar + sisa;
  }

  return null;
}

/** Ratusan: `seratus`, `dua ratus`, `seratus empat puluh`. */
function uraiRatusan(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return null;

  if (tokens.length === 1) {
    const token = tokens[0];
    if (/^\d+$/.test(token)) return Number(token);
    if (token === 'seratus') return 100;
    if (token === 'seribu') return 1000;
    return uraiSatuan(token);
  }

  if (tokens[0] === 'seratus') {
    const sisa = uraiPuluhan(tokens.slice(1));
    if (sisa === null || sisa < 0 || sisa >= 100) return null;
    return 100 + sisa;
  }

  const indeksRatus = tokens.lastIndexOf('ratus');
  if (indeksRatus !== -1) {
    const kiri = tokens.slice(0, indeksRatus);
    const kanan = tokens.slice(indeksRatus + 1);
    if (kiri.length !== 1) return null;
    const digit = uraiSatuan(kiri[0]);
    if (digit === null || digit < 1 || digit > 9) return null;
    const dasar = digit * 100;
    if (kanan.length === 0) return dasar;
    const sisa = uraiPuluhan(kanan);
    if (sisa === null || sisa < 0 || sisa >= 100) return null;
    return dasar + sisa;
  }

  return uraiPuluhan(tokens);
}

/** Bilangan bulat Indonesia: `dua ribu lima ratus`, `seribu`, `140`. */
function uraiBulat(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return null;

  if (tokens.length === 1) {
    const token = tokens[0];
    if (/^\d+$/.test(token)) return Number(token);
    if (/^\d+[.,]\d+$/.test(token)) return Number(token.replace(',', '.'));
    if (token === 'seratus') return 100;
    if (token === 'seribu') return 1000;
    return uraiSatuan(token);
  }

  if (tokens[0] === 'seribu' && tokens.length > 1) {
    const sisa = uraiRatusan(tokens.slice(1));
    if (sisa === null || sisa < 0 || sisa >= 1000) return null;
    return 1000 + sisa;
  }

  const indeksRibu = tokens.lastIndexOf('ribu');
  if (indeksRibu !== -1) {
    const kiri = tokens.slice(0, indeksRibu);
    const kanan = tokens.slice(indeksRibu + 1);
    if (kiri.length === 0) return null;
    const ribuan = uraiRatusan(kiri);
    if (ribuan === null || ribuan <= 0) return null;
    const dasar = ribuan * 1000;
    if (kanan.length === 0) return dasar;
    const sisa = uraiRatusan(kanan);
    if (sisa === null || sisa < 0 || sisa >= 1000) return null;
    return dasar + sisa;
  }

  return uraiRatusan(tokens);
}

/** Urai satu frasa angka lengkap; seluruh token harus terpakai. */
function uraiFrasa(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return null;

  const indeksKoma = tokens.indexOf('koma');
  if (indeksKoma !== -1) {
    if (tokens.indexOf('koma', indeksKoma + 1) !== -1) return null;
    const kiri = tokens.slice(0, indeksKoma);
    const kanan = tokens.slice(indeksKoma + 1);
    if (kiri.length === 0 || kanan.length === 0) return null;
    const bulat = uraiBulat(kiri);
    if (bulat === null) return null;
    const pecahan = uraiPecahan(kanan);
    if (pecahan === null) return null;
    return bulatkan(bulat + pecahan);
  }

  if (tokens.length === 1) {
    const token = tokens[0];
    if (Object.prototype.hasOwnProperty.call(PECAHAN_KATA, token)) {
      return PECAHAN_KATA[token];
    }
    return uraiBulat(tokens);
  }

  const akhir = tokens[tokens.length - 1];
  if (Object.prototype.hasOwnProperty.call(PECAHAN_KATA, akhir)) {
    const dasar = uraiBulat(tokens.slice(0, -1));
    if (dasar === null) return null;
    return bulatkan(dasar + PECAHAN_KATA[akhir]);
  }

  return uraiBulat(tokens);
}

/**
 * Urai frasa angka Indonesia menjadi number.
 *
 * @param {string} frasa
 * @returns {number|null} `null` bila frasa tidak lengkap/ambigu.
 */
export function ucapkanKeAngka(frasa) {
  if (typeof frasa === 'number') return Number.isFinite(frasa) ? frasa : null;
  const teks = normalisasiUcapan(frasa);
  if (teks === '') return null;
  const tokens = tokenisasi(teks);
  if (tokens.length === 0) return null;

  // Normalisasi teks membuang tanda baca; pastikan tidak ada token tak dikenal.
  const nilai = uraiFrasa(tokens.map((token) => token.norm));
  return nilai === null ? null : nilai;
}

/** Ucapkan bilangan bulat (0 .. triliunan) dalam kata Indonesia. */
function ucapkanBulat(nilai) {
  if (!Number.isInteger(nilai) || nilai < 0) return '';
  if (nilai < 10) return KATA_SATUAN_TTS[nilai];
  if (nilai === 10) return 'sepuluh';
  if (nilai === 11) return 'sebelas';
  if (nilai < 20) return `${KATA_SATUAN_TTS[nilai - 10]} belas`;
  if (nilai < 100) {
    const puluh = Math.floor(nilai / 10);
    const sisa = nilai % 10;
    return `${KATA_SATUAN_TTS[puluh]} puluh${sisa ? ` ${KATA_SATUAN_TTS[sisa]}` : ''}`;
  }
  if (nilai < 200) {
    const sisa = nilai % 100;
    return `seratus${sisa ? ` ${ucapkanBulat(sisa)}` : ''}`;
  }
  if (nilai < 1000) {
    const ratus = Math.floor(nilai / 100);
    const sisa = nilai % 100;
    return `${KATA_SATUAN_TTS[ratus]} ratus${sisa ? ` ${ucapkanBulat(sisa)}` : ''}`;
  }
  if (nilai < 2000) {
    const sisa = nilai % 1000;
    return `seribu${sisa ? ` ${ucapkanBulat(sisa)}` : ''}`;
  }
  if (nilai < 1e6) {
    const ribu = Math.floor(nilai / 1000);
    const sisa = nilai % 1000;
    return `${ucapkanBulat(ribu)} ribu${sisa ? ` ${ucapkanBulat(sisa)}` : ''}`;
  }

  const skala = [
    { nilai: 1e12, kata: 'triliun' },
    { nilai: 1e9, kata: 'miliar' },
    { nilai: 1e6, kata: 'juta' }
  ];
  for (const { nilai: faktor, kata } of skala) {
    if (nilai >= faktor) {
      const jumlah = Math.floor(nilai / faktor);
      const sisa = nilai % faktor;
      return `${ucapkanBulat(jumlah)} ${kata}${sisa ? ` ${ucapkanBulat(sisa)}` : ''}`;
    }
  }
  return '';
}

/**
 * Ubah angka menjadi ucapan Indonesia untuk TTS.
 * Desimal memakai `koma` dan dibaca digit per digit
 * (`12.5` -> `'dua belas koma lima'`, bukan "titik").
 *
 * @param {number|string} nilai
 * @returns {string}
 */
export function ucapkanAngka(nilai) {
  let angka = nilai;
  if (typeof angka === 'string') {
    const bersih = angka.trim().replace(',', '.');
    if (bersih === '') return '';
    angka = Number(bersih);
  }
  if (typeof angka !== 'number' || !Number.isFinite(angka)) return '';

  const negatif = angka < 0;
  let teks = String(Math.abs(angka));
  if (teks.includes('e') || teks.includes('E')) {
    teks = Math.abs(angka).toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  }

  const [bagianBulat, bagianPecahan = ''] = teks.split('.');
  let hasil = ucapkanBulat(Number(bagianBulat));
  if (bagianPecahan !== '') {
    const digit = bagianPecahan
      .split('')
      .map((d) => KATA_SATUAN_TTS[Number(d)])
      .join(' ');
    hasil += ` koma ${digit}`;
  }
  return `${negatif ? 'negatif ' : ''}${hasil}`;
}

/**
 * Cari angka pertama di dalam teks bebas.
 *
 * @param {string} teks
 * @returns {{nilai:number, teksAsli:string, awal:number, akhir:number}|null}
 */
export function parseAngkaDalamTeks(teks) {
  if (typeof teks !== 'string' || teks === '') return null;
  const tokens = tokenisasi(teks);
  if (tokens.length === 0) return null;

  const batas = Math.min(tokens.length, 1) + 12;
  for (let mulai = 0; mulai < tokens.length; mulai += 1) {
    let terbaik = null;
    const maksimal = Math.min(tokens.length, mulai + batas);
    for (let selesai = mulai + 1; selesai <= maksimal; selesai += 1) {
      const potongan = tokens.slice(mulai, selesai).map((token) => token.norm);
      const nilai = uraiFrasa(potongan);
      if (nilai !== null) {
        terbaik = {
          nilai,
          teksAsli: teks.slice(tokens[mulai].awal, tokens[selesai - 1].akhir),
          awal: tokens[mulai].awal,
          akhir: tokens[selesai - 1].akhir
        };
      }
    }
    if (terbaik !== null) return terbaik;
  }
  return null;
}

/**
 * Urai deret angka yang dipisah `per` atau `/`
 * (`seratus empat puluh per sembilan puluh` -> `[140, 90]`).
 *
 * @param {string} teks
 * @returns {number[]}
 */
export function parseDeretAngka(teks) {
  if (typeof teks !== 'string' || teks === '') return [];
  const tokens = tokenisasi(teks, POLA_TOKEN_DERET);
  const indeksPemisah = tokens.findIndex(
    (token) => token.norm === 'per' || token.teks === '/'
  );

  if (indeksPemisah === -1) {
    const satu = parseAngkaDalamTeks(teks);
    return satu === null ? [] : [satu.nilai];
  }

  const pemisah = tokens[indeksPemisah];
  const kiri = parseAngkaDalamTeks(teks.slice(0, pemisah.awal));
  const kanan = parseAngkaDalamTeks(teks.slice(pemisah.akhir));

  const hasil = [];
  if (kiri !== null) hasil.push(kiri.nilai);
  if (kanan !== null) hasil.push(kanan.nilai);
  return hasil;
}
