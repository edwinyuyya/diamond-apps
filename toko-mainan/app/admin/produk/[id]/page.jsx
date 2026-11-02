'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminBar from '../../../../components/admin/AdminBar';
import ProductImage from '../../../../components/ProductImage';

const EMPTY = { name: '', categoryName: '', series: '', price: '', compareAt: '', stock: '', age: '', badge: 'Baru', description: '', specsText: '', images: [], visible: true };

// Perkecil foto di HP sebelum diunggah (maks 1600px) supaya cepat & hemat kuota
async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', 0.88));
  } catch { return file; }
}

export default function ProductForm({ params }) {
  const isNew = params.id === 'baru';
  const router = useRouter();
  const [f, setF] = useState(isNew ? EMPTY : null);
  const [cats, setCats] = useState([]);
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    fetch('/api/admin/products').then((r) => { if (r.status === 401) { location.href = '/admin/login'; return {}; } return r.json(); }).then((d) => {
      const all = d.products || [];
      setCats([...new Set(all.map((p) => p.categoryName).filter(Boolean))]);
      if (isNew) return;
      const p = all.find((x) => x.id === params.id);
      if (!p) return setErr('Produk tidak ditemukan');
      setF({
        id: p.id, name: p.name, categoryName: p.categoryName || '', series: p.series || '',
        price: p.salePrice ?? p.price ?? '', compareAt: p.salePrice ? p.price : '',
        stock: p.stock ?? '', age: p.age ?? '', badge: p.badge || '', description: p.description || '',
        specsText: Object.entries(p.specs || {}).map(([k, v]) => `${k}: ${v}`).join('\n'),
        images: p.images || [], visible: p.visible !== false, slug: p.slug, color: p.color, emoji: p.emoji,
      });
    });
  }, [isNew, params.id]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const upload = async (files) => {
    const list = [...files].slice(0, 12 - f.images.length);
    setUploading(list.length); setErr('');
    const urls = [];
    for (const file of list) {
      const fd = new FormData();
      fd.append('file', await shrink(file), 'foto.jpg');
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const d = await r.json().catch(() => ({}));
      if (r.ok) urls.push(d.url); else setErr(d.error || 'Gagal mengunggah foto');
      setUploading((n) => n - 1);
    }
    setF((cur) => ({ ...cur, images: [...cur.images, ...urls] }));
    if (fileRef.current) fileRef.current.value = '';
  };
  const move = (i, d) => setF((cur) => { const a = [...cur.images]; const j = i + d; if (j < 0 || j >= a.length) return cur; [a[i], a[j]] = [a[j], a[i]]; return { ...cur, images: a }; });
  const drop = (i) => setF((cur) => ({ ...cur, images: cur.images.filter((_, k) => k !== i) }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product: f }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(d.error || 'Gagal menyimpan');
    router.push('/admin');
    router.refresh();
  };
  const del = async () => {
    if (!confirm(`Hapus "${f.name}" dari toko? Ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    const r = await fetch(`/api/admin/products/${f.id}`, { method: 'DELETE' });
    setBusy(false);
    if (r.ok) { router.push('/admin'); router.refresh(); } else setErr('Gagal menghapus');
  };

  if (!f) return <><AdminBar /><main className="adm-wrap adm-page"><p className="adm-muted">{err || 'Memuat…'}</p></main></>;
  const preview = { ...f, color: f.color || '#f27c00', emoji: f.emoji || '🧸' };

  return (
    <>
      <AdminBar />
      <main className="adm-wrap adm-page">
        <Link href="/admin" className="adm-back">← Semua produk</Link>
        <h1>{isNew ? 'Tambah Produk' : 'Ubah Produk'}</h1>
        <form className="adm-form" onSubmit={save}>
          <section className="adm-card">
            <h2>Foto produk</h2>
            <p className="adm-muted small">Foto pertama jadi foto utama. Foto otomatis dikompres dan tampil dalam frame Toyzone.</p>
            <div className="adm-photos">
              {f.images.map((u, i) => (
                <div key={u} className="adm-photo">
                  <ProductImage product={{ ...preview, images: [u] }} size="sm" />
                  {i === 0 && <span className="adm-main">Utama</span>}
                  <div className="adm-photo-btns">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Geser kiri">←</button>
                    <button type="button" onClick={() => drop(i)} aria-label="Hapus foto">✕</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === f.images.length - 1} aria-label="Geser kanan">→</button>
                  </div>
                </div>
              ))}
              {f.images.length < 12 && (
                <label className="adm-add-photo">
                  <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => upload(e.target.files)} hidden />
                  {uploading ? `Mengunggah ${uploading}…` : <>＋<small>Tambah foto</small></>}
                </label>
              )}
            </div>
          </section>

          <section className="adm-card">
            <h2>Info produk</h2>
            <label className="adm-field full"><span>Nama produk *</span><input value={f.name} onChange={set('name')} required placeholder="contoh: Fat Tiger Blind Box — Tiger Food Party" /></label>
            <div className="adm-grid">
              <label className="adm-field"><span>Kategori *</span>
                <input value={f.categoryName} onChange={set('categoryName')} list="adm-cats" required placeholder="Blind Box / Rolife / …" />
                <datalist id="adm-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
              </label>
              <label className="adm-field"><span>Seri / karakter</span><input value={f.series} onChange={set('series')} placeholder="Fat Tiger, Doraemon…" /></label>
              <label className="adm-field"><span>Label</span>
                <select value={f.badge} onChange={set('badge')}><option value="">(tanpa label)</option><option>Baru</option><option>Terlaris</option><option>Eksklusif</option></select>
              </label>
              <label className="adm-field"><span>Usia minimal</span><input value={f.age} onChange={set('age')} inputMode="numeric" placeholder="15" /></label>
            </div>
          </section>

          <section className="adm-card">
            <h2>Harga & stok</h2>
            <div className="adm-grid">
              <label className="adm-field"><span>Harga jual (Rp)</span><input value={f.price} onChange={set('price')} inputMode="numeric" placeholder="kosong = Tanya Harga" /></label>
              <label className="adm-field"><span>Harga coret (Rp)</span><input value={f.compareAt} onChange={set('compareAt')} inputMode="numeric" placeholder="isi kalau sedang diskon" /></label>
              <label className="adm-field"><span>Stok</span><input value={f.stock} onChange={set('stock')} inputMode="numeric" placeholder="0 = habis" /></label>
            </div>
            <p className="adm-muted small">Kalau diskon: isi harga NORMAL di "Harga coret" dan harga setelah diskon di "Harga jual".</p>
          </section>

          <section className="adm-card">
            <h2>Deskripsi</h2>
            <label className="adm-field full"><span>Deskripsi untuk pembeli</span><textarea rows={5} value={f.description} onChange={set('description')} /></label>
            <label className="adm-field full"><span>Spesifikasi (satu baris satu, format "Nama: isi")</span><textarea rows={4} value={f.specsText} onChange={set('specsText')} placeholder={'Jenis: Blind box figure\nIsi: 1 figure acak per box'} /></label>
          </section>

          <label className="adm-check"><input type="checkbox" checked={f.visible} onChange={set('visible')} /> Tampilkan di toko</label>
          {err && <p className="adm-err">{err}</p>}
          <div className="adm-actions">
            {!isNew && <button type="button" className="adm-btn adm-btn-danger" onClick={del} disabled={busy}>Hapus produk</button>}
            <span style={{ flex: 1 }} />
            <Link href="/admin" className="adm-btn">Batal</Link>
            <button className="adm-btn adm-btn-primary" disabled={busy || uploading > 0}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        </form>
      </main>
    </>
  );
}
