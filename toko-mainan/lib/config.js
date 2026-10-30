// ════════════════════════════════════════════════════════════
//  PENGATURAN TOKO — ubah semua data toko kamu di file ini
// ════════════════════════════════════════════════════════════

export const STORE = {
  name: 'BrickToys',
  tagline: 'Toko Action Figure, Brick & Mainan Koleksi',
  // Nomor WhatsApp admin, format internasional TANPA "+" / "0" di depan
  whatsapp: '6281234567890',
  email: 'halo@bricktoys.id',
  address: 'Jakarta, Indonesia',
  instagram: 'https://instagram.com/bricktoys.id',
  tiktok: 'https://tiktok.com/@bricktoys.id',
};

// Rekening tujuan transfer manual
export const BANKS = [
  { bank: 'BCA', number: '1234567890', holder: 'PT BrickToys Indonesia' },
  { bank: 'Mandiri', number: '1230009876543', holder: 'PT BrickToys Indonesia' },
  { bank: 'BRI', number: '012301000123456', holder: 'PT BrickToys Indonesia' },
];

// Ongkos kirim flat & gratis ongkir di atas nominal tertentu
export const SHIPPING = {
  flat: 25000,
  freeAbove: 1000000,
};

// Batas waktu pembayaran (jam) sebelum pesanan dianggap batal
export const PAYMENT_DEADLINE_HOURS = 24;

// Teks bar pengumuman di paling atas
export const ANNOUNCEMENTS = [
  'GRATIS ONGKIR untuk belanja di atas Rp1.000.000',
  '100% produk original & bergaransi',
  'Butuh bantuan? Chat WhatsApp kami',
];
