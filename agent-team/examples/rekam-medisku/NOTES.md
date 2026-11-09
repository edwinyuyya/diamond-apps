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

## Catatan t19 (Web Speech + persetujuan)
- `app/js/suara/webSpeech.js` dan `app/js/suara/persetujuan.js` ditambahkan sesuai 8B.4.
  Engine memakai satu instance `SpeechRecognition` baru per `recognize`, `lang='id-ID'`,
  `interimResults=false`, `maxAlternatives=3`, `continuous=false`, dan tidak menyimpan audio/transkrip.
- `normalisasiPengaturanSuara(settings)` mengembalikan **objek settings utuh** dengan `.suara`
  ternormalisasi (`mesin`, `webSpeechPersetujuan`, `tts`, `kecepatan`). Mesin `'web-speech'`
  diturunkan ke `'offline'` bila persetujuan tidak ada / versinya bukan `web-speech-v1`.
- `berikanPersetujuan`/`cabutPersetujuan` memanggil `state.setSettings({ suara })` sesuai kontrak.
  **Perlu tindak lanjut di luar owns t19:** `app/js/state.js` (`setSettings`, milik t1) saat ini hanya
  menyalin field boolean dari `SETTINGS_DEFAULTS` dan belum menyimpan objek `suara` maupun mengisi
  default `settings.suara`. Sampai itu diperbaiki, persistensi persetujuan di aplikasi nyata bisa
  hilang setelah reload, meski fungsi murni t19 sudah benar dan diuji dengan state tiruan.

## Catatan t18 (adaptor suara + mesin + layar Pengaturan Suara)
- Ditambahkan `app/js/suara/adaptor.js`, `app/js/suara/mesin.js`, dan
  `app/js/ui/suara-pengaturan.js` sesuai 8B.2/8B.10/9.4.9. Semua ID DOM kontrak ada; tidak ada
  `innerHTML`/`onclick=`; error `role="alert"`; `#suara-pengaturan-live` `role="status" aria-live="polite"`.
- `mesin.js` mengekspor `MESIN_SUARA`, `DISCLAIMERS_SUARA`, `PERINGATAN_WEB_SPEECH`,
  `WEB_SPEECH_CONSENT_VERSION`, `normalisasiPengaturanSuara`, `statusPersetujuan`,
  `bolehPakaiWebSpeech`, `pilihMesin`, dan `mesinAktif`. `normalisasiPengaturanSuara` mengikuti
  bentuk t19 (`persetujuan.js`): menerima settings utuh dan mengembalikan settings utuh dengan
  `.suara` ternormalisasi, sehingga kedua modul tidak berbeda kontrak. Nilai `web-speech` hanya
  dipertahankan bila persetujuan eksplisit versi `web-speech-v1` tersimpan; tidak pernah
  diaktifkan implisit.
- `adaptor.js` memakai `engineImpl` fake `{id,lokal,start,stop,recognize,terminate}`, menormalkan
  confidence 0–100 → 0..1, membatasi alternatif 0..3, menandai confidence null dengan peringatan,
  dan selalu memanggil `start`/`stop`/`terminate` di jalur `kenaliSuara` (stop+terminate di finally).
  Timeout → `SUARA_TIMEOUT`, abort → `SUARA_GAGAL`, teks kosong → `SUARA_KOSONG`, web-speech tanpa
  persetujuan → `PERSETUJUAN_DIPERLUKAN` sebelum mikrofon. Tidak menyentuh storage/jaringan.
- `suaraTersedia('offline')` mengecek WebAssembly + AudioContext; keberadaan manifest vendor dapat
  dipaksa lewat `globalThis.__SUARA_VENDOR_TERSEDIA__`/`SUARA_VENDOR_TERSEDIA` (tanpa fetch).
  Bila t20 belum ada, jalur offline default gagal dengan `SUARA_TIDAK_TERSEDIA`.
- `suara-pengaturan.js` memuat t19 (`persetujuan.js`) dan t21 (`tts.js`) secara dinamis. Bila modul
  itu belum ada, layar memakai fallback kontrak lokal (`state.setSettings({suara})`) dan
  `speechSynthesis` untuk simulasi; tidak ada request eksternal.
- Perlu tindak lanjut di luar owns t18: route `#/suara/pengaturan` belum terdaftar di
  `app/js/app.js` (t4); `state.setSettings` (t1) belum menerima objek `suara` bersarang;
  `offlineEngine.js` (t20) dan `tts.js` (t21) belum tersedia; `sw.js` (t8/t20) belum
  mem-precache berkas baru; kelas `voice-big-button` disiapkan untuk `css/suara.css` (t26).
- Verifikasi: `node --check` ketiga berkas; smoke test fake engine untuk normalisasi confidence,
  SUARA_KOSONG, SUARA_TIMEOUT, abort, PERSETUJUAN_DIPERLUKAN, pemetaan kode error, dan pemanggilan
  start/stop/terminate. Saat t18 selesai, `npm test` menjalankan 141 tes: 139 lulus, 2 gagal di
  `tests/ucapan.test.js` (t17: `ucapkanAngka`/`ucapanObat`), bukan regresi dari berkas t18.

## t23 — Perintah navigasi suara (8B.8)

- `logic/perintahNavigasi.js`: `PERINTAH_NAVIGASI` persis kontrak (9 perintah, 24 frasa), semuanya
  dibekukan (frozen). Normalisasi NFKC → lowercase → buang tanda baca → rapikan spasi.
  Pencocokan: persis frasa dulu, lalu Jaccard token ≥ 0.6 per perintah; skor tertinggi menang;
  skor tertinggi yang dimiliki >1 perintah → `null` (ambigu). Skor persis = 1. Deterministik,
  tanpa AI/acak. `daftarBantuan()` mengembalikan 9 kalimat `Ucapkan "..." untuk ...`;
  `teksBantuan()` menambahkan disclaimer "tidak menjawab pertanyaan medis" dan "berhenti".
- `suara/navigasiSuara.js`: `createNavigasiSuara` mengembalikan `{dengarkanSekali,mulai,berhenti,
  terminate}`; `jalankanPerintahSuara` one-shot lalu `terminate`. Adaptor boleh objek
  (`kenali`/`kenaliSuara`/`dengarkan`, `berhenti`/`hentikan`/`stop`, `terminate`) atau fungsi;
  tanpa adaptor, `adaptor.js` dimuat malas. `umumkan` dipakai untuk semua hasil; TTS hanya untuk
  `bantuan` (fungsi, `{bacakan}`, `{speak}`, atau lazy `tts.js`). Mikrofon dihentikan sebelum
  pengumuman/TTS, termasuk jalur error. Tak dikenal/ambigu → kalimat persis kontrak, tanpa
  navigasi/aksi. `berhenti` mengumumkan lalu berhenti tanpa navigasi.
- Asumsi: kegagalan pengenalan (izin ditolak, kosong, timeout, model tidak ada) tidak melempar dari
  `dengarkanSekali`; pesan aman diumumkan dan hasil `{dikenali:false, error}` dikembalikan agar UI
  tinggal menampilkan status. `terminate` pada `jalankanPerintahSuara` melepas adaptor satu-ucapan
  meski adaptor diinjeksi.
- Verifikasi: `node --check` kedua berkas; smoke test 24 frasa kontrak semuanya dikenali, frasa
  medis/ambigu/kosong → `null`, serta urutan `mic-stop` sebelum `nav`/`tts`, pesan tak dikenal
  persis, bantuan menavigasi + membacakan, `berhenti` tanpa navigasi, dan error adaptor aman.

---

# Catatan t20 (DevOps — Vosk WASM + model Indonesia, offlineEngine, service worker)

## Berkas yang ditulis
- `scripts/vendor-suara.mjs` — resolve `vosk-browser` dari `node_modules`, ekstrak WASM, siapkan model, tulis manifest.
- `app/js/suara/offlineEngine.js` — `SUARA_VENDOR`, `SUARA_SAMPLE_RATE`, `SUARA_MODEL_ID`, `offlineTersedia`, `createOfflineEngine`.
- `public/vendor/suara/` — `vosk/vosk.js`, `vosk/vosk.wasm`, `model-id/`, `manifest.json`.
- `package.json` — script `vendor:suara` + devDependency `vosk-browser` (tanpa `dependencies` runtime).
- `app/sw.js` — PRECACHE modul suara/logika/layar baru + `css/suara.css`; `/vendor/*` tetap runtime cache.

## Keputusan/asumsi
1. `vosk-browser@0.0.8` mengemas worker + WASM sebagai data URI di dalam `dist/vosk.js`;
   skrip men-decode worker lalu mengekstrak byte WASM asli (magic `\0asm`) ke `vosk/vosk.wasm`.
2. `vosk-browser` mengekstrak arsip model dengan `stripFirstComponent=true`. Karena itu arsip
   runtime yang dibuat skrip selalu dibungkus folder `vosk-model-small-id-0.22/`.
3. Model asli TIDAK dapat diunduh di lingkungan ini (proxy menolak alphacephei.com).
   `public/vendor/suara/model-id/` berisi `PLACEHOLDER.txt`, `model.tar.gz` kecil, dan manifest
   menandai `model.available: false`. `createOfflineEngine` akan melempar `MODEL_TIDAK_TERSEDIA`
   sampai model asli disediakan (tanpa fallback cloud). Jalankan ulang:
   `VOSK_MODEL_URL=... VOSK_MODEL_SHA256=... npm run vendor:suara`, atau letakkan model di
   `vendor-src/suara/`.
4. Skrip idempoten: memakai ulang `public/vendor/suara/model-id/` bila ada, sehingga tidak
   mengunduh ulang; target dibersihkan agar tidak ada berkas asing.
5. `offlineTersedia()` sinkron dan memeriksa WebAssembly + AudioContext; keberadaan/keabsahan
   manifest diverifikasi asinkron di `createOfflineEngine` (fetch manifest same-origin, tolak
   `runtimeExternalRequests !== 0` / `model.available === false`).
6. `import(modulePath)` hanya dipanggil di dalam `createOfflineEngine` dan hanya untuk path
   same-origin; tidak ada CDN, fallback jaringan, atau penyimpanan audio.

## Verifikasi
- `node --check` untuk `scripts/vendor-suara.mjs`, `app/js/suara/offlineEngine.js`, `app/sw.js`: OK.
- `npm run vendor:suara`: sukses menghasilkan manifest + `vosk.js` + `vosk.wasm` (3.1 MB) + model.
- Smoke HTTP via `createServer` ephemeral: `/vendor/suara/manifest.json` 200 JSON, entry lengkap,
  `runtimeExternalRequests: 0`; `/vendor/suara/vosk/vosk.wasm` 200 `application/wasm`; model `.tar.gz` 200.
- `npm test`: 147 tes lulus, 0 gagal (setelah perubahan `resepKamus.js` oleh tugas lain selesai).
- `npm run verify`: exit 0, `SEMUA VERIFIKASI LULUS` (test + smoke HTTP server, termasuk MIME `.wasm`).

## Belum beres / di luar owns
- `app/sw.js` mencantumkan modul t18/t21–t26 (`suara/adaptor.js`, `mesin.js`, `tts.js`, layar suara, dll.)
  sesuai 8B.3.6. Sebagian sudah ada, tetapi `css/suara.css`, `logic/pemeriksaan.js`, `suara/konfirmasi.js`,
  `suara/penandaPemeriksaan.js`, dan layar `ui/isi-suara*`, `ui/pemeriksaan.js`, `ui/status-pemeriksaan.js`,
  `ui/bantuan-suara.js` belum ada saat t20 selesai; `cache.addAll` akan gagal sampai tugas terkait
  menambahkannya.
- `verify.sh` (t16/t27) belum memeriksa `public/vendor/suara/manifest.json`/WASM suara; perlu ditambah di tugas QA.
- Model Indonesia asli belum di-vendor (lihat asumsi 3); fungsi ASR belum diuji dengan model nyata.

## Catatan t22 (Isi dengan Suara — `ui/isi-suara*`)

### Berkas yang ditulis (hanya owns)
- `app/js/ui/isi-suara.js` — kerangka `#screen-isi-suara`, tab obat/vital/minum/jadwal, kontrol
  Mulai/Berhenti/Ulangi/Batal, adaptor mikrofon, live region, dan mesin konfirmasi wajib.
- `app/js/ui/isi-suara-obat.js` — `dikteKeObat` → field `#suara-obat-*`, `pagarKewajaranDosis`,
  `obatKeMedication` + metadata `suara`/`belum`.
- `app/js/ui/isi-suara-vital.js` — `parseDikteVital` → field `#suara-vital-*`, upsert setelah konfirmasi.
- `app/js/ui/isi-suara-minum.js` — pencocokan jadwal hari ini + `logDose`, serta panel jadwal
  `teksUlangJadwal` (termasuk status pemeriksaan).

### Keputusan/asumsi
1. Setelah dikte, layar menampilkan draf + isian yang dapat disunting. Tombol besar
   `#btn-suara-siap` (ID tambahan di luar daftar kontrak) memulai pembacaan ulang TTS dan
   pertanyaan persis `PERTANYAAN_KONFIRMASI`; `#btn-konfirmasi-ya` / `#btn-konfirmasi-tidak`
   muncul selama konfirmasi (≥48 px). Tidak ada jalur simpan lain.
2. Konfirmasi memakai `buatSesiKonfirmasi` + `jawabKonfirmasi` langsung agar tombol keyboard dan
   jawaban suara memakai mesin yang sama. Setiap TTS didahului `await adaptor.berhenti()`;
   mikrofon dinyalakan lagi hanya untuk mendengar jawaban. `lain`/timeout diulang maksimal 2 kali
   lalu batal; `tidak` membersihkan draf dan fokus ke field pertama.
3. Mode jadwal: `#btn-suara-mulai` berubah menjadi "Bacakan jadwal hari ini" dan memanggil
   `teksUlangJadwal` tanpa mikrofon; `#btn-suara-bacakan-jadwal` juga tersedia. Tidak ada simpan.
4. `#suara-pemilih-obat` diimplementasikan sebagai `<datalist>` nama obat yang sudah ada untuk
   membantu penyuntingan; `#suara-minum-daftar` tetap pemilih dosis utama.
5. `state.upsert` saat ini membangun ulang item baru lewat factory Medication sehingga properti
   tambahan bisa hilang pada penulisan pertama. `isi-suara-obat.simpan()` mendeteksi ini dan
   melakukan upsert pembaruan pada item yang sama agar `dibuatDengan`/`dikonfirmasiDengan` =
   `'suara'` dan `pemeriksaanOrangLain.status` = `'belum'` benar-benar tersimpan. `verifiedByUser`
   tidak pernah diisi. Jika `model.js` kelak mempertahankan properti tambahan, penulisan kedua
   otomatis dilewati.
6. Semua angka dari ucapan tetap melewati pagar: takaran >4 tablet/kapsul atau frekuensi >8 kali
   membuat tombol konfirmasi nonaktif dan `#suara-obat-pagar` (role alert) tampil; pengguna harus
   menyunting manual. Tidak ada pengecualian "karena suara".
7. Cleanup route memanggil `berhenti()`, `terminate()`, `hentikanBacaan()`, dan abort controller.
   Tidak ada audio/transkrip yang ditulis ke storage.

### Verifikasi
- `node --check` keempat berkas: OK (diulang setelah refactor `kenaliSuara`).
- Import ESM di Node: `import('./app/js/ui/isi-suara.js')` berhasil (tidak menyentuh DOM saat impor).
- `#btn-suara-mulai` memakai pintu tunggal `kenaliSuara({mesin,settings,signal,timeoutMs:25000})`
  sesuai 9.4.10, sehingga start/stop/terminate mikrofon ditangani adaptor; tombol Berhenti tetap
  membatalkan lewat `AbortController`. Konfirmasi membuat adaptor terpisah untuk mendengar
  jawaban; bila gagal dibuat, alur tetap berjalan lewat tombol besar.
- Uji pipeline murni dengan contoh SPEC: dikte Captopril → `obatKeMedication` (nama, 12.5 mg,
  2×, 0.5 tablet, sebelum makan, jadwal 07:00/19:00) dan `teksUlangObat` memuat status
  "belum diperiksa pendamping atau apoteker"; `parseDikteVital` 140/90 dan `teksUlangVital`
  benar; `teksUlangJadwal` membacakan status tiap obat.
- Grep seluruh ID DOM wajib 9.4.10 tersedia (termasuk `#suara-pemilih-obat`).

### Di luar owns / belum beres
- `app/js/app.js` `ROUTES` belum memuat `#/suara`, `#/suara/pengaturan`, `#/bantuan-suara`.
  Tombol Pengaturan/Bantuan memakai `ctx.navigate`, tetapi router akan jatuh ke `#/` sampai route
  ditambahkan oleh tugas integrasi/shell.
- `app/js/state.js` `setSettings()` belum menyimpan `settings.suara` (hanya boolean default).
  Layar ini membaca settings dengan aman (fallback offline) tetapi perubahan mesin dari
  Pengaturan Suara belum tentu bertahan.
- `app/css/suara.css` tidak dibuat (di luar owns); tampilan memakai kelas yang ada + style inline
  target sentuh ≥48 px.

### t25 — Pemeriksaan Pendamping (2026-11-09)

Dibuat/diubah hanya di owns: `ui/pemeriksaan.js`, `ui/status-pemeriksaan.js`, serta tambahan
aditif pada `ui/meds.js`, `ui/dashboard.js`, `ui/report.js`.

Asumsi dan keputusan:
1. `status-pemeriksaan.js` mengekspor `badgePemeriksaan`, `barisStatusPemeriksaan`,
   `teksStatusPemeriksaan`, `ariaStatusPemeriksaan`, `ringkasanStatusPemeriksaan`,
   `kelasStatusPemeriksaan`; semuanya memakai `penandaPemeriksaan` (tanpa logika status sendiri).
2. Filter `#pemeriksaan-filter` default `belum`; opsi `belum`/`sudah`/`semua`. Daftar hanya
   memuat medication `active !== false` milik profil aktif, urut nama.
3. Detail selalu dirender (termasuk saat daftar kosong) agar seluruh ID 9.4.11 ada. Bila tidak
   ada obat terpilih, nilai ditampilkan sebagai placeholder dan form dinonaktifkan.
4. Tombol `#btn-pemeriksaan-sahkan` dinonaktifkan untuk obat yang sudah diperiksa; penyimpanan
   ulang tidak menimpa nama pemeriksa. Satu-satunya transisi ke `sudah` adalah
   `tandaiSudahDiperiksa` → `state.upsert('medications', ...)` di layar ini.
5. Setelah simpan, live region diisi `labelPemeriksaan` baru, toast ditampilkan, lalu
   `ctx.refresh()` dipanggil sesuai kontrak. Teks live disimpan di variabel modul agar tetap
   muncul pada render ulang; `pilihanId` juga bertahan melewati refresh.
6. Foto dimuat lewat `state.getSourcePhoto` + `attachmentDataUrl`; kegagalan muat dan tidak
   adanya `source.photoId` sama-sama menampilkan teks "Tidak ada foto resep sumber. Cocokkan
   dengan kemasan/resep asli." di `#pemeriksaan-resep-kosong`.
7. Report membangun peta `id → medication` dari `stateData.medications` karena
   `buildDoctorSummary.activeMedications` tidak membawa `pemeriksaanOrangLain`; baris status
   ditambahkan untuk semua obat aktif, termasuk yang belum.
8. Dashboard mengambil Medication sumber lewat `medicationId` pada DoseLog dan menampilkan baris
   status yang sama di `#dash-today-list`.

Verifikasi: `node --check` kelima berkas lulus; import ESM `pemeriksaan.js` dan
`status-pemeriksaan.js` di Node berhasil; grep memastikan seluruh ID 9.4.11 ada dan kata
"terverifikasi" tidak dipakai untuk status pemeriksaan/suara.

Di luar owns / belum beres:
- `app/js/app.js` `ROUTES` belum memuat `#/pemeriksaan` (dan route suara t22/t26). Tanpa entri
  itu, tautan dari daftar obat/dashboard/ringkasan akan jatuh ke `#/`. Perlu ditambahkan oleh
  tugas shell/integrasi: `'#/pemeriksaan': { title: 'Pemeriksaan Pendamping', module: './ui/pemeriksaan.js' }`.
- `app/css/style.css` belum memiliki `.pemeriksaan-layout`, `.pemeriksaan-source`,
  `.pemeriksaan-field-list`, `.badge-pemeriksaan-belum/sudah`. Layar memakai style inline
  grid responsif agar tetap terbaca; kelas kontrak sudah dipasang dan siap ditata.
- `teksUlangJadwal` sudah menerima `statusPemeriksaan` dari `ui/isi-suara-minum.js` (t22);
  tidak ada perubahan di luar owns yang diperlukan untuk pembacaan status saat jadwal.

### t26 — Aksesibilitas, rute suara, bantuan terdengar, CSS suara (2026-11-09)

Dibuat/diubah hanya di owns: `css/suara.css`, `js/a11y.js`, `js/ui/bantuan-suara.js`, serta
tambahan aditif pada `index.html` dan `js/app.js`.

Asumsi dan keputusan:
1. `a11y.js` mengekspor `umumkan(pesan,{politeness,region,id,root})`, `fokuskan(el,{...})`,
   `pasangLiveRegion({...})`, plus helper `beriLabel`/`labelAria`, `hubungkanLabel`,
   `deskripsikan`, `tandaiError`/`bersihkanError`, `fokusPertama`, `perangkapFokus`,
   `simpanFokus`/`kembalikanFokus`, dan `terapkanPreferensiAksesibilitas`. Tidak ada akses
   storage/jaringan; semua akses `document` terjadi di dalam fungsi sehingga impor aman di Node.
   Pengumuman identik diulang dengan pembeda tak terlihat (`dataset.a11yToggle`).
2. `index.html` menambahkan `<link rel="stylesheet" href="./css/suara.css">` setelah style.css
   dan `#live-region` (role=status, aria-live=polite, aria-atomic=true, `.sr-only`) setelah
   `#toast-region`; toast lama tetap. Tidak ada inline script/onclick baru.
3. `app.js` mendaftarkan tepat empat route kontrak dengan dynamic import dan mempertahankan 11
   route lama. Keempat route juga masuk `SECONDARY_ROUTES` agar tombol "Lainnya" menyala.
   `boot()` memanggil `pasangLiveRegion` untuk memastikan live region global ada.
4. `bantuan-suara.js` merender `<ul id="bantuan-suara-daftar">` dari `daftarBantuan()`; tiap
   `<li>` `tabindex="0"` dan fokusnya terlihat. `#btn-bacakan-bantuan` memanggil
   `bacakan(teksBantuan())`; klik saat berbicara menghentikan bacaan. Bila `ttsTersedia()`
   false atau `TTS_TIDAK_TERSEDIA`, `#bantuan-suara-warning` tetap memuat `DISCLAIMERS_SUARA`
   + teks batas perintah, ditambah "Pembaca suara tidak tersedia; daftar perintah tetap dapat
   dibaca." dan fokus pindah ke peringatan. `#bantuan-kembali` memakai `history.back()` bila ada
   riwayat, selain itu `ctx.navigate('#/suara')`.
5. `suara.css` memakai token lokal `--touch-suara` (48 px) dan `--touch-suara-utama` (56 px;
   64 px saat `is-large-text`), mendefinisikan `.sr-only`, seluruh kelas voice-*/pemeriksaan-*/
   `badge-pemeriksaan-*`, fokus `:focus-visible` tebal, serta aturan `data-contrast="high"`.
   Status tidak bergantung warna: badge memakai ikon ⚠/✓ + teks, peringatan diawali teks
   "Peringatan.", tombol Ya/Tidak memakai ✓/✕ dan teks.
6. Layar lama (`isi-suara.js`, `suara-pengaturan.js`, `pemeriksaan.js`) tidak diubah agar tidak
   meregresi ID/perilaku; mereka sudah memakai live region lokal dan `style` target sentuh.

Verifikasi:
- `node --check` untuk `a11y.js`, `bantuan-suara.js`, `app.js`, `pemeriksaan.js`: lulus.
- Import ESM `app.js`: 15 route, tidak ada route kontrak yang hilang; keempat modul baru
  mengekspor `render` fungsi.
- Grep semua ID 9.4.12 dan seluruh kelas CSS wajib 10.1: ada. `index.html` memuat suara.css,
  toast-region, dan live-region tanpa `onclick`.
- `npm test`: 147 tes lulus, 0 gagal.

Di luar owns / belum beres:
- `app/sw.js` belum memasukkan `./js/a11y.js` ke daftar precache (sudah memuat `suara.css` dan
  `bantuan-suara.js`). Perlu ditambahkan oleh pemilik shell agar offline tetap utuh.
- Bacaan TTS nyata belum diuji di peramban pada run ini (QA t27); fallback tanpa TTS sudah
  diimplementasikan dan tidak melempar error ke layar.
- Tombol "Bantuan suara" di `isi-suara.js` dan tautan dari layar lain sudah menuju route baru,
  tetapi deep-link langsung ke `#/bantuan-suara` yang lalu "Kembali" akan keluar aplikasi bila
  riwayat peramban kosong; fallback `#/suara` dipakai hanya bila `history.length <= 1`.

## t27 — QA fitur suara (tests + verify.sh)

Dibuat:
- `tests/helpers/fake-dom.js` — DOM palsu tanpa dependency (selector engine minimal: tag,
  `#id`, `.class`, `[attr]`, `[attr="v"]`, `:not(...)`, descendant, grup koma), lengkap dengan
  atribut/classList/dataset/style, event click, fokus + `activeElement`, serta helper
  `textOf`/`labelFor`/`accessibleName`/`documentOrder`/`tabbables`/`allElements`.
  `createFakeDom()` memasang `globalThis.document` dan `teardown()` mengembalikannya.
- `tests/suara.test.js` (43 tes) — adaptor + fake engine (normalisasi confidence, SUARA_KOSONG,
  SUARA_TIMEOUT, abort, tanpa storage/jaringan), Web Speech + persetujuan/versi, konfirmasi
  ya/tidak/ambigu (maks. 2 tanya ulang lalu batal, tidak pernah simpan), urutan
  berhenti→TTS→mulai, teks ulang obat/vital/minum/jadwal, perintah navigasi, pemeriksaan,
  pagar dosis.
- `tests/dom-a11y.test.js` — render 9.4.9–9.4.12 ke DOM palsu: ID wajib, label/aria-label tiap
  kontrol, nama aksesibel tombol, `role=status`/`aria-live=polite` dan `role=alert`, urutan
  fokus, tombol "Ya, benar"/"Tidak" 48 px, tidak ada `onclick`/`innerHTML` data pengguna,
  `SpeechRecognition` hanya di `app/js/suara/`, `getUserMedia` hanya jalur kamera/audio.
- `verify.sh` — cek manifest OCR + suara beserta entry/berkas non-kosong (termasuk folder model),
  jalankan seluruh test, start server `PORT=3210`, tunggu `/health` (maks. 30 dtk), smoke curl
  (`/health`, `/`, `/js/app.js`, `/manifest.webmanifest`, manifest OCR, `.wasm` OCR,
  `/vendor/suara/manifest.json` + `runtimeExternalRequests===0`, `vosk.js`, `.wasm` suara),
  404/405/traversal, trap EXIT. Bila aset vendor tidak ada: cetak
  `Jalankan npm install && npm run vendor:ocr && npm run vendor:suara` lalu exit 1.

Asumsi yang diambil:
- Test berjalan tanpa `window`, sehingga `webSpeechTersedia()`/`ttsTersedia()` deterministik
  false; tidak ada jaringan/model nyata. Waktu tetap `new Date(2026, 10, 9, 7, 0, 0)`.
- `verify.sh` menunggu maksimal 30 detik (instruksi tugas); CONTRACT 14.2 menulis ±5 detik.
  Server lokal siap < 1 detik, jadi batas 30 detik tidak memperlambat jalur normal.
- Vendor tidak dijalankan otomatis oleh `verify.sh` (CONTRACT 14.1: instalasi/vendoring adalah
  persiapan terpisah). Bila belum ada, skrip mencetak perintah persiapan dan exit 1.
- Smoke memakai `curl` (instruksi tugas) alih-alih `node -e` seperti contoh CONTRACT 14.2.

Hasil verifikasi:
- `node --check` ketiga berkas test: lulus. `node --test tests/*.test.js`: 190 tes, 0 gagal.
- `bash verify.sh`: exit 0, mencetak `SEMUA VERIFIKASI LULUS` (termasuk MIME `.wasm` suara dan
  traversal).

Ketidaksesuaian kontrak yang ditemukan (TIDAK diperbaiki karena bukan berkas t27):
- CONTRACT 8B.4 menyebut `WEB_SPEECH_CONSENT_VERSION` diekspor `app/js/suara/webSpeech.js`.
  Implementasi mengekspornya dari `app/js/suara/mesin.js` dan `persetujuan.js`; `webSpeech.js`
  hanya mengekspor `WEB_SPEECH_LANG`, `webSpeechTersedia`, `buatWebSpeechEngine`. Test memakai
  ekspor dari `mesin.js`.
- CONTRACT 8B.5 (baris aturan) menyatakan `teksUlangVital` = label, nilai, satuan, tanggal/jam,
  catatan (tanpa status), dan `teksUlangMinum` memuat status. Namun daftar wajib test di
  CONTRACT 14.2 (sekitar baris 3375) menyebut `teksUlangVital` juga memuat status pemeriksaan.
  Implementasi `teksUlangVital` mengikuti 8B.5 (tanpa status); test mengikuti 8B.5 dan tidak
  menuntut status pada Vital. Perlu keputusan pemilik kontrak bila checklist 14.2 yang dimaksud.
- `#suara-pemeriksaan-status` sengaja `hidden` dan kosong saat render awal (baru diisi setelah
  ada entri); test memeriksa keberadaan + keadaan awal, bukan teks "Belum diperiksa".

Belum beres:
- Bacaan TTS dan pengenalan suara nyata tidak diuji di peramban (sesuai batasan tanpa model
  nyata); hanya perilaku adaptor/TTS dengan fake.
- `public/vendor/suara` saat ini berisi model placeholder (`model.available: false`, 544 byte);
  `verify.sh` hanya memastikan berkas ada/non-kosong, bukan kualitas model.

## t30 — kosakata tertutup & pencocok jawaban (8B.12)
Dibuat: `app/js/logic/kosakataTertutup.js`, `app/js/logic/pencocokJawaban.js`.
Asumsi yang diambil (tidak mengubah kontrak):
- `HasilCocok.pilihan` diisi 0..3 entri kandidat `{ nilai, label, skor }` (sama seperti
  `kandidat`), mengikuti komentar bentuk di 8B.12.2.
- Larangan memaksa (aturan 7) diperkuat dengan penjaga lintas-pertanyaan: (a) jawaban yang
  persis sama dengan sinonim/label pertanyaan lain ditolak, (b) jawaban tak-murni-angka yang
  hanya memuat penanda pertanyaan lain (mis. `kali`, `tablet`, `pagi`, `makan`, `perlu`) ditolak.
  Angka murni (`'2'`, `'dua'`, `'1,5'`) tetap diterima untuk `frekuensi`/`takaran`.
- `cocokkanBanyak`: potongan duplikat (mis. `'pagi dan pagi'`) ditolak sebagai
  `tidak-cocok` karena aturan mensyaratkan nilai berbeda; tidak ada alasan baru di luar enum,
  dipakai `di-bawah-ambang`.
- Kasus ambigu terverifikasi lewat pencarian varian salah ketik (mis. `'sebelam makan'` →
  ambigu sebelum/sesudah, `'ekali'` → ambigu frekuensi); korpus lengkap tetap milik t34.

## t29 backend — Whisper offline, penjaga ASR, adaptor, MIME server

Berkas yang diubah/dibuat: `app/js/suara/whisperEngine.js` (baru),
`app/js/suara/penjagaAsr.js` (baru), `app/js/suara/offlineEngine.js` (kini alias
`export * from './whisperEngine.js'`), `app/js/suara/adaptor.js`, `server.js`.

Asumsi/verifikasi:
- `periksaDurasi` menolak durasi negatif/NaN dengan kode `ASR_TERLALU_LAMA`
  (signature kontrak hanya mengizinkan `null | 'ASR_TERLALU_LAMA'`); pesannya
  "Durasi rekaman tidak valid.".
- `periksaHasilAsr` menganggap `durasiMs` yang tidak disertakan sebagai 0
  (tidak diketahui, bukan terlalu lama) agar engine tanpa durasi tidak salah tolak;
  nilai negatif/NaN eksplisit tetap ditolak.
- Adaptor memakai `durasiMs` dari engine bila ada, selain itu mengukur waktu
  `recognize`; durasi ini adalah durasi rekam, bukan waktu muat model/inferensi.
  Batas `maksDurasiMs` diteruskan ke `engine.recognize`.
- Teks kosong tetap `SUARA_KOSONG` sebelum penjaga keluaran (sesuai 8B.2 dan tes t18);
  keluaran berulang/terlalu panjang/rasio huruf rendah -> `ASR_TIDAK_TERDENGAR` /
  `ASR_BERULANG`, `durasi > maks + 500` -> `ASR_TERLALU_LAMA`.
- `statusModel` menerima `files[]` berisi string maupun `{path,bytes}`, dengan path
  relatif (`config.json`), `Xenova/whisper-base/...`, atau
  `models/Xenova/whisper-base/...`; manifest tanpa `engine:'whisper'`/id model yang
  benar dianggap `tidak-ada`.
- `server.js` menambahkan `.onnx -> application/octet-stream`; `.wasm`, `.mjs`,
  header keamanan, dan aturan traversal yang sudah ada dipertahankan.
- `app/sw.js` sudah memuat `whisperEngine.js`, `penjagaAsr.js`, `offlineEngine.js`
  di PRECACHE (bukan berkas owns t29; tidak diubah).
- Bergantung pada t28: `public/vendor/suara/{transformers,onnx,models}` + manifest
  Whisper belum ada di workspace saat t29 dikerjakan (masih aset Vosk lama), jadi
  pemuatan model nyata belum dapat diuji; `statusModel` akan melaporkan `tidak-ada`
  sampai `npm run vendor:whisper` dijalankan.

## Catatan t28 (DevOps — Vendor Whisper)

Dibuat/diubah: `scripts/vendor-whisper.mjs` (baru), `package.json`, `app/sw.js`, `README.md`;
`scripts/vendor-suara.mjs` dan seluruh isi lama `public/vendor/suara/` (vosk, model-id,
PLACEHOLDER, manifest Vosk) dihapus. Hasil vendoring: 17 entri manifest (12 model + module +
4 WASM termasuk dua varian `.jsep.*` opsional), model q8 total 81.265.296 byte.

Asumsi:
- Skrip membangun ke folder staging lalu mengganti `public/vendor/suara/` secara atomik, sehingga
  artefak asing tidak pernah tersisa dan kegagalan unduhan tidak menghapus hasil lama.
- Versi `onnxruntime-web` yang dipakai adalah dependensi `@huggingface/transformers@4.3.2`
  (1.31.0-dev…); resolusi package.json dilakukan dengan menaiki direktori dari entry point karena
  paket membatasi subpath `./package.json`.
- Bila `HTTPS_PROXY`/`HTTP_PROXY` diatur (lingkungan CI ini), skrip menjalankan ulang Node dengan
  `--use-env-proxy` agar `fetch` build-time melewati proxy. Tanpa proxy, tidak ada re-exec.
- `WHISPER_MODEL_SOURCE` divalidasi harus memuat tepat 12 berkas model; bila tidak, unduhan
  build-time dipakai (kecuali `WHISPER_ALLOW_DOWNLOAD=0`). Setiap URL dan redirect divalidasi
  terhadap allowlist host.
- `public/vendor/` dan `package-lock.json` kini ikut ter-commit oleh commit t30 (bukan oleh t28);
  t28 tidak menambah aturan `.gitignore`.

Perlu tindak lanjut di luar OWNS t28:
- `verify.sh` (milik t27/t34) masih memakai `npm run vendor:suara` dan `entry.wasm`; harus
  diperbarui ke `vendor:whisper`, `entry.wasmPath`, 12 berkas model, dan smoke test
  transformers/ONNX/`.onnx` sesuai CONTRACT 14.2.
- `app/js/suara/adaptor.js` (milik t29) masih menyebut "Vosk" di komentar kepala berkas;
  ganti agar grep statis bersih.

Verifikasi t28 (dijalankan): `npm install` OK; `npm run vendor:whisper` OK (unduh build-time 12
berkas, manifest 17 entri, model 81.265.296 byte); dijalankan ulang dengan
`WHISPER_MODEL_SOURCE` lokal -> idempoten tanpa jaringan; host terlarang ditolak (exit 1) dan
folder lama tetap utuh; `npm test` 190/190 lulus; PRECACHE `app/sw.js` identik dengan daftar
CONTRACT 11.2. Sisa grep lama hanya di `verify.sh` (milik t34) seperti dicatat di atas.

## t33 — integrasi alur tanya + TTS obat

Dibuat/diperbarui (hanya OWNS t33):
- `app/js/suara/ttsTanya.js`: `PERTANYAAN_TANYA_TEKS` (lima pertanyaan persis), `teksPertanyaan`,
  `teksPilihan`, `teksNamaDariDaftar`, `teksEjaan`, `teksKonfirmasiTanya`,
  `bacakanPertanyaan`/`bacakanTeksTanya` memakai `bacakan` + `hentikanBacaan`.
- `app/js/suara/alurTanya.js`: `jalankanTanyaSatuPerSatu` + re-export
  `bangunMedicationDariSesi`; urutan `berhenti` → TTS → `mulai` → `kenali` (maks. 8 detik);
  kegagalan guard/ASR dihitung gagal paham; konfirmasi wajib 8B.6; hanya `simpan` memanggil
  `selesaikanSesi` + `state.upsert`.
- `app/js/ui/isi-suara-obat.js`: panel obat menjadi pintu masuk `#/suara/tanya`; tidak ada dikte
  bebas, tidak ada simpan/konfirmasi lokal; field lama hanya ringkasan/sunting pendamping.
- `app/js/ui/isi-suara.js`: konfirmasi lokal hanya vital/minum; mode obat tidak memulai ASR.

Asumsi:
- Layar `#/suara/tanya` milik t32 belum ada di run ini; tombol hanya menavigasi ke rute tersebut.
  `app.js` (milik t32) perlu mendaftarkan rute `#/suara/tanya` → `ui/tanya-suara.js`.
- Agar tes lama `dom-a11y` (yang mengharapkan `#btn-suara-mulai` tetap ada di urutan Tab pada mode
  awal obat) tetap lulus, tombol diberi `aria-disabled="true"` + guard klik, bukan properti
  `disabled` native. Secara fungsi tombol tidak memulai mikrofon di mode obat.
- `mintaJawaban`/`mintaNama` adalah opsi tambahan (tidak mengubah bentuk hasil kontrak) untuk
  tombol/ketikan; bila `mintaJawaban` diberikan, konfirmasi memakai jalur tombol, jika tidak
  memakai `jalankanKonfirmasiSuara`.
- Sumber nama pada panel obat tersimpan sebagai pilihan UI; kontrak tidak mendefinisikan
  parameter rute untuk meneruskannya ke layar tanya.

Verifikasi t33: `node --check` keempat berkas OK; `npm test` 190/190 lulus; smoke test manual
(fake adaptor/tts/state) memastikan TTS dibacakan sebelum `mulai`, `writes=1` hanya pada
`simpan`, `ulangi`/`batal` = 0 tulisan, `bilaPerlu:true` → `times: []`, dan Medication memuat
`name`, `instructions`, `times`, `stock.unitsPerDose`, `source:null`, `dibuatDengan/
dikonfirmasiDengan:'suara'`, `pemeriksaanOrangLain.status:'belum'`.

## t34 — QA Whisper + tanya satu per satu

Dibuat/diperbarui (hanya OWNS t34):
- `tests/fixtures/tanya-cases.js` — korpus 96 jawaban realistis: varian salah dengar
  (`Dua Kalisahari`→2, `Semelum`→sebelum, `sahurabla`→tidak-cocok), `dua kali sehari`/`2 kali`,
  `setengah`/`satu setengah`/`dua koma lima`, `pagi dan malam`, `sebelum tidur`,
  `kalau perlu`/`tidak perlu`, 12 negatif lintas-pertanyaan, dan 5 kasus ambigu.
- `tests/tanya.test.js` — korpus + validasi nilai selalu di `pilihan` + determinisme; mesin
  keadaan nama menolak ASR, lima langkah maju, gagal maks. 2 lalu tombol, tombol/ketikan
  menyelesaikan, ringkasan lengkap + "belum diperiksa", `selesaikanSesi` hanya setelah lengkap,
  bentuk Medication (source null, unitsPerDose, times [] bila PRN), pagar > 4 tablet / > 8 kali;
  pemilih nama daftar/pindai/ketik/ejaan/read-back; `alurTanya` fake adaptor/TTS/state (urutan
  berhenti→TTS→mulai→kenali, guard dihitung gagal, upsert hanya saat simpan, ulangi/batal tanpa
  tulisan); lima pertanyaan TTS persis.
- `tests/penjaga-asr.test.js` — 8000 vs 8501, kosong/terlalu panjang, pengulangan
  `2.2.2.2...`/`bla bla...`, rasio huruf, angka pendek, `periksaHasilAsr`, `ringkasTolakAsr`,
  serta integrasi adaptor yang menolak keluaran palsu dan durasi > 8500.
- `tests/whisper-integration.test.js` — skip jelas bila model/transformers tidak ada; bila ada,
  memuat pipeline q8 dari `public/vendor/suara/models`, transkripsi Float32Array 1 detik,
  `fetch` host eksternal dilarang; `statusModel` fake fetch siap/belum/tidak-ada.
- `verify.sh` — cek OCR + manifest Whisper (engine/ID/q8/runtimeExternalRequests 0/entry),
  12 berkas model + transformers + 2 ONNX WASM non-kosong, artefak/placeholder, grep ASR lama,
  `node --test`, smoke `/health`/statis/vendor/transformers/ONNX dengan MIME
  `.wasm → application/wasm` dan `.onnx → application/octet-stream`, path lama/unknown 404,
  lalu mencetak `SEMUA VERIFIKASI LULUS`.

Asumsi & catatan:
- Kasus ambigu dipilih dari keluaran deterministik pencocok yang sudah ada (`kali sehari`,
  `skali`, `6 tablet`, `lima setengah`, `iya perlu`); tidak ada pemaksaan nilai.
- Pagar > 4 tablet / > 8 kali diuji dengan menyalin sesi lengkap dan mengganti `jawaban`
  (kosakata tertutup memang mencegah nilai itu lewat UI), sesuai bunyi kontrak 8B.13 butir 10.
- `whisper-integration.test.js` memanggil `muatModel({ modelPath: <absolut> })` karena default
  web `/vendor/suara/models/` tidak dapat dibaca filesystem Node; `env.allowRemoteModels=false`
  tetap dikunci dan `fetch` eksternal dipatch agar melempar.
- Pola grep di `verify.sh` dipecah (`"vos""k"`, `vendor[:-]sua""ra`) supaya skrip verifikasi
  sendiri tidak cocok dengan pola yang dicarinya.
- Tidak ada perubahan kode aplikasi. Tidak ditemukan kegagalan aplikasi.

Verifikasi yang dijalankan:
- `npm test` → 247/247 lulus; integrasi Whisper nyata ikut berjalan (± 2,3 detik, tanpa unduhan).
- `bash verify.sh` → seluruh langkah lulus dan mencetak `SEMUA VERIFIKASI LULUS`.
- Uji skip integrasi dijalankan secara logis lewat cek keberadaan model/transformers; pesan skip
  persis menyebut `npm run vendor:whisper`.
