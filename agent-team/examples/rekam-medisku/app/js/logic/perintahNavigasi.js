// Rekam Medisku — perintah navigasi suara (CONTRACT.md 8B.8).
//
// Modul murni: bebas DOM, bebas penyimpanan, bebas jaringan, tanpa model
// bahasa/AI. Pencocokan sepenuhnya deterministik:
//   1. normalisasi NFKC + huruf kecil + buang tanda baca;
//   2. cocok persis dengan salah satu frasa;
//   3. jika tidak, kemiripan token (Jaccard) >= 0.6; skor tertinggi menang;
//   4. skor tertinggi yang dimiliki lebih dari satu perintah -> null (ambigu).
//
// Perintah di sini HANYA navigasi dan pengisian. Tidak ada perintah medis:
// pertanyaan seperti "berapa dosis saya" tidak dikenali dan tidak memicu aksi.

export const PERINTAH_NAVIGASI = Object.freeze([
  Object.freeze({ id: 'obat', frasa: Object.freeze(['buka obat', 'daftar obat', 'obat']), route: '#/obat' }),
  Object.freeze({ id: 'ringkasan', frasa: Object.freeze(['ringkasan dokter', 'buka ringkasan']), route: '#/ringkasan' }),
  Object.freeze({ id: 'darurat', frasa: Object.freeze(['kartu darurat', 'darurat']), route: '#/darurat' }),
  Object.freeze({ id: 'beranda', frasa: Object.freeze(['beranda', 'halaman utama', 'pulang']), route: '#/' }),
  Object.freeze({ id: 'isi-suara', frasa: Object.freeze(['isi dengan suara', 'catat obat', 'catat vital', 'sudah minum']), route: '#/suara' }),
  Object.freeze({ id: 'pemeriksaan', frasa: Object.freeze(['pemeriksaan pendamping', 'periksa obat']), route: '#/pemeriksaan' }),
  Object.freeze({ id: 'pengaturan-suara', frasa: Object.freeze(['pengaturan suara', 'pilih suara']), route: '#/suara/pengaturan' }),
  Object.freeze({ id: 'bantuan', frasa: Object.freeze(['bantuan', 'tolong', 'apa yang bisa saya katakan']), route: '#/bantuan-suara' }),
  Object.freeze({ id: 'berhenti', frasa: Object.freeze(['berhenti', 'diam', 'batal']), action: 'berhenti' })
]);

/** Ambang kemiripan token (Jaccard) sesuai kontrak. */
export const AMBANG_JACCARD = 0.6;

/** Arti tiap perintah untuk daftar bantuan (dibacakan/ditampilkan). */
const ARTI = Object.freeze({
  obat: 'membuka daftar obat',
  ringkasan: 'membuka ringkasan untuk dokter',
  darurat: 'membuka kartu darurat',
  beranda: 'membuka beranda',
  'isi-suara': 'membuka Isi dengan Suara untuk mencatat obat atau vital',
  pemeriksaan: 'membuka Pemeriksaan Pendamping',
  'pengaturan-suara': 'membuka Pengaturan Suara',
  bantuan: 'menampilkan dan membacakan daftar perintah ini',
  berhenti: 'menghentikan pendengaran tanpa membuka layar'
});

/**
 * Normalisasi teks perintah: NFKC, huruf kecil, tanda baca -> spasi,
 * spasi berlebih dirapikan. Selalu mengembalikan string.
 */
export function normalisasiPerintah(teks) {
  if (teks === null || teks === undefined) return '';
  return String(teks)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function daftarToken(normal) {
  if (!normal) return [];
  return normal.split(' ').filter(Boolean);
}

function tokenUnik(daftar) {
  return new Set(daftar);
}

/** Jaccard atas himpunan token: |A ∩ B| / |A ∪ B|. */
function jaccard(utama, pembanding) {
  if (utama.length === 0 || pembanding.length === 0) return 0;
  const a = tokenUnik(utama);
  const b = tokenUnik(pembanding);
  let irisan = 0;
  for (const token of a) {
    if (b.has(token)) irisan += 1;
  }
  const gabungan = a.size + b.size - irisan;
  return gabungan === 0 ? 0 : irisan / gabungan;
}

function bentukHasil(perintah, frasa, skor) {
  return {
    id: perintah.id,
    frasa,
    route: perintah.route ?? null,
    action: perintah.action ?? null,
    skor
  };
}

// Peta frasa ternormalisasi untuk pencocokan persis (deterministik, urutan kontrak).
const PETA_PERSIS = new Map();
for (const perintah of PERINTAH_NAVIGASI) {
  for (const frasa of perintah.frasa) {
    const normal = normalisasiPerintah(frasa);
    if (!normal) continue;
    if (!PETA_PERSIS.has(normal)) {
      PETA_PERSIS.set(normal, perintah);
    } else if (PETA_PERSIS.get(normal)?.id !== perintah.id) {
      // Frasa ganda antardua perintah => sengaja ambigu.
      PETA_PERSIS.set(normal, null);
    }
  }
}
Object.freeze(PETA_PERSIS);

/**
 * Kenali satu ucapan menjadi perintah navigasi.
 * @returns {{id:string, frasa:string, route:string|null, action:string|null, skor:number}|null}
 *   null bila tidak dikenali atau ambigu (minta ulang).
 */
export function kenaliPerintah(teks) {
  const normal = normalisasiPerintah(teks);
  if (!normal) return null;

  // 1) Cocok persis frasa (prioritas tertinggi).
  if (PETA_PERSIS.has(normal)) {
    const perintah = PETA_PERSIS.get(normal);
    if (!perintah) return null;
    const frasa = perintah.frasa.find((item) => normalisasiPerintah(item) === normal) ?? perintah.frasa[0];
    return bentukHasil(perintah, frasa, 1);
  }

  // 2) Kemiripan token: ambil skor tertinggi per perintah.
  const tokenUtama = daftarToken(normal);
  const kandidat = [];
  for (const perintah of PERINTAH_NAVIGASI) {
    let skorTerbaik = 0;
    let frasaTerbaik = null;
    for (const frasa of perintah.frasa) {
      const skor = jaccard(tokenUtama, daftarToken(normalisasiPerintah(frasa)));
      if (skor > skorTerbaik) {
        skorTerbaik = skor;
        frasaTerbaik = frasa;
      }
    }
    if (frasaTerbaik !== null && skorTerbaik >= AMBANG_JACCARD) {
      kandidat.push({ perintah, frasa: frasaTerbaik, skor: skorTerbaik });
    }
  }

  if (kandidat.length === 0) return null;

  let skorMaks = 0;
  for (const item of kandidat) {
    if (item.skor > skorMaks) skorMaks = item.skor;
  }
  const teratas = kandidat.filter((item) => Math.abs(item.skor - skorMaks) <= 1e-9);
  const idTeratas = new Set(teratas.map((item) => item.perintah.id));
  if (idTeratas.size !== 1) return null; // seri/ambigu -> minta ulang

  const pilihan = teratas[0];
  return bentukHasil(pilihan.perintah, pilihan.frasa, pilihan.skor);
}

/** Kalimat perintah + artinya, satu baris per perintah (untuk <ul> bantuan). */
export function daftarBantuan() {
  return PERINTAH_NAVIGASI.map((perintah) => {
    const frasa = perintah.frasa.map((item) => `"${item}"`).join(', ');
    return `Ucapkan ${frasa} untuk ${ARTI[perintah.id]}.`;
  });
}

/** Teks bantuan utuh untuk TTS/live region. */
export function teksBantuan() {
  const daftar = daftarBantuan().join(' ');
  return (
    'Daftar perintah suara. '
    + daftar
    + ' Perintah suara hanya untuk navigasi dan pengisian. '
    + 'Aplikasi tidak menjawab pertanyaan medis. '
    + 'Ucapkan berhenti kapan saja untuk berhenti mendengarkan.'
  );
}
