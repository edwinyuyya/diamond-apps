import Link from 'next/link';
import { STORE } from '../lib/config';
import { imgUrl } from '../lib/image';

// Logo Toyzone (versi SVG/teks). Kalau STORE.logoImage diisi, pakai file gambar itu.
function BoxO() {
  return (
    <svg className="logo-box" viewBox="0 0 40 52" aria-hidden="true">
      <path d="M13 6 30 14l2 8-17-8z" fill="#ffc400" stroke="#0b2d5e" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M4 26 20 18l16 8v17l-16 8-16-8z" fill="#ff8a00" stroke="#0b2d5e" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M20 18v33M4 26l16 8 16-8" fill="none" stroke="#0b2d5e" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M20 34 36 26v17l-16 8z" fill="#ff6a13" />
      <path d="M20 34 36 26v17l-16 8zM4 26l16 8v17L4 43z" fill="none" stroke="#0b2d5e" strokeWidth="2.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ small }) {
  return (
    <Link href="/" className={`logo ${small ? 'logo-sm' : ''}`} aria-label={STORE.name}>
      {STORE.logoImage ? <img src={imgUrl(STORE.logoImage, 600)} referrerPolicy="no-referrer" alt={STORE.name} /> : (
        <span className="logo-art">
          <span className="logo-word">T<BoxO />y<em>z</em>o<em className="road">n</em>e</span>
          <span className="logo-slogan">{STORE.slogan}</span>
        </span>
      )}
    </Link>
  );
}
