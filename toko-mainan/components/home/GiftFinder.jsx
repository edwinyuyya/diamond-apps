'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PRODUCTS, CATEGORIES, finalPrice } from '../../lib/products';
import ProductRail from './ProductRail';
import { IcRight } from '../Icons';

const AGES = [1.5, 3, 6, 9, 13, 18];
const MAX_PRICE = 3500000;

export default function GiftFinder() {
  const router = useRouter();
  const [age, setAge] = useState(AGES.length - 1);
  const [price, setPrice] = useState(MAX_PRICE);
  const [cat, setCat] = useState('');
  const [applied, setApplied] = useState({ age: AGES.length - 1, price: MAX_PRICE, cat: '' });

  const list = useMemo(() => PRODUCTS.filter((p) =>
    p.age <= AGES[applied.age] && (finalPrice(p) == null || finalPrice(p) <= applied.price) && (!applied.cat || p.category === applied.cat)
  ), [applied]);

  const fmtM = (v) => (v / 1e6).toFixed(1) + ' jt';
  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-head">
          <h2 className="sec-title">Cari Hadiah</h2>
          <Link href="/produk" className="btn-outline">Lihat Semua Produk <IcRight size={18} /></Link>
        </div>
        <div className="gf">
          <div className="gf-side">
            <div className="gf-slider gf-age">
              <b>Umur</b>
              <span className="gf-val">{AGES[age]}+</span>
              <input type="range" min={0} max={AGES.length - 1} value={age} onChange={(e) => setAge(+e.target.value)} aria-label="Umur" />
            </div>
            <div className="gf-slider gf-price">
              <b>Harga</b>
              <span className="gf-val">{fmtM(price)}</span>
              <input type="range" min={100000} max={MAX_PRICE} step={100000} value={price} onChange={(e) => setPrice(+e.target.value)} aria-label="Harga maksimal" />
            </div>
            <button className="btn-blue" onClick={() => setApplied({ age, price, cat })}>Terapkan Filter</button>
          </div>
          <div className="gf-main">
            <div className="gf-cats">
              <button className={!cat ? 'on' : ''} onClick={() => { setCat(''); setApplied({ age, price, cat: '' }); }}>Semua Kategori</button>
              {CATEGORIES.map((c) => <button key={c.slug} className={cat === c.slug ? 'on' : ''} onClick={() => { setCat(c.slug); setApplied({ age, price, cat: c.slug }); }}>{c.name}</button>)}
            </div>
            {list.length ? <ProductRail key={JSON.stringify(applied)} products={list} /> : (
              <div className="empty"><p>Belum ada produk yang cocok. Coba geser filter umur/harga.</p>
                <button className="btn-orange" onClick={() => router.push('/produk')}>Lihat Semua Produk</button></div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
