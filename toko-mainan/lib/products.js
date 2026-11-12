// Konstanta & helper produk. Data produk sendiri ada di katalog (lib/catalog.js,
// diisi lewat halaman /admin) dan dibaca komponen client lewat useCatalog().

export const AGE_GROUPS = [
  { slug: '3-5', name: '3–5 tahun', min: 3, max: 5 },
  { slug: '6-8', name: '6–8 tahun', min: 6, max: 8 },
  { slug: '9-12', name: '9–12 tahun', min: 9, max: 12 },
  { slug: '13-17', name: '13–17 tahun', min: 13, max: 17 },
  { slug: '18', name: '18+ (Kolektor)', min: 18, max: 99 },
];

export const PRICE_RANGES = [
  { slug: '0-250', name: 'Di bawah Rp250rb', min: 0, max: 250000 },
  { slug: '250-500', name: 'Rp250rb – Rp500rb', min: 250000, max: 500000 },
  { slug: '500-1000', name: 'Rp500rb – Rp1jt', min: 500000, max: 1000000 },
  { slug: '1000-2500', name: 'Rp1jt – Rp2,5jt', min: 1000000, max: 2500000 },
  { slug: '2500', name: 'Di atas Rp2,5jt', min: 2500000, max: Infinity },
];

// ── helper ──
export const finalPrice = (p) => p.salePrice ?? p.price;
export const hasPrice = (p) => p.price != null;
export const discountPct = (p) => (p.salePrice && p.price ? Math.round((1 - p.salePrice / p.price) * 100) : 0);
export const formatRp = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');
