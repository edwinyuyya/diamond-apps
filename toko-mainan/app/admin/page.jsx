'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AdminBar from '../../components/admin/AdminBar';
import ProductImage from '../../components/ProductImage';
import { finalPrice, formatRp, hasPrice } from '../../lib/products';

export default function AdminHome() {
  const [products, setProducts] = useState(null);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  useEffect(() => { fetch('/api/admin/products').then((r) => { if (r.status === 401) { location.href = '/admin/login'; return {}; } return r.json(); }).then((d) => setProducts(d.products || [])); }, []);

  const patch = async (p, body, msg) => {
    const r = await fetch(`/api/admin/products/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) return notify('⚠️ ' + d.error);
    setProducts((ps) => ps.map((x) => (x.id === p.id ? d.product : x)));
    notify(msg);
  };

  const list = useMemo(() => (products || []).filter((p) => `${p.name} ${p.id} ${p.categoryName}`.toLowerCase().includes(q.toLowerCase())), [products, q]);
  const noPrice = (products || []).filter((p) => p.visible !== false && !hasPrice(p)).length;

  return (
    <>
      <AdminBar />
      <main className="adm-wrap adm-page">
        <div className="adm-head">
          <div>
            <h1>Produk</h1>
            <p className="adm-muted">{products ? `${products.length} produk · ${products.filter((p) => p.visible !== false).length} tampil di toko` : 'Memuat…'}</p>
          </div>
          <Link href="/admin/produk/baru" className="adm-btn adm-btn-primary">+ Tambah Produk</Link>
        </div>
        {noPrice > 0 && <div className="adm-alert">ℹ️ {noPrice} produk belum ada harganya, jadi pembeli hanya bisa "Tanya Harga via WA". Klik <b>Ubah</b> untuk mengisi harga.</div>}
        <input className="adm-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / kode produk…" />

        <div className="adm-list">
          {list.map((p) => (
            <div key={p.id} className={`adm-item ${p.visible === false ? 'off' : ''}`}>
              <Link href={`/admin/produk/${p.id}`} className="adm-thumb"><ProductImage product={p} size="sm" /></Link>
              <div className="adm-info">
                <Link href={`/admin/produk/${p.id}`} className="adm-name">{p.name}</Link>
                <small className="adm-muted">{p.id} · {p.categoryName}{p.series ? ` · ${p.series}` : ''} · {p.images.length} foto</small>
                <b className={hasPrice(p) ? '' : 'adm-warn'}>{hasPrice(p) ? formatRp(finalPrice(p)) : 'Harga belum diisi'}{p.salePrice ? <s className="adm-muted"> {formatRp(p.price)}</s> : null}</b>
              </div>
              <label className="adm-stock">Stok
                <input type="number" min="0" defaultValue={p.stock} onBlur={(e) => { if (+e.target.value !== p.stock) patch(p, { stock: e.target.value }, 'Stok disimpan'); }} />
              </label>
              <label className="adm-switch" title="Tampil di toko">
                <input type="checkbox" checked={p.visible !== false} onChange={(e) => patch(p, { visible: e.target.checked }, e.target.checked ? 'Produk ditampilkan' : 'Produk disembunyikan')} />
                <span>{p.visible === false ? 'Disembunyikan' : 'Tampil'}</span>
              </label>
              <Link href={`/admin/produk/${p.id}`} className="adm-btn">Ubah</Link>
            </div>
          ))}
          {products && list.length === 0 && <p className="adm-muted">Tidak ada produk.</p>}
        </div>
      </main>
      {toast && <div className="adm-toast">{toast}</div>}
    </>
  );
}
