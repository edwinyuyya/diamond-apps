import { NextResponse } from 'next/server';
import { getPost, updatePost } from '../../../../lib/db';

// Perpindahan status yang diizinkan dari dashboard
const NEXT = {
  pending: ['approved', 'rejected'],
  approved: ['pending'],
  rejected: ['pending'],
  failed: ['approved', 'rejected'],
};

export async function PATCH(req, { params }) {
  const body = await req.json().catch(() => ({}));
  const post = await getPost(params.id);
  if (!post) return NextResponse.json({ error: 'Postingan tidak ditemukan' }, { status: 404 });
  if (['publishing', 'published'].includes(post.status)) return NextResponse.json({ error: 'Postingan sudah/sedang terbit' }, { status: 409 });

  const patch = {};
  if (typeof body.caption === 'string') {
    if (!body.caption.trim()) return NextResponse.json({ error: 'Caption tidak boleh kosong' }, { status: 400 });
    if (body.caption.length > 2200) return NextResponse.json({ error: 'Caption maksimal 2.200 karakter (batas Instagram)' }, { status: 400 });
    patch.caption = body.caption;
  }
  if (body.scheduleAt) {
    const d = new Date(body.scheduleAt);
    if (isNaN(d)) return NextResponse.json({ error: 'Jadwal tidak valid' }, { status: 400 });
    patch.schedule_at = d.toISOString();
  }
  if (body.status) {
    if (!(NEXT[post.status] || []).includes(body.status)) return NextResponse.json({ error: `Tidak bisa mengubah status ${post.status} → ${body.status}` }, { status: 400 });
    patch.status = body.status;
    if (body.status === 'approved') patch.approved_at = new Date().toISOString();
    if (body.status === 'approved' || body.status === 'pending') patch.error = null;
  }
  const updated = await updatePost(params.id, patch, post.status);
  if (!updated) return NextResponse.json({ error: 'Status berubah, muat ulang halaman' }, { status: 409 });
  return NextResponse.json({ post: updated });
}
