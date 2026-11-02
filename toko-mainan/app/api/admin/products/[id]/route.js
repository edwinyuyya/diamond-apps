import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin-auth';
import { getAllProducts, saveAllProducts } from '../../../../../lib/catalog';
import { remove } from '../../../../../lib/blobs';

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
  await Promise.all(p.images.filter((u) => u.startsWith('/img/')).map((u) => remove('toyzone-images', u.slice(5)).catch(() => {})));
  return NextResponse.json({ ok: true });
}
