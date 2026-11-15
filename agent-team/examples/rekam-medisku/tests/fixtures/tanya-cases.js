// Korpus jawaban realistis untuk alur tanya obat satu per satu (CONTRACT 8B.12.3).
//
// Setiap kasus: { id, pertanyaan, ucapan, harapan: { status, nilai } }.
// `pertanyaan` adalah id kosakata tertutup (frekuensi/takaran/aturanMakan/
// waktu/bilaPerlu). Korpus sengaja memuat varian salah dengar Whisper,
// kasus negatif lintas-pertanyaan, dan kasus ambigu.
//
// Berkas ini murni data (tanpa impor) agar aman diimpor test mana pun.

export const TANYA_CASES = [
  // ------------------------------------------------------------------
  // frekuensi (16)
  // ------------------------------------------------------------------
  { id: 'f01', pertanyaan: 'frekuensi', ucapan: 'sekali sehari', harapan: { status: 'cocok', nilai: 1 } },
  { id: 'f02', pertanyaan: 'frekuensi', ucapan: 'satu kali', harapan: { status: 'cocok', nilai: 1 } },
  { id: 'f03', pertanyaan: 'frekuensi', ucapan: '2 kali', harapan: { status: 'cocok', nilai: 2 } },
  { id: 'f04', pertanyaan: 'frekuensi', ucapan: 'dua kali sehari', harapan: { status: 'cocok', nilai: 2 } },
  { id: 'f05', pertanyaan: 'frekuensi', ucapan: 'Dua Kalisahari', harapan: { status: 'cocok', nilai: 2 } },
  { id: 'f06', pertanyaan: 'frekuensi', ucapan: 'duakali', harapan: { status: 'cocok', nilai: 2 } },
  { id: 'f07', pertanyaan: 'frekuensi', ucapan: 'tiga kali sehari', harapan: { status: 'cocok', nilai: 3 } },
  { id: 'f08', pertanyaan: 'frekuensi', ucapan: '4 kali', harapan: { status: 'cocok', nilai: 4 } },
  { id: 'f09', pertanyaan: 'frekuensi', ucapan: 'lima kali', harapan: { status: 'cocok', nilai: 5 } },
  { id: 'f10', pertanyaan: 'frekuensi', ucapan: 'enam kali sehari', harapan: { status: 'cocok', nilai: 6 } },
  { id: 'f11', pertanyaan: 'frekuensi', ucapan: 'tujuh kali', harapan: { status: 'cocok', nilai: 7 } },
  { id: 'f12', pertanyaan: 'frekuensi', ucapan: '8 kali', harapan: { status: 'cocok', nilai: 8 } },
  { id: 'f13', pertanyaan: 'frekuensi', ucapan: 'delapan kali sehari', harapan: { status: 'cocok', nilai: 8 } },
  { id: 'f14', pertanyaan: 'frekuensi', ucapan: '3 kali sehari', harapan: { status: 'cocok', nilai: 3 } },
  { id: 'f15', pertanyaan: 'frekuensi', ucapan: 'kali sehari', harapan: { status: 'ambigu', nilai: null } },
  { id: 'f16', pertanyaan: 'frekuensi', ucapan: 'skali', harapan: { status: 'ambigu', nilai: null } },

  // ------------------------------------------------------------------
  // takaran (18)
  // ------------------------------------------------------------------
  { id: 't01', pertanyaan: 'takaran', ucapan: 'setengah', harapan: { status: 'cocok', nilai: 0.5 } },
  { id: 't02', pertanyaan: 'takaran', ucapan: 'setengah tablet', harapan: { status: 'cocok', nilai: 0.5 } },
  { id: 't03', pertanyaan: 'takaran', ucapan: 'separuh', harapan: { status: 'cocok', nilai: 0.5 } },
  { id: 't04', pertanyaan: 'takaran', ucapan: '0,5 tablet', harapan: { status: 'cocok', nilai: 0.5 } },
  { id: 't05', pertanyaan: 'takaran', ucapan: '1 tablet', harapan: { status: 'cocok', nilai: 1 } },
  { id: 't06', pertanyaan: 'takaran', ucapan: 'satu tablet', harapan: { status: 'cocok', nilai: 1 } },
  { id: 't07', pertanyaan: 'takaran', ucapan: 'sebutir', harapan: { status: 'cocok', nilai: 1 } },
  { id: 't08', pertanyaan: 'takaran', ucapan: 'satu setengah', harapan: { status: 'cocok', nilai: 1.5 } },
  { id: 't09', pertanyaan: 'takaran', ucapan: 'satu setengah tablet', harapan: { status: 'cocok', nilai: 1.5 } },
  { id: 't10', pertanyaan: 'takaran', ucapan: '1,5 tablet', harapan: { status: 'cocok', nilai: 1.5 } },
  { id: 't11', pertanyaan: 'takaran', ucapan: 'dua', harapan: { status: 'cocok', nilai: 2 } },
  { id: 't12', pertanyaan: 'takaran', ucapan: 'dua tablet', harapan: { status: 'cocok', nilai: 2 } },
  { id: 't13', pertanyaan: 'takaran', ucapan: 'dua setengah', harapan: { status: 'cocok', nilai: 2.5 } },
  { id: 't14', pertanyaan: 'takaran', ucapan: 'dua koma lima', harapan: { status: 'cocok', nilai: 2.5 } },
  { id: 't15', pertanyaan: 'takaran', ucapan: '2,5 tablet', harapan: { status: 'cocok', nilai: 2.5 } },
  { id: 't16', pertanyaan: 'takaran', ucapan: 'tiga tablet', harapan: { status: 'cocok', nilai: 3 } },
  { id: 't17', pertanyaan: 'takaran', ucapan: '3,5', harapan: { status: 'cocok', nilai: 3.5 } },
  { id: 't18', pertanyaan: 'takaran', ucapan: 'empat tablet', harapan: { status: 'cocok', nilai: 4 } },
  { id: 't19', pertanyaan: 'takaran', ucapan: '6 tablet', harapan: { status: 'ambigu', nilai: null } },
  { id: 't20', pertanyaan: 'takaran', ucapan: 'lima setengah', harapan: { status: 'ambigu', nilai: null } },

  // ------------------------------------------------------------------
  // aturanMakan (13)
  // ------------------------------------------------------------------
  { id: 'a01', pertanyaan: 'aturanMakan', ucapan: 'sebelum', harapan: { status: 'cocok', nilai: 'sebelum' } },
  { id: 'a02', pertanyaan: 'aturanMakan', ucapan: 'sebelum makan', harapan: { status: 'cocok', nilai: 'sebelum' } },
  { id: 'a03', pertanyaan: 'aturanMakan', ucapan: 'Semelum', harapan: { status: 'cocok', nilai: 'sebelum' } },
  { id: 'a04', pertanyaan: 'aturanMakan', ucapan: 'sebelom', harapan: { status: 'cocok', nilai: 'sebelum' } },
  { id: 'a05', pertanyaan: 'aturanMakan', ucapan: 'sesudah', harapan: { status: 'cocok', nilai: 'sesudah' } },
  { id: 'a06', pertanyaan: 'aturanMakan', ucapan: 'sesudah makan', harapan: { status: 'cocok', nilai: 'sesudah' } },
  { id: 'a07', pertanyaan: 'aturanMakan', ucapan: 'setelah', harapan: { status: 'cocok', nilai: 'sesudah' } },
  { id: 'a08', pertanyaan: 'aturanMakan', ucapan: 'setelah makan', harapan: { status: 'cocok', nilai: 'sesudah' } },
  { id: 'a09', pertanyaan: 'aturanMakan', ucapan: 'habis makan', harapan: { status: 'cocok', nilai: 'sesudah' } },
  { id: 'a10', pertanyaan: 'aturanMakan', ucapan: 'saat', harapan: { status: 'cocok', nilai: 'saat' } },
  { id: 'a11', pertanyaan: 'aturanMakan', ucapan: 'bersama makan', harapan: { status: 'cocok', nilai: 'saat' } },
  { id: 'a12', pertanyaan: 'aturanMakan', ucapan: 'sambil makan', harapan: { status: 'cocok', nilai: 'saat' } },
  { id: 'a13', pertanyaan: 'aturanMakan', ucapan: 'waktu makan', harapan: { status: 'cocok', nilai: 'saat' } },

  // ------------------------------------------------------------------
  // waktu (15)
  // ------------------------------------------------------------------
  { id: 'w01', pertanyaan: 'waktu', ucapan: 'pagi', harapan: { status: 'cocok', nilai: ['pagi'] } },
  { id: 'w02', pertanyaan: 'waktu', ucapan: 'pagi hari', harapan: { status: 'cocok', nilai: ['pagi'] } },
  { id: 'w03', pertanyaan: 'waktu', ucapan: 'siang', harapan: { status: 'cocok', nilai: ['siang'] } },
  { id: 'w04', pertanyaan: 'waktu', ucapan: 'tengah hari', harapan: { status: 'cocok', nilai: ['siang'] } },
  { id: 'w05', pertanyaan: 'waktu', ucapan: 'sore', harapan: { status: 'cocok', nilai: ['sore'] } },
  { id: 'w06', pertanyaan: 'waktu', ucapan: 'petang', harapan: { status: 'cocok', nilai: ['sore'] } },
  { id: 'w07', pertanyaan: 'waktu', ucapan: 'malam', harapan: { status: 'cocok', nilai: ['malam'] } },
  { id: 'w08', pertanyaan: 'waktu', ucapan: 'malam hari', harapan: { status: 'cocok', nilai: ['malam'] } },
  { id: 'w09', pertanyaan: 'waktu', ucapan: 'sebelum tidur', harapan: { status: 'cocok', nilai: ['sebelum-tidur'] } },
  { id: 'w10', pertanyaan: 'waktu', ucapan: 'sebelum bobo', harapan: { status: 'cocok', nilai: ['sebelum-tidur'] } },
  { id: 'w11', pertanyaan: 'waktu', ucapan: 'mau tidur', harapan: { status: 'cocok', nilai: ['sebelum-tidur'] } },
  { id: 'w12', pertanyaan: 'waktu', ucapan: 'pagi dan malam', harapan: { status: 'cocok', nilai: ['pagi', 'malam'] } },
  {
    id: 'w13',
    pertanyaan: 'waktu',
    ucapan: 'pagi, siang, dan malam',
    harapan: { status: 'cocok', nilai: ['pagi', 'siang', 'malam'] }
  },
  { id: 'w14', pertanyaan: 'waktu', ucapan: 'siang serta sore', harapan: { status: 'cocok', nilai: ['siang', 'sore'] } },
  { id: 'w15', pertanyaan: 'waktu', ucapan: 'pagi & malam', harapan: { status: 'cocok', nilai: ['pagi', 'malam'] } },
  {
    id: 'w16',
    pertanyaan: 'waktu',
    ucapan: 'malam, sebelum tidur',
    harapan: { status: 'cocok', nilai: ['malam', 'sebelum-tidur'] }
  },

  // ------------------------------------------------------------------
  // bilaPerlu (16)
  // ------------------------------------------------------------------
  { id: 'b01', pertanyaan: 'bilaPerlu', ucapan: 'ya', harapan: { status: 'cocok', nilai: true } },
  { id: 'b02', pertanyaan: 'bilaPerlu', ucapan: 'iya', harapan: { status: 'cocok', nilai: true } },
  { id: 'b03', pertanyaan: 'bilaPerlu', ucapan: 'benar', harapan: { status: 'cocok', nilai: true } },
  { id: 'b04', pertanyaan: 'bilaPerlu', ucapan: 'perlu', harapan: { status: 'cocok', nilai: true } },
  { id: 'b05', pertanyaan: 'bilaPerlu', ucapan: 'kalau perlu', harapan: { status: 'cocok', nilai: true } },
  { id: 'b06', pertanyaan: 'bilaPerlu', ucapan: 'bila perlu', harapan: { status: 'cocok', nilai: true } },
  { id: 'b07', pertanyaan: 'bilaPerlu', ucapan: 'hanya kalau perlu', harapan: { status: 'cocok', nilai: true } },
  { id: 'b08', pertanyaan: 'bilaPerlu', ucapan: 'prn', harapan: { status: 'cocok', nilai: true } },
  { id: 'b09', pertanyaan: 'bilaPerlu', ucapan: 'tidak', harapan: { status: 'cocok', nilai: false } },
  { id: 'b10', pertanyaan: 'bilaPerlu', ucapan: 'nggak', harapan: { status: 'cocok', nilai: false } },
  { id: 'b11', pertanyaan: 'bilaPerlu', ucapan: 'enggak', harapan: { status: 'cocok', nilai: false } },
  { id: 'b12', pertanyaan: 'bilaPerlu', ucapan: 'gak', harapan: { status: 'cocok', nilai: false } },
  { id: 'b13', pertanyaan: 'bilaPerlu', ucapan: 'tidak perlu', harapan: { status: 'cocok', nilai: false } },
  { id: 'b14', pertanyaan: 'bilaPerlu', ucapan: 'tidak rutin', harapan: { status: 'cocok', nilai: false } },
  { id: 'b15', pertanyaan: 'bilaPerlu', ucapan: 'rutin', harapan: { status: 'cocok', nilai: false } },
  { id: 'b16', pertanyaan: 'bilaPerlu', ucapan: 'setiap hari', harapan: { status: 'cocok', nilai: false } },
  { id: 'b17', pertanyaan: 'bilaPerlu', ucapan: 'iya perlu', harapan: { status: 'ambigu', nilai: null } },

  // ------------------------------------------------------------------
  // negatif lintas-pertanyaan (12)
  // ------------------------------------------------------------------
  { id: 'n01', pertanyaan: 'frekuensi', ucapan: 'pagi', harapan: { status: 'tidak-cocok', nilai: null } },
  { id: 'n02', pertanyaan: 'aturanMakan', ucapan: 'dua kali sehari', harapan: { status: 'tidak-cocok', nilai: null } },
  { id: 'n03', pertanyaan: 'takaran', ucapan: 'sesudah makan', harapan: { status: 'tidak-cocok', nilai: null } },
  { id: 'n04', pertanyaan: 'waktu', ucapan: 'sebelum makan', harapan: { status: 'tidak-cocok', nilai: null } },
  { id: 'n05', pertanyaan: 'frekuensi', ucapan: 'setengah', harapan: { status: 'tidak-cocok', nilai: null } },
  { id: 'n06', pertanyaan: 'frekuensi', ucapan: 'tiga tablet', harapan: { status: 'tidak-cocok', nilai: null } },
  { id: 'n07', pertanyaan: 'bilaPerlu', ucapan: 'malam', harapan: { status: 'tidak-cocok', nilai: null } },
  { id: 'n08', pertanyaan: 'waktu', ucapan: 'dua kali sehari', harapan: { status: 'tidak-cocok', nilai: null } },
  { id: 'n09', pertanyaan: 'frekuensi', ucapan: 'setelah makan', harapan: { status: 'tidak-cocok', nilai: null } },
  { id: 'n10', pertanyaan: 'aturanMakan', ucapan: 'sebelum tidur', harapan: { status: 'tidak-cocok', nilai: null } },
  { id: 'n11', pertanyaan: 'frekuensi', ucapan: 'pagi dan malam', harapan: { status: 'tidak-cocok', nilai: null } },
  { id: 'n12', pertanyaan: 'takaran', ucapan: 'kalau perlu', harapan: { status: 'tidak-cocok', nilai: null } },

  // ------------------------------------------------------------------
  // kata rusak / tidak dikenal (1; diuji untuk semua pertanyaan di test)
  // ------------------------------------------------------------------
  { id: 'x01', pertanyaan: 'frekuensi', ucapan: 'sahurabla', harapan: { status: 'tidak-cocok', nilai: null } }
];

/** Kata rusak yang wajib ditolak untuk SEMUA pertanyaan. */
export const KATA_RUSAK = ['sahurabla'];

/** Jumlah minimum korpus sesuai CONTRACT 8B.12.3. */
export const MINIMAL_KASUS = 60;
