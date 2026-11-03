import Link from 'next/link';
import { STORE, BANKS } from '../lib/config';
import { waChatUrl } from '../lib/order';
import { IcIg, IcTiktok, IcWa } from './Icons';
import NexoraCredit from './NexoraCredit';
import { t as tr } from '../lib/i18n';

export default function Footer({ catalog, lang = 'id' }) {
  const t = (k, v) => tr(lang, k, v);
  const hello = waChatUrl(t('wa.default', { store: STORE.name }));
  const { products: PRODUCTS, categories: CATEGORIES } = catalog;
  const top = [...PRODUCTS].sort((a, b) => b.sold - a.sold).slice(0, 5);
  return (
    <footer className="ftr">
      <div className="wrap ftr-grid">
        <div>
          <h4>{t('ftr.about')}</h4>
          <Link href="/cara-belanja">{t('ftr.aboutUs')}</Link>
          <Link href="/cara-belanja#pembayaran">{t('ftr.howToPay')}</Link>
          <Link href="/cara-belanja#pengiriman">{t('ftr.delivery')}</Link>
        </div>
        <div>
          <h4>{t('ftr.service')}</h4>
          <Link href="/cara-belanja">{t('ftr.faq')}</Link>
          <Link href="/pesanan">{t('ftr.checkOrder')}</Link>
          <a href={hello} target="_blank" rel="noreferrer">{t('ftr.contact')}</a>
        </div>
        <div className="ftr-wide">
          <h4>{t('ftr.best')}</h4>
          {top.map((p) => <Link key={p.id} href={`/produk/${p.slug}`}>{p.name}</Link>)}
        </div>
        <div>
          <h4>{t('ftr.popular')}</h4>
          {CATEGORIES.map((c) => <Link key={c.slug} href={`/produk?kategori=${c.slug}`}>{c.name}</Link>)}
        </div>
        <div>
          <h4>{t('ftr.promo')}</h4>
          <p>{t('ftr.promoText')}</p>
          <a className="ftr-join" href={waChatUrl(t('wa.promo', { store: STORE.name }))} target="_blank" rel="noreferrer">
            <span>{t('ftr.join')}</span><b>›</b>
          </a>
          <h4 style={{ marginTop: 22 }}>{t('ftr.follow')}</h4>
          <div className="social">
            <a href={STORE.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><IcIg size={20} /></a>
            <a href={STORE.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"><IcTiktok size={20} /></a>
            <a href={hello} target="_blank" rel="noreferrer" aria-label="WhatsApp"><IcWa size={20} /></a>
          </div>
          <h4 style={{ marginTop: 22 }}>{t('ftr.payment')}</h4>
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
