# Laporan Code Review — Rekam Medisku

Tanggal: 9 November 2026
Ruang lingkup: kesesuaian implementasi dengan `SPEC.md` v1.3, keamanan dasar
(injection/XSS, secret hardcoded, validasi input), dan kualitas verifikasi.
Commit yang direview: `2a4d200 task t34`.
Hasil `verify.sh`: **LULUS** — exit code 0, **247 tes lulus / 0 gagal / 0 di-skip**,
seluruh smoke test HTTP lulus.

> **Metode.** Review ini bersifat **statis** ditambah menjalankan `verify.sh`
> (`node --test` + smoke test server) dan beberapa potongan uji Node terarah untuk
> mereproduksi temuan. Reviewer **tidak** menjalankan peramban sungguhan, sehingga
> perilaku UI, IndexedDB nyata, kamera/mikrofon, TTS, service worker, dan cetak
> dinilai dari kode, tes, serta catatan tim (`NOTES.md`), bukan uji end-to-end
> independen.

---

## 1. Ringkasan

- Seluruh fitur inti **F1–F10** dan fitur canggih **A1–A9** sudah diimplementasikan
  sesuai arsitektur SPEC: vanilla JS ES modules, server statis Node murni,
  IndexedDB + fallback, Web Crypto (PBKDF2-SHA256 310.000 iterasi + AES-GCM-256),
  OCR Tesseract.js lokal, ASR **Whisper base q8** yang di-vendor (model nyata
  ± 81,3 MB, bukan placeholder), QR encoder murni, dan `node:test`.
- **Satu cacat fungsional ditemukan (T1, sedang):** pengaturan suara bersarang
  (`settings.suara`) **tidak pernah disimpan**. `state.setSettings()` hanya menyalin
  field boolean dari `SETTINGS_DEFAULTS`, dan `normalizeState()` juga membuang
  `settings.suara`. Akibatnya persetujuan Web Speech, pilihan mesin suara, serta
  preferensi TTS (aktif/nonaktif dan kecepatan) hilang setiap kali layar dirender
  ulang/dimuat ulang. Ini menyimpang dari SPEC F10 dan §9 ("persetujuan tercatat …
  dapat dicabut"). Perilakunya gagal-aman (kembali ke mesin offline), tetapi fitur
  opsional Web Speech praktis tidak dapat dipakai lintas layar.
- **Satu cacat offline ditemukan (T2, rendah–sedang):** `app/js/a11y.js` tidak
  tercantum di `PRECACHE` service worker, padahal modul itu diimpor statis oleh
  `app.js`. Muat ulang offline setelah kunjungan online pertama berisiko gagal
  memuat modul aplikasi, bertentangan dengan SPEC §4.7 ("setelah dibuka sekali …
  tetap berfungsi offline").
- **Tidak ditemukan celah kritis/tinggi:** tidak ada secret/API key hardcoded,
  tidak ada `eval`/`new Function`/`document.write`, data pengguna dirender lewat
  teks/DOM (bukan `innerHTML`), SVG dinamis di-escape, dan path traversal server
  ditolak dengan benar (termasuk bentuk ter-encode).
- **Temuan sedang/rendah** lain: jumlah iterasi PBKDF2 tak terbatas (DoS saat
  impor cadangan), impor cadangan membaca berkas tanpa batas ukuran, tidak ada
  panjang minimum kata sandi, CSP hanya lewat `<meta>` + `style-src 'unsafe-inline'`,
  symlink diikuti server, nama cache service worker tetap, dan checksum vendor
  tidak diverifikasi.
- **Kesenjangan verifikasi:** belum ada uji end-to-end peramban; bug T1 lolos
  karena tes persetujuan memakai `fakeState` yang menyimpan `suara`, bukan
  `createState()` sungguhan, dan kelengkapan `PRECACHE` tidak diuji.

---

## 2. Cara Menjalankan

Prasyarat: **Node.js ≥ 20** (direview dengan v22.23.4, npm 10.9.9), npm hanya untuk
vendoring, dan peramban modern (IndexedDB, Web Crypto, WebAssembly, Worker,
service worker; `http://localhost` dianggap secure context).

```bash
npm install            # memasang paket OCR + ASR untuk vendoring
npm run vendor:ocr     # Tesseract.js + WASM + data ind/eng -> public/vendor
npm run vendor:whisper # transformers.js + ONNX WASM + 12 berkas Whisper q8
npm start              # server statis di http://127.0.0.1:3000
```

Buka `http://127.0.0.1:3000` (atau `http://localhost:3000`). Tidak ada langkah build.
`vendor:whisper` mengunduh model **hanya saat build** (± 80 MB) dari
`huggingface.co`/`us.aws.cdn.hf.co`; runtime tidak pernah mengunduh model.
Tanpa aset vendor, jalur Ketik/Tempel teks dan formulir tetap berfungsi.

Verifikasi:

```bash
npm test               # node --test tests/*.test.js (tanpa jaringan)
npm run verify         # bash verify.sh: cek vendor + semua tes + server + smoke HTTP
```

`verify.sh` bersifat idempoten, hanya localhost, tidak menjalankan vendoring/unduhan.
Ia memerlukan `public/vendor/manifest.json` dan `public/vendor/suara/manifest.json`
beserta berkas entry-nya; bila belum ada, jalankan ketiga perintah persiapan di atas.

Konfigurasi server:

| Variabel | Default | Arti |
|----------|---------|------|
| `PORT` | `3000` | Port HTTP. `0` memilih port ephemeral. |
| `HOST` | `127.0.0.1` | Alamat bind. `0.0.0.0` membuka akses jaringan — pahami risikonya. |
| `VENDOR_DIR` | `<repo>/public/vendor` | Direktori aset OCR/ASR yang disajikan di `/vendor/`. |
| `VERIFY_PORT` | `3210` | Port smoke test `verify.sh`. |
| `WHISPER_MODEL_SOURCE` | `<repo>/vendor-src/whisper-base` | Sumber model lokal untuk vendoring tanpa jaringan. |

---

## 3. Fitur Selesai vs Belum

### 3.1 Fitur inti (wajib)

| # | Fitur | Status | Bukti / catatan |
|---|-------|--------|-----------------|
| F1 | Profil pemilik + multi-profil | **Selesai** | `ui/profile.js`, `state.js` (tambah/ganti/hapus profil), `model.js` |
| F2 | Rekam medis/linimasa + lampiran | **Selesai** | `ui/visits.js`, `ui/attachments.js`; batas 1 MiB/berkas, 10/kunjungan, MIME allowlist (`model.js:43-49`) |
| F3 | Daftar obat + jadwal + stok | **Selesai** | `ui/meds.js`, `logic/schedule.js`, `logic/stock.js`; tombol Sudah diminum/Lewati di dashboard & Obat |
| F4 | Vital & lab + grafik SVG | **Selesai** | `ui/vitals.js`, `ui/chart.js` (SVG di-escape), `logic/vitals.js` |
| F5 | Beranda ringkasan | **Selesai** | `ui/dashboard.js` |
| F6 | Pindai resep/etiket + OCR lokal + jalur teks + Tinjau wajib | **Selesai** | `ui/scan.js`, `ui/scan-review.js`, `ocr/*`, `logic/resep*.js`; gate `#review-verified` dicek ulang sebelum simpan (`scan-review.js:1034-1065`) |
| F7 | Pindai rekam medis & hasil lab RS | **Selesai** | `logic/rekam.js`, `logic/labParse.js`, mode rekam di `ui/scan-review.js`; teks disalin apa adanya |
| F8 | Tanya Satu per Satu (lima pertanyaan tertutup) | **Selesai** | `logic/kosakataTertutup.js`, `logic/pencocokJawaban.js`, `logic/tanyaSatuPerSatu.js`, `suara/alurTanya.js`, `ui/tanya-suara.js`; korpus 96 jawaban (`tests/fixtures/tanya-cases.js`) |
| F9 | Pemeriksaan Pendamping | **Selesai** | `ui/pemeriksaan.js`; satu-satunya layar yang mengubah status ke `'sudah'`, wajib nama + pernyataan |
| F10 | Mesin suara offline Whisper + Web Speech opsional | **Selesai dengan catatan** | `suara/whisperEngine.js`, `suara/adaptor.js`, `suara/penjagaAsr.js`, `suara/persetujuan.js`; model q8 81.265.296 byte di-vendor; **cacat persistensi pengaturan suara — lihat T1** |

### 3.2 Fitur canggih

| # | Fitur | Status | Bukti utama |
|---|-------|--------|-------------|
| A1 | Ringkasan Satu Halaman + cetak | **Selesai** | `ui/report.js`, `logic/summary.js`, `css/print.css` (A4, margin 14 mm), `window.print()` |
| A2 | Kartu Darurat ber-QR | **Selesai** | `ui/emergency.js`, `qr.js` (byte mode, EC M, versi 1–10); payload ≤ 200 byte, escaped |
| A3 | Prediksi stok habis & pengingat tebus | **Selesai** | `logic/stock.js` |
| A4 | Kepatuhan minum per minggu | **Selesai** | `logic/adherence.js` (8 minggu, terlewat dihitung deterministik) |
| A5 | Deteksi duplikasi bahan aktif | **Selesai** | `logic/safety.js`; disclaimer jelas "bukan interaksi obat" |
| A6 | Penanda di luar rentang acuan pengguna | **Selesai** | `logic/vitals.js`, `logic/safety.js` |
| A7 | Cadangan & pemulihan (plain/terenkripsi) | **Selesai** | `js/backup.js`, `ui/settings.js`; foto sumber tidak ikut backup dan dijelaskan di UI |
| A8 | Mode huruf besar + kontras tinggi | **Selesai** | `ui/settings.js`, `css/style.css`, `app.js` (boolean `SETTINGS_DEFAULTS` tersimpan) |
| A9 | Multi-profil keluarga | **Selesai** | `ui/profile.js`, cascade hapus di `state.js` |

### 3.3 Yang belum / perlu perhatian

1. **Tidak ada fitur SPEC yang belum diimplementasikan.** Semua F1–F10 dan A1–A9
   memiliki modul dan tes.
2. **T1 — persistensi pengaturan suara gagal.** Persetujuan Web Speech, pilihan
   mesin, dan preferensi TTS tidak tersimpan di vault (detail di §4.2). Ini adalah
   kesenjangan perilaku terhadap SPEC F10/§9, bukan fitur yang hilang.
3. **T2 — kelengkapan precache service worker.** `js/a11y.js` tidak ada di
   `PRECACHE` sehingga jaminan "offline setelah muat pertama" (SPEC §4.7) tidak
   sepenuhnya terpenuhi. Lihat §4.2.
4. **Belum ada uji end-to-end peramban.** Alur IndexedDB nyata, service worker/
   offline, kamera, mikrofon, TTS, cetak, dan target sentuh 48 px belum diuji
   otomatis di repo; hanya diverifikasi lewat kode + tes DOM palsu.

---

## 4. Risiko & Temuan

### 4.1 Yang sudah baik

- **Path traversal server:** `resolveRequestPath()` (`server.js:92-140`) menolak NUL,
  segmen `.`/`..`, backslash, path absolut, dan memeriksa containment di bawah root
  yang dipilih. Bentuk mentah dan ter-encode (`/vendor/%2e%2e%2f...`) terbukti 404
  di smoke test. Server hanya `GET`/`HEAD`; metode lain 405; tidak ada endpoint data
  medis maupun CORS.
- **Header keamanan:** `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
  `Cross-Origin-Resource-Policy` dikirim untuk semua respons (`server.js:18-23`).
- **Injection/XSS:** helper `dom.js` sengaja menolak `innerHTML`/`html` (`dom.js:87-88`).
  Tiga sisa `innerHTML` (`chart.js:370`, `dashboard.js:381`, `emergency.js:221`) hanya
  menerima string SVG internal yang seluruh teks dinamisnya di-escape
  (`chart.js` `escapeXml`, `qr.js` `escapeXml`). Tidak ada `eval`/`new Function`/
  `document.write`; tidak ditemukan `child_process` di kode aplikasi.
- **Secret hardcoded:** tidak ada API key/token/private key di `app/`, `server.js`,
  `scripts/`, `tests/`, maupun `package.json`; nilai sensitif di tes adalah dummy.
- **Validasi input model:** `model.js` membatasi ukuran/MIME lampiran dan foto
  sumber, panjang teks OCR (20.000), jumlah lampiran/kontak, serta menormalisasi
  state saat impor. MIME lampiran memakai allowlist tanpa SVG; foto sumber juga
  allowlist (`image/jpeg|png|webp`).
- **Kriptografi:** PBKDF2-SHA256 310.000 iterasi + salt 16 byte acak, AES-GCM-256
  dengan IV 12 byte acak per penyegelan; salah kata sandi tidak dibedakan dari
  ciphertext rusak (`crypto.js:218-268`). Kunci hanya di memori.
- **Privasi jaringan:** CSP membatasi `connect-src 'self'`, `object-src 'none'`,
  `worker-src 'self' blob:`; tidak ada URL eksternal di sumber aplikasi (diuji
  `tests/security.test.js`). `whisperEngine` memaksa `env.allowRemoteModels=false`,
  `allowLocalModels=true`, path model/WASM lokal, dan menolak path non-same-origin.
- **Penjaga ASR:** durasi maks. 8 detik, `max_new_tokens` 48, penolakan keluaran
  berulang/rasio huruf/panjang tak wajar diterapkan di adaptor sebelum hasil
  mencapai pemanggil (`penjagaAsr.js`, `adaptor.js`).
- **Gate verifikasi manusia:** simpan Tinjau nonaktif sampai checkbox dicentang dan
  dicek ulang saat simpan; entri dari suara selalu `pemeriksaanOrangLain.status='belum'`
  dan hanya layar Pemeriksaan Pendamping yang dapat mengubahnya.

### 4.2 Temuan dan rekomendasi

| # | Tingkat | Temuan | Lokasi | Rekomendasi |
|---|---------|--------|--------|-------------|
| **T1** | **Sedang** (fungsional/privasi) | `settings.suara` tidak pernah disimpan: `setSettings()` hanya menyalin boolean dari `SETTINGS_DEFAULTS`, dan `normalizeState()` juga membuang objek `suara`. Persetujuan Web Speech, pilihan mesin, dan TTS/kecepatan hilang setiap re-render/reload; layar lain (`isi-suara`, `tanya-suara`) membaca `getState().settings` sehingga selalu jatuh ke offline + TTS default. Menyimpang dari SPEC F10/§9 ("persetujuan tercatat, dapat dicabut"). | `state.js:702-716`; `model.js:739-744`; pembaca `ui/suara-pengaturan.js:90-121`, `ui/isi-suara.js:353-356`, `ui/tanya-suara.js:352-358` | Terima `patch.suara` di `setSettings()` setelah `normalisasiPengaturanSuara()`; pertahankan `settings.suara` di `normalizeState()`; tambah tes regresi memakai `createState()` nyata + `init()`/reload, bukan `fakeState`. |
| **T2** | **Rendah–sedang** (offline) | `app/js/a11y.js` diimpor statis oleh `app.js` tetapi tidak ada di `PRECACHE` (`app/sw.js:10-91`). Karena SW baru mengontrol setelah registrasi, `a11y.js` tidak ikut ter-cache pada muat pertama; muat ulang offline sebelum kunjungan online kedua berisiko gagal memuat modul aplikasi. Berbeda dengan SPEC §4.7. | `app/sw.js:10-91`; `app/js/app.js:7` | Tambahkan `./js/a11y.js` ke `PRECACHE`; tambahkan tes/`verify.sh` yang membandingkan impor statis `app.js` (dan seluruh modul) dengan daftar precache. |
| S1 | **Sedang** (DoS lokal) | Jumlah iterasi PBKDF2 dari vault/cadangan dipakai tanpa batas atas. Cadangan terenkripsi jahat atau record vault yang diedit dapat menetapkan iterasi sangat besar sehingga impor/unlock membekukan UI. | `crypto.js:229-231, 245`; `state.js:367-368` | Batasi `iterations` ke rentang wajar (mis. 10.000–2.000.000) dan tolak di luar itu dengan `DATA_RUSAK`. |
| S2 | **Sedang** (DoS/memori) | Impor cadangan membaca seluruh berkas ke memori (`file.text()` lalu `JSON.parse`) tanpa batas ukuran; normalisasi juga tidak membatasi jumlah item/panjang string bebas. Berkas sangat besar dapat menghabiskan memori/membekukan tab. | `ui/settings.js:343`; `backup.js:103-108`; `model.js:690-716` | Tolak berkas di atas batas (mis. 20–50 MB) sebelum membaca; batasi jumlah item dan panjang teks; tangani `RangeError` dengan pesan ramah. |
| S3 | **Sedang–rendah** (kripto) | Tidak ada panjang minimum kata sandi: `setPassword()` hanya menolak string kosong; UI hanya menyarankan 8 karakter. Kata sandi 1 karakter membuat enkripsi at-rest praktis tidak berarti. | `state.js:415-419`; `ui/settings.js:424-431` | Terapkan minimum (mis. 8–10) di lapisan state, bukan hanya UI, dengan pesan jelas dan konfirmasi risiko lupa kata sandi. |
| S4 | **Rendah** (pertahanan berlapis) | CSP hanya dikirim sebagai `<meta>`, bukan header HTTP; `style-src` masih memuat `'unsafe-inline'`. `<meta>` tidak dapat menetapkan `frame-ancestors` (ditutup `X-Frame-Options`) dan lebih rapuh sebagai pertahanan berlapis. | `app/index.html:6`; `server.js:18-23` | Kirim header `Content-Security-Policy` yang sama dari server; evaluasi menghapus `'unsafe-inline'` dari `style-src` (gunakan kelas/atribut style yang diizinkan). |
| S5 | **Rendah** (lokal) | Containment memakai `path.resolve` (bukan `realpath`); `stat`/`createReadStream` mengikuti symlink. Symlink yang ditanam di `app/` dapat menyajikan berkas di luar root. Ancaman hanya lokal karena default bind `127.0.0.1`. | `server.js:133-138, 144, 169` | Gunakan `fs.realpath` dan pastikan hasilnya tetap di bawah root sebelum menyajikan berkas. |
| S6 | **Rendah** (operasional) | Service worker memakai cache-first dengan nama cache tetap `rawatku-v1`; `activate` tidak menghapus cache bernama sama. Setelah deploy, pengguna dapat menerima JS lama untuk satu kali muat. | `app/sw.js:5, 90-111` | Naikkan versi cache saat rilis (build stamp) atau tampilkan prompt "muat ulang untuk versi baru". |
| S7 | **Rendah** (supply chain build) | Skrip vendoring menghitung SHA-256 dan menuliskannya ke manifest, tetapi tidak memverifikasi unduhan terhadap checksum yang dipatok; `verify.sh` juga hanya memeriksa keberadaan/ukuran berkas, bukan kecocokan hash. | `scripts/vendor-whisper.mjs:343-344`; `verify.sh:199-206` | Pin checksum model/transformers per rilis dan verifikasi di skrip + `verify.sh`. |
| S8 | **Info** | Foto sumber yang sudah ada sebelum kata sandi dipasang tetap plaintext; menghapus kata sandi membuat foto lama yang terenkripsi tidak dapat dibuka. Perilaku sudah diperingatkan eksplisit di UI. | `state.js:831-844, 454-474`; `ui/settings.js:371-374` | Dokumentasikan/migrasikan (re-enkripsi/dekripsi) foto saat kata sandi dipasang/dihapus; atau larang hapus kata sandi bila ada foto terenkripsi. |
| S9 | **Info** | Vault default tersimpan tanpa enkripsi, metadata foto plaintext, dan Kartu Darurat/QR berisi data sensitif plaintext. Sesuai SPEC dan sudah diperingatkan; risiko residual yang harus dipahami pengguna. | `state.js`; `ui/emergency.js` | Pertahankan peringatan; pertimbangkan onboarding yang mendorong pemasangan kata sandi. |
| S10 | **Info** | `public/vendor` ± 162 MB ikut ter-track di git (sesuai desain vendoring); `package.json`/`/health` memakai versi `1.1.0` sedangkan SPEC ber-versi 1.3. | `.gitignore`; `package.json:4`; `server.js:12` | Pertimbangkan Git LFS/rilis aset terpisah; samakan penomoran versi dokumen/paket agar tidak membingungkan. |

Tidak ada temuan **kritis/tinggi** (tidak ada RCE, XSS yang dapat dieksploitasi dari
data pengguna, kebocoran secret, atau path traversal yang berhasil).

### 4.3 Reproduksi T1 (diverifikasi reviewer)

```bash
node --input-type=module -e "
import { createState } from './app/js/state.js';
const s = createState();
await s.init();
const out = await s.setSettings({ suara: { mesin: 'web-speech' } });
console.log('return:', out);
console.log('settings.suara:', s.getState().settings.suara); // undefined
"
```

Keluaran: `settings.suara: undefined`. Hal yang sama terjadi pada `normalizeState()`
(state yang sudah berisi `settings.suara` kehilangan objek itu saat dinormalisasi),
sehingga perbaikan harus dilakukan di **kedua** tempat.

### 4.4 Reproduksi T2 (diverifikasi reviewer)

Perbandingan modul JS aplikasi dengan `PRECACHE` menghasilkan:

```text
file js: 74  precache js: 72
missing from precache: [ 'js/a11y.js', 'sw.js' ]
```

`sw.js` memang tidak perlu di-precache; `js/a11y.js` **perlu** karena diimpor
statis oleh `app/js/app.js:7`.

---

## 5. Kualitas Verifikasi & Kesenjangan

1. **Tes Node kuat dan luas.** `node --test tests/*.test.js` menjalankan 247 tes
   (0 gagal, 0 skip) di 13 berkas: `logic`, `security`, `platform`, `scan`, `resep`,
   `resep-pecahan`, `ucapan`, `suara`, `tanya`, `penjaga-asr`, `keselamatan-waktu`,
   `dom-a11y`, dan `whisper-integration`. Integrasi Whisper **benar-benar berjalan**
   (model q8 ada di `public/vendor/suara/models`), bukan di-skip.
2. **Smoke test server memadai.** `verify.sh` memeriksa `/health`, `/`, JS, manifest
   PWA, manifest OCR/Whisper, MIME `.wasm → application/wasm`,
   `.onnx → application/octet-stream`, 404, 405, dan tiga bentuk traversal.
3. **Kesenjangan tes yang menutupi T1.** Tes persetujuan memakai `fakeState()`
   (`tests/suara.test.js:119`) yang menerapkan patch apa adanya; perilaku
   `createState().setSettings()` yang sebenarnya tidak diuji. Perlu tes integrasi
   state nyata (simpan → reload → baca).
4. **Kelengkapan `PRECACHE` tidak diuji (T2).** Tidak ada tes/`verify.sh` yang
   memastikan semua modul yang diimpor `app.js` tercantum di precache. Tambahkan
   pemeriksaan statis sederhana terhadap daftar impor.
5. **`verify.sh` tidak memverifikasi hash vendor.** Langkah 0 memeriksa keberadaan
   dan ukuran minimum, bukan kecocokan SHA-256 dengan manifest, sehingga korupsi/
   substitusi berkas non-kosong dapat lolos.
6. **Belum ada uji peramban end-to-end.** Render layar nyata, IndexedDB, service
   worker/offline, kamera/mikrofon, TTS, layout cetak, dan target sentuh hanya
   diverifikasi dari kode/tes DOM palsu.
7. **CSP header HTTP tidak diuji** karena memang belum dikirim (lihat S4).

---

## 6. Saran Langkah Berikutnya (berurutan prioritas)

1. **Perbaiki T1:** simpan `settings.suara` di `setSettings()` (setelah
   `normalisasiPengaturanSuara`) dan pertahankan di `normalizeState()`; tambahkan
   tes regresi dengan `createState()` nyata yang memuat ulang vault. Pastikan
   persetujuan Web Speech bertahan antar-layar dan antar-reload, dan pencabutannya
   juga tersimpan.
2. **Perbaiki T2:** tambahkan `./js/a11y.js` ke `PRECACHE` dan tambahkan pemeriksaan
   otomatis yang membandingkan modul yang diimpor `app.js` dengan daftar precache.
3. **Perbaiki S1–S3:** batasi iterasi PBKDF2, batasi ukuran impor cadangan, dan
   terapkan panjang minimum kata sandi di lapisan state; tambahkan tes regresi.
4. **Kirim CSP sebagai header HTTP** dan evaluasi penghapusan `'unsafe-inline'`
   dari `style-src` (S4).
5. **Pengerasan server & rilis:** gunakan `realpath` (S5), naikkan versi cache
   service worker per rilis/prompt muat ulang (S6), dan verifikasi checksum vendor
   di skrip + `verify.sh` (S7).
6. **Tambahkan uji browser otomatis (Playwright)** untuk alur kritis: tambah
   profil/obat, simpan kunjungan, Darurat/Ringkasan/cetak, gate Tinjau, impor/ekspor
   cadangan, lock/unlock setelah reload, mode offline, dan persistensi Pengaturan
   Suara.
7. **Rapikan dokumentasi/operasional:** samakan versi `package.json`/`/health`
   dengan versi SPEC, dan pertimbangkan strategi aset vendor besar (Git LFS/rilis
   terpisah).

---

## 7. Lampiran — Perintah & Hasil

```text
$ node --version
v22.23.4
$ bash verify.sh
==> Langkah 0/4: memeriksa aset vendor OCR/Whisper dan artefak lama
Vendor OCR lengkap: public/vendor/manifest.json
Vendor Whisper lengkap: manifest q8 + 12 berkas model + transformers + ONNX WASM
Grep bersih: tidak ada artefak ASR lama di package.json/scripts/app/README/verify.sh
==> Langkah 1/4: menjalankan seluruh test (node --test tests/*.test.js)
# tests 247
# pass 247
# fail 0
# skipped 0
==> Langkah 2/4: menjalankan server di http://127.0.0.1:3210
==> Langkah 3/4: menunggu GET /health siap (maks. 30 detik)
Server siap.
==> Langkah 4/4: smoke test HTTP
  OK  GET /health → 200
  OK  /health JSON {status:ok, app:rawatku, version:1.1.0}
  OK  GET / → 200
  OK  / memuat teks Rekam Medisku
  OK  GET /js/app.js → 200 javascript
  OK  GET /manifest.webmanifest → 200
  OK  GET /vendor/manifest.json → 200
  OK  GET /vendor/tesseract-core/tesseract-core-lstm.wasm → application/wasm
  OK  GET /vendor/suara/manifest.json → engine=whisper, q8, runtimeExternalRequests=0
  OK  GET /vendor/suara/transformers/transformers.min.js → 200 javascript
  OK  GET /vendor/suara/onnx/ort-wasm-simd-threaded.wasm → application/wasm
  OK  GET /vendor/suara/onnx/ort-wasm-simd-threaded.mjs → 200 javascript
  OK  GET .../encoder_model_quantized.onnx → application/octet-stream
  OK  GET .../decoder_model_merged_quantized.onnx → application/octet-stream
  OK  GET /tidak-ada → 404
  OK  POST /health → 405
  OK  GET /vendor/suara/unknown/berkas-lama.js → 404
  OK  GET /../server.js → 404
  OK  GET /vendor/../server.js → 404
  OK  GET /vendor/%2e%2e%2f%2e%2e%2fserver.js → 404
SEMUA VERIFIKASI LULUS
```

Pemeriksaan statis tambahan oleh reviewer:

- Secret (`api_key`, `secret`, `token`, private key, kredensial cloud): tidak
  ditemukan di kode aplikasi/test.
- `eval` / `new Function` / `document.write`: tidak ditemukan.
- `innerHTML`: hanya tiga pemakaian untuk string SVG internal yang di-escape.
- URL `http(s)://` di `app/`: tidak ada selain namespace `http://www.w3.org/2000/svg`.
- `public/vendor` berisi 31 berkas ter-track (± 162 MB); model Whisper q8 nyata
  (`manifest.model.bytes = 81.265.296`, `runtimeExternalRequests: 0`).
- `sw.js` `PRECACHE` memuat 72 dari 74 berkas JS `app/`; yang tidak tercantum
  adalah `sw.js` (wajar) dan `js/a11y.js` (temuan T2).
- Tidak ada TODO/FIXME/HACK di kode aplikasi yang menandakan pekerjaan setengah jadi.
