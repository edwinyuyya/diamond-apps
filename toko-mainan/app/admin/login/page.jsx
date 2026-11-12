'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(d.error || 'Gagal masuk');
    router.push('/admin');
    router.refresh();
  };
  return (
    <div className="adm-login">
      <form onSubmit={submit}>
        <img src="/logo.png" alt="Toyzone" />
        <h1>Admin Toko</h1>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password admin" autoFocus />
        {err && <p className="adm-err">{err}</p>}
        <button className="adm-btn adm-btn-primary" disabled={busy || !pw}>{busy ? 'Masuk…' : 'Masuk'}</button>
      </form>
    </div>
  );
}
