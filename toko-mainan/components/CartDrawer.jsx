'use client';
import Link from 'next/link';
import { useStore } from '../lib/store';
import { finalPrice, formatRp } from '../lib/products';
import { SHIPPING } from '../lib/config';
import ProductImage from './ProductImage';
import QtyInput from './QtyInput';
import { useLang } from './LangProvider';

export default function CartDrawer() {
  const { items, drawer, setDrawer, setQty, remove } = useStore();
  const { t, html } = useLang();
  if (!drawer) return null;
  const subtotal = items.reduce((s, x) => s + finalPrice(x.product) * x.qty, 0);
  const left = SHIPPING.freeAbove - subtotal;
  return (
    <div className="drawer-bg" onClick={() => setDrawer(false)}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-top">
          <b>{t('cart.title')} ({items.length})</b>
          <button onClick={() => setDrawer(false)} aria-label={t('common.close')}>✕</button>
        </div>
        {items.length > 0 && (
          <div className="freeship">
            <span dangerouslySetInnerHTML={left > 0 ? html('cart.freeLeft', { amount: formatRp(left) }) : html('cart.freeGot')} />
            <div className="freeship-bar"><i style={{ width: `${Math.min(100, (subtotal / SHIPPING.freeAbove) * 100)}%` }} /></div>
          </div>
        )}
        <div className="drawer-items">
          {items.length === 0 && (
            <div className="empty">
              <div style={{ fontSize: 56 }}>🛒</div>
              <p>{t('cart.empty')}</p>
              <Link href="/produk" className="btn-orange" onClick={() => setDrawer(false)}>{t('common.startShopping')}</Link>
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
                  <button className="link-btn" onClick={() => remove(id)}>{t('common.remove')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="row-between"><span>{t('common.subtotal')}</span><b>{formatRp(subtotal)}</b></div>
            <Link href="/checkout" className="btn-orange wide" onClick={() => setDrawer(false)}>Checkout</Link>
            <Link href="/keranjang" className="btn-orange-outline wide" onClick={() => setDrawer(false)}>{t('cart.view')}</Link>
          </div>
        )}
      </aside>
    </div>
  );
}
