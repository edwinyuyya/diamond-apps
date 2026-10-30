import { Suspense } from 'react';
import Catalog from './Catalog';

export const metadata = { title: 'Semua Produk' };

export default function Page() {
  return <Suspense fallback={<div className="wrap pad">Memuat…</div>}><Catalog /></Suspense>;
}
