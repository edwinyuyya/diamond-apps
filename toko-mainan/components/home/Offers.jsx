'use client';
import { useState } from 'react';
import ProductRail from './ProductRail';
import { useLang } from '../LangProvider';

// Section tosca "Penawaran Spesial" dengan tab Populer / Unggulan / Sale
export default function Offers({ groups }) {
  const { t } = useLang();
  const keys = Object.keys(groups);
  const [tab, setTab] = useState(keys[0]);
  return (
    <section className="offers">
      <div className="wrap">
        <h2 className="sec-title center">{t('home.offers')}</h2>
        <div className="tabs-lg dark">
          {keys.map((k) => <button key={k} className={k === tab ? 'on' : ''} onClick={() => setTab(k)}>{t(`home.${k}`)}</button>)}
        </div>
        <ProductRail key={tab} products={groups[tab]} />
      </div>
    </section>
  );
}
