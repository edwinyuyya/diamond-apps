# DIAMOND WEDDING CAR · Brand Identity Kit

**Luxury Wedding Transportation**: *Arrive in Elegance, Remember Forever.*

Logo resmi dan panduan identitas brand untuk DIAMOND WEDDING CAR, satu keluarga dengan Diamond Makeup Artist.

Buka **`index.html`** di browser untuk melihat panduan brand lengkap: identitas, logo, warna, tipografi, paket layanan, penerapan, dan ekosistem DIAMOND.

## Isi folder

| Folder / file | Isi |
| --- | --- |
| `index.html` | Panduan brand (brand guideline) |
| `logo/` | Logo SVG. Teks sudah dikonversi menjadi outline, aman untuk percetakan, sticker cutting, dan bordir |
| `png/` | Ekspor PNG resolusi tinggi (latar transparan untuk versi tanpa latar) |
| `templates/instagram-campaign.html` | Poster campaign *YOUR WEDDING, YOUR DIAMOND MOMENT* (1080×1350) |
| `assets/brand.css` | Token warna dan font |
| `fonts/` | Cinzel, Cormorant Garamond, Montserrat (SIL Open Font License) |
| `tools/` | Generator logo dan ekspor PNG |

### Logo mana untuk apa

| File | Pemakaian |
| --- | --- |
| `diamond-logo-primary-emerald` | Logo utama, semua media |
| `diamond-logo-primary-ivory` / `-transparent` | Dokumen, invoice, latar terang |
| `diamond-logo-primary-black` | Alternatif hitam premium |
| `diamond-logo-primary-reverse` | Di atas foto gelap atau latar emerald (transparan) |
| `diamond-logo-horizontal-*` | Header website, kop surat, spanduk |
| `diamond-logo-gold-mono` | Sticker pintu mobil, bordir, hot stamp |
| `diamond-logo-white-mono` | Sticker kaca, sablon |
| `diamond-monogram-*` | Foto profil Instagram/WhatsApp, stempel |
| `diamond-symbol-*` | Favicon, watermark foto, bordir seragam |
| `diamond-plate-brand` | Plat nama mobil sehari-hari |
| `diamond-plate-couple` | Template plat nama pengantin (ganti “Nama & Nama”) |

## Warna

| Nama | HEX | Peran |
| --- | --- | --- |
| Emerald | `#10392E` | Warna utama |
| Champagne | `#C6A15B` | Aksen emas, logo |
| Ivory | `#F5F0E6` | Latar terang, teks di atas emerald |
| Charcoal | `#242424` | Teks badan, seragam |

## Membuat ulang logo / PNG

```bash
cd diamond-wedding-car/tools
npm install
node build-logo.mjs     # menulis logo/*.svg
node export-png.mjs     # menulis png/*.png (butuh Playwright + Chromium)
```

Untuk plat nama pengantin, ubah teks `'Nama & Nama'` di `tools/build-logo.mjs`, lalu jalankan ulang kedua perintah di atas.

## Yang masih perlu dilengkapi

- Nomor WhatsApp asli (kartu nama di panduan masih memakai `08xx-xxxx-xxxx`).
- Cek ketersediaan username Instagram: `@diamond.weddingcar`, `@diamondweddingcar.id`, `@diamond.wedding`.
- Harga paket Diamond Signature, Prestige, dan Royal.
- Proof cetak warna Champagne Gold dari percetakan dan vendor sticker.
