import { getBinary } from '../../../lib/blobs';

export const runtime = 'nodejs';

// Menampilkan foto produk yang diunggah lewat admin (nama file acak & tidak pernah berubah)
export async function GET(_req, { params }) {
  const key = params.key.join('/');
  if (!/^p\/[\w-]+\.webp$/.test(key)) return new Response('Not found', { status: 404 });
  const buf = await getBinary('toyzone-images', key);
  if (!buf) return new Response('Not found', { status: 404 });
  return new Response(buf, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
