# REPORT — AmanLaba (Simulator Risiko Usaha)

Tanggal review: 8 November 2026
Ruang lingkup: membandingkan implementasi dengan `SPEC.md` dan `CONTRACT.md`, memeriksa
masalah keamanan dasar (injection, secret hardcoded, validasi input), serta menuliskan
hasil verifikasi. **Tidak ada kode aplikasi yang diubah** dalam proses review ini.

---

## 1. Ringkasan

AmanLaba adalah aplikasi web berbahasa Indonesia untuk mensimulasikan risiko harga jual
dan modal UMKM memakai Monte Carlo ber-seed. Implementasi sudah **lengkap terhadap
14 fitur MVP** di `SPEC.md` dan **seluruh kontrak teknis** di `CONTRACT.md` (rute API,
bentuk data, ID DOM, token desain, grafik SVG, laporan cetak, dan stub ekstensi AI).

Hasil verifikasi yang dijalankan ulang saat review:

| Pemeriksaan | Hasil |
|---|---|
| `npm test` | **43 test lulus, 0 gagal** |
| `bash verify.sh` | **LULUS** — mencetak `VERIFIKASI LULUS` |
| Halaman `/`, `/app`, `/laporan` | HTTP 200, `text/html` |
| `/api/health`, `/api/template` | 200, envelope `{ data }` valid, 4 template sesuai urutan |
| Kinerja mesin | 10.000 iterasi + sapuan 21 × 1.500 titik ≈ **20 ms** (di mesin review) |
| Dependency npm | **0** (runtime dan development) |
| Request jaringan eksternal | **0** (hanya aset same-origin) |

Kesimpulan singkat: **siap sebagai MVP demo lokal**. Tidak ditemukan celah injection,
secret hardcoded, atau kebocoran stack trace. Temuan utama bersifat minor/robustness dan
satu celah cakupan QA: perilaku browser (console error, localStorage, cetak A4, responsif)
belum diuji otomatis.

---

## 2. Cara Menjalankan

Prasyarat: Node.js ≥ 18.17 (disarankan 20 LTS, sesuai `.nvmrc`), `npm`, dan `curl`
(untuk `verify.sh`). **Tidak perlu `npm install`** karena nol dependency.

```bash
# dari root proyek
node --version              # pastikan >= 18.17
npm start                   # server di http://localhost:3000
```

Perintah lain:

```bash
npm test                    # node --test test/*.test.js
npm run verify              # bash verify.sh (test + smoke test server port 3456)
npm run dev                 # node --watch backend/server.js
bash scripts/cek-node.sh    # cek versi Node dengan pesan jelas
```

Konfigurasi lewat environment variable (tanpa file `.env`):

```bash
PORT=4000 HOST=127.0.0.1 npm start
```

| Variabel | Default | Fungsi |
|---|---|---|
| `PORT` | `3000` | Port HTTP; `0` = OS memilih port (dipakai test) |
| `HOST` | `0.0.0.0` | Alamat bind |
| `NODE_ENV` | `development` | `test` menonaktifkan log startup |

Alur pakai: buka `/` → klik **Coba Simulator Gratis** → `/app` otomatis memuat template
Warung Makan dan menjalankan simulasi. Simpan skenario lalu buka `/laporan?id=<id>` dan
tekan **Cetak / Simpan PDF**.

---

## 3. Status Fitur terhadap SPEC

| ID | Fitur | Status | Bukti / catatan |
|---|---|---|---|
| F-01 | Landing `/` | ✅ Selesai | Header lengket, hero (H1 & subjudul persis), 6 kartu fitur, 4 template, 3 paket, 6 FAQ, CTA, footer; diuji di `statis.test.js` |
| F-02 | Aplikasi `/app` | ✅ Selesai | Form 4 variabel rentang, iterasi, seed, tombol hitung; dua kolom desktop / satu kolom mobile |
| F-03 | Input rentang | ✅ Selesai | Label permintaan menyebut "pada harga paling mungkin"; validasi klien (`form.js`) dan server (`validasi.js`) konsisten |
| F-04 | Mesin Monte Carlo | ✅ Selesai | mulberry32 ber-seed, urutan draw tetap, fungsi murni; determinisme diuji |
| F-05 | Ringkasan hasil | ✅ Selesai | Peluang rugi/untung, P5/P50/P95, rata-rata, min/max, deviasi; format Rupiah `id-ID` |
| F-06 | Titik impas | ✅ Selesai | Dari nilai mode; margin ≤ 0 mengembalikan `valid:false` + catatan jelas |
| F-07 | Histogram | ✅ Selesai | 30 bin (1 bin bila semua laba sama), batang rugi/untung dibedakan, SVG murni |
| F-08 | Tornado | ✅ Selesai | 4 faktor diurutkan `dampak` menurun, garis nol di tengah |
| F-09 | Pencari harga | ✅ Selesai | Sapuan 21 titik (atau sesuai opsi), `terbaik` + `teraman` + alasan; trade-off respons linear terbukti (keduanya < harga maksimum) |
| F-10 | Template | ✅ Selesai | 4 template persis `CONTRACT.md §7`, dapat dimuat dan langsung dihitung |
| F-11 | Penyimpanan lokal | ✅ Selesai | Key `amanlaba:skenario:v1`, maks 50, simpan/muat/hapus; data rusak ditangani tanpa menimpa otomatis |
| F-12 | Laporan cetak | ✅ Selesai | `/laporan?id=…`, metadata, metrik, asumsi, 3 grafik, rekomendasi, kesimpulan, disclaimer, tombol cetak; `@media print` A4 ada |
| F-13 | Paket harga | ✅ Selesai | Gratis/Pro/Bisnis teks saja; tombol Pro/Bisnis `data-demo="true"` menampilkan "Versi demo: pembayaran belum tersedia." |
| F-14 | Stub Panel Pelanggan AI | ✅ Sesuai (stub) | `backend/extensions/panel-pelanggan-ai/`, status `belum-diimplementasikan`, `E_BELUM_DIIMPLEMENTASIKAN`, **tidak diimpor server / tidak dirutekan** |

Fitur di luar daftar MVP (login, database, pembayaran sungguhan, AI/LLM, unggah file,
API publik, perbandingan antar-skenario) **tidak ada** — sesuai batasan SPEC.

### Kriteria rilis SPEC §13

1–7, 9–10 terverifikasi lewat test/smoke. Butir **8 (laporan cetak rapi)**, **11 (tanpa
error console)**, dan **12 (responsif 360/768/1280 px)** baru dibuktikan lewat kode CSS
dan markup, **belum** lewat browser sungguhan (lihat Temuan T-2).

---

## 4. Temuan dan Risiko

### Keamanan dasar — tidak ditemukan masalah serius

- **Injection/XSS**: tidak ada `innerHTML`, `insertAdjacentHTML`, `eval`, atau
  `new Function` di `public/`. Semua teks dinamis memakai `textContent`, elemen dibuat
  via `document.createElement`, dan SVG via `createElementNS`. Nama skenario dari
  `localStorage` maupun API tidak pernah disisipkan sebagai HTML.
- **Secret hardcoded**: tidak ada API key, password, token, atau kredensial di repo.
  Tidak ada file `.env`.
- **Validasi input server**: `validasi.js` memeriksa tipe finite, batas `0…1e12`,
  `min ≤ mode ≤ max`, `hargaJual.min > 0`, iterasi `1000–50000`, seed `0–2147483647`,
  dan `sapuanHarga` lengkap (`min/max/langkah`). Body dibatasi 128 KB (`util-http.js`).
- **Path traversal**: `rute-statis.js` men-decode sekali, menolak segmen `..`, NUL,
  backslash, dan memverifikasi `path.relative` agar hasil resolve tetap di dalam
  `public/`; ekstensi dibatasi whitelist. Diuji di `api.test.js`.
- **Kebocoran error**: respons 500 hanya `INTERNAL` generik; stack trace tidak dikirim.
- **Request eksternal**: nol; font sistem, tanpa CDN/analytics.
- **Dependency**: nol; tidak ada supply-chain npm.

### T-1 (Rendah) — Pembulatan rentang sapuan harga bisa melanggar batas yang sudah divalidasi

`validasi.js` memeriksa `sapuanHarga.min > 0` dan `max > min`, tetapi
`normalisasiOpsi()` (`validasi.js:271–276`) baru membulatkan `min`/`max` **setelah**
validasi. Akibatnya input pecahan yang sah secara pra-pembulatan dapat menjadi tidak sah
pasca-pembulatan:

```
opsi.sapuanHarga = { min: 0.4, max: 1.1, langkah: 5 }
→ setelah Math.round: { min: 0, max: 1, langkah: 5 }   // min = 0, melanggar "min > 0"
```

Kasus serupa: `min: 1.1, max: 1.4` → `{1, 1}` sehingga `max > min` tidak lagi terpenuhi
(sapuan menjadi harga konstan, tidak error). Dampak nyata kecil karena UI hanya mengirim
rentang bilangan bulat, tetapi kontrak `§3.9/§4.3` menyatakan rentang dibulatkan
**sebelum** dipakai. Saran: bulatkan lebih dulu, lalu validasi ulang
`min > 0` dan `max > min` terhadap nilai hasil pembulatan.

### T-2 (Sedang, cakupan QA) — Perilaku browser belum diuji otomatis

Test yang ada menguji mesin, API, statis, dan kontrak, tetapi **tidak menjalankan
JavaScript halaman di browser**. Karena itu, kriteria rilis berikut belum punya bukti
otomatis:

- tidak ada error console di `/`, `/app`, `/laporan`;
- simpan/muat/hapus skenario benar-benar bertahan setelah refresh (batas 50);
- tata letak benar pada 360/768/1280 px tanpa scroll horizontal;
- hasil cetak A4 tidak terpotong dan menyembunyikan tombol/nav;
- query `?cetak=1` memicu `window.print()` satu kali.

Kode CSS/markup untuk semua hal di atas sudah ada (breakpoint 960/640 px,
`@media print`, `@page A4`, `break-inside: avoid`, `prefers-reduced-motion`), tetapi
belum diverifikasi secara empiris. Ini adalah **gap penerimaan rilis**, bukan bug yang
diketahui.

### T-3 (Rendah) — `.gitignore` tidak sesuai catatan devops

`NOTES.md` bagian t4 menyatakan `.gitignore` mencakup `node_modules/`, `.env`, log, dan
artefak lokal. Kenyataannya `.gitignore` hanya berisi:

```
node_modules/
.team/
```

Tidak berdampak pada fungsi (tidak ada `.env` di repo), tetapi `.env` dan file log bisa
tidak sengaja ter-commit di kemudian hari. Saran: tambahkan entri `.env`, `*.log`,
`*.tmp`, dan artefak lokal lain.

### T-4 (Rendah/Informasional) — Endpoint komputasi tanpa pembatasan laju, header keamanan minimal

Sesuai kontrak, server stateless, tanpa autentikasi dan tanpa CORS. Satu request
`POST /api/simulasi` maksimum menjalankan ~50.000 iterasi utama + 21 × 1.500 iterasi
sapuan (±81.500 sampel). Pada mesin review ini hanya ~20 ms, tetapi bila aplikasi
dipublikasikan ke internet, endpoint ini bisa dipakai untuk pembebanan CPU berulang.
Header yang ada baru `X-Content-Type-Options: nosniff` dan `Cache-Control: no-store`;
belum ada CSP, `X-Frame-Options`/`frame-ancestors`, atau `Referrer-Policy`.
Saran: bila diekspos publik, tambahkan rate limit/reverse proxy dan CSP ketat
(mudah karena nol aset eksternal).

### T-5 (Rendah/Informasional) — Catatan kecil lain

- **Default nama skenario hanya di frontend.** `CONTRACT.md §4.2` menyebut default
  `"Skenario Tanpa Nama"`; API tidak menerapkannya (engine tidak memakai `nama`,
  frontend sudah mengisi default), jadi tidak ada dampak terlihat.
- **File statis mengikuti symlink.** Bila penyerang bisa menulis symlink di
  `public/assets/`, `fs.readFile` akan membacanya. Tidak relevan pada deployment normal
  (tidak ada unggahan file), tetapi layak diingat bila folder aset menjadi writable.
- **Baca body saat melebihi batas.** `bacaBodyJson` menolak dengan 413 dan memanggil
  `req.resume()` hanya saat `Content-Length` diketahui; pada request chunked yang
  melewati batas, sisa body tidak dikuras. Berdampak minimal pada satu koneksi.
- **Nama merek "AmanLaba" belum dicek sebagai merek dagang** (risiko yang sudah
  didokumentasikan di SPEC §14).

---

## 5. Saran Langkah Berikutnya

1. **Verifikasi browser manual/terarah** (prioritas): checklist singkat untuk
   `/`, `/app`, `/laporan` — console bersih, alur simpan→refresh→muat→hapus, tombol
   laporan, `?cetak=1`, dan screenshot pada 360/768/1280 px serta preview cetak A4.
   Jika nanti diperbolehkan menambah tooling, pertimbangkan smoke test browser
   (di luar batas kontrak saat ini).
2. **Perbaiki T-1**: bulatkan `sapuanHarga.min/max` sebelum validasi akhir, atau
   validasi ulang setelah pembulatan, lalu tambahkan satu test batas pecahan.
3. **Lengkapi `.gitignore`** (T-3) dan samakan dengan `NOTES.md`.
4. **Perkuat header opsional** (T-4): CSP `default-src 'self'`, `base-uri 'self'`,
   `form-action 'self'`, `frame-ancestors 'none'`, `Referrer-Policy: no-referrer`.
   Untuk deployment publik, tambahkan pembatasan laju di reverse proxy.
5. **Dokumentasi operasional**: catat bahwa `verify.sh` membutuhkan `curl` dan port uji
   3456 bebas; sebutkan juga cara mengubah `PORT_UJI`/`HOST_UJI`.
6. **Pra-peluncuran komersial**: validasi hukum nama merek dan tinjau ulang copy
   disclaimer agar tetap tanpa klaim "dijamin untung".

---

## 6. Catatan Metodologi

- Review membaca `SPEC.md`, `CONTRACT.md`, `plan.json`, `README.md`, `NOTES.md`,
  seluruh `backend/`, `test/`, `verify.sh`, `package.json`, serta `public/` (HTML, CSS,
  dan JS aplikasi/landing/laporan).
- `npm test` dan `bash verify.sh` dijalankan ulang dan lulus; kinerja mesin diukur
  langsung dari `jalankanSimulasi` dengan input template Warung Makan (10.000 iterasi,
  seed 12345).
- Pemeriksaan keamanan mencakup pencarian `innerHTML`/`eval`/`Function`, URL eksternal,
  pola secret, path traversal, batas body, dan validasi input. Tidak ada kode aplikasi
  yang diubah.
