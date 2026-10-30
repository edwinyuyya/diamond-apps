import { listPosts, updatePost, getPost } from './db';
import { publishPhoto } from './instagram';

export function imageUrlFor(post, baseUrl) {
  const base = (process.env.APP_URL || baseUrl).replace(/\/$/, '');
  // versi (updated_at) supaya Instagram tidak memakai gambar lama dari cache
  return `${base}/api/image/${post.id}?v=${encodeURIComponent(post.updated_at || '')}`;
}

export async function publishOne(id, baseUrl) {
  // kunci status supaya tidak terposting dobel
  const post = await updatePost(id, { status: 'publishing' }, ['approved', 'failed']);
  if (!post) {
    const cur = await getPost(id);
    throw new Error(cur ? `Status postingan "${cur.status}", tidak bisa diposting` : 'Postingan tidak ditemukan');
  }
  try {
    const { mediaId, permalink } = await publishPhoto(imageUrlFor(post, baseUrl), post.caption);
    return await updatePost(id, { status: 'published', ig_media_id: mediaId, permalink, published_at: new Date().toISOString(), error: null });
  } catch (e) {
    await updatePost(id, { status: 'failed', error: e.message });
    throw e;
  }
}

// Dipanggil cron: posting semua yang sudah disetujui & sudah waktunya
export async function publishDue(baseUrl) {
  const now = new Date().toISOString();
  const due = (await listPosts({ statuses: ['approved'] })).filter((p) => p.schedule_at <= now);
  const results = [];
  for (const p of due) {
    try { const r = await publishOne(p.id, baseUrl); results.push({ id: p.id, ok: true, permalink: r.permalink }); }
    catch (e) { results.push({ id: p.id, ok: false, error: e.message }); }
  }
  return results;
}
