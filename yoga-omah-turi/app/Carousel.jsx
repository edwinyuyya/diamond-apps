'use client';
import { useEffect, useState } from 'react';

export default function Carousel({ slides: base, onCta, promo }) {
  // Slide promo (desain Canva) disisipkan sebagai slide ke-2
  const slides = promo && base.length ? [base[0], { type: 'promo', src: 'promo' }, ...base.slice(1)] : promo ? [{ type: 'promo', src: 'promo' }] : base;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;

  useEffect(() => {
    if (n < 2 || paused) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // slide promo ditampilkan lebih lama supaya sempat dibaca
    const t = setTimeout(() => setI((x) => (x + 1) % n), slides[i]?.type === 'promo' ? 8000 : 5000);
    return () => clearTimeout(t);
  }, [n, paused, i]);

  return (
    <section
      className={'car' + (slides[i]?.type === 'promo' ? ' promo-on' : '')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { e.currentTarget._x = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (e.currentTarget._x ?? 0);
        if (n > 1 && Math.abs(dx) > 40) setI((x) => (x + (dx < 0 ? 1 : n - 1)) % n);
      }}
    >
      {slides.map((s, k) => {
        const on = k === i;
        if (s.type === 'promo') {
          return (
            <a key="promo" className={'car-img car-promo' + (on ? ' on' : '')} href={promo.href} target="_blank" rel="noopener noreferrer" aria-label={promo.label} tabIndex={on ? 0 : -1}>
              <picture>
                <source media="(max-width: 700px)" srcSet={promo.mobile} />
                <img src={promo.desktop} alt={promo.alt} loading="lazy" draggable={false} />
              </picture>
            </a>
          );
        }
        const src = s.type === 'video' ? s.poster : s.src;
        return (
          <div key={s.src} className={'car-img' + (on ? ' on' : '')}>
            <img src={src} alt="Kegiatan yoga Harmony of Life" loading={k === 0 ? 'eager' : 'lazy'} draggable={false} />
            {s.type === 'video' && on && <video src={s.src} poster={s.poster} autoPlay muted loop playsInline />}
          </div>
        );
      })}
      <div className="car-shade" />
      <div className="car-text">
        <div className="container">
          <h1>Harmony of <em>Life</em></h1>
          <p>Yoga di Omah Turi, online live, dan rekaman.</p>
          {onCta && <button type="button" className="pill light" onClick={onCta}>Lihat jadwal <span aria-hidden>→</span></button>}
        </div>
      </div>
      {n > 1 && (
        <div className="car-dots">
          {slides.map((_, k) => (
            <button key={k} type="button" aria-label={`Slide ${k + 1}`} className={k === i ? 'on' : ''} onClick={() => setI(k)} />
          ))}
        </div>
      )}
    </section>
  );
}
