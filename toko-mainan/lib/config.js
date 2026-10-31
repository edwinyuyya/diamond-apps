// ════════════════════════════════════════════════════════════
//  PENGATURAN TOKO — ubah semua data toko kamu di file ini
// ════════════════════════════════════════════════════════════

export const STORE = {
  name: 'Toyzone',
  slogan: 'YOUR HAPPINESS WORLD',
  // Logo asli: isi link Google Drive atau /logo.png (taruh file di folder public)
  logoImage: '/logo.png',
  tagline: 'Toko Action Figure, Brick & Mainan Koleksi',
  // Nomor WhatsApp admin, format internasional TANPA "+" / "0" di depan
  whatsapp: '6282122023000', // 0821 220 23000
  email: 'halo@toyzone.id',
  address: 'Jakarta, Indonesia',
  instagram: 'https://instagram.com/toyzone888',
  tiktok: 'https://tiktok.com/@toyzone.id',
};

// Rekening tujuan transfer manual
export const BANKS = [
  { bank: 'BCA', number: '0159888055', holder: 'Arianita Dewi' },
];

// Ongkos kirim flat & gratis ongkir di atas nominal tertentu
export const SHIPPING = {
  flat: 25000,
  freeAbove: 1000000,
};

// Batas waktu pembayaran (jam) sebelum pesanan dianggap batal
export const PAYMENT_DEADLINE_HOURS = 24;

// Teks bar pengumuman di paling atas (link opsional)
export const ANNOUNCEMENTS = [
  { text: 'Wujudkan Imajinasimu -', link: 'BELANJA SEKARANG', href: '/produk' },
  { text: 'GRATIS ONGKIR untuk belanja di atas Rp1.000.000', link: 'LIHAT PRODUK', href: '/produk' },
  { text: '100% produk original & bergaransi -', link: 'CARA BELANJA', href: '/cara-belanja' },
];
