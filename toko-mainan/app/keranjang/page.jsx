'use client';
import Link from 'next/link';
import { useStore } from '../../lib/store';
import { PRODUCTS, finalPrice, formatRp } from '../../lib/products';
import { SHIPPING } from '../../lib/config';
import ProductImage from '../../components/ProductImage';
import QtyInput from '../../components/QtyInput';
import ProductRail from '../../components/home/ProductRail';
import ThemeRail from '../../components/ThemeRail';
import { IcCart } from '../../components/Icons';

export default function CartPage() {
  const { items, ready, setQty, remove } = useStore();
  const subtotal = items.reduce((s, x) => s + finalPrice(x.product) * x.qty, 0);
  const shipping = subtotal >= SHIPPING.freeAbove ? 0 : SHIPPING.flat;
  const suggest = [...PRODUCTS].sort((a, b) => b.sold - a.sold).filter((p) => !items.some((i) => i.id === p.id)).slice(0, 10);
  if (!ready) return <div className="wrap pad">Memuat…</div>;
  return (
    <div className="wrap pad">
      <h1 className="page-title">Keranjang Belanja</h1>
      {items.length === 0 ? (
        <div className="empty big">
          <IcCart size={110} sw={2.2} className="empty-cart" />
          <h2>Keranjang kamu masih kosong</h2>
          <p className="muted">Sepertinya kamu belum menambahkan apa pun ke keranjang. Yuk lihat produk kami dan temukan yang kamu suka.</p>
          <Link href="/produk" className="btn-orange">Mulai Belanja</Link>
        </div>
      ) : (
        <div className="two-col">
          <div className="panel">
            {items.map(({ id, qty, product: p }) => (
              <div key={id} className="ci ci-lg">
                <Link href={`/produk/${p.slug}`} className="ci-img"><ProductImage product={p} size="sm" /></Link>
                <div className="ci-info">
                  <Link href={`/produk/${p.slug}`} className="ci-name">{p.name}</Link>
                  <small className="muted">{formatRp(finalPrice(p))} / pcs</small>
                  <div className="ci-row">
                    <QtyInput value={qty} max={p.stock} onChange={(v) => setQty(id, v)} small />
                    <button className="link-btn" onClick={() => remove(id)}>Hapus</button>
                  </div>
                </div>
                <b className="ci-total">{formatRp(finalPrice(p) * qty)}</b>
              </div>
            ))}
          </div>
          <div className="panel summary">
            <h3>Ringkasan Belanja</h3>
            <div className="row-between"><span>Subtotal</span><span>{formatRp(subtotal)}</span></div>
            <div className="row-between"><span>Ongkos kirim</span><span>{shipping ? formatRp(shipping) : <b className="green">GRATIS</b>}</span></div>
            <div className="row-between total"><span>Total</span><b>{formatRp(subtotal + shipping)}</b></div>
            <p className="muted small">Kode unik pembayaran ditambahkan di halaman berikutnya.</p>
            <Link href="/checkout" className="btn-orange wide">Checkout</Link>
            <Link href="/produk" className="btn-orange-outline wide">Lanjut Belanja</Link>
          </div>
        </div>
      )}
      <h2 className="sec-title mt">Belanja per Kategori</h2>
      <ThemeRail />
      <h2 className="sec-title mt">Kamu Mungkin Juga Suka</h2>
      <ProductRail products={suggest} />
    </div>
  );
}
