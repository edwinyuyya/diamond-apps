'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore, saveOrder } from '../../lib/store';
import { finalPrice, formatRp } from '../../lib/products';
import { SHIPPING, BANKS } from '../../lib/config';
import { buildOrder, validateCustomer } from '../../lib/order';
import ProductImage from '../../components/ProductImage';

const PROVINCES = ['Aceh','Sumatera Utara','Sumatera Barat','Riau','Kepulauan Riau','Jambi','Sumatera Selatan','Kepulauan Bangka Belitung','Bengkulu','Lampung','DKI Jakarta','Jawa Barat','Banten','Jawa Tengah','DI Yogyakarta','Jawa Timur','Bali','Nusa Tenggara Barat','Nusa Tenggara Timur','Kalimantan Barat','Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara','Sulawesi Utara','Gorontalo','Sulawesi Tengah','Sulawesi Barat','Sulawesi Selatan','Sulawesi Tenggara','Maluku','Maluku Utara','Papua','Papua Barat','Papua Barat Daya','Papua Tengah','Papua Pegunungan','Papua Selatan'];
const EMPTY = { name: '', phone: '', email: '', address: '', city: '', province: '', postal: '', note: '' };
const SAVED_KEY = 'bt_customer';

export default function Checkout() {
  const { items, ready, clear } = useStore();
  const router = useRouter();
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);

  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(SAVED_KEY)); if (s) setF({ ...EMPTY, ...s, note: '' }); } catch {} }, []);

  const subtotal = items.reduce((s, x) => s + finalPrice(x.product) * x.qty, 0);
  const shipping = subtotal >= SHIPPING.freeAbove ? 0 : SHIPPING.flat;
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (err[k]) setErr({ ...err, [k]: undefined }); };

  const submit = async (e) => {
    e.preventDefault();
    const v = validateCustomer(f);
    if (!agree) v.agree = 'Centang persetujuan terlebih dahulu';
    setErr(v);
    if (Object.keys(v).length) { document.querySelector('.has-err')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    setBusy(true);
    const payload = { items: items.map((x) => ({ id: x.id, qty: x.qty })), customer: f };
    let order;
    try {
      const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) { if (d.errors) { setErr(d.errors); setBusy(false); return; } throw new Error(d.error); }
      order = d.order;
    } catch {
      order = buildOrder(payload.items, f); // cadangan kalau server tidak bisa dihubungi
    }
    saveOrder(order);
    try { const { note, ...keep } = f; localStorage.setItem(SAVED_KEY, JSON.stringify(keep)); } catch {}
    clear();
    router.push(`/pembayaran/${order.id}`);
  };

  if (!ready) return <div className="wrap pad">Memuat…</div>;
  if (!items.length && !busy) return (
    <div className="wrap pad"><div className="empty"><div style={{ fontSize: 64 }}>🛒</div><p>Keranjang kosong, belum ada yang bisa di-checkout.</p><Link href="/produk" className="btn btn-primary">Mulai Belanja</Link></div></div>
  );

  const Field = ({ k, label, children, full }) => (
    <label className={`field ${full ? 'full' : ''} ${err[k] ? 'has-err' : ''}`}>
      <span>{label}</span>{children}{err[k] && <em>{err[k]}</em>}
    </label>
  );

  return (
    <div className="wrap pad">
      <div className="steps"><span className="done">1. Keranjang</span><span className="on">2. Data Pengiriman</span><span>3. Pembayaran</span></div>
      <form className="two-col" onSubmit={submit} noValidate>
        <div className="panel">
          <h3>📍 Alamat Pengiriman</h3>
          <div className="form-grid">
            {Field({ k: 'name', label: 'Nama Penerima *', children: <input value={f.name} onChange={set('name')} placeholder="Nama lengkap" autoComplete="name" /> })}
            {Field({ k: 'phone', label: 'No. WhatsApp / HP yang bisa dihubungi *', children: <input value={f.phone} onChange={set('phone')} placeholder="08xxxxxxxxxx" inputMode="tel" autoComplete="tel" /> })}
            {Field({ k: 'email', label: 'Email (opsional)', full: true, children: <input type="email" value={f.email} onChange={set('email')} placeholder="nama@email.com" autoComplete="email" /> })}
            {Field({ k: 'address', label: 'Alamat Lengkap *', full: true, children: <textarea rows={3} value={f.address} onChange={set('address')} placeholder="Nama jalan, no. rumah, RT/RW, kelurahan, kecamatan, patokan" autoComplete="street-address" /> })}
            {Field({ k: 'city', label: 'Kota / Kabupaten *', children: <input value={f.city} onChange={set('city')} placeholder="Contoh: Kota Bandung" /> })}
            {Field({ k: 'province', label: 'Provinsi *', children: (
              <select value={f.province} onChange={set('province')}><option value="">Pilih provinsi</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select>
            ) })}
            {Field({ k: 'postal', label: 'Kode Pos *', children: <input value={f.postal} onChange={set('postal')} placeholder="40123" inputMode="numeric" maxLength={5} autoComplete="postal-code" /> })}
            {Field({ k: 'note', label: 'Catatan untuk penjual (opsional)', full: true, children: <input value={f.note} onChange={set('note')} placeholder="Contoh: tolong bungkus kado" /> })}
          </div>
          <h3 style={{ marginTop: 24 }}>🏦 Metode Pembayaran</h3>
          <div className="pay-method on">
            <b>Transfer Bank (Manual)</b>
            <small>{BANKS.map((b) => b.bank).join(' · ')}: nomor rekening & total transfer dengan kode unik ditampilkan setelah pesanan dibuat. Bukti transfer dikirim via WhatsApp.</small>
          </div>
          <label className={`fcheck agree ${err.agree ? 'has-err' : ''}`}>
            <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErr({ ...err, agree: undefined }); }} />
            <span>Saya sudah memastikan alamat & nomor HP benar, dan bersedia mengirim bukti transfer via WhatsApp.</span>
          </label>
          {err.agree && <em className="err-txt">{err.agree}</em>}
        </div>

        <div className="panel summary">
          <h3>Pesanan Kamu ({items.length})</h3>
          <div className="sum-items">
            {items.map(({ id, qty, product: p }) => (
              <div key={id} className="sum-item">
                <div className="ci-img xs"><ProductImage product={p} size="sm" /><i>{qty}</i></div>
                <span>{p.name}</span>
                <b>{formatRp(finalPrice(p) * qty)}</b>
              </div>
            ))}
          </div>
          <div className="row-between"><span>Subtotal</span><span>{formatRp(subtotal)}</span></div>
          <div className="row-between"><span>Ongkos kirim</span><span>{shipping ? formatRp(shipping) : <b className="green">GRATIS</b>}</span></div>
          <div className="row-between"><span>Kode unik</span><span className="muted">dibuat otomatis</span></div>
          <div className="row-between total"><span>Total</span><b>{formatRp(subtotal + shipping)}+</b></div>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Memproses…' : 'Buat Pesanan'}</button>
          <Link href="/keranjang" className="btn btn-ghost btn-block">← Kembali ke Keranjang</Link>
        </div>
      </form>
    </div>
  );
}
