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

// Foto banner pita kuning (opsional, link Google Drive atau /banner/xxx.webp)
const BAND_IMAGE = '';

// Foto galeri "Lihat Koleksi Mereka" (opsional), urutan sesuai kategori
const GALLERY = ['', '', '', '', ''];

// 4 banner promo (2x2). Isi `image` kalau punya foto (rasio ± 3:1).
const PROMOS = [
  { title: 'Iron Guardian Mark X', head: 'Figure skala 1/12 terlaris', body: 'LED di dada, 30+ titik artikulasi, 12 tangan pengganti.', href: '/produk/iron-guardian-mark-x', emoji: '🦾', bg: '#c62828' },
  { title: 'Kastil Naga Api', head: 'Brick set 1.850 keping', body: 'Naga dengan sayap bergerak, 6 minifigure, ruang rahasia.', href: '/produk/kastil-naga-api', emoji: '🏰', bg: '#ef6c00' },
  { title: 'Mobil Sport Teknik', head: 'Untuk perakit dewasa', body: 'Mesin piston bergerak & girboks 8 percepatan.', href: '/produk/mobil-sport-teknik', emoji: '🏁', bg: '#0b2d5e' },
  { title: 'Pirate King Gear Fifth', head: 'Anime figure premium', body: 'Detail awan & petir dengan base bercahaya.', href: '/produk/pirate-king-gear', emoji: '🏴‍☠️', bg: '#6a1b9a' },
];

export default function Home() {
  const popular = [...PRODUCTS].sort((a, b) => b.sold - a.sold);
  const featured = PRODUCTS.filter((p) => ['Baru', 'Eksklusif'].includes(p.badge));
  const sale = PRODUCTS.filter((p) => p.salePrice);
  const gifts = PRODUCTS.filter((p) => p.price <= 800000);
  return (
    <>
      <HeroSlider />
      <TileTabs />
      <Offers groups={{ Populer: popular, Unggulan: featured, Sale: sale }} />

      <section className="band">
        <div className="wrap">
          <Link href="/produk?umur=3-5" className="band-banner">
            <div className="band-art bframe">{BAND_IMAGE ? <img src={imgUrl(BAND_IMAGE, 1200)} alt="" referrerPolicy="no-referrer" /> : '🧸🎁🚗'}<FrameTag /></div>
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
          <p className="center muted sub">Inspirasi dari koleksi pelanggan Toyzone. Tandai kami di Instagram!</p>
          <div className="mosaic">
            {CATEGORIES.map((c, i) => (
              <Link key={c.slug} href={`/produk?kategori=${c.slug}`} className={`mosaic-item bframe m${i}`} style={{ '--c': c.color }}>
                {GALLERY[i] ? <img src={imgUrl(GALLERY[i], 1000)} alt={c.name} referrerPolicy="no-referrer" /> : <span>{c.emoji}</span>}<i>+</i>
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
