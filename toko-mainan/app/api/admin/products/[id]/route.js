import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin-auth';
import { getAllProducts, saveAllProducts } from '../../../../../lib/catalog';
import { remove } from '../../../../../lib/blobs';

// Kunci file foto hasil unggahan admin (foto bawaan di /produk/ tidak dihapus)
const mediaKey = (u) => (u.startsWith('/img/') ? u.slice(5) : u.includes('?media=') ? decodeURIComponent(u.split('?media=')[1]) : null);

// Ubah cepat (tampil/sembunyi, stok) dari daftar produk
export async function PATCH(req, { params }) {
  const deny = await requireAdmin(req);
  if (deny) return deny;
  const body = await req.json().catch(() => ({}));
  const all = await getAllProducts({ fresh: true });
  const p = all.find((x) => x.id === params.id);
  if (!p) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
  if (typeof body.visible === 'boolean') p.visible = body.visible;
  if (body.stock != null) p.stock = Math.max(0, parseInt(body.stock, 10) || 0);
  p.updatedAt = new Date().toISOString();
  await saveAllProducts(all);
  return NextResponse.json({ product: p });
}

export async function DELETE(req, { params }) {
  const deny = await requireAdmin(req);
  if (deny) return deny;
  const all = await getAllProducts({ fresh: true });
  const p = all.find((x) => x.id === params.id);
  if (!p) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
  await saveAllProducts(all.filter((x) => x.id !== params.id));
  // hapus foto hasil unggahan admin
  await Promise.all(p.images.map(mediaKey).filter(Boolean).map((k) => remove('toyzone-images', k).catch(() => {})));
  return NextResponse.json({ ok: true });
}
