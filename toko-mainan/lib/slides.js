// Slide banner beranda (server). Disimpan di Netlify Blobs "slides", diatur lewat /admin/slide.
// Kalau belum pernah disimpan dari admin, memakai banner bawaan di /public/banner/.
import 'server-only';
import { getJSON, setJSON } from './blobs';

const STORE = 'toyzone';
const KEY = 'slides';

const B = (n) => ({
  image: `/banner/hero-${n}.webp`, imageMobile: `/banner/hero-${n}-m.webp`,
  imageEn: `/banner/hero-${n}-en.webp`, imageMobileEn: `/banner/hero-${n}-m-en.webp`,
});
export const DEFAULT_SLIDES = [
  { id: 's1', title: 'Fat Tiger Blind Box Dragon & Tiger', titleEn: 'Fat Tiger Blind Box Dragon & Tiger', href: '/produk/fat-tiger-dragon-soaring-tiger-leaping', visible: true, ...B('fat-tiger-dragon') },
  { id: 's2', title: 'Fat Tiger Food Party gantungan tas', titleEn: 'Fat Tiger Food Party bag charm', href: '/produk/fat-tiger-food-party-plush-pendant', visible: true, ...B('food-party') },
  { id: 's3', title: 'Rolife Super Creator Bubble Tea', titleEn: 'Rolife Super Creator Bubble Tea', href: '/produk/rolife-super-creator-double-joy-bubble-tea', visible: true, ...B('rolife-bubble-tea') },
  { id: 's4', title: 'Gratis ongkir belanja Rp1 juta', titleEn: 'Free shipping on orders over Rp1 million', href: '/produk', visible: true, ...B('gratis-ongkir') },
];

let mem = { at: 0, slides: null };
const TTL = 15000;

// Semua slide (termasuk yang disembunyikan), untuk admin
export async function getSlides({ fresh = false } = {}) {
  if (!fresh && mem.slides && Date.now() - mem.at < TTL) return mem.slides;
  const data = await getJSON(STORE, KEY);
  if (data === undefined) return mem.slides || DEFAULT_SLIDES; // gagal baca: jangan di-cache
  const slides = data?.slides || DEFAULT_SLIDES;
  mem = { at: Date.now(), slides };
  return slides;
}

export const getVisibleSlides = async () => (await getSlides()).filter((s) => s.visible !== false && s.image);

export async function saveSlides(slides) {
  await setJSON(STORE, KEY, { updatedAt: new Date().toISOString(), slides });
  mem = { at: Date.now(), slides };
}
