/**
 * Pencocok jawaban fuzzy deterministik untuk kosakata tertutup
 * (CONTRACT.md 8B.12.2).
 *
 * Murni: tanpa DOM, timer, jaringan, model bahasa, ataupun keacakan.
 * Input yang sama selalu menghasilkan keluaran yang sama. Pencocok tidak
 * pernah "memaksa" jawaban: nilai keluaran selalu berasal dari pilihan
 * pertanyaan yang bersangkutan.
 */

import { parseAngkaDalamTeks } from './ucapanAngka.js';
import { PERTANYAAN_TANYA, URUTAN_PERTANYAAN } from './kosakataTertutup.js';

/** Ambang skor minimum agar sebuah kandidat dianggap cocok. */
export const AMBANG_COCOK = 0.72;

/** Selisih skor minimum antara kandidat teratas dan kedua agar tidak ambigu. */
export const MARGIN_AMBIGU = 0.08;

/**
 * Penanda kata yang khas untuk tiap pertanyaan. Dipakai hanya untuk menolak
 * jawaban yang jelas-jelas milik pertanyaan lain (larangan memaksa, aturan 7).
 */
const PENANDA = {
  frekuensi: ['kali', 'sehari', 'kalisahari', 'hari', 'duakali'],
  takaran: ['tablet', 'butir', 'kapsul', 'setengah', 'separuh', 'seperempat', 'sebutir'],
  aturanMakan: [
    'makan', 'sebelum', 'sesudah', 'setelah', 'saat', 'habis',
    'bersama', 'sambil', 'sebelumnya', 'semelum', 'sebelom'
  ],
  waktu: ['pagi', 'siang', 'sore', 'malam', 'petang', 'tidur', 'bobo', 'istirahat', 'tengah'],
  bilaPerlu: [
    'ya', 'iya', 'benar', 'perlu', 'prn', 'tidak', 'nggak', 'enggak', 'gak', 'rutin'
  ]
};

/**
 * Normalisasi jawaban: NFKC, huruf kecil, buang tanda baca, rapikan spasi.
 *
 * @param {string} teks
 * @returns {string}
 */
export function normalisasiJawaban(teks) {
  if (typeof teks === 'number' || typeof teks === 'boolean') {
    return String(teks).toLowerCase();
  }
  if (typeof teks !== 'string' || teks === '') return '';
  return teks
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Jarak edit Levenshtein antara dua string (bilangan bulat).
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function jarakEdit(a, b) {
  const kiri = typeof a === 'string' ? a : '';
  const kanan = typeof b === 'string' ? b : '';
  if (kiri === kanan) return 0;
  if (kiri.length === 0) return kanan.length;
  if (kanan.length === 0) return kiri.length;

  let sebelumnya = new Array(kanan.length + 1);
  let sekarang = new Array(kanan.length + 1);
  for (let j = 0; j <= kanan.length; j += 1) sebelumnya[j] = j;

  for (let i = 1; i <= kiri.length; i += 1) {
    sekarang[0] = i;
    for (let j = 1; j <= kanan.length; j += 1) {
      const biaya = kiri[i - 1] === kanan[j - 1] ? 0 : 1;
      sekarang[j] = Math.min(
        sebelumnya[j] + 1,
        sekarang[j - 1] + 1,
        sebelumnya[j - 1] + biaya
      );
    }
    const tukar = sebelumnya;
    sebelumnya = sekarang;
    sekarang = tukar;
  }
  return sebelumnya[kanan.length];
}

/**
 * Kode fonetis sederhana untuk bahasa Indonesia:
 * lowercase, buang non-huruf/angka, `ph→f`, `v→f`, `sy→s`, `kh→k`,
 * `dj→j`, `tj→c`, `oe→u`, lalu hapus spasi dan huruf kembar.
 *
 * @param {string} teks
 * @returns {string}
 */
export function kodeFonetis(teks) {
  let kode = normalisasiJawaban(teks).replace(/[^a-z0-9]/g, '');
  kode = kode
    .replace(/ph/g, 'f')
    .replace(/v/g, 'f')
    .replace(/sy/g, 's')
    .replace(/kh/g, 'k')
    .replace(/dj/g, 'j')
    .replace(/tj/g, 'c')
    .replace(/oe/g, 'u');
  return kode.replace(/(.)\1+/g, '$1');
}

/**
 * Skor kemiripan 0..1: nilai terbaik antara kemiripan edit dan fonetis.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function skorKemiripan(a, b) {
  const kiri = normalisasiJawaban(a);
  const kanan = normalisasiJawaban(b);
  if (kiri === '' || kanan === '') return 0;

  const panjang = Math.max(kiri.length, kanan.length);
  const skorEdit = 1 - jarakEdit(kiri, kanan) / panjang;

  const fonKiri = kodeFonetis(kiri);
  const fonKanan = kodeFonetis(kanan);
  let skorFon = 0;
  if (fonKiri !== '' && fonKanan !== '') {
    const panjangFon = Math.max(fonKiri.length, fonKanan.length);
    skorFon = 1 - jarakEdit(fonKiri, fonKanan) / panjangFon;
  }

  return Math.max(0, Math.min(1, Math.max(skorEdit, skorFon)));
}

/** Apakah `teks` ternormalisasi sama dengan salah satu teks kandidat nilai. */
function samakanDaftar(normal, daftar) {
  return daftar.some((teks) => normalisasiJawaban(teks) === normal);
}

/** Semua teks (sinonim + label) untuk satu nilai pilihan. */
function teksNilai(def, nilai) {
  const kunci = String(nilai);
  const sinonim = Array.isArray(def.sinonim[kunci]) ? def.sinonim[kunci] : [];
  const label = typeof def.label[kunci] === 'string' ? [def.label[kunci]] : [];
  const hasil = [];
  for (const teks of [...sinonim, ...label]) {
    if (typeof teks === 'string' && !hasil.includes(teks)) hasil.push(teks);
  }
  return hasil;
}

/** Apakah `normal` persis sama dengan sinonim/label pertanyaan lain. */
function persisPertanyaanLain(normal, pertanyaanId) {
  for (const id of URUTAN_PERTANYAAN) {
    if (id === pertanyaanId) continue;
    const def = PERTANYAAN_TANYA[id];
    for (const nilai of def.pilihan) {
      if (samakanDaftar(normal, teksNilai(def, nilai))) return true;
    }
  }
  return false;
}

/** Penanda yang muncul sebagai kata utuh (atau frasa) di teks normal. */
function punyaPenanda(normal, penanda) {
  if (penanda.includes(' ')) return normal.includes(penanda);
  const pola = new RegExp(`(^|[^a-z0-9])${penanda}([^a-z0-9]|$)`);
  return pola.test(normal);
}

/** Jawaban memakai penanda eksklusif pertanyaan lain tanpa penanda sendiri. */
function milikPertanyaanLain(normal, pertanyaanId) {
  const sendiri = (PENANDA[pertanyaanId] || []).some((p) => punyaPenanda(normal, p));
  if (sendiri) return false;
  for (const id of URUTAN_PERTANYAAN) {
    if (id === pertanyaanId) continue;
    if ((PENANDA[id] || []).some((p) => punyaPenanda(normal, p))) return true;
  }
  return false;
}

/** Angka ternormalisasi di dalam teks, tanpa merusak pemisah desimal. */
function angkaDalamJawaban(teks) {
  const dasar = String(teks)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[–—−]/g, '-');
  return parseAngkaDalamTeks(dasar);
}

/** Apakah frasa angka menutupi seluruh jawaban (mis. `'dua'`, `'1,5'`). */
function angkaMurni(teks, hasilAngka) {
  if (hasilAngka === null) return false;
  return normalisasiJawaban(hasilAngka.teksAsli) === normalisasiJawaban(teks);
}

/** Kata pengisi wajar di sekitar angka jawaban (mis. "dua kali sehari", "satu tablet"). */
const KATA_PENGISI_ANGKA = new Set([
  'kali', 'sehari', 'sekali', 'tablet', 'tab', 'butir', 'kapsul', 'x', 'per', 'hari', 'minum',
  'dalam', 'sebanyak', 'saja', 'ya', 'yang', 'dosis', 'tolong', 'kira-kira', 'sekitar'
]);

/**
 * Keselamatan: angka yang kebetulan ada di tengah kalimat ngawur (mis. potongan nama obat
 * "Moksi chili lima rato") TIDAK boleh diterima sebagai jawaban. Bila di luar frasa angka dan kata
 * pengisi masih ada dua kata asing atau lebih, jalur "angka eksplisit" tidak dipakai.
 */
function terlaluBanyakKataAsing(normal, hasilAngka) {
  const dalamAngka = new Set(normalisasiJawaban(hasilAngka.teksAsli).split(' '));
  const asing = normal.split(' ').filter(
    (t) => t !== '' && !dalamAngka.has(t) && !KATA_PENGISI_ANGKA.has(t) && !/^\d/.test(t)
  );
  return asing.length >= 2;
}

/** Susun kandidat { nilai, label, skor } dari teks ternormalisasi. */
function susunKandidat(def, normal) {
  const kandidat = [];
  for (const nilai of def.pilihan) {
    const kunci = String(nilai);
    let skor = 0;
    for (const teks of teksNilai(def, nilai)) {
      skor = Math.max(skor, skorKemiripan(normal, teks));
    }
    kandidat.push({
      nilai,
      label: typeof def.label[kunci] === 'string' ? def.label[kunci] : '',
      skor: Math.round(skor * 1e6) / 1e6
    });
  }
  kandidat.sort((a, b) => b.skor - a.skor);
  return kandidat;
}

/** Hasil tidak-cocok standar. */
function hasilTidakCocok(alasan, kandidat = []) {
  const pilihan = kandidat.filter((k) => k.skor > 0).slice(0, 3);
  return {
    status: 'tidak-cocok',
    nilai: null,
    pilihan,
    skor: pilihan.length > 0 ? pilihan[0].skor : 0,
    kandidat: pilihan,
    alasan
  };
}

/**
 * Cocokkan satu jawaban dengan pilihan satu pertanyaan.
 *
 * @param {string} teks
 * @param {string} pertanyaanId
 * @param {{ambang?: number, margin?: number}} [opsi]
 * @returns {{status: string, nilai: any, pilihan: Array, skor: number,
 *            kandidat: Array, alasan: string}}
 */
export function cocokkanJawaban(teks, pertanyaanId, {
  ambang = AMBANG_COCOK,
  margin = MARGIN_AMBIGU
} = {}) {
  const def = PERTANYAAN_TANYA[pertanyaanId];
  if (!def) return hasilTidakCocok('kosong');

  const normal = normalisasiJawaban(teks);
  if (normal === '') return hasilTidakCocok('kosong');

  // 2. Cocok persis dengan sinonim/label pertanyaan ini.
  let nilaiPersis = null;
  for (const nilai of def.pilihan) {
    if (samakanDaftar(normal, teksNilai(def, nilai))) {
      nilaiPersis = nilai;
      break;
    }
  }
  if (nilaiPersis !== null) {
    return {
      status: 'cocok',
      nilai: nilaiPersis,
      pilihan: [{
        nilai: nilaiPersis,
        label: typeof def.label[String(nilaiPersis)] === 'string'
          ? def.label[String(nilaiPersis)]
          : '',
        skor: 1
      }],
      skor: 1,
      kandidat: [{
        nilai: nilaiPersis,
        label: typeof def.label[String(nilaiPersis)] === 'string'
          ? def.label[String(nilaiPersis)]
          : '',
        skor: 1
      }],
      alasan: 'sinonim'
    };
  }

  const angka = angkaDalamJawaban(teks);
  const murniAngka = angkaMurni(teks, angka);

  // 7. Tolak jawaban yang jelas milik pertanyaan lain.
  if (!murniAngka && persisPertanyaanLain(normal, pertanyaanId)) {
    return hasilTidakCocok('di-bawah-ambang');
  }
  if (!murniAngka && milikPertanyaanLain(normal, pertanyaanId)) {
    return hasilTidakCocok('di-bawah-ambang');
  }

  // 3. Angka eksplisit untuk frekuensi/takaran.
  if ((pertanyaanId === 'frekuensi' || pertanyaanId === 'takaran') && angka !== null
      && !terlaluBanyakKataAsing(normal, angka)) {
    const nilaiAngka = def.pilihan.find((p) => p === angka.nilai);
    if (nilaiAngka !== undefined) {
      const label = typeof def.label[String(nilaiAngka)] === 'string'
        ? def.label[String(nilaiAngka)]
        : '';
      const kandidat = [{ nilai: nilaiAngka, label, skor: 1 }];
      return {
        status: 'cocok',
        nilai: nilaiAngka,
        pilihan: kandidat.slice(),
        skor: 1,
        kandidat,
        alasan: 'angka'
      };
    }
  }

  // 4-6. Kemiripan terhadap sinonim/label pertanyaan ini.
  const kandidat = susunKandidat(def, normal);
  const teratas = kandidat[0] || { nilai: null, label: '', skor: 0 };

  if (teratas.skor < ambang) {
    return hasilTidakCocok('di-bawah-ambang', kandidat);
  }

  const kedua = kandidat[1];
  if (kedua && kedua.nilai !== teratas.nilai && kedua.skor >= ambang &&
      teratas.skor - kedua.skor < margin) {
    const tampil = kandidat.filter((k) => k.skor > 0).slice(0, 3);
    return {
      status: 'ambigu',
      nilai: null,
      pilihan: tampil,
      skor: teratas.skor,
      kandidat: tampil,
      alasan: 'ambigu'
    };
  }

  const tampil = kandidat.filter((k) => k.skor > 0).slice(0, 3);
  return {
    status: 'cocok',
    nilai: teratas.nilai,
    pilihan: tampil,
    skor: teratas.skor,
    kandidat: tampil,
    alasan: 'kemiripan'
  };
}

/** Pecah jawaban multi pada `,`, `dan`, `serta`, `&`. */
function pecahPotongan(teks) {
  const dasar = String(teks).normalize('NFKC');
  return dasar
    .split(/\s*(?:,|&|\bdan\b|\bserta\b)\s*/i)
    .map((potongan) => potongan.trim())
    .filter((potongan) => normalisasiJawaban(potongan) !== '');
}

/** Gabungkan kandidat dari beberapa potongan; skor tertinggi menang. */
function gabungKandidat(daftarKandidat) {
  const peta = new Map();
  for (const kandidat of daftarKandidat) {
    for (const item of kandidat) {
      const kunci = String(item.nilai);
      const lama = peta.get(kunci);
      if (lama === undefined || item.skor > lama.skor) {
        peta.set(kunci, { nilai: item.nilai, label: item.label, skor: item.skor });
      }
    }
  }
  return [...peta.values()].sort((a, b) => b.skor - a.skor);
}

/**
 * Cocokkan jawaban multi (khusus pertanyaan `waktu`). Setiap potongan harus
 * cocok dengan nilai berbeda; hasil diurutkan sesuai urutan pilihan.
 *
 * @param {string} teks
 * @param {string} pertanyaanId
 * @param {{ambang?: number, margin?: number}} [opsi]
 * @returns {{status: string, nilai: any, pilihan: Array, skor: number,
 *            kandidat: Array, alasan: string}}
 */
export function cocokkanBanyak(teks, pertanyaanId, opsi = {}) {
  const def = PERTANYAAN_TANYA[pertanyaanId];
  if (!def) return hasilTidakCocok('kosong');

  const normal = normalisasiJawaban(teks);
  if (normal === '') return hasilTidakCocok('kosong');

  const potongan = pecahPotongan(teks);
  if (potongan.length === 0) return hasilTidakCocok('kosong');

  const hasilPotongan = potongan.map((bagian) => cocokkanJawaban(bagian, pertanyaanId, opsi));
  const semuaKandidat = gabungKandidat(hasilPotongan.map((hasil) => hasil.kandidat));

  const gagal = hasilPotongan.find((hasil) => hasil.status === 'tidak-cocok');
  if (gagal) return hasilTidakCocok(gagal.alasan, semuaKandidat);

  const ambigu = hasilPotongan.find((hasil) => hasil.status === 'ambigu');
  if (ambigu) {
    const tampil = semuaKandidat.slice(0, 3);
    return {
      status: 'ambigu',
      nilai: null,
      pilihan: tampil,
      skor: ambigu.skor,
      kandidat: tampil,
      alasan: 'ambigu'
    };
  }

  const nilai = hasilPotongan.map((hasil) => hasil.nilai);
  const unik = new Set(nilai);
  if (unik.size !== nilai.length) {
    // Potongan yang sama dua kali bukan jawaban multi yang sah.
    return hasilTidakCocok('di-bawah-ambang', semuaKandidat);
  }

  const urut = def.pilihan.slice();
  nilai.sort((a, b) => urut.indexOf(a) - urut.indexOf(b));

  let alasan = 'sinonim';
  if (hasilPotongan.some((hasil) => hasil.alasan === 'kemiripan')) {
    alasan = 'kemiripan';
  } else if (hasilPotongan.some((hasil) => hasil.alasan === 'angka')) {
    alasan = 'angka';
  }

  const tampil = semuaKandidat.slice(0, 3);
  return {
    status: 'cocok',
    nilai,
    pilihan: tampil,
    skor: Math.min(...hasilPotongan.map((hasil) => hasil.skor)),
    kandidat: tampil,
    alasan
  };
}
