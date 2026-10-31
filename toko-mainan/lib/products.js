// ════════════════════════════════════════════════════════════
//  DATA PRODUK & KATEGORI (sesuai folder Google Drive "Toyzone materi")
//  - Foto: file .webp di /public/produk/<slug>/ (diambil dari Drive & dikompres),
//    atau paste link share Google Drive. Foto pertama = foto utama.
//    Semua foto otomatis tampil di dalam frame template Toyzone.
//  - price: harga dalam Rupiah (angka saja, tanpa titik).
//    Kosongkan (null) kalau harga belum ada → tampil "Tanya Harga" via WhatsApp
//    dan produk belum bisa dimasukkan ke keranjang.
//  - salePrice opsional: isi kalau sedang diskon.
// ════════════════════════════════════════════════════════════

export const CATEGORIES = [
  { slug: 'blind-box', name: 'Blind Box', emoji: '🎁', color: '#f27c00', desc: 'Figure & gantungan kejutan, siapa tahu dapat hidden edition' },
  { slug: 'rolife', name: 'Rolife', emoji: '🏠', color: '#d81b60', desc: 'Rumah miniatur DIY untuk dirakit sendiri' },
];

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

const img = (slug, n) => Array.from({ length: n }, (_, i) => `/produk/${slug}/${String(i + 1).padStart(2, '0')}.webp`);

export const PRODUCTS = [
  {
    id: 'BB001', slug: 'fat-tiger-dragon-soaring-tiger-leaping',
    name: 'Fat Tiger Blind Box — Dragon Soaring & Tiger Leaping Series',
    category: 'blind-box', series: 'Fat Tiger',
    price: null, salePrice: null, age: 15, stock: 10,
    badge: 'Baru', emoji: '🐯', color: '#f27c00', rating: 5.0, sold: 0,
    images: img('fat-tiger-dragon-soaring-tiger-leaping', 7),
    description: 'Blind box figure Alexander si Fat Tiger seri "Long Teng Hu Yue" (Dragon Soaring & Tiger Leaping). Tiap box berisi 1 figure acak dari 8 desain: Soaring Dragon, Leaping Tiger, Subduing Dragon, Crouching Tiger, Dragon Pool, Tiger\'s Den, Sleeping Dragon dan Fledgling Phoenix, plus peluang mendapatkan hidden edition "Coiling Dragon & Crouching Saw Tiger".',
    specs: { 'Jenis': 'Blind box figure', 'Isi': '1 figure acak per box', 'Pilihan desain': '8 desain + 1 hidden edition', 'Karakter': 'Fat Tiger (BU2MA)' },
  },
  {
    id: 'BB002', slug: 'fat-tiger-food-party-plush-pendant',
    name: 'Fat Tiger Blind Box — Tiger Food Party Plush Pendant',
    category: 'blind-box', series: 'Fat Tiger',
    price: null, salePrice: null, age: 15, stock: 10,
    badge: 'Baru', emoji: '🐯', color: '#e65100', rating: 5.0, sold: 0,
    images: img('fat-tiger-food-party-plush-pendant', 4),
    description: 'Gantungan boneka (plush pendant) Fat Tiger seri "Tiger Food Party — Let\'s Eat Together". Tiap blind box berisi 1 gantungan acak dari 6 desain, lucu dipasang di tas atau kunci.',
    specs: { 'Jenis': 'Blind box gantungan boneka', 'Isi': '1 gantungan acak per box', 'Pilihan desain': '6 desain', 'Karakter': 'Fat Tiger (BU2MA)' },
  },
  {
    id: 'RL001', slug: 'rolife-super-creator-double-joy-bubble-tea',
    name: 'Rolife Super Creator — Double Joy Bubble Tea',
    category: 'rolife', series: 'Super Creator',
    price: null, salePrice: null, age: 14, stock: 10,
    badge: 'Baru', emoji: '🧋', color: '#d81b60', rating: 5.0, sold: 0,
    images: img('rolife-super-creator-double-joy-bubble-tea', 1),
    description: 'Kit rumah miniatur DIY dari Rolife seri Super Creator bertema kedai bubble tea "Double Joy". Rakit sendiri jadi pajangan meja yang detail dan menggemaskan.',
    specs: { 'Merek': 'Rolife', 'Seri': 'Super Creator', 'Jenis': 'Kit rumah miniatur DIY' },
  },
];

// ── helper ──
export const getProduct = (slug) => PRODUCTS.find((p) => p.slug === slug);
export const getCategory = (slug) => CATEGORIES.find((c) => c.slug === slug);
export const finalPrice = (p) => p.salePrice ?? p.price;
export const hasPrice = (p) => p.price != null;
export const discountPct = (p) => (p.salePrice && p.price ? Math.round((1 - p.salePrice / p.price) * 100) : 0);
export const formatRp = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');
