import { Suspense } from 'react';
import Catalog from './Catalog';

import { getLang } from '../../lib/lang-server';
import { t } from '../../lib/i18n';

export const generateMetadata = () => ({ title: t(getLang(), 'common.allProducts') });

export default function Page() {
  return <Suspense fallback={<div className="wrap pad">…</div>}><Catalog /></Suspense>;
}
