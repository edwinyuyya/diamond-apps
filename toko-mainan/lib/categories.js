// Gaya kategori (warna, ikon). Kategori baru dari admin otomatis dapat warna dari PALETTE.
const STYLE = {
  'blind-box': { color: '#f27c00', emoji: '🎁', desc: 'Figure & gantungan kejutan, siapa tahu dapat hidden edition' },
  rolife: { color: '#d81b60', emoji: '🏠', desc: 'Rumah miniatur DIY untuk dirakit sendiri' },
  figure: { color: '#0a63c9', emoji: '🦸', desc: 'Figure karakter untuk koleksi' },
  plush: { color: '#ad1457', emoji: '🧸', desc: 'Boneka lembut untuk segala usia' },
};
const PALETTE = ['#00897b', '#6a1b9a', '#1e88e5', '#e65100', '#2e7d32', '#c62828'];

export const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);

export function buildCategories(products) {
  const out = [];
  for (const p of products) {
    if (!p.categoryName || out.some((c) => c.slug === p.category)) continue;
    const st = STYLE[p.category] || { color: PALETTE[out.length % PALETTE.length], emoji: '🧸', desc: `Koleksi ${p.categoryName}` };
    out.push({ slug: p.category, name: p.categoryName, ...st });
  }
  return out;
}

export const categoryStyle = (slug, i = 0) => STYLE[slug] || { color: PALETTE[i % PALETTE.length], emoji: '🧸' };
