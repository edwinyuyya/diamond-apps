'use client';
import { useEffect, useState } from 'react';
import AdminBar from '../../../components/admin/AdminBar';
import { uploadImage } from '../../../components/admin/upload';
import { slugify } from '../../../lib/categories';

// Atur slide banner di paling atas halaman beranda: ganti gambar, link, urutan, tampil/sembunyi.
const NEW_SLIDE = () => ({ id: `s${Date.now()}`, title: '', titleEn: '', href: '/produk', image: '', imageMobile: '', imageEn: '', imageMobileEn: '', visible: true, _new: true });

const IMG_FIELDS = {
  image: { label: 'Gambar utama (komputer)', hint: '1920×640 px (lebar 3:1)', wide: true },
  imageMobile: { label: 'Gambar HP', hint: '1080×1080 px (kotak), opsional' },
  imageEn: { label: 'Gambar versi Inggris (komputer)', hint: 'opsional, kalau ada tulisan di gambar', wide: true },
  imageMobileEn: { label: 'Gambar versi Inggris (HP)', hint: 'opsional' },
};

function ImagePick({ value, field, onChange, onError }) {
  const meta = IMG_FIELDS[field];
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setBusy(true);
    try { onChange(await uploadImage(file, { banner: true })); } catch (err) { onError(err.message); }
    setBusy(false);
  };
  return (
    <div className={`adm-slide-img ${meta.wide ? 'wide' : 'sq'}`}>
      <span className="adm-slide-lbl">{meta.label} <small className="adm-muted">· {meta.hint}</small></span>
      <label className="adm-slide-drop">
        <input type="file" accept="image/*" onChange={pick} hidden />
        {busy ? <span>Mengunggah…</span> : value ? <img src={value} alt="" /> : <span>＋ Pilih gambar</span>}
        {value && !busy && <em>Ganti</em>}
      </label>
      {value && field !== 'image' && <button type="button" className="link-btn adm-muted small" onClick={() => onChange('')}>Hapus gambar ini</button>}
    </div>
  );
}

export default function SlideAdmin() {
  const [slides, setSlides] = useState(null);
  const [defaults, setDefaults] = useState([]);
  const [links, setLinks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [dirty, setDirty] = useState(false);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    const go = (r) => { if (r.status === 401) { location.href = '/admin/login'; return {}; } return r.json(); };
    fetch('/api/admin/slides').then(go).then((d) => { setSlides(d.slides || []); setDefaults(d.defaults || []); });
    fetch('/api/admin/products').then(go).then((d) => {
      const ps = (d.products || []).filter((p) => p.visible !== false);
      const cats = [...new Map(ps.map((p) => [p.category || slugify(p.categoryName), p.categoryName])).entries()];
      setLinks([
        ['/produk', 'Semua Produk'], ['/produk?tag=baru', 'Produk Baru'], ['/produk?tag=diskon', 'Sale'],
        ...cats.map(([slug, name]) => [`/produk?kategori=${slug}`, `Kategori: ${name}`]),
        ...ps.map((p) => [`/produk/${p.slug}`, `Produk: ${p.name}`]),
      ]);
    });
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = (next) => { setSlides(next); setDirty(true); setErr(''); };
  const setField = (i, k, v) => update(slides.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const move = (i, d) => { const a = [...slides]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; update(a); };
  const drop = (i) => { if (confirm('Hapus slide ini?')) update(slides.filter((_, j) => j !== i)); };

  const save = async () => {
    const missing = slides.findIndex((s) => !s.image);
    if (missing >= 0) return setErr(`Slide ${missing + 1} belum ada gambar utamanya.`);
    setBusy(true); setErr('');
    const r = await fetch('/api/admin/slides', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slides }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(d.error || 'Gagal menyimpan');
    setSlides(d.slides); setDirty(false); notify('Slide disimpan. Beranda langsung berubah.');
  };
  const reset = () => { if (confirm('Kembalikan semua slide ke banner bawaan? Slide yang kamu buat akan hilang setelah disimpan.')) update(defaults); };

  return (
    <>
      <AdminBar />
      <main className="adm-wrap adm-page">
        <div className="adm-head">
          <div>
            <h1>Slide Banner</h1>
            <p className="adm-muted">Gambar besar yang bergeser di paling atas halaman beranda. Maksimal 10 slide.</p>
          </div>
          <button className="adm-btn adm-btn-primary" onClick={() => update([...slides, NEW_SLIDE()])} disabled={!slides || slides.length >= 10}>+ Tambah Slide</button>
        </div>
        <div className="adm-alert">💡 Siapkan 2 ukuran: <b>komputer 1920×640 px</b> (lebar) dan <b>HP 1080×1080 px</b> (kotak). Kalau gambar HP kosong, di HP gambar komputer ditampilkan utuh. Kalau gambarnya ada tulisan, kamu bisa tambah versi bahasa Inggrisnya.</div>
        {!slides && <p className="adm-muted">Memuat…</p>}

        <div className="adm-list">
          {slides?.map((s, i) => (
            <section key={s.id} className={`adm-card adm-slide ${s.visible === false ? 'off' : ''}`}>
              <div className="adm-slide-top">
                <b>Slide {i + 1}</b>
                <label className="adm-switch"><input type="checkbox" checked={s.visible !== false} onChange={(e) => setField(i, 'visible', e.target.checked)} /><span>{s.visible === false ? 'Disembunyikan' : 'Tampil'}</span></label>
                <span style={{ flex: 1 }} />
                <div className="adm-photo-btns">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Naikkan">↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === slides.length - 1} aria-label="Turunkan">↓</button>
                  <button type="button" onClick={() => drop(i)} aria-label="Hapus slide">✕</button>
                </div>
              </div>
              <div className="adm-slide-imgs">
                <ImagePick field="image" value={s.image} onChange={(v) => setField(i, 'image', v)} onError={setErr} />
                <ImagePick field="imageMobile" value={s.imageMobile} onChange={(v) => setField(i, 'imageMobile', v)} onError={setErr} />
              </div>
              <div className="adm-grid">
                <label className="adm-field"><span>Link tujuan saat diklik</span>
                  <select value={links.some(([h]) => h === s.href) ? s.href : '__custom'} onChange={(e) => setField(i, 'href', e.target.value === '__custom' ? '' : e.target.value)}>
                    {links.map(([h, l]) => <option key={h} value={h}>{l}</option>)}
                    <option value="__custom">Link lain…</option>
                  </select>
                  {!links.some(([h]) => h === s.href) && <input value={s.href} onChange={(e) => setField(i, 'href', e.target.value)} placeholder="/produk?q=doraemon atau https://…" />}
                </label>
                <label className="adm-field"><span>Keterangan gambar (untuk Google)</span><input value={s.title} onChange={(e) => setField(i, 'title', e.target.value)} placeholder="contoh: Promo Fat Tiger" /></label>
              </div>
              <details className="adm-slide-en" open={!!(s.imageEn || s.imageMobileEn)}>
                <summary>🇬🇧 Versi bahasa Inggris (opsional)</summary>
                <div className="adm-slide-imgs">
                  <ImagePick field="imageEn" value={s.imageEn} onChange={(v) => setField(i, 'imageEn', v)} onError={setErr} />
                  <ImagePick field="imageMobileEn" value={s.imageMobileEn} onChange={(v) => setField(i, 'imageMobileEn', v)} onError={setErr} />
                </div>
                <label className="adm-field"><span>Image description (English)</span><input value={s.titleEn} onChange={(e) => setField(i, 'titleEn', e.target.value)} /></label>
              </details>
            </section>
          ))}
          {slides && slides.length === 0 && <p className="adm-muted">Belum ada slide. Bagian banner tidak tampil di beranda sampai kamu menambah slide.</p>}
        </div>

        {err && <p className="adm-err">{err}</p>}
        <div className="adm-actions">
          <button type="button" className="adm-btn" onClick={reset} disabled={busy || !slides}>Kembalikan bawaan</button>
          <span style={{ flex: 1 }} />
          {dirty && <span className="adm-muted small">Belum disimpan</span>}
          <button className="adm-btn adm-btn-primary" onClick={save} disabled={busy || !slides || !dirty}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </main>
      {toast && <div className="adm-toast">{toast}</div>}
    </>
  );
}
