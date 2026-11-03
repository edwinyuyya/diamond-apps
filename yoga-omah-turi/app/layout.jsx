import './globals.css';

export const metadata = {
  title: 'Harmony of Life — Yoga di Omah Turi, Online Live & Rekaman',
  description: 'Daftar yoga di Omah Turi atau online (live maupun rekaman): pilih, isi data, transfer, dan konfirmasi via WhatsApp.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
      <body>{children}</body>
    </html>
  );
}
