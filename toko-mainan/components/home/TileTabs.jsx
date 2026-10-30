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
    { label: 'KOLEKTOR DEWASA', href: '/produk?umur=18', emoji: '🏆', bg: '#0b2d5e' },
    { label: 'HADIAH ANAK', href: '/produk?umur=3-5', emoji: '🎁', bg: '#ff6a13' },
    { label: 'SUPERHERO', href: '/produk?q=hero', emoji: '🦸', bg: '#e3000b' },
    { label: 'ANIME', href: '/produk?kategori=anime-figure', emoji: '🍥', bg: '#8e24aa' },
    { label: 'OTOMOTIF', href: '/produk?kategori=diecast', emoji: '🏎️', bg: '#2d7ff9' },
    { label: 'DI BAWAH 250RB', href: '/produk?harga=0-250', emoji: '💰', bg: '#13854a' },
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
