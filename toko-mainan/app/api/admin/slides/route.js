import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import { getSlides, saveSlides, DEFAULT_SLIDES } from '../../../../lib/slides';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const deny = await requireAdmin(req);
  if (deny) return deny;
  return NextResponse.json({ slides: await getSlides({ fresh: true }), defaults: DEFAULT_SLIDES });
}

// Gambar hanya boleh dari banner bawaan atau hasil unggahan admin
const IMG = /^\/(banner\/[\w.-]+\.webp|img\/[\w./-]+|\.netlify\/functions\/data\?media=[\w%.-]+)$/;
const img = (v) => (typeof v === 'string' && IMG.test(v) ? v : '');
const link = (v) => {
  const s = String(v || '').trim();
  return /^\/(?!\/)/.test(s) || /^https:\/\//.test(s) ? s.slice(0, 300) : '/produk';
};
const text = (v, n = 120) => String(v || '').trim().slice(0, n);

// Simpan seluruh daftar slide. Body: { slides: [...] }
export async function PUT(req) {
  const deny = await requireAdmin(req);
  if (deny) return deny;
  const { slides } = await req.json().catch(() => ({}));
  if (!Array.isArray(slides)) return NextResponse.json({ error: 'Data slide tidak valid' }, { status: 400 });
  const clean = slides.slice(0, 10).map((s, i) => ({
    id: text(s.id, 40) || `s${Date.now()}${i}`,
    title: text(s.title), titleEn: text(s.titleEn),
    href: link(s.href),
    image: img(s.image), imageMobile: img(s.imageMobile),
    imageEn: img(s.imageEn), imageMobileEn: img(s.imageMobileEn),
    visible: s.visible !== false,
  }));
  if (clean.some((s) => !s.image)) return NextResponse.json({ error: 'Setiap slide wajib punya gambar utama (desktop)' }, { status: 400 });
  await saveSlides(clean);
  return NextResponse.json({ slides: clean });
}
