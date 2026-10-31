// Template gambar postingan Instagram Toyzone (1080x1350, rasio 4:5)
import { ImageResponse } from 'next/og';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { BRAND, THEMES } from './config';
import { rupiah } from './products';

const ROOT = process.cwd();
let fontsCache;
async function fonts() {
  if (fontsCache) return fontsCache;
  const f = (n) => fs.readFile(path.join(ROOT, 'fonts', n));
  fontsCache = [
    { name: 'Outfit', data: await f('Outfit-500.ttf'), weight: 500, style: 'normal' },
    { name: 'Outfit', data: await f('Outfit-700.ttf'), weight: 700, style: 'normal' },
    { name: 'Outfit', data: await f('Outfit-800.ttf'), weight: 800, style: 'normal' },
    { name: 'Fredoka', data: await f('Fredoka-700.ttf'), weight: 700, style: 'normal' },
  ];
  return fontsCache;
}

const emojiCode = (e) => [...(e || '')].map((c) => c.codePointAt(0).toString(16)).filter((c) => c !== 'fe0f').join('-');
async function emojiDataUri(e) {
  try {
    const svg = await fs.readFile(path.join(ROOT, 'emoji', emojiCode(e) + '.svg'));
    return 'data:image/svg+xml;base64,' + svg.toString('base64');
  } catch { return null; }
}

// Latar putih yang menyambung ke tepi foto dibuat transparan (flood fill dari tepi),
// jadi produk menyatu dengan frame. Bagian putih DI DALAM produk tidak ikut terhapus.
function removeEdgeWhite(px, w, h) {
  const near = (i) => px[i] > 232 && px[i + 1] > 232 && px[i + 2] > 232;
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const k = stack.pop();
    if (seen[k]) continue;
    seen[k] = 1;
    if (!near(k * 4)) continue;
    px[k * 4 + 3] = 0;
    const x = k % w, y = (k / w) | 0;
    if (x > 0) stack.push(k - 1);
    if (x < w - 1) stack.push(k + 1);
    if (y > 0) stack.push(k - w);
    if (y < h - 1) stack.push(k + w);
  }
}

// Foto produk (jpg/png/webp dari website/Drive) → PNG data URI untuk template
async function photoDataUri(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const { data, info } = await sharp(buf).resize(820, 820, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    removeEdgeWhite(data, info.width, info.height);
    const png = await sharp(data, { raw: info }).png().toBuffer();
    return 'data:image/png;base64,' + png.toString('base64');
  } catch { return null; }
}

// Logo asli Toyzone (brand/logo.png, latar transparan)
let logoCache;
async function logoDataUri() {
  if (!logoCache) logoCache = 'data:image/png;base64,' + (await fs.readFile(path.join(ROOT, 'brand', 'logo.png'))).toString('base64');
  return logoCache;
}

export async function renderPost(post, format = 'jpeg') {
  const p = post.product;
  const theme = THEMES[post.theme] || THEMES.baru;
  const [photo, emoji, logo] = await Promise.all([photoDataUri(p.image), emojiDataUri(p.emoji), logoDataUri()]);
  const disc = p.salePrice ? Math.round((1 - p.salePrice / p.price) * 100) : 0;
  const tint = p.color || theme.color;

  const img = new ImageResponse(
    (
      <div style={{ width: 1080, height: 1350, display: 'flex', flexDirection: 'column', background: '#fff8e7', fontFamily: 'Outfit' }}>
        {/* header kuning */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 150, padding: '0 60px', background: '#ffd400' }}>
          <img src={logo} width={290} height={114} />
          <div style={{ display: 'flex', background: theme.color, color: '#fff', fontWeight: 800, fontSize: 30, letterSpacing: 2, padding: '14px 30px', borderRadius: 999 }}>{theme.tag}</div>
        </div>

        {/* frame produk */}
        <div style={{ display: 'flex', flex: 1, padding: '44px 60px 0', position: 'relative' }}>
          <div style={{
            display: 'flex', flex: 1, position: 'relative', alignItems: 'center', justifyContent: 'center',
            borderRadius: 36, border: `10px solid ${tint}`,
            backgroundColor: '#ffffff',
            backgroundImage: `radial-gradient(circle at 50% 45%, #ffffff 0%, #ffffff 38%, ${tint}22 100%)`,
          }}>
            {/* pola stud brick */}
            <div style={{ display: 'flex', position: 'absolute', top: 14, left: 14, right: 14, bottom: 14, borderRadius: 24, border: '3px solid #ffffff',
              backgroundImage: `radial-gradient(circle, ${tint}30 4px, transparent 5px)`, backgroundSize: '34px 34px' }} />
            <div style={{ display: 'flex', position: 'absolute', left: 200, right: 200, bottom: 70, height: 60, backgroundImage: 'radial-gradient(closest-side, rgba(0,0,0,0.22), rgba(0,0,0,0))' }} />
            {photo ? (
              <img src={photo} width={600} height={600} style={{ objectFit: 'contain' }} />
            ) : emoji ? (
              <img src={emoji} width={440} height={440} />
            ) : (
              <div style={{ display: 'flex', fontSize: 120, color: tint, fontFamily: 'Fredoka' }}>{BRAND.name}</div>
            )}
            <div style={{ display: 'flex', position: 'absolute', top: 30, left: 30, background: '#0b2d5e', color: '#fff', fontSize: 26, fontWeight: 700, padding: '8px 20px', borderRadius: 999 }}>{p.categoryName}</div>
            <div style={{ display: 'flex', position: 'absolute', bottom: 30, left: 30, background: '#fff', color: '#0b2d5e', fontSize: 24, fontWeight: 700, padding: '6px 16px', borderRadius: 12, border: '2px solid #0b2d5e' }}>{`Usia ${p.age}+`}</div>
            {disc > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: -30, right: -20, width: 170, height: 170, borderRadius: 999, background: '#e3000b', color: '#fff', border: '8px solid #fff8e7', transform: 'rotate(10deg)' }}>
                <span style={{ fontSize: 26, fontWeight: 700 }}>HEMAT</span>
                <span style={{ fontSize: 58, fontWeight: 800, lineHeight: 1 }}>{`${disc}%`}</span>
              </div>
            )}
            {p.stock > 0 && p.stock <= 5 && (
              <div style={{ display: 'flex', position: 'absolute', bottom: 30, right: 30, background: '#7b1fa2', color: '#fff', fontSize: 24, fontWeight: 700, padding: '6px 16px', borderRadius: 12 }}>{`Sisa ${p.stock} pcs`}</div>
            )}
          </div>
        </div>

        {/* nama & harga */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '30px 60px 26px' }}>
          <div style={{ display: 'flex', fontFamily: 'Fredoka', fontSize: p.name.length > 38 ? 46 : 56, color: '#0b2d5e', lineHeight: 1.1 }}>{p.name}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 14 }}>
            <span style={{ fontSize: 76, fontWeight: 800, color: p.salePrice ? '#e3000b' : '#111' }}>{rupiah(p.finalPrice ?? p.salePrice ?? p.price)}</span>
            {p.salePrice ? <span style={{ fontSize: 40, fontWeight: 500, color: '#888', textDecoration: 'line-through', marginLeft: 24 }}>{rupiah(p.price)}</span> : null}
          </div>
        </div>

        {/* footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 110, padding: '0 60px', background: '#0b2d5e', color: '#fff' }}>
          <span style={{ fontSize: 32, fontWeight: 700 }}>{`Order: link di bio · WA ${BRAND.whatsapp}`}</span>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#ffd400' }}>{BRAND.instagram}</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, fonts: await fonts() }
  );
  const png = Buffer.from(await img.arrayBuffer());
  if (format === 'png') return { buf: png, type: 'image/png' };
  return { buf: await sharp(png).jpeg({ quality: 90 }).toBuffer(), type: 'image/jpeg' };
}
