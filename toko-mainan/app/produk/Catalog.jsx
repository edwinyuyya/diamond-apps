'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import ProductCard from '../../components/ProductCard';
import { PRODUCTS, CATEGORIES, AGE_GROUPS, PRICE_RANGES, finalPrice, getCategory } from '../../lib/products';

const SORTS = [
  ['rekomendasi', 'Rekomendasi'], ['terbaru', 'Terbaru'], ['terlaris', 'Terlaris'],
  ['termurah', 'Harga Terendah'], ['termahal', 'Harga Tertinggi'], ['rating', 'Rating Tertinggi'],
];
const TAGS = { baru: 'Produk Baru', terlaris: 'Terlaris', eksklusif: 'Eksklusif', diskon: 'Promo' };

export default function Catalog() {
  const sp = useSearchParams();
  const router = useRouter();
  const [showFilter, setShowFilter] = useState(false);

  const list = (k) => (sp.get(k) ? sp.get(k).split(',') : []);
  const kat = list('kategori'), umur = list('umur'), harga = list('harga');
  const q = sp.get('q') || '', tag = sp.get('tag') || '', sort = sp.get('sort') || 'rekomendasi';
  const stok = sp.get('stok') === '1';

  const update = (k, v) => {
    const p = new URLSearchParams(sp.toString());
    if (v === '' || v == null || (Array.isArray(v) && !v.length)) p.delete(k);
    else p.set(k, Array.isArray(v) ? v.join(',') : v);
    router.push(`/produk${p.toString() ? `?${p}` : ''}`, { scroll: false });
  };
  const toggle = (k, cur, v) => update(k, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);

  const result = useMemo(() => {
    let r = PRODUCTS.filter((p) => {
      if (q && !`${p.name} ${p.description} ${getCategory(p.category)?.name}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (kat.length && !kat.includes(p.category)) return false;
      if (tag && p.badge.toLowerCase() !== tag && !(tag === 'diskon' && p.salePrice)) return false;
      if (stok && p.stock <= 0) return false;
      if (umur.length && !AGE_GROUPS.filter((a) => umur.includes(a.slug)).some((a) => p.age >= a.min && p.age <= a.max)) return false;
      if (harga.length && !PRICE_RANGES.filter((h) => harga.includes(h.slug)).some((h) => finalPrice(p) >= h.min && finalPrice(p) < h.max)) return false;
      return true;
    });
    const s = {
      terbaru: (a, b) => (b.badge === 'Baru') - (a.badge === 'Baru'),
      terlaris: (a, b) => b.sold - a.sold,
      termurah: (a, b) => finalPrice(a) - finalPrice(b),
      termahal: (a, b) => finalPrice(b) - finalPrice(a),
      rating: (a, b) => b.rating - a.rating,
    }[sort];
    if (s) r = [...r].sort(s);
    return r;
  }, [sp]); // eslint-disable-line

  const title = q ? `Hasil pencarian "${q}"`
    : kat.length === 1 ? getCategory(kat[0])?.name
    : tag ? TAGS[tag] : 'Semua Produk';
  const active = kat.length + umur.length + harga.length + (stok ? 1 : 0) + (tag ? 1 : 0) + (q ? 1 : 0);

  const Group = ({ title, k, cur, opts }) => (
    <div className="fgroup">
      <h4>{title}</h4>
      {opts.map((o) => (
        <label key={o.slug} className="fcheck">
          <input type="checkbox" checked={cur.includes(o.slug)} onChange={() => toggle(k, cur, o.slug)} />
          <span>{o.name}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="wrap pad">
      <div className="crumbs"><Link href="/">Beranda</Link> / <span>{title}</span></div>
      <div className="cat-head">
        <h1>{title}</h1>
        <p className="muted">{result.length} produk ditemukan</p>
      </div>
      <div className="catalog">
        <aside className={`filters ${showFilter ? 'open' : ''}`}>
          <div className="filters-top">
            <b>Filter</b>
            {active > 0 && <Link href="/produk" className="link-btn">Hapus semua</Link>}
            <button className="filters-close" onClick={() => setShowFilter(false)}>✕</button>
          </div>
          <Group title="Kategori" k="kategori" cur={kat} opts={CATEGORIES} />
          <Group title="Umur" k="umur" cur={umur} opts={AGE_GROUPS} />
          <Group title="Harga" k="harga" cur={harga} opts={PRICE_RANGES} />
          <div className="fgroup">
            <h4>Ketersediaan</h4>
            <label className="fcheck"><input type="checkbox" checked={stok} onChange={() => update('stok', stok ? '' : '1')} /><span>Hanya yang tersedia</span></label>
          </div>
          <button className="btn btn-primary btn-block filters-apply" onClick={() => setShowFilter(false)}>Lihat {result.length} produk</button>
        </aside>
        <div>
          <div className="toolbar">
            <button className="btn btn-ghost filter-toggle" onClick={() => setShowFilter(true)}>⚙ Filter {active > 0 && `(${active})`}</button>
            <div className="chips">
              {tag && <button className="chip" onClick={() => update('tag', '')}>{TAGS[tag]} ✕</button>}
              {q && <button className="chip" onClick={() => update('q', '')}>"{q}" ✕</button>}
            </div>
            <label className="sort">Urutkan:
              <select value={sort} onChange={(e) => update('sort', e.target.value === 'rekomendasi' ? '' : e.target.value)}>
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          {result.length === 0 ? (
            <div className="empty"><div style={{ fontSize: 56 }}>🔍</div><p>Produk tidak ditemukan. Coba ubah filter.</p><Link href="/produk" className="btn btn-primary">Lihat semua produk</Link></div>
          ) : (
            <div className="grid">{result.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
