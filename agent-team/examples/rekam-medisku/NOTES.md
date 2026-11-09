# Catatan Integrasi — t4 (shell, router, CSS dasar, aksesibilitas)

## Berkas yang ditulis (sesuai OWNS)

- `app/index.html`
- `app/css/style.css`
- `app/js/app.js`
- `app/js/dom.js`

Tidak ada berkas lain yang diubah.

## Keputusan & asumsi

1. **Router dinamis.** Semua layar diimpor dengan `import()` di dalam `renderRoute`, termasuk
   `#/pindai` → `ui/scan.js` dan `#/tinjau` → `ui/scan-review.js`. Shell tetap termuat walau modul
   layar belum ada; layar yang gagal dimuat menampilkan `#screen-error` / `#fatal-error` /
   `#btn-fatal-reload` sesuai kontrak (tanpa stack trace).
2. **Impor storage/state juga dinamis di `boot()`.** Perilaku sama dengan kontrak, tetapi shell
   dapat menampilkan layar fatal yang rapi bila modul data gagal dimuat. Bila init gagal, state
   dikosongkan agar navigasi tidak mencoba memakai state setengah jadi.
3. **Skip-link** (`href="#app-view"`) dicegat saat diklik: fokus pindah ke `<main>` tanpa mengubah
   hash route (mencegah kembali ke beranda dari layar lain).
4. **Dialog "Lainnya"** memakai `<dialog>` native + `showModal()`, fallback atribut `open`, dan
   mengembalikan fokus ke `#btn-more` saat ditutup (termasuk Escape).
5. **Toast** memakai `#toast-region` (`role="status"`, `aria-live="polite"`), otomatis hilang
   setelah ± 4 detik; nada `info`/`success`/`error` hanya memengaruhi warna.
6. **Fokus per route:** `#app-view` difokuskan saat hash berubah agar pembaca layar diberi tahu.
   Fokus tidak direbut bila layar sudah memfokuskan kontrolnya sendiri (mis. `#lock-password`
   ber-autofocus).
7. **Error message:** hanya kode error kontrak (`DATA_RUSAK`, `KRIPTO_TIDAK_TERSEDIA`,
   `PENYIMPANAN_PENUH`, `TERKUNCI`, `KATA_SANDI_SALAH`) yang pesannya ditampilkan; error tak
   terduga memakai pesan umum Indonesia.
8. **CSS `.is-low-confidence`** menambahkan penanda teks "Perlu diperiksa" lewat `::after` agar
   persyaratan "bukan warna saja" terpenuhi walau markup pemanggil lupa menambahkannya.
9. **`dom.h`** mendukung `class`/`className`, `dataset`, `style` (objek/string), `aria`, properti
   boolean, `value`, handler `onclick`/`on: {...}`, anak array/teks/Node, dan namespace SVG.
   `innerHTML`/`html` sengaja diabaikan.
10. **Target sentuh** 48 px untuk tombol/input/select/textarea/tautan tombol; checkbox/radio 24 px
    tetapi baris labelnya minimal 48 px.

## Ketergantungan lintas tugas (di luar OWNS, jangan diubah di sini)

- `app/js/state.js` (t1) mengimpor `./photos.js` secara statis. Selama `app/js/photos.js` (t13)
  belum ada, `boot()` menampilkan layar fatal; shell sendiri tetap termuat. Setelah `photos.js`
  tersedia, alur boot/lock sudah diuji berhasil dengan stub yang setara kontrak.
- `app/sw.js`, `app/manifest.webmanifest` (t8), `app/css/print.css`, `app/icons/icon.svg` (t7)
  dirujuk dari `index.html` sesuai kontrak. Sebelum berkas itu ada, browser mencatat 404
  same-origin; registrasi service worker gagal senyap seperti disyaratkan.
- Modul layar yang belum dibuat (mis. `ui/emergency.js`) menampilkan layar error kontrak bila
  route-nya dibuka. Ini disengaja agar shell dapat diuji paralel.

## Verifikasi yang dilakukan

- `node --check` untuk `app.js` dan `dom.js`; uji unit `dom.js` dengan DOM tiruan (22 asersi).
- Pemeriksaan statis `index.html`: semua ID kontrak, CSP persis kontrak, tanpa `<script>` inline,
  tanpa handler inline, tanpa URL eksternal, `lang="id"`, manifest/print.css, tel:112/119.
- Pemeriksaan statis CSS: seluruh token kontrak, kelas flag/badge/card/form/scan/review,
  `:focus-visible`, `body.is-locked`, media 720/800 px, tanpa `url()` eksternal, tanpa font < 14 px.
- Uji browser (Playwright/Chromium, 375×667 & 1024×768): render beranda, profil switcher, toast,
  dialog buka/tutup + fokus kembali, navigasi bawah + `aria-current`, skip-link tanpa mengubah
  hash, layar error modul hilang, mode huruf besar 20 px, kontras tinggi (border 2 px, teks hitam),
  target sentuh 48 px, nav fixed di HP/statis di desktop, `max-width` 720 px, nol request eksternal.
- Uji alur kunci dengan vault terenkripsi AES-GCM: terkunci saat muat, header/nav/disclaimer
  tersembunyi, kata sandi salah tidak merusak data, buka berhasil memulihkan profil + pengaturan,
  tombol Kunci bekerja, dan buka ulang setelah kunci berhasil.

## Tambahan t7 (Kartu Darurat, Ringkasan Dokter, cetak, ikon)

Berkas yang ditulis: `app/js/qr.js`, `app/js/ui/emergency.js`, `app/js/ui/report.js`,
`app/css/print.css`, `app/icons/icon.svg`. Tidak ada berkas lain yang diubah.

### Keputusan & asumsi

1. **QR byte mode EC M versi 1–10** mengikuti tabel kapasitas kontrak. Mask dipilih dengan
   penalty rules ISO/IEC 18004 (rules 1–4). Encoder diuji silang terhadap pustaka referensi
   `qrcode` (mode byte dipaksa) untuk versi 1–10: matriks dan mask identik, dan hasilnya
   didekode kembali oleh `jsQR`. Tabel blok EC M: v1 1×16/10, v2 1×28/16, v3 1×44/26,
   v4 2×32/18, v5 2×43/24, v6 4×27/16, v7 4×31/18, v8 2×38+2×39/22, v9 3×36+2×37/22,
   v10 4×43+1×44/26.
2. **`emergencyPayload`** menafsirkan batas "obat ≤ 50 karakter" sebagai panjang seluruh
   nilai baris `Obat:` (gabungan maks. 3 obat). Bila melebihi `maxBytes`, baris opsional
   dibuang berurutan `Penyakit` → `Obat` → `Catatan`, lalu alergi/kontak dipendekkan
   bertahap (`truncated:true` setiap kali ada pemotongan). `fields.medicationNames` berisi
   daftar nama obat sebelum pemotongan baris; `fields.medications` berisi nilai baris final.
3. **Peringatan pemotongan** `#emergency-truncated-warning` selalu ada di DOM tetapi
   `hidden` ketika payload tidak terpotong, agar ID kontrak tetap dapat ditemukan.
4. **SVG QR** dimasukkan ke `#emergency-qr` dari keluaran `qrToSvg` sendiri (bukan data
   pengguna). Label ARIA di-escape; tidak ada teks mentah pengguna di dalam string SVG.
5. **Pertanyaan manual di ringkasan** ditampilkan semua (termasuk yang `done:true`, dengan
   checkbox tercentang) agar dapat dibuka kembali. Pertanyaan otomatis dari
   `buildDoctorSummary` ditampilkan tanpa duplikasi teks dengan pertanyaan manual. Setiap
   perubahan memanggil `state.upsert('questions', {...q, done})` lalu `ctx.refresh()`.
6. **Cetak:** aturan minimum kontrak 10.2 disalin persis, lalu ditambah A4 14 mm, hitam-putih,
   penghindaran page-break, dan penyembunyian `#app-footer`, dialog, serta `.button`.
   `#summary-disclaimer` dan `#emergency-disclaimer` tetap tercetak karena merupakan isi
   wajib layar; yang disembunyikan adalah disclaimer footer global `#app-disclaimer`.
   `#report-root` dibuat ringkas (9,5 pt, grid dua kolom) agar sedapat mungkin muat satu A4.
7. **Ikon** `icon.svg` 512×512 tanpa teks/font: latar penuh `#0f766e`, perisai putih, hati
   merah, dan huruf R vektor. Semua konten berada di zona aman maskable (lingkaran 80%),
   tanpa referensi eksternal selain namespace SVG.

### Verifikasi

- `qr.js`: uji silang matriks + mask terhadap `qrcode` dan dekode `jsQR` untuk versi 1–10,
  kapasitas 14/26/42/62/84/106/122/152/180/213 byte, error `QR_TERLALU_PANJANG` pada 214 byte,
  determinisme, finder pattern, dan payload ≤ 200 byte yang memuat 112/119.
- `ui/emergency.js` & `ui/report.js`: diuji dengan jsdom memakai state tiruan — seluruh ID
  kontrak ada, QR SVG tampil, pratinjau teks, tel:112/119, tombol memanggil `window.print()`,
  checkbox pertanyaan memanggil `upsert` dengan `done` baru, form menambah pertanyaan
  `source:'manual'`, dan tidak ada URL eksternal (selain namespace SVG).

# Catatan Integrasi — t8 (package.json, server statis, README, PWA)

## Berkas yang ditulis (sesuai OWNS)

- `package.json` (persis blok CONTRACT.md §2; tanpa `dependencies` runtime)
- `server.js`
- `README.md`
- `app/sw.js`
- `app/manifest.webmanifest`

Tidak ada berkas lain yang diubah. `.gitignore` sudah ada (`node_modules/`, `.team/`) dan tidak
disentuh; `public/vendor/` dihasilkan oleh t12 lewat `npm run vendor:ocr`.

## Keputusan & asumsi

1. **Tanpa `npm install` saat verifikasi t8.** Paket OCR hanya untuk vendoring dan tidak diperlukan
   server/service worker. Menjalankan `npm install` akan membuat `package-lock.json` (di luar OWNS),
   jadi tidak dijalankan. Validasi `package.json` dilakukan dengan membandingkannya persis ke blok
   JSON di CONTRACT.md §2.
2. **Decode satu kali + proteksi ganda.** `server.js` mengambil path mentah dari `req.url`, memotong
   query, lalu `decodeURIComponent` tepat satu kali. Path ditolak (404) bila mengandung NUL,
   segmen `..`/`.`, segmen kosong (termasuk trailing slash), backslash, atau bentuk absolut.
   Setelah itu hasil `path.resolve` dicek harus berada di bawah root yang dipilih. Aturan ini
   berlaku untuk `rootDir` maupun `vendorDir`. Direktori tidak pernah disajikan.
3. **Cache-Control & MIME** mengikuti §3.2: `/health` `no-store`; app `no-cache`; `/vendor/*`
   `public, max-age=31536000, immutable`; `.wasm` `application/wasm`; `.gz` `application/gzip`;
   `.traineddata`/`.data` `application/octet-stream`. Semua respons memuat header keamanan kontrak.
   Tidak ada log per permintaan; hanya satu baris start.
4. **`startServer`** membaca `PORT`/`HOST`/`VENDOR_DIR` (nilai env kosong dianggap tidak diset).
   `PORT=0` mengembalikan port ephemeral aktual di `{server, port, host, url}`. `EADDRINUSE`
   diubah menjadi pesan Indonesia dan promise ditolak; auto-start menangkapnya dan menyetel
   `process.exitCode = 1`. `SIGINT`/`SIGTERM` menutup server dengan rapi (`server.close`).
5. **Service worker** memakai `CACHE_NAME='rawatku-v1'`, `VENDOR_CACHE='rawatku-vendor-v1'`, dan
   daftar `PRECACHE` 45 entri persis §11.2. `install` memakai `cache.addAll(PRECACHE)` lalu
   `skipWaiting`. `activate` menghapus kunci berprefix `rawatku-` selain dua cache aktif, lalu
   `clients.claim`. Fetch hanya GET same-origin; `/health` tidak diintervensi; `/vendor/*`
   runtime cache-first (miss → network → simpan), tidak pernah di-precache; navigasi cache-first
   dengan fallback `./index.html`; app shell cache-first + revalidasi latar. Tidak ada push/sync,
   `importScripts`, atau URL eksternal.
6. **Konsekuensi precache:** saat t8 ditulis, 13 path precache belum ada karena milik t9–t14
   (`photos.js`, `scanSession.js`, `ocr/adaptor.js`, `ocr/tesseractEngine.js`, `resepKamus.js`,
   `resep.js`, `resepSediaan.js`, `resepJadwal.js`, `rekam.js`, `labParse.js`, `ui/scan.js`,
   `ui/photo-capture.js`, `ui/scan-review.js`). Setelah semua tugas itu selesai, instalasi service
   worker akan berhasil. Bila diuji sebelum itu, `addAll` gagal dan registrasi SW gagal senyap —
   ini disengaja agar app shell tidak pernah "offline setengah".
7. **Manifest** disalin persis dari §11.1 (nama, `lang: id`, `display: standalone`,
   `theme_color: #0f766e`, ikon `icons/icon.svg`).

## Verifikasi yang dilakukan

- `node --check server.js` dan `node --check app/sw.js`; JSON `package.json` &
  `manifest.webmanifest` valid; `package.json` dan manifest dibandingkan persis ke CONTRACT.md.
- Smoke test server (45 pemeriksaan, Node 22): `/health` GET/HEAD + body/nosniff/no-store;
  `/`, `/index.html`, `/js/app.js`, `/sw.js`, `/manifest.webmanifest` + MIME; 404 & 405 dengan body
  dan `Allow` persis; traversal encoded/mentah, NUL, `//etc/passwd`, `/vendor/../...`,
  `/css/`, `/vendor/`, `/vendor` → 404; vendor sementara (`manifest.json`, `dummy.wasm`,
  `.gz`, `.data`, `.js`) + MIME/immutable; `startServer` port 0, `EADDRINUSE`, auto-start via
  `node server.js` (PORT=0), serta SIGTERM keluar 0.
- Simulasi service worker di `node:vm` (14 pemeriksaan): `addAll` 45 entri tanpa vendor,
  `skipWaiting`, pembersihan cache lama (mempertahankan `rawatku-v1`/`rawatku-vendor-v1`),
  `clients.claim`, bypass `/health`/non-GET/cross-origin, vendor miss→cache→hit tanpa network,
  vendor offline → `Response.error()`, fallback navigasi `index.html`, shell cache-first +
  revalidasi, shell miss → network → cache, shell offline → error jelas.
- README dicek memuat seluruh topik wajib (install, vendor:ocr, start, test/verify, struktur,
  privasi offline, batas keselamatan, foto tidak ikut cadangan). Tidak dijalankan `npm test` /
  `verify.sh` karena `tests/` dan `verify.sh` adalah milik t16 dan belum ada pada saat ini.

---

# Catatan Integrasi — t12 (vendor OCR, adaptor, mesin Tesseract.js)

## Berkas yang ditulis (sesuai OWNS)

- `scripts/vendor-ocr.mjs`
- `app/js/ocr/adaptor.js`
- `app/js/ocr/tesseractEngine.js`
- `public/vendor/` (12 berkas, ± 43 MB, termasuk `manifest.json`)

Tidak ada berkas proyek lain yang diubah. `npm install` membuat `node_modules/` (gitignored) dan
`package-lock.json`; lockfile dihapus agar tidak menambah berkas di luar OWNS (`node_modules/`
tetap ada karena di-gitignore dan diperlukan untuk vendoring).

## Keputusan & asumsi

1. **Manifest mengikuti §8A.4, ditambah `version`.** Bentuknya `{version:'1.1.0',
   schemaVersion:1, generatedAt, packages, files:[{path,bytes,sha256}], entry}`. `version`
   memenuhi ringkasan tugas; `schemaVersion` membedakan versi format. `files[].path` relatif
   terhadap `public/vendor/`; `entry.*` memakai path absolut `/vendor/...`.
2. **Salinan core hanya `tesseract-core*.wasm` dan `*.wasm.js`.** Keempat varian yang dicari
   worker (`tesseract-core.wasm.js`, `-simd`, `-lstm`, `-simd-lstm`) tersalin beserta `.wasm`
   pasangannya. Core asm.js legacy tidak diperlukan karena OEM LSTM-only.
3. **Versi traineddata dibaca dari `index.js` paket data** (`langPath: path.join(__dirname,
   '<versi>')`), dengan fallback preferensi `4.0.0` lalu direktori pertama. Hasil saat ini:
   `ind` dan `eng` versi `4.0.0`.
4. **Idempoten dengan pembersihan penuh.** Skrip menghapus `public/vendor/` lalu menyalin ulang,
   sehingga berkas asing tidak tertinggal; `generatedAt` tentu berubah tiap jalan.
5. **Modul ESM vendor hanya mengekspor `default`.** `tesseract.esm.min.js` mengakhiri dengan
   `export { tesseract_min as default }`; karena itu `tesseractEngine.js` mengambil
   `createWorker` dari `moduleNamespace.default.createWorker` (fallback named export).
6. **Mesin diinjeksi lewat `engineImpl`.** `createOcrAdapter({engineImpl})` menerima objek mesin
   (atau fungsi pabrik) dan tidak menyentuh DOM/Tesseract; dipakai test. `recognize` adapter
   mengembalikan `{baris, teks}` ternormalisasi. `kenaliTeks` menambahkan metadata, rata-rata
   kepercayaan baris, durasi, dan `[DISCLAIMERS.ocr]`, lalu selalu `terminate()` di `finally`.
7. **Timeout/abort.** `timeoutMs` dijalankan dengan `Promise.race` + `AbortController`; error
   menjadi `OCR_GAGAL` berpesan "melebihi batas waktu". Abort pemanggil juga `OCR_GAGAL` dengan
   pesan "dibatalkan". `onProgress` dijamin menerima `loading`, `recognizing`, dan `done`
   (status tambahan dari Tesseract seperti `recognizing text` diteruskan).
8. **Validasi gambar tanpa DOM.** `File`/`Blob` divalidasi lewat `size` (> `maxImageBytes` →
   `OCR_TERLALU_BESAR`); data URL dihitung byte payload base64-nya; `ImageData`/canvas/elemen
   gambar dibaca `width`/`height` bila ada. Objek biasa diterima agar fake engine mudah diuji;
   tipe primitif/null/string kosong → `GAMBAR_TIDAK_VALID`.
9. **Tidak ada URL eksternal.** `tesseractEngine` menolak `modulePath`/`workerPath`/`corePath`/
   `langPath` berskema atau protocol-relative. Semua default berada di `/vendor/*`. Tidak ada
   `fetch`/XHR/localStorage/sessionStorage/IndexedDB di kedua modul OCR.
10. **OCR cloud tetap nonaktif.** `OCR_ENGINES.cloud.enabled === false`,
    `documentationOnly === true`, dan `createCloudOcrAdapter()`/`createOcrAdapter({engine:'cloud'})`
    selalu melempar `OCR_CLOUD_NONAKTIF` tanpa kode jaringan.

## Verifikasi yang dilakukan

- `node scripts/vendor-ocr.mjs` dua kali: 12 berkas, hash seluruh aset identik (idempoten),
  manifest memuat `entry`, `files[].sha256` 64 heksadesimal, semua `bytes > 0`.
- Tanpa `node_modules` (salinan skrip di direktori kosong): exit 1 dengan instruksi
  `npm install` + `npm run vendor:ocr`.
- Uji adaptor di Node dengan fake engine: normalisasi 0–100 → 0..1, baris kosong dibuang,
  `teks` diturunkan dari baris, progress `loading/recognizing/done`, `terminate` dipanggil,
  error mesin → `OCR_GAGAL`, timeout 50 ms → `OCR_GAGAL`, AbortSignal → `OCR_GAGAL`,
  gambar invalid/terlalu besar → kode yang sesuai, cloud/engine tak dikenal melempar.
- `server.js` + `public/vendor` nyata: `/vendor/manifest.json` 200 JSON, `.wasm` →
  `application/wasm`, `.traineddata.gz` → `application/gzip`, worker `.js` → javascript,
  `/vendor/../server.js` → 404.
- **Uji browser nyata (Chromium headless + server lokal):** `kenaliTeks(canvas)` memakai
  Tesseract.js vendor menghasilkan teks "Amlodipin 5 mg\n3 dd 1tab" (2 baris, kepercayaan
  0,935, mesin `tesseract`, bahasa `ind+eng`) tanpa satu pun request eksternal; `ocrTersedia()`
  bernilai true. Ini memastikan modul ESM default-export, worker, core WASM, dan traineddata
  ind/eng termuat same-origin.

## Catatan untuk t13/t14/t16

- Gunakan `kenaliTeks(gambar, { onProgress, signal, timeoutMs })`; hasil `HasilOcr` sudah
  memuat `peringatan:[DISCLAIMERS.ocr]` dan `gambar:{lebar,tinggi,bytes}`.
- `kenaliTeks`/adapter tidak menyimpan apa pun; penyimpanan tetap tanggung jawab layar Tinjau
  setelah centang verifikasi.
- `verify.sh` dapat mengambil `files[].path` berakhiran `.wasm` dari manifest; semuanya disajikan
  `application/wasm`. `entry.corePath`/`langPath` adalah direktori, bukan berkas.

## Tambahan t11 (parser rekam medis & hasil lab)

Berkas yang ditulis: `app/js/logic/rekam.js`, `app/js/logic/labParse.js`. Tidak ada berkas lain
yang diubah.

### Keputusan & asumsi

1. **Bentuk `HasilLab` mengikuti CONTRACT.md 7.10.1** (`nama`, `nilai`, `nilaiTeks`, `satuan`,
   `rujukan`, `barisAsli`, `kepercayaan`, `bagianTidakDipahami`). Karena ringkasan tugas juga
   menyebut nama datar, ditambahkan alias **non-enumerable** `rujukanBawah`/`rujukanAtas`/
   `rujukanTeks`; bentuk objek dan hasil `JSON.stringify` tetap persis kontrak.
2. **Angka lab:** `parseAngkaLab` menerima titik/koma desimal dan pemisah ribuan (`1.200` ->
   1200, `1.200,5` -> 1200.5). `10^3` bukan angka. Angka yang merupakan bagian pangkat, tanggal,
   atau rentang tidak dipakai sebagai nilai.
3. **Satuan** diambil dari daftar `SATUAN_LAB_UMUM` lebih dulu (termasuk `x10^3/µL` dan `/µL`),
   lalu pola umum. Token label seperti `normal`/`rujukan` tidak dianggap satuan. Nama yang
   sebenarnya hanya satuan/pangkat (mis. `10^3/µL`) ditolak.
4. **`parseRujukan`** mendukung rentang berlabel, dalam kurung, di ujung baris, serta satu sisi
   `<5`/`>2` (low/high null). Rentang terbalik dirapikan urutannya; tidak menebak nilai baru.
5. **Header tabel dan baris narasi** (`Nama`, `Hasil`, `Satuan`, `Rujukan`, `Keluhan:`, `Diagnosa:`,
   `Tanggal`, `No. RM`, dst.) diabaikan oleh `parseHasilLab` agar mode tanpa label tidak
   menghasilkan lab palsu dari narasi.
6. **Tanggal rekam:** label `tanggal|tgl` diutamakan (format `dd/mm/yyyy`, `dd-mm-yyyy`,
   `yyyy-mm-dd`, `9 November 2026`, `November 9, 2026`). Bila tidak ada label, dicari tanggal
   berdiri sendiri; baris lahir/umur/nama pasien dilewati. Tanggal lahir tidak pernah dipakai
   sebagai tanggal kunjungan.
7. **Batas blok lab:** label `hasil lab|laboratorium|lab` (dengan isi sebaris setelah `:`) atau
   seluruh teks bila tidak ada label. Blok berakhir pada baris kosong atau label seksi lain
   (`catatan`, `terapi`, `diagnosis`, dst.) agar catatan setelah lab tidak ikut dipindai.
   `Lab: Prodia` (tanpa angka) ditafsirkan sebagai nama faskes, bukan label blok.
8. **Diagnosis** hanya disalin dari label `diagnosa|diagnosis|dx`, dipisah koma/titik koma;
   tidak ada inferensi dari keluhan/lab. `bagianTidakDipahami` mencatat tanggal gagal parse,
   baris lab yang tidak dikenali, dan blok lab kosong.
9. **Kepercayaan** memakai rumus 7.10.2 apa adanya (penalti draf, rata-rata lab, bobot 0.5/0.5),
   dibulatkan 2 desimal. Input kosong menghasilkan 0.4 sesuai rumus (bukan 0).
10. **`rekamKeKunjungan`/`labKeLab`** hanya membuat draf: tanpa `id`/timestamps, `attachments: []`,
    `source.verifiedByUser = Boolean(verifiedAt)` dan `verifiedAt: null` bila tidak terverifikasi.
    `profileId` diterima tetapi tidak ditulis ke draf. Ditambahkan opsi `now` (opsional, di luar
    kontrak) agar `todayISO` dapat diuji deterministik.

### Verifikasi

- 73 asersi inline (node, ES module) untuk `parseAngkaLab`, `parseRujukan`, `parseBarisLab`,
  `parseHasilLab`, `kenaliRekamMedis`, `rekamKeKunjungan`, `labKeLab`: format angka, satuan,
  rujukan, header/narasi diabaikan, determinisme, tanggal ID/ISO/nama bulan, diagnosis tidak
  dikarang, penalti kepercayaan, pemotongan `ocrText` 20000, status verifikasi source.
- Draf hasil `rekamKeKunjungan` dan `labKeLab` diumpankan ke `createVisit`/`createLab` lalu
  `validateItem` milik `model.js`: lolos tanpa error.
- `grep` memastikan tidak ada impor `state.js`/`storage.js` maupun akses `document`/`window`
  pada kedua modul (bebas DOM, tidak menyimpan otomatis).

## Tambahan t7 (QR, Kartu Darurat, Ringkasan Dokter, cetak, ikon)

Berkas yang ditulis: `app/js/qr.js`, `app/js/ui/emergency.js`, `app/js/ui/report.js`,
`app/css/print.css`, `app/icons/icon.svg`. Tidak ada berkas lain yang diubah.

### Keputusan & asumsi

1. **QR murni** Model 2 byte mode EC M versi 1–10; tabel blok EC, alignment, format/version
   BCH, dan pemilihan mask (penalty ISO) diperiksa ulang. `encodeQR` menambah pengaman internal:
   bila bit data tidak seluruhnya tertampung matriks, melempar `QRError('QR_TIDAK_VALID')`
   (tidak pernah menghasilkan QR terpotong diam-diam). Field tambahan `mask` pada hasil tidak
   mengubah kontrak (properti kontrak tetap ada).
2. **Urutan baris payload** diperbaiki agar tetap: header, Nama, Gol darah, Alergi,
   [Penyakit], Kontak, [Obat], Darurat, [Catatan] — juga saat baris Penyakit dibuang karena
   batas 200 byte. Pemotongan karakter memakai code point; batas dihitung UTF-8 byte.
3. **Layar Darurat** memakai `ctx.profile` (fallback `state.getActiveProfile()`), obat
   `active !== false`, maks. 3. Bila payload gagal karena terlalu panjang, QR diganti pesan
   ramah `QR_TERLALU_PANJANG` dan pratinjau tetap tersedia bila ada. `qrToSvg` dimasukkan ke
   `#emergency-qr` lewat `innerHTML` (pengecualian kontrak 9.1 untuk SVG internal yang sudah
   di-escape). Nomor 112/119 selalu tampil sebagai tautan `tel:`.
4. **Ringkasan Dokter** memakai `state.getState()` + `buildDoctorSummary`; diagnosis selalu
   berlabel "sesuai yang Anda tulis", disclaimer `DISCLAIMERS.summary` dicetak. Pertanyaan
   manual dikelola lewat `state.upsert('questions', …)` (checkbox `[data-action="toggle-question"]`).
   Baris daftar kompleks (vital, lab, kunjungan) diberi `display:block` inline agar tidak
   berdesakan dengan aturan `.list-item` flex milik `style.css`.
5. **print.css** mengikuti snippet 10.2 persis, lalu menambah normalisasi hitam-putih dan
   `break-inside:avoid`. Disclaimer di dalam `#emergency-card`/`#report-root` **tetap dicetak**
   (SPEC 7.9: disclaimer tidak boleh disembunyikan di layar Darurat/Ringkasan); yang disembunyikan
   hanya `#app-disclaimer` footer global, nav, header, tombol, toast, dialog, dan `.no-print`.
6. **icon.svg** latar penuh 512×512 (aman maskable), isi perisai/hati/R berada di dalam zona
   aman; warna memakai token `#0f766e` (primary) dan `#b91c1c` (danger); tanpa referensi luar.

### Verifikasi

- `node --check` untuk `qr.js`, `ui/emergency.js`, `ui/report.js`; impor dinamis kedua layar
  berhasil (semua named import resolve).
- Uji Node: seluruh kapasitas versi 1–10 memilih versi yang benar; penempatan data cocok untuk
  v1–v10 (guard internal lolos); finder pattern, determinisme, format BCH (EC M, mask terbaca
  sama), version BCH v7–v10, `encodeQR('RAWATKU')` → versi 1/21 modul; SVG ber-`role="img"`,
  `<title>`, `viewBox`, label ter-escape; teks 214 byte → `QR_TERLALU_PANJANG`.
- Uji `emergencyPayload`: contoh kontrak, urutan baris, maks. 3 obat, obat `active:false`
  dibuang, UTF-8 ≤200 byte, `truncated` benar, batas minimum terlalu kecil →
  `QR_TERLALU_PANJANG`; semua keluaran memuat `112` dan `119`.
- `npm test` (77 tes resep yang ada) lulus; XML `icon.svg` valid; kurung kurawal `print.css`
  seimbang. Pengujian browser/QA menyusul oleh t16.

---

# Catatan Integrasi — t14 (Layar Tinjau hasil pindai)

Berkas yang ditulis (sesuai OWNS): `app/js/ui/scan-review.js`. Tidak ada berkas proyek lain
yang diubah (jsdom hanya dipasang sementara untuk smoke test lalu dihapus; `node_modules/` gitignored).

## Keputusan & asumsi

1. **ID mengikuti CONTRACT.md 9.4.** Ringkasan tugas memakai singkatan (`#review-rekam-tanggal`,
   `-faskes`, `-dokter`), sedangkan kontrak menetapkan `#review-rekam-date`, `-facility`,
   `-doctor`, `-diagnosis`, `-complaint`, `-notes`. Karena CONTRACT.md adalah sumber kebenaran,
   yang diimplementasikan adalah ID kontrak. Semua ID wajib lain (umum, per obat, per lab) ada.
2. **Satu sumber edit di memori layar.** Item obat disalin dari `draft.terjemahan.obat`; field
   teks kekuatan/jumlah/waktu disimpan sebagai draf (`strengthDraft`, `totalDraft`, `timesDraft`)
   lalu diurai saat validasi/simpan. Perubahan frekuensi/takaran/bentuk/aturan makan/durasi
   memanggil ulang `frasaTerjemahan` dan `jadwalUntukObat`; jam tidak ditimpa bila pengguna sudah
   menyuntingnya (`timesManual`).
3. **Gate verifikasi tidak bisa dilewati.** `#btn-save-reviewed` `disabled` sejak render sampai
   `#review-verified` dicentang; handler simpan juga memeriksa ulang checkbox dan menampilkan
   `REVIEW_BELUM_DIVERIFIKASI` tanpa menulis apa pun. Validasi field dijalankan ulang setiap simpan.
4. **Tanggal mulai obat** memakai field tambahan `#review-start-date` (bukan ID kontrak, default
   hari ini) agar `obatKeMedication({ today })` punya nilai yang dapat dikoreksi. Untuk rekam
   medis, tanggal kosong ditandai dan wajib diisi sebelum simpan.
5. **Foto sumber** disimpan lebih dulu via `state.saveSourcePhoto`; kegagalan menghentikan proses
   sebelum penulisan item. `source` resep diisi lengkap sesuai kontrak. Untuk rekam medis,
   `rekamKeKunjungan`/`labKeLab` membangun `source` sendiri (kind, photoId, ocrText, ocrConfidence,
   verifiedByUser/At, parserVersion); UI memastikan `verifiedByUser:true` dan `verifiedAt` sama.
6. **Kegagalan sebagian**: draf tidak dihapus; pesan menyebut jumlah item yang sudah tersimpan dan
   meminta pengguna memeriksa daftar. Draf baru dihapus setelah semua upsert berhasil.
7. **Tanpa jaringan/penyimpanan otomatis.** Tidak ada `fetch`, XHR, localStorage, sessionStorage,
   atau `innerHTML` untuk data pengguna. Semua nilai lewat `.value`/`textContent`.

## Verifikasi

- `node --check` dan impor modul berhasil (`render` = function).
- Smoke test jsdom singkat (2 skenario, bukan bagian repo): semua ID kontrak ada; state kosong →
  `#review-empty`; gate menolak simpan sebelum centang; frekuensi tidak valid memblokir simpan dan
  menandai field; koreksi nama/takaran/jam tersimpan sesuai input; source terisi
  (`photoId`, `verifiedAt`, `parserVersion`, `translatedText`); foto disimpan dengan profileId/kind/
  mime/dimensi benar; mode rekam menyimpan 1 visit + lab, lalu `clearScanDraft`, toast, dan
  navigasi `#/obat` / `#/kunjungan`.

---

# Catatan QA — t16 (Tes otomatis & verify.sh)

## Berkas yang ditulis
- `tests/logic.test.js` — dates, schedule, stock, adherence, safety, vitals, summary.
- `tests/security.test.js` — crypto (roundtrip, envelope, kata sandi salah), backup plain/terenkripsi
  + semua kode error, QR (versi 1/21, finder, determinisme, payload ≤ 200 byte), pemindaian sumber
  untuk URL eksternal (hanya namespace SVG w3.org yang diizinkan), CSP, OCR cloud nonaktif,
  manifest vendor, dan larangan localStorage/sessionStorage pada draf pindai.
- `tests/platform.test.js` — model/factory/validasi/normalizeState, storage memory/localStorage,
  state (init, upsert, reload, setPassword lock/unlock, backup, logDose idempoten, foto, cascade
  profil), serta server `createServer` termasuk `vendorDir` sementara + `dummy.wasm`.
- `tests/scan.test.js` — fake OCR engine melalui adaptor (tanpa Tesseract), error `OCR_GAGAL`,
  `createCloudOcrAdapter` → `OCR_CLOUD_NONAKTIF`, parser resep/rekam/lab, sesi draf hanya memori,
  PhotoStore memori, foto terenkripsi lewat state, gate verifikasi, SourceMeta, dan foto tidak
  masuk cadangan.
- `verify.sh` — executable, `set -euo pipefail`, cek vendor (menjalankan `npm run vendor:ocr` bila
  `node_modules` ada dan manifest belum ada), `node --test tests/*.test.js`, start server
  `PORT=3210 HOST=127.0.0.1` di background dengan trap EXIT, tunggu `/health` maks. 30 detik,
  smoke test curl (health, halaman utama, app.js, manifest, vendor manifest, MIME `.wasm`, 404,
  POST 405, traversal root & vendor), lalu mencetak `SEMUA VERIFIKASI LULUS`.

## Asumsi
1. Waktu tetap `new Date(2026, 10, 9, 7, 0, 0)` kecuali tes adherence yang memakai Selasa 00:00
   agar kedua dosis Senin melewati grace 180 menit (kontrak: `missed` = `scheduledAt + grace < now`).
2. Semua tes kripto memakai `iterations: 1000` sesuai instruksi; produksi tetap default 310000.
3. OCR diuji lewat `engineImpl` fake; tidak ada Tesseract, DOM, atau jaringan.
4. Gate verifikasi tinjauan diperiksa statis pada `app/js/ui/scan-review.js` (tanpa DOM): checkbox
   `#review-verified`, tombol `#btn-save-reviewed` disabled, dan `REVIEW_BELUM_DIVERIFIKASI`.
5. `verify.sh` memakai port 3210 sesuai CONTRACT.md 14.2 (bukan default 3000) dan dapat dioverride
   dengan `VERIFY_PORT`.

## Verifikasi
- `node --test tests/*.test.js`: 110 tes lulus (33 tes baru + 77 tes resep yang sudah ada).
- `bash verify.sh`: exit 0, seluruh smoke test lulus tanpa jaringan eksternal.

## Belum beres
- Tidak ada kegagalan implementasi yang ditemukan. Tidak ada berkas implementasi yang diubah.
