// Katalog produk (server). Sumber: Netlify Blobs "catalog", diisi lewat halaman /admin.
// Kalau belum pernah disimpan dari admin (atau Blobs gagal dibaca), memakai data awal lib/products-data.json.
import 'server-only';
import seed from './products-data.json';
import { getJSON, setJSON } from './blobs';
import { buildCategories } from './categories';

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

// Katalog publik: hanya produk yang tampil
export async function getCatalog() {
  const products = (await getAllProducts()).filter((p) => p.visible !== false);
  return { products, categories: buildCategories(products) };
}
