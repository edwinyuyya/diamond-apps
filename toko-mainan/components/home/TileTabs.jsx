'use client';
import Link from 'next/link';
import { useState } from 'react';
import { CATEGORIES } from '../../lib/products';

// Section hitam "Terbaru | Minat | Kategori" dengan kartu tegak
const TABS = {
  'Terbaru': [
    { label: 'PRODUK BARU', href: '/produk?tag=baru', emoji: '🆕', bg: '#ff8a00' },
    { label: 'STOK TERBATAS', href: '/produk?tag=terbatas', emoji: '⏳', bg: '#2d7ff9' },
    { label: 'TERLARIS', href: '/produk?tag=terlaris', emoji: '🔥', bg: '#ffc400' },
    { label: 'EKSKLUSIF', href: '/produk?tag=eksklusif', emoji: '👑', bg: '#ff8a00' },
    { label: 'SALE', href: '/produk?tag=diskon', emoji: '🏷️', bg: '#e3000b' },
    { label: 'LIHAT SEMUA', href: '/produk', emoji: '🧱', bg: '#0b2d5e' },
  ],
  'Minat': [
    { label: 'BLIND BOX', href: '/produk?kategori=blind-box', emoji: '🎁', bg: '#f27c00' },
    { label: 'FAT TIGER', href: '/produk?q=fat tiger', emoji: '🐯', bg: '#ff8a00' },
    { label: 'GANTUNGAN TAS', href: '/produk?q=gantungan', emoji: '🎒', bg: '#e3000b' },
    { label: 'DIY MINIATUR', href: '/produk?kategori=rolife', emoji: '🏠', bg: '#d81b60' },
    { label: 'KOLEKTOR', href: '/produk?umur=13-17', emoji: '🏆', bg: '#0b2d5e' },
    { label: 'LIHAT SEMUA', href: '/produk', emoji: '🧸', bg: '#2d7ff9' },
  ],
  'Kategori': CATEGORIES.map((c) => ({ label: c.name.toUpperCase(), href: `/produk?kategori=${c.slug}`, emoji: c.emoji, bg: c.color })),
};

export default function TileTabs() {
  const [tab, setTab] = useState('Terbaru');
  return (
    <section className="tiles-sec">
      <div className="wrap">
        <div className="tabs-lg">
          {Object.keys(TABS).map((t) => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
        </div>
        <div className="tiles" key={tab}>
          {TABS[tab].map((x) => (
            <Link key={x.label} href={x.href} className="tile" style={{ '--bg': x.bg }}>
              <b>{x.label}</b>
              <span>{x.emoji}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
