import './globals.css';

export const metadata = {
  title: 'YOGA OMAH TURI — Pendaftaran Online',
  description: 'Daftar kelas YOGA OMAH TURI secara online: pilih tanggal, isi data, donasi, dan konfirmasi via WhatsApp.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
      <body>{children}</body>
    </html>
  );
}
