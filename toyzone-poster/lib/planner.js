import { SCHEDULE, WEEKLY_THEMES } from './config';
import { fetchProducts, snapshot } from './products';
import { generateCaption } from './caption';
import { listPosts, insertPosts } from './db';
import { nextWeekStart, wibToDate, addDays } from './time';

// Kriteria produk per tema
const MATCH = {
  baru: (p) => p.badge === 'Baru',
  promo: (p) => !!p.salePrice,
  terlaris: (p) => p.badge === 'Terlaris' || p.sold >= 100,
  koleksi: (p) => p.badge === 'Eksklusif' || p.age >= 15 || p.finalPrice >= 1000000,
  terbatas: (p) => p.stock > 0 && p.stock <= 5,
};

// Tema harus sesuai kondisi produk (mis. "Promo" hanya kalau ada harga coret)
export function themeFor(p, wanted) {
  if (MATCH[wanted]?.(p)) return wanted;
  return ['promo', 'terbatas', 'baru', 'terlaris', 'koleksi'].find((t) => MATCH[t](p)) || 'baru';
}

const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

// Pilih produk untuk tema, hindari yang sudah dipilih / baru diposting 4 minggu terakhir
export function pickProduct(products, theme, exclude) {
  const ok = products.filter((p) => p.stock > 0 && !exclude.has(p.id));
  return shuffle(ok.filter(MATCH[theme] || (() => true)))[0] || shuffle(ok)[0] || null;
}

async function recentlyUsed() {
  const since = new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString();
  const posts = await listPosts({ statuses: ['pending', 'approved', 'publishing', 'published'] });
  return new Set(posts.filter((p) => p.schedule_at >= since).map((p) => p.product.id));
}

// Buat 5 draf untuk minggu depan (Senin–Jumat). Tidak dobel kalau sudah ada.
export async function createWeeklyDrafts({ weekStart = nextWeekStart(), force = false } = {}) {
  const existing = await listPosts({ weekStart });
  const active = existing.filter((p) => p.status !== 'rejected');
  if (active.length && !force) return { created: [], skipped: true, weekStart };

  const products = await fetchProducts();
  const used = await recentlyUsed();
  const rows = [];
  const days = SCHEDULE.postDays.slice(0, SCHEDULE.postsPerWeek);
  for (let i = 0; i < days.length; i++) {
    const wanted = WEEKLY_THEMES[i % WEEKLY_THEMES.length];
    const product = pickProduct(products, wanted, used);
    if (!product) continue;
    used.add(product.id);
    const theme = themeFor(product, wanted);
    const style = theme === 'koleksi' ? 'premium' : 'jualan';
    const { caption, source } = await generateCaption(product, theme, style);
    rows.push({
      week_start: weekStart,
      product: snapshot(product),
      theme, style, caption, caption_source: source,
      schedule_at: wibToDate(addDays(weekStart, days[i] - 1), SCHEDULE.postHourWIB, SCHEDULE.postMinuteWIB).toISOString(),
      status: 'pending',
    });
  }
  const created = await insertPosts(rows);
  return { created, skipped: false, weekStart };
}
