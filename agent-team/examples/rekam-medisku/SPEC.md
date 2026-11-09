# Rekam Medisku — Spesifikasi Produk (SPEC)

> **Rekam Medisku** — *Rekam medis pribadi, tenang di perangkatmu.*
> Aplikasi web kesehatan pribadi berbahasa Indonesia yang menyimpan rekam medis dan obat
> pemiliknya **hanya di perangkat**, agar mudah ditemukan saat kontrol ke dokter maupun saat darurat.

Versi dokumen: 1.1 · Tanggal: 9 November 2026 · Status: siap dieksekusi
Revisi 1.1: menambahkan pemindaian resep/etiket dan rekam medis rumah sakit dari foto dengan
OCR lokal, penerjemah resep deterministik, alur verifikasi manusia wajib, dan penyimpanan foto sumber.

---

## 1. Masalah & Tujuan

Saat kontrol ke dokter atau saat darurat, pemilik sering lupa membawa riwayat kunjungan, daftar
obat, dosis, alergi, dan nilai tensi/gula darah terakhir. Catatan tersebar di kertas, foto, dan
ingatan. Aplikasi rumah sakit biasanya menuntut akun dan menyimpan data di cloud.

**Tujuan produk:**

1. Menjadi satu tempat yang cepat dibuka untuk menyimpan profil kesehatan, linimasa kunjungan,
   daftar obat + jadwal minum, serta hasil lab/tanda vital.
2. Menyiapkan **Ringkasan Satu Halaman** dan **Kartu Darurat** yang bisa ditunjukkan/dicetak
   saat kontrol atau darurat.
3. Menjaga privasi mutlak: tanpa akun, tanpa cloud, tanpa pelacak, tanpa request eksternal;
   data hanya di IndexedDB/localStorage; enkripsi opsional dengan kata sandi.
4. Tetap bisa dipakai **offline** setelah kunjungan pertama (PWA).
5. Menjaga batas keselamatan: bukan alat medis, tidak mendiagnosis, tidak menyarankan dosis,
   tidak mengklaim basis data interaksi obat.
6. Membantu membaca dokumen kesehatan yang sudah dimiliki pengguna: foto resep/etiket dan
   dokumen rekam medis rumah sakit diproses dengan **OCR lokal di browser**, diterjemahkan
   deterministik, lalu **wajib ditinjau dan dicocokkan manusia** sebelum masuk daftar obat,
   linimasa, atau hasil lab.

**Pengguna utama:** individu dewasa/lansia yang mengelola penyakit kronis, serta anggota keluarga
yang merawat orang lain (multi-profil).

---

## 2. Prinsip Produk

- **Lokal & privat secara default.** Tidak ada endpoint data di server. Server hanya menyajikan
  berkas statis (termasuk aset OCR yang di-vendor). Tidak ada analytics, font/CDN eksternal,
  telemetri, atau layanan visi/AI eksternal.
- **Jujur tentang batas.** Setiap pemeriksaan otomatis adalah pembandingan deterministik atas data
  yang dimasukkan pengguna. Selalu ada disclaimer + saran konsultasi tenaga kesehatan.
- **Cepat saat panik.** Layar Darurat dan Ringkasan Dokter maksimal dua ketukan dari beranda.
- **Ramah lansia.** Mobile-first, target sentuh ≥ 48 px, kontras tinggi, mode huruf besar,
  label eksplisit, tanpa gestur tersembunyi.
- **Sedikit dependency.** Vanilla JavaScript (ES modules), Node.js murni. Satu-satunya dependency
  adalah paket OCR yang **di-vendor** ke `public/vendor` pada waktu build; runtime tidak memuat
  apa pun dari internet.
- **Manusia memutuskan.** Hasil OCR, terjemahan resep, dan parser rekam medis adalah **draf**.
  Tidak ada yang disimpan otomatis. Pengguna harus mencocokkan dengan dokumen asli dan mencentang
  pernyataan verifikasi sebelum data masuk.
- **Data milik pengguna.** Ekspor cadangan kapan saja, termasuk cadangan terenkripsi.

---

## 3. Ruang Lingkup MVP

### 3.1 Fitur inti (wajib)

| # | Fitur | Isi minimum |
|---|-------|-------------|
| F1 | **Profil pemilik** | Nama, tanggal lahir, jenis kelamin, golongan darah, alergi, penyakit kronis, kontak darurat, dokter/faskes langganan, catatan. Mendukung **beberapa profil keluarga** dengan pengalih profil aktif. |
| F2 | **Rekam medis / linimasa kunjungan** | Tanggal, dokter, faskes, keluhan, diagnosis **yang ditulis pemilik** (label jelas), catatan, lampiran foto/berkas kecil (maks. 1 MiB per berkas, maks. 10 per kunjungan). Urut terbaru. |
| F3 | **Daftar obat + jadwal** | Nama, bahan aktif, dosis, aturan minum, jam minum, hari dalam seminggu, tanggal mulai/selesai, stok (tablet/kapsul/ml), unit per dosis, pengingat tebus ulang. Daftar "Hari Ini" + tombol **Sudah diminum** / **Lewati**. |
| F4 | **Vital & lab** | Tensi (sistolik/diastolik), gula darah, berat, suhu, nadi, SpO₂; hasil lab bernama bebas dengan nilai, satuan, rentang acuan. Daftar + grafik tren SVG. |
| F5 | **Beranda** | Ringkasan profil aktif, obat hari ini, kepatuhan minggu ini, vital terakhir, peringatan stok, pintasan ke Darurat, Ringkasan Dokter, dan **Pindai Dokumen**. |
| F6 | **Pindai resep/etiket obat** | Foto dari kamera atau unggahan, OCR lokal Tesseract.js (Indonesia+Inggris) yang di-vendor, penerjemah singkatan resep deterministik, jadwal jam bawaan, layar Tinjau wajib, simpan foto sumber + teks OCR + terjemahan + penanda verifikasi. Jalur setara **Ketik/Tempel teks resep** untuk tulisan tangan yang gagal dibaca. |
| F7 | **Pindai rekam medis & hasil lab RS** | OCR lokal dokumen rumah sakit, parser tanggal kunjungan/faskes/dokter/diagnosis yang tertulis, dan baris lab (nama-nilai-satuan-rujukan) menjadi **draf** entri linimasa + hasil lab. Draf wajib ditinjau dan disunting sebelum disimpan. |

### 3.2 Fitur canggih pilihan (9 fitur, melebihi minimum 6)

| # | Fitur | Nilai & perilaku |
|---|-------|------------------|
| A1 | **Ringkasan Satu Halaman untuk Dokter** | Halaman cetak (A4) berisi profil, alergi, penyakit kronis, obat aktif + jadwal, tren vital/lab terakhir dengan penanda rentang, 5 kunjungan terakhir, kepatuhan minggu ini, dan **daftar pertanyaan kontrol** yang dibuat otomatis dari data. Tombol Cetak/Simpan PDF memakai `window.print()`. |
| A2 | **Kartu Darurat ber-QR** | Kartu yang dapat dicetak + QR berisi teks darurat ringkas (nama, golongan darah, alergi, penyakit kronis, kontak darurat, obat aktif, nomor 112/119). QR dapat dibaca kamera biasa **tanpa aplikasi**. Ada peringatan privasi karena teks terbaca. |
| A3 | **Prediksi stok habis & pengingat tebus ulang** | Simulasi deterministik dari jadwal + stok: tanggal perkiraan habis, tanggal ideal menebus (habis − pengingat hari), status "perlu tebus". Disclaimer bahwa perkiraan bergantung data yang diisi. |
| A4 | **Kepatuhan minum per minggu** | Persentase = diminum ÷ (diminum + dilewati + terlewat) untuk dosis yang sudah jatuh tempo; grafik batang 8 minggu; label kualitatif. Dosis tanpa catatan setelah masa tenggang dihitung terlewat. |
| A5 | **Deteksi duplikasi bahan aktif** | Normalisasi teks (huruf kecil, NFKC, buang tanda baca) lalu kelompokkan obat **aktif** dengan bahan aktif sama dalam satu profil. Ini **bukan** pemeriksaan interaksi obat; batas dijelaskan di UI. |
| A6 | **Penanda di luar rentang acuan milik pengguna** | Rentang sistolik, diastolik, gula darah, berat, nadi, suhu, SpO₂, dan lab bernama diatur sendiri oleh pemilik/dokter. Nilai ditandai rendah/normal/tinggi; bukan diagnosis. |
| A7 | **Cadangan & pemulihan terenkripsi** | Ekspor berkas `.rawatku.json` (opsional dilindungi kata sandi AES-GCM) dan impor dengan mode ganti. Lampiran ikut di dalam cadangan. Foto sumber OCR disimpan terpisah dan tidak ikut cadangan JSON pada versi ini (UI wajib menjelaskan). |
| A8 | **Mode huruf besar + kontras tinggi** | Pengaturan global yang memperbesar basis font dan menaikkan kontras; tersimpan di perangkat. |
| A9 | **Multi-profil keluarga** | Tambah, ganti, dan hapus profil. Data setiap profil terpisah; menghapus profil menghapus seluruh data terkait (dengan konfirmasi). Minimal satu profil harus tetap ada. |

Pengingat minum obat disediakan **di dalam aplikasi**: daftar dosis hari ini, sorotan dosis yang
waktunya tiba, serta pencatatan diminum/lewati. Tidak ada push notification latar belakang dan
tidak ada pengingat dari server.

### 3.3 Di luar cakupan (non-goals)

- Diagnosis, triase, saran dosis, penyesuaian dosis, atau klaim interaksi obat.
- Basis data obat/farmakologi, pencarian obat otomatis, atau integrasi resep/faskes.
- Akun, sinkronisasi cloud, berbagi via server, email/SMS, atau pelacakan analytics.
- Aplikasi native, backend API data, atau multi-perangkat.
- Push notification latar belakang, wearable integration.
- **OCR berbasis cloud/AI visi, pengiriman foto/teks ke layanan luar, atau penyimpanan otomatis
  hasil OCR tanpa verifikasi manusia.** Titik ekstensi cloud hanya boleh berupa dokumentasi
  nonaktif di CONTRACT.md dan kelak wajib persetujuan eksplisit pengguna.
- Jurnal gejala khusus, imunisasi, kehamilan, dan modul lain di luar daftar di atas.

---

## 4. Alur Pengguna

### 4.1 Pertama kali
1. Buka `http://localhost:3000` → beranda kosong dengan ajakan mengisi profil.
2. Isi nama, golongan darah, alergi, penyakit kronis, kontak darurat, dokter.
3. (Opsional) tambah anggota keluarga dari menu Profil.
4. (Opsional) aktifkan kata sandi di Pengaturan → data disimpan terenkripsi.

### 4.2 Mencatat kunjungan
Beranda → **Kunjungan** → **Tambah kunjungan** → isi tanggal, dokter/faskes, keluhan,
diagnosis (ditulis sendiri), catatan → lampirkan foto/PDF kecil → simpan. Muncul di linimasa.

### 4.3 Mengelola obat & minum
**Obat** → **Tambah obat** → isi nama, bahan aktif, dosis, aturan, jam, hari, periode, stok.
Saat menyimpan, jika ada bahan aktif sama dengan obat aktif lain, muncul peringatan duplikasi
(disertai disclaimer). Di **Hari Ini**, tekan **Sudah diminum** atau **Lewati**. Stok berkurang
secara konseptual; kartu stok menampilkan perkiraan habis dan tanggal tebus.

### 4.4 Mencatat vital/lab
**Vital** → pilih jenis → isi nilai/tanggal → simpan. Atur rentang acuan per metrik/lab.
Grafik menampilkan garis tren, batas rentang, dan penanda nilai di luar rentang.

### 4.5 Kontrol ke dokter
Beranda → **Ringkasan Dokter** → tinjau pertanyaan kontrol → **Cetak / Simpan PDF** →
bawa hasil cetak. Ringkasan dibuat ulang dari data terbaru saat halaman dibuka.

### 4.6 Darurat
Beranda → **Darurat** (atau tautan cepat) → tampil kartu dengan 112/119, alergi, obat aktif,
kontak darurat, dan QR. Tombol Cetak. Peringatan privasi ditampilkan.

### 4.7 Cadangan, kunci, dan offline
- **Pengaturan → Cadangan**: ekspor `.rawatku.json` (boleh berpassword) / impor.
- **Pengaturan → Keamanan**: pasang/ubah/hapus kata sandi; tombol **Kunci** di header.
- Setelah dibuka sekali, service worker menyimpan app shell; aplikasi tetap berfungsi offline.
- Muat ulang saat terkunci → layar kata sandi; salah kata sandi → pesan jelas (data tidak rusak).

### 4.8 Memindai resep/etiket obat (alur wajib)
1. Beranda → **Pindai** (atau menu Lainnya) → `#/pindai`.
2. Pilih **Foto** atau **Ketik/Tempel teks resep**.
   - Foto: kamera belakang atau unggah JPEG/PNG/WebP. Aplikasi mengompres foto lalu menjalankan
     OCR lokal. Tidak ada unggahan ke server/layanan luar.
   - Teks: tempel/ketik teks resep; pratinjau terjemahan tampil langsung. Jalur ini setara dan
     wajib tersedia karena tulisan tangan dokter sering gagal dibaca OCR.
3. Sistem menampilkan teks OCR mentah, tingkat kepercayaan, dan terjemahan per obat.
4. Tekan **Tinjau** → `#/tinjau`. Layar menampilkan foto asli berdampingan dengan hasil.
   Setiap bidang (nama, kekuatan, bentuk, frekuensi, takaran, aturan makan, durasi, jumlah,
   jam) bisa disunting. Bagian berkepercayaan rendah atau tidak dipahami disorot.
5. Pengguna **wajib mencentang "Saya sudah mencocokkan dengan resep asli"**. Tanpa centang,
   tombol simpan tetap nonaktif dan tidak ada data yang ditulis.
6. Setelah simpan: foto sumber (terkompresi), teks OCR mentah, teks terjemahan, `verifiedByUser`,
   dan `verifiedAt` disimpan terkait obat. Jadwal jam bawaan (mis. 3× sehari → 07:00, 13:00,
   19:00) dapat diubah dan langsung dipakai modul jadwal + stok yang ada.
7. Peringatan permanen: hasil bisa salah; kesalahan membaca dosis berbahaya; cocokkan dengan
   apoteker/dokter. Batal → draf dibuang, tidak ada yang tersimpan.

### 4.9 Memindai rekam medis & hasil lab rumah sakit
1. `#/pindai` → mode **Rekam medis RS** → foto/unggah dokumen atau tempel teks.
2. Parser menghasilkan **draf**: tanggal kunjungan, faskes, dokter, diagnosis yang tertulis
   (disalin apa adanya, bukan dibuat aplikasi), dan hasil lab sebagai pasangan
   nama–nilai–satuan–rujukan.
3. Layar Tinjau menampilkan dokumen asli + semua bidang yang dapat disunting, termasuk baris lab
   yang berkepercayaan rendah.
4. Setelah centang verifikasi, draf disimpan sebagai entri linimasa dan hasil lab. Tanpa centang,
   tidak ada yang disimpan.

### 4.10 Batas privasi pemindaian
- OCR berjalan 100% di browser memakai berkas WASM + data bahasa yang disajikan same-origin dari
  `/vendor/`. Tidak ada `fetch` ke domain eksternal.
- Foto sumber disimpan di IndexedDB terpisah; bila kata sandi aktif, isi foto dienkripsi dengan
  kunci sesi AES-GCM. Metadata (mime/ukuran) tetap plaintext agar dapat ditampilkan.
- Titik ekstensi OCR cloud **tidak diimplementasikan** dan hanya didokumentasikan di CONTRACT.md;
  penggunaannya kelak wajib persetujuan eksplisit dan tidak boleh menjadi default.

---

## 5. Stack Teknologi

| Lapisan | Pilihan | Alasan |
|---------|---------|--------|
| UI | HTML + CSS + **vanilla JS ES modules** | Tanpa framework/build; mudah diaudit; cepat di HP. |
| Server | **Node.js murni** (`http`, `fs`, `path`) | Menyajikan `app/` di `/` dan aset OCR di `/vendor/`; port 3000. |
| Penyimpanan | **IndexedDB** (utama) + fallback `localStorage` + memori | Satu record "vault" JSON; lampiran base64 di dalamnya. |
| Foto sumber OCR | **IndexedDB terpisah** (`rawatku-photos`) | Tidak membengkakkan vault; terenkripsi saat mode kata sandi aktif. |
| Enkripsi | **Web Crypto**: PBKDF2-SHA256 (310.000 iterasi) + AES-GCM-256 | Tersedia di browser modern dan Node ≥ 20 untuk pengujian. |
| OCR | **Tesseract.js** + data `ind` & `eng`, di-vendor via npm ke `public/vendor` | Offline, tanpa layanan luar; WASM disajikan `application/wasm`. |
| Penerjemah resep | **Modul JS murni deterministik** | Dapat diuji `node:test` dengan 40+ contoh; tanpa AI. |
| Parser rekam medis/lab | **Modul JS murni deterministik** | Menyalin teks, bukan mendiagnosis; dapat diuji. |
| Grafik | **SVG murni** dibangun oleh fungsi JS | Tanpa library, aksesibel, tajam. |
| QR | **Encoder QR murni** (Model 2, byte mode, EC M, versi 1–10) | Tanpa library/CDN; dapat diuji di Node. |
| PWA | `manifest.webmanifest` + service worker cache-first same-origin | Offline; aset vendor di-cache saat dipakai. |
| Test | **`node:test`** + `node:assert/strict` | Tanpa dependency test; verify.sh menjalankan semua. |

**Dependency build:** `tesseract.js`, `@tesseract.js-data/ind`, `@tesseract.js-data/eng` hanya
dipasang untuk `npm run vendor:ocr`. Runtime memakai salinan di `public/vendor`; pengguna cukup
menjalankan `npm install && npm run vendor:ocr` sekali sebelum memakai OCR.

**Persyaratan runtime:** Node.js ≥ 20, browser modern (Chrome/Edge/Firefox/Safari terbaru)
dengan IndexedDB, Web Crypto, WebAssembly, Worker, dan service worker (localhost dianggap secure
context). Bila WebAssembly/Worker tidak tersedia, jalur **Ketik/Tempel teks** tetap berfungsi dan
jalur foto menampilkan pesan yang jelas.

---

## 6. Privasi, Keamanan, dan Data

- **Tanpa akun & tanpa cloud.** Semua data di perangkat. Server tidak memiliki endpoint baca/tulis
  data dan tidak mencatat isi permintaan.
- **Tanpa request eksternal.** CSP: `connect-src 'self'`, `worker-src 'self' blob:`,
  `script-src 'self' 'wasm-unsafe-eval'`; aset hanya same-origin; tidak ada font, ikon, skrip,
  atau gambar dari domain lain. Service worker tidak menyentuh cross-origin.
- **OCR lokal.** Berkas inti WASM dan data bahasa Indonesia+Inggris disalin dari paket npm ke
  `public/vendor`; tidak ada panggilan ke API visi/AI. Titik ekstensi cloud nonaktif dan tidak
  diimplementasikan.
- **Verifikasi manusia.** Hasil OCR/terjemahan/parser tidak pernah disimpan otomatis. Penyimpanan
  hanya terjadi setelah pengguna menyunting dan mencentang pernyataan pencocokan.
- **Enkripsi opsional.** Bila kata sandi dipasang, vault di IndexedDB/localStorage disimpan sebagai
  ciphertext AES-GCM; kunci diturunkan dari kata sandi via PBKDF2 + salt acak dan hanya ada di
  memori selama sesi terbuka. Isi foto sumber juga dienkripsi dengan kunci sesi. Kunci manual dan
  muat ulang mengunci aplikasi. Cadangan dapat dienkripsi terpisah dengan kata sandi.
- **Konsekuensi lupa kata sandi:** data tidak dapat dipulihkan. Peringatan wajib tampil sebelum
  mengaktifkan enkripsi.
- **Lampiran** disimpan base64 di dalam vault (maks. 1 MiB/berkas, 10 berkas/kunjungan) dan ikut
  terenkripsi saat mode kata sandi aktif.
- **Foto sumber OCR** disimpan terpisah di IndexedDB (`rawatku-photos`), maks. 2 MiB setelah
  kompresi, terenkripsi saat kata sandi aktif. Cadangan JSON v1 tidak menyertakan byte foto;
  UI wajib menjelaskan bahwa foto sumber tidak ikut cadangan.
- **Kartu Darurat** sengaja berisi teks biasa agar terbaca tanpa aplikasi; UI wajib memperingatkan
  bahwa siapa pun yang memindai QR dapat membaca data tersebut.
- **Berbagi perangkat:** aplikasi tidak bisa mencegah pengguna lain membuka aplikasi yang tidak
  terkunci; kata sandi disarankan.

---

## 7. Batas Keselamatan (wajib diimplementasikan)

1. Aplikasi **bukan alat medis** dan tidak menggantikan tenaga kesehatan.
2. **Dilarang** mendiagnosis, menyarankan dosis, mengubah dosis, atau mengklaim basis data
   interaksi obat.
3. Pemeriksaan otomatis hanya deterministik dan transparan:
   - duplikasi **bahan aktif** berdasarkan teks yang dimasukkan pengguna (bukan interaksi);
   - nilai di luar **rentang acuan yang diatur pengguna/dokter** (bukan diagnosis);
   - aritmetika jadwal, stok, dan kepatuhan dari data pengguna;
   - terjemahan singkatan resep dan penyalinan teks dokumen (bukan rekomendasi).
4. **OCR dan parser bisa salah.** Terutama tulisan tangan. Setiap layar pindai menampilkan
   peringatan bahwa kesalahan membaca dosis berbahaya dan hasil harus dicocokkan dengan
   apoteker/dokter.
5. **Tidak ada penyimpanan otomatis.** Hasil OCR/terjemahan/parser hanya menjadi draf di memori.
   Tombol simpan nonaktif sampai checkbox "Saya sudah mencocokkan dengan resep asli" dicentang.
6. Setiap peringatan menampilkan batasnya dan menyarankan konsultasi dokter/apoteker.
7. Layar Darurat dan footer menampilkan **112** dan **119** (tautan `tel:`).
8. Label "Diagnosis" selalu disertai keterangan "sesuai yang Anda tulis" dan bukan hasil aplikasi.
   Diagnosis dari dokumen RS disimpan sebagai **teks yang tertulis**, bukan kesimpulan aplikasi.
9. Disclaimer tidak boleh tersembunyi di balik modal yang bisa dilewati pada layar Darurat/
   Ringkasan/Pindai/Tinjau.

---

## 8. UX, Aksesibilitas, dan Responsif

- Mobile-first; lebar konten maks. 720 px; navigasi bawah 4 tab utama + menu "Lainnya".
- Target sentuh minimal **48×48 px**; jarak antar kontrol memadai.
- Kontras teks ≥ 4.5:1 (WCAG AA); fokus keyboard terlihat; `:focus-visible` 3 px.
- Semua input punya `<label>`; tombol ikon punya `aria-label`; pesan error `role="alert"`.
- `lang="id"`, judul halaman per layar, skip-link ke konten.
- Mode huruf besar menaikkan basis font (16 → 20 px) tanpa merusak layout.
- Mode kontras tinggi memakai palet lebih tegas; tetap AA.
- Grafik punya `<title>`/`<desc>` dan ringkasan teks alternatif; warna bukan satu-satunya penanda
  (ada ikon/label "tinggi/rendah").
- Layar Tinjau: foto dan hasil berdampingan di layar lebar, bertumpuk di HP; bidang
  berkepercayaan rendah memakai kelas `is-low-confidence` + teks penjelas (bukan warna saja).
- Kamera: tombol besar, pratinjau jelas, fallback unggah berkas bila kamera ditolak/tidak ada.
- Cetak: A4, margin 14 mm, navigasi/tombol disembunyikan; hanya ringkasan/kartu yang tercetak.

---

## 9. Kriteria Penerimaan

- [ ] `node server.js` menyajikan aplikasi di `http://localhost:3000`; `GET /health` → 200 JSON.
- [ ] Semua fitur F1–F7 dan A1–A9 dapat dipakai tanpa akun dan tanpa koneksi setelah muat pertama.
- [ ] Tidak ada request ke domain eksternal (dapat diperiksa di DevTools/Network; CSP ketat).
- [ ] `npm install && npm run vendor:ocr` menyalin Tesseract.js, core WASM, serta data `ind`/`eng`
      ke `public/vendor`; server menyajikan `.wasm` sebagai `application/wasm` dan `/vendor/*`
      same-origin.
- [ ] OCR resep/etiket berjalan lokal dari foto maupun teks tempelan; tidak ada penyimpanan
      otomatis; layar Tinjau menampilkan foto asli + hasil, semua bidang dapat disunting, bagian
      rendah kepercayaan disorot, dan checkbox verifikasi wajib.
- [ ] Penerjemah resep memahami minimal: `3 dd 1`, `3x1`, `3 x 1 tab`, `S 3 dd tab I`,
      `S.2.d.d.C.I`, `1-0-1`, `p.c./pc`, `a.c.`, `d.c.`, `h.s.`, `prn/k.p.`, `mane/nocte`,
      bentuk sediaan (tab/caps/syr/cth/gtt/supp/ung/inj), satuan mg/mcg/g/ml, durasi,
      `No. X`/`#X`, serta menghasilkan jadwal jam bawaan yang dapat diubah.
- [ ] Minimal 40 contoh teks resep diuji `node:test`; keluaran per obat memuat nama, kekuatan,
      bentuk sediaan, kali sehari, takaran per dosis, waktu minum, aturan makan, durasi, jumlah
      total, teks asli, teks terjemahan, kepercayaan, dan bagian tidak dipahami.
- [ ] Parser rekam medis menghasilkan draf tanggal kunjungan, faskes/dokter, diagnosis yang
      tertulis, dan hasil lab nama-nilai-satuan-rujukan; draf wajib ditinjau sebelum disimpan.
- [ ] Foto sumber (terkompresi) tersimpan di IndexedDB terkait obat/kunjungan, bersama teks OCR
      mentah, teks terjemahan, penanda `verifiedByUser`, dan `verifiedAt`; terenkripsi bila
      kata sandi aktif.
- [ ] OCR cloud/AI visi tidak diimplementasikan; hanya titik ekstensi terdokumentasi yang
      nonaktif dan menolak dipanggil.
- [ ] Data bertahan setelah reload; mode kata sandi menghasilkan ciphertext di penyimpanan dan
      aplikasi terkunci setelah reload; kata sandi salah tidak merusak data.
- [ ] Ekspor/impor cadangan (plain & terenkripsi) berhasil memulihkan semua koleksi + lampiran.
- [ ] Perhitungan jadwal, stok, kepatuhan, duplikasi bahan aktif, penanda rentang, ringkasan,
      QR, kripto, terjemahan resep, parser, dan penyimpanan foto lulus `node:test`.
- [ ] `verify.sh` menjalankan seluruh test + smoke test server (termasuk `/vendor/manifest.json`
      dan MIME `.wasm`) dan keluar dengan kode 0.
- [ ] Layar Darurat menampilkan 112/119 + disclaimer; Ringkasan Dokter dapat dicetak.
- [ ] Tidak ada teks yang mendiagnosis/menyarankan dosis/mengklaim interaksi obat.
- [ ] Aksesibilitas dasar: label form, fokus terlihat, target sentuh ≥ 48 px, huruf besar berfungsi.

---

## 10. Risiko & Batasan yang Diakui

| Risiko | Mitigasi |
|--------|----------|
| Sinkronisasi nama bahan aktif tidak sempurna (mis. "amlodipine" vs "amlodipin") | Normalisasi sederhana + disclaimer eksplisit; bukan basis data obat. |
| Pengingat tidak berjalan saat aplikasi tertutup | Dijelaskan sebagai pengingat in-app; tidak ada push server. |
| Data hilang jika perangkat rusak / kata sandi lupa | Dorong ekspor cadangan berkala; peringatan lupa kata sandi. |
| QR memuat data sensitif | Peringatan privasi; hanya ditampilkan saat pemilik membuka/mencetak kartu. |
| Penyimpanan browser bisa dibersihkan | Cadangan berkas adalah jalur pemulihan utama. |
| Tampilan cetak berbeda antar browser | CSS cetak sederhana + tombol "Simpan sebagai PDF" bawaan browser. |
| Server statis lokal dapat diakses perangkat lain bila HOST diubah | Default `127.0.0.1`; dokumentasikan risiko bila memakai `0.0.0.0`. |
| OCR gagal membaca tulisan tangan / foto buram | Wajib ada jalur Ketik/Tempel teks; semua hasil adalah draf; bidang rendah kepercayaan disorot. |
| Salah baca dosis/angka berbahaya | Verifikasi manusia wajib; peringatan jelas; tidak ada auto-save; cocokkan dengan apoteker/dokter. |
| Parser rekam medis salah memetakan baris | Semua bidang dapat disunting; diagnosis hanya teks tertulis; hasil lab diverifikasi sebelum simpan. |
| Aset OCR besar / WebAssembly tidak didukung | Vendor hanya diunduh sekali; service worker cache same-origin; fallback teks tetap tersedia. |
| Data foto sumber tidak ikut cadangan JSON | UI menjelaskan batasan; metadata dan entri tetap tersimpan di vault. |
