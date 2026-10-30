import { getPost } from '../../../../lib/db';
import { renderPost } from '../../../../lib/render';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Gambar postingan (JPEG). Publik karena Instagram perlu mengunduhnya; id berupa UUID acak.
export async function GET(_req, { params }) {
  const post = await getPost(params.id);
  if (!post) return new Response('Not found', { status: 404 });
  const { buf, type } = await renderPost(post);
  return new Response(buf, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=300' } });
}
