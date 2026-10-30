# Toyzone — Your Happiness World

Toko online action figure & mainan. Developed by **Nexora** (08131888116).

Website toko action figure & mainan (Next.js 14). Pembayaran **transfer manual + konfirmasi WhatsApp**.

## Alur belanja
1. Pembeli pilih produk → keranjang (side cart) → **Checkout**
2. Isi nama, **no. WhatsApp/HP**, **alamat lengkap**, kota, provinsi, kode pos
3. Halaman **Pembayaran**: nomor pesanan, total + **kode unik 3 digit**, daftar rekening (tombol salin), hitung mundur 24 jam
4. Tombol **"Kirim Bukti Transfer ke WhatsApp"**: membuka chat WA admin dengan detail pesanan & alamat sudah terisi; pembeli tinggal lampirkan foto bukti transfer

## Yang perlu kamu ubah
| File | Isi |
|---|---|
| `lib/config.js` | Nama toko, logo, **nomor WhatsApp admin**, **rekening bank**, ongkir, teks pengumuman |
| `lib/products.js` | Daftar produk, harga, stok, kategori |
| `public/produk/` | Foto produk dari Google Drive (dikompres ke .webp), lalu isi `images: ['/produk/<slug>/01.webp']` di products.js. Bisa juga langsung paste link share Google Drive. |
| `components/home/HeroSlider.jsx` | Teks/gambar banner beranda |

## Jalankan lokal
```bash
npm install
npm run dev
```

## Deploy ke Vercel
Import repo ini → **Root Directory: `toko-mainan`** → Deploy.

## (Opsional) Simpan pesanan ke database
Tanpa database pun pesanan tetap jalan (detail masuk ke WhatsApp admin). Kalau mau tercatat:
1. Jalankan `schema.sql` di Supabase SQL Editor
2. Isi env `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` di Vercel
3. Pesanan bisa dilihat di Supabase → Table Editor → `orders`
