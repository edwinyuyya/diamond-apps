// Set ikon khas Toyzone (gaya stiker mainan: bentuk tebal, garis navy seperti logo).
// Dipakai menggantikan emoji di kotak menu beranda, menu kategori & "Belanja per Kategori".
const O = '#14213d'; // warna garis
const S = { stroke: O, strokeWidth: 5, strokeLinejoin: 'round', strokeLinecap: 'round' };
const shine = { fill: '#fff', opacity: 0.55 };

const burst = (cx, cy, r1, r2, n) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? r2 : r1, a = (Math.PI * i) / n - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
const star = (cx, cy, r, k = 0.45) => burst(cx, cy, r, r * k, 5);

const ICONS = {
  new: (
    <>
      <polygon points={burst(60, 62, 50, 39, 12)} fill="#ffd400" {...S} />
      <path d="M60 32 Q63 58 88 62 Q63 66 60 92 Q57 66 32 62 Q57 58 60 32Z" fill="#fff" {...S} strokeWidth={4} />
      <path d="M96 16 Q97 24 104 25 Q97 26 96 34 Q95 26 88 25 Q95 24 96 16Z" fill="#fff" {...S} strokeWidth={3} />
    </>
  ),
  limited: (
    <>
      <path d="M32 26 C32 52 55 55 55 60 C55 65 32 68 32 94 L88 94 C88 68 65 65 65 60 C65 55 88 52 88 26Z" fill="#e6f6ff" {...S} />
      <path d="M39 33 L81 33 C79 47 63 51 60 57 C57 51 41 47 39 33Z" fill="#ffb703" />
      <path d="M37 89 C41 77 54 74 60 70 C66 74 79 77 83 89Z" fill="#ffb703" />
      <path d="M60 57 L60 80" stroke="#ffb703" strokeWidth={3} strokeLinecap="round" />
      <path d="M38 36 C40 46 46 50 50 52" stroke="#fff" strokeWidth={4} strokeLinecap="round" fill="none" />
      <rect x="20" y="14" width="80" height="15" rx="6" fill="#c97b3d" {...S} />
      <rect x="20" y="92" width="80" height="15" rx="6" fill="#c97b3d" {...S} />
    </>
  ),
  best: (
    <>
      <path d="M36 8 L54 8 L66 50 L48 50Z" fill="#2d7ff9" {...S} />
      <path d="M84 8 L66 8 L54 50 L72 50Z" fill="#e3000b" {...S} />
      <circle cx="60" cy="76" r="32" fill="#ffd400" {...S} />
      <circle cx="60" cy="76" r="21" fill="#ffbf00" stroke={O} strokeWidth={3} />
      <polygon points={star(60, 77, 15)} fill="#fff" {...S} strokeWidth={3} />
      <path d="M38 64 Q42 54 52 50" stroke="#fff" strokeWidth={4} strokeLinecap="round" fill="none" opacity=".7" />
    </>
  ),
  exclusive: (
    <>
      <path d="M20 86 L14 40 L39 60 L60 26 L81 60 L106 40 L100 86Z" fill="#ffd400" {...S} />
      <path d="M26 78 L23 54 L38 66" stroke="#fff" strokeWidth={4} strokeLinecap="round" fill="none" opacity=".7" />
      <rect x="18" y="84" width="84" height="18" rx="5" fill="#ffad00" {...S} />
      <circle cx="14" cy="40" r="7" fill="#e3000b" {...S} strokeWidth={4} />
      <circle cx="60" cy="24" r="8" fill="#2d7ff9" {...S} strokeWidth={4} />
      <circle cx="106" cy="40" r="7" fill="#e3000b" {...S} strokeWidth={4} />
      <circle cx="40" cy="93" r="5" fill="#2d7ff9" stroke={O} strokeWidth={3} />
      <circle cx="60" cy="93" r="5" fill="#e3000b" stroke={O} strokeWidth={3} />
      <circle cx="80" cy="93" r="5" fill="#2d7ff9" stroke={O} strokeWidth={3} />
    </>
  ),
  sale: (
    <g transform="rotate(-28 60 60)">
      <path d="M34 30 L98 30 Q104 30 104 36 L104 84 Q104 90 98 90 L34 90 L12 60Z" fill="#ffd400" {...S} />
      <circle cx="30" cy="60" r="7" fill="#fff" {...S} strokeWidth={4} />
      <path d="M30 53 Q22 30 8 26" stroke={O} strokeWidth={4} fill="none" strokeLinecap="round" />
      <text x="70" y="75" textAnchor="middle" fontFamily="Fredoka, Arial, sans-serif" fontWeight="700" fontSize="44" fill="#e3000b" stroke={O} strokeWidth={2.5} paintOrder="stroke">%</text>
    </g>
  ),
  blocks: (
    <>
      {[[12, 70, 46, '#e3000b'], [62, 70, 46, '#2d7ff9'], [30, 34, 60, '#ffd400']].map(([x, y, w, c]) => (
        <g key={`${x}${y}`}>
          {[0.27, 0.73].map((k) => <rect key={k} x={x + w * k - 7} y={y - 9} width="14" height="11" rx="3" fill={c} {...S} strokeWidth={4} />)}
          <rect x={x} y={y} width={w} height="34" rx="5" fill={c} {...S} />
          <rect x={x + 6} y={y + 6} width={w * 0.35} height="5" rx="2.5" {...shine} />
        </g>
      ))}
    </>
  ),
  box: (
    <>
      <path d="M20 46 L42 28 L104 28 L82 46Z" fill="#b07cff" {...S} />
      <path d="M82 46 L104 28 L104 86 L82 104Z" fill="#6a2fc4" {...S} />
      <rect x="20" y="46" width="62" height="58" fill="#8e44ec" {...S} />
      <path d="M47 46 L47 104 M55 46 L55 104" stroke="#ffd400" strokeWidth={6} />
      <path d="M58 37 L80 28" stroke="#ffd400" strokeWidth={6} />
      <circle cx="51" cy="77" r="17" fill="#fff" {...S} strokeWidth={4} />
      <text x="51" y="87" textAnchor="middle" fontFamily="Fredoka, Arial, sans-serif" fontWeight="700" fontSize="28" fill={O}>?</text>
      <path d="M12 20 Q13 26 18 27 Q13 28 12 34 Q11 28 6 27 Q11 26 12 20Z" fill="#fff" stroke={O} strokeWidth={2.5} strokeLinejoin="round" />
    </>
  ),
  tiger: (
    <>
      {[26, 94].map((x) => <g key={x}><circle cx={x} cy="34" r="15" fill="#ff9f1c" {...S} /><circle cx={x} cy="35" r="7" fill="#ffd6a5" /></g>)}
      <ellipse cx="60" cy="66" rx="46" ry="40" fill="#ff9f1c" {...S} />
      <path d="M60 28 L60 40 M47 31 L49 41 M73 31 L71 41 M16 62 L28 65 M17 74 L28 74 M104 62 L92 65 M103 74 L92 74" stroke={O} strokeWidth={5} strokeLinecap="round" />
      <ellipse cx="60" cy="81" rx="25" ry="17" fill="#fff" {...S} strokeWidth={4} />
      <circle cx="43" cy="60" r="5.5" fill={O} /><circle cx="77" cy="60" r="5.5" fill={O} />
      <circle cx="45" cy="58" r="1.8" fill="#fff" /><circle cx="79" cy="58" r="1.8" fill="#fff" />
      <path d="M53 72 L67 72 L60 79Z" fill={O} stroke={O} strokeWidth={3} strokeLinejoin="round" />
      <path d="M60 79 Q60 86 52 86 M60 79 Q60 86 68 86" stroke={O} strokeWidth={3} fill="none" strokeLinecap="round" />
    </>
  ),
  charm: (
    <>
      <circle cx="60" cy="22" r="14" fill="none" stroke={O} strokeWidth={11} />
      <circle cx="60" cy="22" r="14" fill="none" stroke="#d5dbe5" strokeWidth={5} />
      <path d="M60 36 L60 46" stroke={O} strokeWidth={5} strokeLinecap="round" />
      <polygon points={star(60, 80, 38, 0.55)} fill="#ffd400" {...S} />
      <circle cx="49" cy="78" r="4.5" fill={O} /><circle cx="71" cy="78" r="4.5" fill={O} />
      <ellipse cx="42" cy="88" rx="5" ry="3" fill="#ff7aa2" /><ellipse cx="78" cy="88" rx="5" ry="3" fill="#ff7aa2" />
      <path d="M54 88 Q60 94 66 88" stroke={O} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <path d="M44 62 L52 58" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity=".7" />
    </>
  ),
  house: (
    <>
      <rect x="76" y="24" width="13" height="24" fill="#ff7b54" {...S} />
      <rect x="26" y="54" width="68" height="50" fill="#fff4dc" {...S} />
      <path d="M14 60 L60 20 L106 60Z" fill="#e3000b" {...S} />
      <path d="M30 52 L58 28" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity=".6" />
      <rect x="50" y="76" width="20" height="28" rx="4" fill="#9c6233" {...S} strokeWidth={4} />
      <rect x="32" y="64" width="14" height="14" rx="2" fill="#8fdcff" stroke={O} strokeWidth={3.5} />
      <rect x="74" y="64" width="14" height="14" rx="2" fill="#8fdcff" stroke={O} strokeWidth={3.5} />
    </>
  ),
  trophy: (
    <>
      <path d="M36 26 Q14 26 18 44 Q22 58 38 56 M84 26 Q106 26 102 44 Q98 58 82 56" stroke={O} strokeWidth={11} fill="none" strokeLinecap="round" />
      <path d="M36 26 Q14 26 18 44 Q22 58 38 56 M84 26 Q106 26 102 44 Q98 58 82 56" stroke="#ffbf00" strokeWidth={5} fill="none" strokeLinecap="round" />
      <path d="M34 16 L86 16 L86 42 Q86 72 60 72 Q34 72 34 42Z" fill="#ffd400" {...S} />
      <path d="M42 24 L42 42 Q42 54 50 60" stroke="#fff" strokeWidth={4} strokeLinecap="round" fill="none" opacity=".7" />
      <polygon points={star(62, 42, 13)} fill="#fff" {...S} strokeWidth={3} />
      <rect x="52" y="71" width="16" height="13" fill="#ffad00" {...S} strokeWidth={4} />
      <rect x="34" y="84" width="52" height="18" rx="4" fill="#7a4b2a" {...S} />
      <rect x="46" y="89" width="28" height="8" rx="2" fill="#ffd400" />
    </>
  ),
  bear: (
    <>
      {[30, 90].map((x) => <g key={x}><circle cx={x} cy="34" r="16" fill="#c68642" {...S} /><circle cx={x} cy="35" r="8" fill="#f1d1a5" /></g>)}
      <circle cx="60" cy="66" r="41" fill="#c68642" {...S} />
      <ellipse cx="60" cy="81" rx="21" ry="16" fill="#f1d1a5" {...S} strokeWidth={4} />
      <circle cx="45" cy="60" r="5.5" fill={O} /><circle cx="75" cy="60" r="5.5" fill={O} />
      <circle cx="47" cy="58" r="1.8" fill="#fff" /><circle cx="77" cy="58" r="1.8" fill="#fff" />
      <ellipse cx="60" cy="75" rx="7" ry="5" fill={O} />
      <path d="M60 80 Q60 87 53 87 M60 80 Q60 87 67 87" stroke={O} strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M32 54 Q36 40 48 34" stroke="#fff" strokeWidth={4} strokeLinecap="round" fill="none" opacity=".5" />
    </>
  ),
  figure: (
    <>
      <circle cx="60" cy="34" r="20" fill="#ffd9b0" {...S} />
      <path d="M40 30 Q42 12 60 12 Q78 12 80 30 Q70 22 60 24 Q50 22 40 30Z" fill={O} />
      <circle cx="53" cy="36" r="3.5" fill={O} /><circle cx="67" cy="36" r="3.5" fill={O} />
      <path d="M54 44 Q60 48 66 44" stroke={O} strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M30 104 L34 66 Q36 56 46 56 L74 56 Q84 56 86 66 L90 104Z" fill="#2d7ff9" {...S} />
      <path d="M60 60 L66 72 L80 73 L69 82 L73 96 L60 88 L47 96 L51 82 L40 73 L54 72Z" fill="#ffd400" stroke={O} strokeWidth={3} strokeLinejoin="round" />
    </>
  ),
};

// Ikon untuk kategori produk (kategori baru otomatis memakai kotak misteri)
const CAT_ICON = { 'blind-box': 'box', rolife: 'house', figure: 'figure', plush: 'bear' };
export const catIcon = (slug) => CAT_ICON[slug] || 'box';

export default function ToyIcon({ name, size, className = '' }) {
  return (
    <svg className={`toy-ico ${className}`} viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
      {ICONS[name] || ICONS.box}
    </svg>
  );
}
