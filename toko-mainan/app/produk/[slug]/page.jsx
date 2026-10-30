import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PRODUCTS, getProduct, getCategory } from '../../../lib/products';
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
  const cat = getCategory(p.category);
  const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id);
  const more = related.length >= 4 ? related : [...related, ...PRODUCTS.filter((x) => x.category !== p.category && x.id !== p.id)].slice(0, 8);
  return (
    <>
      <div className="wrap pad">
        <div className="crumbs">
          <Link href="/">Beranda</Link> / <Link href={`/produk?kategori=${cat.slug}`}>{cat.name}</Link> / <span>{p.name}</span>
        </div>
        <ProductDetail product={p} />
      </div>
      <ProductRail title="Kamu Mungkin Juga Suka" products={more} />
    </>
  );
}
