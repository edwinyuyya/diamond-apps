import { imgUrl } from '../lib/image';
import { BoxMark } from './FrameTag';

// Frame template Toyzone untuk SEMUA foto produk:
// latar warna kategori + pola stud brick, panggung bayangan, pita bawah & badge logo.
// Foto asli (latar putih) otomatis menyatu dengan frame (mix-blend multiply).
// Kalau belum ada foto, isi frame memakai emoji placeholder.
export default function ProductImage({ product, index = 0, size = 'md' }) {
  const src = product.images?.[index];
  const views = ['', 'rotate(-8deg) scale(.9)', 'rotate(8deg) scale(1.1)', 'scaleX(-1)'];
  return (
    <div className={`pframe pframe-${size} ${src ? 'has-img' : ''}`} style={{ '--c': product.color }}>
      <span className="pframe-floor" />
      {src ? (
        <img className="pframe-img" src={imgUrl(src, size === 'sm' ? 240 : 1000)} alt={product.name} loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <span className="pframe-emoji" style={{ transform: views[index % views.length] }} aria-label={product.name}>{product.emoji}</span>
      )}
      {size !== 'sm' && (
        <>
          <span className="pframe-ribbon" />
          <span className="pframe-badge"><BoxMark /></span>
        </>
      )}
    </div>
  );
}
