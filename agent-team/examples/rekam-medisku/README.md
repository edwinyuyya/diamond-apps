# Rekam Medisku — Rekam Medis Pribadi

Aplikasi web kesehatan pribadi berbahasa Indonesia: profil, riwayat kunjungan, obat + jadwal
minum, tanda vital, hasil lab, ringkasan untuk dokter, kartu darurat ber-QR, serta pemindaian
resep/etiket dan rekam medis dengan **OCR lokal**. Semua data tersimpan di perangkat. Tanpa akun,
tanpa cloud, tanpa pelacak, dan tanpa request eksternal saat runtime.

## Prasyarat

- **Node.js ≥ 20** (dipakai untuk `node:test`, `fetch`, dan Web Crypto pada pengujian).
- npm — hanya untuk memasang paket OCR yang akan **di-vendor**; aplikasi di browser tidak memuat
  apa pun dari `node_modules`.
- Browser modern dengan IndexedDB, Web Crypto, WebAssembly, Worker, dan service worker.
  `http://localhost` dianggap secure context.

## Instalasi & menjalankan

```bash
npm install          # memasang paket OCR untuk vendoring
npm run vendor:ocr   # menyalin Tesseract.js + WASM + data ind/eng ke public/vendor
npm start            # menjalankan server statis
```

Buka `http://127.0.0.1:3000` (atau `http://localhost:3000`). Tidak ada langkah build.

`npm install && npm run vendor:ocr` cukup dijalankan sekali. Jalankan ulang `vendor:ocr` setelah
memperbarui paket atau bila folder `public/vendor` hilang. Tanpa aset vendor, jalur foto OCR tidak
tersedia, tetapi jalur **Ketik/Tempel teks** tetap berfungsi.

## Perintah

| Perintah | Kegunaan |
|----------|----------|
| `npm install` | Memasang devDependency OCR (hanya untuk vendoring). |
| `npm run vendor:ocr` | Menyalin Tesseract.js, core WASM, dan data bahasa `ind`/`eng` ke `public/vendor/`. |
| `npm start` | Menjalankan `node server.js` di port 3000. |
| `npm test` | Menjalankan seluruh test `node:test` (`tests/*.test.js`). Tanpa jaringan. |
| `npm run verify` / `bash verify.sh` | Test + smoke test server + pemeriksaan kelengkapan vendor. |

`npm test` tidak mengimpor Tesseract dan tidak membutuhkan jaringan. `verify.sh` memerlukan
`public/vendor/manifest.json` beserta berkas entry-nya; bila belum ada, jalankan
`npm install && npm run vendor:ocr` lebih dulu.

## Konfigurasi

| Variabel | Default | Arti |
|----------|---------|------|
| `PORT` | `3000` | Port HTTP. `0` memilih port ephemeral (untuk test). |
| `HOST` | `127.0.0.1` | Alamat bind. |
| `VENDOR_DIR` | `<repo>/public/vendor` | Direktori aset OCR yang disajikan di `/vendor/`. |

Server hanya menyajikan berkas statis dan `GET /health`. Mengubah `HOST` ke `0.0.0.0` membuat
aplikasi dapat diakses perangkat lain di jaringan yang sama — lakukan hanya bila paham risikonya.

## Struktur

```text
.
├── server.js                  # server statis Node (app/ di /, vendor/ di /vendor/, /health)
├── package.json
├── scripts/vendor-ocr.mjs     # penyalin aset OCR ke public/vendor
├── public/vendor/             # aset OCR same-origin (dihasilkan npm run vendor:ocr)
├── app/
│   ├── index.html             # shell SPA
│   ├── manifest.webmanifest   # manifest PWA
│   ├── sw.js                  # service worker (app shell + cache vendor runtime)
│   ├── icons/icon.svg
│   ├── css/                   # style.css, print.css
│   └── js/
│       ├── app.js, dom.js     # shell/router & helper DOM
│       ├── model.js, storage.js, state.js, crypto.js, backup.js, qr.js
│       ├── photos.js, scanSession.js
│       ├── ocr/               # adaptor.js, tesseractEngine.js
│       ├── logic/             # tanggal, jadwal, stok, kepatuhan, safety, vital,
│       │                      # ringkasan, parser resep, parser rekam medis/lab
│       └── ui/                # layar-layar aplikasi
└── tests/                     # node:test (format glob: tests/*.test.js)
```

## Privasi & offline

- Tidak ada akun, cloud, analytics, telemetri, font/CDN eksternal, atau layanan OCR/AI eksternal.
- Server **tidak memiliki endpoint data medis** dan tidak mencatat isi permintaan. Data hanya ada di
  IndexedDB/localStorage perangkat.
- Enkripsi opsional: vault disegel AES-GCM-256 dengan kunci turunan PBKDF2-SHA256 (310.000 iterasi).
  Kunci hanya ada di memori selama sesi terbuka; lupa kata sandi berarti data tidak dapat dipulihkan.
- Setelah dibuka sekali, service worker menyimpan app shell sehingga aplikasi tetap jalan offline.
  Aset OCR di `/vendor/` di-cache **saat pertama dipakai** (bukan saat install); permintaan
  `/vendor/` selalu same-origin.
- OCR berjalan 100% di browser memakai berkas WASM + data bahasa dari `/vendor/`.

## Batas keselamatan

- Rekam Medisku **bukan alat medis**. Aplikasi tidak mendiagnosis, tidak menyarankan/mengubah dosis, dan
  tidak memeriksa interaksi obat.
- Pemeriksaan otomatis bersifat deterministik dan transparan: pembandingan teks bahan aktif, nilai
  di luar rentang acuan yang diatur pengguna/dokter, serta aritmetika jadwal/stok/kepatuhan.
- Hasil OCR, terjemahan resep, dan parser rekam medis hanyalah **draf** dan bisa salah, terutama
  tulisan tangan. Kesalahan membaca dosis bisa berbahaya. Tidak ada data yang disimpan sebelum
  pengguna menyunting dan mencentang pernyataan pencocokan dengan dokumen asli.
- Selalu cocokkan dengan apoteker atau dokter. Dalam darurat, hubungi **112** atau **119**.

## Cadangan & foto sumber

- Ekspor `.rawatku.json` memuat vault (termasuk lampiran) dan dapat dilindungi kata sandi.
- **Foto sumber OCR tidak ikut cadangan JSON v1.** Foto disimpan terpisah di IndexedDB
  (`rawatku-photos`), dienkripsi bila kata sandi aktif, dan tidak dipulihkan oleh impor cadangan.
  Jumlah foto yang tidak ikut dilaporkan lewat `meta.photoCount`; UI menjelaskan batasan ini.
- Ekspor cadangan secara berkala adalah jalur pemulihan utama bila data perangkat hilang atau
  penyimpanan browser dibersihkan.
