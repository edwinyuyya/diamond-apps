import Link from 'next/link';
import { STORE, BANKS } from '../lib/config';
import { CATEGORIES, PRODUCTS } from '../lib/products';
import { waChatUrl } from '../lib/order';
import { IcIg, IcTiktok, IcWa } from './Icons';
import NexoraCredit from './NexoraCredit';

export default function Footer() {
  const top = [...PRODUCTS].sort((a, b) => b.sold - a.sold).slice(0, 5);
  return (
    <footer className="ftr">
      <div className="wrap ftr-grid">
        <div>
          <h4>Tentang</h4>
          <Link href="/cara-belanja">Tentang Kami</Link>
          <Link href="/cara-belanja#pembayaran">Cara Pembayaran</Link>
          <Link href="/cara-belanja#pengiriman">Pengiriman</Link>
        </div>
        <div>
          <h4>Layanan Pelanggan</h4>
          <Link href="/cara-belanja">FAQ</Link>
          <Link href="/pesanan">Cek Pesanan</Link>
          <a href={waChatUrl()} target="_blank" rel="noreferrer">Hubungi Kami</a>
        </div>
        <div className="ftr-wide">
          <h4>Terlaris</h4>
          {top.map((p) => <Link key={p.id} href={`/produk/${p.slug}`}>{p.name}</Link>)}
        </div>
        <div>
          <h4>Link Populer</h4>
          {CATEGORIES.map((c) => <Link key={c.slug} href={`/produk?kategori=${c.slug}`}>{c.name}</Link>)}
        </div>
        <div>
          <h4>Info Promo</h4>
          <p>Jadi yang pertama tahu promo eksklusif & produk terbaru kami lewat WhatsApp.</p>
          <a className="ftr-join" href={waChatUrl(`Halo ${STORE.name}, saya mau dapat info promo & produk terbaru`)} target="_blank" rel="noreferrer">
            <span>Gabung info promo via WhatsApp</span><b>›</b>
          </a>
          <h4 style={{ marginTop: 22 }}>Ikuti Kami</h4>
          <div className="social">
            <a href={STORE.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><IcIg size={20} /></a>
            <a href={STORE.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"><IcTiktok size={20} /></a>
            <a href={waChatUrl()} target="_blank" rel="noreferrer" aria-label="WhatsApp"><IcWa size={20} /></a>
          </div>
          <h4 style={{ marginTop: 22 }}>Pembayaran</h4>
          <div className="banks">{BANKS.map((b) => <span key={b.bank} className="bank-chip">{b.bank}</span>)}</div>
        </div>
      </div>
      <div className="ftr-bottom wrap">
        <span>© {new Date().getFullYear()} {STORE.name} — {STORE.slogan}. WA +{STORE.whatsapp} · {STORE.email}</span>
        <NexoraCredit />
      </div>
    </footer>
  );
}
