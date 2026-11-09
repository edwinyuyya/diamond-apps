/**
 * Penerjemah resep deterministik (CONTRACT.md 7.8.2).
 *
 * Modul ini hanya membaca singkatan yang tertulis pada resep dan menyusun
 * kalimat Indonesia awam. Tidak ada AI, basis data obat, penebakan diagnosis,
 * atau penambahan dosis. Semua keluaran deterministik.
 */

import {
  DISCLAIMERS,
  PARSER_RESEP_VERSION
} from '../model.js';
import {
  BENTUK_SEDIAAN,
  parseBentukSediaan,
  parseDurasi,
  parseJumlah,
  parseKekuatan
} from './resepSediaan.js';
import {
  WAKTU_LABEL_ORDER,
  jadwalUntukObat,
  obatKeMedication,
  parseAturanMakan,
  parseFrekuensi,
  waktuMinumDariJam
} from './resepJadwal.js';
import { frasaTerjemahan, normalisasiResep } from './resepKamus.js';

export { PARSER_RESEP_VERSION };
export { jadwalUntukObat, obatKeMedication };

/** Peringatan tetap untuk hasil terjemahan resep. */
export const PERINGATAN_RESEP = [
  'Hasil ini adalah draf yang harus dicocokkan dengan resep asli.',
  'Kesalahan membaca dosis bisa berbahaya. Konsultasikan dengan apoteker atau dokter.'
];

// ---------------------------------------------------------------------------
// Pola bantu
// ---------------------------------------------------------------------------

/** Kode bentuk sediaan dari satuan takaran (untuk `S.2.d.d.C.I` -> `c`). */
const BENTUK_DARI_SATUAN = {
  tablet: 'tab',
  kapsul: 'caps',
  ml: 'syr',
  tetes: 'gtt',
  'sendok teh': 'cth',
  supositoria: 'supp',
  salep: 'ung',
  suntikan: 'inj'
};

/** Nama hari/bulan untuk mengenali baris tanggal. */
const NAMA_BULAN = 'januari|februari|pebruari|september|november|desember|oktober|agustus|maret|april|juni|juli|mei'
  + '|jan|feb|peb|sept|sep|okt|oct|agu|agt|aug|mar|apr|jun|jul|nov|des|dec';
const NAMA_HARI = 'senin|selasa|rabu|kamis|jumat|jum\'at|sabtu|minggu';

const POLA_TANGGAL_SAJA = new RegExp(
  `^(?:(?:${NAMA_HARI})[,\\s]+)?(?:`
  + '\\d{1,2}[\\/.-]\\d{1,2}[\\/.-]\\d{2,4}'
  + '|\\d{4}-\\d{2}-\\d{2}'
  + `|\\d{1,2}\\s+(?:${NAMA_BULAN})\\s+\\d{2,4}`
  + `|(?:${NAMA_BULAN})\\s+\\d{1,2},?\\s+\\d{4}`
  + ')(?:\\s+\\d{1,2}[:.]\\d{2})?$',
  'i'
);

const POLA_HEADER = /^(?:resep|signa|sign\s*a|s|r\s*[\/.]?|obat|terapi)[.:]?\s*$/i;
const POLA_IDENTITAS =
  /^(?:nama(?:\s+pasien)?|pasien|umur|usia|alamat|nik|telp|telepon|hp|dokter|dpjp|sip|tempat(?:\s+lahir)?|tgl|tanggal)\b/i;
const POLA_IDENTITAS_RM =
  /^(?:no\.?\s*(?:rm|rekam\s+medis)|nomor\s+(?:rm|rekam\s+medis)|mrn)\b/i;
const POLA_DOKTER = /^dr\.?\s/i;
const POLA_LEMBAGA =
  /^(?:rsu|rsud|rsia|rsb|rs|rumah\s+sakit|klinik|puskesmas|apotek|laboratorium|lab)\b/i;
const POLA_ALAMAT =
  /^(?:jl\.?|jalan|gg\.?|gang|rt\s*\/?\s*rw|kel\.?|kelurahan|kec\.?|kecamatan|kab\.?|kabupaten|kota|provinsi)\b/i;

/** Seluruh token bentuk sediaan (untuk memotong nama & masker fragmen). */
const POLA_BENTUK_G =
  /\b(?:tab|tbl|tablet|caps|cap|kapsul|syr|sirup|cth|sendok\s+teh|gtt|tetes|supp|supositoria|ung|salep|inj|suntikan)\b/gi;

/** Kekuatan dengan satuan; dipakai untuk memotong nama dan masker fragmen. */
const POLA_KEKUATAN_G =
  /(\d+(?:[.,]\d+)?|[0-9]+\s*\/\s*[0-9]+)\s*(mcg|μg|µg|ug|mg|g|ml|%)(?![a-z])/gi;

/** Aturan makan/waktu (teks sudah dinormalisasi). */
const POLA_ATURAN = [
  /\bpc\b/g,
  /\bsesudah\s+makan\b/g,
  /\bsetelah\s+makan\b/g,
  /\bac\b/g,
  /\bsebelum\s+makan\b/g,
  /\bdc\b/g,
  /\bsaat\s+makan\b/g,
  /\bbersama\s+makan\b/g,
  /\bprn\b/g,
  /\bkp\b/g,
  /\bbila\s+perlu\b/g,
  /\bhs\b/g,
  /\bsebelum\s+tidur\b/g,
  /\bmane\b/g,
  /\bpagi\b/g,
  /\bnocte\b/g,
  /\bmalam\b/g
];

/** Penanda potong nama yang tidak menghasilkan kolom sendiri. */
const POLA_PENANDA_NAMA = [/\bselama\b/g, /\b\d+\s*minggu\b/g];

// ---------------------------------------------------------------------------
// Utilitas teks
// ---------------------------------------------------------------------------

/** Bulatkan ke 2 desimal (dipakai kepercayaan & jumlah). */
function bulat2(nilai) {
  return Math.round((nilai + Number.EPSILON) * 100) / 100;
}

/** Baris yang jelas bukan baris obat (header/tanggal/identitas/alamat). */
function barisNonObat(baris) {
  const teks = String(baris ?? '').trim();
  if (teks === '') return true;
  if (!/[0-9a-z]/i.test(teks)) return true;
  if (POLA_HEADER.test(teks)) return true;
  if (POLA_TANGGAL_SAJA.test(teks)) return true;
  if (POLA_IDENTITAS.test(teks)) return true;
  if (POLA_IDENTITAS_RM.test(teks)) return true;
  if (POLA_DOKTER.test(teks)) return true;
  if (POLA_LEMBAGA.test(teks)) return true;
  if (POLA_ALAMAT.test(teks)) return true;
  return false;
}

/** Daftar token beserta posisi karakter aslinya. */
function tokenDenganPosisi(teks) {
  const hasil = [];
  const pola = /\S+/g;
  let cocok;
  while ((cocok = pola.exec(teks)) !== null) {
    hasil.push({
      teks: cocok[0],
      start: cocok.index,
      end: cocok.index + cocok[0].length
    });
  }
  return hasil;
}

/** Indeks token yang memuat/mengawali posisi karakter tertentu. */
function indeksTokenPada(tokens, posisi) {
  for (let i = 0; i < tokens.length; i += 1) {
    if (posisi < tokens[i].end) return i;
  }
  return tokens.length;
}

/** Semua kecocokan sebuah pola (pola sumber harus bermode global). */
function semuaKecocokan(pola, teks) {
  const flags = pola.flags.includes('g') ? pola.flags : `${pola.flags}g`;
  const ulang = new RegExp(pola.source, flags);
  const hasil = [];
  let cocok;
  while ((cocok = ulang.exec(teks)) !== null) {
    if (cocok[0] === '') {
      ulang.lastIndex += 1;
      continue;
    }
    hasil.push({ index: cocok.index, panjang: cocok[0].length });
  }
  return hasil;
}

/** Bersihkan nama obat: buang penanda resep, nomor urut, dan tanda baca ujung. */
function bersihkanNama(teks) {
  let nama = String(teks ?? '').trim();
  nama = nama.replace(/^(?:obat|terapi)\s*:\s*/i, '');
  nama = nama.replace(/^r\s*[\/.]\s*/i, '');
  nama = nama.replace(/^(?:signa|s)\b\.?\s*/i, '');
  nama = nama.replace(/^\d+\s*[.)]\s*/, '');
  nama = nama.replace(/^[\s.,;:!?()[\]{}'"“”‘’–—-]+/, '');
  nama = nama.replace(/[\s.,;:!?()[\]{}'"“”‘’–—-]+$/, '');
  return nama.replace(/\s+/g, ' ').trim();
}

/** Token di awal baris yang bukan bagian nama obat (penanda/bentuk/nomor). */
const KATA_AWAL_BUKAN_NAMA = new Set([
  'r/', 'r.', 'signa', 's',
  'tab', 'tbl', 'tablet', 'caps', 'cap', 'kapsul', 'syr', 'sirup',
  'cth', 'gtt', 'tetes', 'supp', 'supositoria', 'ung', 'salep', 'inj', 'suntikan'
]);

/** Apakah token di awal baris bukan bagian nama obat? */
function tokenAwalBukanNama(teks) {
  const token = String(teks).toLowerCase();
  if (KATA_AWAL_BUKAN_NAMA.has(token)) return true;
  if (/^\d+[.)]$/.test(token)) return true; // nomor urut "1."
  return false;
}

/** Salin hanya empat bidang kontrak dari BENTUK_SEDIAAN. */
function bersihBentuk(bentuk) {
  if (!bentuk) return null;
  return {
    kode: bentuk.kode,
    label: bentuk.label,
    satuan: bentuk.satuan,
    satuanLabel: bentuk.satuanLabel
  };
}

/** Bentuk sediaan dari satuan takaran yang diturunkan pola (`c` -> kapsul). */
function bentukDariSatuan(satuan) {
  const kode = BENTUK_DARI_SATUAN[satuan];
  if (!kode || !BENTUK_SEDIAAN[kode]) return null;
  return bersihBentuk(BENTUK_SEDIAAN[kode]);
}

/** Fragmen teks yang tidak tercakup kolom mana pun, dikelompokkan per frasa. */
function cariFragmen(tokens, terpakai) {
  const hasil = [];
  let kelompok = [];

  const dorong = () => {
    if (kelompok.length === 0) return;
    let frasa = kelompok.join(' ').trim();
    frasa = frasa.replace(/^[\s.,;:!?()[\]{}'"“”‘’–—-]+/, '');
    frasa = frasa.replace(/[\s.,;:!?()[\]{}'"“”‘’–—-]+$/, '');
    if (frasa !== '' && /[0-9a-z]/i.test(frasa) && !hasil.includes(frasa)) {
      hasil.push(frasa);
    }
    kelompok = [];
  };

  for (let i = 0; i < tokens.length; i += 1) {
    if (terpakai.has(i)) {
      dorong();
    } else {
      kelompok.push(tokens[i].teks);
    }
  }
  dorong();
  return hasil;
}

// ---------------------------------------------------------------------------
// Inti penerjemah baris
// ---------------------------------------------------------------------------

/**
 * Urai satu baris resep menjadi obat + metadata internal.
 * Metadata dipakai `kenaliResep` untuk menggabungkan baris lanjutan.
 */
function uraiBaris(baris, indeks) {
  const teksMentah = String(baris ?? '').trim();
  if (barisNonObat(teksMentah)) return null;

  const norm = normalisasiResep(teksMentah);
  if (norm === '') return null;

  const adaRPrefix = /^r\s*[\/.]/.test(norm);
  const freq = parseFrekuensi(norm);
  const aturan = parseAturanMakan(norm);
  const kekuatan = parseKekuatan(norm);
  const durasiInfo = parseDurasi(norm);

  const satuanFrekuensi = freq && freq.satuanTakaran ? freq.satuanTakaran : null;
  let bentuk = bersihBentuk(parseBentukSediaan(norm));
  // `S.2.d.d.C.I` hanya menulis `c`; satuan `kapsul` adalah bukti bentuk.
  if (!bentuk && satuanFrekuensi && satuanFrekuensi !== 'tablet') {
    bentuk = bentukDariSatuan(satuanFrekuensi);
  }
  // Teks rapat seperti `3dd1tab` tidak tertangkap batas kata; bentuknya
  // masih terbaca dari token di ujung pola frekuensi.
  if (!bentuk && freq && satuanFrekuensi === 'tablet'
    && /(?:tab|tbl|tablet)$/.test(String(freq.teksAsli || '').trim())) {
    bentuk = bentukDariSatuan('tablet');
  }

  const satuanTakaran = satuanFrekuensi || (bentuk ? bentuk.satuan : null);
  const jumlahInfo = parseJumlah(norm, satuanTakaran);

  // Baris tanpa huruf hanya bermakna bila memuat pola dosis (`1-0-1`) atau
  // jumlah (`#20`); angka telanjang seperti `12345` bukan baris obat.
  if (!/[a-z]/.test(norm) && !freq && !jumlahInfo) return null;

  // ------------------------------------------------------------------
  // Nama = teks sebelum penanda pertama. Posisi dihitung pada teks
  // ternormalisasi, lalu token asli dipakai agar kapitalisasi terjaga.
  // ------------------------------------------------------------------
  const tokenNorm = tokenDenganPosisi(norm);
  const tokenAsli = tokenDenganPosisi(teksMentah);
  const penanda = [];

  if (freq) {
    const posisi = norm.indexOf(freq.teksAsli);
    if (posisi >= 0) penanda.push(posisi);
  }
  for (const cocok of semuaKecocokan(POLA_BENTUK_G, norm)) penanda.push(cocok.index);
  for (const cocok of semuaKecocokan(POLA_KEKUATAN_G, norm)) penanda.push(cocok.index);
  for (const pola of POLA_ATURAN) {
    for (const cocok of semuaKecocokan(pola, norm)) penanda.push(cocok.index);
  }
  if (durasiInfo) {
    const posisi = norm.indexOf(durasiInfo.teksAsli);
    if (posisi >= 0) penanda.push(posisi);
  }
  if (jumlahInfo) {
    const posisi = norm.indexOf(jumlahInfo.teksAsli);
    if (posisi >= 0) penanda.push(posisi);
  }
  for (const pola of POLA_PENANDA_NAMA) {
    for (const cocok of semuaKecocokan(pola, norm)) penanda.push(cocok.index);
  }

  // Bentuk/nomor/`R/` yang menempel di awal bukan bagian nama
  // (mis. `Sirup Paracetamol ...` -> nama `Paracetamol`). Token yang sudah
  // tercakup pola frekuensi (mis. `s` pada `S 3 dd tab I`) tidak dilewati.
  const posisiFrekuensi = freq ? norm.indexOf(freq.teksAsli) : -1;
  const akhirFrekuensi = posisiFrekuensi >= 0
    ? posisiFrekuensi + freq.teksAsli.length
    : -1;
  let mulaiNama = 0;
  while (mulaiNama < tokenNorm.length) {
    const token = tokenNorm[mulaiNama];
    if (posisiFrekuensi >= 0 && token.start < akhirFrekuensi && token.end > posisiFrekuensi) {
      break;
    }
    if (!tokenAwalBukanNama(token.teks)) break;
    mulaiNama += 1;
  }
  if (mulaiNama >= tokenNorm.length) mulaiNama = tokenNorm.length;

  const posisiMulaiNama = mulaiNama < tokenNorm.length
    ? tokenNorm[mulaiNama].start
    : norm.length;
  const penandaSetelahNama = penanda.filter((posisi) => posisi >= posisiMulaiNama);
  const posisiPenanda = penandaSetelahNama.length > 0
    ? Math.min(...penandaSetelahNama)
    : norm.length;
  let indeksPenanda = Math.max(mulaiNama, indeksTokenPada(tokenNorm, posisiPenanda));
  if (indeksPenanda > tokenAsli.length) indeksPenanda = tokenAsli.length;

  const namaKasar = tokenAsli
    .slice(mulaiNama, indeksPenanda)
    .map((token) => token.teks)
    .join(' ');
  const namaBersih = bersihkanNama(namaKasar);
  const namaKosong = namaBersih === '';
  const nama = namaKosong ? `Obat ${indeks + 1}` : namaBersih;

  // ------------------------------------------------------------------
  // Catatan & fragmen tak dikenali.
  // ------------------------------------------------------------------
  const bagian = [];
  const tambahCatatan = (daftar) => {
    if (!Array.isArray(daftar)) return;
    for (const catatan of daftar) {
      if (typeof catatan === 'string' && catatan !== '' && !bagian.includes(catatan)) {
        bagian.push(catatan);
      }
    }
  };

  tambahCatatan(freq && freq.catatan);
  tambahCatatan(aturan && aturan.catatan);
  if (namaKosong) bagian.push('nama obat tidak dikenali');
  if (!freq || freq.kaliSehari == null) bagian.push('frekuensi tidak dikenali');

  // Masker rentang yang sudah dikenali.
  const rentang = [];
  const tambahRentang = (posisi, panjang) => {
    if (Number.isFinite(posisi) && posisi >= 0 && Number.isFinite(panjang) && panjang > 0) {
      rentang.push([posisi, posisi + panjang]);
    }
  };
  if (freq) tambahRentang(norm.indexOf(freq.teksAsli), freq.teksAsli.length);
  for (const cocok of semuaKecocokan(POLA_BENTUK_G, norm)) {
    tambahRentang(cocok.index, cocok.panjang);
  }
  for (const cocok of semuaKecocokan(POLA_KEKUATAN_G, norm)) {
    tambahRentang(cocok.index, cocok.panjang);
  }
  for (const pola of POLA_ATURAN) {
    for (const cocok of semuaKecocokan(pola, norm)) tambahRentang(cocok.index, cocok.panjang);
  }
  if (durasiInfo) tambahRentang(norm.indexOf(durasiInfo.teksAsli), durasiInfo.teksAsli.length);
  if (jumlahInfo) tambahRentang(norm.indexOf(jumlahInfo.teksAsli), jumlahInfo.teksAsli.length);

  const terpakai = new Set();
  for (let i = 0; i < tokenNorm.length; i += 1) {
    if (i < indeksPenanda) terpakai.add(i);
    for (const [awal, akhir] of rentang) {
      if (tokenNorm[i].start < akhir && tokenNorm[i].end > awal) {
        terpakai.add(i);
        break;
      }
    }
  }
  tambahCatatan(cariFragmen(tokenNorm, terpakai));

  // ------------------------------------------------------------------
  // Jadwal & waktu minum.
  // ------------------------------------------------------------------
  const polaHarian = freq && Array.isArray(freq.polaHarian) ? [...freq.polaHarian] : null;
  const kaliSehari = freq ? freq.kaliSehari : null;
  const takaranPerDosis = freq ? freq.takaranPerDosis : null;
  const aturanMakan = aturan.aturanMakan || null;
  const durasiHari = durasiInfo ? durasiInfo.hari : null;

  const labelAturan = Array.isArray(aturan.waktuMinum) ? aturan.waktuMinum : [];
  const jadwalJam = jadwalUntukObat({
    aturanMakan,
    polaHarian,
    kaliSehari,
    waktuMinum: labelAturan
  });
  // Label eksplisit (`hs`/`mane`/`nocte`) menang; bila tidak ada, turunkan
  // label dari jadwal jam bawaan.
  const labelDariJam = labelAturan.length > 0 ? [] : waktuMinumDariJam(jadwalJam);
  const kumpulanWaktu = new Set([...labelAturan, ...labelDariJam]);
  const waktuMinum = WAKTU_LABEL_ORDER.filter((label) => kumpulanWaktu.has(label));

  // ------------------------------------------------------------------
  // Jumlah total: utamakan `No.`/`#` yang tertulis; bila tidak ada,
  // hitung dari frekuensi x takaran x durasi (aritmetika, bukan tebakan dosis).
  // ------------------------------------------------------------------
  let jumlahTotal = null;
  if (jumlahInfo) {
    jumlahTotal = {
      jumlah: jumlahInfo.jumlah,
      satuan: satuanTakaran || (bentuk ? bentuk.satuan : null)
    };
  } else if (
    durasiHari !== null
    && kaliSehari !== null
    && takaranPerDosis !== null
    && aturanMakan !== 'bila-perlu'
  ) {
    const faktorSendok = bentuk && bentuk.kode === 'cth' ? 5 : 1;
    const total = kaliSehari * takaranPerDosis * durasiHari * faktorSendok;
    if (Number.isFinite(total) && total > 0) {
      jumlahTotal = {
        jumlah: bulat2(total),
        satuan: faktorSendok === 5
          ? 'ml'
          : (satuanTakaran || (bentuk ? bentuk.satuan : null))
      };
    }
  }

  // ------------------------------------------------------------------
  // Pagar kewajaran (keselamatan): OCR yang menggabungkan huruf bisa menghasilkan angka
  // absurd (mis. `S3ddtablp.c.` -> 100 tablet). Angka tak wajar TIDAK boleh tampil sebagai fakta.
  // ------------------------------------------------------------------
  const bentukKode = bentuk ? bentuk.kode : null;
  const bentukPadat = bentukKode === 'tab' || bentukKode === 'caps'
    || satuanTakaran === 'tablet' || satuanTakaran === 'kapsul';
  const batasTakaran = bentukPadat ? 4 : 10;
  const takaranTakWajar = takaranPerDosis !== null && takaranPerDosis > batasTakaran;
  const frekuensiTakWajar = kaliSehari !== null && kaliSehari > 8;
  if (takaranTakWajar) bagian.push(`takaran tidak wajar: ${takaranPerDosis} per dosis`);
  if (frekuensiTakWajar) bagian.push(`frekuensi tidak wajar: ${kaliSehari} kali sehari`);

  // ------------------------------------------------------------------
  // Susun ObatTerjemahan (bentuk persis kontrak).
  // ------------------------------------------------------------------
  const obat = {
    nama,
    kekuatan,
    bentukSediaan: bentuk,
    kaliSehari,
    takaranPerDosis,
    satuanTakaran,
    waktuMinum,
    aturanMakan,
    durasiHari,
    jumlahTotal,
    jadwalJam,
    polaHarian,
    teksAsli: teksMentah,
    teksTerjemahan: '',
    kepercayaan: 0,
    bagianTidakDipahami: bagian
  };

  obat.teksTerjemahan = frasaTerjemahan(obat);
  if (takaranTakWajar || frekuensiTakWajar) {
    const apa = takaranTakWajar ? `${takaranPerDosis} per dosis` : `${kaliSehari} kali sehari`;
    obat.teksTerjemahan = `Hasil bacaan tidak wajar (${apa}). Jangan dipakai: periksa foto resep dan tanyakan ke apoteker atau dokter.`;
  }

  let kepercayaan = 1;
  if (kaliSehari === null) kepercayaan -= 0.30;
  if (bentuk === null) kepercayaan -= 0.15;
  if (takaranPerDosis === null) kepercayaan -= 0.10;
  if (aturanMakan === null) kepercayaan -= 0.05;
  kepercayaan -= 0.10 * Math.min(bagian.length, 2);
  if (takaranTakWajar || frekuensiTakWajar) kepercayaan = Math.min(kepercayaan, 0.3);
  obat.kepercayaan = bulat2(Math.max(0, Math.min(1, kepercayaan)));

  return {
    obat,
    namaKosong,
    // Baris dosis tanpa nama (mis. `3 dd 1 tab`) adalah lanjutan obat sebelumnya.
    kontinu: !adaRPrefix && namaKosong
  };
}

// ---------------------------------------------------------------------------
// API publik
// ---------------------------------------------------------------------------

/**
 * Terjemahkan satu baris resep.
 *
 * @param {string} baris
 * @param {{indeks?:number}} [options]
 * @returns {object|null} `ObatTerjemahan` atau `null` untuk baris non-obat
 */
export function terjemahkanBaris(baris, { indeks = 0 } = {}) {
  const nomor = Number.isInteger(indeks) && indeks >= 0 ? indeks : 0;
  const hasil = uraiBaris(baris, nomor);
  return hasil ? hasil.obat : null;
}

/**
 * Kenali seluruh teks resep (boleh multi-baris) menjadi daftar obat.
 *
 * @param {string} teks
 * @param {{maxObat?:number, now?:Date}} [options]
 * @returns {{
 *   obat: object[],
 *   teksAsli: string,
 *   kepercayaan: number,
 *   bagianTidakDipahami: string[],
 *   peringatan: string[],
 *   parserVersion: string,
 *   isMedicalAdvice: false
 * }}
 */
export function kenaliResep(teks, { maxObat = 30, now = new Date() } = {}) {
  void now; // hanya `obatKeMedication` yang memakai `now`

  const teksAsli = teks === null || teks === undefined ? '' : String(teks);
  const batas = Number.isInteger(maxObat) && maxObat >= 0 ? maxObat : 30;

  const obat = [];
  const catatanProses = [];

  for (const barisMentah of teksAsli.split(/\r?\n/)) {
    const baris = barisMentah.trim();
    if (baris === '') continue;
    if (barisNonObat(baris)) continue;

    const urai = uraiBaris(baris, obat.length);
    if (!urai) continue;

    if (urai.kontinu && obat.length > 0) {
      // Gabungkan baris lanjutan (dimulai `s`/`signa` atau berisi dosis saja)
      // ke obat sebelumnya, lalu terjemahkan ulang teks gabungan.
      const sebelumnya = obat[obat.length - 1];
      const gabung = `${sebelumnya.teksAsli} ${baris}`;
      const ulang = uraiBaris(gabung, obat.length - 1);
      if (ulang) obat[obat.length - 1] = ulang.obat;
      else catatanProses.push(`baris tidak diproses: ${baris}`);
      continue;
    }

    if (obat.length >= batas) {
      catatanProses.push(`baris tidak diproses: ${baris}`);
      continue;
    }

    obat.push(urai.obat);
  }

  const bagianTidakDipahami = [];
  const tambah = (daftar) => {
    if (!Array.isArray(daftar)) return;
    for (const catatan of daftar) {
      if (typeof catatan === 'string'
        && catatan !== ''
        && !bagianTidakDipahami.includes(catatan)) {
        bagianTidakDipahami.push(catatan);
      }
    }
  };
  for (const item of obat) tambah(item.bagianTidakDipahami);
  tambah(catatanProses);

  let kepercayaan = 0;
  if (obat.length > 0) {
    const total = obat.reduce((jumlah, item) => jumlah + item.kepercayaan, 0);
    kepercayaan = bulat2(total / obat.length);
  }

  return {
    obat,
    teksAsli,
    kepercayaan,
    bagianTidakDipahami,
    peringatan: [DISCLAIMERS.ocr, DISCLAIMERS.resep, ...PERINGATAN_RESEP],
    parserVersion: PARSER_RESEP_VERSION,
    isMedicalAdvice: false
  };
}
