import Link from 'next/link';
import { STORE, BANKS } from '../lib/config';
import { CATEGORIES } from '../lib/products';
import { waChatUrl } from '../lib/order';

export default function Footer() {
  return (
    <footer className="ftr">
      <div className="usp">
        <div className="wrap usp-row">
          <div><span>✅</span><b>100% Original</b><small>Produk resmi & bergaransi</small></div>
          <div><span>🚚</span><b>Kirim ke Seluruh Indonesia</b><small>Dikemas aman dengan bubble wrap</small></div>
          <div><span>🏦</span><b>Transfer Bank</b><small>BCA, Mandiri, BRI</small></div>
          <div><span>💬</span><b>Fast Response</b><small>Admin siap via WhatsApp</small></div>
        </div>
      </div>
      <div className="wrap ftr-grid">
        <div>
          <div className="logo logo-ftr"><span className="logo-mark">BT</span><span className="logo-text">{STORE.name}</span></div>
          <p className="muted">{STORE.tagline}. Melayani pengiriman ke seluruh Indonesia.</p>
          <div className="social">
            <a href={STORE.instagram} target="_blank" rel="noreferrer">Instagram</a>
            <a href={STORE.tiktok} target="_blank" rel="noreferrer">TikTok</a>
            <a href={waChatUrl()} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
        </div>
        <div>
          <h4>Kategori</h4>
          {CATEGORIES.map((c) => <Link key={c.slug} href={`/produk?kategori=${c.slug}`}>{c.name}</Link>)}
        </div>
        <div>
          <h4>Bantuan</h4>
          <Link href="/cara-belanja">Cara Belanja</Link>
          <Link href="/cara-belanja#pembayaran">Cara Pembayaran</Link>
          <Link href="/cara-belanja#pengiriman">Pengiriman</Link>
          <Link href="/pesanan">Cek Pesanan Saya</Link>
          <a href={waChatUrl()} target="_blank" rel="noreferrer">Hubungi Kami</a>
        </div>
        <div>
          <h4>Pembayaran</h4>
          <div className="banks">{BANKS.map((b) => <span key={b.bank} className="bank-chip">{b.bank}</span>)}</div>
          <h4 style={{ marginTop: 18 }}>Kontak</h4>
          <p className="muted">WA: +{STORE.whatsapp}<br />{STORE.email}<br />{STORE.address}</p>
        </div>
      </div>
      <div className="ftr-bottom">© {new Date().getFullYear()} {STORE.name}. Semua hak dilindungi.</div>
    </footer>
  );
}
