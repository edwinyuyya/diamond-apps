import Link from 'next/link';
import HeroSlider from '../components/home/HeroSlider';
import TileTabs from '../components/home/TileTabs';
import Offers from '../components/home/Offers';
import ProductRail from '../components/home/ProductRail';
import GiftFinder from '../components/home/GiftFinder';
import ProductCard from '../components/ProductCard';
import { getCatalog } from '../lib/catalog';
import { IcRight } from '../components/Icons';
import { imgUrl } from '../lib/image';
import FrameTag from '../components/FrameTag';
import { getLang } from '../lib/lang-server';
import { t as tr } from '../lib/i18n';

const FT1 = '/produk/fat-tiger-dragon-soaring-tiger-leaping';
const FT2 = '/produk/fat-tiger-food-party-plush-pendant';
const RL = '/produk/rolife-super-creator-double-joy-bubble-tea';

// Foto banner pita kuning (link Google Drive atau path di /public)
const BAND_IMAGE = `${FT2}/02.webp`;

// Foto galeri "Lihat Koleksi Mereka" (5 kotak)
const GALLERY = [
  { img: `${FT2}/03.webp`, href: FT2, color: '#e65100' },
  { img: `${FT1}/03.webp`, href: FT1, color: '#f27c00' },
  { img: `${RL}/01.webp`, href: RL, color: '#d81b60' },
  { img: `${FT1}/04.webp`, href: FT1, color: '#f27c00' },
  { img: `${FT2}/04.webp`, href: FT2, color: '#e65100' },
];

// 4 promo tile (2x2), gambar dibuat oleh scripts/make_banners.py (versi Inggris: promo-*-en.webp)
const PROMOS = [
  { title: 'promo.1', href: FT1, banner: 'fat-tiger-dragon' },
  { title: 'promo.2', href: FT2, banner: 'food-party' },
  { title: 'promo.3', href: RL, banner: 'rolife' },
  { title: 'promo.4', href: '/produk?kategori=blind-box', banner: 'segera-hadir' },
];

export default async function Home() {
  const lang = getLang();
  const t = (k, v) => tr(lang, k, v);
  const { products: PRODUCTS } = await getCatalog(lang);
  const popular = [...PRODUCTS].sort((a, b) => b.sold - a.sold);
  const featured = PRODUCTS.filter((p) => ['Baru', 'Eksklusif'].includes(p.badge));
  const sale = PRODUCTS.filter((p) => p.salePrice);
  const gifts = PRODUCTS;
  return (
    <>
      <HeroSlider />
      <TileTabs />
      <Offers groups={Object.fromEntries(Object.entries({ popular, featured, sale }).filter(([, v]) => v.length))} />

      <section className="band">
        <div className="wrap">
          <Link href="/produk?kategori=blind-box" className="band-banner">
            <div className="band-art bframe">{BAND_IMAGE ? <img src={imgUrl(BAND_IMAGE, 1200)} alt="" referrerPolicy="no-referrer" /> : '🎁🐯🧋'}<FrameTag /></div>
            <div className="band-txt">
              <h3>{t('home.band1')}<br /><em>{t('home.band2')}</em></h3>
              <span className="band-cta">{t('home.shopNow')}</span>
            </div>
          </Link>
          <ProductRail products={gifts} />
        </div>
      </section>

      <section className="sec">
        <div className="wrap promos">
          {PROMOS.map((p) => (
            <Link key={p.title} href={p.href} className="promo promo-banner" aria-label={t(p.title)}>
              <img src={imgUrl(`/banner/promo-${p.banner}${lang === 'en' ? '-en' : ''}.webp`, 1200)} alt={t(p.title)} loading="lazy" />
            </Link>
          ))}
        </div>
      </section>

      <GiftFinder />

      <section className="sec">
        <div className="wrap">
          <h2 className="sec-title center">{t('home.gallery')}</h2>
          <p className="center muted sub">{t('home.galleryText')} <a href="https://instagram.com/toyzone888" target="_blank" rel="noreferrer" className="ig-link">@toyzone888</a></p>
          <div className="mosaic">
            {GALLERY.map((g, i) => (
              <Link key={i} href={g.href} className={`mosaic-item bframe m${i}`} style={{ '--c': g.color }}>
                <img src={imgUrl(g.img, 1000)} alt="" referrerPolicy="no-referrer" /><i>+</i>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <h2 className="sec-title">{t('common.allProducts')}</h2>
            <Link href="/produk" className="btn-outline">{t('common.viewAll')} <IcRight size={18} /></Link>
          </div>
          <div className="grid">{PRODUCTS.slice(0, 10).map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </div>
      </section>
    </>
  );
}
