'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { STORE, ANNOUNCEMENTS } from '../lib/config';
import { CATEGORIES, AGE_GROUPS, PRICE_RANGES } from '../lib/products';

const MENU = [
  { label: 'Kategori', mega: 'cat' },
  { label: 'Umur', mega: 'age' },
  { label: 'Harga', mega: 'price' },
  { label: 'Produk Baru', href: '/produk?tag=baru' },
  { label: 'Terlaris', href: '/produk?tag=terlaris' },
  { label: 'Eksklusif', href: '/produk?tag=eksklusif' },
  { label: 'Promo', href: '/produk?tag=diskon', hot: true },
];

export default function Header() {
  const { count, setDrawer } = useStore();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [ann, setAnn] = useState(0);
  const [open, setOpen] = useState(null); // mega menu desktop
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setAnn((a) => (a + 1) % ANNOUNCEMENTS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const search = (e) => {
    e.preventDefault();
    setMobile(false);
    router.push(`/produk${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };
  const close = () => { setOpen(null); setMobile(false); };

  const megaContent = (type) => {
    if (type === 'cat') return (
      <div className="mega-grid">
        {CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/produk?kategori=${c.slug}`} className="mega-cat" onClick={close}>
            <span className="mega-ico" style={{ background: c.color }}>{c.emoji}</span>
            <span><b>{c.name}</b><small>{c.desc}</small></span>
          </Link>
        ))}
      </div>
    );
    const list = type === 'age' ? AGE_GROUPS : PRICE_RANGES;
    const key = type === 'age' ? 'umur' : 'harga';
    return (
      <div className="mega-list">
        {list.map((x) => (
          <Link key={x.slug} href={`/produk?${key}=${x.slug}`} onClick={close}>{x.name}</Link>
        ))}
      </div>
    );
  };

  return (
    <header className="hdr" onMouseLeave={() => setOpen(null)}>
      <div className="ann"><span key={ann}>{ANNOUNCEMENTS[ann]}</span></div>
      <div className="hdr-main">
        <div className="wrap hdr-row">
          <button className="hdr-burger" aria-label="Menu" onClick={() => setMobile(true)}>☰</button>
          <Link href="/" className="logo" onClick={close}>
            <span className="logo-mark">BT</span>
            <span className="logo-text">{STORE.name}</span>
          </Link>
          <form className="hdr-search" onSubmit={search}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari action figure, brick set, anime…" />
            <button aria-label="Cari">🔍</button>
          </form>
          <div className="hdr-actions">
            <Link href="/pesanan" className="hdr-act" title="Pesanan Saya"><span>📦</span><small>Pesanan</small></Link>
            <button className="hdr-act" onClick={() => setDrawer(true)} title="Keranjang">
              <span>🛒</span><small>Keranjang</small>
              {count > 0 && <i className="hdr-count">{count}</i>}
            </button>
          </div>
        </div>
      </div>
      <nav className="nav">
        <div className="wrap nav-row">
          {MENU.map((m) =>
            m.mega ? (
              <button key={m.label} className={`nav-link ${open === m.mega ? 'on' : ''}`}
                onMouseEnter={() => setOpen(m.mega)} onClick={() => setOpen(open === m.mega ? null : m.mega)}>
                {m.label} ▾
              </button>
            ) : (
              <Link key={m.label} href={m.href} className={`nav-link ${m.hot ? 'hot' : ''}`}
                onMouseEnter={() => setOpen(null)} onClick={close}>{m.label}</Link>
            )
          )}
        </div>
        {open && <div className="mega"><div className="wrap">{megaContent(open)}</div></div>}
      </nav>

      {mobile && (
        <div className="mnav-bg" onClick={() => setMobile(false)}>
          <aside className="mnav" onClick={(e) => e.stopPropagation()}>
            <div className="mnav-top"><b>Menu</b><button onClick={() => setMobile(false)}>✕</button></div>
            <form className="hdr-search m" onSubmit={search}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk…" />
              <button>🔍</button>
            </form>
            {[['Kategori', 'cat'], ['Umur', 'age'], ['Harga', 'price']].map(([l, t]) => (
              <details key={t}><summary>{l}</summary>{megaContent(t)}</details>
            ))}
            {MENU.filter((m) => m.href).map((m) => (
              <Link key={m.label} href={m.href} className="mnav-link" onClick={close}>{m.label}</Link>
            ))}
            <Link href="/pesanan" className="mnav-link" onClick={close}>Pesanan Saya</Link>
            <Link href="/cara-belanja" className="mnav-link" onClick={close}>Cara Belanja</Link>
          </aside>
        </div>
      )}
    </header>
  );
}
