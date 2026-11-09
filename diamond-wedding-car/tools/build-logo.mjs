// Generator logo resmi DIAMOND WEDDING CAR.
// Semua teks dikonversi menjadi path (outline), sehingga file SVG tampil identik
// di percetakan, sticker mobil, bordir, dan media sosial tanpa perlu font terpasang.
//
// Jalankan:  cd diamond-wedding-car/tools && npm install && node build-logo.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const fontDir = path.join(root, 'fonts');
const outDir = path.join(root, 'logo');
fs.mkdirSync(outDir, { recursive: true });

const load = (f) => opentype.loadSync(path.join(fontDir, f));
const CINZEL = load('cinzel-latin-500-normal.woff');
const MONT = load('montserrat-latin-400-normal.woff');
const MONT_L = load('montserrat-latin-300-normal.woff');
const CORM_I = load('cormorant-garamond-latin-500-italic.woff');

// Warna brand
export const C = {
  emerald: '#10392E',
  emeraldDeep: '#0A261F',
  champagne: '#C6A15B',
  champagneLight: '#E3C98E',
  ivory: '#F5F0E6',
  charcoal: '#242424',
  white: '#FFFFFF',
};

const r = (n) => Math.round(n * 100) / 100;

// Lebar teks dengan tracking (em/1000, seperti di Illustrator)
function measure(font, text, size, tracking = 0) {
  let w = 0;
  const glyphs = font.stringToGlyphs(text);
  glyphs.forEach((g, i) => {
    w += (g.advanceWidth / font.unitsPerEm) * size;
    if (i < glyphs.length - 1) {
      const k = font.getKerningValue(g, glyphs[i + 1]);
      w += (k / font.unitsPerEm) * size + (tracking / 1000) * size;
    }
  });
  return w;
}

// Path teks rata tengah pada cx (anchor 'middle') atau kiri (anchor 'start')
function text(font, str, size, { x = 0, y = 0, tracking = 0, anchor = 'middle', fill }) {
  const w = measure(font, str, size, tracking);
  let cx = anchor === 'middle' ? x - w / 2 : x;
  const glyphs = font.stringToGlyphs(str);
  let d = '';
  glyphs.forEach((g, i) => {
    d += g.getPath(cx, y, size).toPathData(2);
    cx += (g.advanceWidth / font.unitsPerEm) * size;
    if (i < glyphs.length - 1) {
      cx += (font.getKerningValue(g, glyphs[i + 1]) / font.unitsPerEm) * size + (tracking / 1000) * size;
    }
  });
  return { svg: `<path fill="${fill}" d="${d}"/>`, width: w };
}

// Ikon berlian geometris (brilliant cut, tampak samping) + kilau bintang.
// Koordinat dasar 120 x 100; diskalakan dengan s, posisi pusat atas (cx, top).
function gem({ cx, top, s = 1, stroke, sparkle = true, sw = 2.2, fillTable }) {
  const X = (v) => r(cx + (v - 60) * s);
  const Y = (v) => r(top + v * s);
  const P = (pts) => pts.map(([a, b]) => `${X(a)},${Y(b)}`).join(' ');
  const w = r(sw * s);
  let out = `<g fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round">`;
  if (fillTable) out += `<polygon points="${P([[30, 0], [90, 0], [120, 30], [60, 100], [0, 30]])}" fill="${fillTable}" stroke="none"/>`;
  // Siluet
  out += `<polygon points="${P([[30, 0], [90, 0], [120, 30], [60, 100], [0, 30]])}"/>`;
  // Girdle
  out += `<line x1="${X(0)}" y1="${Y(30)}" x2="${X(120)}" y2="${Y(30)}"/>`;
  // Faset crown (zigzag)
  out += `<polyline points="${P([[0, 30], [30, 0], [40, 30], [60, 0], [80, 30], [90, 0], [120, 30]])}"/>`;
  // Faset pavilion
  out += `<polyline points="${P([[40, 30], [60, 100], [80, 30]])}"/>`;
  out += `<polyline points="${P([[20, 30], [60, 100], [100, 30]])}" stroke-width="${r(w * 0.55)}"/>`;
  out += `</g>`;
  if (sparkle) {
    // Bintang empat sudut di kanan atas
    const sx = 122, sy = -6, a = 13, b = 2.6;
    const pts = [[sx, sy - a], [sx + b, sy - b], [sx + a, sy], [sx + b, sy + b], [sx, sy + a], [sx - b, sy + b], [sx - a, sy], [sx - b, sy - b]];
    out += `<polygon fill="${stroke}" points="${P(pts)}"/>`;
  }
  return out;
}

// Garis aksen emas tipis dengan berlian kecil di tengah
function rule({ cx, y, half, gap = 12, color, sw = 1.4 }) {
  const d = 4.2;
  return `<g stroke="${color}" stroke-width="${sw}" fill="none">` +
    `<line x1="${r(cx - half)}" y1="${y}" x2="${r(cx - gap)}" y2="${y}"/>` +
    `<line x1="${r(cx + gap)}" y1="${y}" x2="${r(cx + half)}" y2="${y}"/></g>` +
    `<polygon fill="${color}" points="${cx},${r(y - d)} ${r(cx + d)},${y} ${cx},${r(y + d)} ${r(cx - d)},${y}"/>`;
}

const svgDoc = (w, h, body, bg, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">` +
  `<title>${title}</title>` + (bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : '') + body + `</svg>\n`;

// ── 1. Logo utama (stacked) ─────────────────────────────────────────────
function primary({ bg, gemColor, word, sub, accent, tagline = true, title }) {
  const W = 1000, H = tagline ? 720 : 640, cx = W / 2;
  let b = gem({ cx, top: 70, s: 1.55, stroke: gemColor });
  const dia = text(CINZEL, 'DIAMOND', 132, { x: cx, y: 390, tracking: 120, fill: word });
  b += dia.svg;
  b += rule({ cx, y: 440, half: dia.width / 2, color: accent });
  b += text(MONT, 'WEDDING CAR', 38, { x: cx, y: 510, tracking: 520, fill: sub }).svg;
  if (tagline) b += text(MONT_L, 'LUXURY WEDDING TRANSPORTATION', 19.5, { x: cx, y: 600, tracking: 420, fill: accent }).svg;
  return svgDoc(W, H, b, bg, title);
}

// ── 2. Logo horizontal ─────────────────────────────────────────────────
function horizontal({ bg, gemColor, word, sub, accent, title }) {
  const W = 1200, H = 300;
  let b = gem({ cx: 150, top: 78, s: 1.35, stroke: gemColor });
  const x0 = 305;
  const dia = text(CINZEL, 'DIAMOND', 104, { x: x0, y: 160, tracking: 110, anchor: 'start', fill: word });
  b += dia.svg;
  b += `<line x1="${x0}" y1="190" x2="${r(x0 + dia.width)}" y2="190" stroke="${accent}" stroke-width="1.4"/>`;
  // Ratakan "WEDDING CAR" tepat sepanjang kata DIAMOND
  const size = 40, letters = 'WEDDING CAR'.length;
  const trk = ((dia.width - measure(MONT, 'WEDDING CAR', size)) / (letters - 1) / size) * 1000;
  b += text(MONT, 'WEDDING CAR', size, { x: x0, y: 248, tracking: trk, anchor: 'start', fill: sub }).svg;
  return svgDoc(W, H, b, bg, title);
}

// ── 3. Monogram / ikon (avatar Instagram, stempel, bordir) ─────────────
function monogram({ bg, ring, gemColor, word, title, circle = true }) {
  const W = 800, H = 800, cx = 400;
  let b = '';
  if (circle) {
    b += `<circle cx="${cx}" cy="400" r="400" fill="${bg}"/>`;
    b += `<circle cx="${cx}" cy="400" r="352" fill="none" stroke="${ring}" stroke-width="3"/>`;
    b += `<circle cx="${cx}" cy="400" r="340" fill="none" stroke="${ring}" stroke-width="1" opacity=".7"/>`;
  }
  b += gem({ cx: cx - 8, top: 205, s: 2.15, stroke: gemColor, sw: 2 });
  b += text(CINZEL, 'DIAMOND', 74, { x: cx, y: 545, tracking: 140, fill: word }).svg;
  b += text(MONT, 'WEDDING CAR', 27, { x: cx, y: 600, tracking: 520, fill: ring }).svg;
  return svgDoc(W, H, b, null, title);
}

// ── 4. Simbol saja ─────────────────────────────────────────────────────
function symbol({ color, title }) {
  const W = 300, H = 280;
  return svgDoc(W, H, gem({ cx: 140, top: 50, s: 1.8, stroke: color, sw: 2 }), null, title);
}

// ── 5. Plat nama mobil (wedding plate) ─────────────────────────────────
function plate({ couple = false, title }) {
  // Proporsi plat mobil Indonesia ± 430 x 135 mm
  const W = 1290, H = 405, cx = W / 2;
  let b = `<rect width="${W}" height="${H}" rx="26" fill="${C.emerald}"/>`;
  b += `<rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="16" fill="none" stroke="${C.champagne}" stroke-width="4"/>`;
  b += `<rect x="30" y="30" width="${W - 60}" height="${H - 60}" rx="10" fill="none" stroke="${C.champagne}" stroke-width="1.3" opacity=".8"/>`;
  if (couple) {
    b += gem({ cx, top: 62, s: 0.62, stroke: C.champagne, sparkle: false, sw: 3 });
    b += text(CORM_I, 'Nama & Nama', 128, { x: cx, y: 250, tracking: 10, fill: C.ivory }).svg;
    b += rule({ cx, y: 288, half: 230, color: C.champagne, sw: 1.6 });
    b += text(MONT, 'DIAMOND WEDDING CAR', 25, { x: cx, y: 345, tracking: 520, fill: C.champagne }).svg;
  } else {
    b += gem({ cx: 175, top: 140, s: 1.05, stroke: C.champagne, sw: 2.6 });
    const dia = text(CINZEL, 'DIAMOND', 150, { x: cx + 95, y: 245, tracking: 110, fill: C.ivory });
    b += dia.svg;
    b += text(MONT, 'WEDDING CAR', 32, { x: cx + 95, y: 318, tracking: 720, fill: C.champagne }).svg;
  }
  return svgDoc(W, H, b, null, title);
}

const files = {
  'diamond-logo-primary-emerald.svg': primary({ bg: C.emerald, gemColor: C.champagne, word: C.ivory, sub: C.champagne, accent: C.champagne, title: 'DIAMOND WEDDING CAR – logo utama (emerald)' }),
  'diamond-logo-primary-ivory.svg': primary({ bg: C.ivory, gemColor: C.champagne, word: C.emerald, sub: C.emerald, accent: C.champagne, title: 'DIAMOND WEDDING CAR – logo utama (ivory)' }),
  'diamond-logo-primary-black.svg': primary({ bg: C.charcoal, gemColor: C.champagne, word: C.ivory, sub: C.champagne, accent: C.champagne, title: 'DIAMOND WEDDING CAR – logo utama (hitam premium)' }),
  'diamond-logo-primary-transparent.svg': primary({ bg: null, gemColor: C.champagne, word: C.emerald, sub: C.emerald, accent: C.champagne, title: 'DIAMOND WEDDING CAR – logo utama (transparan)' }),
  'diamond-logo-primary-reverse.svg': primary({ bg: null, gemColor: C.champagne, word: C.ivory, sub: C.champagne, accent: C.champagne, title: 'DIAMOND WEDDING CAR – logo utama untuk latar gelap (transparan)' }),
  'diamond-logo-gold-mono.svg': primary({ bg: null, gemColor: C.champagne, word: C.champagne, sub: C.champagne, accent: C.champagne, title: 'DIAMOND WEDDING CAR – satu warna emas (sticker/bordir)' }),
  'diamond-logo-white-mono.svg': primary({ bg: null, gemColor: C.white, word: C.white, sub: C.white, accent: C.white, title: 'DIAMOND WEDDING CAR – satu warna putih (sticker kaca)' }),
  'diamond-logo-horizontal-emerald.svg': horizontal({ bg: C.emerald, gemColor: C.champagne, word: C.ivory, sub: C.champagne, accent: C.champagne, title: 'DIAMOND WEDDING CAR – logo horizontal (emerald)' }),
  'diamond-logo-horizontal-ivory.svg': horizontal({ bg: null, gemColor: C.champagne, word: C.emerald, sub: C.emerald, accent: C.champagne, title: 'DIAMOND WEDDING CAR – logo horizontal' }),
  'diamond-logo-horizontal-reverse.svg': horizontal({ bg: null, gemColor: C.champagne, word: C.ivory, sub: C.champagne, accent: C.champagne, title: 'DIAMOND WEDDING CAR – logo horizontal untuk latar gelap (transparan)' }),
  'diamond-monogram-emerald.svg': monogram({ bg: C.emerald, ring: C.champagne, gemColor: C.champagne, word: C.ivory, title: 'DIAMOND WEDDING CAR – monogram (avatar)' }),
  'diamond-monogram-black.svg': monogram({ bg: C.charcoal, ring: C.champagne, gemColor: C.champagne, word: C.ivory, title: 'DIAMOND WEDDING CAR – monogram hitam' }),
  'diamond-symbol-gold.svg': symbol({ color: C.champagne, title: 'Simbol berlian DIAMOND (emas)' }),
  'diamond-symbol-emerald.svg': symbol({ color: C.emerald, title: 'Simbol berlian DIAMOND (emerald)' }),
  'diamond-plate-brand.svg': plate({ title: 'Plat nama mobil – DIAMOND WEDDING CAR' }),
  'diamond-plate-couple.svg': plate({ couple: true, title: 'Plat nama mobil – nama pengantin' }),
};

for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, name), svg);
  console.log('✓', name, (svg.length / 1024).toFixed(1) + ' KB');
}
