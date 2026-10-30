'use client';
import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import { useToast } from '../../components/PostList';

const fmt = (iso) => new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long' });
const DAYS = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function Settings() {
  const [info, setInfo] = useState(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, notify] = useToast();
  const load = () => fetch('/api/settings').then((r) => r.json()).then(setInfo);
  useEffect(() => { load(); }, []);

  const connect = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return notify('⚠️ ' + d.error);
    setToken(''); notify(`Terhubung ke @${d.username} ✓`); load();
  };
  const disconnect = async () => {
    if (!confirm('Putuskan akun Instagram? Postingan terjadwal tidak akan terbit sampai dihubungkan lagi.')) return;
    await fetch('/api/settings', { method: 'DELETE' }); load();
  };
  const daysLeft = info?.instagram ? Math.round((new Date(info.instagram.expiresAt) - Date.now()) / 864e5) : 0;

  return (
    <>
      <Header />
      <main className="wrap page" style={{ maxWidth: 900 }}>
        <div className="page-head"><h1>Pengaturan</h1></div>

        <section className="card">
          <h2>Akun Instagram</h2>
          {!info ? <p className="muted">Memuat…</p> : info.instagram ? (
            <>
              <dl className="kv">
                <dt>Status</dt><dd className="ok">Terhubung ✓</dd>
                <dt>Akun</dt><dd>@{info.instagram.username}</dd>
                <dt>Token berlaku sampai</dt><dd>{fmt(info.instagram.expiresAt)} ({daysLeft} hari lagi, diperpanjang otomatis)</dd>
              </dl>
              <p style={{ marginTop: 14 }}><button className="btn btn-danger" onClick={disconnect}>Putuskan akun</button></p>
            </>
          ) : (
            <>
              <p className="bad">Belum terhubung</p>
              <form onSubmit={connect}>
                <label className="field">
                  <span>Tempel <b>Access Token</b> Instagram (didapat dari langkah di bawah)</span>
                  <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="IGAA..." autoComplete="off" spellCheck={false} />
                </label>
                <button className="btn btn-orange" disabled={busy || token.length < 20}>{busy ? 'Memeriksa…' : 'Hubungkan'}</button>
              </form>
              <details style={{ marginTop: 18 }} open>
                <summary><b>Cara mendapatkan Access Token (sekali saja)</b></summary>
                <ol className="steps" style={{ marginTop: 10 }}>
                  <li>Di aplikasi Instagram @toyzone888: <b>Pengaturan → Jenis akun dan alat → Beralih ke akun profesional</b> (pilih Bisnis atau Kreator).</li>
                  <li>Buka <a className="link" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com/apps</a>, login, lalu <b>Create App</b>.</li>
                  <li>Pilih use case <b>"Manage messaging & content on Instagram"</b>, beri nama misalnya <code>Toyzone Poster</code>, selesaikan pembuatan app.</li>
                  <li>Di menu <b>Instagram → API setup with Instagram login</b>, bagian <b>Generate access tokens</b>, klik <b>Add account</b> dan login dengan akun @toyzone888.</li>
                  <li>Klik <b>Generate token</b> di samping akun tersebut, setujui izinnya, lalu salin token (diawali <code>IGAA…</code>) dan tempel di kolom di atas.</li>
                </ol>
                <p className="muted small" style={{ marginTop: 10 }}>Token berlaku 60 hari dan diperpanjang otomatis oleh aplikasi setiap minggu. Token disimpan di server dan tidak ditampilkan lagi.</p>
              </details>
            </>
          )}
        </section>

        <section className="card">
          <h2>Jadwal & Sistem</h2>
          {info && (
            <dl className="kv">
              <dt>Pengajuan dibuat</dt><dd>Setiap Minggu, 08.00 WIB ({info.schedule.postsPerWeek} postingan)</dd>
              <dt>Jadwal terbit</dt><dd>{info.schedule.postDays.map((d) => DAYS[d]).join(', ')} · {String(info.schedule.postHourWIB).padStart(2, '0')}.{String(info.schedule.postMinuteWIB).padStart(2, '0')} WIB</dd>
              <dt>Penjadwal (cron)</dt><dd className={info.cron ? 'ok' : 'bad'}>{info.cron ? 'Aktif' : 'CRON_SECRET belum diatur'}</dd>
              <dt>Caption AI</dt><dd className={info.ai ? 'ok' : 'bad'}>{info.ai ? `Aktif (${info.ai})` : 'Belum aktif — memakai template'}</dd>
              <dt>Database</dt><dd>{info.database}</dd>
              <dt>Sumber produk</dt><dd><a className="link" href={info.storeUrl} target="_blank" rel="noreferrer">{info.storeUrl}</a></dd>
            </dl>
          )}
        </section>
      </main>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
