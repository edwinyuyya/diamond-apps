'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import PostList, { useToast } from '../components/PostList';

const TABS = [
  ['pending', 'Menunggu persetujuan'],
  ['approved', 'Terjadwal'],
  ['failed', 'Gagal'],
  ['rejected', 'Ditolak'],
];

export default function Dashboard() {
  const [posts, setPosts] = useState(null);
  const [info, setInfo] = useState(null);
  const [tab, setTab] = useState('pending');
  const [busy, setBusy] = useState(false);
  const [toast, notify] = useToast();

  const load = async () => {
    const [p, s] = await Promise.all([
      fetch('/api/posts?status=pending,approved,publishing,failed,rejected').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]);
    setPosts(p.posts || []); setInfo(s);
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => Object.fromEntries(TABS.map(([k]) => [k, (posts || []).filter((p) => p.status === k || (k === 'approved' && p.status === 'publishing')).length])), [posts]);
  const shown = (posts || []).filter((p) => p.status === tab || (tab === 'approved' && p.status === 'publishing'));

  const generate = async (force) => {
    setBusy(true);
    const r = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return notify('⚠️ ' + d.error);
    if (d.skipped) return notify('Pengajuan minggu depan sudah ada');
    notify(`${d.created} pengajuan baru dibuat`);
    setTab('pending'); load();
  };

  const approveAll = async () => {
    const pend = shown.filter((p) => p.status === 'pending');
    if (!confirm(`Setujui semua ${pend.length} pengajuan? Semuanya akan terbit otomatis sesuai jadwal.`)) return;
    setBusy(true);
    for (const p of pend) await fetch(`/api/posts/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) });
    setBusy(false); notify('Semua pengajuan disetujui ✓'); load();
  };

  return (
    <>
      <Header />
      <main className="wrap page">
        <div className="page-head">
          <div>
            <h1>Pengajuan Konten</h1>
            <p className="muted">Setiap Minggu jam 08.00 WIB sistem menyiapkan {info?.schedule?.postsPerWeek ?? 5} postingan untuk minggu depan. Yang <b>disetujui</b> akan terbit otomatis sesuai jadwal.</p>
          </div>
          <button className="btn btn-ghost" disabled={busy} onClick={() => generate(false)}>{busy ? 'Menyiapkan…' : '+ Buat pengajuan minggu depan'}</button>
        </div>

        {info && !info.instagram && <div className="alert alert-warn">⚠️ Akun Instagram belum dihubungkan. Postingan yang disetujui belum bisa terbit. <Link className="link" href="/pengaturan">Hubungkan sekarang</Link></div>}
        {info && !info.ai && <div className="alert alert-warn">ℹ️ AI caption belum aktif (ANTHROPIC_API_KEY kosong), caption memakai template.</div>}

        <div className="tabs">
          {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{counts[k] > 0 && <i>{counts[k]}</i>}</button>)}
        </div>

        {tab === 'pending' && shown.length > 1 && (
          <div className="bulk"><button className="btn btn-ok" disabled={busy} onClick={approveAll}>✓ Setujui semua ({shown.length})</button><span className="muted small">atau periksa satu per satu di bawah</span></div>
        )}

        {posts === null ? <p className="muted">Memuat…</p> : shown.length === 0 ? (
          <div className="empty">
            <h3>{tab === 'pending' ? 'Tidak ada pengajuan yang menunggu' : 'Kosong'}</h3>
            <p>{tab === 'pending' ? 'Pengajuan baru otomatis dibuat tiap Minggu pagi. Bisa juga dibuat sekarang.' : 'Belum ada postingan di sini.'}</p>
            {tab === 'pending' && <button className="btn btn-orange" disabled={busy} onClick={() => generate(false)}>Buat pengajuan minggu depan</button>}
          </div>
        ) : <PostList posts={shown} setPosts={(fn) => setPosts(fn)} notify={notify} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
