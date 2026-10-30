import Link from 'next/link';
import { BANKS, SHIPPING, STORE, PAYMENT_DEADLINE_HOURS } from '../../lib/config';
import { formatRp } from '../../lib/products';

export const metadata = { title: 'Cara Belanja' };

export default function Help() {
  return (
    <div className="wrap pad narrow prose">
      <div className="crumbs"><Link href="/">Beranda</Link> / <span>Cara Belanja</span></div>
      <h1 className="page-title">Cara Belanja di {STORE.name}</h1>
      <ol className="howto">
        <li><b>Pilih produk</b> lalu klik <i>+ Keranjang</i> atau <i>Beli Sekarang</i>.</li>
        <li><b>Checkout</b>: isi nama penerima, nomor WhatsApp/HP yang bisa dihubungi, dan alamat lengkap.</li>
        <li><b>Transfer</b> sesuai total yang tertera <b>termasuk 3 digit kode unik</b> ke salah satu rekening kami.</li>
        <li><b>Kirim bukti transfer</b> lewat tombol WhatsApp di halaman pembayaran.</li>
        <li>Admin mengonfirmasi pembayaran dan <b>pesanan dikirim</b>. Nomor resi dikirim via WhatsApp.</li>
      </ol>
      <h2 id="pembayaran">Pembayaran</h2>
      <p>Saat ini pembayaran melalui transfer bank manual. Batas pembayaran {PAYMENT_DEADLINE_HOURS} jam setelah pesanan dibuat.</p>
      <ul>{BANKS.map((b) => <li key={b.bank}><b>{b.bank}</b> {b.number} a.n. {b.holder}</li>)}</ul>
      <h2 id="pengiriman">Pengiriman</h2>
      <p>Ongkos kirim flat {formatRp(SHIPPING.flat)} ke seluruh Indonesia, <b>GRATIS</b> untuk belanja di atas {formatRp(SHIPPING.freeAbove)}. Pesanan dikirim 1×24 jam hari kerja setelah pembayaran terkonfirmasi.</p>
    </div>
  );
}
