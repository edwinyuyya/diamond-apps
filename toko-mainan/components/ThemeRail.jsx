import Link from 'next/link';
import { CATEGORIES } from '../lib/products';

// "Belanja per Kategori" (dipakai di halaman keranjang & wishlist)
export default function ThemeRail() {
  return (
    <div className="themes">
      {CATEGORIES.map((c) => (
        <Link key={c.slug} href={`/produk?kategori=${c.slug}`} className="theme" style={{ '--c': c.color }}>
          <span className="theme-box"><b>{c.name}</b><i>{c.emoji}</i></span>
        </Link>
      ))}
    </div>
  );
}
