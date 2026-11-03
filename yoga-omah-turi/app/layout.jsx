import './globals.css';

export const metadata = {
  title: 'Harmony of Life — Yoga di Omah Turi, Online Live & Rekaman',
  description: 'Daftar yoga di Omah Turi atau online (live maupun rekaman): pilih, isi data, transfer, dan konfirmasi via WhatsApp.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
