import { imgUrl } from '../lib/image';

// Foto produk; kalau belum ada foto, tampil placeholder warna + emoji
export default function ProductImage({ product, index = 0, size = 'md' }) {
  const src = product.images?.[index];
  if (src) return <img className={`pimg pimg-${size}`} src={imgUrl(src, size === 'sm' ? 200 : 1000)} alt={product.name} loading="lazy" referrerPolicy="no-referrer" />;
  const views = ['', 'rotate(-8deg) scale(.9)', 'rotate(8deg) scale(1.1)', 'scaleX(-1)'];
  return (
    <div className={`pimg pimg-${size} pimg-ph`} style={{ '--c': product.color }} aria-label={product.name}>
      <span style={{ transform: views[index % views.length] }}>{product.emoji}</span>
    </div>
  );
}
