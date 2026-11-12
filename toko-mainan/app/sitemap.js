import { getCatalog } from '../lib/catalog';
import { CANONICAL } from '../lib/site-url';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const now = new Date();
  const pages = ['', '/produk', '/cara-belanja'].map((p) => ({
    url: `${CANONICAL}${p}`,
    lastModified: now,
    changeFrequency: p === '' ? 'daily' : 'weekly',
    priority: p === '' ? 1 : 0.8,
  }));
  let products = [];
  try {
    products = (await getCatalog('id')).products.map((p) => ({
      url: `${CANONICAL}/produk/${p.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  } catch {}
  return [...pages, ...products];
}
