// ════════════════════════════════════════════════════════════
//  DATA PRODUK & KATEGORI
//  - Foto: taruh file di folder /public/produk lalu isi `images`,
//    contoh: images: ['/produk/robot-titan-1.jpg', '/produk/robot-titan-2.jpg']
//    Kalau `images` kosong, tampil gambar placeholder (emoji + warna).
//  - Harga dalam Rupiah (angka saja, tanpa titik).
//  - salePrice opsional: isi kalau sedang diskon.
// ════════════════════════════════════════════════════════════

export const CATEGORIES = [
  { slug: 'action-figure', name: 'Action Figure', emoji: '🦸', color: '#e53935', desc: 'Pahlawan super & karakter film favorit' },
  { slug: 'brick-set', name: 'Brick Set', emoji: '🧱', color: '#fb8c00', desc: 'Set balok susun untuk dirakit' },
  { slug: 'anime-figure', name: 'Anime Figure', emoji: '🎎', color: '#8e24aa', desc: 'Figure karakter anime & manga' },
  { slug: 'diecast', name: 'Die-cast & Mobil', emoji: '🏎️', color: '#1e88e5', desc: 'Miniatur mobil koleksi' },
  { slug: 'robot', name: 'Robot & Transformasi', emoji: '🤖', color: '#00897b', desc: 'Robot rakit & berubah bentuk' },
  { slug: 'plush', name: 'Boneka & Plush', emoji: '🧸', color: '#d81b60', desc: 'Boneka lembut untuk segala usia' },
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

export const PRODUCTS = [
  {
    id: 'AF001', slug: 'iron-guardian-mark-x', name: 'Iron Guardian Mark X Deluxe Figure 1/12',
    category: 'action-figure', price: 1250000, salePrice: 1099000, age: 14, stock: 8,
    badge: 'Terlaris', emoji: '🦾', color: '#c62828', rating: 4.9, sold: 132, images: [],
    description: 'Action figure skala 1/12 dengan 30+ titik artikulasi, armor metalik, efek LED di dada, dan 6 pasang tangan pengganti. Cocok untuk display maupun koleksi.',
    specs: { 'Skala': '1/12', 'Tinggi': '17 cm', 'Material': 'PVC & ABS', 'Isi': 'Figure, 12 tangan, stand' },
  },
  {
    id: 'AF002', slug: 'shadow-knight-premium', name: 'Shadow Knight Premium Collector Edition',
    category: 'action-figure', price: 2350000, age: 18, stock: 3,
    badge: 'Eksklusif', emoji: '🦇', color: '#263238', rating: 5.0, sold: 41, images: [],
    description: 'Edisi kolektor dengan jubah kain asli, 2 kepala alternatif, dan base diorama atap kota. Produksi terbatas.',
    specs: { 'Skala': '1/6', 'Tinggi': '30 cm', 'Material': 'PVC, kain', 'Isi': 'Figure, 2 kepala, diorama' },
  },
  {
    id: 'AF003', slug: 'web-hero-classic', name: 'Web Hero Classic Suit 6 Inch',
    category: 'action-figure', price: 389000, age: 8, stock: 25,
    badge: 'Baru', emoji: '🕷️', color: '#d32f2f', rating: 4.7, sold: 210, images: [],
    description: 'Figure 6 inci dengan pose dinamis dan efek jaring yang bisa dipasang.',
    specs: { 'Tinggi': '15 cm', 'Material': 'PVC', 'Isi': 'Figure, 2 efek jaring' },
  },
  {
    id: 'BS001', slug: 'kastil-naga-api', name: 'Kastil Naga Api — Brick Set 1.850 pcs',
    category: 'brick-set', price: 1899000, age: 12, stock: 6,
    badge: 'Terlaris', emoji: '🏰', color: '#ef6c00', rating: 4.9, sold: 87, images: [],
    description: 'Bangun kastil megah lengkap dengan naga yang sayapnya bisa digerakkan, 6 minifigure, dan ruang rahasia.',
    specs: { 'Jumlah keping': '1.850 pcs', 'Ukuran jadi': '42 x 30 x 38 cm', 'Minifigure': '6' },
  },
  {
    id: 'BS002', slug: 'stasiun-pemadam-kebakaran', name: 'Stasiun Pemadam Kebakaran Kota',
    category: 'brick-set', price: 749000, salePrice: 649000, age: 6, stock: 14,
    badge: 'Diskon', emoji: '🚒', color: '#e65100', rating: 4.8, sold: 156, images: [],
    description: 'Set kota dengan mobil pemadam, tangga yang bisa dipanjangkan, dan 4 minifigure petugas.',
    specs: { 'Jumlah keping': '540 pcs', 'Minifigure': '4' },
  },
  {
    id: 'BS003', slug: 'mobil-sport-teknik', name: 'Mobil Sport Teknik 1/10 — 1.200 pcs',
    category: 'brick-set', price: 2799000, age: 18, stock: 4,
    badge: 'Eksklusif', emoji: '🏁', color: '#f57c00', rating: 5.0, sold: 29, images: [],
    description: 'Replika mobil sport dengan mesin piston bergerak, girboks 8 percepatan, dan setir berfungsi. Untuk perakit dewasa.',
    specs: { 'Jumlah keping': '1.200 pcs', 'Panjang': '48 cm' },
  },
  {
    id: 'BS004', slug: 'kebun-binatang-mini', name: 'Kebun Binatang Mini — Balok Besar',
    category: 'brick-set', price: 299000, age: 3, stock: 30,
    badge: '', emoji: '🦁', color: '#ffa726', rating: 4.6, sold: 98, images: [],
    description: 'Balok ukuran besar yang aman untuk balita, lengkap dengan figur hewan.',
    specs: { 'Jumlah keping': '60 pcs', 'Ukuran balok': 'Besar (aman balita)' },
  },
  {
    id: 'AN001', slug: 'ninja-hokage-figure', name: 'Ninja Hokage Battle Pose PVC Figure',
    category: 'anime-figure', price: 549000, age: 13, stock: 12,
    badge: 'Baru', emoji: '🍥', color: '#6a1b9a', rating: 4.8, sold: 64, images: [],
    description: 'Figure statis dengan pose bertarung dan efek energi transparan.',
    specs: { 'Tinggi': '22 cm', 'Material': 'PVC' },
  },
  {
    id: 'AN002', slug: 'pirate-king-gear', name: 'Pirate King Gear Fifth Figure',
    category: 'anime-figure', price: 1450000, age: 15, stock: 5,
    badge: 'Terlaris', emoji: '🏴‍☠️', color: '#7b1fa2', rating: 4.9, sold: 120, images: [],
    description: 'Figure premium dengan detail awan dan efek petir, base bercahaya.',
    specs: { 'Tinggi': '28 cm', 'Material': 'PVC & ABS' },
  },
  {
    id: 'AN003', slug: 'chibi-set-isi-6', name: 'Chibi Figure Blind Box (isi 6)',
    category: 'anime-figure', price: 360000, salePrice: 299000, age: 8, stock: 40,
    badge: 'Diskon', emoji: '🎁', color: '#ab47bc', rating: 4.5, sold: 301, images: [],
    description: '6 blind box figure chibi acak, peluang dapat varian rahasia!',
    specs: { 'Isi': '6 box', 'Tinggi': '± 7 cm per figure' },
  },
  {
    id: 'DC001', slug: 'supercar-skala-1-18', name: 'Supercar Die-cast Skala 1/18',
    category: 'diecast', price: 899000, age: 14, stock: 10,
    badge: '', emoji: '🏎️', color: '#1565c0', rating: 4.8, sold: 45, images: [],
    description: 'Pintu, kap, dan bagasi bisa dibuka. Interior detail dan ban karet.',
    specs: { 'Skala': '1/18', 'Material': 'Die-cast logam' },
  },
  {
    id: 'DC002', slug: 'paket-mobil-balap-5', name: 'Paket Mobil Balap Mini (isi 5)',
    category: 'diecast', price: 175000, age: 3, stock: 50,
    badge: 'Terlaris', emoji: '🚗', color: '#1e88e5', rating: 4.7, sold: 520, images: [],
    description: '5 mobil mini die-cast dengan desain berbeda, cocok untuk main maupun koleksi.',
    specs: { 'Skala': '1/64', 'Isi': '5 mobil' },
  },
  {
    id: 'RB001', slug: 'robot-titan-transform', name: 'Robot Titan Transform Truck',
    category: 'robot', price: 679000, age: 8, stock: 15,
    badge: 'Baru', emoji: '🤖', color: '#00796b', rating: 4.8, sold: 77, images: [],
    description: 'Robot yang bisa berubah menjadi truk dalam 22 langkah. Dengan senjata dan efek suara.',
    specs: { 'Tinggi mode robot': '25 cm', 'Langkah transformasi': '22' },
  },
  {
    id: 'RB002', slug: 'mecha-gundam-master-grade', name: 'Mecha Warrior Model Kit 1/100',
    category: 'robot', price: 1150000, age: 15, stock: 7,
    badge: '', emoji: '🛡️', color: '#00897b', rating: 4.9, sold: 58, images: [],
    description: 'Model kit rakit tanpa lem dengan rangka dalam penuh dan stiker detail.',
    specs: { 'Skala': '1/100', 'Tinggi jadi': '18 cm' },
  },
  {
    id: 'PL001', slug: 'beruang-cokelat-jumbo', name: 'Boneka Beruang Cokelat Jumbo 60 cm',
    category: 'plush', price: 259000, age: 3, stock: 20,
    badge: '', emoji: '🧸', color: '#ad1457', rating: 4.9, sold: 188, images: [],
    description: 'Boneka super lembut, aman untuk anak, bisa dicuci.',
    specs: { 'Tinggi': '60 cm', 'Material': 'Velboa & dakron' },
  },
  {
    id: 'PL002', slug: 'dino-plush-set', name: 'Dino Plush Set (isi 3)',
    category: 'plush', price: 199000, salePrice: 169000, age: 3, stock: 0,
    badge: 'Diskon', emoji: '🦖', color: '#c2185b', rating: 4.6, sold: 143, images: [],
    description: 'Tiga boneka dinosaurus imut ukuran sedang.',
    specs: { 'Tinggi': '25 cm per boneka', 'Isi': '3 boneka' },
  },
];

// ── helper ──
export const getProduct = (slug) => PRODUCTS.find((p) => p.slug === slug);
export const getCategory = (slug) => CATEGORIES.find((c) => c.slug === slug);
export const finalPrice = (p) => p.salePrice ?? p.price;
export const discountPct = (p) => (p.salePrice ? Math.round((1 - p.salePrice / p.price) * 100) : 0);
export const formatRp = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');
