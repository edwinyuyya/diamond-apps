import { NextResponse } from 'next/server';
import { getPost, updatePost, listPosts } from '../../../../../lib/db';
import { generateCaption } from '../../../../../lib/caption';
import { fetchProducts, snapshot } from '../../../../../lib/products';
import { pickProduct } from '../../../../../lib/planner';

export const maxDuration = 60;

// mode "caption": tulis ulang caption; mode "product": ganti produk + caption baru
export async function POST(req, { params }) {
  const { mode = 'caption', style } = await req.json().catch(() => ({}));
  const post = await getPost(params.id);
  if (!post) return NextResponse.json({ error: 'Postingan tidak ditemukan' }, { status: 404 });
  if (!['pending', 'rejected', 'failed'].includes(post.status)) return NextResponse.json({ error: 'Batalkan persetujuan dulu sebelum membuat ulang' }, { status: 409 });
  try {
    let product = post.product;
    if (mode === 'product') {
      const week = await listPosts({ weekStart: post.week_start });
      const exclude = new Set(week.map((p) => p.product.id));
      const picked = pickProduct(await fetchProducts(), post.theme, exclude);
      if (!picked) return NextResponse.json({ error: 'Tidak ada produk lain yang tersedia' }, { status: 400 });
      product = snapshot(picked);
    }
    const s = style || post.style;
    const { caption, source } = await generateCaption(product, post.theme, s);
    const updated = await updatePost(params.id, { product, caption, caption_source: source, style: s, status: 'pending', error: null }, post.status);
    return NextResponse.json({ post: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
