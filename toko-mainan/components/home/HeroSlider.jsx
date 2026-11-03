'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { imgUrl } from '../../lib/image';
import { useLang } from '../LangProvider';

// Banner utama. Kalau punya gambar banner, taruh di /public/banner/ lalu isi `image`
// (ukuran ideal 1920x600 desktop). Kalau `image` kosong, tampil banner warna.
// Banner dibuat oleh scripts/make_banners.py (desktop 1920x640, HP 1080x1080)
// Versi bahasa Inggris memakai file *-en.webp
const B = (n) => ({ image: `/banner/hero-${n}.webp`, imageMobile: `/banner/hero-${n}-m.webp` });
const SLIDES = [
  { title: 'hero.1', href: '/produk/fat-tiger-dragon-soaring-tiger-leaping', ...B('fat-tiger-dragon') },
  { title: 'hero.2', href: '/produk/fat-tiger-food-party-plush-pendant', ...B('food-party') },
  { title: 'hero.3', href: '/produk/rolife-super-creator-double-joy-bubble-tea', ...B('rolife-bubble-tea') },
  { title: 'hero.4', href: '/produk', ...B('gratis-ongkir') },
];
const enFile = (f) => f.replace(/\.webp$/, '-en.webp');

export default function HeroSlider() {
  const { lang, t } = useLang();
  const L = (f) => (lang === 'en' ? enFile(f) : f);
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
            {s.image ? (
              <picture className="hero-img">
                {s.imageMobile && <source media="(max-width: 900px)" srcSet={imgUrl(L(s.imageMobile), 1080)} />}
                <img src={imgUrl(L(s.image), 1920)} alt={t(s.title)} referrerPolicy="no-referrer" loading={k === 0 ? 'eager' : 'lazy'} />
              </picture>
            ) : (
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
