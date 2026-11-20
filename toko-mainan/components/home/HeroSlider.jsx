'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { imgUrl } from '../../lib/image';
import { useLang } from '../LangProvider';

// Slide banner beranda. Gambar & link diatur owner di /admin/slide (lib/slides.js).
// Ukuran ideal: desktop 1920×640 (3:1), HP 1080×1080 (kotak). Versi Inggris opsional.
function pickImages(s, lang) {
  if (lang === 'en' && s.imageEn) {
    // ada versi Inggris desktop: di HP pakai versi Inggris HP, kalau tidak ada pakai desktop Inggris
    return { desk: s.imageEn, mobile: s.imageMobileEn || '' };
  }
  return { desk: s.image, mobile: s.imageMobile || '' };
}

export default function HeroSlider({ slides = [] }) {
  const { lang } = useLang();
  const [i, setI] = useState(0);
  const n = slides.length;
  useEffect(() => {
    if (n < 2) return;
    const t = setTimeout(() => setI((x) => (x + 1) % n), 5500);
    return () => clearTimeout(t);
  }, [i, n]);
  if (!n) return null;
  return (
    <section className="hero">
      <div className="hero-track" style={{ transform: `translateX(-${(i % n) * 100}%)` }}>
        {slides.map((s, k) => {
          const { desk, mobile } = pickImages(s, lang);
          const alt = (lang === 'en' && s.titleEn) || s.title || 'Toyzone';
          const img = (
            <picture className={`hero-img ${mobile ? '' : 'no-m'}`} style={mobile ? undefined : { '--blur': `url("${imgUrl(desk, 1920)}")` }}>
              {mobile && <source media="(max-width: 900px)" srcSet={imgUrl(mobile, 1080)} />}
              <img src={imgUrl(desk, 1920)} alt={alt} referrerPolicy="no-referrer" loading={k === 0 ? 'eager' : 'lazy'} />
            </picture>
          );
          return /^https?:\/\//.test(s.href)
            ? <a key={s.id || k} href={s.href} className="hero-slide" target="_blank" rel="noreferrer" tabIndex={k === i ? 0 : -1}>{img}</a>
            : <Link key={s.id || k} href={s.href || '/produk'} className="hero-slide" tabIndex={k === i ? 0 : -1}>{img}</Link>;
        })}
      </div>
      {n > 1 && (
        <div className="hero-dots">
          {slides.map((_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Banner ${k + 1}`} />)}
        </div>
      )}
    </section>
  );
}
