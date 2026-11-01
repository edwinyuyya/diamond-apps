'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminBar() {
  const router = useRouter();
  const logout = async () => { await fetch('/api/admin/login', { method: 'DELETE' }); router.push('/admin/login'); };
  return (
    <header className="adm-bar">
      <div className="adm-wrap adm-bar-row">
        <Link href="/admin" className="adm-logo"><img src="/logo.png" alt="Toyzone" /><span>ADMIN</span></Link>
        <nav>
          <Link href="/" target="_blank">Lihat Toko ↗</Link>
          <button onClick={logout}>Keluar</button>
        </nav>
      </div>
    </header>
  );
}
