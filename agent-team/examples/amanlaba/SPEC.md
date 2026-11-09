# SPEC — AmanLaba

**Simulator Risiko Usaha**
Versi dokumen 1.0 · 8 November 2026

---

## 1. Ringkasan Produk

**AmanLaba** adalah aplikasi web berbahasa Indonesia yang membantu pemilik usaha kecil, UMKM, dan freelancer mengambil keputusan harga jual serta modal **berdasarkan rentang ketidakpastian**, bukan satu angka tebakan.

Pengguna memasukkan empat variabel sebagai rentang (minimum, paling mungkin, maksimum):

1. Harga jual per unit
2. Biaya tetap per bulan
3. Biaya variabel per unit
4. Permintaan per bulan

Mesin Monte Carlo ber-seed menjalankan 10.000 iterasi, lalu menampilkan:

- peluang rugi dan peluang untung,
- rentang laba P5, P50, P95,
- titik impas,
- histogram distribusi laba,
- diagram tornado sensitivitas,
- pencari harga jual terbaik dan paling aman.

Produk dirancang untuk **dijual**: landing page yang meyakinkan, aplikasi yang rapi dan responsif, laporan siap cetak, serta paket harga Gratis/Pro/Bisnis (teks saja, tanpa pembayaran sungguhan).

**Tagline:** *Jangan tebak harga jual. Simulasikan risikonya.*

---

## 2. Merek dan Positioning

| Elemen | Nilai |
|---|---|
| Nama merek | **AmanLaba** |
| Makna | "Aman" (risiko terkendali) + "Laba" (tujuan usaha) |
| Nada komunikasi | Tenang, jujur, praktis, tidak menggurui |
| Janji utama | Tahu risiko sebelum uang keluar |
| Diferensiasi | Memakai rentang dan simulasi 10.000 kemungkinan, bukan kalkulator untung satu titik |
| Bukti kredibilitas | Hasil dapat direproduksi dengan seed, metode transparan, laporan siap cetak |

Merek tidak boleh memakai klaim berlebihan seperti "dijamin untung" atau "pasti sukses". Produk adalah alat bantu keputusan, bukan jaminan hasil usaha.

---

## 3. Masalah dan Insight

Pemilik usaha sering menentukan harga dengan:

- menebak angka permintaan,
- menyalin harga pesaing,
- menghitung satu skenario "paling mungkin" saja,
- tidak sadar bahwa biaya dan permintaan selalu bergerak.

Akibatnya keputusan terlihat aman di atas kertas, tetapi rapuh saat permintaan turun atau biaya naik. Kalkulator untung biasa tidak menunjukkan **seberapa besar peluang rugi** dan **variabel mana yang paling berbahaya**.

AmanLaba mengubah ketidakpastian menjadi distribusi hasil yang bisa dibaca, dibandingkan, dan dicetak.

---

## 4. Target Pengguna

1. **Pemilik warung makan / kafe** — menentukan porsi, harga menu, dan target penjualan harian.
2. **Penjual online** — memperhitungkan biaya iklan, HPP, ongkos kirim, dan volume pesanan.
3. **Freelancer / jasa** — menentukan tarif proyek dan kapasitas kerja per bulan.
4. **Mitra pembaca laporan** — pasangan usaha, investor kecil, atau petugas bank yang menerima laporan cetak.

Kebutuhan utama: cepat dipahami, tidak perlu akuntansi, bisa dipakai di ponsel, dan hasilnya bisa dibagikan.

---

## 5. Tujuan dan Metrik Keberhasilan

### Tujuan produk

- Membantu pengguna memahami risiko dari keputusan harga dalam waktu kurang dari 60 detik.
- Menyediakan hasil yang dapat direproduksi dan dijelaskan.
- Menghasilkan pengalaman visual yang cukup baik untuk dijual sebagai produk SaaS.

### Metrik keberhasilan rilis MVP

| Metrik | Target |
|---|---|
| Waktu dari landing page sampai hasil simulasi pertama | < 60 detik |
| Waktu respons simulasi 10.000 iterasi + sapuan harga | < 1 detik di laptop modern |
| Reproduksibilitas | Seed dan input sama menghasilkan angka identik |
| Akurasi statistik | Lolos uji analitik dengan toleransi di CONTRACT.md |
| Responsif | Nyaman pada lebar 360 px, 768 px, dan 1280 px |
| Kemandirian | Nol permintaan jaringan eksternal saat runtime |
| Kualitas halaman | Tidak ada error console, tautan mati, atau layout pecah |
| Laporan cetak | Rapi pada A4, tanpa tombol/nav saat dicetak |

---

## 6. Fitur MVP (Ketat)

Fitur di luar tabel ini **tidak dikerjakan** pada rilis ini.

| ID | Fitur | Deskripsi | Kriteria selesai |
|---|---|---|---|
| F-01 | Landing page `/` | Halaman penjelas nilai produk, fitur, template, paket harga, FAQ, CTA ke `/app` | Semua bagian wajib ada, responsif, tanpa aset eksternal |
| F-02 | Aplikasi `/app` | Form input 4 variabel rentang, iterasi, seed, tombol hitung | Dapat dijalankan di desktop dan ponsel, error tampil jelas |
| F-03 | Input rentang | Setiap variabel punya min, mode, max; permintaan diberi label "pada harga paling mungkin" | Validasi klien dan server konsisten, label jelas |
| F-04 | Mesin Monte Carlo | 10.000 iterasi bawaan, RNG ber-seed, fungsi murni | Seed sama + input sama = hasil identik |
| F-05 | Ringkasan hasil | Peluang rugi, peluang untung, P5/P50/P95, rata-rata, min/max, deviasi standar | Semua nilai tampil dengan format Rupiah Indonesia |
| F-06 | Titik impas | Unit dan pendapatan impas dari nilai mode | Kasus margin ≤ 0 ditangani dengan pesan jelas |
| F-07 | Histogram | Distribusi laba 30 bin, area rugi dibedakan | Grafik SVG murni, terbaca, punya label |
| F-08 | Tornado sensitivitas | Empat variabel diurutkan berdasarkan dampak terhadap laba | Menjelaskan input mana yang paling menentukan risiko |
| F-09 | Pencari harga | Sapuan harga otomatis dengan respons permintaan linear, menampilkan harga laba terbaik dan risiko terendah | Grafik + dua rekomendasi + alasan singkat |
| F-10 | Template skenario | Warung makan, kafe, toko online, jasa freelance | Empat template dapat dimuat dan langsung dihitung |
| F-11 | Penyimpanan lokal | Simpan, muat, hapus skenario di `localStorage` | Bertahan setelah refresh, maksimal 50 skenario |
| F-12 | Laporan cetak | Halaman `/laporan?id=...` siap dicetak ke A4/PDF | Memuat skenario tersimpan, hasil lengkap, tombol cetak |
| F-13 | Paket harga | Gratis / Pro / Bisnis, teks saja | Tampil di landing, tanpa transaksi atau aktivasi |
| F-14 | Titik ekstensi AI | Modul stub Panel Pelanggan AI terdokumentasi | Ada antarmuka jelas, **tidak** diimplementasikan atau dirutekan |

### Batasan produk

- Tidak ada login, akun, atau multi-pengguna.
- Tidak ada database server. Skenario hanya tersimpan di browser pengguna.
- Tidak ada pembayaran, langganan aktif, atau integrasi pihak ketiga.
- Tidak ada AI/LLM yang berjalan.
- Tidak ada unggah file, impor Excel, atau API publik.
- Tidak ada perbandingan antar-skenario pada MVP.
- Mata uang hanya IDR.
- Laporan dibuat lewat dialog cetak browser (PDF), bukan generator PDF server.

---

## 7. Alur Pengguna

### Alur A — Pengguna baru

1. Masuk ke `/`, membaca hero dan nilai produk.
2. Melihat cuplikan hasil, fitur, template, dan paket harga.
3. Klik **Coba Simulator Gratis** menuju `/app`.
4. Aplikasi otomatis memuat template **Warung Makan** dan menjalankan simulasi pertama.
5. Pengguna melihat peluang rugi, rentang untung, histogram, tornado, dan rekomendasi harga.
6. Pengguna mengubah rentang biaya/permintaan, menekan **Hitung Risiko**.
7. Pengguna memilih template lain atau mengubah seed untuk memahami variasi.

### Alur B — Menyimpan skenario

1. Pengguna mengisi nama skenario.
2. Menekan **Simpan Skenario**.
3. Skenario masuk ke daftar "Skenario Saya" di `localStorage`.
4. Pengguna dapat memuat kembali atau menghapus skenario.
5. Tautan **Buat Laporan** aktif setelah skenario tersimpan.

### Alur C — Laporan cetak

1. Dari `/app`, pengguna menekan **Buat Laporan**.
2. Halaman `/laporan?id=...` memuat skenario dari `localStorage` dan memanggil API simulasi.
3. Laporan menampilkan ringkasan, asumsi, grafik, dan rekomendasi.
4. Pengguna menekan **Cetak / Simpan PDF**.
5. Browser mencetak dalam tata letak A4 tanpa elemen navigasi.

### Alur D — Memahami paket

1. Pengguna membaca tiga paket di landing.
2. Tombol paket berbayar hanya menampilkan pemberitahuan bahwa pembayaran belum tersedia pada versi demo.
3. Tidak ada data pembayaran yang diminta.

---

## 8. Model Simulasi

### Rumus laba per iterasi

Setiap variabel diambil dari **distribusi triangular** yang dibentuk oleh `min`, `mode`, dan `max`.

Permintaan yang dimasukkan adalah permintaan **pada harga paling mungkin**. Saat harga berbeda, permintaan diskalakan dengan respons linear:

```
harga_choke = 2 × harga_max − harga_mode
faktor(harga) = clamp((harga_choke − harga) / (2 × (harga_max − harga_mode)), 0, 2)
laba = (harga − biaya_variabel) × permintaan × faktor(harga) − biaya_tetap
```

Faktor bernilai 1 pada harga mode, 0,5 pada harga maksimum, dan 0 pada harga choke. Jika `harga_max = harga_mode`, faktor selalu 1. Asumsi ini membuat pencari harga memiliki trade-off antara margin dan volume, bukan sekadar menaikkan harga.

### Keluaran

- `peluangRugi` = proporsi iterasi dengan laba < 0.
- `peluangUntung` = proporsi iterasi dengan laba ≥ 0.
- `P5`, `P50`, `P95` = persentil laba.
- `titik impas` = unit dan pendapatan saat laba = 0, dihitung dari nilai mode.
- `histogram` = 30 bin pada rentang laba minimum–maksimum.
- `sensitivitas` = perubahan laba saat tiap variabel digerakkan dari P10 ke P90.
- `pencari harga` = sapuan 21 titik harga; satu titik mengejar laba rata-rata tertinggi, satu titik mengejar peluang rugi terendah.

### Reproduksibilitas

- RNG wajib ber-seed (mulberry32).
- Urutan pengambilan angka acak tetap: harga, biaya tetap, biaya variabel, permintaan.
- Seed dan parameter sapuan harga disimpan bersama skenario.
- Hasil tidak boleh bergantung pada waktu, urutan request, atau state global.

Detail algoritma, toleransi, dan bentuk respons ada di `CONTRACT.md`.

---

## 9. Desain dan Pengalaman

### Prinsip

- **Tenang dan kredibel**, bukan aplikasi kasino atau grafik ramai.
- **Sedikit tetapi jelas**: satu layar, satu keputusan utama.
- **Angka mudah dibaca**: tabular, format Indonesia, satuan eksplisit.
- **Aksesibel**: kontras cukup, fokus terlihat, target sentuh 44 px, label form nyata.
- **Cepat**: tanpa bundler, tanpa font eksternal, grafik SVG murni.
- **Konsisten**: token warna, radius, bayangan, dan tipografi dipakai di landing, aplikasi, dan laporan.

### Palet dan tipografi

- Latar terang, permukaan putih, tinta biru-gelap.
- Warna utama teal, aksen amber, bahaya merah, aman hijau.
- Font sistem (tanpa Google Fonts).
- Angka memakai `font-variant-numeric: tabular-nums`.

Token lengkap dan kelas bersama ditetapkan di `CONTRACT.md` agar halaman landing, aplikasi, dan laporan dapat dikerjakan paralel.

### Halaman

- **Landing** harus terasa seperti halaman produk SaaS modern: hero gradien, kartu cuplikan hasil, bagian masalah, cara kerja, fitur, template, paket harga, FAQ, CTA akhir.
- **Aplikasi** memakai layout dua kolom di desktop (form kiri, hasil kanan) dan satu kolom di ponsel.
- **Laporan** memakai gaya dokumen: header merek, metadata, tabel asumsi, metrik utama, grafik, rekomendasi, disclaimer.

---

## 10. Stack Teknologi

| Lapisan | Pilihan |
|---|---|
| Runtime | Node.js ≥ 18.17 (disarankan 20 LTS) |
| Modul | ESM (`"type": "module"`) |
| HTTP server | Modul `http` bawaan Node, tanpa framework |
| Dependency npm | **Nol** dependency runtime maupun development |
| Frontend | HTML, CSS, JavaScript ES modules, tanpa bundler |
| Grafik | SVG murni yang dibuat lewat DOM API |
| Penyimpanan skenario | `localStorage` browser |
| Penyimpanan server | Tidak ada (stateless) |
| Test | `node:test` + `node:assert` bawaan |
| Port | 3000 (dapat diubah lewat `PORT`) |

### Arsitektur singkat

```
Browser (/ , /app , /laporan)
        │  fetch JSON
        ▼
Server HTTP Node (port 3000)
  ├── rute statis  → public/
  ├── rute API     → validasi → mesin Monte Carlo
  └── ekstensi     → stub Panel Pelanggan AI (tidak aktif)
```

Mesin simulasi adalah kode murni tanpa I/O, sehingga dapat diuji secara statistik dan dipakai ulang oleh rute mana pun.

---

## 11. Paket Harga (Teks Saja)

| Paket | Harga | Isi | CTA |
|---|---|---|---|
| **Gratis** | Rp0 / selamanya | 10.000 iterasi, 1 skenario tersimpan, 4 template, laporan dengan tanda AmanLaba | Mulai Gratis |
| **Pro** | Rp49.000 / bulan | Skenario tak terbatas*, semua template, laporan tanpa tanda, pencari harga lengkap | Coba Pro |
| **Bisnis** | Rp149.000 / bulan | Semua fitur Pro, 5 kursi tim, dukungan prioritas, akses awal Panel Pelanggan AI (segera hadir) | Konsultasi |

Ketentuan:

- Harga hanya informasi, tidak ada pembayaran atau aktivasi.
- Tombol Pro/Bisnis menampilkan pemberitahuan: "Versi demo: pembayaran belum tersedia."
- Tidak boleh ada klaim fitur yang belum ada tanpa label "segera hadir".
- Versi demo tidak menerapkan pembatasan paket; semua pengguna dapat menyimpan hingga 50 skenario per browser.

---

## 12. Titik Ekstensi: Panel Pelanggan AI

Disiapkan sebagai modul terpisah dengan antarmuka jelas, tetapi **tidak diimplementasikan** pada rilis ini:

- Letak: `backend/extensions/panel-pelanggan-ai/`.
- Status: `belum-diimplementasikan`.
- Tidak diimpor oleh server, tidak punya endpoint, tidak muncul di UI.
- Kontrak masa depan: menilai satu harga memakai banyak persona pelanggan sintetis, deterministik berdasarkan seed, dan mengembalikan skor penerimaan, keberatan, serta rekomendasi harga.
- Detail antarmuka ada di `CONTRACT.md` bagian 14.

Tujuannya agar fitur masa depan dapat ditambahkan tanpa mengubah mesin simulasi inti atau kontrak API yang sudah ada.

---

## 13. Kriteria Rilis

Rilis MVP dinyatakan selesai jika:

1. `npm start` menjalankan server di port 3000 tanpa dependency eksternal.
2. Tiga halaman utama (`/`, `/app`, `/laporan`) dapat diakses dan tidak meminta sumber daya eksternal.
3. Seluruh endpoint pada `CONTRACT.md` berfungsi dan memvalidasi input.
4. Simulasi dengan seed sama menghasilkan output identik.
5. Uji statistik terhadap kasus analitik lolos toleransi.
6. Empat template tersedia dan dapat langsung dihitung.
7. Simpan/muat/hapus skenario bekerja di `localStorage`.
8. Laporan dapat dicetak rapi pada A4, termasuk grafik dan disclaimer.
9. Landing memuat nilai produk, fitur, template, tiga paket harga, dan CTA ke `/app`.
10. `npm test` dan `bash verify.sh` lulus.
11. Tidak ada error console di halaman utama.
12. Tampilan tidak pecah pada lebar 360 px, 768 px, dan 1280 px.

---

## 14. Risiko dan Asumsi

| Risiko | Mitigasi |
|---|---|
| Pengguna memasukkan angka asal-asalan | Penjelasan singkat tiap field, template contoh, disclaimer bahwa hasil bergantung pada asumsi |
| Distribusi triangular menyederhanakan kenyataan | Nyatakan asumsi secara eksplisit di laporan dan UI |
| Respons permintaan linear adalah penyederhanaan | Tampilkan asumsi di UI dan laporan; pengguna dapat mengubah rentang harga untuk menguji skenario |
| Hasil disalahartikan sebagai jaminan | Copy tegas: "bukan nasihat keuangan", "peluang bukan kepastian" |
| Data hilang karena `localStorage` dibersihkan | Beri peringatan bahwa skenario tersimpan hanya di browser ini |
| Kinerja sapuan harga | Batasi iterasi sapuan dan jumlah titik, uji waktu respons |
| Nama merek belum dicek sebagai merek dagang | Validasi hukum sebelum peluncuran komersial |

Asumsi teknis:

- Browser modern mendukung ES modules, `fetch`, `Intl`, dan `localStorage`.
- Pengguna menjalankan aplikasi secara lokal atau di satu server Node.
- Tidak ada kebutuhan autentikasi atau penyimpanan terpusat pada MVP.
