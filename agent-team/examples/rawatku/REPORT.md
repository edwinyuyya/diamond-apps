# Laporan Code Review — Rawatku

Tanggal: 9 November 2026
Ruang lingkup: kesesuaian dengan `SPEC.md`, keamanan dasar (injection, secret hardcoded,
validasi input), dan kualitas verifikasi.
Status `verify.sh`: **LULUS** (dijalankan ulang oleh reviewer: exit code 0, 110 tes lulus,
seluruh smoke test HTTP lulus).

> Catatan: review ini bersifat statis + menjalankan test/verify yang tersedia. Reviewer tidak
> menjalankan browser sungguhan, sehingga alur UI/kamera/IndexedDB/service worker dinilai dari
> kode dan catatan tim (`NOTES.md`), bukan dari uji end-to-end independen.

---

## 1. Ringkasan

- Aplikasi **Rawatku** sudah mengimplementasikan seluruh fitur inti **F1–F7** dan sembilan fitur
  canggih **A1–A9** yang diminta `SPEC.md`, tanpa dependency runtime eksternal dan tanpa endpoint
  data di server.
- Arsitektur sesuai spesifikasi: vanilla JS ES modules, server statis Node murni, IndexedDB +
  fallback localStorage/memori, Web Crypto (PBKDF2-SHA256 310.000 iterasi + AES-GCM-256),
  Tesseract.js yang di-vendor, QR encoder murni, `node:test`.
- Tidak ditemukan **celah keamanan kritis**: tidak ada secret hardcoded, tidak ada `eval`/
  `new Function`, tidak ada URL eksternal di kode aplikasi, tidak ada `innerHTML` untuk data
  pengguna, dan path traversal server ditangani dengan benar (terbukti lulus smoke test).
- Ada beberapa **risiko tingkat sedang/rendah** yang layak ditindaklanjuti: batas iterasi PBKDF2
  pada input tak tepercaya, batas ukuran berkas cadangan, kebijakan panjang kata sandi, dan CSP
  yang hanya dikirim lewat `<meta>`.
- Secara fungsional tidak ada fitur SPEC yang tampak belum dibuat. Kesenjangan utama ada pada
  **cakupan verifikasi otomatis**: logika Node teruji baik, tetapi alur browser (offline/PWA,
  cetak, kamera, render DOM) belum diuji otomatis di repo.

---

## 2. Cara Menjalankan

Prasyarat: Node.js ≥ 20.

```bash
npm install          # memasang devDependency OCR (hanya untuk vendoring)
npm run vendor:ocr   # menyalin Tesseract.js + WASM + data ind/eng ke public/vendor
npm start            # server statis di http://127.0.0.1:3000
```

Perintah verifikasi:

```bash
npm test             # node --test tests/*.test.js (tanpa jaringan)
npm run verify       # bash verify.sh: cek vendor, semua test, start server, smoke test HTTP
```

Variabel lingkungan: `PORT` (default 3000), `HOST` (default `127.0.0.1`), `VENDOR_DIR`
(default `public/vendor`). Untuk verifikasi, `verify.sh` memakai port 3210 (`VERIFY_PORT`).

Hasil verifikasi yang dijalankan reviewer:

- `node --test tests/*.test.js`: **110 tes lulus, 0 gagal**.
- Smoke test HTTP: `/health` 200 JSON, `/` 200, `/js/app.js`, `/manifest.webmanifest`,
  `/vendor/manifest.json`, `.wasm` → `application/wasm`, 404, POST 405, dan tiga bentuk path
  traversal → 404. Server berhenti bersih.
- Pemeriksaan tambahan reviewer: seluruh **45 entri `PRECACHE`** di `app/sw.js` benar-benar ada
  di `app/` (0 hilang).

---

## 3. Fitur Selesai vs Belum

### 3.1 Fitur inti (wajib)

| # | Fitur | Status | Bukti utama |
|---|-------|--------|-------------|
| F1 | Profil pemilik + multi-profil | Selesai | `app/js/ui/profile.js`, `state.js` (add/update/remove profile), `model.js` validasi |
| F2 | Rekam medis/linimasa kunjungan + lampiran | Selesai | `ui/visits.js`, `ui/attachments.js` (maks. 1 MiB/berkas, 10/visit, MIME allowlist) |
| F3 | Daftar obat + jadwal + stok | Selesai | `ui/meds.js`, `logic/schedule.js`, `logic/stock.js` |
| F4 | Vital & lab + grafik tren SVG | Selesai | `ui/vitals.js`, `ui/chart.js`, `logic/vitals.js` |
| F5 | Beranda ringkasan | Selesai | `ui/dashboard.js` |
| F6 | Pindai resep/etiket + OCR lokal + jalur teks + Tinjau wajib | Selesai | `ui/scan.js`, `ui/scan-review.js`, `ocr/adaptor.js`, `ocr/tesseractEngine.js`, `logic/resep*.js` |
| F7 | Pindai rekam medis & hasil lab RS | Selesai | `logic/rekam.js`, `logic/labParse.js`, mode rekam di `ui/scan-review.js` |

### 3.2 Fitur canggih (A1–A9)

| # | Fitur | Status | Bukti utama |
|---|-------|--------|-------------|
| A1 | Ringkasan Satu Halaman untuk dokter + cetak | Selesai | `ui/report.js`, `logic/summary.js`, `css/print.css` |
| A2 | Kartu Darurat ber-QR | Selesai | `ui/emergency.js`, `logic/qr.js` (versi 1–10, EC M) |
| A3 | Prediksi stok habis & pengingat tebus | Selesai | `logic/stock.js` |
| A4 | Kepatuhan minum per minggu | Selesai | `logic/adherence.js`, grafik 8 minggu di beranda |
| A5 | Deteksi duplikasi bahan aktif | Selesai | `logic/safety.js` |
| A6 | Penanda di luar rentang acuan pengguna | Selesai | `logic/vitals.js`, `logic/safety.js` |
| A7 | Cadangan & pemulihan (plain/terenkripsi) | Selesai | `js/backup.js`, `ui/settings.js` |
| A8 | Mode huruf besar + kontras tinggi | Selesai | `ui/settings.js`, `css/style.css`, `app.js` |
| A9 | Multi-profil keluarga | Selesai | `ui/profile.js`, cascade hapus di `state.js` |

### 3.3 Non-goals dan batas keselamatan

- Tidak ada akun/cloud/analytics/telemetri, tidak ada endpoint data medis. Server hanya berkas
  statis + `GET /health`.
- OCR cloud **nonaktif** dan hanya metadata (`OCR_ENGINES.cloud.enabled === false`;
  `createCloudOcrAdapter()` melempar `OCR_CLOUD_NONAKTIF`).
- Gate verifikasi manusia pada layar Tinjau benar-benar memblokir simpan: tombol
  `#btn-save-reviewed` `disabled` sampai `#review-verified` dicentang, dan handler simpan
  memeriksa ulang checkbox (`scan-review.js:811–839, 1020–1024`).
- Disclaimer "bukan alat medis", label "Diagnosis (sesuai yang Anda tulis)", serta 112/119
  tampil di layar yang diwajibkan (beranda/footer, Darurat, Ringkasan, Pindai, Tinjau).

**Kesimpulan fitur:** tidak ada fitur SPEC yang belum diimplementasikan. Yang belum sepenuhnya
terverifikasi secara otomatis adalah perilaku browser (lihat §5).

---

## 4. Risiko & Temuan Keamanan

### 4.1 Yang sudah baik

- **Server statis**: `resolveRequestPath()` (`server.js:91–139`) menolak NUL, segmen `.`/`..`,
  backslash, path absolut, dan memeriksa containment `path.resolve` di bawah root yang dipilih.
  Traversal mentah dan ter-encode (`/vendor/%2e%2e%2f...`) terbukti 404 di smoke test.
- **Injection/XSS**: helper `dom.js` sengaja mengabaikan `innerHTML`/`html` (`dom.js:87–88`);
  data pengguna dirender lewat teks/DOM. Tiga pemakaian `innerHTML` yang tersisa
  (`chart.js:370`, `dashboard.js:363`, `emergency.js:221`) hanya menerima string SVG internal,
  dan seluruh teks di dalamnya di-escape (`chart.js` `escapeXml`; `qr.js:621,677–684`).
  Tidak ada `eval`/`new Function`/`document.write`.
- **Secret hardcoded**: tidak ditemukan API key/token/private key di `app/`, `server.js`,
  `scripts/`, `tests/`, maupun `package.json`. Kata sandi di test bersifat dummy.
- **Kriptografi**: PBKDF2-SHA256 310.000 iterasi + salt 16 byte acak, AES-GCM-256 dengan IV 12 byte
  acak per penyegelan; salah kata sandi tidak membedakan ciphertext rusak vs sandi salah
  (`crypto.js:218–276`). Kunci hanya di memori.
- **Validasi input**: validator model lengkap (tanggal, jam, angka, enum, batas lampiran/OCR)
  dan `normalizeState()` membuang item tidak valid saat impor tanpa menghapus data lain
  (`model.js:690–752`). MIME lampiran dan foto memakai allowlist (SVG tidak diizinkan).
- **Privasi**: CSP `connect-src 'self'`, `object-src 'none'`, `worker-src 'self' blob:`; aset OCR
  same-origin; tidak ada URL eksternal di kode aplikasi (diuji di `tests/security.test.js`).
  Header `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
  `Cross-Origin-Resource-Policy` dikirim untuk semua respons.

### 4.2 Temuan dan rekomendasi

| # | Tingkat | Temuan | Lokasi | Rekomendasi |
|---|---------|--------|--------|-------------|
| S1 | **Sedang** | Jumlah iterasi PBKDF2 dari vault/cadangan dipakai tanpa batas atas. Berkas cadangan yang dibuat jahat (atau vault yang diedit lokal) dapat menetapkan iterasi sangat besar sehingga impor/unlock membekukan UI (DoS). | `crypto.js:229–231, 245`; `state.js:269–273, 367–373` | Batasi `iterations` ke rentang wajar (mis. 10.000–2.000.000) dan tolak nilai di luar itu dengan `DATA_RUSAK`. |
| S2 | **Sedang** | Impor cadangan membaca seluruh berkas ke memori tanpa batas ukuran (`file.text()` lalu `JSON.parse`), sehingga berkas sangat besar dapat menghabiskan memori/membekukan tab. | `ui/settings.js:343` | Tolak berkas di atas batas (mis. 20–50 MB) sebelum membaca, dan tangani `RangeError`/kegagalan memori dengan pesan ramah. |
| S3 | **Sedang** | Kebijakan kata sandi lemah: `setPassword()` hanya menolak string kosong; UI sekadar menyarankan 8 karakter. Kata sandi 1 karakter membuat enkripsi at-rest praktis tidak berarti. | `state.js:415–419`; `ui/settings.js:376–389` | Terapkan panjang minimum (mis. 8–10) di lapisan state, bukan hanya UI, dengan pesan yang jelas. |
| S4 | **Rendah** | CSP hanya dikirim sebagai `<meta>`, bukan header HTTP; `style-src` memuat `'unsafe-inline'`. `<meta>` tidak dapat menetapkan `frame-ancestors` (ditutup oleh `X-Frame-Options`) dan lebih rapuh sebagai pertahanan berlapis. | `app/index.html:6`; `server.js:18–23` | Kirim header `Content-Security-Policy` yang sama dari server; pertimbangkan menghapus `'unsafe-inline'` dari `style-src` bila inline style tidak lagi dipakai. |
| S5 | **Rendah** | Pemeriksaan containment server memakai `path.resolve` (bukan `realpath`), dan `stat`/`createReadStream` mengikuti symlink. Symlink yang ditanam di `app/` dapat menyajikan berkas di luar root. Ancaman hanya lokal (butuh akses filesystem), tetapi tetap perlu dicatat. | `server.js:132–138, 144, 169` | Gunakan `fs.realpath` dan pastikan hasilnya tetap di bawah root sebelum menyajikan berkas. |
| S6 | **Rendah** | Foto sumber yang sudah tersimpan **sebelum** kata sandi dipasang tetap plaintext; menghapus kata sandi membuat foto lama terenkripsi tidak dapat dibuka lagi. Perilaku ini sudah diperingatkan di UI, tetapi menyimpang dari harapan sederhana "foto terenkripsi saat kata sandi aktif". | `state.js:836–842`; `ui/settings.js:370–374` | Dokumentasikan eksplisit di README/SPEC atau tambahkan migrasi re-enkripsi foto saat kata sandi dipasang. |
| S7 | **Rendah** | Service worker memakai cache-first untuk app shell, sehingga setelah deploy versi baru pengguna bisa menerima JS lama untuk satu kali muat sebelum revalidasi latar selesai. | `app/sw.js:93–111` | Pertimbangkan strategi stale-while-revalidate dengan versi cache yang dinaikkan saat rilis, atau tampilkan prompt "muat ulang untuk versi baru". |
| S8 | **Info** | Vault default tersimpan **tanpa enkripsi**, metadata foto tetap plaintext, dan Kartu Darurat/QR berisi data sensitif plaintext. Semua ini sesuai SPEC dan sudah diperingatkan; bukan cacat, tetapi risiko residual yang harus dipahami pengguna. | `state.js:237–245`; `ui/emergency.js:136–143` | Pertahankan peringatan; pertimbangkan onboarding yang mendorong pemasangan kata sandi. |

Tidak ada temuan **kritis/tinggi** (tidak ada RCE, XSS yang dapat dieksploitasi dari data
pengguna, kebocoran secret, atau path traversal yang berhasil).

---

## 5. Kualitas & Kesenjangan Verifikasi

1. **Test Node kuat, test browser minim.** `tests/*.test.js` menguji logika, kripto, backup, QR,
   parser, storage/state, dan server. Namun tidak ada test DOM/PWA di repo: render layar,
   `getUserMedia`, IndexedDB nyata, instalasi service worker, layout cetak, dan target sentuh
   hanya diverifikasi manual (diklaim di `NOTES.md`) atau lewat pemeriksaan CSS statis.
2. **`verify.sh` belum memverifikasi seluruh isi vendor.** Langkah 0 hanya memeriksa berkas
   `entry.module` dan `entry.worker`, lalu smoke test hanya satu `.wasm`. Berkas lain di
   `manifest.files` (mis. `ind.traineddata.gz`/`eng.traineddata.gz`, core SIMD) tidak di-`stat`.
   Jika salah satu hilang, `verify.sh` bisa tetap lulus sementara OCR gagal di browser.
   Rekomendasi: iterasi `manifest.files` dan pastikan setiap berkas ada dan ukurannya > 0.
3. **`verify.sh` hanya menguji satu port/lingkungan** dan tidak memeriksa header CSP atau
   ketiadaan request eksternal secara runtime (tes statis sudah ada).
4. **Vendor 43 MB ikut ter-commit** (`git ls-files public` = 13 berkas). Tidak salah secara
   fungsional, tetapi memperbesar repo dan memperlambat clone; pertimbangkan artefak rilis
   terpisah atau Git LFS bila repositori akan dibagikan luas.
5. **Tidak ada TODO/FIXME** di kode aplikasi yang menandakan pekerjaan setengah jadi.

---

## 6. Saran Langkah Berikutnya (berurutan prioritas)

1. **Perbaiki S1–S3** (batas iterasi PBKDF2, batas ukuran impor, panjang minimum kata sandi) dan
   tambahkan test regresi untuk masing-masing.
2. **Perkuat `verify.sh`**: verifikasi semua `manifest.files`, lalu tambahkan smoke test yang
   memastikan tidak ada berkas vendor yang hilang.
3. **Tambahkan uji browser otomatis** (Playwright) untuk alur kritis: muat beranda, tambah/edit
   profil & obat, simpan kunjungan, buka Darurat/Ringkasan, gate verifikasi Tinjau, impor/ekspor
   cadangan, lock/unlock setelah reload, dan mode offline setelah kunjungan pertama.
4. **Kirim CSP sebagai header HTTP** dan evaluasi penghapusan `'unsafe-inline'` dari `style-src`.
5. **Tinjau ulang penanganan symlink** di server statis (`realpath`) sebagai pengerasan.
6. **Dokumentasikan/migrasikan** perilaku foto lama saat kata sandi dipasang/dihapus agar tidak
   mengejutkan pengguna.
7. Pertimbangkan **prompt pembaruan service worker** agar rilis baru tidak tertahan cache lama.

---

## 7. Lampiran — Perintah & Hasil

```text
$ node --test tests/*.test.js
# tests 110
# pass 110
# fail 0

$ bash verify.sh
==> Langkah 0/4: memeriksa aset vendor OCR        (lengkap)
==> Langkah 1/4: menjalankan seluruh test          (110 lulus)
==> Langkah 2/4: menjalankan server di :3210
==> Langkah 3/4: menunggu GET /health              (siap)
==> Langkah 4/4: smoke test HTTP
  OK  /health 200 JSON
  OK  / 200 (memuat "Rawatku")
  OK  /js/app.js 200 javascript
  OK  /manifest.webmanifest 200
  OK  /vendor/manifest.json 200
  OK  /vendor/tesseract-core/tesseract-core-lstm.wasm → application/wasm
  OK  /tidak-ada 404 · POST /health 405
  OK  /../server.js 404 · /vendor/../server.js 404 · encoded traversal 404
SEMUA VERIFIKASI LULUS
```

Pemeriksaan statis tambahan oleh reviewer:

- Grep secret (`api_key`, `secret`, `token`, `private key`): tidak ada di kode aplikasi.
- Grep `eval`/`new Function`/`document.write`/`innerHTML` data pengguna: tidak ada yang berbahaya.
- Grep `https?://` di `app/`: hanya namespace SVG `http://www.w3.org/2000/svg`.
- Semua 45 entri `PRECACHE` service worker ada; manifest PWA valid; `public/vendor` lengkap
  (13 berkas ter-track, 43 MB).
