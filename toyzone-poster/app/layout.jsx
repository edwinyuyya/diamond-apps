import './globals.css';

export const metadata = {
  title: 'Toyzone Poster',
  description: 'Konten & posting Instagram otomatis untuk Toyzone',
  robots: { index: false, follow: false },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffd400' };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
