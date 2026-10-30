import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PRODUCTS, getProduct } from '../../../lib/products';
import ProductDetail from './ProductDetail';
import ProductRail from '../../../components/home/ProductRail';

export const generateStaticParams = () => PRODUCTS.map((p) => ({ slug: p.slug }));
export const generateMetadata = ({ params }) => {
  const p = getProduct(params.slug);
  return p ? { title: p.name, description: p.description } : {};
};

export default function Page({ params }) {
  const p = getProduct(params.slug);
  if (!p) notFound();
  const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id);
  const more = [...related, ...PRODUCTS.filter((x) => x.category !== p.category && x.id !== p.id)].slice(0, 10);
  return (
    <div className="wrap pad">
      <div className="crumbs"><Link href="/">Beranda</Link><i>/</i><span>{p.name}</span></div>
      <ProductDetail product={p} />
      <h2 className="sec-title mt">Kamu Mungkin Juga Suka</h2>
      <ProductRail products={more} />
    </div>
  );
}
