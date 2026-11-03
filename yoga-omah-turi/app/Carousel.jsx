'use client';
import { useEffect, useState } from 'react';

export default function Carousel({ photos }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = photos.length;

  useEffect(() => {
    if (n < 2 || paused) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 4500);
    return () => clearInterval(t);
  }, [n, paused]);

  return (
    <section
      className="car"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { e.currentTarget._x = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (e.currentTarget._x ?? 0);
        if (n > 1 && Math.abs(dx) > 40) setI((x) => (x + (dx < 0 ? 1 : n - 1)) % n);
      }}
    >
      {photos.map((src, k) => (
        <img key={src} src={src} alt="Kegiatan yoga di Omah Turi" className={'car-img' + (k === i ? ' on' : '')}
          loading={k === 0 ? 'eager' : 'lazy'} draggable={false} />
      ))}
      <div className="car-shade" />
      <div className="car-text">
        <h1>YOGA OMAH TURI</h1>
        <p>part of harmony of life</p>
      </div>
      {n > 1 && (
        <div className="car-dots">
          {photos.map((_, k) => (
            <button key={k} type="button" aria-label={`Foto ${k + 1}`} className={k === i ? 'on' : ''} onClick={() => setI(k)} />
          ))}
        </div>
      )}
    </section>
  );
}
