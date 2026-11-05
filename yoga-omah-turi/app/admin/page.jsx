'use client';
import { useEffect, useState } from 'react';

const rp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function Admin() {
  const [state, setState] = useState('loading'); // loading | login | ready
  const [data, setData] = useState({ sessions: [], registrations: [], recordings: [] });
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ date: '', kind: 'venue', quota: 20, note: '', price: '' });
  const [filter, setFilter] = useState('all');
  const [rec, setRec] = useState({ title: '', description: '', price: '', access_url: '' });

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
  const recById = Object.fromEntries(data.recordings.map((r) => [r.id, r]));
  const regs = data.registrations.filter((r) => filter === 'all' || r.session_id === filter || r.recording_id === filter);

  return (
    <div className="wrap admin">
      <header className="hero"><h1>ADMIN · HARMONY OF LIFE</h1><p><a href="/">← ke halaman pendaftaran</a></p></header>
      {err && <div className="err">{err}</div>}

      <h2>Tambah / ubah tanggal</h2>
      <form className="card inline" onSubmit={(e) => { e.preventDefault(); act({ action: 'saveSession', ...form }); }}>
        <div><label>Jenis</label><select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--line)' }}><option value="venue">Omah Turi</option><option value="online">Online Live</option></select></div>
        <div><label>Tanggal</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        <div><label>Kuota</label><input type="number" min="0" required value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} /></div>
        <div><label>Harga tiket</label><input type="number" min="0" placeholder="kosong = sukarela" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
        <div style={{ flex: 2 }}><label>Catatan (opsional)</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="mis. Pagi 06.00" /></div>
        <button className="btn sm">Simpan</button>
      </form>
      <p className="muted">Kamis & Jumat dibuat otomatis 8 minggu ke depan (Kamis sukarela, Jumat tiket). Untuk menutup tanggal gunakan tombol Tutup. Memasukkan tanggal yang sudah ada akan mengubah kuota/catatannya.</p>

      <h2>Tanggal & kuota</h2>
      <div className="card scroll"><table>
        <thead><tr><th>Tanggal</th><th>Harga</th><th>Terisi</th><th>Status</th><th></th></tr></thead>
        <tbody>{data.sessions.map((s) => (
          <tr key={s.id}>
            <td>{fmtDate(s.date)} <span className="tag">{s.kind === 'online' ? 'Online' : 'Omah Turi'}</span>{s.note && <div className="muted">{s.note}</div>}</td>
            <td>{s.price ? `Tiket ${rp(s.price)}` : 'Sukarela'}</td>
            <td>{s.used} / {s.quota}</td>
            <td>{s.is_open ? 'Dibuka' : 'Ditutup'}</td>
            <td style={{ whiteSpace: 'nowrap' }}>
              <button className="btn sm ghost" onClick={() => setForm({ date: s.date, kind: s.kind, quota: s.quota, note: s.note || '', price: s.price || '' })}>Edit</button>{' '}
              <button className="btn sm ghost" onClick={() => act({ action: 'saveSession', date: s.date, kind: s.kind, quota: s.quota, note: s.note, price: s.price, is_open: !s.is_open })}>{s.is_open ? 'Tutup' : 'Buka'}</button>{' '}
            </td>
          </tr>))}
          {!data.sessions.length && <tr><td colSpan="5" className="muted">Belum ada tanggal.</td></tr>}
        </tbody></table></div>

      <h2>Rekaman yang dijual</h2>
      <form className="card inline" onSubmit={(e) => { e.preventDefault(); act({ action: 'saveRecording', ...rec }); setRec({ title: '', description: '', price: '', access_url: '' }); }}>
        <div style={{ flex: 2 }}><label>Judul</label><input required value={rec.title} onChange={(e) => setRec({ ...rec, title: e.target.value })} /></div>
        <div><label>Harga</label><input type="number" min="1" required value={rec.price} onChange={(e) => setRec({ ...rec, price: e.target.value })} /></div>
        <div style={{ flex: 2 }}><label>Deskripsi</label><input value={rec.description} onChange={(e) => setRec({ ...rec, description: e.target.value })} /></div>
        <div style={{ flex: 2 }}><label>Link akses (privat, hanya admin)</label><input value={rec.access_url} onChange={(e) => setRec({ ...rec, access_url: e.target.value })} placeholder="Google Drive / YouTube unlisted" /></div>
        <button className="btn sm">{rec.id ? 'Update' : 'Tambah'}</button>
      </form>
      <div className="card scroll" style={{ marginTop: 10 }}><table>
        <thead><tr><th>Rekaman</th><th>Harga</th><th></th></tr></thead>
        <tbody>{data.recordings.map((r) => (
          <tr key={r.id}><td><b>{r.title}</b>{!r.is_open && ' (ditutup)'}<div className="muted">{r.access_url || 'belum ada link'}</div></td><td>{rp(r.price)}</td>
            <td style={{ whiteSpace: 'nowrap' }}>
              <button className="btn sm ghost" onClick={() => setRec({ id: r.id, title: r.title, description: r.description || '', price: r.price, access_url: r.access_url || '' })}>Edit</button>{' '}
              <button className="btn sm ghost" onClick={() => act({ action: 'saveRecording', ...r, is_open: !r.is_open })}>{r.is_open ? 'Tutup' : 'Buka'}</button>{' '}
              <button className="btn sm red" onClick={() => confirm('Hapus rekaman beserta riwayat pesanannya?') && act({ action: 'deleteRecording', id: r.id })}>Hapus</button></td></tr>))}
          {!data.recordings.length && <tr><td colSpan="3" className="muted">Belum ada rekaman.</td></tr>}</tbody></table></div>
      <p className="muted">Setelah menandai lunas, kirim link akses rekaman / link kelas online ke WhatsApp pembeli (klik nomornya).</p>

      <h2>Pendaftar</h2>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: 8, borderRadius: 8, marginBottom: 10 }}>
        <option value="all">Semua tanggal</option>
        {data.sessions.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.date)} · {s.kind === 'online' ? 'Online' : 'Omah Turi'}</option>)}
        {data.recordings.map((r) => <option key={r.id} value={r.id}>Rekaman: {r.title}</option>)}
      </select>
      <div className="card scroll"><table>
        <thead><tr><th>Peserta</th><th>Pesanan</th><th>Total transfer</th><th>Status</th><th></th></tr></thead>
        <tbody>{regs.map((r) => {
          const expired = r.status === 'pending' && new Date(r.expires_at) < new Date();
          return (
            <tr key={r.id}>
              <td><b>{r.full_name}</b><div className="muted"><a href={`https://wa.me/${r.whatsapp}`} target="_blank" rel="noopener noreferrer">{r.whatsapp}</a></div></td>
              <td>{r.recording_id ? <>Rekaman<div className="muted">{recById[r.recording_id]?.title}</div></> : <>{fmtDate(byId[r.session_id]?.date || '1970-01-01')}<div className="muted">{byId[r.session_id]?.kind === 'online' ? 'Online Live' : 'Omah Turi'}</div></>}</td>
              <td>{r.total === 0 ? <>Donasi sukarela<div className="muted">tanpa nominal</div></> : <>{rp(r.total)}<div className="muted">donasi {rp(r.donation)} + {r.unique_code}</div></>}</td>
              <td><span className={'tag ' + r.status}>{expired ? 'kedaluwarsa' : r.status === 'paid' && r.total === 0 ? 'terdaftar' : r.status}</span></td>
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
