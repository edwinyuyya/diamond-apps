import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import { getAllProducts, saveAllProducts } from '../../../../lib/catalog';
import { slugify, categoryStyle } from '../../../../lib/categories';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const deny = await requireAdmin(req);
  if (deny) return deny;
  return NextResponse.json({ products: await getAllProducts({ fresh: true }) });
}

const int = (v) => (v === '' || v == null ? null : Math.max(0, parseInt(String(v).replace(/[^\d]/g, ''), 10) || 0));

// Simpan produk (baru atau ubah). Body: { product }
export async function POST(req) {
  const deny = await requireAdmin(req);
  if (deny) return deny;
  const { product: f } = await req.json().catch(() => ({}));
  if (!f?.name?.trim()) return NextResponse.json({ error: 'Nama produk wajib diisi' }, { status: 400 });
  if (!f?.categoryName?.trim()) return NextResponse.json({ error: 'Kategori wajib diisi' }, { status: 400 });
  const all = await getAllProducts({ fresh: true });
  const existing = f.id ? all.find((p) => p.id === f.id) : null;
  if (f.id && !existing) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });

  const category = slugify(f.categoryName) || 'lainnya';
  const catIndex = [...new Set(all.map((p) => p.category))].indexOf(category);
  const style = categoryStyle(category, catIndex < 0 ? all.length : catIndex);
  const harga = int(f.price), coret = int(f.compareAt);
  const onSale = coret && harga && coret > harga;

  let id = existing?.id;
  if (!id) {
    const prefix = (f.categoryName.match(/\b[a-z]/gi) || ['P']).join('').slice(0, 2).toUpperCase().padEnd(2, 'X');
    const used = all.map((p) => p.id).filter((x) => x.startsWith(prefix)).map((x) => parseInt(x.slice(prefix.length), 10) || 0);
    id = prefix + String(Math.max(0, ...used) + 1).padStart(3, '0');
  }
  let slug = existing?.slug;
  if (!slug) {
    slug = slugify(f.name) || id.toLowerCase();
    while (all.some((p) => p.slug === slug)) slug += '-' + id.toLowerCase();
  }
  const specs = {};
  for (const line of String(f.specsText || '').split('\n')) {
    const i = line.indexOf(':');
    if (i > 0 && line.slice(i + 1).trim()) specs[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const product = {
    ...(existing || { rating: 5, sold: 0 }),
    id, slug,
    name: f.name.trim().slice(0, 150),
    category, categoryName: f.categoryName.trim().slice(0, 50),
    series: String(f.series || '').trim().slice(0, 60),
    price: onSale ? coret : harga,
    salePrice: onSale ? harga : null,
    stock: int(f.stock) ?? 0,
    age: int(f.age) || 3,
    badge: ['Baru', 'Terlaris', 'Eksklusif'].includes(f.badge) ? f.badge : '',
    emoji: style.emoji, color: style.color,
    images: (Array.isArray(f.images) ? f.images : []).filter((u) => typeof u === 'string' && /^\/(img|produk)\//.test(u)).slice(0, 12),
    description: String(f.description || '').trim().slice(0, 3000),
    specs,
    visible: f.visible !== false,
    updatedAt: new Date().toISOString(),
  };
  const next = existing ? all.map((p) => (p.id === id ? product : p)) : [product, ...all];
  await saveAllProducts(next);
  return NextResponse.json({ product });
}
