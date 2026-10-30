'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { imgUrl } from '../../lib/image';

// Banner utama. Kalau punya gambar banner, taruh di /public/banner/ lalu isi `image`
// (ukuran ideal 1920x600 desktop). Kalau `image` kosong, tampil banner warna.
const SLIDES = [
  { kicker: 'KOLEKSI BARU', title: 'Action Figure\nPremium 1/12', sub: 'Stok terbatas, buruan amankan!', cta: 'Belanja Sekarang', href: '/produk?kategori=action-figure', bg: '#0b2d5e', accent: '#ffc400', art: ['🦾', '🦇', '🕷️'] },
  { kicker: 'BANGUN IMAJINASIMU', title: 'Brick Set\nUntuk Semua Umur', sub: 'Dari balita sampai kolektor dewasa', cta: 'Lihat Brick Set', href: '/produk?kategori=brick-set', bg: '#ff6a13', accent: '#0b2d5e', art: ['🏰', '🚒', '🏁'] },
  { kicker: 'PROMO SPESIAL', title: 'Hemat Hingga\n17%', sub: 'Untuk produk pilihan, selama persediaan ada', cta: 'Lihat Promo', href: '/produk?tag=diskon', bg: '#6fcbc9', accent: '#e3000b', art: ['🎁', '🧸', '🤖'] },
  { kicker: 'GRATIS ONGKIR', title: 'Belanja Rp1 Juta\nGratis Ongkir', sub: 'Ke seluruh Indonesia', cta: 'Mulai Belanja', href: '/produk', bg: '#ffc400', accent: '#0b2d5e', art: ['🚚', '📦', '🎉'] },
];

export default function HeroSlider() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setI((x) => (x + 1) % SLIDES.length), 5500);
    return () => clearTimeout(t);
  }, [i]);
  return (
    <section className="hero">
      <div className="hero-track" style={{ transform: `translateX(-${i * 100}%)` }}>
        {SLIDES.map((s, k) => (
          <Link key={k} href={s.href} className="hero-slide" style={{ '--bg': s.bg, '--ac': s.accent }} tabIndex={k === i ? 0 : -1}>
            {s.image ? <img src={imgUrl(s.image, 1920)} alt={s.title} referrerPolicy="no-referrer" /> : (
              <div className="wrap hero-inner">
                <div className="hero-txt">
                  <small>{s.kicker}</small>
                  <h2>{s.title.split('\n').map((l, j) => <span key={j}>{l}</span>)}</h2>
                  <p>{s.sub}</p>
                  <span className="hero-cta">{s.cta} ›</span>
                </div>
                <div className="hero-art">{s.art.map((a, j) => <span key={j}>{a}</span>)}</div>
              </div>
            )}
          </Link>
        ))}
      </div>
      <div className="hero-dots">
        {SLIDES.map((_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Banner ${k + 1}`} />)}
      </div>
    </section>
  );
}
