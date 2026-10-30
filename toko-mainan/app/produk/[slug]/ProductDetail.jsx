'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductImage from '../../../components/ProductImage';
import QtyInput from '../../../components/QtyInput';
import { useStore } from '../../../lib/store';
import { finalPrice, discountPct, formatRp, getCategory } from '../../../lib/products';
import { SHIPPING } from '../../../lib/config';
import { waChatUrl } from '../../../lib/order';

export default function ProductDetail({ product: p }) {
  const { add, setDrawer } = useStore();
  const router = useRouter();
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('desc');
  const out = p.stock <= 0;
  const views = p.images?.length || 4;
  const disc = discountPct(p);

  const buyNow = () => { add(p.id, qty); setDrawer(false); router.push('/checkout'); };

  return (
    <div className="pdp">
      <div className="pdp-gallery">
        <div className="pdp-main">
          <ProductImage product={p} index={img} size="lg" />
          {disc > 0 && <span className="badge badge-diskon pdp-badge">-{disc}%</span>}
        </div>
        <div className="pdp-thumbs">
          {Array.from({ length: views }).map((_, i) => (
            <button key={i} className={i === img ? 'on' : ''} onClick={() => setImg(i)}><ProductImage product={p} index={i} size="sm" /></button>
          ))}
        </div>
      </div>
      <div className="pdp-info">
        <div className="card-cat">{getCategory(p.category)?.name} · Kode: {p.id}</div>
        <h1>{p.name}</h1>
        <div className="card-rating lg">★ {p.rating.toFixed(1)} <span>· {p.sold} terjual</span></div>
        <div className="pdp-price">
          <b>{formatRp(finalPrice(p))}</b>
          {p.salePrice && <><s>{formatRp(p.price)}</s><span className="save">Hemat {formatRp(p.price - p.salePrice)}</span></>}
        </div>
        <div className="pdp-meta">
          <div><small>Umur</small><b>{p.age}+</b></div>
          {p.specs && Object.entries(p.specs).slice(0, 2).map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
          <div><small>Stok</small><b className={out ? 'red' : p.stock <= 5 ? 'orange' : 'green'}>{out ? 'Habis' : p.stock <= 5 ? `Sisa ${p.stock}` : 'Tersedia'}</b></div>
        </div>
        {!out && (
          <div className="pdp-buy">
            <QtyInput value={qty} max={p.stock} onChange={setQty} />
            <button className="btn btn-primary btn-lg grow" onClick={() => add(p.id, qty)}>+ Keranjang</button>
          </div>
        )}
        {out ? (
          <a className="btn btn-ghost btn-block btn-lg" href={waChatUrl(`Halo, apakah ${p.name} (${p.id}) akan restock?`)} target="_blank" rel="noreferrer">Tanya Restock via WhatsApp</a>
        ) : (
          <button className="btn btn-dark btn-block btn-lg" onClick={buyNow}>Beli Sekarang</button>
        )}
        <ul className="pdp-perks">
          <li>🚚 Gratis ongkir untuk belanja di atas {formatRp(SHIPPING.freeAbove)}</li>
          <li>✅ Produk 100% original</li>
          <li>📦 Dikemas aman dengan bubble wrap & kardus</li>
        </ul>
        <div className="tabs">
          <button className={tab === 'desc' ? 'on' : ''} onClick={() => setTab('desc')}>Deskripsi</button>
          <button className={tab === 'spec' ? 'on' : ''} onClick={() => setTab('spec')}>Spesifikasi</button>
        </div>
        {tab === 'desc' ? <p className="pdp-desc">{p.description}</p> : (
          <table className="spec"><tbody>
            <tr><td>Kode Produk</td><td>{p.id}</td></tr>
            <tr><td>Rekomendasi Umur</td><td>{p.age}+ tahun</td></tr>
            {p.specs && Object.entries(p.specs).map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
          </tbody></table>
        )}
      </div>
    </div>
  );
}
