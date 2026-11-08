'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCatalog } from '../CatalogProvider';
import { useLang } from '../LangProvider';
import ToyIcon, { catIcon } from '../ToyIcon';

// Section "Terbaru | Minat | Kategori": kartu berwarna dengan pita judul & ilustrasi mainan.
// Ilustrasi ada di /public/tiles/*.webp (latar transparan). Judul ditulis sebagai teks supaya ikut bahasa ID/EN.
// bg = warna kartu, rb = warna pita judul ('red' / 'blue'), art = gambar ilustrasi atau ikon (icon)
const BASE_TABS = {
  latest: [
    { label: 'tiles.new', href: '/produk?tag=baru', art: 'baru', bg: '#ffbf2e', rb: 'red' },
    { label: 'tiles.limited', href: '/produk?tag=terbatas', art: 'stok', bg: '#3a8bf4', rb: 'blue', hi: true },
    { label: 'tiles.best', href: '/produk?tag=terlaris', art: 'terlaris', bg: '#8fd14f', rb: 'red', crown: true },
    { label: 'tiles.exclusive', href: '/produk?tag=eksklusif', art: 'eksklusif', bg: '#ffd23f', rb: 'red', crown: true },
    { label: 'tiles.sale', href: '/produk?tag=diskon', art: 'sale', bg: '#f2453d', rb: 'blue', layer: true },
    { label: 'tiles.all', href: '/produk', art: 'semua', bg: '#56b0f5', rb: 'blue' },
  ],
  interest: [
    { label: 'Blind Box', href: '/produk?kategori=blind-box', icon: 'box', bg: '#a46cf0', rb: 'red' },
    { label: 'Fat Tiger', href: '/produk?q=fat tiger', icon: 'tiger', bg: '#ff9f1c', rb: 'blue' },
    { label: 'tiles.bagCharm', href: '/produk?q=pendant', icon: 'charm', bg: '#ff6b9a', rb: 'blue' },
    { label: 'tiles.diy', href: '/produk?kategori=rolife', icon: 'house', bg: '#2ec4b6', rb: 'red' },
    { label: 'tiles.collector', href: '/produk?umur=13-17', art: 'eksklusif', bg: '#ffd23f', rb: 'red', crown: true },
    { label: 'tiles.all', href: '/produk', art: 'semua', bg: '#56b0f5', rb: 'blue' },
  ],
};
const TABS_META = { latest: ['tiles.latest', 'spark'], interest: ['tiles.interest', 'bear'], category: ['tiles.category', 'grid'] };

const TabIcon = ({ name }) => name === 'spark' ? (
  <svg className="tt-spark" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 3l2.5 4M2 10h4.5M4.5 16l3-3" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" /></svg>
) : name === 'bear' ? (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="6" cy="6" r="3.6" fill="currentColor" /><circle cx="18" cy="6" r="3.6" fill="currentColor" /><circle cx="12" cy="13.5" r="8.5" fill="currentColor" /><circle cx="9" cy="12" r="1.3" fill="#0d2147" /><circle cx="15" cy="12" r="1.3" fill="#0d2147" /><ellipse cx="12" cy="16" rx="2.2" ry="1.5" fill="#0d2147" /></svg>
) : (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">{[[2, 2], [13, 2], [2, 13], [13, 13]].map(([x, y]) => <rect key={x + '' + y} x={x} y={y} width="9" height="9" rx="2.5" fill="currentColor" />)}</svg>
);

// Bintang & garis kilau dekorasi di latar kartu
const Deco = () => (
  <svg className="tcard-deco" viewBox="0 0 200 280" preserveAspectRatio="none" aria-hidden="true">
    <path d="M22 40 l6 10 M14 56 h11 M24 70 l7-7" stroke="#ffe35a" strokeWidth="4" strokeLinecap="round" />
    <path d="M176 30 l-6 10 M186 46 h-11" stroke="#ffe35a" strokeWidth="4" strokeLinecap="round" />
    <path d="M24 150 l3.5 7 7.5 1-5.5 5 1.5 7.5-7-3.5-7 3.5 1.5-7.5-5.5-5 7.5-1z" fill="#fff" opacity=".35" />
    <path d="M178 120 l3 6 6.5 1-4.7 4.5 1.2 6.5-6-3.2-6 3.2 1.2-6.5-4.7-4.5 6.5-1z" fill="#fff" opacity=".35" />
  </svg>
);

const Crown = () => (
  <svg className="tcard-crown" viewBox="0 0 120 70" aria-hidden="true">
    <path d="M14 62 L8 18 L36 38 L60 6 L84 38 L112 18 L106 62Z" fill="#ffd400" stroke="#8a4b12" strokeWidth="5" strokeLinejoin="round" />
    <path d="M22 54 L19 32 L34 44" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".7" />
    <circle cx="8" cy="18" r="7" fill="#ffd400" stroke="#8a4b12" strokeWidth="4" />
    <circle cx="60" cy="6" r="6" fill="#ffd400" stroke="#8a4b12" strokeWidth="4" />
    <circle cx="112" cy="18" r="7" fill="#ffd400" stroke="#8a4b12" strokeWidth="4" />
    <circle cx="60" cy="44" r="6" fill="#ff8a00" />
  </svg>
);

export default function TileTabs() {
  const { categories } = useCatalog();
  const { t } = useLang();
  const TABS = { ...BASE_TABS, category: categories.map((c) => ({ label: c.name, href: `/produk?kategori=${c.slug}`, icon: catIcon(c.slug), bg: c.color, rb: 'blue' })) };
  const [tab, setTab] = useState('latest');
  const txt = (l) => (l.startsWith('tiles.') ? t(l) : l);
  return (
    <section className="tiles-sec">
      <div className="wrap">
        <div className="ttabs">
          {Object.keys(TABS).map((k) => (
            <button key={k} className={k === tab ? 'on' : ''} onClick={() => setTab(k)}>
              <TabIcon name={TABS_META[k][1]} /><span>{t(TABS_META[k][0])}</span>
            </button>
          ))}
          <img className="ttabs-deco" src="/tiles/deco.webp" alt="" />
        </div>
        <div className="tiles" key={tab}>
          {TABS[tab].map((x) => {
            const words = txt(x.label).split(' ');
            return (
              <Link key={x.label + x.href} href={x.href} className="tcard" style={{ '--bg': x.bg }}>
                <Deco />
                <span className={`tcard-title rb-${x.rb} ${x.layer ? 'layer' : ''}`}>
                  {x.crown && <Crown />}
                  <b>{x.hi && words.length > 1 ? <>{words.slice(0, -1).join(' ')} <em>{words.at(-1)}</em></> : words.join(' ')}</b>
                </span>
                <span className="tcard-art">
                  {x.art ? <img src={`/tiles/${x.art}.webp`} alt="" loading="lazy" /> : <ToyIcon name={x.icon} />}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
