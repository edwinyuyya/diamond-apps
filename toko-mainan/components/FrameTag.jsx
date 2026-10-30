import { STORE } from '../lib/config';

export function BoxMark() {
  return (
    <svg viewBox="0 0 40 52" aria-hidden="true">
      <path d="M13 6 30 14l2 8-17-8z" fill="#ffc400" stroke="#0b2d5e" strokeWidth="3" strokeLinejoin="round" />
      <path d="M4 26 20 18l16 8v17l-16 8-16-8z" fill="#ff8a00" stroke="#0b2d5e" strokeWidth="3" strokeLinejoin="round" />
      <path d="M20 18v33M4 26l16 8 16-8" fill="none" stroke="#0b2d5e" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

// Label kecil "Toyzone" di pojok frame banner
export default function FrameTag({ text = STORE.name }) {
  return <span className="bframe-tag"><BoxMark />{text}</span>;
}
