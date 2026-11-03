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

function MediaItem({ m, className = '' }) {
  const [play, setPlay] = useState(false);
  if (m.type === 'video') {
    return play
      ? <video className={'mi ' + className} src={m.src} poster={m.poster} controls autoPlay playsInline />
      : <button type="button" className={'mi vid ' + className} onClick={() => setPlay(true)} aria-label="Putar video"><img src={m.poster} alt="" loading="lazy" /><span className="play">▶</span></button>;
  }
  return <img className={'mi ' + className} src={m.src} alt="Dokumentasi Harmony of Life" loading="lazy" />;
}

// Menu yang berisi dokumentasi (bukan pendaftaran)
const CONTENT = {
  classes: { title: 'Our Classes', desc: 'Suasana kelas-kelas Harmony of Life.', cta: 'Tanya via WhatsApp' },
  workshop: { title: 'Workshop & Event', desc: 'Dokumentasi workshop dan event Harmony of Life.', cta: 'Tanya via WhatsApp' },
  private: { title: 'Private Classes', desc: 'Kelas privat sesuai kebutuhanmu. Hubungi kami untuk jadwal dan harga.', cta: 'Tanya jadwal & harga via WhatsApp' },
  corporate: { title: 'Corporate Yoga', desc: 'Yoga untuk tim dan perusahaan. Hubungi kami untuk penawaran.', cta: 'Minta penawaran via WhatsApp' },
  testimony: { title: 'Experience Testimony', desc: 'Cerita dan pengalaman peserta.', cta: 'Tanya via WhatsApp' },
};
const NAV = [['venue', 'Omah Turi'], ['online', 'Online Live Yoga'], ['record', 'Rekaman Yoga'], ['classes', 'Our Classes'], ['workshop', 'Workshop & Event'], ['private', 'Private Classes'], ['corporate', 'Corporate Yoga'], ['testimony', 'Experience Testimony']];

function Copy({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button className="btn sm ghost" type="button" onClick={() => { navigator.clipboard?.writeText(String(text)); setOk(true); setTimeout(() => setOk(false), 1500); }}>
      {ok ? 'Tersalin ✓' : 'Salin'}
    </button>
  );
}

export default function Home({ slides = [], media = {} }) {
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

  const items = media[tab] || [];
  const thumbs = items.map((m) => (m.type === 'video' ? m.poster : m.src));
  const pool = thumbs.length ? thumbs : (slides.map((m) => (m.type === 'video' ? m.poster : m.src))); // foto kecil di kartu
  const shown = day ? list.filter((x) => x.date === day) : list;

  const pick = (k) => {
    setTab(k); setSel(null); setDay(null); setErr(''); setResult(null);
    setTimeout(() => document.getElementById('jadwal')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  return (
    <>
    <nav className="nav" aria-label="Menu utama">
      <div className="nav-top">
        <a className="nav-brand" href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Harmony of Life</a>
        <a className="pill dark nav-cta" href="#jadwal" onClick={(e) => { e.preventDefault(); pick('venue'); }}>Daftar yoga <span aria-hidden>→</span></a>
      </div>
      <div className="nav-links">
        <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Beranda</a>
        {NAV.map(([k, t]) => (
          <a key={k} href="#jadwal" className={!result && tab === k ? 'on' : ''} onClick={(e) => { e.preventDefault(); pick(k); }}>{t}</a>
        ))}
        {data?.wa && <a href={`https://wa.me/${data.wa}`} target="_blank" rel="noopener noreferrer">Hubungi Kami</a>}
      </div>
    </nav>
    <div className="wrap">
      <Carousel slides={slides} />

      {result ? (
        <div className="card pay">
          <div className="eyebrow">Pembayaran</div>
          <h2 style={{ marginTop: 0 }}>Silakan <em>transfer</em></h2>
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
          <a className="btn wa" href={result.waUrl} target="_blank" rel="noopener noreferrer">Kirim bukti transfer via WhatsApp</a>
          <p className="muted" style={{ textAlign: 'center' }}>Setelah transfer, tekan tombol di atas lalu lampirkan bukti transfer di chat WhatsApp.</p>
        </div>
      ) : CONTENT[tab] ? (
        <>
          <div className="eyebrow">Harmony of Life</div>
          <h2 id="jadwal" style={{ scrollMarginTop: 110 }}>{CONTENT[tab].title}</h2>
          <p className="muted" style={{ marginTop: -6 }}>{CONTENT[tab].desc}</p>
          {items.length > 0
            ? <div className="mgrid">{items.map((m) => <MediaItem key={m.src} m={m} />)}</div>
            : <p className="muted">Foto dan video segera hadir.</p>}
          {data?.wa && <a className="btn wa" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${data.wa}?text=${encodeURIComponent(`Halo Harmony of Life, saya tertarik dengan ${CONTENT[tab].title}.`)}`}>{CONTENT[tab].cta}</a>}
          <button type="button" className="btn ghost" onClick={() => pick('venue')}>Lihat jadwal & daftar yoga →</button>
        </>
      ) : (
        <>
          <div className="eyebrow">Layanan</div>
          <h2 id="jadwal" style={{ scrollMarginTop: 110 }}>Mau yoga <em>bagaimana?</em></h2>
          <div className="tabs">
            {[['venue', 'Omah Turi', 'Datang langsung ke venue'], ['online', 'Online Live Yoga', 'Yoga real time via online'], ['record', 'Rekaman Yoga', 'Beli & latihan kapan saja']].map(([k, t, d]) => (
              <button key={k} type="button" className={'tab' + (tab === k ? ' sel' : '')} onClick={() => { setTab(k); setSel(null); setDay(null); setErr(''); }}>
                <b>{t}</b><small>{d}</small>
              </button>
            ))}
          </div>

          {items.length > 0 && (
            <div className="gal" aria-label="Dokumentasi kegiatan">
              {items.slice(0, 12).map((m) => <MediaItem key={m.src} m={m} />)}
            </div>
          )}

          <div className="eyebrow">{tab === 'record' ? 'Rekaman' : 'Jadwal'}</div>
          <h2>Pilih <em>{tab === 'record' ? 'rekaman' : 'tanggal'}</em></h2>
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
                    {pool.length > 0 ? <img src={pool[k % pool.length]} alt="" className="tt-thumb" loading="lazy" /> : <div className="tt-thumb ph">🪷</div>}
                    <div className="tt-body">
                      <small className="tt-kind">{tab === 'online' ? 'YOGA ONLINE LIVE' : 'YOGA DI OMAH TURI'}</small>
                      <h3>{tab === 'online' ? 'Yoga Online (real time)' : 'Yoga di Omah Turi'}</h3>
                      <p className="tt-meta">{fmtDate(s.date)}</p>
                      {s.note && <p className="tt-meta">{s.note}</p>}
                      <p className="tt-meta">{tab === 'online' ? 'Online' : 'Omah Turi'}</p>
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
                  {pool.length > 0 ? <img src={pool[k % pool.length]} alt="" className="tt-thumb" loading="lazy" /> : <div className="tt-thumb ph">🎬</div>}
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
              <div className="eyebrow">Pendaftaran</div>
              <h2>Data <em>peserta</em></h2>
              <div className="card">
                <label htmlFor="n">Nama lengkap</label>
                <input id="n" required minLength={2} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                <label htmlFor="w">No. WhatsApp</label>
                <input id="w" required inputMode="tel" placeholder="08xxxxxxxxxx" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} autoComplete="tel" />
                {sel.price ? (
                  <div className="note" style={{ marginTop: 14 }}><b>{rp(sel.price)}</b>{tab === 'record' ? ' — link rekaman dikirim lewat WhatsApp setelah pembayaran kami konfirmasi.' : tab === 'online' ? ' per orang — link kelas online dikirim lewat WhatsApp setelah pembayaran kami konfirmasi.' : ' per orang (harga tetap).'}</div>
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
    </div>
    <footer className="foot">
      <div className="foot-in">
        <div className="foot-cta">
          <div className="eyebrow light">Mulai dari sini</div>
          <h2>Ruang kecil untuk <em>bernapas</em></h2>
          <p>Datang ke Omah Turi, ikut kelas online, atau latihan dari rekaman. Pilih yang cocok untukmu.</p>
          <a className="pill light" href="#jadwal" onClick={(e) => { e.preventDefault(); pick('venue'); }}>Lihat jadwal <span aria-hidden>→</span></a>
        </div>
        <div className="foot-cols">
          <div><b>Brand</b><span className="foot-brand">Harmony of Life</span><span>Venue: Omah Turi</span></div>
          <div><b>Layanan</b>{NAV.slice(0, 3).map(([k, t]) => <a key={k} href="#jadwal" onClick={(e) => { e.preventDefault(); pick(k); }}>{t}</a>)}</div>
          <div><b>Lainnya</b>{NAV.slice(3).map(([k, t]) => <a key={k} href="#jadwal" onClick={(e) => { e.preventDefault(); pick(k); }}>{t}</a>)}</div>
          <div><b>Hubungi</b>{data?.wa && <a href={`https://wa.me/${data.wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}<a href="https://www.instagram.com/harmonyoflife.id" target="_blank" rel="noopener noreferrer">Instagram</a></div>
        </div>
        <div className="foot-bot">© {new Date().getFullYear()} Harmony of Life</div>
      </div>
    </footer>
    </>
  );
}
