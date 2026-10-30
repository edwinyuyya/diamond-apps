'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getOrders } from '../../lib/store';
import { formatRp } from '../../lib/products';

export default function Orders() {
  const [orders, setOrders] = useState(null);
  useEffect(() => setOrders(getOrders()), []);
  if (!orders) return <div className="wrap pad">Memuat…</div>;
  return (
    <div className="wrap pad narrow">
      <div className="crumbs"><Link href="/">Beranda</Link> / <span>Pesanan Saya</span></div>
      <h1 className="page-title">Pesanan Saya</h1>
      <p className="muted">Daftar pesanan yang dibuat dari perangkat ini.</p>
      {orders.length === 0 ? (
        <div className="empty"><div style={{ fontSize: 56 }}>📦</div><p>Belum ada pesanan.</p><Link href="/produk" className="btn btn-primary">Mulai Belanja</Link></div>
      ) : orders.map((o) => (
        <Link key={o.id} href={`/pembayaran/${o.id}`} className="panel order-row">
          <div><b>{o.id}</b><small className="muted">{new Date(o.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} · {o.items.reduce((s, l) => s + l.qty, 0)} barang</small></div>
          <div className="right"><b>{formatRp(o.total)}</b><small className="tag">Lihat cara bayar →</small></div>
        </Link>
      ))}
    </div>
  );
}
