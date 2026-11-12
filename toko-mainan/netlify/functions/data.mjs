// Fungsi Netlify untuk penyimpanan Toyzone (Netlify Blobs), alamat: /.netlify/functions/data
//   ?media=<key>                                → foto produk (publik, cache permanen)
//   ?kind=json|bin&store=<store>&key=<key>      → baca/simpan/hapus data (khusus server, butuh secret)
import { getStore } from '@netlify/blobs';

const STORES = new Set(['toyzone', 'toyzone-images']);
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  const q = new URL(req.url).searchParams;

  const media = q.get('media');
  if (media) {
    if (!/^p\/[\w-]+\.webp$/.test(media)) return new Response('Not found', { status: 404 });
    const buf = await getStore('toyzone-images').get(media, { type: 'arrayBuffer' });
    if (!buf) return new Response('Not found', { status: 404 });
    return new Response(buf, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' } });
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret || req.headers.get('x-data-secret') !== secret) return json({ error: 'forbidden' }, 403);
  const kind = q.get('kind'), name = q.get('store'), key = q.get('key');
  if (!['json', 'bin'].includes(kind) || !STORES.has(name) || !key) return json({ error: 'bad request' }, 400);
  const store = getStore(name);

  if (req.method === 'GET' && kind === 'json') {
    const data = await store.get(key, { type: 'json' });
    return json({ found: data != null, data: data ?? null });
  }
  if (req.method === 'PUT') {
    if (kind === 'json') await store.setJSON(key, await req.json());
    else await store.set(key, await req.arrayBuffer());
    return json({ ok: true });
  }
  if (req.method === 'DELETE') {
    await store.delete(key);
    return json({ ok: true });
  }
  return json({ error: 'method not allowed' }, 405);
};
