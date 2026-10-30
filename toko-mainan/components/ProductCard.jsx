'use client';
import Link from 'next/link';
import ProductImage from './ProductImage';
import { useStore } from '../lib/store';
import { finalPrice, discountPct, formatRp, getCategory } from '../lib/products';

export default function ProductCard({ product: p }) {
  const { add } = useStore();
  const out = p.stock <= 0;
  const disc = discountPct(p);
  return (
    <div className="card">
      <Link href={`/produk/${p.slug}`} className="card-img">
        <ProductImage product={p} />
        <div className="card-badges">
          {p.badge && <span className={`badge badge-${p.badge.toLowerCase()}`}>{p.badge}</span>}
          {disc > 0 && <span className="badge badge-diskon">-{disc}%</span>}
        </div>
        <span className="card-age">{p.age}+</span>
      </Link>
      <div className="card-body">
        <div className="card-cat">{getCategory(p.category)?.name}</div>
        <Link href={`/produk/${p.slug}`} className="card-name">{p.name}</Link>
        <div className="card-rating">★ {p.rating.toFixed(1)} <span>· {p.sold} terjual</span></div>
        <div className="card-price">
          <b>{formatRp(finalPrice(p))}</b>
          {p.salePrice && <s>{formatRp(p.price)}</s>}
        </div>
        <button className={`btn btn-cart ${out ? 'is-out' : ''}`} disabled={out} onClick={() => add(p.id)}>
          {out ? 'Stok Habis' : '+ Keranjang'}
        </button>
      </div>
    </div>
  );
}
