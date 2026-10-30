import Link from 'next/link';
import HeroSlider from '../components/home/HeroSlider';
import ProductRail from '../components/home/ProductRail';
import { CATEGORIES, AGE_GROUPS, PRICE_RANGES, PRODUCTS } from '../lib/products';

const byTag = (t) => PRODUCTS.filter((p) => p.badge.toLowerCase() === t);

export default function Home() {
  const baru = byTag('baru');
  const terlaris = [...PRODUCTS].sort((a, b) => b.sold - a.sold).slice(0, 10);
  const eksklusif = PRODUCTS.filter((p) => p.badge === 'Eksklusif' || p.age >= 18);
  return (
    <>
      <HeroSlider />

      <section className="sec">
        <div className="wrap">
          <div className="sec-head"><h2>Belanja Berdasarkan Kategori</h2></div>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/produk?kategori=${c.slug}`} className="cat-tile" style={{ '--c': c.color }}>
                <span className="cat-emoji">{c.emoji}</span>
                <b>{c.name}</b>
                <small>{PRODUCTS.filter((p) => p.category === c.slug).length} produk</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProductRail title="Produk Baru" href="/produk?tag=baru" products={baru.length ? baru : PRODUCTS.slice(0, 8)} />

      <section className="sec">
        <div className="wrap promo-row">
          <Link href="/produk?tag=diskon" className="promo promo-a">
            <small>PROMO BULAN INI</small><b>Diskon s/d 17%</b><span>Belanja sekarang →</span><i>🏷️</i>
          </Link>
          <Link href="/produk?umur=18" className="promo promo-b">
            <small>UNTUK KOLEKTOR</small><b>Koleksi Dewasa 18+</b><span>Lihat koleksi →</span><i>🏆</i>
          </Link>
        </div>
      </section>

      <ProductRail title="Paling Laris" href="/produk?sort=terlaris" products={terlaris} />

      <section className="sec">
        <div className="wrap">
          <div className="sec-head"><h2>Belanja Berdasarkan Umur</h2></div>
          <div className="age-row">
            {AGE_GROUPS.map((a, i) => (
              <Link key={a.slug} href={`/produk?umur=${a.slug}`} className="age-bubble" style={{ '--i': i }}>
                <b>{a.slug === '18' ? '18+' : a.slug.replace('-', '–')}</b><small>tahun</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProductRail title="Eksklusif & Koleksi" href="/produk?tag=eksklusif" products={eksklusif} />

      <section className="sec">
        <div className="wrap">
          <div className="sec-head"><h2>Belanja Berdasarkan Harga</h2></div>
          <div className="price-row">
            {PRICE_RANGES.map((r) => <Link key={r.slug} href={`/produk?harga=${r.slug}`} className="price-chip">{r.name}</Link>)}
          </div>
        </div>
      </section>
    </>
  );
}
