'use client';
import { useEffect, useState } from 'react';
import Carousel from './Carousel';

const rp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const QUICK = [25000, 50000, 100000, 200000];

function Copy({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button className="btn sm ghost" type="button" onClick={() => { navigator.clipboard?.writeText(String(text)); setOk(true); setTimeout(() => setOk(false), 1500); }}>
      {ok ? 'Tersalin ✓' : 'Salin'}
    </button>
  );
}

export default function Home({ photos = [] }) {
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [sel, setSel] = useState(null);
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [donation, setDonation] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);

  const load = () => fetch('/api/sessions', { cache: 'no-store' }).then((r) => r.json())
    .then((d) => (d.error ? setLoadErr(d.error) : setData(d))).catch(() => setLoadErr('Gagal memuat jadwal.'));
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sel.id, fullName, whatsapp, donation: sel.price || Number(donation) }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || 'Terjadi kesalahan.'); load(); } else setResult(j);
    } catch { setErr('Koneksi bermasalah, coba lagi.'); }
    setBusy(false);
  }

  const min = data?.minDonation || 1000;

  return (
    <div className="wrap">
      <Carousel photos={photos} />

      {result ? (
        <div className="card pay">
          <h2 style={{ marginTop: 0 }}>Silakan transfer</h2>
          <p className="muted" style={{ marginTop: 0 }}>Kursi untuk <b>{fmtDate(result.date)}</b> sudah kami tahan atas nama <b>{fullName}</b>.</p>
          <dl>
            <div className="row"><dt>Bank</dt><dd>{result.bank.name}</dd></div>
            <div className="row"><dt>No. Rekening</dt><dd>{result.bank.account} <Copy text={result.bank.account} /></dd></div>
            <div className="row"><dt>Atas Nama</dt><dd>{result.bank.holder}</dd></div>
            <div className="row"><dt>{result.isTicket ? 'Tiket' : 'Donasi'}</dt><dd>{rp(result.donation)}</dd></div>
            <div className="row"><dt>Kode unik</dt><dd>+ {result.uniqueCode}</dd></div>
            <div className="row"><dt>Total transfer</dt><dd><span className="total">{rp(result.total)}</span> <Copy text={result.total} /></dd></div>
          </dl>
          <div className="note">Transfer <b>tepat <span className="hl">{rp(result.total)}</span></b> (termasuk kode unik) agar pembayaran mudah kami cocokkan. Kursi ditahan sampai {new Date(result.expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB.</div>
          <a className="btn wa" href={result.waUrl} target="_blank" rel="noopener noreferrer">📲 Kirim bukti transfer via WhatsApp</a>
          <p className="muted" style={{ textAlign: 'center' }}>Setelah transfer, tekan tombol di atas lalu lampirkan bukti transfer di chat WhatsApp.</p>
        </div>
      ) : (
        <>
          <h2><span className="step">1</span>Pilih tanggal</h2>
          {loadErr && <div className="err">{loadErr}</div>}
          {!data && !loadErr && <p className="muted">Memuat jadwal…</p>}
          {data && data.sessions.length === 0 && <p className="muted">Belum ada jadwal yang dibuka. Silakan cek kembali nanti.</p>}
          <div className="dates">
            {data?.sessions.map((s) => {
              const full = s.remaining <= 0;
              return (
                <button key={s.id} type="button" disabled={full} className={'date' + (sel?.id === s.id ? ' sel' : '')} onClick={() => setSel(s)}>
                  <b>{fmtDate(s.date)}</b>
                  <small>{s.price ? `🎟️ Tiket ${rp(s.price)} / orang` : '💛 Donasi sukarela'}</small>
                  {s.note && <small style={{ display: 'block' }}>{s.note}</small>}
                  <span className={'quota' + (full ? ' full' : s.remaining <= 5 ? ' low' : '')}>{full ? 'Penuh' : `Sisa ${s.remaining} dari ${s.quota} kuota`}</span>
                </button>
              );
            })}
          </div>

          {sel && (
            <form onSubmit={submit}>
              <h2><span className="step">2</span>Data peserta</h2>
              <div className="card">
                <label htmlFor="n">Nama lengkap</label>
                <input id="n" required minLength={2} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                <label htmlFor="w">No. WhatsApp</label>
                <input id="w" required inputMode="tel" placeholder="08xxxxxxxxxx" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} autoComplete="tel" />
                {sel.price ? (
                  <div className="note" style={{ marginTop: 14 }}>🎟️ Tiket <b>{rp(sel.price)}</b> per orang (harga tetap).</div>
                ) : (
                  <>
                    <label htmlFor="d">Donasi sukarela (Rp)</label>
                    <input id="d" required type="number" min={min} step="1000" inputMode="numeric" placeholder={`Minimal ${min}`} value={donation} onChange={(e) => setDonation(e.target.value)} />
                    <div className="quick">
                      {QUICK.filter((q) => q >= min).map((q) => (
                        <button key={q} type="button" className={'chip' + (Number(donation) === q ? ' sel' : '')} onClick={() => setDonation(String(q))}>{rp(q)}</button>
                      ))}
                    </div>
                  </>
                )}
                {err && <div className="err">{err}</div>}
                <button className="btn" disabled={busy}>{busy ? 'Memproses…' : 'Lanjut ke pembayaran'}</button>
              </div>
            </form>
          )}
        </>
      )}
      <footer>© YOGA OMAH TURI</footer>
    </div>
  );
}
