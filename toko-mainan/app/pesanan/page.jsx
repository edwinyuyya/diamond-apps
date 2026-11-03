'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getOrders } from '../../lib/store';
import { formatRp } from '../../lib/products';
import { useLang } from '../../components/LangProvider';
import { locale } from '../../lib/i18n';

export default function Orders() {
  const { lang, t } = useLang();
  const [orders, setOrders] = useState(null);
  useEffect(() => setOrders(getOrders()), []);
  if (!orders) return <div className="wrap pad">{t('common.loading')}</div>;
  return (
    <div className="wrap pad narrow">
      <div className="crumbs"><Link href="/">{t('common.home')}</Link> / <span>{t('hdr.myOrders')}</span></div>
      <h1 className="page-title">{t('hdr.myOrders')}</h1>
      <p className="muted">{t('orders.text')}</p>
      {orders.length === 0 ? (
        <div className="empty"><div style={{ fontSize: 56 }}>📦</div><p>{t('orders.none')}</p><Link href="/produk" className="btn btn-primary">{t('common.startShopping')}</Link></div>
      ) : orders.map((o) => (
        <Link key={o.id} href={`/pembayaran/${o.id}`} className="panel order-row">
          <div><b>{o.id}</b><small className="muted">{new Date(o.createdAt).toLocaleString(locale(lang), { dateStyle: 'medium', timeStyle: 'short' })} · {o.items.reduce((s, l) => s + l.qty, 0)} {t('common.items')}</small></div>
          <div className="right"><b>{formatRp(o.total)}</b><small className="tag">{t('orders.howToPay')}</small></div>
        </Link>
      ))}
    </div>
  );
}
