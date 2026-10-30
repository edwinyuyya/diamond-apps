import { BRAND } from './config';

// Ambil katalog dari website Toyzone (endpoint /api/products)
export async function fetchProducts() {
  const res = await fetch(`${BRAND.storeUrl.replace(/\/$/, '')}/api/products`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Gagal ambil produk dari website (${res.status})`);
  const { products } = await res.json();
  return products;
}

// Snapshot produk yang disimpan di draf (supaya draf tidak berubah kalau katalog berubah)
export const snapshot = (p) => ({
  id: p.id, slug: p.slug, name: p.name, categoryName: p.categoryName,
  price: p.price, salePrice: p.salePrice, finalPrice: p.finalPrice, age: p.age, stock: p.stock,
  badge: p.badge, emoji: p.emoji, color: p.color, description: p.description, specs: p.specs,
  image: p.images?.[0] || null, url: p.url,
});

export const rupiah = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');
