'use client';
import Link from 'next/link';
import ProductImage from './ProductImage';
import { useStore } from '../lib/store';
import { finalPrice, discountPct, formatRp } from '../lib/products';
import { IcCart, IcHeart, IcCake } from './Icons';

export default function ProductCard({ product: p }) {
  const { add, wish, toggleWish } = useStore();
  const out = p.stock <= 0;
  const disc = discountPct(p);
  const liked = wish.includes(p.id);
  return (
    <div className="card">
      <button className={`wish ${liked ? 'on' : ''}`} onClick={() => toggleWish(p.id)} aria-label="Wishlist"><IcHeart size={16} filled={liked} /></button>
      {p.badge && p.badge !== 'Diskon' && <span className={`flag flag-${p.badge.toLowerCase()}`}>{p.badge}</span>}
      <Link href={`/produk/${p.slug}`} className="card-img"><ProductImage product={p} /></Link>
      <div className="card-body">
        <div className="card-age"><IcCake size={15} /> {p.age}+</div>
        <Link href={`/produk/${p.slug}`} className="card-name">{p.name}</Link>
        <div className="card-price">
          {disc > 0 && <div className="was"><s>{formatRp(p.price)}</s><span className="pct">{disc}%</span></div>}
          <b>{formatRp(finalPrice(p))}</b>
        </div>
        <button className="btn-add" disabled={out} onClick={() => add(p.id)}>
          {out ? 'Stok Habis' : <><IcCart size={17} /> Tambah ke Keranjang</>}
        </button>
      </div>
    </div>
  );
}
