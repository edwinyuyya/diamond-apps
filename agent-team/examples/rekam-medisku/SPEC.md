# Rekam Medisku — Spesifikasi Produk (SPEC)

> **Rekam Medisku** — *Rekam medis pribadi, tenang di perangkatmu.*
> Aplikasi web kesehatan pribadi berbahasa Indonesia yang menyimpan rekam medis dan obat
> pemiliknya **hanya di perangkat**, agar mudah ditemukan saat kontrol ke dokter maupun saat darurat.

Versi dokumen: 1.3 · Tanggal: 9 November 2026 · Status: siap dieksekusi
Revisi 1.1: menambahkan pemindaian resep/etiket dan rekam medis rumah sakit dari foto dengan
OCR lokal, penerjemah resep deterministik, alur verifikasi manusia wajib, dan penyimpanan foto sumber.
Revisi 1.2: menambahkan antarmuka suara untuk tunanetra dan lansia, dua mesin pengenal suara di
balik satu adaptor, pembaca ulang TTS, konfirmasi ya/tidak, dan Pemeriksaan Pendamping.
Revisi 1.3: **mengganti mesin ASR offline menjadi Whisper multibahasa** (`Xenova/whisper-base`,
q8, ±80 MB) dan menjadikan **alur tanya satu per satu** sebagai cara utama mengisi obat. Nama obat
tidak pernah diambil dari teks bebas ASR. Ditambahkan penjaga ASR (durasi maks. 8 detik, token
keluaran kecil, penolakan keluaran berulang/aneh), kosakata tertutup + pencocok fuzzy
deterministik, serta status mesin offline yang jujur. Semua konfirmasi, status pemeriksaan, dan
pagar kewajaran dari revisi sebelumnya tetap berlaku.

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
7. **Bisa dipakai hanya dengan suara.** Pengguna tunanetra atau lansia yang sulit mengetik dapat
   mengisi obat lewat **tanya satu per satu** dengan jawaban pendek, mengisi tanda vital, mencatat
   sudah-minum obat, mendengar jadwal hari ini, dan bernavigasi dengan perintah suara. Sebelum
   menyimpan, aplikasi membacakan ulang semua isian dan meminta konfirmasi
   "Apakah benar yang sudah dicatat?".

**Pengguna utama:** individu dewasa/lansia yang mengelola penyakit kronis, **penyandang tunanetra
atau low vision**, lansia dengan keterbatasan motorik/ketik, serta anggota keluarga yang merawat
orang lain (multi-profil).

---

## 2. Prinsip Produk

- **Lokal & privat secara default.** Tidak ada endpoint data di server. Server hanya menyajikan
  berkas statis (termasuk aset OCR dan ASR yang di-vendor). Tidak ada analytics, font/CDN
  eksternal, telemetri, atau layanan visi/AI eksternal.
- **Jujur tentang batas.** Setiap pemeriksaan otomatis adalah pembandingan deterministik atas data
  yang dimasukkan pengguna. Selalu ada disclaimer + saran konsultasi tenaga kesehatan.
- **Cepat saat panik.** Layar Darurat dan Ringkasan Dokter maksimal dua ketukan dari beranda.
- **Ramah lansia & tunanetra.** Mobile-first, target sentuh ≥ 48 px, kontras tinggi, mode huruf
  besar, label eksplisit, tanpa gestur tersembunyi, live region untuk setiap hasil, fokus
  terkelola, dan seluruh alur inti dapat dijalankan tanpa melihat layar.
- **Suara tidak sama dengan verifikasi.** Entri yang dibuat/dikonfirmasi dengan suara selalu
  berstatus "belum diperiksa pendamping/apoteker" sampai manusia lain memeriksanya di layar
  **Pemeriksaan Pendamping**. Aplikasi tidak pernah menyebut hasil suara sebagai "terverifikasi".
- **Mikrofon hanya aktif saat diminta.** Tidak ada perekaman latar belakang; audio offline tidak
  pernah meninggalkan perangkat dan tidak disimpan.
- **Sedikit dependency.** Vanilla JavaScript (ES modules), Node.js murni. Dependency hanya paket
  OCR dan ASR yang **di-vendor** ke `public/vendor` pada waktu build; runtime tidak memuat apa pun
  dari internet. Model ASR diunduh sekali saat vendoring, lalu dimuat malas dari same-origin.
- **Manusia memutuskan.** Hasil OCR, terjemahan resep, dan parser rekam medis adalah **draf**.
  Tidak ada yang disimpan otomatis. Pengguna harus mencocokkan dengan dokumen asli dan mencentang
  pernyataan verifikasi sebelum data masuk.
- **Jawaban tertutup, bukan tebakan.** Untuk pengisian obat dengan suara, aplikasi bertanya satu
  per satu dan mencocokkan jawaban ke kosakata tertutup. Pencocok tidak boleh memaksa cocok;
  jawaban tak dikenal diulang maksimal 2 kali lalu ditawarkan tombol atau ketik.
- **Nama obat tidak dari ASR bebas.** Nama obat hanya berasal dari daftar obat tersimpan, hasil
  pindai resep yang dibacakan satu per satu, ketikan/tempelan pendamping, atau ejaan huruf per
  huruf dengan konfirmasi baca ulang.
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
| F8 | **Tanya Satu per Satu untuk obat (inti)** | Layar `#/suara/tanya` menanyakan field obat satu per satu dengan pertanyaan persis: **"Berapa kali sehari?"** (pilihan 1–8), **"Berapa tablet sekali minum?"** (setengah, satu, satu setengah, dua, … maks. 4), **"Sebelum, sesudah, atau saat makan?"**, **"Pagi, siang, sore, malam, atau sebelum tidur?"** (boleh lebih dari satu), **"Hanya kalau perlu?"** (ya/tidak). Setiap jawaban dicocokkan ke kosakata tertutup dengan pencocok fuzzy deterministik; jawaban tak dikenal diulang maksimal 2 kali lalu ditawarkan tombol atau ketik. Sebelum simpan: TTS membacakan ulang **semua** isian, lalu bertanya persis **"Apakah benar yang sudah dicatat?"**; "ya/benar" menyimpan, "tidak/salah" membatalkan/mengulang, jawaban lain diulang maks. 2 kali lalu dibatalkan tanpa menyimpan. Tersedia tombol besar "Ya, benar" dan "Tidak". |
| F9 | **Pemeriksaan Pendamping** | Layar yang menampilkan foto resep asli di samping terjemahan, mewajibkan nama pendamping/apoteker dan pernyataan eksplisit, lalu mengubah `pemeriksaanOrangLain.status` dari `'belum'` menjadi `'sudah'`. Status "belum diperiksa pendamping/apoteker" tampil di daftar obat, pengingat hari ini (ikut dibacakan), dan ringkasan dokter. Entri suara selalu `'belum'`. |
| F10 | **Mesin suara offline Whisper + mesin browser opsional** | Satu adaptor `kenaliSuara(opsi) -> {teks, kepercayaan, mesin, penjaga}` dengan dua mesin: (a) **Offline penuh (bawaan)** berbasis **Whisper multibahasa** (`Xenova/whisper-base`, q8) melalui `@huggingface/transformers` 4.3.2 yang di-vendor ke `public/vendor/suara`, dimuat malas hanya saat mesin offline dipakai; (b) **Bawaan browser (Web Speech API)** nonaktif secara bawaan, hanya aktif setelah peringatan bahwa audio dikirim ke layanan pihak ketiga dan persetujuan eksplisit yang tercatat serta dapat dicabut. **Nama obat tidak pernah diambil dari teks bebas ASR.** |

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
- **Pengenalan suara cloud sebagai bawaan, perekaman mikrofon latar belakang, always-on
  listening, atau penyimpanan audio.** Web Speech hanya boleh opt-in dengan persetujuan tercatat;
  audio offline tidak pernah keluar perangkat.
- **Dikte bebas sebagai sumber nama obat.** Teks bebas ASR tidak boleh langsung menjadi nama obat
  atau disimpan tanpa alur nama tertutup + konfirmasi.
- **Unduhan model saat runtime.** Model Whisper hanya diunduh saat `npm run vendor:whisper`.
- Perintah suara bebas/chatbot, asisten medis percakapan, atau jawaban suara atas pertanyaan
  medis. Perintah yang didukung hanya daftar tetap di SPEC/CONTRACT.
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

### 4.10 Mengisi obat dengan suara: tanya satu per satu (alur wajib)

**Alur ini adalah cara utama mengisi obat dengan suara.** Dikte bebas tidak dipakai untuk nama
obat dan tidak boleh menyimpan obat secara langsung.

#### 4.10.1 Memilih nama obat (bukan dari ASR)
1. Buka `#/suara/tanya` (dari beranda, `#/suara`, atau perintah "isi dengan suara").
2. Aplikasi menampilkan sumber nama:
   - **Daftar obat tersimpan** — pilih dari daftar; nama tidak diucapkan bebas.
   - **Hasil pindai resep** — aplikasi membacakan satu per satu, mis. *"Captopril? ya atau tidak"*.
     Hanya nama yang ada di hasil pindai yang boleh dipilih.
   - **Ketik/tempel oleh pendamping** — satu-satunya jalur teks bebas; input diberi label jelas
     "diketik/ditempel pendamping", bukan mikrofon.
   - **Ejaan huruf per huruf** — pendamping mengucapkan/menekan huruf (a, be, ce, …); aplikasi
     menyusun nama lalu **membacakan ulang** dan meminta "ya/tidak" sebelum dipakai.
3. Teks bebas ASR **tidak pernah** menjadi nama obat. Bila mikrofon menghasilkan teks saat
   langkah nama, aplikasi menolak dan menampilkan pilihan di atas.

#### 4.10.2 Lima pertanyaan tertutup
Setelah nama terkonfirmasi, aplikasi bertanya satu per satu dan menunggu jawaban pendek:

| Urutan | Pertanyaan persis | Jawaban yang diterima |
|--------|-------------------|------------------------|
| 1 | **"Berapa kali sehari?"** | pilihan tertutup 1–8 |
| 2 | **"Berapa tablet sekali minum?"** | setengah, satu, satu setengah, dua, dua setengah, tiga, tiga setengah, empat |
| 3 | **"Sebelum, sesudah, atau saat makan?"** | sebelum / sesudah / saat |
| 4 | **"Pagi, siang, sore, malam, atau sebelum tidur?"** | satu atau lebih dari pilihan tersebut |
| 5 | **"Hanya kalau perlu?"** | ya / tidak |

- Setiap jawaban dicocokkan ke **kosakata tertutup** dengan pencocok fuzzy deterministik
  (jarak edit + fonetik sederhana) dan ambang. Contoh varian salah dengar yang harus cocok:
  "Dua Kalisahari" → 2 kali; "Semelum" → sebelum. Contoh yang harus **ditolak**:
  "sahurabla" → tidak dikenal.
- Bila tidak cocok: pertanyaan diulang, maksimal **2 kali**. Setelah itu aplikasi menawarkan
  **tombol pilihan** dan **kolom ketik**. Pencocok tidak boleh memaksa cocok untuk jawaban tak
  terkait.
- Bila "Hanya kalau perlu?" = **ya**, obat disimpan tanpa jam rutin (`times: []`) dan aturan
  "bila perlu" ditulis di instruksi. Jawaban waktu (mis. "pagi dan malam") tetap dicatat untuk
  ringkasan/pembacaan ulang, tetapi **tidak** menjadi jadwal rutin.
- **Pagar kewajaran** tetap berlaku: takaran > 4 tablet atau frekuensi > 8 kali sehari ditolak,
  ditandai, dan tidak boleh disimpan otomatis; pengguna harus menyunting manual.
- Semua jawaban ditampilkan dan diumumkan di live region; fokus berpindah ke pertanyaan
  berikutnya; tombol minimal 48 px.

#### 4.10.3 Konfirmasi dan simpan
1. Sebelum konfirmasi, aplikasi menghentikan pendengaran dan membacakan ulang **semua** isian:
   nama, frekuensi, takaran, aturan makan, waktu, bila perlu, jadwal, dan status
   "belum diperiksa pendamping atau apoteker".
2. Aplikasi bertanya persis **"Apakah benar yang sudah dicatat?"**.
3. "ya"/"benar" atau tombol **"Ya, benar"** → simpan.
4. "tidak"/"salah" atau tombol **"Tidak"** → batal, tidak menyimpan, kembali ke pengisian.
5. Jawaban lain → ulangi pertanyaan, maksimal **2 kali**, lalu batalkan tanpa menyimpan.
6. Entri disimpan dengan `dibuatDengan:'suara'`, `dikonfirmasiDengan:'suara'`, dan
   `pemeriksaanOrangLain.status='belum'`. Tidak ada `verifiedByUser` dari suara.

#### 4.10.4 Penjaga ASR
- Rekaman maksimal **8 detik** per jawaban; mesin berhenti sendiri. Hasil yang melewati batas
  (`> 8500 ms` termasuk toleransi) ditolak sebagai `ASR_TERLALU_LAMA`.
- Keluaran dibatasi token kecil (`max_new_tokens` ≤ 48).
- Keluaran yang berulang/aneh (mis. deret `2.2.2.2…`), rasio karakter non-huruf tinggi, atau
  panjang tak wajar **ditolak** dan diperlakukan sebagai "tidak terdengar"; teks yang ditolak
  tidak masuk pencocok dan tidak menjadi nama obat.
- Setelah dua kali "tidak terdengar", aplikasi menawarkan tombol/ketik agar alur tidak macet.

#### 4.10.5 Mesin suara dan pengaturan yang jujur
- Mesin offline memakai **Whisper multibahasa** (`Xenova/whisper-base`, q8), model ±80 MB,
  dimuat malas hanya saat mesin offline dipakai. Model tidak pernah diunduh saat runtime.
- **Pengaturan Suara** menampilkan status jujur dari manifest same-origin:
  *"Model offline belum tersedia"* (`tidak-ada`), *"Model offline belum lengkap"* (`belum`),
  atau *"Model offline siap (Whisper base, ± 80 MB)"* (`siap`). Tidak ada unduhan runtime.
- Peringatan wajib terlihat: **mesin offline lebih lambat dan kurang akurat** daripada manusia,
  terutama untuk nama obat dan angka; karena itu alur tanya satu per satu dipakai dan setiap
  hasil dibacakan ulang. Hasil tetap harus diperiksa pendamping/apoteker.
- Mesin **bawaan browser** tetap opsional, nonaktif secara bawaan, dan hanya aktif setelah
  persetujuan eksplisit (audio dikirim ke pihak ketiga). Bila API tidak tersedia, opsi
  disembunyikan dengan penjelasan.
- Dikte bebas tetap tersedia untuk **tanda vital**, **sudah minum obat**, dan **jadwal hari ini**;
  untuk obat, dikte bebas tidak boleh menjadi nama atau menyimpan tanpa alur tanya + konfirmasi.

### 4.11 Pemeriksaan Pendamping (alur wajib)
1. `#/pemeriksaan` menampilkan daftar obat berstatus **Belum diperiksa pendamping/apoteker**.
2. Pilih obat → layar menampilkan **foto resep asli** (bila ada) di samping **terjemahan** yang
   akan disimpan, seluruh field yang dapat dibaca, dan status suara/pencocokan foto.
3. Pendamping/apoteker mengisi **nama** (wajib, non-kosong) dan mencentang pernyataan persis:
   "Saya, pendamping/apoteker yang disebutkan, sudah memeriksa obat ini terhadap resep asli dan
   menyatakan data ini benar."
4. Setelah simpan, status menjadi `'sudah'` dengan `oleh`, `waktu`, dan `pernyataan`. Status baru
   tampil di daftar obat, pengingat hari ini, ringkasan dokter, dan dibacakan saat jadwal.
5. Aplikasi **tidak pernah** mengubah status karena suara, karena OCR, atau secara otomatis.
   Pencocokan foto hanya penanda sumber, bukan pemeriksaan pendamping.

### 4.12 Batas privasi pemindaian dan suara
- OCR berjalan 100% di browser memakai berkas WASM + data bahasa yang disajikan same-origin dari
  `/vendor/`. Tidak ada `fetch` ke domain eksternal.
- Whisper berjalan 100% di browser memakai `@huggingface/transformers` + ONNX Runtime WASM +
  model yang disajikan same-origin dari `/vendor/suara/`. `env.allowRemoteModels=false`;
  tidak ada unduhan model saat runtime.
- Foto sumber disimpan di IndexedDB terpisah; bila kata sandi aktif, isi foto dienkripsi dengan
  kunci sesi AES-GCM. Metadata (mime/ukuran) tetap plaintext agar dapat ditampilkan.
- Audio tidak disimpan dan tidak dikirim oleh mesin offline. Transkrip suara hanya ada di memori
  layar sampai batal/simpan/reload.

---

## 5. Stack Teknologi

| Lapisan | Pilihan | Alasan |
|---------|---------|--------|
| UI | HTML + CSS + **vanilla JS ES modules** | Tanpa framework/build; mudah diaudit; cepat di HP. |
| Server | **Node.js murni** (`http`, `fs`, `path`) | Menyajikan `app/` di `/` dan aset OCR/ASR di `/vendor/`; port 3000. |
| Penyimpanan | **IndexedDB** (utama) + fallback `localStorage` + memori | Satu record "vault" JSON; lampiran base64 di dalamnya. |
| Foto sumber OCR | **IndexedDB terpisah** (`rawatku-photos`) | Tidak membengkakkan vault; terenkripsi saat mode kata sandi aktif. |
| Enkripsi | **Web Crypto**: PBKDF2-SHA256 (310.000 iterasi) + AES-GCM-256 | Tersedia di browser modern dan Node ≥ 20 untuk pengujian. |
| OCR | **Tesseract.js** + data `ind` & `eng`, di-vendor via npm ke `public/vendor` | Offline, tanpa layanan luar; WASM disajikan `application/wasm`. |
| ASR offline (bawaan) | **Whisper multibahasa** (`Xenova/whisper-base`, q8) via **`@huggingface/transformers` 4.3.2** + ONNX Runtime WASM, di-vendor ke `public/vendor/suara` | 100% lokal; model ±80 MB dimuat malas hanya saat mesin offline dipakai; tanpa unduhan runtime. |
| ASR browser (opsional) | **Web Speech API `SpeechRecognition`** (`lang='id-ID'`) | Nonaktif bawaan; hanya setelah peringatan pihak ketiga + persetujuan tercatat yang dapat dicabut. |
| TTS | **`speechSynthesis`** dengan suara `id-ID` | Pertanyaan tanya satu per satu, pembaca ulang sebelum simpan, konfirmasi, jadwal, dan bantuan. |
| Adaptor suara | **Modul JS murni** `app/js/suara/adaptor.js` | Satu pintu `kenaliSuara(opsi)`; mesin dapat diinjeksi untuk test; penjaga ASR diterapkan di sini. |
| Penjaga ASR | **Modul JS murni** `app/js/suara/penjagaAsr.js` | Batas 8 detik, token kecil, tolak keluaran berulang/aneh; dapat diuji `node:test`. |
| Kosakata & pencocok | **Modul JS murni** `logic/kosakataTertutup.js`, `logic/pencocokJawaban.js` | Pertanyaan tertutup + fuzzy deterministik (edit/fonetik) dengan ambang; tanpa AI. |
| Mesin keadaan tanya | **Modul JS murni** `logic/tanyaSatuPerSatu.js`, `logic/pemilihNamaObat.js` | Alur tanya satu per satu dan pemilihan nama (daftar/pindai/ketik/ejaan) diuji `node:test`. |
| Parser ucapan bebas | **Modul JS murni deterministik** (vital/minum/jadwal) | Angka/satuan Indonesia; tidak dipakai untuk nama obat. |
| Penerjemah resep | **Modul JS murni deterministik** | Dapat diuji `node:test` dengan 40+ contoh; tanpa AI. |
| Parser rekam medis/lab | **Modul JS murni deterministik** | Menyalin teks, bukan mendiagnosis; dapat diuji. |
| Grafik | **SVG murni** dibangun oleh fungsi JS | Tanpa library, aksesibel, tajam. |
| QR | **Encoder QR murni** (Model 2, byte mode, EC M, versi 1–10) | Tanpa library/CDN; dapat diuji di Node. |
| PWA | `manifest.webmanifest` + service worker cache-first same-origin | Offline; aset vendor di-cache saat dipakai. |
| Test | **`node:test`** + `node:assert/strict` | Tanpa dependency test; verify.sh menjalankan semua. |

**Dependency build:** `tesseract.js`, `@tesseract.js-data/ind`, `@tesseract.js-data/eng` hanya
dipasang untuk `npm run vendor:ocr`. **`@huggingface/transformers@4.3.2`** hanya dipakai
`npm run vendor:whisper`; `onnxruntime-web` (transitif) disalin ke `public/vendor/suara/onnx/`.
Berkas model Whisper diunduh **saat vendoring**, bukan saat runtime, dari
`huggingface.co` dan `us.aws.cdn.hf.co` (host redirect yang diizinkan). Runtime memakai salinan
di `public/vendor` dan `public/vendor/suara`; pengguna cukup menjalankan
`npm install && npm run vendor:ocr && npm run vendor:whisper` sekali. Fitur suara offline tetap
berfungsi tanpa jaringan setelah vendoring; model dimuat malas saat pertama kali dipakai.

**Persyaratan runtime:** Node.js ≥ 20, browser modern (Chrome/Edge/Firefox/Safari terbaru)
dengan IndexedDB, Web Crypto, WebAssembly, Worker, dan service worker (localhost dianggap secure
context). Fitur suara offline memerlukan WebAssembly + `getUserMedia`; TTS memerlukan
`speechSynthesis`. Bila WebAssembly/Worker/mikrofon tidak tersedia, jalur **Ketik/Tempel teks**
dan seluruh tombol/formulir tetap berfungsi, dengan pesan yang jelas. Web Speech API bersifat
opsional dan tidak pernah menjadi syarat fitur inti.

---

## 6. Privasi, Keamanan, dan Data

- **Tanpa akun & tanpa cloud.** Semua data di perangkat. Server tidak memiliki endpoint baca/tulis
  data dan tidak mencatat isi permintaan.
- **Tanpa request eksternal saat runtime.** CSP: `connect-src 'self'`, `worker-src 'self' blob:`,
  `script-src 'self' 'wasm-unsafe-eval'`; aset hanya same-origin; tidak ada font, ikon, skrip,
  atau gambar dari domain lain. Service worker tidak menyentuh cross-origin.
- **Model ASR tidak diunduh runtime.** `env.allowRemoteModels=false`, `env.allowLocalModels=true`,
  `env.localModelPath` menunjuk `/vendor/suara/models/`, dan
  `env.backends.onnx.wasm.wasmPaths` menunjuk `/vendor/suara/onnx/`. Bila model tidak ada,
  aplikasi menampilkan "model belum tersedia" dan menawarkan tombol/ketik.
- **Audio tidak disimpan.** Fitur suara offline hanya memproses audio di memori dan langsung
  membuangnya; tidak ada rekaman di IndexedDB/localStorage maupun di server. Mikrofon tidak aktif
  di luar sesi yang dimulai pengguna.
- **Web Speech = kirim audio ke pihak ketiga.** Mesin ini nonaktif bawaan. Mengaktifkannya
  menampilkan peringatan jelas (di Chrome audio diproses Google), meminta persetujuan eksplisit
  yang dicatat (`diberikan`, `diberikanPada`, `versi`) dan dapat dicabut kapan saja di Pengaturan
  Suara. Bila `SpeechRecognition` tidak tersedia, opsi disembunyikan dengan penjelasan.
- **Tidak ada klaim verifikasi dari suara.** Status "terverifikasi" hanya diberikan lewat layar
  Pemeriksaan Pendamping dengan nama dan pernyataan manusia; model menyimpan
  `pemeriksaanOrangLain.status` dan UI wajib menampilkan label "Belum diperiksa
  pendamping/apoteker" pada semua entri lain.
- **Nama obat tidak dari ASR bebas.** Nama hanya dari daftar/pindai/ketik/ejaan. Teks ASR tidak
  pernah ditulis ke `medication.name` dan tidak pernah disimpan tanpa konfirmasi.
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
   - terjemahan singkatan resep dan penyalinan teks dokumen (bukan rekomendasi);
   - pencocokan jawaban tertutup dengan jarak edit/fonetik (bukan pemahaman bahasa).
4. **OCR, ASR, dan parser bisa salah.** Terutama tulisan tangan dan dikte angka/nama obat.
   Setiap layar pindai/suara menampilkan peringatan bahwa kesalahan membaca dosis berbahaya dan
   hasil harus dicocokkan dengan apoteker/dokter.
5. **Tidak ada penyimpanan otomatis.** Hasil OCR/terjemahan/parser hanya menjadi draf di memori.
   Tombol simpan nonaktif sampai checkbox "Saya sudah mencocokkan dengan resep asli" dicentang.
   Hasil suara hanya disimpan setelah konfirmasi eksplisit.
6. Setiap peringatan menampilkan batasnya dan menyarankan konsultasi dokter/apoteker.
7. Layar Darurat dan footer menampilkan **112** dan **119** (tautan `tel:`).
8. Label "Diagnosis" selalu disertai keterangan "sesuai yang Anda tulis" dan bukan hasil aplikasi.
   Diagnosis dari dokumen RS disimpan sebagai **teks yang tertulis**, bukan kesimpulan aplikasi.
9. Disclaimer tidak boleh tersembunyi di balik modal yang bisa dilewati pada layar Darurat/
   Ringkasan/Pindai/Tinjau/Suara/Pemeriksaan.
10. **Suara bukan verifikasi.** Hasil suara tidak pernah disebut benar/terverifikasi; aplikasi
    hanya mengatakan "sudah dicatat" setelah konfirmasi eksplisit, dan status obat tetap
    "belum diperiksa pendamping/apoteker".
11. **Pagar kewajaran ucapan.** Angka dari ucapan diurai deterministik dan tetap melewati pagar
    yang sama: takaran > 4 tablet atau frekuensi > 8 kali sehari ditolak/ditandai, tidak disimpan
    otomatis, dan meminta pemeriksaan manual.
12. **Konfirmasi wajib.** Tidak ada simpan otomatis dari suara. Semua isian dibacakan ulang dan
    dipertanyakan persis "Apakah benar yang sudah dicatat?"; tanpa jawaban "ya"/"benar" atau
    tombol "Ya, benar", tidak ada yang disimpan.
13. **Nama obat tidak dari ASR bebas.** Nama hanya dari daftar/pindai/ketik/ejaan yang
    terkonfirmasi; teks ASR tidak boleh mengisi field nama.
14. **Penjaga ASR wajib.** Rekaman maks. 8 detik, token keluaran kecil, dan keluaran
    berulang/aneh ditolak sebagai "tidak terdengar"; teks yang ditolak tidak masuk pencocok.
15. **Pencocok tidak memaksa cocok.** Jawaban tak terkait harus ditolak; setelah 2 kali gagal,
    tawarkan tombol/ketik, jangan menebak.
16. **Perintah terbatas.** Perintah suara hanya navigasi dan pengisian yang tercantum; aplikasi
    tidak menjawab pertanyaan medis, tidak menyarankan dosis, dan tidak mendiagnosis lewat suara.

---

## 8. UX, Aksesibilitas, dan Responsif

- Mobile-first; lebar konten maks. 720 px; navigasi bawah 4 tab utama + menu "Lainnya".
- Target sentuh minimal **48×48 px**; tombol pertanyaan/konfirmasi minimal 56 px.
- Kontras teks ≥ 4.5:1 (WCAG AA); fokus keyboard terlihat; `:focus-visible` 3 px.
- Semua input punya `<label>`; tombol ikon punya `aria-label`; pesan error `role="alert"`.
- `lang="id"`, judul halaman per layar, skip-link ke konten.
- Mode huruf besar menaikkan basis font (16 → 20 px) tanpa merusak layout.
- Mode kontras tinggi memakai palet lebih tegas; tetap AA.
- Grafik punya `<title>`/`<desc>` dan ringkasan teks alternatif; warna bukan satu-satunya penanda.
- Layar Tinjau: foto dan hasil berdampingan di layar lebar, bertumpuk di HP; bidang
  berkepercayaan rendah memakai kelas `is-low-confidence` + teks penjelas (bukan warna saja).
- **Layar tanya satu per satu:** pertanyaan terlihat besar dan dibacakan; setiap jawaban
  diumumkan lewat live region (`role="status" aria-live="polite" aria-atomic="true"`); setelah
  2 kali gagal, tombol pilihan dan kolom ketik tampil; fokus pindah ke pertanyaan/tombol
  berikutnya; urutan tab logis (mulai → pertanyaan → jawaban → ringkasan → konfirmasi →
  simpan/batal).
- **Kontrol ganda:** setiap aksi suara punya kontrol keyboard/pembaca layar (tombol besar
  "Ya, benar" dan "Tidak"); tidak ada gestur atau perintah suara yang menjadi satu-satunya jalan.
- **Nama obat:** layar nama tidak menyediakan input mikrofon untuk nama; sumber nama diberi
  label jelas (daftar/pindai/ketik/ejaan); ejaan membaca ulang nama sebelum dipakai.
- **Status model jujur:** Pengaturan Suara menampilkan "belum tersedia / siap ±80 MB / memuat"
  dan peringatan bahwa mesin offline lebih lambat dan kurang akurat.
- **Bantuan terdengar:** layar `#/bantuan-suara` mencantumkan dan membacakan seluruh perintah
  dasar; perintah "bantuan" membacakan daftar yang sama.
- Mode huruf besar dan kontras tinggi berlaku untuk semua layar suara/pemeriksaan.
- Kamera: tombol besar, pratinjau jelas, fallback unggah berkas bila kamera ditolak/tidak ada.
- Cetak: A4, margin 14 mm, navigasi/tombol disembunyikan; hanya ringkasan/kartu yang tercetak.

---

## 9. Kriteria Penerimaan

- [ ] `node server.js` menyajikan aplikasi di `http://localhost:3000`; `GET /health` → 200 JSON.
- [ ] Semua fitur F1–F7 dan A1–A9 dapat dipakai tanpa akun dan tanpa koneksi setelah muat pertama.
- [ ] Tidak ada request ke domain eksternal saat runtime (dapat diperiksa di DevTools/Network;
      CSP ketat). Model Whisper tidak diunduh runtime.
- [ ] `npm install && npm run vendor:ocr` menyalin Tesseract.js, core WASM, serta data `ind`/`eng`
      ke `public/vendor`; server menyajikan `.wasm` sebagai `application/wasm`.
- [ ] `npm install && npm run vendor:whisper` menyalin `@huggingface/transformers`, berkas WASM
      ONNX Runtime, dan 12 berkas model `Xenova/whisper-base` (termasuk
      `encoder_model_quantized.onnx` dan `decoder_model_merged_quantized.onnx`) ke
      `public/vendor/suara`, dengan `manifest.json` berisi SHA-256 dan
      `runtimeExternalRequests: 0`.
- [ ] Server menyajikan `.wasm` sebagai `application/wasm` dan `.onnx` sebagai
      `application/octet-stream` (bukan teks/HTML), serta `.json` model sebagai
      `application/json`.
- [ ] Tidak ada aset/placeholder/skrip/model bahasa Indonesia lama di `public/vendor/suara`;
      `package.json` tidak memuat paket ASR lama dan tidak memiliki skrip/perintah vendoring
      ASR lama.
- [ ] `kenaliSuara(opsi)` mengembalikan `{teks, kepercayaan, mesin, durasiMs, alternatif,
      peringatan}`; setiap hasil melewati penjaga ASR dan dapat memakai mesin Whisper offline
      maupun Web Speech yang diaktifkan dengan persetujuan; mesin offline dimuat malas dari
      `/vendor/suara` tanpa request eksternal.
- [ ] Mesin Whisper memakai `env.allowRemoteModels=false`, `env.allowLocalModels=true`,
      `env.localModelPath` lokal, `env.backends.onnx.wasm.wasmPaths` lokal, dtype q8, dan
      `language:'indonesian'`, `task:'transcribe'`.
- [ ] Penjaga ASR: rekaman maks. 8 detik; `max_new_tokens` kecil; keluaran `2.2.2.2…` (berulang
      atau 16 detik) ditolak dan diperlakukan sebagai "tidak terdengar"; teks yang ditolak tidak
      masuk pencocok.
- [ ] Layar `#/suara/tanya` menanyakan persis lima pertanyaan tertutup di atas satu per satu,
      dengan pilihan 1–8, takaran 0,5–4 tablet, aturan makan, waktu (boleh lebih dari satu), dan
      bila perlu.
- [ ] Pencocok fuzzy deterministik: "Dua Kalisahari" → 2 kali, "Semelum" → sebelum,
      "sahurabla" → tidak dikenal; jawaban tak terkait **tidak** dipaksa cocok.
- [ ] Jawaban tak dikenal diulang maksimal 2 kali, lalu ditawarkan tombol atau ketik; alur tidak
      macet dan tidak menebak.
- [ ] Nama obat **tidak pernah** diambil dari teks bebas ASR; nama hanya dari daftar obat,
      hasil pindai yang dibacakan "Captopril? ya atau tidak", ketik/tempel pendamping, atau
      ejaan huruf per huruf dengan konfirmasi baca ulang.
- [ ] Konfirmasi "Apakah benar yang sudah dicatat?" tidak dapat dilewati; "ya"/"benar" atau
      "Ya, benar" menyimpan; "tidak"/"salah" membatalkan; jawaban lain diulang maks. 2 kali lalu
      batal.
- [ ] Entri obat dari suara selalu `dibuatDengan:'suara'`, `dikonfirmasiDengan:'suara'`, dan
      `pemeriksaanOrangLain.status='belum'`; status tampil di daftar obat, pengingat hari ini
      (ikut dibacakan), dan ringkasan dokter; layar Pemeriksaan Pendamping mewajibkan nama +
      pernyataan dan mengubahnya menjadi `'sudah'`.
- [ ] Pagar kewajaran tetap berlaku: takaran > 4 tablet atau frekuensi > 8 kali sehari ditolak/
      ditandai dan tidak disimpan otomatis.
- [ ] "Hanya kalau perlu?" = ya menghasilkan `times: []` dan instruksi "bila perlu"; waktu
      tertulis (label waktu atau jam manual) tetap disimpan dan dibacakan.
- [ ] Pengaturan Suara menampilkan status model "belum tersedia / siap ±80 MB / memuat" dan
      peringatan bahwa mesin offline lebih lambat/kurang akurat; Web Speech tetap nonaktif
      bawaan, memerlukan persetujuan tercatat, dan dapat dicabut.
- [ ] Minimal **60** jawaban tertutup dengan varian salah dengar realistis diuji `node:test`;
      termasuk uji negatif pencocok, uji penjaga ASR, uji mesin keadaan, dan uji pemilihan nama.
- [ ] Uji integrasi Whisper di Node berjalan bila berkas model ada secara lokal; bila tidak ada,
      tes **di-skip dengan pesan jelas** (bukan gagal) dan tidak membutuhkan jaringan.
- [ ] Semua tes lama (logic, security, platform, scan, resep, ucapan, suara, DOM a11y) tetap
      lulus; `verify.sh` menjalankan seluruh test + smoke test server (termasuk MIME `.wasm`,
      `.onnx`, manifest Whisper, dan larangan aset ASR lama) dan keluar dengan kode 0.
- [ ] Layar Darurat menampilkan 112/119 + disclaimer; Ringkasan Dokter dapat dicetak.
- [ ] Tidak ada teks yang mendiagnosis/menyarankan dosis/mengklaim interaksi obat.
- [ ] Aksesibilitas dasar: label form, fokus terlihat, target sentuh ≥ 48 px, huruf besar berfungsi.
- [ ] Pemeriksaan DOM otomatis memverifikasi label, `role`, `aria-live`, ID layar tanya, dan
      urutan fokus layar suara/pemeriksaan.

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
| Aset OCR/ASR besar / WebAssembly tidak didukung | Vendor hanya diunduh sekali; service worker cache same-origin; fallback teks/tombol tetap tersedia. |
| Data foto sumber tidak ikut cadangan JSON | UI menjelaskan batasan; metadata dan entri tetap tersimpan di vault. |
| **Whisper-base lemah untuk dikte obat Indonesia** (mis. "dua belas koma lima miligram" → "Amela Scoma 5mg"; "dua kali sehari" → "Dua Kalisahari") | **Jangan mengandalkan dikte bebas untuk obat.** Alur tanya satu per satu dengan kosakata tertutup, pencocok fuzzy + ambang, pembacaan ulang, konfirmasi eksplisit, pagar kewajaran, dan status belum diperiksa. |
| **Whisper mengarang keluaran berulang** (mis. deret `2.2.2.2…` selama 16 detik) | Penjaga ASR: batas 8 detik, `max_new_tokens` kecil, deteksi pengulangan/rasio huruf/panjang, tolak sebagai "tidak terdengar", tawarkan tombol/ketik. |
| **Model ASR offline besar/lambat di HP kelas bawah** | Model q8 ±80 MB, dimuat malas hanya saat dipakai, status "belum tersedia/siap/memuat" jujur, peringatan lebih lambat/kurang akurat; jalur tombol/teks tetap tersedia. |
| **Model tidak tersedia saat runtime** | Status "belum tersedia"; fitur suara menawarkan tombol/ketik; `npm run vendor:whisper` dijelaskan sebagai langkah build; tidak ada unduhan diam-diam. |
| Web Speech mengirim audio ke pihak ketiga | Nonaktif bawaan; peringatan jelas; persetujuan tercatat + dapat dicabut; offline tetap default. |
| Pengguna tidak bisa memakai mikrofon (izin ditolak) | Semua alur punya kontrol tombol/keyboard; pesan jelas dan fallback tanpa suara. |
| Pencocok fuzzy salah menerima jawaban tak terkait | Ambang + margin ambiguitas + uji negatif wajib; jawaban tak dikenal ditolak, bukan dipaksa; setelah 2 gagal tawarkan tombol/ketik. |
| Nama obat salah eja dari ejaan huruf | Ejaan memakai alfabet tertutup + baca ulang + konfirmasi "ya/tidak"; nama dari daftar/pindai tidak diedit bebas saat dipilih. |
| Pendamping mengisi pernyataan tanpa benar-benar memeriksa | Nama wajib, pernyataan eksplisit, foto asli ditampilkan; aplikasi tidak mengklaim lebih dari pernyataan manusia. |
