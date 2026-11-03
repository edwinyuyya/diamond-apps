'use client';
import Link from 'next/link';
import { useStore } from '../../lib/store';
import { useCatalog } from '../../components/CatalogProvider';
import ProductCard from '../../components/ProductCard';
import { IcHeart } from '../../components/Icons';
import { useLang } from '../../components/LangProvider';

export default function Wishlist() {
  const { products: PRODUCTS } = useCatalog();
  const { wish, ready } = useStore();
  const { t } = useLang();
  const list = PRODUCTS.filter((p) => wish.includes(p.id));
  if (!ready) return <div className="wrap pad">{t('common.loading')}</div>;
  return (
    <div className="wrap pad">
      <div className="crumbs"><Link href="/">{t('common.home')}</Link><i>/</i><span>Wishlist</span></div>
      <div className="cat-head"><h1>Wishlist</h1></div>
      {list.length === 0 ? (
        <div className="empty big">
          <IcHeart size={90} sw={2} className="empty-cart" />
          <h2>{t('wish.empty')}</h2>
          <p className="muted">{t('wish.emptyText')}</p>
          <Link href="/produk" className="btn-orange">{t('common.startShopping')}</Link>
        </div>
      ) : <div className="grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
    </div>
  );
}
