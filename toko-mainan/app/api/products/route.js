import { NextResponse } from 'next/server';
import { PRODUCTS, CATEGORIES, finalPrice } from '../../../lib/products';
import { imgUrl } from '../../../lib/image';

// Data katalog untuk aplikasi Toyzone Poster (konten Instagram otomatis)
export const dynamic = 'force-dynamic';

export function GET(req) {
  const origin = new URL(req.url).origin;
  const abs = (src) => {
    const u = imgUrl(src, 1200);
    return u.startsWith('/') ? origin + u : u;
  };
  const products = PRODUCTS.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, category: p.category,
    categoryName: CATEGORIES.find((c) => c.slug === p.category)?.name || '',
    price: p.price, salePrice: p.salePrice ?? null, finalPrice: finalPrice(p),
    age: p.age, stock: p.stock, badge: p.badge, rating: p.rating, sold: p.sold,
    emoji: p.emoji, color: p.color, description: p.description, specs: p.specs || {},
    images: (p.images || []).map(abs),
    url: `${origin}/produk/${p.slug}`,
  }));
  return NextResponse.json({ store: origin, products });
}
