'use client';
import Link from 'next/link';
import { useStore } from '../lib/store';
import { finalPrice, formatRp } from '../lib/products';
import { SHIPPING } from '../lib/config';
import ProductImage from './ProductImage';
import QtyInput from './QtyInput';

export default function CartDrawer() {
  const { items, drawer, setDrawer, setQty, remove } = useStore();
  if (!drawer) return null;
  const subtotal = items.reduce((s, x) => s + finalPrice(x.product) * x.qty, 0);
  const left = SHIPPING.freeAbove - subtotal;
  return (
    <div className="drawer-bg" onClick={() => setDrawer(false)}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-top">
          <b>Keranjang Belanja ({items.length})</b>
          <button onClick={() => setDrawer(false)} aria-label="Tutup">✕</button>
        </div>
        {items.length > 0 && (
          <div className="freeship">
            {left > 0 ? <>Belanja <b>{formatRp(left)}</b> lagi untuk GRATIS ONGKIR 🚚</> : <>🎉 Kamu dapat <b>GRATIS ONGKIR</b>!</>}
            <div className="freeship-bar"><i style={{ width: `${Math.min(100, (subtotal / SHIPPING.freeAbove) * 100)}%` }} /></div>
          </div>
        )}
        <div className="drawer-items">
          {items.length === 0 && (
            <div className="empty">
              <div style={{ fontSize: 56 }}>🛒</div>
              <p>Keranjang kamu masih kosong</p>
              <Link href="/produk" className="btn-orange" onClick={() => setDrawer(false)}>Mulai Belanja</Link>
            </div>
          )}
          {items.map(({ id, qty, product: p }) => (
            <div key={id} className="ci">
              <Link href={`/produk/${p.slug}`} onClick={() => setDrawer(false)} className="ci-img"><ProductImage product={p} size="sm" /></Link>
              <div className="ci-info">
                <Link href={`/produk/${p.slug}`} onClick={() => setDrawer(false)} className="ci-name">{p.name}</Link>
                <b>{formatRp(finalPrice(p))}</b>
                <div className="ci-row">
                  <QtyInput value={qty} max={p.stock} onChange={(v) => setQty(id, v)} small />
                  <button className="link-btn" onClick={() => remove(id)}>Hapus</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="row-between"><span>Subtotal</span><b>{formatRp(subtotal)}</b></div>
            <Link href="/checkout" className="btn-orange wide" onClick={() => setDrawer(false)}>Checkout</Link>
            <Link href="/keranjang" className="btn-orange-outline wide" onClick={() => setDrawer(false)}>Lihat Keranjang</Link>
          </div>
        )}
      </aside>
    </div>
  );
}
