'use client';
import { useState } from 'react';
import AdminBar from '../../../components/admin/AdminBar';

export default function AdminSettings() {
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (f.next !== f.confirm) return setMsg({ err: 'Ulangi password baru tidak sama' });
    setBusy(true); setMsg(null);
    const r = await fetch('/api/admin/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current: f.current, next: f.next }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.status === 401) { location.href = '/admin/login'; return; }
    if (!r.ok) return setMsg({ err: d.error || 'Gagal mengganti password' });
    setF({ current: '', next: '', confirm: '' });
    setMsg({ ok: 'Password berhasil diganti. Perangkat lain yang masih login otomatis dikeluarkan.' });
  };

  return (
    <>
      <AdminBar />
      <main className="adm-wrap adm-page" style={{ maxWidth: 560 }}>
        <h1>Pengaturan</h1>
        <form className="adm-card" style={{ marginTop: 16 }} onSubmit={submit}>
          <h2>Ganti password admin</h2>
          <label className="adm-field"><span>Password lama</span><input type="password" value={f.current} onChange={set('current')} autoComplete="current-password" required /></label>
          <label className="adm-field"><span>Password baru (minimal 8 karakter)</span><input type="password" value={f.next} onChange={set('next')} autoComplete="new-password" minLength={8} required /></label>
          <label className="adm-field"><span>Ulangi password baru</span><input type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" minLength={8} required /></label>
          {msg?.err && <p className="adm-err">{msg.err}</p>}
          {msg?.ok && <p className="adm-ok">{msg.ok}</p>}
          <button className="adm-btn adm-btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan password baru'}</button>
          <p className="adm-muted small" style={{ marginTop: 12 }}>Setelah diganti, semua perangkat lain yang sedang login harus masuk lagi dengan password baru.</p>
        </form>
      </main>
    </>
  );
}
