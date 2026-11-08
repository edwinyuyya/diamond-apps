'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { ANNOUNCEMENTS } from '../lib/config';
import Logo from './Logo';
import { useCatalog } from './CatalogProvider';
import { useLang, LangSwitch } from './LangProvider';
import { pick, PRICE_NAMES } from '../lib/i18n';
import ToyIcon, { catIcon } from './ToyIcon';
import { IcSearch, IcHeart, IcCart, IcLeft, IcRight, IcMenu, IcClose, IcBox, IcHelp, IcStore, IcDown } from './Icons';

const SHOP_LINKS = [
  ['shop.all', '/produk'],
  ['shop.new', '/produk?tag=baru'],
  ['shop.best', '/produk?tag=terlaris'],
  ['shop.adult', '/produk?umur=18'],
  ['shop.limited', '/produk?tag=terbatas'],
  ['shop.exclusive', '/produk?tag=eksklusif'],
];
const AGE_LINKS = [['1,5+', '1.5+', '3-5'], ['6+', '6+', '6-8'], ['9+', '9+', '9-12'], ['13+', '13+', '13-17'], ['18+', '18+', '18']];
const PRICE_SLUGS = ['0-250', '250-500', '500-1000', '1000-2500', '2500'];

export default function Header() {
  const { categories: CATEGORIES } = useCatalog();
  const { count, wish, setDrawer } = useStore();
  const { lang, t } = useLang();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [ann, setAnn] = useState(0);
  const [mega, setMega] = useState(null);
  const [mobile, setMobile] = useState(false);
  const [msearch, setMsearch] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnn((a) => (a + 1) % ANNOUNCEMENTS.length), 5000);
    return () => clearTimeout(t);
  }, [ann]);

  const search = (e) => {
    e.preventDefault();
    setMobile(false); setMsearch(false);
    router.push(`/produk${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };
  const close = () => { setMega(null); setMobile(false); };
  const a = ANNOUNCEMENTS[ann];

  const SearchBox = ({ cls = '' }) => (
    <form className={`search ${cls}`} onSubmit={search}>
      <IcSearch size={18} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('hdr.search')} aria-label={t('hdr.searchLabel')} />
    </form>
  );

  return (
    <header className="hdr" onMouseLeave={() => setMega(null)}>
      <div className="topbar">
        <div className="wrap topbar-row">
          <div className="ann">
            <button onClick={() => setAnn((ann - 1 + ANNOUNCEMENTS.length) % ANNOUNCEMENTS.length)} aria-label={t('common.prev')}><IcLeft size={16} sw={2.4} /></button>
            <span key={ann}>{pick(lang, a.text)} {a.link && <Link href={a.href}>{pick(lang, a.link)}</Link>}</span>
            <button onClick={() => setAnn((ann + 1) % ANNOUNCEMENTS.length)} aria-label={t('common.next')}><IcRight size={16} sw={2.4} /></button>
          </div>
          <nav className="util">
            <Link href="/cara-belanja"><IcStore size={16} /> {t('hdr.howToShop')}</Link>
            <Link href="/pesanan"><IcBox size={16} /> {t('hdr.myOrders')}</Link>
            <Link href="/cara-belanja#pembayaran"><IcHelp size={16} /> {t('hdr.help')}</Link>
            <LangSwitch />
          </nav>
        </div>
      </div>

      <div className="mainbar">
        <div className="wrap mainbar-row">
          <button className="ico-btn burger" onClick={() => setMobile(true)} aria-label="Menu"><IcMenu size={26} /></button>
          <Logo />
          <nav className="menu">
            <button className={mega === 'shop' ? 'on' : ''} onMouseEnter={() => setMega('shop')} onClick={() => setMega(mega === 'shop' ? null : 'shop')}>{t('hdr.shop')}</button>
            <Link href="/produk?tag=eksklusif" onMouseEnter={() => setMega(null)}>{t('hdr.exclusive')}</Link>
            <button className={mega === 'cat' ? 'on' : ''} onMouseEnter={() => setMega('cat')} onClick={() => setMega(mega === 'cat' ? null : 'cat')}>{t('hdr.categories')}</button>
            <Link href="/produk?tag=diskon" className="sale" onMouseEnter={() => setMega(null)}>{t('hdr.sale')}</Link>
          </nav>
          <SearchBox cls="search-desk" />
          <div className="icons">
            <LangSwitch className="m-only lang-mini" />
            <button className="ico-btn m-only" onClick={() => setMsearch(!msearch)} aria-label={t('hdr.searchLabel')}><IcSearch size={24} /></button>
            <Link href="/wishlist" className="ico-btn" aria-label="Wishlist"><IcHeart size={24} />{wish.length > 0 && <i className="count">{wish.length}</i>}</Link>
            <button className="ico-btn" onClick={() => setDrawer(true)} aria-label={t('hdr.cart')}><IcCart size={24} />{count > 0 && <i className="count">{count}</i>}</button>
          </div>
        </div>
        {msearch && <div className="wrap msearch"><SearchBox /></div>}
      </div>

      {mega && (
        <div className="mega">
          <div className="wrap">
            {mega === 'shop' ? (
              <div className="mega-cols">
                <div>
                  <h4>{t('hdr.shopH')}</h4>
                  {SHOP_LINKS.map(([l, h]) => <Link key={h} href={h} onClick={close}>{t(l)}</Link>)}
                </div>
                <div>
                  <h4>{t('hdr.age')}</h4>
                  {AGE_LINKS.map(([id, en, s]) => <Link key={s} href={`/produk?umur=${s}`} onClick={close}>{lang === 'en' ? en : id} {t('common.years')}</Link>)}
                </div>
                <div>
                  <h4>{t('hdr.price')}</h4>
                  {PRICE_SLUGS.map((s) => <Link key={s} href={`/produk?harga=${s}`} onClick={close}>{pick(lang, PRICE_NAMES[s])}</Link>)}
                </div>
              </div>
            ) : (
              <div className="mega-cats">
                {CATEGORIES.map((c) => (
                  <Link key={c.slug} href={`/produk?kategori=${c.slug}`} onClick={close} className="mega-cat">
                    <span style={{ background: c.color }}><ToyIcon name={catIcon(c.slug)} /></span>{c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {mobile && (
        <div className="overlay" onClick={() => setMobile(false)}>
          <aside className="mnav" onClick={(e) => e.stopPropagation()}>
            <div className="mnav-top"><Logo /><button className="ico-btn" onClick={() => setMobile(false)} aria-label={t('common.close')}><IcClose /></button></div>
            <details open><summary>{t('hdr.shop')} <IcDown size={18} /></summary>{SHOP_LINKS.map(([l, h]) => <Link key={h} href={h} onClick={close}>{t(l)}</Link>)}</details>
            <Link className="mnav-link" href="/produk?tag=eksklusif" onClick={close}>{t('hdr.exclusive')}</Link>
            <details><summary>{t('hdr.categories')} <IcDown size={18} /></summary>{CATEGORIES.map((c) => <Link key={c.slug} href={`/produk?kategori=${c.slug}`} onClick={close} className="mnav-cat"><ToyIcon name={catIcon(c.slug)} size={26} /> {c.name}</Link>)}</details>
            <Link className="mnav-link sale-txt" href="/produk?tag=diskon" onClick={close}>{t('hdr.sale')}</Link>
            <div className="mnav-util">
              <Link href="/pesanan" onClick={close}><IcBox size={18} /> {t('hdr.myOrders')}</Link>
              <Link href="/wishlist" onClick={close}><IcHeart size={18} /> Wishlist</Link>
              <Link href="/cara-belanja" onClick={close}><IcHelp size={18} /> {t('hdr.howToShop')}</Link>
              <div className="mnav-lang"><span>🌐 {t('hdr.language')}</span><LangSwitch /></div>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
