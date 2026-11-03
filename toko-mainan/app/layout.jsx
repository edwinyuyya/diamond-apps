import './globals.css';
import Shell from '../components/Shell';
import Footer from '../components/Footer';
import { STORE } from '../lib/config';
import { getCatalog } from '../lib/catalog';
import { getLang } from '../lib/lang-server';
import { t } from '../lib/i18n';

// Katalog dibaca saat halaman dibuka (bukan saat build), supaya perubahan dari /admin langsung tampil
export const dynamic = 'force-dynamic';

export function generateMetadata() {
  const lang = getLang();
  return {
    title: { default: `${STORE.name} – ${t(lang, 'meta.tagline')}`, template: `%s | ${STORE.name}` },
    description: t(lang, 'meta.desc', { store: STORE.name }),
  };
}

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffd500' };

export default async function RootLayout({ children }) {
  const lang = getLang();
  const catalog = await getCatalog(lang);
  return (
    <html lang={lang}>
      <body>
        <Shell lang={lang} catalog={catalog} footer={<Footer catalog={catalog} lang={lang} />}>{children}</Shell>
      </body>
    </html>
  );
}
