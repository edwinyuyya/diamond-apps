import { NextResponse } from 'next/server';
import { getPost, updatePost } from '../../../../../lib/db';
import { publishOne } from '../../../../../lib/publisher';

export const maxDuration = 60;

// "Posting sekarang" — hanya untuk postingan yang sudah disetujui / gagal
export async function POST(req, { params }) {
  const post = await getPost(params.id);
  if (!post) return NextResponse.json({ error: 'Postingan tidak ditemukan' }, { status: 404 });
  if (post.status === 'pending') await updatePost(params.id, { status: 'approved', approved_at: new Date().toISOString() }, 'pending');
  try {
    return NextResponse.json({ post: await publishOne(params.id, new URL(req.url).origin) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
