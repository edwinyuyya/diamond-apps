// ════════════════════════════════════════════════════════════
//  PENGATURAN TOKO — ubah semua data toko kamu di file ini
// ════════════════════════════════════════════════════════════

export const STORE = {
  name: 'Toyzone',
  slogan: 'YOUR HAPPINESS WORLD',
  // Logo asli: isi link Google Drive atau /logo.png (taruh file di folder public)
  logoImage: '',
  tagline: 'Toko Action Figure, Brick & Mainan Koleksi',
  // Nomor WhatsApp admin, format internasional TANPA "+" / "0" di depan
  whatsapp: '6281234567890',
  email: 'halo@toyzone.id',
  address: 'Jakarta, Indonesia',
  instagram: 'https://instagram.com/toyzone.id',
  tiktok: 'https://tiktok.com/@toyzone.id',
};

// Rekening tujuan transfer manual
export const BANKS = [
  { bank: 'BCA', number: '1234567890', holder: 'Toyzone Indonesia' },
  { bank: 'Mandiri', number: '1230009876543', holder: 'Toyzone Indonesia' },
  { bank: 'BRI', number: '012301000123456', holder: 'Toyzone Indonesia' },
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
