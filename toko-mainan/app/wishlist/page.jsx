'use client';
import Link from 'next/link';
import { useStore } from '../../lib/store';
import { PRODUCTS } from '../../lib/products';
import ProductCard from '../../components/ProductCard';
import { IcHeart } from '../../components/Icons';

export default function Wishlist() {
  const { wish, ready } = useStore();
  const list = PRODUCTS.filter((p) => wish.includes(p.id));
  if (!ready) return <div className="wrap pad">Memuat…</div>;
  return (
    <div className="wrap pad">
      <div className="crumbs"><Link href="/">Beranda</Link><i>/</i><span>Wishlist</span></div>
      <div className="cat-head"><h1>Wishlist</h1></div>
      {list.length === 0 ? (
        <div className="empty big">
          <IcHeart size={90} sw={2} className="empty-cart" />
          <h2>Wishlist kamu masih kosong</h2>
          <p className="muted">Klik ikon hati di produk untuk menyimpannya di sini.</p>
          <Link href="/produk" className="btn-orange">Mulai Belanja</Link>
        </div>
      ) : <div className="grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
    </div>
  );
}
