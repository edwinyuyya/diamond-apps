import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import sharp from 'sharp';
import { setBinary } from '../../../../lib/blobs';

export const runtime = 'nodejs';

// Unggah 1 foto produk → dikompres ke WebP (maks 1400px) → disimpan di Blobs
export async function POST(req) {
  const deny = await requireAdmin(req);
  if (deny) return deny;
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'File foto tidak ada' }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Foto terlalu besar (maks 8 MB)' }, { status: 400 });
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const webp = await sharp(input).rotate().resize(1400, 1400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const key = `p/${crypto.randomUUID()}.webp`;
    await setBinary('toyzone-images', key, webp);
    return NextResponse.json({ url: `/img/${key}` });
  } catch {
    return NextResponse.json({ error: 'File bukan foto yang valid' }, { status: 400 });
  }
}
