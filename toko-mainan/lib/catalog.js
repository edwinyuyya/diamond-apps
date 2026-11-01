// Katalog produk (server). Sumber: Netlify Blobs "catalog", diisi lewat halaman /admin.
// Kalau belum pernah disimpan dari admin, memakai data awal lib/products-data.json.
import 'server-only';
import { unstable_cache, revalidateTag, revalidatePath } from 'next/cache';
import seed from './products-data.json';
import { getJSON, setJSON } from './blobs';
import { buildCategories } from './categories';

const STORE = 'toyzone';
const KEY = 'catalog';

function fromSeed() {
  const catName = Object.fromEntries(seed.categories.map((c) => [c.slug, c.name]));
  return seed.products.map((p) => ({ visible: true, ...p, categoryName: p.categoryName || catName[p.category] || p.category }));
}

// Semua produk (termasuk yang disembunyikan), untuk admin
export async function getAllProducts() {
  const data = await getJSON(STORE, KEY);
  return data?.products || fromSeed();
}

export async function saveAllProducts(products) {
  await setJSON(STORE, KEY, { updatedAt: new Date().toISOString(), products });
  revalidateTag('catalog');
  revalidatePath('/', 'layout');
}

// Katalog publik: hanya produk yang tampil
export const getCatalog = unstable_cache(async () => {
  const products = (await getAllProducts()).filter((p) => p.visible !== false);
  return { products, categories: buildCategories(products) };
}, ['catalog'], { tags: ['catalog'], revalidate: 300 });
