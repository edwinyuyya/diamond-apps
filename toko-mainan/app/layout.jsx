import './globals.css';
import Shell from '../components/Shell';
import Footer from '../components/Footer';
import { STORE } from '../lib/config';

export const metadata = {
  title: { default: `${STORE.name} – ${STORE.tagline}`, template: `%s | ${STORE.name}` },
  description: `Belanja blind box Fat Tiger, Rolife DIY miniatur & mainan koleksi original di ${STORE.name}. Kirim ke seluruh Indonesia.`,
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffd500' };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <Shell footer={<Footer />}>{children}</Shell>
      </body>
    </html>
  );
}
