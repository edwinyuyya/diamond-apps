'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

function BoxMark() {
  return (
    <svg viewBox="0 0 40 52" width="20" height="26" aria-hidden="true">
      <path d="M13 6 30 14l2 8-17-8z" fill="#ffc400" stroke="#0b2d5e" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M4 26 20 18l16 8v17l-16 8-16-8z" fill="#ff8a00" stroke="#0b2d5e" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M20 18v33M4 26l16 8 16-8" fill="none" stroke="#0b2d5e" strokeWidth="2.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function Header() {
  const path = usePathname();
  const router = useRouter();
  const logout = async () => { await fetch('/api/login', { method: 'DELETE' }); router.push('/login'); };
  const nav = [['/', 'Pengajuan'], ['/riwayat', 'Riwayat'], ['/pengaturan', 'Pengaturan']];
  return (
    <header className="hdr">
      <div className="wrap hdr-row">
        <Link href="/" className="logo">
          <span className="logo-word">T<BoxMark />y<em>z</em>o<em>n</em>e</span>
          <span className="logo-sub">POSTER</span>
        </Link>
        <nav className="nav">
          {nav.map(([h, l]) => <Link key={h} href={h} className={path === h ? 'on' : ''}>{l}</Link>)}
        </nav>
        <button className="link" onClick={logout}>Keluar</button>
      </div>
    </header>
  );
}
