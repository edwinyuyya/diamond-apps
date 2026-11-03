'use client';
import { useEffect, useState } from 'react';

const rp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function Admin() {
  const [state, setState] = useState('loading'); // loading | login | ready
  const [data, setData] = useState({ sessions: [], registrations: [] });
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ date: '', quota: 20, note: '', price: '' });
  const [filter, setFilter] = useState('all');

  async function load() {
    const r = await fetch('/api/admin', { cache: 'no-store' });
    if (r.status === 401) return setState('login');
    setData(await r.json()); setState('ready');
  }
  useEffect(() => { load(); }, []);

  async function act(body) {
    setErr('');
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) setErr(j.error || 'Gagal'); else load();
  }
  async function login(e) {
    e.preventDefault(); setErr('');
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    if (r.ok) load(); else setErr((await r.json()).error);
  }

  if (state === 'loading') return <div className="wrap"><p className="muted">Memuat…</p></div>;
  if (state === 'login') return (
    <div className="wrap"><header className="hero"><h1>ADMIN</h1></header>
      <form className="card" onSubmit={login}>
        <label htmlFor="p">Password</label>
        <input id="p" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        {err && <div className="err">{err}</div>}
        <button className="btn">Masuk</button>
      </form>
    </div>
  );

  const byId = Object.fromEntries(data.sessions.map((s) => [s.id, s]));
  const regs = data.registrations.filter((r) => filter === 'all' || r.session_id === filter);

  return (
    <div className="wrap admin">
      <header className="hero"><h1>ADMIN · YOGA OMAH TURI</h1><p><a href="/">← ke halaman pendaftaran</a></p></header>
      {err && <div className="err">{err}</div>}

      <h2>Tambah / ubah tanggal</h2>
      <form className="card inline" onSubmit={(e) => { e.preventDefault(); act({ action: 'saveSession', ...form }); }}>
        <div><label>Tanggal</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        <div><label>Kuota</label><input type="number" min="0" required value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} /></div>
        <div><label>Harga tiket</label><input type="number" min="0" placeholder="kosong = sukarela" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
        <div style={{ flex: 2 }}><label>Catatan (opsional)</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="mis. Pagi 06.00" /></div>
        <button className="btn sm">Simpan</button>
      </form>
      <p className="muted">Kamis & Jumat dibuat otomatis 8 minggu ke depan (Kamis sukarela, Jumat tiket). Untuk menutup tanggal gunakan tombol Tutup. Memasukkan tanggal yang sudah ada akan mengubah kuota/catatannya.</p>

      <h2>Tanggal & kuota</h2>
      <div className="card scroll"><table>
        <thead><tr><th>Tanggal</th><th>Jenis</th><th>Terisi</th><th>Status</th><th></th></tr></thead>
        <tbody>{data.sessions.map((s) => (
          <tr key={s.id}>
            <td>{fmtDate(s.date)}{s.note && <div className="muted">{s.note}</div>}</td>
            <td>{s.price ? `Tiket ${rp(s.price)}` : 'Sukarela'}</td>
            <td>{s.used} / {s.quota}</td>
            <td>{s.is_open ? 'Dibuka' : 'Ditutup'}</td>
            <td style={{ whiteSpace: 'nowrap' }}>
              <button className="btn sm ghost" onClick={() => setForm({ date: s.date, quota: s.quota, note: s.note || '', price: s.price || '' })}>Edit</button>{' '}
              <button className="btn sm ghost" onClick={() => act({ action: 'saveSession', date: s.date, quota: s.quota, note: s.note, price: s.price, is_open: !s.is_open })}>{s.is_open ? 'Tutup' : 'Buka'}</button>{' '}
            </td>
          </tr>))}
          {!data.sessions.length && <tr><td colSpan="5" className="muted">Belum ada tanggal.</td></tr>}
        </tbody></table></div>

      <h2>Pendaftar</h2>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: 8, borderRadius: 8, marginBottom: 10 }}>
        <option value="all">Semua tanggal</option>
        {data.sessions.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.date)}</option>)}
      </select>
      <div className="card scroll"><table>
        <thead><tr><th>Peserta</th><th>Tanggal</th><th>Total transfer</th><th>Status</th><th></th></tr></thead>
        <tbody>{regs.map((r) => {
          const expired = r.status === 'pending' && new Date(r.expires_at) < new Date();
          return (
            <tr key={r.id}>
              <td><b>{r.full_name}</b><div className="muted"><a href={`https://wa.me/${r.whatsapp}`} target="_blank" rel="noopener noreferrer">{r.whatsapp}</a></div></td>
              <td>{fmtDate(byId[r.session_id]?.date || '1970-01-01')}</td>
              <td>{rp(r.total)}<div className="muted">donasi {rp(r.donation)} + {r.unique_code}</div></td>
              <td><span className={'tag ' + r.status}>{expired ? 'kedaluwarsa' : r.status}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {r.status !== 'paid' && <button className="btn sm" onClick={() => act({ action: 'setStatus', id: r.id, status: 'paid' })}>Tandai lunas</button>}{' '}
                {r.status !== 'cancelled' && <button className="btn sm ghost" onClick={() => confirm('Batalkan pendaftaran ini? Kuota akan kembali.') && act({ action: 'setStatus', id: r.id, status: 'cancelled' })}>Batalkan</button>}
              </td>
            </tr>);
        })}
          {!regs.length && <tr><td colSpan="5" className="muted">Belum ada pendaftar.</td></tr>}
        </tbody></table></div>
      <p className="muted">Pendaftar berstatus pending menahan kuota sampai waktu tahan habis; "lunas" memotong kuota permanen.</p>
    </div>
  );
}
