'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { ANNOUNCEMENTS } from '../lib/config';
import Logo from './Logo';
import { CATEGORIES } from '../lib/products';
import { IcSearch, IcHeart, IcCart, IcLeft, IcRight, IcMenu, IcClose, IcBox, IcHelp, IcStore, IcDown } from './Icons';

const SHOP_LINKS = [
  ['Semua Produk', '/produk'],
  ['Produk Baru', '/produk?tag=baru'],
  ['Terlaris', '/produk?tag=terlaris'],
  ['Untuk Dewasa (18+)', '/produk?umur=18'],
  ['Stok Terbatas', '/produk?tag=terbatas'],
  ['Eksklusif', '/produk?tag=eksklusif'],
];

export default function Header() {
  const { count, wish, setDrawer } = useStore();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [ann, setAnn] = useState(0);
  const [mega, setMega] = useState(null);
  const [mobile, setMobile] = useState(false);
  const [msearch, setMsearch] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnn((a) => (a + 1) % ANNOUNCEMENTS.length), 5000);
    return () => clearTimeout(t);
  }, [ann]);

  const search = (e) => {
    e.preventDefault();
    setMobile(false); setMsearch(false);
    router.push(`/produk${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };
  const close = () => { setMega(null); setMobile(false); };
  const a = ANNOUNCEMENTS[ann];

  const SearchBox = ({ cls = '' }) => (
    <form className={`search ${cls}`} onSubmit={search}>
      <IcSearch size={18} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari..." aria-label="Cari produk" />
    </form>
  );

  return (
    <header className="hdr" onMouseLeave={() => setMega(null)}>
      <div className="topbar">
        <div className="wrap topbar-row">
          <div className="ann">
            <button onClick={() => setAnn((ann - 1 + ANNOUNCEMENTS.length) % ANNOUNCEMENTS.length)} aria-label="Sebelumnya"><IcLeft size={16} sw={2.4} /></button>
            <span key={ann}>{a.text} {a.link && <Link href={a.href}>{a.link}</Link>}</span>
            <button onClick={() => setAnn((ann + 1) % ANNOUNCEMENTS.length)} aria-label="Berikutnya"><IcRight size={16} sw={2.4} /></button>
          </div>
          <nav className="util">
            <Link href="/cara-belanja"><IcStore size={16} /> Cara Belanja</Link>
            <Link href="/pesanan"><IcBox size={16} /> Pesanan Saya</Link>
            <Link href="/cara-belanja#pembayaran"><IcHelp size={16} /> Bantuan</Link>
          </nav>
        </div>
      </div>

      <div className="mainbar">
        <div className="wrap mainbar-row">
          <button className="ico-btn burger" onClick={() => setMobile(true)} aria-label="Menu"><IcMenu size={26} /></button>
          <Logo />
          <nav className="menu">
            <button className={mega === 'shop' ? 'on' : ''} onMouseEnter={() => setMega('shop')} onClick={() => setMega(mega === 'shop' ? null : 'shop')}>BELANJA</button>
            <Link href="/produk?tag=eksklusif" onMouseEnter={() => setMega(null)}>EKSKLUSIF</Link>
            <button className={mega === 'cat' ? 'on' : ''} onMouseEnter={() => setMega('cat')} onClick={() => setMega(mega === 'cat' ? null : 'cat')}>KATEGORI</button>
            <Link href="/produk?tag=diskon" className="sale" onMouseEnter={() => setMega(null)}>SALE</Link>
          </nav>
          <SearchBox cls="search-desk" />
          <div className="icons">
            <button className="ico-btn m-only" onClick={() => setMsearch(!msearch)} aria-label="Cari"><IcSearch size={24} /></button>
            <Link href="/wishlist" className="ico-btn" aria-label="Wishlist"><IcHeart size={24} />{wish.length > 0 && <i className="count">{wish.length}</i>}</Link>
            <button className="ico-btn" onClick={() => setDrawer(true)} aria-label="Keranjang"><IcCart size={24} />{count > 0 && <i className="count">{count}</i>}</button>
          </div>
        </div>
        {msearch && <div className="wrap msearch"><SearchBox /></div>}
      </div>

      {mega && (
        <div className="mega">
          <div className="wrap">
            {mega === 'shop' ? (
              <div className="mega-cols">
                <div>
                  <h4>Belanja</h4>
                  {SHOP_LINKS.map(([l, h]) => <Link key={h} href={h} onClick={close}>{l}</Link>)}
                </div>
                <div>
                  <h4>Umur</h4>
                  {[['1,5+ tahun', '3-5'], ['6+ tahun', '6-8'], ['9+ tahun', '9-12'], ['13+ tahun', '13-17'], ['18+ tahun', '18']].map(([l, s]) => <Link key={s} href={`/produk?umur=${s}`} onClick={close}>{l}</Link>)}
                </div>
                <div>
                  <h4>Harga</h4>
                  {[['Di bawah Rp250rb', '0-250'], ['Rp250rb – Rp500rb', '250-500'], ['Rp500rb – Rp1jt', '500-1000'], ['Rp1jt – Rp2,5jt', '1000-2500'], ['Di atas Rp2,5jt', '2500']].map(([l, s]) => <Link key={s} href={`/produk?harga=${s}`} onClick={close}>{l}</Link>)}
                </div>
              </div>
            ) : (
              <div className="mega-cats">
                {CATEGORIES.map((c) => (
                  <Link key={c.slug} href={`/produk?kategori=${c.slug}`} onClick={close} className="mega-cat">
                    <span style={{ background: c.color }}>{c.emoji}</span>{c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {mobile && (
        <div className="overlay" onClick={() => setMobile(false)}>
          <aside className="mnav" onClick={(e) => e.stopPropagation()}>
            <div className="mnav-top"><Logo /><button className="ico-btn" onClick={() => setMobile(false)} aria-label="Tutup"><IcClose /></button></div>
            <details open><summary>BELANJA <IcDown size={18} /></summary>{SHOP_LINKS.map(([l, h]) => <Link key={h} href={h} onClick={close}>{l}</Link>)}</details>
            <Link className="mnav-link" href="/produk?tag=eksklusif" onClick={close}>EKSKLUSIF</Link>
            <details><summary>KATEGORI <IcDown size={18} /></summary>{CATEGORIES.map((c) => <Link key={c.slug} href={`/produk?kategori=${c.slug}`} onClick={close}>{c.emoji} {c.name}</Link>)}</details>
            <Link className="mnav-link sale-txt" href="/produk?tag=diskon" onClick={close}>SALE</Link>
            <div className="mnav-util">
              <Link href="/pesanan" onClick={close}><IcBox size={18} /> Pesanan Saya</Link>
              <Link href="/wishlist" onClick={close}><IcHeart size={18} /> Wishlist</Link>
              <Link href="/cara-belanja" onClick={close}><IcHelp size={18} /> Cara Belanja</Link>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
