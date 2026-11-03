'use client';
import { useEffect, useState } from 'react';
import Carousel from './Carousel';

const rp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const iso = (d) => d.toISOString().slice(0, 10);
const todayStr = () => iso(new Date(Date.now() + 7 * 3600e3));
const addDays = (str, n) => { const d = new Date(str + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const mondayOf = (str) => addDays(str, -((new Date(str + 'T00:00:00Z').getUTCDay() + 6) % 7));
const DOW = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'];
const MONTH = (str) => new Date(str + 'T00:00:00Z').toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
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
  const [tab, setTab] = useState('venue'); // venue | online | record
  const [sel, setSel] = useState(null);
  const [day, setDay] = useState(null); // null = semua tanggal
  const [week, setWeek] = useState(() => mondayOf(todayStr()));
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
      const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tab === 'record' ? { type: 'recording', recordingId: sel.id, fullName, whatsapp } : { type: 'session', sessionId: sel.id, fullName, whatsapp, donation: sel.price || Number(donation) }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || 'Terjadi kesalahan.'); load(); } else setResult(j);
    } catch { setErr('Koneksi bermasalah, coba lagi.'); }
    setBusy(false);
  }

  const min = data?.minDonation || 1000;
  const list = (data?.sessions || []).filter((x) => x.kind === (tab === 'online' ? 'online' : 'venue'));

  const shown = day ? list.filter((x) => x.date === day) : list;

  return (
    <div className="wrap">
      <Carousel photos={photos} />

      {result ? (
        <div className="card pay">
          <h2 style={{ marginTop: 0 }}>Silakan transfer</h2>
          <p className="muted" style={{ marginTop: 0 }}>Pesanan <b>{result.label}</b> atas nama <b>{fullName}</b> sudah kami catat{result.date ? ', kursi ditahan untukmu' : ''}.</p>
          <dl>
            <div className="row"><dt>Bank</dt><dd>{result.bank.name}</dd></div>
            <div className="row"><dt>No. Rekening</dt><dd>{result.bank.account} <Copy text={result.bank.account} /></dd></div>
            <div className="row"><dt>Atas Nama</dt><dd>{result.bank.holder}</dd></div>
            <div className="row"><dt>{result.isTicket ? 'Tiket' : 'Donasi'}</dt><dd>{rp(result.donation)}</dd></div>
            <div className="row"><dt>Kode unik</dt><dd>+ {result.uniqueCode}</dd></div>
            <div className="row"><dt>Total transfer</dt><dd><span className="total">{rp(result.total)}</span> <Copy text={result.total} /></dd></div>
          </dl>
          <div className="note">Transfer <b>tepat <span className="hl">{rp(result.total)}</span></b> (termasuk kode unik) agar pembayaran mudah kami cocokkan. Mohon transfer sebelum {new Date(result.expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB.</div>
          <a className="btn wa" href={result.waUrl} target="_blank" rel="noopener noreferrer">📲 Kirim bukti transfer via WhatsApp</a>
          <p className="muted" style={{ textAlign: 'center' }}>Setelah transfer, tekan tombol di atas lalu lampirkan bukti transfer di chat WhatsApp.</p>
        </div>
      ) : (
        <>
          <h2><span className="step">1</span>Mau yoga bagaimana?</h2>
          <div className="tabs">
            {[['venue', '🏡', 'Di Omah Turi', 'Datang langsung ke venue'], ['online', '💻', 'Online Live', 'Yoga real time via online'], ['record', '🎬', 'Rekaman', 'Beli & latihan kapan saja']].map(([k, ic, t, d]) => (
              <button key={k} type="button" className={'tab' + (tab === k ? ' sel' : '')} onClick={() => { setTab(k); setSel(null); setDay(null); setErr(''); }}>
                <span>{ic}</span><b>{t}</b><small>{d}</small>
              </button>
            ))}
          </div>

          <h2><span className="step">2</span>{tab === 'record' ? 'Pilih rekaman' : 'Pilih tanggal'}</h2>
          {loadErr && <div className="err">{loadErr}</div>}
          {!data && !loadErr && <p className="muted">Memuat jadwal…</p>}
          {data && tab !== 'record' && list.length === 0 && <p className="muted">Belum ada jadwal yang dibuka. Silakan cek kembali nanti.</p>}
          {data && tab === 'record' && data.recordings.length === 0 && <p className="muted">Belum ada rekaman yang dijual.</p>}
          {tab !== 'record' && (
            <>
              <div className="weekbar">
                <button type="button" className="arrow" aria-label="Minggu sebelumnya" disabled={week <= mondayOf(todayStr())} onClick={() => setWeek(addDays(week, -7))}>‹</button>
                <div className="days">
                  {Array.from({ length: 7 }, (_, k) => addDays(week, k)).map((d, k) => {
                    const has = list.some((x) => x.date === d);
                    return (
                      <button key={d} type="button" className={'day' + (day === d ? ' on' : '') + (d === todayStr() ? ' today' : '')} disabled={d < todayStr()} onClick={() => setDay(day === d ? null : d)}>
                        <small>{DOW[k]}</small><span>{Number(d.slice(8))}</span><i className={has ? 'dot' : ''} />
                      </button>
                    );
                  })}
                </div>
                <button type="button" className="arrow" aria-label="Minggu berikutnya" onClick={() => setWeek(addDays(week, 7))}>›</button>
              </div>
              <div className="filters">
                <span className="muted">{MONTH(week)}</span>
                <span>
                  <button type="button" className={'chip' + (day === null ? ' sel' : '')} onClick={() => setDay(null)}>Semua</button>{' '}
                  <button type="button" className="chip" onClick={() => { setDay(todayStr()); setWeek(mondayOf(todayStr())); }}>Hari ini</button>
                </span>
              </div>
            </>
          )}

          <div className="tt">
            {tab !== 'record' && shown.map((s, k) => {
              const full = s.remaining <= 0;
              return (
                <article key={s.id} className={'tt-card' + (sel?.id === s.id ? ' sel' : '')}>
                  <div className="tt-top">
                    {photos.length > 0 ? <img src={photos[k % photos.length]} alt="" className="tt-thumb" loading="lazy" /> : <div className="tt-thumb ph">🪷</div>}
                    <div className="tt-body">
                      <small className="tt-kind">{tab === 'online' ? 'YOGA ONLINE LIVE' : 'YOGA DI OMAH TURI'}</small>
                      <h3>{tab === 'online' ? 'Yoga Online (real time)' : 'Yoga di Omah Turi'}</h3>
                      <p className="tt-meta">📅 {fmtDate(s.date)}</p>
                      {s.note && <p className="tt-meta">🕘 {s.note}</p>}
                      <p className="tt-meta">📍 {tab === 'online' ? 'Online' : 'Omah Turi'}</p>
                    </div>
                  </div>
                  <div className="tt-foot">
                    <div>
                      <b className="tt-price">{s.price ? rp(s.price) : 'Donasi sukarela'}</b>
                      <span className={'quota' + (full ? ' full' : s.remaining <= 5 ? ' low' : '')}>{full ? 'Penuh' : `Sisa ${s.remaining} dari ${s.quota}`}</span>
                    </div>
                    <button type="button" className="btn sm" disabled={full} onClick={() => { setSel(s); setTimeout(() => document.getElementById('form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}>{sel?.id === s.id ? 'Dipilih ✓' : 'Daftar'}</button>
                  </div>
                </article>
              );
            })}
            {tab !== 'record' && data && list.length > 0 && shown.length === 0 && <p className="muted">Tidak ada kelas di hari ini. Coba pilih hari bertitik.</p>}
            {tab === 'record' && data?.recordings.map((r, k) => (
              <article key={r.id} className={'tt-card' + (sel?.id === r.id ? ' sel' : '')}>
                <div className="tt-top">
                  {photos.length > 0 ? <img src={photos[k % photos.length]} alt="" className="tt-thumb" loading="lazy" /> : <div className="tt-thumb ph">🎬</div>}
                  <div className="tt-body">
                    <small className="tt-kind">REKAMAN</small>
                    <h3>{r.title}</h3>
                    {r.description && <p className="tt-meta">{r.description}</p>}
                  </div>
                </div>
                <div className="tt-foot">
                  <b className="tt-price">{rp(r.price)}</b>
                  <button type="button" className="btn sm" onClick={() => { setSel(r); setTimeout(() => document.getElementById('form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}>{sel?.id === r.id ? 'Dipilih ✓' : 'Beli'}</button>
                </div>
              </article>
            ))}
          </div>

          {sel && (
            <form id="form" onSubmit={submit}>
              <h2><span className="step">3</span>Data peserta</h2>
              <div className="card">
                <label htmlFor="n">Nama lengkap</label>
                <input id="n" required minLength={2} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                <label htmlFor="w">No. WhatsApp</label>
                <input id="w" required inputMode="tel" placeholder="08xxxxxxxxxx" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} autoComplete="tel" />
                {sel.price ? (
                  <div className="note" style={{ marginTop: 14 }}>{tab === 'record' ? '🎬' : '🎟️'} <b>{rp(sel.price)}</b>{tab === 'record' ? ' — link rekaman dikirim lewat WhatsApp setelah pembayaran kami konfirmasi.' : tab === 'online' ? ' per orang — link kelas online dikirim lewat WhatsApp setelah pembayaran kami konfirmasi.' : ' per orang (harga tetap).'}</div>
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
      <footer>© Harmony of Life · venue: Omah Turi</footer>
    </div>
  );
}
