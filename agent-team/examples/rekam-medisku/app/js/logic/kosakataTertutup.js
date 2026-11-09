/**
 * Kosakata jawaban tertutup untuk alur tanya obat satu per satu
 * (CONTRACT.md 8B.12.1).
 *
 * Murni dan deterministik: bebas DOM, model bahasa, jaringan, dan efek
 * samping. Hanya lima pertanyaan di bawah ini yang boleh dipakai alur tanya;
 * tidak ada pilihan "lain", "bebas", atau angka di luar daftar.
 */

/** Definisi lima pertanyaan tertutup, persis sesuai kontrak. */
export const PERTANYAAN_TANYA = {
  frekuensi: {
    id: 'frekuensi',
    tipe: 'pilihan',
    pertanyaan: 'Berapa kali sehari?',
    pilihan: [1, 2, 3, 4, 5, 6, 7, 8],
    label: {
      1: '1 kali',
      2: '2 kali',
      3: '3 kali',
      4: '4 kali',
      5: '5 kali',
      6: '6 kali',
      7: '7 kali',
      8: '8 kali'
    },
    sinonim: {
      1: ['sekali', 'satu kali', '1 kali', 'sehari sekali', 'sekali sehari'],
      2: ['dua kali', '2 kali', 'dua kali sehari', 'dua kalisahari', 'duakali'],
      3: ['tiga kali', '3 kali', 'tiga kali sehari'],
      4: ['empat kali', '4 kali', 'empat kali sehari'],
      5: ['lima kali', '5 kali', 'lima kali sehari'],
      6: ['enam kali', '6 kali', 'enam kali sehari'],
      7: ['tujuh kali', '7 kali', 'tujuh kali sehari'],
      8: ['delapan kali', '8 kali', 'delapan kali sehari']
    }
  },
  takaran: {
    id: 'takaran',
    tipe: 'pilihan',
    pertanyaan: 'Berapa tablet sekali minum?',
    pilihan: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
    label: {
      0.5: 'setengah tablet',
      1: 'satu tablet',
      1.5: 'satu setengah tablet',
      2: 'dua tablet',
      2.5: 'dua setengah tablet',
      3: 'tiga tablet',
      3.5: 'tiga setengah tablet',
      4: 'empat tablet'
    },
    sinonim: {
      0.5: ['setengah', 'setengah tablet', 'separuh', '0,5 tablet', '0.5 tablet'],
      1: ['satu', 'satu tablet', '1 tablet', 'sebutir'],
      1.5: ['satu setengah', 'satu setengah tablet', '1,5 tablet', '1.5 tablet'],
      2: ['dua', 'dua tablet', '2 tablet'],
      2.5: ['dua setengah', 'dua setengah tablet', 'dua koma lima', '2,5 tablet', '2.5 tablet'],
      3: ['tiga', 'tiga tablet', '3 tablet'],
      3.5: ['tiga setengah', 'tiga setengah tablet', '3,5 tablet', '3.5 tablet'],
      4: ['empat', 'empat tablet', '4 tablet']
    }
  },
  aturanMakan: {
    id: 'aturanMakan',
    tipe: 'pilihan',
    pertanyaan: 'Sebelum, sesudah, atau saat makan?',
    pilihan: ['sebelum', 'sesudah', 'saat'],
    label: {
      sebelum: 'sebelum makan',
      sesudah: 'sesudah makan',
      saat: 'saat makan'
    },
    sinonim: {
      sebelum: ['sebelum', 'sebelum makan', 'sebelumnya', 'semelum', 'sebelom'],
      sesudah: ['sesudah', 'sesudah makan', 'setelah', 'setelah makan', 'habis makan'],
      saat: ['saat', 'saat makan', 'bersama makan', 'sambil makan', 'waktu makan']
    }
  },
  waktu: {
    id: 'waktu',
    tipe: 'multi',
    pertanyaan: 'Pagi, siang, sore, malam, atau sebelum tidur?',
    pilihan: ['pagi', 'siang', 'sore', 'malam', 'sebelum-tidur'],
    label: {
      pagi: 'pagi',
      siang: 'siang',
      sore: 'sore',
      malam: 'malam',
      'sebelum-tidur': 'sebelum tidur'
    },
    sinonim: {
      pagi: ['pagi', 'pagi hari', 'waktu pagi'],
      siang: ['siang', 'siang hari', 'tengah hari'],
      sore: ['sore', 'sore hari', 'petang'],
      malam: ['malam', 'malam hari'],
      'sebelum-tidur': ['sebelum tidur', 'sebelum bobo', 'sebelum istirahat', 'mau tidur']
    }
  },
  bilaPerlu: {
    id: 'bilaPerlu',
    tipe: 'ya-tidak',
    pertanyaan: 'Hanya kalau perlu?',
    pilihan: [true, false],
    label: {
      true: 'Ya, hanya kalau perlu',
      false: 'Tidak, rutin'
    },
    sinonim: {
      true: ['ya', 'iya', 'benar', 'betul', 'ya betul', 'ya benar', 'perlu', 'kalau perlu', 'bila perlu', 'jika perlu', 'hanya kalau perlu', 'cuma kalau perlu', 'prn'],
      false: ['tidak', 'nggak', 'enggak', 'gak', 'bukan', 'tidak betul', 'tidak benar', 'tidak perlu', 'tidak rutin', 'rutin', 'setiap hari']
    }
  }
};

/** Urutan langkah pertanyaan tertutup setelah nama obat. */
export const URUTAN_PERTANYAAN = ['frekuensi', 'takaran', 'aturanMakan', 'waktu', 'bilaPerlu'];

/** Cari nilai pilihan yang setara dengan `nilai` (angka/boolean/string). */
function cariNilai(def, nilai) {
  if (nilai === undefined || nilai === null) return { ada: false, nilai: null };
  for (const pilihan of def.pilihan) {
    if (pilihan === nilai) return { ada: true, nilai: pilihan };
    if (typeof pilihan === 'number' && typeof nilai !== 'boolean') {
      const angka = Number(String(nilai).trim().replace(',', '.'));
      if (Number.isFinite(angka) && angka === pilihan) return { ada: true, nilai: pilihan };
    }
    if (typeof pilihan === 'string' && typeof nilai === 'string' && pilihan === nilai.trim()) {
      return { ada: true, nilai: pilihan };
    }
    if (typeof pilihan === 'boolean' && typeof nilai === 'string') {
      const teks = nilai.trim().toLowerCase();
      if ((teks === 'true' && pilihan === true) || (teks === 'false' && pilihan === false)) {
        return { ada: true, nilai: pilihan };
      }
    }
  }
  return { ada: false, nilai: null };
}

/**
 * Definisi pertanyaan untuk `id`.
 *
 * @param {string} id
 * @returns {object|null} definisi atau `null` bila id tidak dikenal.
 */
export function pertanyaanUntuk(id) {
  if (typeof id !== 'string') return null;
  if (!Object.prototype.hasOwnProperty.call(PERTANYAAN_TANYA, id)) return null;
  return PERTANYAAN_TANYA[id];
}

/**
 * Daftar nilai valid untuk `id` (salinan, bukan referensi internal).
 *
 * @param {string} id
 * @returns {Array<number|string|boolean>}
 */
export function pilihanUntuk(id) {
  const def = pertanyaanUntuk(id);
  return def === null ? [] : def.pilihan.slice();
}

/**
 * Label Indonesia untuk sebuah nilai pilihan.
 *
 * @param {string} id
 * @param {number|string|boolean} nilai
 * @returns {string|null} label atau `null` bila id/nilai tidak valid.
 */
export function labelPilihan(id, nilai) {
  const def = pertanyaanUntuk(id);
  if (def === null) return null;
  const cocok = cariNilai(def, nilai);
  if (!cocok.ada) return null;
  const label = def.label[String(cocok.nilai)];
  return label === undefined ? null : label;
}

/**
 * Semua nilai valid untuk `id`; sama dengan `pilihanUntuk` dan disediakan
 * agar pemanggil tidak perlu tahu bentuk internal definisi.
 *
 * @param {string} id
 * @returns {Array<number|string|boolean>}
 */
export function semuaNilai(id) {
  return pilihanUntuk(id);
}
