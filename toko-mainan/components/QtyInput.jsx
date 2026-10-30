'use client';
export default function QtyInput({ value, max = 99, onChange, small }) {
  return (
    <div className={`qty ${small ? 'qty-sm' : ''}`}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1}>−</button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
    </div>
  );
}
