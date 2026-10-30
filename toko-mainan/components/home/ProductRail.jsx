'use client';
import Link from 'next/link';
import { useRef } from 'react';
import ProductCard from '../ProductCard';

export default function ProductRail({ title, href, products }) {
  const ref = useRef(null);
  const scroll = (d) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-head">
          <h2>{title}</h2>
          <div className="sec-tools">
            {href && <Link href={href} className="see-all">Lihat semua →</Link>}
            <button className="rail-btn" onClick={() => scroll(-1)} aria-label="Geser kiri">‹</button>
            <button className="rail-btn" onClick={() => scroll(1)} aria-label="Geser kanan">›</button>
          </div>
        </div>
        <div className="rail" ref={ref}>
          {products.map((p) => <div className="rail-item" key={p.id}><ProductCard product={p} /></div>)}
        </div>
      </div>
    </section>
  );
}
