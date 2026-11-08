# AmanLaba — Simulator Risiko Usaha

**Jangan tebak harga jual. Simulasikan risikonya.**

AmanLaba membantu pemilik usaha kecil, UMKM, dan freelancer menentukan harga
jual serta modal berdasarkan **rentang ketidakpastian**, bukan satu angka
tebakan. Empat variabel dimasukkan sebagai rentang (minimum, paling mungkin,
maksimum): harga jual per unit, biaya tetap per bulan, biaya variabel per unit,
dan permintaan per bulan.

Mesin Monte Carlo ber-seed menjalankan 10.000 iterasi lalu menampilkan peluang
rugi dan untung, rentang laba P5/P50/P95, titik impas, histogram, diagram
tornado sensitivitas, serta rekomendasi harga terbaik dan teraman. Semua hasil
dapat direproduksi dengan seed yang sama.

## Menjalankan tanpa `npm install`

Proyek ini **nol dependency** (runtime maupun development), sehingga
`npm install` tidak diperlukan. Cukup Node.js >= 18.17 (disarankan 20 LTS,
lihat `.nvmrc`):

```bash
node --version              # pastikan >= 18.17
bash scripts/cek-node.sh    # opsional: pemeriksaan versi Node dengan pesan jelas
npm start                   # http://localhost:3000
```

Tidak ada proses build. Aset HTML/CSS/JS statis disajikan apa adanya, tanpa
bundler dan tanpa permintaan ke domain eksternal.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm install` | Tidak diperlukan; boleh dijalankan dan tidak mengubah apa pun |
| `npm start` | `node backend/server.js` — server di `http://localhost:3000` |
| `npm run dev` | `node --watch backend/server.js` — restart otomatis saat file berubah |
| `npm test` | `node --test test/*.test.js` — test unit, statistik, API, statis, kontrak |
| `npm run verify` | `bash verify.sh` — test + smoke test server, mencetak "VERIFIKASI LULUS" |
| `bash scripts/cek-node.sh` | Memeriksa Node.js >= 18.17 |

Tidak ada tahap build.

## Environment variable

| Nama | Default | Fungsi |
|---|---|---|
| `PORT` | `3000` | Port HTTP; `0` berarti OS memilih port (dipakai test) |
| `HOST` | `0.0.0.0` | Alamat bind server |
| `NODE_ENV` | `development` | Informatif; nilai `test` boleh menonaktifkan log startup |

Tidak ada file `.env` yang dimuat otomatis. Set lewat shell, misalnya:

```bash
PORT=4000 HOST=127.0.0.1 npm start
```

## Struktur singkat

```
simulator/
├── backend/
│   ├── server.js                 # pembuatan server, listen, shutdown
│   ├── http/                     # rute API, rute statis, util HTTP
│   ├── engine/                   # mesin Monte Carlo murni (RNG, statistik,
│   │                             #   sensitivitas, titik impas, sapuan harga)
│   └── extensions/
│       └── panel-pelanggan-ai/   # stub, belum aktif
├── public/                       # landing, aplikasi, laporan, aset statis
│   ├── index.html                # /
│   ├── app/index.html            # /app
│   ├── laporan.html              # /laporan
│   └── assets/                   # css, js, img
├── scripts/cek-node.sh           # pemeriksaan versi Node
├── test/                         # test node:test
├── verify.sh                     # smoke test end-to-end
├── package.json
├── .nvmrc
└── README.md
```

## Endpoint API

Semua respons sukses memakai envelope `{ "data": ... }`; semua error memakai
`{ "error": { "kode", "pesan", "detail"? } }`. Body JSON maksimum 128 KB,
tanpa autentikasi, tanpa CORS (origin sama).

| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/api/health` | Status server: `{ status, nama, versi, waktu }` |
| `GET` | `/api/template` | Empat template skenario: warung makan, kafe, toko online, jasa freelance |
| `POST` | `/api/simulasi` | Analisis lengkap dari `{ skenario, opsi? }` |
| `POST` | `/api/harga` | Sapuan harga saja dari `{ skenario, opsi? }` |

Kode error: `VALIDASI_GAGAL` (400), `JSON_TIDAK_VALID` (400), `TERLALU_BESAR`
(413), `TIDAK_DITEMUKAN` (404), `METODE_TIDAK_DIIZINKAN` (405), `INTERNAL` (500).

Contoh:

```bash
curl -s -X POST http://localhost:3000/api/simulasi \
  -H 'Content-Type: application/json' \
  -d '{
    "skenario": {
      "nama": "Warung Makan Bu Sari",
      "mataUang": "IDR",
      "hargaJual": { "min": 12000, "mode": 15000, "max": 18000 },
      "biayaTetap": { "min": 3000000, "mode": 4000000, "max": 5500000 },
      "biayaVariabel": { "min": 5000, "mode": 6500, "max": 8000 },
      "permintaan": { "min": 300, "mode": 600, "max": 1000 }
    },
    "opsi": { "iterasi": 10000, "seed": 12345 }
  }'
```

Rute statis: `/` → `public/index.html`, `/app` → `public/app/index.html`,
`/laporan` → `public/laporan.html`, `/assets/...` → file statis di
`public/assets/`, dan `/favicon.ico` → `204 No Content`.

## Alur landing → aplikasi → laporan

1. **Landing `/`** — penjelasan nilai produk, fitur, template, tiga paket harga
   (Gratis/Pro/Bisnis, teks saja tanpa pembayaran), FAQ, dan CTA ke `/app`.
2. **Aplikasi `/app`** — form empat variabel rentang, iterasi, dan seed.
   Template awal dimuat otomatis dan simulasi pertama langsung dijalankan.
   Pengguna dapat mengubah input, menghitung ulang, menyimpan skenario ke
   `localStorage` (key `amanlaba:skenario:v1`, maksimal 50), memuat, dan
   menghapusnya.
3. **Laporan `/laporan?id=<id>`** — membaca skenario tersimpan dari
   `localStorage`, memanggil `POST /api/simulasi`, lalu menampilkan ringkasan,
   asumsi, grafik, dan rekomendasi siap cetak A4/PDF tanpa elemen navigasi.

Hasil simulasi selalu berasal dari API; frontend tidak menghitung ulang mesin
Monte Carlo. Data skenario hanya tersimpan di browser pengguna — server
stateless, tanpa database, akun, atau pembayaran.

## Titik ekstensi Panel Pelanggan AI

Status: **belum diimplementasikan** dan **tidak aktif**. Letaknya di
`backend/extensions/panel-pelanggan-ai/`, mengekspor `NAMA`, `VERSI`, `STATUS`,
dan `buatPanelPelangganAi()`. Modul ini tidak diimpor oleh server, tidak punya
endpoint, tidak muncul di UI, dan tidak menjalankan AI/LLM apa pun.

`nilaiHarga()` menolak dengan kode `E_BELUM_DIIMPLEMENTASIKAN`. Rencana masa
depan (penilaian harga oleh persona pelanggan sintetis yang deterministik
berdasarkan seed) didokumentasikan di `CONTRACT.md` bagian 14 dan README
ekstensi, tetapi belum menjadi fitur rilis ini.

## Catatan

AmanLaba adalah alat bantu keputusan, bukan jaminan hasil usaha atau nasihat
keuangan. Peluang bukan kepastian; hasil bergantung pada asumsi yang dimasukkan.
