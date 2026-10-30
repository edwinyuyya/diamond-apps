// ════════════════════════════════════════════════════════════
//  PENGATURAN TOYZONE POSTER
// ════════════════════════════════════════════════════════════

export const BRAND = {
  name: 'Toyzone',
  slogan: 'YOUR HAPPINESS WORLD',
  instagram: '@toyzone888',
  whatsapp: '0821 220 23000',
  // Alamat website toko (dipakai untuk ambil data produk & ditulis di caption)
  storeUrl: process.env.STORE_URL || 'https://toyzone-preview.netlify.app',
};

// Jadwal: tiap Minggu jam 08.00 WIB sistem menyiapkan draf untuk minggu depan
export const SCHEDULE = {
  postsPerWeek: 5,
  // 1 = Senin ... 7 = Minggu (hari terbit)
  postDays: [1, 2, 3, 4, 5],
  postHourWIB: 19,
  postMinuteWIB: 0,
};

// Tema tiap slot mingguan: menentukan template gambar & produk yang dipilih
export const THEMES = {
  baru: { label: 'Produk Baru', color: '#0a63c9', tag: 'NEW ARRIVAL' },
  promo: { label: 'Promo', color: '#e3000b', tag: 'PROMO' },
  terlaris: { label: 'Terlaris', color: '#f27c00', tag: 'BEST SELLER' },
  koleksi: { label: 'Koleksi Premium', color: '#0b2d5e', tag: 'COLLECTOR' },
  terbatas: { label: 'Stok Terbatas', color: '#7b1fa2', tag: 'LIMITED STOCK' },
};
export const WEEKLY_THEMES = ['baru', 'promo', 'terlaris', 'koleksi', 'terbatas'];

// Gaya caption yang bisa dipilih saat "Buat ulang"
export const CAPTION_STYLES = {
  jualan: 'jualan yang meyakinkan, fokus keunggulan produk dan ajakan order',
  seru: 'seru dan heboh, penuh semangat seperti teman sesama kolektor',
  lucu: 'lucu dan relatable untuk orang Indonesia, tetap sopan',
  premium: 'elegan dan premium, untuk kolektor dewasa',
  hadiah: 'menonjolkan produk sebagai ide hadiah untuk anak/pasangan/teman',
};

// Model Claude untuk menulis caption (bisa diganti lewat env CLAUDE_MODEL)
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';
