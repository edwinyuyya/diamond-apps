'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCatalog } from '../CatalogProvider';
import { useLang } from '../LangProvider';

// Section hitam "Terbaru | Minat | Kategori" dengan kartu tegak
const BASE_TABS = {
  latest: [
    { label: 'tiles.new', href: '/produk?tag=baru', emoji: '🆕', bg: '#ff8a00' },
    { label: 'tiles.limited', href: '/produk?tag=terbatas', emoji: '⏳', bg: '#2d7ff9' },
    { label: 'tiles.best', href: '/produk?tag=terlaris', emoji: '🔥', bg: '#ffc400' },
    { label: 'tiles.exclusive', href: '/produk?tag=eksklusif', emoji: '👑', bg: '#ff8a00' },
    { label: 'tiles.sale', href: '/produk?tag=diskon', emoji: '🏷️', bg: '#e3000b' },
    { label: 'tiles.all', href: '/produk', emoji: '🧱', bg: '#0b2d5e' },
  ],
  interest: [
    { label: 'BLIND BOX', href: '/produk?kategori=blind-box', emoji: '🎁', bg: '#f27c00' },
    { label: 'FAT TIGER', href: '/produk?q=fat tiger', emoji: '🐯', bg: '#ff8a00' },
    { label: 'tiles.bagCharm', href: '/produk?q=pendant', emoji: '🎒', bg: '#e3000b' },
    { label: 'tiles.diy', href: '/produk?kategori=rolife', emoji: '🏠', bg: '#d81b60' },
    { label: 'tiles.collector', href: '/produk?umur=13-17', emoji: '🏆', bg: '#0b2d5e' },
    { label: 'tiles.all', href: '/produk', emoji: '🧸', bg: '#2d7ff9' },
  ],
};
const TAB_NAMES = { latest: 'tiles.latest', interest: 'tiles.interest', category: 'tiles.category' };

export default function TileTabs() {
  const { categories } = useCatalog();
  const { t } = useLang();
  const TABS = { ...BASE_TABS, category: categories.map((c) => ({ label: c.name.toUpperCase(), href: `/produk?kategori=${c.slug}`, emoji: c.emoji, bg: c.color })) };
  const [tab, setTab] = useState('latest');
  return (
    <section className="tiles-sec">
      <div className="wrap">
        <div className="tabs-lg">
          {Object.keys(TABS).map((k) => <button key={k} className={k === tab ? 'on' : ''} onClick={() => setTab(k)}>{t(TAB_NAMES[k])}</button>)}
        </div>
        <div className="tiles" key={tab}>
          {TABS[tab].map((x) => (
            <Link key={x.label + x.href} href={x.href} className="tile" style={{ '--bg': x.bg }}>
              <b>{x.label.startsWith('tiles.') ? t(x.label) : x.label}</b>
              <span>{x.emoji}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
