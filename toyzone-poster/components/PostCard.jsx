'use client';
import { useState } from 'react';

const STATUS = {
  pending: 'Menunggu persetujuan', approved: 'Disetujui · terjadwal', rejected: 'Ditolak',
  publishing: 'Sedang diposting…', published: 'Sudah terbit', failed: 'Gagal terbit',
};
const THEME = {
  baru: ['Produk Baru', '#0a63c9'], promo: ['Promo', '#e3000b'], terlaris: ['Terlaris', '#f27c00'],
  koleksi: ['Koleksi Premium', '#0b2d5e'], terbatas: ['Stok Terbatas', '#7b1fa2'],
};
const STYLES = { jualan: 'Jualan', seru: 'Seru', lucu: 'Lucu', premium: 'Premium', hadiah: 'Ide hadiah' };

const rp = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');
// ISO (UTC) <-> "YYYY-MM-DDTHH:mm" waktu WIB untuk input datetime-local
const toWibInput = (iso) => new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().slice(0, 16);
const fromWibInput = (v) => new Date(v + ':00+07:00').toISOString();
const fmt = (iso) => new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB';

export default function PostCard({ post, onChange, notify, onZoom }) {
  const [caption, setCaption] = useState(post.caption);
  const [when, setWhen] = useState(toWibInput(post.schedule_at));
  const [style, setStyle] = useState(post.style || 'jualan');
  const [busy, setBusy] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);

  const editable = ['pending', 'rejected', 'failed'].includes(post.status);
  const dirty = caption !== post.caption || fromWibInput(when) !== new Date(post.schedule_at).toISOString();
  const p = post.product;
  const [themeLabel, themeColor] = THEME[post.theme] || [post.theme, '#555'];

  const req = async (label, url, method, body) => {
    setBusy(label);
    try {
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Gagal');
      if (d.post) { setCaption(d.post.caption); setWhen(toWibInput(d.post.schedule_at)); setImgLoaded(false); onChange(d.post); }
      return d;
    } catch (e) { notify('⚠️ ' + e.message); }
    finally { setBusy(''); }
  };
  const save = () => req('save', `/api/posts/${post.id}`, 'PATCH', { caption, scheduleAt: fromWibInput(when) }).then((d) => d && notify('Perubahan disimpan'));
  const setStatus = async (status, msg) => {
    if (dirty && editable) { const d = await req('save', `/api/posts/${post.id}`, 'PATCH', { caption, scheduleAt: fromWibInput(when) }); if (!d) return; }
    const d = await req(status, `/api/posts/${post.id}`, 'PATCH', { status });
    if (d) notify(msg);
  };
  const regen = (mode) => req(mode, `/api/posts/${post.id}/regenerate`, 'POST', { mode, style }).then((d) => d && notify(mode === 'product' ? 'Produk & caption diganti' : 'Caption baru dibuat'));
  const publishNow = () => {
    if (!confirm('Posting ke Instagram sekarang juga?')) return;
    req('publish', `/api/posts/${post.id}/publish`, 'POST').then((d) => d && notify('Berhasil terbit di Instagram 🎉'));
  };

  const imgSrc = `/api/image/${post.id}?v=${encodeURIComponent(post.updated_at || '')}`;

  return (
    <article className="post">
      <button className="post-img" onClick={() => onZoom(imgSrc)} aria-label="Perbesar gambar">
        {!imgLoaded && <span className="loading">Membuat gambar…</span>}
        <img src={imgSrc} alt={p.name} onLoad={() => setImgLoaded(true)} style={{ opacity: imgLoaded ? 1 : 0 }} />
      </button>
      <div className="post-body">
        <div className={`post-status st-${post.status}`}>● {STATUS[post.status]}</div>
        <div className="post-meta">
          <span className="chip" style={{ background: themeColor }}>{themeLabel}</span>
          {editable
            ? <label className="when">🗓 <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /> <small className="muted">WIB</small></label>
            : <span className="when">🗓 {fmt(post.published_at || post.schedule_at)}</span>}
        </div>
        <div className="prod"><b>{p.name}</b> · {p.price == null ? 'Tanya harga' : p.salePrice ? <><s>{rp(p.price)}</s> {rp(p.salePrice)}</> : rp(p.price)}</div>
        <textarea className="caption" value={caption} onChange={(e) => setCaption(e.target.value)} readOnly={!editable} maxLength={2200} />
        <div className="cap-foot">
          <span>{post.caption_source === 'template' ? 'Caption dari template (AI belum aktif)' : 'Caption dibuat AI'}</span>
          <span>{caption.length}/2200</span>
        </div>
        {post.error && <div className="err-box">Gagal: {post.error}</div>}

        <div className="actions">
          {post.status === 'pending' && <>
            <button className="btn btn-ok" disabled={!!busy} onClick={() => setStatus('approved', 'Disetujui ✓ akan terbit otomatis')}>{busy === 'approved' ? '…' : '✓ Setujui'}</button>
            <button className="btn btn-danger" disabled={!!busy} onClick={() => setStatus('rejected', 'Pengajuan ditolak')}>✕ Tolak</button>
          </>}
          {post.status === 'approved' && <>
            <button className="btn btn-ghost" disabled={!!busy} onClick={() => setStatus('pending', 'Persetujuan dibatalkan')}>Batalkan persetujuan</button>
            <button className="btn btn-orange" disabled={!!busy} onClick={publishNow}>{busy === 'publish' ? 'Memposting…' : 'Posting sekarang'}</button>
          </>}
          {post.status === 'rejected' && <button className="btn btn-ghost" disabled={!!busy} onClick={() => setStatus('pending', 'Dikembalikan ke pengajuan')}>Kembalikan ke pengajuan</button>}
          {post.status === 'failed' && <>
            <button className="btn btn-orange" disabled={!!busy} onClick={publishNow}>{busy === 'publish' ? 'Memposting…' : 'Coba posting lagi'}</button>
            <button className="btn btn-danger" disabled={!!busy} onClick={() => setStatus('rejected', 'Dibatalkan')}>Batalkan</button>
          </>}
          {post.status === 'published' && post.permalink && <a className="btn btn-navy" href={post.permalink} target="_blank" rel="noreferrer">Lihat di Instagram ↗</a>}
          {editable && dirty && <button className="btn btn-navy" disabled={!!busy} onClick={save}>{busy === 'save' ? 'Menyimpan…' : 'Simpan perubahan'}</button>}
        </div>

        {editable && (
          <div className="regen">
            <select value={style} onChange={(e) => setStyle(e.target.value)} aria-label="Gaya caption">
              {Object.entries(STYLES).map(([k, v]) => <option key={k} value={k}>Gaya: {v}</option>)}
            </select>
            <button className="btn btn-ghost" disabled={!!busy} onClick={() => regen('caption')}>{busy === 'caption' ? 'Menulis…' : '↻ Caption baru'}</button>
            <button className="btn btn-ghost" disabled={!!busy} onClick={() => regen('product')}>{busy === 'product' ? 'Mencari…' : '⇄ Ganti produk'}</button>
          </div>
        )}
      </div>
    </article>
  );
}
