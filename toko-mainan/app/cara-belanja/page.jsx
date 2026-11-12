import Link from 'next/link';
import { BANKS, SHIPPING, STORE, PAYMENT_DEADLINE_HOURS } from '../../lib/config';
import { formatRp } from '../../lib/products';
import { getLang } from '../../lib/lang-server';
import { t as tr, tHtml } from '../../lib/i18n';

export const generateMetadata = () => ({ title: tr(getLang(), 'hdr.howToShop') });

export default function Help() {
  const lang = getLang();
  const t = (k, v) => tr(lang, k, v);
  const H = ({ k, v, as: Tag = 'li' }) => <Tag dangerouslySetInnerHTML={{ __html: tHtml(lang, k, v) }} />;
  return (
    <div className="wrap pad narrow prose">
      <div className="crumbs"><Link href="/">{t('common.home')}</Link> / <span>{t('hdr.howToShop')}</span></div>
      <h1 className="page-title">{t('help.title', { store: STORE.name })}</h1>
      <ol className="howto">
        {['help.s1', 'help.s2', 'help.s3', 'help.s4', 'help.s5'].map((k) => <H key={k} k={k} />)}
      </ol>
      <h2 id="pembayaran">{t('help.payment')}</h2>
      <p>{t('help.paymentText', { hours: PAYMENT_DEADLINE_HOURS })}</p>
      <ul>{BANKS.map((b) => <li key={b.bank}><b>{b.bank}</b> {b.number} {t('pay.holder')} {b.holder}</li>)}</ul>
      <h2 id="pengiriman">{t('help.delivery')}</h2>
      <H as="p" k="help.deliveryText" v={{ flat: formatRp(SHIPPING.flat), free: formatRp(SHIPPING.freeAbove) }} />
    </div>
  );
}
