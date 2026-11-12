// Katalog produk (server). Sumber: Netlify Blobs "catalog", diisi lewat halaman /admin.
// Kalau belum pernah disimpan dari admin (atau Blobs gagal dibaca), memakai data awal lib/products-data.json.
import 'server-only';
import seed from './products-data.json';
import { getJSON, setJSON } from './blobs';
import { buildCategories } from './categories';
import { localizeProduct } from './i18n';

const STORE = 'toyzone';
const KEY = 'catalog';

function fromSeed() {
  const catName = Object.fromEntries(seed.categories.map((c) => [c.slug, c.name]));
  return seed.products.map((p) => ({ visible: true, ...p, categoryName: p.categoryName || catName[p.category] || p.category }));
}

// Cache singkat di memori fungsi supaya tidak membaca Blobs di setiap request
let mem = { at: 0, products: null };
const TTL = 15000;

// Semua produk (termasuk yang disembunyikan), untuk admin
export async function getAllProducts({ fresh = false } = {}) {
  if (!fresh && mem.products && Date.now() - mem.at < TTL) return mem.products;
  const t = Date.now();
  const data = await getJSON(STORE, KEY);
  console.log(`[catalog] baca ${data === undefined ? 'GAGAL' : data ? 'blobs' : 'seed'} ${Date.now() - t}ms`);
  if (data === undefined) return mem.products || fromSeed(); // Blobs error: jangan cache
  const products = data?.products || fromSeed();
  mem = { at: Date.now(), products };
  return products;
}

export async function saveAllProducts(products) {
  await setJSON(STORE, KEY, { updatedAt: new Date().toISOString(), products });
  mem = { at: Date.now(), products };
}

// Teks Inggris bawaan untuk produk awal (dipakai kalau admin belum mengisi versi Inggrisnya)
const SEED_EN = Object.fromEntries(seed.products.map((p) => [p.id, p]));
export const withSeedEn = (p) => {
  const s = SEED_EN[p.id];
  if (!s) return p;
  return {
    ...p,
    nameEn: p.nameEn || (p.name === s.name ? s.nameEn : ''),
    descriptionEn: p.descriptionEn || (p.description === s.description ? s.descriptionEn : ''),
    specsEn: p.specsEn && Object.keys(p.specsEn).length ? p.specsEn : (JSON.stringify(p.specs) === JSON.stringify(s.specs) ? s.specsEn : undefined),
  };
};

// Katalog publik: hanya produk yang tampil. lang 'en' → nama/deskripsi/spesifikasi versi Inggris.
export async function getCatalog(lang = 'id') {
  const products = (await getAllProducts()).filter((p) => p.visible !== false)
    .map((p) => localizeProduct(withSeedEn(p), lang));
  return { products, categories: buildCategories(products, lang) };
}
