'use client';
import { useEffect, useRef, useState } from 'react';
import ProductCard from '../ProductCard';
import { IcLeft, IcRight } from '../Icons';

// Carousel produk dengan panah bulat di kiri/kanan & dot di bawah (seperti situs referensi)
export default function ProductRail({ products, dots = true }) {
  const ref = useRef(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const calc = () => {
      setPages(Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth - 0.05)));
      setPage(Math.round(el.scrollLeft / el.clientWidth));
    };
    calc();
    el.addEventListener('scroll', calc, { passive: true });
    window.addEventListener('resize', calc);
    return () => { el.removeEventListener('scroll', calc); window.removeEventListener('resize', calc); };
  }, [products]);

  const go = (i) => ref.current?.scrollTo({ left: i * ref.current.clientWidth, behavior: 'smooth' });
  return (
    <div className="rail-wrap">
      {pages > 1 && <button className="rail-arrow l" onClick={() => go(Math.max(0, page - 1))} aria-label="Sebelumnya"><IcLeft size={20} /></button>}
      <div className="rail" ref={ref}>
        {products.map((p) => <div className="rail-item" key={p.id}><ProductCard product={p} /></div>)}
      </div>
      {pages > 1 && <button className="rail-arrow r" onClick={() => go(Math.min(pages - 1, page + 1))} aria-label="Berikutnya"><IcRight size={20} /></button>}
      {dots && pages > 1 && (
        <div className="dots">{Array.from({ length: pages }).map((_, i) => <button key={i} className={i === page ? 'on' : ''} onClick={() => go(i)} aria-label={`Halaman ${i + 1}`} />)}</div>
      )}
    </div>
  );
}
