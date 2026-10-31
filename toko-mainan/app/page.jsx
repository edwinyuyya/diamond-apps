import Link from 'next/link';
import HeroSlider from '../components/home/HeroSlider';
import TileTabs from '../components/home/TileTabs';
import Offers from '../components/home/Offers';
import ProductRail from '../components/home/ProductRail';
import GiftFinder from '../components/home/GiftFinder';
import ProductCard from '../components/ProductCard';
import { PRODUCTS, CATEGORIES } from '../lib/products';
import { IcRight } from '../components/Icons';
import { imgUrl } from '../lib/image';
import FrameTag from '../components/FrameTag';

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

// 4 banner promo (2x2)
const PROMOS = [
  { title: 'Fat Tiger Blind Box', head: 'Dragon Soaring & Tiger Leaping', body: '8 desain + 1 hidden edition. Siapa yang dapat Coiling Dragon?', href: FT1, image: `${FT1}/01.webp`, bg: '#f27c00' },
  { title: 'Fat Tiger Food Party', head: 'Gantungan boneka blind box', body: '6 desain lucu untuk tas & kunci kamu.', href: FT2, image: `${FT2}/01.webp`, bg: '#e65100' },
  { title: 'Rolife Super Creator', head: 'Double Joy Bubble Tea', body: 'Rakit sendiri kedai bubble tea mini yang detail.', href: RL, image: `${RL}/01.webp`, bg: '#d81b60' },
  { title: 'Segera Hadir', head: 'Doraemon, Sinchan & Emma', body: 'Blind box karakter favorit segera masuk. Pantau terus!', href: '/produk?kategori=blind-box', emoji: '🎁', bg: '#0b2d5e' },
];

export default function Home() {
  const popular = [...PRODUCTS].sort((a, b) => b.sold - a.sold);
  const featured = PRODUCTS.filter((p) => ['Baru', 'Eksklusif'].includes(p.badge));
  const sale = PRODUCTS.filter((p) => p.salePrice);
  const gifts = PRODUCTS;
  return (
    <>
      <HeroSlider />
      <TileTabs />
      <Offers groups={Object.fromEntries(Object.entries({ Populer: popular, Unggulan: featured, Sale: sale }).filter(([, v]) => v.length))} />

      <section className="band">
        <div className="wrap">
          <Link href="/produk?kategori=blind-box" className="band-banner">
            <div className="band-art bframe">{BAND_IMAGE ? <img src={imgUrl(BAND_IMAGE, 1200)} alt="" referrerPolicy="no-referrer" /> : '🎁🐯🧋'}<FrameTag /></div>
            <div className="band-txt">
              <h3>Hadiah yang<br /><em>selalu bikin senang</em></h3>
              <span className="band-cta">Belanja Sekarang ›</span>
            </div>
          </Link>
          <ProductRail products={gifts} />
        </div>
      </section>

      <section className="sec">
        <div className="wrap promos">
          {PROMOS.map((p) => (
            <Link key={p.title} href={p.href} className="promo" style={{ '--bg': p.bg }}>
              <div className="promo-art bframe">{p.image ? <img src={imgUrl(p.image, 1200)} alt="" referrerPolicy="no-referrer" /> : <span>{p.emoji}</span>}<FrameTag /></div>
              <div className="promo-txt">
                <small>{p.title}</small>
                <b>{p.head}</b>
                <p>{p.body}</p>
                <span className="promo-btn">Belanja ›</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <GiftFinder />

      <section className="sec">
        <div className="wrap">
          <h2 className="sec-title center">Lihat Koleksi Mereka</h2>
          <p className="center muted sub">Inspirasi dari koleksi pelanggan Toyzone. Tandai kami di Instagram <a href="https://instagram.com/toyzone888" target="_blank" rel="noreferrer" className="ig-link">@toyzone888</a></p>
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
            <h2 className="sec-title">Semua Produk</h2>
            <Link href="/produk" className="btn-outline">Lihat Semua Produk <IcRight size={18} /></Link>
          </div>
          <div className="grid">{PRODUCTS.slice(0, 10).map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </div>
      </section>
    </>
  );
}
