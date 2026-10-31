'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Header() {
  const path = usePathname();
  const router = useRouter();
  const logout = async () => { await fetch('/api/login', { method: 'DELETE' }); router.push('/login'); };
  const nav = [['/', 'Pengajuan'], ['/riwayat', 'Riwayat'], ['/pengaturan', 'Pengaturan']];
  return (
    <header className="hdr">
      <div className="wrap hdr-row">
        <Link href="/" className="logo">
          <img src="/logo.png" alt="Toyzone" className="logo-img" />
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
