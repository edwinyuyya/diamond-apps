'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(d.error || 'Gagal masuk');
    router.push('/');
    router.refresh();
  };
  return (
    <div className="login">
      <form onSubmit={submit}>
        <div className="logo"><img src="/logo.png" alt="Toyzone" className="logo-img lg" /><span className="logo-sub">POSTER</span></div>
        <p className="muted">Dashboard konten Instagram @toyzone888</p>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password admin" autoFocus />
        {err && <div className="alert alert-err">{err}</div>}
        <button className="btn btn-orange btn-lg" disabled={busy || !pw}>{busy ? 'Masuk…' : 'Masuk'}</button>
      </form>
    </div>
  );
}
