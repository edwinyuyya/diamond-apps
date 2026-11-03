'use client';
import { Fragment, useEffect, useState } from 'react';
import Carousel from './Carousel';

const rp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const iso = (d) => d.toISOString().slice(0, 10);
const todayStr = () => iso(new Date(Date.now() + 7 * 3600e3));
const addDays = (str, n) => { const d = new Date(str + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const mondayOf = (str) => addDays(str, -((new Date(str + 'T00:00:00Z').getUTCDay() + 6) % 7));
const DOW = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'];
const MONTH = (str) => new Date(str + 'T00:00:00Z').toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtAcc = (a) => String(a || '').replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
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
    <button className="btn sm ghost" type="button" onClick={() => { try { navigator.clipboard?.writeText(String(text))?.catch?.(() => {}); } catch {} setOk(true); setTimeout(() => setOk(false), 1500); }}>
      {ok ? 'Tersalin ✓' : 'Salin'}
    </button>
  );
}

export default function Home({ slides = [], media = {} }) {
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [tab, setTab] = useState('home'); // home | venue | online | record | classes | ...
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

  const scrollTo = (id) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  const pick = (k) => {
    setTab(k); setSel(null); setDay(null); setErr(''); setResult(null);
    if (k === 'home') setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60); else scrollTo('jadwal');
  };
  const go = (s) => { setResult(null); setDay(null); setTab(s.kind === 'online' ? 'online' : 'venue'); setSel(s); scrollTo('form'); };

  // ---- bahan halaman beranda ----
  const imgs = (t) => (media[t] || []).filter((m) => m.type === 'image').map((m) => m.src);
  const fallbackImgs = slides.map((m) => (m.type === 'video' ? m.poster : m.src));
  const thumbOf = (t, i = 0) => imgs(t)[i] || fallbackImgs[i % Math.max(1, fallbackImgs.length)] || null;
  const upcoming = (data?.sessions || []).slice().sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind)).slice(0, 6);
  const ticket = (data?.sessions || []).find((x) => x.kind === 'venue' && x.price)?.price;
  const gallery6 = [...imgs('venue').slice(0, 4), ...imgs('workshop').slice(0, 2), ...imgs('classes')].slice(0, 6);
  const testi = (media.testimony || []).filter((m) => m.type === 'video').slice(0, 4);
  const waLink = data?.wa ? `https://wa.me/${data.wa}` : null;
  const FAQ = [
    ['Bagaimana cara mendaftar?', 'Pilih layanan dan tanggal, isi nama lengkap dan nomor WhatsApp, lalu transfer sesuai nominal yang muncul. Setelah itu kirim bukti transfer lewat tombol WhatsApp.'],
    ['Kenapa ada kode unik pada nominal transfer?', 'Tiga digit kode unik membantu kami mencocokkan transfermu dengan pendaftaranmu. Mohon transfer tepat sesuai total yang tertera.'],
    ['Berapa biayanya?', `Kamis di Omah Turi donasi sukarela. Jumat tiket ${ticket ? rp(ticket) : 'berbayar'} per orang. Harga kelas online dan rekaman tertera di halamannya.`],
    ['Kapan kursiku terkonfirmasi?', 'Kursi ditahan beberapa jam setelah kamu mendaftar. Setelah bukti transfer kami cek, pendaftaranmu dikonfirmasi dan kuota terpotong.'],
    ['Bagaimana dengan kelas online dan rekaman?', 'Link kelas online atau rekaman dikirim lewat WhatsApp setelah pembayaranmu kami konfirmasi.'],
    ['Apakah ada kelas privat atau corporate?', 'Ada. Hubungi kami lewat WhatsApp untuk jadwal dan penawaran.'],
  ];

  const formPanel = sel ? (
            <form id="form" className="inline-form" onSubmit={submit}>
              <div className="card formcard">
                <div className="eyebrow" style={{ marginTop: 0 }}>Pendaftaran</div>
                <h3 className="fh">Isi data lalu <em>transfer</em></h3>
                {data?.demo && <div className="err" style={{ marginTop: 0, marginBottom: 12 }}>Mode pratinjau: database belum tersambung, pendaftaran belum bisa disimpan.</div>}
                {data?.bank?.account && (
                  <div className="bankbox">
                    <small>Transfer ke</small>
                    <div className="bk-line"><b>{data.bank.name}</b> <span>{fmtAcc(data.bank.account)}</span> <Copy text={data.bank.account} /></div>
                    <div className="bk-holder">a.n. {data.bank.holder}</div>
                    <small>{sel.price ? 'Nominal pasti (dengan kode unik) muncul setelah kamu menekan tombol di bawah.' : 'Donasi sukarela: transfer sesuai keikhlasanmu ke rekening ini.'}</small>
                  </div>
                )}
                <label htmlFor="n">Nama lengkap</label>
                <input id="n" required minLength={2} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                <label htmlFor="w">No. WhatsApp</label>
                <input id="w" required inputMode="tel" placeholder="08xxxxxxxxxx" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} autoComplete="tel" />
                {sel.price ? (
                  <div className="note" style={{ marginTop: 14 }}><b>{rp(sel.price)}</b>{tab === 'record' ? ' — link rekaman dikirim lewat WhatsApp setelah pembayaran kami konfirmasi.' : tab === 'online' ? ' per orang — link kelas online dikirim lewat WhatsApp setelah pembayaran kami konfirmasi.' : ' per orang (harga tetap).'}</div>
                ) : (
                  <div className="note" style={{ marginTop: 14 }}>Donasi sukarela: tidak ada nominal tetap dan tidak ada kode unik. Setelah mendaftar, transfer ke rekening di atas sesuai keikhlasanmu, lalu kirim bukti lewat WhatsApp.</div>
                )}
                {err && <div className="err">{err}</div>}
                <button className="btn" disabled={busy}>{busy ? 'Memproses…' : sel.price ? 'Daftar & lihat nominal transfer' : 'Daftar'}</button>
              </div>
            </form>
  ) : null;

  const landing = (
    <>
      <Carousel slides={slides} onCta={() => pick('venue')} />

      <section className="sec" id="layanan">
        <div className="container">
          <div className="sec-head">
            <div><div className="eyebrow">Layanan</div><h2>Pilih cara <em>berlatihmu</em></h2></div>
            <a className="pill ghost" href="#jadwal" onClick={(e) => { e.preventDefault(); pick('venue'); }}>Semua jadwal <span aria-hidden>→</span></a>
          </div>
          <div className="svc">
            {[['venue', 'Omah Turi', 'Datang langsung dan berlatih bersama di venue kami.'], ['online', 'Online Live Yoga', 'Yoga real time, ikut dari mana saja.'], ['record', 'Rekaman Yoga', 'Latihan kapan saja dari rekaman.']].map(([k, t, d], i) => (
              <a key={k} className="svc-card" href="#jadwal" onClick={(e) => { e.preventDefault(); pick(k); }}>
                <div className="svc-img">{thumbOf(k, k === 'venue' ? 1 : 0) ? <img src={thumbOf(k, k === 'venue' ? 1 : i)} alt="" loading="lazy" /> : null}</div>
                <h3>{t}</h3><p>{d}</p><span className="more">Lihat detail <span aria-hidden>→</span></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="sec studio">
        <div className="studio-in">
          <div className="studio-img">{thumbOf('venue', 2) && <img src={thumbOf('venue', 2)} alt="Kelas yoga di Omah Turi" loading="lazy" />}</div>
          <div className="studio-txt">
            <div className="eyebrow">Omah Turi</div>
            <h2>Berlatih bersama, <em>di Omah Turi</em></h2>
            <p>Kelas tatap muka kami diadakan di Omah Turi setiap Kamis dan Jumat. Kuota terbatas, jadi daftar dulu secara online.</p>
            <ul className="checks">
              <li>Kamis: donasi sukarela</li>
              <li>Jumat: tiket {ticket ? rp(ticket) : 'berbayar'} per orang</li>
              <li>Daftar dan transfer online, bukti lewat WhatsApp</li>
            </ul>
            <a className="pill dark" href="#jadwal" onClick={(e) => { e.preventDefault(); pick('venue'); }}>Lihat jadwal <span aria-hidden>→</span></a>
          </div>
        </div>
      </section>

      <section className="sec" id="minggu-ini">
        <div className="container">
          <div className="eyebrow">Jadwal</div>
          <h2>Kelas <em>terdekat</em></h2>
          {loadErr && <div className="err">{loadErr}</div>}
          {!data && !loadErr && <p className="muted">Memuat jadwal…</p>}
          {data && upcoming.length === 0 && <p className="muted">Belum ada jadwal yang dibuka. Silakan cek kembali nanti.</p>}
          <div className="rows">
            {upcoming.map((s) => {
              const full = s.remaining <= 0;
              return (
                <div key={s.id} className="row-s">
                  <div className="rs-name">{s.kind === 'online' ? 'Yoga Online Live' : 'Yoga di Omah Turi'}</div>
                  <div className="rs-when">{fmtDate(s.date)}{s.note ? ` · ${s.note}` : ''}</div>
                  <div className="rs-price">{s.price ? rp(s.price) : 'Donasi sukarela'}</div>
                  <div className="rs-act"><button type="button" className="pill dark sm" disabled={full} onClick={() => go(s)}>{full ? 'Penuh' : <>Daftar <span aria-hidden>→</span></>}</button></div>
                </div>
              );
            })}
          </div>
          <a className="pill ghost" style={{ marginTop: 28 }} href="#jadwal" onClick={(e) => { e.preventDefault(); pick('venue'); }}>Jadwal lengkap <span aria-hidden>→</span></a>
        </div>
      </section>

      {testi.length > 0 && (
        <section className="sec tinted">
          <div className="container">
            <div className="sec-head">
              <div><div className="eyebrow">Experience Testimony</div><h2>Cerita mereka yang <em>sudah ikut</em></h2></div>
              <a className="pill ghost" href="#jadwal" onClick={(e) => { e.preventDefault(); pick('testimony'); }}>Lihat semua <span aria-hidden>→</span></a>
            </div>
            <div className="g4">{testi.map((m) => <MediaItem key={m.src} m={m} />)}</div>
          </div>
        </section>
      )}

      {gallery6.length > 0 && (
        <section className="sec">
          <div className="container">
            <div className="eyebrow">Dokumentasi</div>
            <h2>Intip suasana <em>kelas kami</em></h2>
            <div className="g3">{gallery6.map((src) => <img key={src} src={src} alt="Dokumentasi Harmony of Life" loading="lazy" />)}</div>
            <div style={{ textAlign: 'center', marginTop: 28 }}><a className="pill ghost" href="#jadwal" onClick={(e) => { e.preventDefault(); pick('classes'); }}>Buka galeri <span aria-hidden>→</span></a></div>
          </div>
        </section>
      )}

      <section className="sec">
        <div className="container faq">
          <div className="eyebrow center">FAQ</div>
          <h2 className="center">Pertanyaan sebelum <em>mulai</em></h2>
          <p className="muted center">Hal-hal yang perlu kamu tahu sebelum ikut kelas.</p>
          <div className="faq-grid">
            {FAQ.map(([q, a], i) => (
              <details key={q}><summary><span className="n">{String(i + 1).padStart(2, '0')}</span>{q}<span className="plus" aria-hidden>+</span></summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>
    </>
  );

  return (
    <>
    <nav className="nav" aria-label="Menu utama">
      <div className="nav-in">
        <a className="nav-brand" href="#" onClick={(e) => { e.preventDefault(); pick('home'); }}>Harmony of Life</a>
        <div className="nav-links">
          {NAV.map(([k, t]) => (
            <a key={k} href="#jadwal" className={!result && tab === k ? 'on' : ''} onClick={(e) => { e.preventDefault(); pick(k); }}>{t}</a>
          ))}
        </div>
        <a className="pill dark nav-cta" href="#jadwal" onClick={(e) => { e.preventDefault(); pick('venue'); }}>Daftar yoga <span aria-hidden>→</span></a>
      </div>
    </nav>
    {!result && tab === 'home' ? landing : (
    <div className={'wrap' + (CONTENT[tab] && !result ? ' wide' : '')}>
      {result ? (
        <div className="card pay">
          <div className="eyebrow">{result.free ? 'Terima kasih' : 'Pembayaran'}</div>
          <h2 style={{ marginTop: 0 }}>{result.free ? <>Pendaftaran <em>berhasil</em></> : <>Silakan <em>transfer</em></>}</h2>
          <p className="muted" style={{ marginTop: 0 }}>Pesanan <b>{result.label}</b> atas nama <b>{fullName}</b> sudah kami catat{result.free ? ', kursimu sudah terdaftar' : result.date ? ', kursi ditahan untukmu' : ''}.</p>
          <dl>
            <div className="row"><dt>Bank</dt><dd>{result.bank.name}</dd></div>
            <div className="row"><dt>No. Rekening</dt><dd>{fmtAcc(result.bank.account)} <Copy text={result.bank.account} /></dd></div>
            <div className="row"><dt>Atas Nama</dt><dd>{result.bank.holder}</dd></div>
            {!result.free && <>
            <div className="row"><dt>{result.isTicket ? 'Tiket' : 'Donasi'}</dt><dd>{rp(result.donation)}</dd></div>
            <div className="row"><dt>Kode unik</dt><dd>+ {result.uniqueCode}</dd></div>
            <div className="row"><dt>Total transfer</dt><dd><span className="total">{rp(result.total)}</span> <Copy text={result.total} /></dd></div>
            </>}
          </dl>
          {result.free
            ? <div className="note">Donasi sukarela: transfer sesuai keikhlasanmu ke rekening di atas. Tidak ada nominal tetap dan tidak ada kode unik.</div>
            : <div className="note">Transfer <b>tepat <span className="hl">{rp(result.total)}</span></b> (termasuk kode unik) agar pembayaran mudah kami cocokkan. Mohon transfer sebelum {new Date(result.expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB.</div>}
          <a className="btn wa" href={result.waUrl} target="_blank" rel="noopener noreferrer">{result.free ? 'Konfirmasi & kirim bukti transfer via WhatsApp' : 'Kirim bukti transfer via WhatsApp'}</a>
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
                <Fragment key={s.id}>
                <article className={'tt-card' + (sel?.id === s.id ? ' sel' : '')} onClick={() => !full && sel?.id !== s.id && go(s)}>
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
                    <button type="button" className="btn sm" disabled={full} onClick={(e) => { e.stopPropagation(); go(s); }}>{sel?.id === s.id ? 'Dipilih ✓' : 'Daftar'}</button>
                  </div>
                </article>
                {sel?.id === s.id && formPanel}
                </Fragment>
              );
            })}
            {tab !== 'record' && data && list.length > 0 && shown.length === 0 && <p className="muted">Tidak ada kelas di hari ini. Coba pilih hari bertitik.</p>}
            {tab === 'record' && data?.recordings.map((r, k) => (
              <Fragment key={r.id}>
              <article className={'tt-card' + (sel?.id === r.id ? ' sel' : '')} onClick={() => sel?.id !== r.id && (setSel(r), scrollTo('form'))}>
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
                  <button type="button" className="btn sm" onClick={(e) => { e.stopPropagation(); setSel(r); scrollTo('form'); }}>{sel?.id === r.id ? 'Dipilih ✓' : 'Beli'}</button>
                </div>
              </article>
              {sel?.id === r.id && formPanel}
              </Fragment>
            ))}
          </div>

        </>
      )}
    </div>
    )}
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
