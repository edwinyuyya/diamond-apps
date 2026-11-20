import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import sharp from 'sharp';
import { setBinary, mediaUrl } from '../../../../lib/blobs';

export const runtime = 'nodejs';

// Unggah 1 foto → dikompres ke WebP → disimpan di Blobs.
// Foto produk maks 1400px; banner slide (kind=banner) maks 1920px supaya tetap tajam di layar lebar.
export async function POST(req) {
  const deny = await requireAdmin(req);
  if (deny) return deny;
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'File foto tidak ada' }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Foto terlalu besar (maks 8 MB)' }, { status: 400 });
  try {
    const banner = form.get('kind') === 'banner';
    const max = banner ? 1920 : 1400;
    const input = Buffer.from(await file.arrayBuffer());
    const webp = await sharp(input).rotate().resize(max, max, { fit: 'inside', withoutEnlargement: true }).webp({ quality: banner ? 84 : 82 }).toBuffer();
    const key = `${banner ? 'b' : 'p'}/${crypto.randomUUID()}.webp`;
    await setBinary('toyzone-images', key, webp);
    return NextResponse.json({ url: mediaUrl(key) });
  } catch {
    return NextResponse.json({ error: 'File bukan foto yang valid' }, { status: 400 });
  }
}
