'use client';
import Link from 'next/link';
import { useCatalog } from './CatalogProvider';
import ToyIcon, { catIcon } from './ToyIcon';

// "Belanja per Kategori" (dipakai di halaman keranjang & wishlist)
export default function ThemeRail() {
  const { categories: CATEGORIES } = useCatalog();
  return (
    <div className="themes">
      {CATEGORIES.map((c) => (
        <Link key={c.slug} href={`/produk?kategori=${c.slug}`} className="theme" style={{ '--c': c.color }}>
          <span className="theme-box"><b>{c.name}</b><i><ToyIcon name={catIcon(c.slug)} /></i></span>
        </Link>
      ))}
    </div>
  );
}
