'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore, saveOrder } from '../../lib/store';
import { finalPrice, formatRp } from '../../lib/products';
import { SHIPPING, BANKS } from '../../lib/config';
import { buildOrder, validateCustomer } from '../../lib/order';
import { useCatalog } from '../../components/CatalogProvider';
import ProductImage from '../../components/ProductImage';
import { useLang } from '../../components/LangProvider';

const PROVINCES = ['Aceh','Sumatera Utara','Sumatera Barat','Riau','Kepulauan Riau','Jambi','Sumatera Selatan','Kepulauan Bangka Belitung','Bengkulu','Lampung','DKI Jakarta','Jawa Barat','Banten','Jawa Tengah','DI Yogyakarta','Jawa Timur','Bali','Nusa Tenggara Barat','Nusa Tenggara Timur','Kalimantan Barat','Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara','Sulawesi Utara','Gorontalo','Sulawesi Tengah','Sulawesi Barat','Sulawesi Selatan','Sulawesi Tenggara','Maluku','Maluku Utara','Papua','Papua Barat','Papua Barat Daya','Papua Tengah','Papua Pegunungan','Papua Selatan'];
const EMPTY = { name: '', phone: '', email: '', address: '', city: '', province: '', postal: '', note: '' };
const SAVED_KEY = 'tz_customer';

export default function Checkout() {
  const { products } = useCatalog();
  const { items, ready, clear } = useStore();
  const router = useRouter();
  const { lang, t } = useLang();
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
    const v = validateCustomer(f, lang);
    if (!agree) v.agree = t('co.agreeErr');
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
      order = buildOrder(payload.items, f, products); // cadangan kalau server tidak bisa dihubungi
    }
    saveOrder(order);
    try { const { note, ...keep } = f; localStorage.setItem(SAVED_KEY, JSON.stringify(keep)); } catch {}
    clear();
    router.push(`/pembayaran/${order.id}`);
  };

  if (!ready) return <div className="wrap pad">{t('common.loading')}</div>;
  if (!items.length && !busy) return (
    <div className="wrap pad"><div className="empty"><div style={{ fontSize: 64 }}>🛒</div><p>{t('co.empty')}</p><Link href="/produk" className="btn btn-primary">{t('common.startShopping')}</Link></div></div>
  );

  const Field = ({ k, label, children, full }) => (
    <label className={`field ${full ? 'full' : ''} ${err[k] ? 'has-err' : ''}`}>
      <span>{label}</span>{children}{err[k] && <em>{err[k]}</em>}
    </label>
  );

  return (
    <div className="wrap pad">
      <div className="steps"><span className="done">{t('co.step1')}</span><span className="on">{t('co.step2')}</span><span>{t('co.step3')}</span></div>
      <form className="two-col" onSubmit={submit} noValidate>
        <div className="panel">
          <h3>{t('co.address')}</h3>
          <div className="form-grid">
            {Field({ k: 'name', label: t('co.name'), children: <input value={f.name} onChange={set('name')} placeholder={t('co.namePh')} autoComplete="name" /> })}
            {Field({ k: 'phone', label: t('co.phone'), children: <input value={f.phone} onChange={set('phone')} placeholder="08xxxxxxxxxx" inputMode="tel" autoComplete="tel" /> })}
            {Field({ k: 'email', label: t('co.email'), full: true, children: <input type="email" value={f.email} onChange={set('email')} placeholder={t('co.emailPh')} autoComplete="email" /> })}
            {Field({ k: 'address', label: t('co.fullAddress'), full: true, children: <textarea rows={3} value={f.address} onChange={set('address')} placeholder={t('co.addressPh')} autoComplete="street-address" /> })}
            {Field({ k: 'city', label: t('co.city'), children: <input value={f.city} onChange={set('city')} placeholder={t('co.cityPh')} /> })}
            {Field({ k: 'province', label: t('co.province'), children: (
              <select value={f.province} onChange={set('province')}><option value="">{t('co.pickProvince')}</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select>
            ) })}
            {Field({ k: 'postal', label: t('co.postal'), children: <input value={f.postal} onChange={set('postal')} placeholder="40123" inputMode="numeric" maxLength={5} autoComplete="postal-code" /> })}
            {Field({ k: 'note', label: t('co.note'), full: true, children: <input value={f.note} onChange={set('note')} placeholder={t('co.notePh')} /> })}
          </div>
          <h3 style={{ marginTop: 24 }}>{t('co.payMethod')}</h3>
          <div className="pay-method on">
            <b>{t('co.transfer')}</b>
            <small>{BANKS.map((b) => b.bank).join(' · ')}{t('co.transferText')}</small>
          </div>
          <label className={`fcheck agree ${err.agree ? 'has-err' : ''}`}>
            <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErr({ ...err, agree: undefined }); }} />
            <span>{t('co.agree')}</span>
          </label>
          {err.agree && <em className="err-txt">{err.agree}</em>}
        </div>

        <div className="panel summary">
          <h3>{t('co.yourOrder', { n: items.length })}</h3>
          <div className="sum-items">
            {items.map(({ id, qty, product: p }) => (
              <div key={id} className="sum-item">
                <div className="ci-img xs"><ProductImage product={p} size="sm" /><i>{qty}</i></div>
                <span>{p.name}</span>
                <b>{formatRp(finalPrice(p) * qty)}</b>
              </div>
            ))}
          </div>
          <div className="row-between"><span>{t('common.subtotal')}</span><span>{formatRp(subtotal)}</span></div>
          <div className="row-between"><span>{t('common.shipping')}</span><span>{shipping ? formatRp(shipping) : <b className="green">{t('common.free')}</b>}</span></div>
          <div className="row-between"><span>{t('common.uniqueCode')}</span><span className="muted">{t('co.autoCode')}</span></div>
          <div className="row-between total"><span>{t('common.total')}</span><b>{formatRp(subtotal + shipping)}+</b></div>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? t('co.processing') : t('co.place')}</button>
          <Link href="/keranjang" className="btn btn-ghost btn-block">{t('co.back')}</Link>
        </div>
      </form>
    </div>
  );
}
