'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getOrder, saveOrder } from '../../../lib/store';
import { formatRp } from '../../../lib/products';
import { BANKS, STORE } from '../../../lib/config';
import { waConfirmUrl } from '../../../lib/order';

function Countdown({ to }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = Math.max(0, new Date(to).getTime() - now);
  if (!left) return <b className="red">Waktu pembayaran habis</b>;
  const h = Math.floor(left / 3.6e6), m = Math.floor((left % 3.6e6) / 6e4), s = Math.floor((left % 6e4) / 1000);
  const p = (n) => String(n).padStart(2, '0');
  return <span className="countdown"><i>{p(h)}</i>:<i>{p(m)}</i>:<i>{p(s)}</i></span>;
}

function Copy({ text, label = 'Salin' }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(String(text)); } catch {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    setOk(true); setTimeout(() => setOk(false), 1500);
  };
  return <button type="button" className="copy" onClick={copy}>{ok ? '✓ Tersalin' : label}</button>;
}

export default function Payment({ params }) {
  const [order, setOrder] = useState(undefined);

  useEffect(() => {
    const local = getOrder(params.id);
    if (local) { setOrder(local); return; }
    fetch(`/api/orders/${params.id}`).then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.order) { saveOrder(d.order); setOrder(d.order); } else setOrder(null); })
      .catch(() => setOrder(null));
  }, [params.id]);

  if (order === undefined) return <div className="wrap pad">Memuat…</div>;
  if (order === null) return (
    <div className="wrap pad"><div className="empty"><div style={{ fontSize: 56 }}>🧾</div>
      <p>Pesanan <b>{params.id}</b> tidak ditemukan di perangkat ini.</p>
      <a className="btn btn-primary" href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`Halo, saya mau cek pesanan ${params.id}`)}`} target="_blank" rel="noreferrer">Tanya Admin via WhatsApp</a>
    </div></div>
  );

  const c = order.customer;
  const totalStr = String(order.total);
  const main = totalStr.slice(0, -3), tail = totalStr.slice(-3);

  return (
    <div className="wrap pad pay">
      <div className="steps"><span className="done">1. Keranjang</span><span className="done">2. Data Pengiriman</span><span className="on">3. Pembayaran</span></div>

      <div className="pay-hero">
        <div className="pay-ok">✓</div>
        <h1>Pesanan Berhasil Dibuat!</h1>
        <p>No. Pesanan: <b>{order.id}</b> <Copy text={order.id} /></p>
        <div className="pay-deadline">Selesaikan pembayaran dalam <Countdown to={order.deadline} /><small>Batas: {new Date(order.deadline).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</small></div>
      </div>

      <div className="two-col">
        <div>
          <div className="panel pay-step">
            <div className="pay-num">1</div>
            <div className="grow">
              <h3>Transfer TEPAT sesuai nominal berikut</h3>
              <div className="pay-total">
                <span>Rp{Number(main).toLocaleString('id-ID')}.<mark>{tail}</mark></span>
                <Copy text={order.total} label="Salin Nominal" />
              </div>
              <div className="warn">⚠️ Mohon transfer <b>sampai 3 digit terakhir</b> (kode unik <b>{order.uniqueCode}</b>) agar pembayaranmu bisa dicek otomatis & lebih cepat diproses.</div>
            </div>
          </div>

          <div className="panel pay-step">
            <div className="pay-num">2</div>
            <div className="grow">
              <h3>Ke salah satu rekening berikut</h3>
              {BANKS.map((b) => (
                <div key={b.bank} className="bank-row">
                  <span className="bank-logo">{b.bank}</span>
                  <div className="grow"><b className="mono">{b.number}</b><small>a.n. {b.holder}</small></div>
                  <Copy text={b.number} />
                </div>
              ))}
            </div>
          </div>

          <div className="panel pay-step">
            <div className="pay-num">3</div>
            <div className="grow">
              <h3>Kirim bukti transfer via WhatsApp</h3>
              <p className="muted">Klik tombol di bawah, detail pesanan otomatis terisi. <b>Lampirkan foto/screenshot bukti transfer</b> lalu kirim. Pesanan diproses setelah pembayaran dikonfirmasi admin.</p>
              <a className="btn btn-wa btn-block btn-lg" href={waConfirmUrl(order)} target="_blank" rel="noreferrer">💬 Kirim Bukti Transfer ke WhatsApp</a>
              <small className="muted center-txt">WhatsApp admin: +{STORE.whatsapp}</small>
            </div>
          </div>
        </div>

        <div>
          <div className="panel summary">
            <h3>Rincian Pesanan</h3>
            <div className="sum-items">
              {order.items.map((l) => (
                <div key={l.id} className="sum-item plain"><span>{l.name} <small className="muted">x{l.qty}</small></span><b>{formatRp(l.price * l.qty)}</b></div>
              ))}
            </div>
            <div className="row-between"><span>Subtotal</span><span>{formatRp(order.subtotal)}</span></div>
            <div className="row-between"><span>Ongkos kirim</span><span>{order.shipping ? formatRp(order.shipping) : <b className="green">GRATIS</b>}</span></div>
            <div className="row-between"><span>Kode unik</span><span>{formatRp(order.uniqueCode)}</span></div>
            <div className="row-between total"><span>Total Transfer</span><b>{formatRp(order.total)}</b></div>
          </div>
          <div className="panel">
            <h3>Dikirim ke</h3>
            <p><b>{c.name}</b><br />{c.phone}{c.email && <><br />{c.email}</>}</p>
            <p className="muted">{c.address}<br />{c.city}, {c.province} {c.postal}</p>
            {c.note && <p className="muted small">Catatan: {c.note}</p>}
          </div>
          <Link href="/produk" className="btn btn-ghost btn-block">Lanjut Belanja</Link>
        </div>
      </div>
    </div>
  );
}
