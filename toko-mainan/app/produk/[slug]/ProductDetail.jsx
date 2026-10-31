'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductImage from '../../../components/ProductImage';
import { useStore } from '../../../lib/store';
import { finalPrice, discountPct, formatRp, getCategory, hasPrice } from '../../../lib/products';
import { SHIPPING } from '../../../lib/config';
import { waChatUrl } from '../../../lib/order';
import { IcLeft, IcRight, IcTruck, IcReturn, IcCheck, IcCart, IcMinus, IcPlus, IcUp, IcDown, IcHeart } from '../../../components/Icons';

export default function ProductDetail({ product: p }) {
  const { add, setDrawer, wish, toggleWish } = useStore();
  const router = useRouter();
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState({ desc: true, spec: false });
  const [sticky, setSticky] = useState(false);
  const btnRef = useRef(null);
  const out = p.stock <= 0;
  const priced = hasPrice(p);
  const views = p.images?.length || 4;
  const disc = discountPct(p);
  const liked = wish.includes(p.id);

  useEffect(() => {
    const el = btnRef.current; if (!el) return;
    const ob = new IntersectionObserver(([e]) => setSticky(!e.isIntersecting && e.boundingClientRect.top < 0));
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  const buyNow = () => { add(p.id, qty); setDrawer(false); router.push('/checkout'); };
  const Buttons = () => !priced ? (
    <a className="btn-orange wide" href={waChatUrl(`Halo Toyzone, saya mau tanya harga & stok ${p.name} (${p.id})`)} target="_blank" rel="noreferrer">Tanya Harga via WhatsApp</a>
  ) : out ? (
    <a className="btn-orange wide" href={waChatUrl(`Halo, apakah ${p.name} (${p.id}) akan restock?`)} target="_blank" rel="noreferrer">Tanya Restock via WhatsApp</a>
  ) : (
    <>
      <button className="btn-orange-outline" onClick={buyNow}>Beli Sekarang</button>
      <button className="btn-orange" onClick={() => add(p.id, qty)}><IcCart size={19} /> Tambah ke Keranjang</button>
    </>
  );

  return (
    <>
      <div className="pdp">
        <div className="pdp-gallery">
          <div className="pdp-thumbs">
            {Array.from({ length: views }).map((_, i) => (
              <button key={i} className={i === img ? 'on' : ''} onClick={() => setImg(i)}><ProductImage product={p} index={i} size="sm" /></button>
            ))}
          </div>
          <div className="pdp-main">
            <ProductImage product={p} index={img} size="lg" />
            <button className="pdp-arrow l" onClick={() => setImg((img - 1 + views) % views)} aria-label="Sebelumnya"><IcLeft size={18} /></button>
            <button className="pdp-arrow r" onClick={() => setImg((img + 1) % views)} aria-label="Berikutnya"><IcRight size={18} /></button>
            <button className={`wish ${liked ? 'on' : ''}`} onClick={() => toggleWish(p.id)} aria-label="Wishlist"><IcHeart size={18} filled={liked} /></button>
          </div>
        </div>

        <div className="pdp-info">
          <div className="pdp-brand">{getCategory(p.category)?.name}</div>
          <h1>{p.name}</h1>
          <div className="pdp-sku">{p.id}</div>
          <div className="pdp-price">
            {disc > 0 && <div className="was"><s>{formatRp(p.price)}</s><span className="pct">{disc}%</span></div>}
            <b>{priced ? formatRp(finalPrice(p)) : 'Tanya harga'}</b>
          </div>
          {!out && priced && (
            <>
              <div className="pdp-label">Jumlah</div>
              <div className="qty-box">
                <button onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="Kurangi"><IcMinus size={18} /></button>
                <span>{qty}</span>
                <button onClick={() => setQty(Math.min(p.stock, qty + 1))} disabled={qty >= p.stock} aria-label="Tambah"><IcPlus size={18} /></button>
              </div>
            </>
          )}
          <div className="pdp-perks">
            <div><IcTruck size={30} sw={1.5} /><p><b>Gratis Ongkir Tersedia</b><span>Untuk belanja di atas {formatRp(SHIPPING.freeAbove)}, seluruh Indonesia</span></p></div>
            <div><IcReturn size={30} sw={1.5} /><p><b>Garansi Original</b><span>Produk 100% original, dikemas aman dengan bubble wrap</span></p></div>
          </div>
          <div className={`pdp-stock ${out ? 'no' : ''}`}>
            {out ? <>✕ Stok habis</> : <><IcCheck size={16} sw={2.6} /> {p.stock <= 5 ? `Stok terbatas, sisa ${p.stock}` : 'Stok tersedia'}</>}
            <small>Dikirim 1×24 jam setelah pembayaran dikonfirmasi</small>
          </div>
          <div className="pdp-btns" ref={btnRef}><Buttons /></div>

          <div className="acc">
            <button onClick={() => setOpen({ ...open, desc: !open.desc })}>Deskripsi {open.desc ? <IcUp size={20} /> : <IcDown size={20} />}</button>
            {open.desc && <p>{p.description}</p>}
          </div>
          <div className="acc">
            <button onClick={() => setOpen({ ...open, spec: !open.spec })}>Spesifikasi {open.spec ? <IcUp size={20} /> : <IcDown size={20} />}</button>
            {open.spec && (
              <table className="spec"><tbody>
                <tr><td>Kode Produk</td><td>{p.id}</td></tr>
                <tr><td>Rekomendasi Umur</td><td>{p.age}+ tahun</td></tr>
                {p.specs && Object.entries(p.specs).map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
              </tbody></table>
            )}
          </div>
        </div>
      </div>

      <div className={`sticky-buy ${sticky ? 'show' : ''}`}>
        <div className="sticky-thumb"><ProductImage product={p} size="sm" /></div>
        <div className="sticky-name"><b>{p.name}</b><small>{p.id}</small></div>
        <b className="sticky-price">{priced ? formatRp(finalPrice(p)) : 'Tanya harga'}</b>
        <div className="sticky-btns"><Buttons /></div>
      </div>
    </>
  );
}
