import './globals.css';
import Shell from '../components/Shell';
import Footer from '../components/Footer';
import { STORE } from '../lib/config';
import { getCatalog } from '../lib/catalog';

export const metadata = {
  title: { default: `${STORE.name} – ${STORE.tagline}`, template: `%s | ${STORE.name}` },
  description: `Belanja blind box Fat Tiger, Rolife DIY miniatur & mainan koleksi original di ${STORE.name}. Kirim ke seluruh Indonesia.`,
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffd500' };

export default async function RootLayout({ children }) {
  const catalog = await getCatalog();
  return (
    <html lang="id">
      <body>
        <Shell catalog={catalog} footer={<Footer catalog={catalog} />}>{children}</Shell>
      </body>
    </html>
  );
}
