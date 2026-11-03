// ════════════════════════════════════════════════════════════
//  TERJEMAHAN — teks website dalam Bahasa Indonesia (id) & Inggris (en)
//  Bahasa dipilih pengunjung lewat tombol "ID | EN" di atas (disimpan di cookie `lang`).
// ════════════════════════════════════════════════════════════

export const LANGS = ['id', 'en'];
export const DEFAULT_LANG = 'id';
export const LANG_COOKIE = 'lang';
export const normLang = (v) => (v === 'en' ? 'en' : 'id');

const D = {
  // umum
  'common.home': ['Beranda', 'Home'],
  'common.loading': ['Memuat…', 'Loading…'],
  'common.startShopping': ['Mulai Belanja', 'Start Shopping'],
  'common.continueShopping': ['Lanjut Belanja', 'Continue Shopping'],
  'common.viewAll': ['Lihat Semua Produk', 'View All Products'],
  'common.allProducts': ['Semua Produk', 'All Products'],
  'common.askPrice': ['Tanya harga', 'Ask for price'],
  'common.addToCart': ['Tambah ke Keranjang', 'Add to Cart'],
  'common.outOfStock': ['Stok Habis', 'Out of Stock'],
  'common.remove': ['Hapus', 'Remove'],
  'common.subtotal': ['Subtotal', 'Subtotal'],
  'common.shipping': ['Ongkos kirim', 'Shipping'],
  'common.free': ['GRATIS', 'FREE'],
  'common.total': ['Total', 'Total'],
  'common.checkout': ['Checkout', 'Checkout'],
  'common.uniqueCode': ['Kode unik', 'Unique code'],
  'common.close': ['Tutup', 'Close'],
  'common.prev': ['Sebelumnya', 'Previous'],
  'common.next': ['Berikutnya', 'Next'],
  'common.youMayLike': ['Kamu Mungkin Juga Suka', 'You May Also Like'],
  'common.years': ['tahun', 'years'],
  'common.perPcs': ['/ pcs', '/ pc'],
  'common.items': ['barang', 'items'],

  // header
  'hdr.search': ['Cari...', 'Search...'],
  'hdr.searchLabel': ['Cari produk', 'Search products'],
  'hdr.howToShop': ['Cara Belanja', 'How to Shop'],
  'hdr.myOrders': ['Pesanan Saya', 'My Orders'],
  'hdr.help': ['Bantuan', 'Help'],
  'hdr.shop': ['BELANJA', 'SHOP'],
  'hdr.shopH': ['Belanja', 'Shop'],
  'hdr.exclusive': ['EKSKLUSIF', 'EXCLUSIVE'],
  'hdr.categories': ['KATEGORI', 'CATEGORIES'],
  'hdr.sale': ['SALE', 'SALE'],
  'hdr.age': ['Umur', 'Age'],
  'hdr.price': ['Harga', 'Price'],
  'hdr.cart': ['Keranjang', 'Cart'],
  'hdr.language': ['Bahasa', 'Language'],
  'shop.all': ['Semua Produk', 'All Products'],
  'shop.new': ['Produk Baru', 'New Arrivals'],
  'shop.best': ['Terlaris', 'Best Sellers'],
  'shop.adult': ['Untuk Dewasa (18+)', 'For Adults (18+)'],
  'shop.limited': ['Stok Terbatas', 'Limited Stock'],
  'shop.exclusive': ['Eksklusif', 'Exclusive'],
  'shop.sale': ['Sale', 'Sale'],

  // label produk
  'badge.Baru': ['Baru', 'New'],
  'badge.Terlaris': ['Terlaris', 'Best Seller'],
  'badge.Eksklusif': ['Eksklusif', 'Exclusive'],

  // kartu produk & WA
  'card.askWa': ['Tanya Harga via WA', 'Ask Price via WA'],
  'wa.askPrice': ['Halo {store}, berapa harga {name}?', 'Hi {store}, how much is {name}?'],
  'wa.askPriceStock': ['Halo {store}, saya mau tanya harga & stok {name} ({id})', 'Hi {store}, I would like to ask about the price & stock of {name} ({id})'],
  'wa.restock': ['Halo, apakah {name} ({id}) akan restock?', 'Hi, will {name} ({id}) be restocked?'],
  'wa.default': ['Halo {store}, saya mau tanya produk', 'Hi {store}, I have a question about a product'],
  'wa.promo': ['Halo {store}, saya mau dapat info promo & produk terbaru', 'Hi {store}, I would like to get promo & new product updates'],
  'wa.checkOrder': ['Halo, saya mau cek pesanan {id}', 'Hi, I would like to check order {id}'],
  'wa.chat': ['Chat WhatsApp', 'Chat on WhatsApp'],

  // keranjang
  'cart.title': ['Keranjang Belanja', 'Shopping Cart'],
  'cart.freeLeft': ['Belanja <b>{amount}</b> lagi untuk GRATIS ONGKIR 🚚', 'Spend <b>{amount}</b> more for FREE SHIPPING 🚚'],
  'cart.freeGot': ['🎉 Kamu dapat <b>GRATIS ONGKIR</b>!', '🎉 You got <b>FREE SHIPPING</b>!'],
  'cart.empty': ['Keranjang kamu masih kosong', 'Your cart is empty'],
  'cart.emptyText': ['Sepertinya kamu belum menambahkan apa pun ke keranjang. Yuk lihat produk kami dan temukan yang kamu suka.', "Looks like you haven't added anything yet. Browse our products and find something you love."],
  'cart.view': ['Lihat Keranjang', 'View Cart'],
  'cart.summary': ['Ringkasan Belanja', 'Order Summary'],
  'cart.uniqueNote': ['Kode unik pembayaran ditambahkan di halaman berikutnya.', 'A unique payment code is added on the next page.'],
  'cart.byCategory': ['Belanja per Kategori', 'Shop by Category'],

  // katalog
  'cat.searchResult': ['Hasil pencarian "{q}"', 'Search results for "{q}"'],
  'cat.count': ['{n} produk', '{n} products'],
  'cat.clearAll': ['Hapus semua', 'Clear all'],
  'cat.category': ['Kategori', 'Category'],
  'cat.availability': ['Ketersediaan', 'Availability'],
  'cat.inStock': ['Hanya yang tersedia', 'In stock only'],
  'cat.showN': ['Lihat {n} produk', 'Show {n} products'],
  'cat.sortBy': ['Urutkan:', 'Sort by:'],
  'cat.notFound': ['Produk tidak ditemukan. Coba ubah filter.', 'No products found. Try changing the filters.'],
  'cat.seeAll': ['Lihat semua produk', 'See all products'],
  'sort.rekomendasi': ['Rekomendasi', 'Recommended'],
  'sort.terbaru': ['Terbaru', 'Newest'],
  'sort.terlaris': ['Terlaris', 'Best Selling'],
  'sort.termurah': ['Harga Terendah', 'Price: Low to High'],
  'sort.termahal': ['Harga Tertinggi', 'Price: High to Low'],
  'sort.rating': ['Rating Tertinggi', 'Top Rated'],
  'tag.baru': ['Produk Baru', 'New Arrivals'],
  'tag.terlaris': ['Terlaris', 'Best Sellers'],
  'tag.eksklusif': ['Eksklusif', 'Exclusive'],
  'tag.diskon': ['Sale', 'Sale'],
  'tag.terbatas': ['Stok Terbatas', 'Limited Stock'],

  // detail produk
  'pdp.askWa': ['Tanya Harga via WhatsApp', 'Ask Price via WhatsApp'],
  'pdp.restockWa': ['Tanya Restock via WhatsApp', 'Ask About Restock via WhatsApp'],
  'pdp.buyNow': ['Beli Sekarang', 'Buy Now'],
  'pdp.qty': ['Jumlah', 'Quantity'],
  'pdp.less': ['Kurangi', 'Decrease'],
  'pdp.more': ['Tambah', 'Increase'],
  'pdp.freeShip': ['Gratis Ongkir Tersedia', 'Free Shipping Available'],
  'pdp.freeShipText': ['Untuk belanja di atas {amount}, seluruh Indonesia', 'On orders over {amount}, all over Indonesia'],
  'pdp.original': ['Garansi Original', 'Authenticity Guaranteed'],
  'pdp.originalText': ['Produk 100% original, dikemas aman dengan bubble wrap', '100% original products, safely packed with bubble wrap'],
  'pdp.soldOut': ['✕ Stok habis', '✕ Out of stock'],
  'pdp.limited': ['Stok terbatas, sisa {n}', 'Limited stock, {n} left'],
  'pdp.inStock': ['Stok tersedia', 'In stock'],
  'pdp.shipTime': ['Dikirim 1×24 jam setelah pembayaran dikonfirmasi', 'Ships within 24 hours after payment is confirmed'],
  'pdp.desc': ['Deskripsi', 'Description'],
  'pdp.specs': ['Spesifikasi', 'Specifications'],
  'pdp.code': ['Kode Produk', 'Product Code'],
  'pdp.age': ['Rekomendasi Umur', 'Recommended Age'],

  // beranda
  'home.offers': ['Penawaran Spesial', 'Special Offers'],
  'home.popular': ['Populer', 'Popular'],
  'home.featured': ['Unggulan', 'Featured'],
  'home.sale': ['Sale', 'Sale'],
  'home.band1': ['Hadiah yang', 'Gifts that'],
  'home.band2': ['selalu bikin senang', 'always bring joy'],
  'home.shopNow': ['Belanja Sekarang ›', 'Shop Now ›'],
  'home.gallery': ['Lihat Koleksi Mereka', 'See Their Collections'],
  'home.galleryText': ['Inspirasi dari koleksi pelanggan Toyzone. Tandai kami di Instagram', 'Inspiration from Toyzone customers. Tag us on Instagram'],
  'home.giftFinder': ['Cari Hadiah', 'Gift Finder'],
  'home.applyFilter': ['Terapkan Filter', 'Apply Filter'],
  'home.allCategories': ['Semua Kategori', 'All Categories'],
  'home.maxPrice': ['Harga maksimal', 'Maximum price'],
  'home.noMatch': ['Belum ada produk yang cocok. Coba geser filter umur/harga.', 'No matching products yet. Try adjusting the age/price filter.'],
  'home.million': ['jt', 'M'],
  'tiles.latest': ['Terbaru', 'Latest'],
  'tiles.interest': ['Minat', 'Interests'],
  'tiles.category': ['Kategori', 'Categories'],
  'tiles.new': ['PRODUK BARU', 'NEW ARRIVALS'],
  'tiles.limited': ['STOK TERBATAS', 'LIMITED STOCK'],
  'tiles.best': ['TERLARIS', 'BEST SELLERS'],
  'tiles.exclusive': ['EKSKLUSIF', 'EXCLUSIVE'],
  'tiles.sale': ['SALE', 'SALE'],
  'tiles.all': ['LIHAT SEMUA', 'VIEW ALL'],
  'tiles.bagCharm': ['GANTUNGAN TAS', 'BAG CHARMS'],
  'tiles.diy': ['DIY MINIATUR', 'DIY MINIATURE'],
  'tiles.collector': ['KOLEKTOR', 'COLLECTORS'],
  'hero.1': ['Fat Tiger Blind Box Dragon & Tiger', 'Fat Tiger Blind Box Dragon & Tiger'],
  'hero.2': ['Fat Tiger Food Party gantungan tas', 'Fat Tiger Food Party bag charm'],
  'hero.3': ['Rolife Super Creator Bubble Tea', 'Rolife Super Creator Bubble Tea'],
  'hero.4': ['Gratis ongkir belanja Rp1 juta', 'Free shipping on orders over Rp1 million'],
  'promo.1': ['Fat Tiger Blind Box Dragon Soaring & Tiger Leaping', 'Fat Tiger Blind Box Dragon Soaring & Tiger Leaping'],
  'promo.2': ['Fat Tiger Food Party gantungan boneka blind box', 'Fat Tiger Food Party blind box plush charm'],
  'promo.3': ['Rolife Super Creator Double Joy Bubble Tea', 'Rolife Super Creator Double Joy Bubble Tea'],
  'promo.4': ['Segera hadir: Doraemon, Sinchan & Emma', 'Coming soon: Doraemon, Sinchan & Emma'],

  // footer
  'ftr.about': ['Tentang', 'About'],
  'ftr.aboutUs': ['Tentang Kami', 'About Us'],
  'ftr.howToPay': ['Cara Pembayaran', 'Payment Methods'],
  'ftr.delivery': ['Pengiriman', 'Delivery'],
  'ftr.service': ['Layanan Pelanggan', 'Customer Service'],
  'ftr.faq': ['FAQ', 'FAQ'],
  'ftr.checkOrder': ['Cek Pesanan', 'Track Order'],
  'ftr.contact': ['Hubungi Kami', 'Contact Us'],
  'ftr.best': ['Terlaris', 'Best Sellers'],
  'ftr.popular': ['Link Populer', 'Popular Links'],
  'ftr.promo': ['Info Promo', 'Promo News'],
  'ftr.promoText': ['Jadi yang pertama tahu promo eksklusif & produk terbaru kami lewat WhatsApp.', 'Be the first to hear about exclusive promos & new arrivals via WhatsApp.'],
  'ftr.join': ['Gabung info promo via WhatsApp', 'Join promo updates on WhatsApp'],
  'ftr.follow': ['Ikuti Kami', 'Follow Us'],
  'ftr.payment': ['Pembayaran', 'Payment'],

  // wishlist & pesanan
  'wish.empty': ['Wishlist kamu masih kosong', 'Your wishlist is empty'],
  'wish.emptyText': ['Klik ikon hati di produk untuk menyimpannya di sini.', 'Tap the heart icon on a product to save it here.'],
  'orders.text': ['Daftar pesanan yang dibuat dari perangkat ini.', 'Orders placed from this device.'],
  'orders.none': ['Belum ada pesanan.', 'No orders yet.'],
  'orders.howToPay': ['Lihat cara bayar →', 'View payment info →'],

  // checkout
  'co.step1': ['1. Keranjang', '1. Cart'],
  'co.step2': ['2. Data Pengiriman', '2. Shipping Details'],
  'co.step3': ['3. Pembayaran', '3. Payment'],
  'co.address': ['📍 Alamat Pengiriman', '📍 Shipping Address'],
  'co.name': ['Nama Penerima *', 'Recipient Name *'],
  'co.namePh': ['Nama lengkap', 'Full name'],
  'co.phone': ['No. WhatsApp / HP yang bisa dihubungi *', 'WhatsApp / Phone Number *'],
  'co.email': ['Email (opsional)', 'Email (optional)'],
  'co.emailPh': ['nama@email.com', 'name@email.com'],
  'co.fullAddress': ['Alamat Lengkap *', 'Full Address *'],
  'co.addressPh': ['Nama jalan, no. rumah, RT/RW, kelurahan, kecamatan, patokan', 'Street, house no., RT/RW, village, district, landmark'],
  'co.city': ['Kota / Kabupaten *', 'City / Regency *'],
  'co.cityPh': ['Contoh: Kota Bandung', 'e.g. Bandung'],
  'co.province': ['Provinsi *', 'Province *'],
  'co.pickProvince': ['Pilih provinsi', 'Select province'],
  'co.postal': ['Kode Pos *', 'Postal Code *'],
  'co.note': ['Catatan untuk penjual (opsional)', 'Note for seller (optional)'],
  'co.notePh': ['Contoh: tolong bungkus kado', 'e.g. please gift wrap'],
  'co.payMethod': ['🏦 Metode Pembayaran', '🏦 Payment Method'],
  'co.transfer': ['Transfer Bank (Manual)', 'Bank Transfer (Manual)'],
  'co.transferText': [': nomor rekening & total transfer dengan kode unik ditampilkan setelah pesanan dibuat. Bukti transfer dikirim via WhatsApp.', ': account number & transfer total with unique code are shown after you place the order. Send the transfer proof via WhatsApp.'],
  'co.agree': ['Saya sudah memastikan alamat & nomor HP benar, dan bersedia mengirim bukti transfer via WhatsApp.', 'I confirm my address & phone number are correct, and I will send the transfer proof via WhatsApp.'],
  'co.agreeErr': ['Centang persetujuan terlebih dahulu', 'Please tick the confirmation box first'],
  'co.yourOrder': ['Pesanan Kamu ({n})', 'Your Order ({n})'],
  'co.autoCode': ['dibuat otomatis', 'auto-generated'],
  'co.processing': ['Memproses…', 'Processing…'],
  'co.place': ['Buat Pesanan', 'Place Order'],
  'co.back': ['← Kembali ke Keranjang', '← Back to Cart'],
  'co.empty': ['Keranjang kosong, belum ada yang bisa di-checkout.', 'Your cart is empty, nothing to check out yet.'],
  'err.name': ['Nama wajib diisi', 'Name is required'],
  'err.phone': ['Nomor WhatsApp/HP tidak valid', 'Invalid WhatsApp/phone number'],
  'err.address': ['Alamat lengkap wajib diisi', 'Full address is required'],
  'err.city': ['Kota/Kabupaten wajib diisi', 'City/Regency is required'],
  'err.province': ['Provinsi wajib diisi', 'Province is required'],
  'err.postal': ['Kode pos 5 digit', 'Postal code must be 5 digits'],

  // pembayaran
  'pay.expired': ['Waktu pembayaran habis', 'Payment time has expired'],
  'pay.copy': ['Salin', 'Copy'],
  'pay.copied': ['✓ Tersalin', '✓ Copied'],
  'pay.notFound': ['Pesanan <b>{id}</b> tidak ditemukan di perangkat ini.', 'Order <b>{id}</b> was not found on this device.'],
  'pay.askAdmin': ['Tanya Admin via WhatsApp', 'Ask Admin via WhatsApp'],
  'pay.success': ['Pesanan Berhasil Dibuat!', 'Order Placed Successfully!'],
  'pay.orderNo': ['No. Pesanan:', 'Order No.:'],
  'pay.finishIn': ['Selesaikan pembayaran dalam', 'Complete your payment within'],
  'pay.deadline': ['Batas:', 'Deadline:'],
  'pay.step1': ['Transfer TEPAT sesuai nominal berikut', 'Transfer the EXACT amount below'],
  'pay.copyAmount': ['Salin Nominal', 'Copy Amount'],
  'pay.warn': ['⚠️ Mohon transfer <b>sampai 3 digit terakhir</b> (kode unik <b>{code}</b>) agar pembayaranmu bisa dicek otomatis & lebih cepat diproses.', '⚠️ Please transfer <b>including the last 3 digits</b> (unique code <b>{code}</b>) so your payment can be matched & processed faster.'],
  'pay.toOne': ['Ke salah satu rekening berikut', 'To one of these accounts'],
  'pay.to': ['Ke rekening berikut', 'To this account'],
  'pay.holder': ['a.n.', 'Account name:'],
  'pay.step3': ['Kirim bukti transfer via WhatsApp', 'Send the transfer proof via WhatsApp'],
  'pay.step3Text': ['Klik tombol di bawah, detail pesanan otomatis terisi. <b>Lampirkan foto/screenshot bukti transfer</b> lalu kirim. Pesanan diproses setelah pembayaran dikonfirmasi admin.', 'Tap the button below, your order details are filled in automatically. <b>Attach a photo/screenshot of the transfer proof</b> and send. Your order is processed once the admin confirms payment.'],
  'pay.sendWa': ['💬 Kirim Bukti Transfer ke WhatsApp', '💬 Send Transfer Proof via WhatsApp'],
  'pay.adminWa': ['WhatsApp admin:', 'Admin WhatsApp:'],
  'pay.details': ['Rincian Pesanan', 'Order Details'],
  'pay.totalTransfer': ['Total Transfer', 'Total Transfer'],
  'pay.shipTo': ['Dikirim ke', 'Ship to'],
  'pay.note': ['Catatan:', 'Note:'],

  // pesan WhatsApp konfirmasi pembayaran
  'wa.confirm': [
`Halo {store}, saya sudah transfer untuk pesanan berikut:

*No. Pesanan:* {id}
*Total Transfer:* {total}

*Produk:*
{lines}

Subtotal: {subtotal}
Ongkir: {shipping}
Kode unik: {code}

*Data Pengiriman:*
Nama: {name}
No. HP/WA: {phone}
Alamat: {address}{note}

Berikut saya lampirkan foto bukti transfernya 👇`,
`Hi {store}, I have made the transfer for this order:

*Order No.:* {id}
*Total Transfer:* {total}

*Products:*
{lines}

Subtotal: {subtotal}
Shipping: {shipping}
Unique code: {code}

*Shipping Details:*
Name: {name}
Phone/WA: {phone}
Address: {address}{note}

Here is the photo of my transfer proof 👇`],
  'wa.noteLine': ['\nCatatan: {note}', '\nNote: {note}'],

  // cara belanja
  'help.title': ['Cara Belanja di {store}', 'How to Shop at {store}'],
  'help.s1': ['<b>Pilih produk</b> lalu klik <i>Tambah ke Keranjang</i> atau <i>Beli Sekarang</i>.', '<b>Choose a product</b> and click <i>Add to Cart</i> or <i>Buy Now</i>.'],
  'help.s2': ['<b>Checkout</b>: isi nama penerima, nomor WhatsApp/HP yang bisa dihubungi, dan alamat lengkap.', '<b>Checkout</b>: fill in the recipient name, a WhatsApp/phone number we can reach, and the full address.'],
  'help.s3': ['<b>Transfer</b> sesuai total yang tertera <b>termasuk 3 digit kode unik</b> ke salah satu rekening kami.', '<b>Transfer</b> the total shown <b>including the 3-digit unique code</b> to one of our bank accounts.'],
  'help.s4': ['<b>Kirim bukti transfer</b> lewat tombol WhatsApp di halaman pembayaran.', '<b>Send the transfer proof</b> using the WhatsApp button on the payment page.'],
  'help.s5': ['Admin mengonfirmasi pembayaran dan <b>pesanan dikirim</b>. Nomor resi dikirim via WhatsApp.', 'The admin confirms your payment and <b>ships your order</b>. The tracking number is sent via WhatsApp.'],
  'help.payment': ['Pembayaran', 'Payment'],
  'help.paymentText': ['Saat ini pembayaran melalui transfer bank manual. Batas pembayaran {hours} jam setelah pesanan dibuat.', 'Payment is currently by manual bank transfer. Please pay within {hours} hours of placing your order.'],
  'help.delivery': ['Pengiriman', 'Delivery'],
  'help.deliveryText': ['Ongkos kirim flat {flat} ke seluruh Indonesia, <b>GRATIS</b> untuk belanja di atas {free}. Pesanan dikirim 1×24 jam hari kerja setelah pembayaran terkonfirmasi.', 'Flat shipping fee of {flat} anywhere in Indonesia, <b>FREE</b> on orders over {free}. Orders ship within 1 business day after payment is confirmed.'],

  // meta
  'meta.tagline': ['Toko Blind Box, Rolife & Mainan Koleksi', 'Blind Box, Rolife & Collectible Toy Store'],
  'meta.desc': ['Belanja blind box Fat Tiger, Rolife DIY miniatur & mainan koleksi original di {store}. Kirim ke seluruh Indonesia.', 'Shop Fat Tiger blind boxes, Rolife DIY miniatures & original collectible toys at {store}. Shipping all over Indonesia.'],
};

// Nama kelompok umur & harga (dipakai filter katalog)
export const AGE_NAMES = {
  '3-5': ['3–5 tahun', '3–5 years'], '6-8': ['6–8 tahun', '6–8 years'], '9-12': ['9–12 tahun', '9–12 years'],
  '13-17': ['13–17 tahun', '13–17 years'], '18': ['18+ (Kolektor)', '18+ (Collectors)'],
};
export const PRICE_NAMES = {
  '0-250': ['Di bawah Rp250rb', 'Under Rp250K'], '250-500': ['Rp250rb – Rp500rb', 'Rp250K – Rp500K'],
  '500-1000': ['Rp500rb – Rp1jt', 'Rp500K – Rp1M'], '1000-2500': ['Rp1jt – Rp2,5jt', 'Rp1M – Rp2.5M'],
  '2500': ['Di atas Rp2,5jt', 'Over Rp2.5M'],
};

export function t(lang, key, vars) {
  const row = D[key];
  let s = row ? row[lang === 'en' ? 1 : 0] : key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

// Untuk teks yang berisi tag <b>/<i>: nilai sisipan di-escape supaya aman
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const tHtml = (lang, key, vars) =>
  t(lang, key, vars && Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, esc(v)])));

export const pick = (lang, pair) => (pair ? pair[lang === 'en' ? 1 : 0] : '');
export const locale = (lang) => (lang === 'en' ? 'en-GB' : 'id-ID');

// Terjemahan nama spesifikasi umum (kunci spesifikasi produk ditulis admin dalam B. Indonesia)
const SPEC_KEYS = {
  'Merek': 'Brand', 'Seri': 'Series', 'Isi': 'Contents', 'Isi per box': 'Contents per box', 'Isi Paket': 'Package Contents',
  'Bahan': 'Material', 'Ukuran': 'Size', 'Tinggi': 'Height', 'Berat': 'Weight', 'Jumlah desain': 'Number of designs',
  'Jumlah Desain': 'Number of designs', 'Jenis': 'Type', 'Tipe': 'Type', 'Karakter': 'Character', 'Warna': 'Color',
  'Lampu': 'Light', 'Tingkat kesulitan': 'Difficulty', 'Waktu rakit': 'Build time', 'Waktu Rakit': 'Build time',
  'Jumlah Part': 'Number of parts', 'Jumlah part': 'Number of parts', 'Garansi': 'Warranty', 'Asal': 'Origin', 'Pilihan desain': 'Designs', 'Pilihan Desain': 'Designs',
};

// Ganti nama/deskripsi/spesifikasi produk ke bahasa Inggris kalau admin sudah mengisi versi Inggrisnya
export function localizeProduct(p, lang) {
  if (lang !== 'en') return p;
  const specs = p.specsEn && Object.keys(p.specsEn).length ? p.specsEn
    : Object.fromEntries(Object.entries(p.specs || {}).map(([k, v]) => [SPEC_KEYS[k] || k, v]));
  return { ...p, name: p.nameEn || p.name, description: p.descriptionEn || p.description, specs };
}
