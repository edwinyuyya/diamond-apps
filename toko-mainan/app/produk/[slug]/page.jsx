import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalog } from '../../../lib/catalog';
import ProductDetail from './ProductDetail';
import ProductRail from '../../../components/home/ProductRail';
import { getLang } from '../../../lib/lang-server';
import { t } from '../../../lib/i18n';

export const generateMetadata = async ({ params }) => {
  const p = (await getCatalog(getLang())).products.find((x) => x.slug === params.slug);
  return p ? { title: p.name, description: p.description } : {};
};

export default async function Page({ params }) {
  const lang = getLang();
  const { products: PRODUCTS } = await getCatalog(lang);
  const p = PRODUCTS.find((x) => x.slug === params.slug);
  if (!p) notFound();
  const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id);
  const more = [...related, ...PRODUCTS.filter((x) => x.category !== p.category && x.id !== p.id)].slice(0, 10);
  return (
    <div className="wrap pad">
      <div className="crumbs"><Link href="/">{t(lang, 'common.home')}</Link><i>/</i><span>{p.name}</span></div>
      <ProductDetail product={p} />
      <h2 className="sec-title mt">{t(lang, 'common.youMayLike')}</h2>
      <ProductRail products={more} />
    </div>
  );
}
