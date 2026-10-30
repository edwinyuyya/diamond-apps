'use client';
import { useState } from 'react';
import ProductRail from './ProductRail';

// Section tosca "Penawaran Spesial" dengan tab Populer / Unggulan / Sale
export default function Offers({ groups }) {
  const keys = Object.keys(groups);
  const [tab, setTab] = useState(keys[0]);
  return (
    <section className="offers">
      <div className="wrap">
        <h2 className="sec-title center">Penawaran Spesial</h2>
        <div className="tabs-lg dark">
          {keys.map((k) => <button key={k} className={k === tab ? 'on' : ''} onClick={() => setTab(k)}>{k}</button>)}
        </div>
        <ProductRail key={tab} products={groups[tab]} />
      </div>
    </section>
  );
}
