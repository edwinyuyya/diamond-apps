'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { imgUrl } from '../../lib/image';
import FrameTag from '../FrameTag';

// Banner utama. Kalau punya gambar banner, taruh di /public/banner/ lalu isi `image`
// (ukuran ideal 1920x600 desktop). Kalau `image` kosong, tampil banner warna.
const SLIDES = [
  { kicker: 'BLIND BOX BARU', title: 'Fat Tiger\nDragon & Tiger', sub: '8 desain + 1 hidden edition. Berani tebak isinya?', cta: 'Lihat Sekarang', href: '/produk/fat-tiger-dragon-soaring-tiger-leaping', bg: '#0b2d5e', accent: '#ffc400', img: '/produk/fat-tiger-dragon-soaring-tiger-leaping/01.webp' },
  { kicker: 'GANTUNGAN TAS', title: 'Tiger Food\nParty', sub: 'Boneka Fat Tiger mini untuk tas & kunci kamu', cta: 'Lihat Koleksi', href: '/produk/fat-tiger-food-party-plush-pendant', bg: '#ff6a13', accent: '#0b2d5e', img: '/produk/fat-tiger-food-party-plush-pendant/03.webp' },
  { kicker: 'ROLIFE DIY', title: 'Rakit Kedai\nBubble Tea Mini', sub: 'Rolife Super Creator — Double Joy Bubble Tea', cta: 'Lihat Produk', href: '/produk/rolife-super-creator-double-joy-bubble-tea', bg: '#6fcbc9', accent: '#d81b60', img: '/produk/rolife-super-creator-double-joy-bubble-tea/01.webp' },
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
            {s.image ? <div className="bframe hero-img"><img src={imgUrl(s.image, 1920)} alt={s.title} referrerPolicy="no-referrer" /><FrameTag /></div> : (
              <div className="wrap hero-inner">
                <div className="hero-txt">
                  <small>{s.kicker}</small>
                  <h2>{s.title.split('\n').map((l, j) => <span key={j}>{l}</span>)}</h2>
                  <p>{s.sub}</p>
                  <span className="hero-cta">{s.cta} ›</span>
                </div>
                {s.img
                  ? <div className="hero-photo bframe"><img src={imgUrl(s.img, 900)} alt="" /></div>
                  : <div className="hero-art">{s.art.map((a, j) => <span key={j}>{a}</span>)}</div>}
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
