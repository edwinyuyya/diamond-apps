# SPEC.md — Catatan2

Aplikasi catatan pribadi yang berjalan lokal: **REST API CRUD** (Node.js + Express) dengan penyimpanan **file JSON** (tanpa database eksternal) dan **UI web satu halaman** untuk melihat, menambah, mengubah, dan menghapus catatan. Server berjalan di **port 3000**.

## 1. Tujuan

- Menyediakan aplikasi catatan yang bisa langsung dijalankan secara lokal dengan satu perintah (`npm start`), tanpa akun, cloud, atau layanan eksternal.
- Menyediakan API JSON yang sederhana dan konsisten sebagai satu-satunya jalur baca/tulis data.
- Menyediakan UI satu halaman yang memakai API tersebut untuk alur tambah, edit, dan hapus catatan.
- Menjaga data tetap ada setelah server restart melalui file JSON di disk.

## 2. Fitur MVP (ketat)

### 2.1 Termasuk

1. **Lihat daftar catatan** — semua catatan ditampilkan, terbaru diperbarui di atas.
2. **Tambah catatan** — judul wajib, isi opsional. Setelah simpan, catatan muncul di daftar.
3. **Edit catatan** — mengubah judul dan/atau isi catatan yang sudah ada.
4. **Hapus catatan** — dengan konfirmasi sebelum menghapus.
5. **Validasi input** — judul tidak boleh kosong, panjang judul maksimal 200 karakter, isi maksimal 10.000 karakter.
6. **Penyimpanan persisten** — data disimpan ke `data/notes.json` dan bertahan setelah restart.
7. **Penanganan error** — API mengembalikan JSON error yang konsisten; UI menampilkan pesan error yang bisa dibaca.
8. **UI satu halaman** — form tambah/edit, daftar catatan, empty state, loading state, dan tombol batal saat mode edit.
9. **Health check** — `GET /api/health` untuk memastikan server hidup.
10. **Test otomatis + `verify.sh`** — test API dan store berjalan tanpa layanan eksternal.

### 2.2 Tidak termasuk (di luar MVP)

- Login, registrasi, multi-user, atau pembagian akses.
- Pencarian, filter, tag, kategori, favorit, arsip, pin, reminder.
- Pagination dan sorting yang bisa dikonfigurasi pengguna.
- Markdown, lampiran, gambar, atau editor rich text.
- Sinkronisasi cloud, realtime collaboration, WebSocket, email/notifikasi.
- Database eksternal (PostgreSQL, MySQL, MongoDB, Redis, dsb.).
- Build step frontend, framework SPA (React/Vue/dll.), CDN, atau aset dari internet.
- Deployment, Docker, HTTPS, dan autentikasi.
- Migrasi data dari aplikasi lain.

## 3. User flow

### 3.1 Melihat daftar catatan
1. Pengguna membuka `http://localhost:3000/`.
2. Halaman memuat catatan dari `GET /api/notes`.
3. Jika ada data, catatan tampil sebagai kartu berisi judul, isi, dan waktu pembaruan.
4. Jika kosong, tampil pesan **“Belum ada catatan.”**

### 3.2 Menambah catatan
1. Pengguna mengisi field **Judul** (wajib) dan **Isi** (opsional).
2. Klik **Tambah Catatan**.
3. UI mengirim `POST /api/notes`.
4. Jika berhasil, form dikosongkan dan catatan baru tampil di daftar.
5. Jika validasi gagal, pesan error tampil di area error form tanpa menghilangkan isian pengguna.

### 3.3 Mengedit catatan
1. Pengguna klik **Edit** pada sebuah kartu.
2. Form terisi judul dan isi catatan tersebut; tombol berubah menjadi **Simpan Perubahan** dan tombol **Batal** muncul.
3. Pengguna mengubah data lalu klik **Simpan Perubahan**.
4. UI mengirim `PUT /api/notes/:id`.
5. Jika berhasil, daftar diperbarui dan form kembali ke mode tambah.
6. Klik **Batal** mengosongkan form dan keluar dari mode edit tanpa mengubah data.

### 3.4 Menghapus catatan
1. Pengguna klik **Hapus** pada sebuah kartu.
2. UI meminta konfirmasi (`window.confirm`).
3. Jika disetujui, UI mengirim `DELETE /api/notes/:id`.
4. Kartu dihapus dari daftar. Jika catatan tersebut sedang diedit, mode edit dibatalkan.
5. Jika gagal, pesan error tampil dan daftar tidak berubah.

### 3.5 Kondisi khusus
- **Loading:** saat memuat daftar, tampil teks “Memuat catatan…”.
- **Gagal memuat:** tampil pesan error dan daftar tidak dirender setengah jadi.
- **Catatan tidak ditemukan** (mis. sudah dihapus di tab lain): UI menampilkan error dan memuat ulang daftar.

## 4. Stack teknologi

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Runtime | Node.js **>= 20** | `fetch`, `node:test`, dan `crypto.randomUUID` tersedia bawaan. |
| Web server | **Express 4** (`^4.21.2`) | Satu-satunya dependency runtime; cukup untuk routing, JSON body, static file. |
| Penyimpanan | **File JSON** `data/notes.json` | Tidak perlu database/server eksternal; mudah diperiksa manusia. |
| Frontend | **HTML + CSS + JavaScript vanilla** | Tanpa build step, tanpa framework, tanpa CDN. |
| Test | **`node:test` + `node:assert`** | Bawaan Node; tanpa dependency tambahan. |
| Dev tooling | npm scripts + `verify.sh` | Install, start, test, dan smoke check yang seragam. |

Tidak ada dependency selain Express. Tidak ada proses build. Aplikasi harus bisa dijalankan sepenuhnya offline setelah `npm install`.

## 5. Arsitektur singkat

```
Browser (public/index.html + app.js + styles.css)
        │ fetch JSON
        ▼
Express (server/app.js, server/routes/notes.js)
        │ panggilan method async
        ▼
Store JSON (server/store.js) ──► data/notes.json
```

- **`server/store.js`** — satu-satunya modul yang menyentuh file data. Menangani load, validasi bentuk file, pembuatan ID/timestamp, sorting, dan penulisan atomik.
- **`server/routes/notes.js` + `server/app.js`** — validasi request, pemetaan status HTTP, error envelope, dan penyajian file statis dari `public/`.
- **`server/index.js`** — entry point: membaca env, membuat store, membuat app, listen di port 3000.
- **`public/`** — UI yang hanya berkomunikasi lewat HTTP API; tidak tahu format file di disk.

Detail persis antarmuka antar modul ada di `CONTRACT.md`.

## 6. Kriteria penerimaan

1. `npm install` berhasil hanya dengan dependency Express.
2. `npm start` menjalankan server di `http://localhost:3000` dan `GET /` menampilkan UI.
3. `GET /api/health` mengembalikan `200` dengan body `{"status":"ok"}`.
4. Seluruh endpoint CRUD bekerja sesuai `CONTRACT.md`, termasuk status code dan bentuk JSON.
5. Catatan tersimpan di `data/notes.json` dan masih ada setelah server dihentikan lalu dijalankan lagi.
6. Judul kosong/spasi ditolak dengan `400` dan pesan validasi yang jelas; isi melebihi batas ditolak.
7. Request JSON rusak ditolak dengan `400` dan tidak membuat server crash.
8. Menambah, mengedit, dan menghapus catatan lewat UI benar-benar mengubah data di server.
9. Data pengguna dirender sebagai teks (tidak dieksekusi sebagai HTML).
10. UI menampilkan empty state, loading state, dan error state.
11. `npm test` lulus tanpa memakai `data/notes.json` asli dan tanpa port tetap.
12. `npm run verify` (menjalankan `verify.sh`) lulus dari kondisi bersih dan mengembalikan exit code non-zero bila ada kegagalan.
13. Tidak ada akses jaringan eksternal saat runtime maupun test.

## 7. Asumsi, batasan, dan non-fungsional

- **Single user / single process.** Tidak ada locking antar-proses; store hanya menjamin konsistensi di dalam satu proses Node.
- **Skala kecil.** Seluruh catatan dibaca per request; tidak ada pagination. Ini memadai untuk ratusan catatan.
- **Data plaintext.** File JSON dapat dibaca siapa pun yang punya akses ke filesystem; bukan untuk data sensitif.
- **Port default 3000**, dapat dioverride lewat env `PORT` (lihat `CONTRACT.md`).
- **Bahasa UI dan pesan error:** Indonesia. Format tanggal ditampilkan dengan locale `id-ID` bila tersedia.
- **Tanpa autentikasi**, sehingga server sebaiknya hanya dijalankan di localhost/jaringan tepercaya.
- **Responsif:** UI tetap dapat dipakai pada lebar layar ponsel (satu kolom).
- **Aksesibilitas dasar:** setiap input punya label, tombol punya teks, area error memakai `role="alert"`, dan fokus keyboard tetap bisa menjangkau semua kontrol.
