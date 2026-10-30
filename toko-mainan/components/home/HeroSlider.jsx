'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Ganti teks/gambar banner di sini. `image` opsional (taruh di /public/banner/...)
const SLIDES = [
  { title: 'Koleksi Action Figure Terbaru', sub: 'Figure premium skala 1/12 & 1/6 sudah tiba. Stok terbatas!', cta: 'Belanja Sekarang', href: '/produk?kategori=action-figure', bg: 'linear-gradient(120deg,#c62828,#ff7043)', art: '🦸‍♂️🦾🦇' },
  { title: 'Brick Set untuk Semua Umur', sub: 'Dari balok besar untuk balita sampai set teknik 1.000+ keping untuk kolektor.', cta: 'Lihat Brick Set', href: '/produk?kategori=brick-set', bg: 'linear-gradient(120deg,#ef6c00,#ffd500)', art: '🧱🏰🚒' },
  { title: 'PROMO Hemat s/d 17%', sub: 'Diskon spesial untuk produk pilihan. Buruan sebelum kehabisan!', cta: 'Lihat Promo', href: '/produk?tag=diskon', bg: 'linear-gradient(120deg,#6a1b9a,#ec407a)', art: '🎁🏷️🎉' },
];

export default function HeroSlider() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, [i]);
  const s = SLIDES[i];
  return (
    <section className="hero" style={{ background: s.bg }}>
      <div className="wrap hero-row" key={i}>
        <div className="hero-txt">
          <h1>{s.title}</h1>
          <p>{s.sub}</p>
          <Link href={s.href} className="btn btn-dark btn-lg">{s.cta} →</Link>
        </div>
        <div className="hero-art">{s.image ? <img src={s.image} alt="" /> : s.art}</div>
      </div>
      <button className="hero-nav l" onClick={() => setI((i - 1 + SLIDES.length) % SLIDES.length)} aria-label="Sebelumnya">‹</button>
      <button className="hero-nav r" onClick={() => setI((i + 1) % SLIDES.length)} aria-label="Berikutnya">›</button>
      <div className="hero-dots">
        {SLIDES.map((_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Slide ${k + 1}`} />)}
      </div>
    </section>
  );
}
