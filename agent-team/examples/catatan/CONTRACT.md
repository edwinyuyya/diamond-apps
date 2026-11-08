# CONTRACT.md — Catatan2

Dokumen ini adalah **sumber kebenaran** untuk batas antarmodul. Frontend, backend, store, devops, dan QA wajib mengikuti kontrak ini tanpa menebak. Jika ada konflik antara dokumen ini dan implementasi, kontrak ini yang menang.

## 1. Struktur direktori (final)

```
catatan2/
├── package.json          # dibuat devops
├── package-lock.json     # dibuat npm install (devops)
├── README.md             # dibuat devops
├── .gitignore            # dibuat devops
├── verify.sh             # dibuat qa (executable)
├── server/
│   ├── index.js          # entry point server (backend)
│   ├── app.js            # factory Express app (backend)
│   ├── store.js          # JSON file store (database)
│   └── routes/
│       └── notes.js      # router /api/notes (backend)
├── public/
│   ├── index.html        # frontend
│   ├── styles.css        # frontend
│   └── app.js            # frontend
├── data/
│   └── notes.json        # dibuat saat runtime oleh store; tidak di-commit
└── tests/
    ├── store.test.js     # qa
    └── api.test.js       # qa
```

Catatan:
- Folder `.git/` dan `.team/` bukan bagian aplikasi dan tidak boleh diubah.
- Tidak ada file lain selain yang tercantum di atas, kecuali `node_modules/` dan file sementara store (`data/notes.json.tmp`). Jangan menambah dependency tanpa memperbarui kontrak.
- File yang tidak ada dalam daftar `owns` sebuah tugas tidak boleh ditulis oleh tugas tersebut.

## 2. Runtime, port, dan environment variable

| Nama | Default | Dipakai oleh | Perilaku |
|---|---|---|---|
| `PORT` | `3000` | `server/index.js` | Port HTTP. Jika tidak di-set atau bukan angka valid, gunakan `3000`. |
| `DATA_FILE` | `<root>/data/notes.json` | `server/index.js` | Path file data. Path relatif di-resolve terhadap `process.cwd()`; path absolut dipakai apa adanya. |
| `NODE_ENV` | tidak wajib | semua | Tidak mengubah kontrak API. Boleh dipakai untuk mengurangi log. |

- `app.js` **tidak boleh** membaca `PORT` atau melakukan `listen`. Hanya `index.js` yang melakukan `listen`.
- Root proyek = direktori yang berisi `package.json`.
- Aplikasi harus berjalan dengan `node server/index.js` dari root proyek.
- Semua response API ber-`Content-Type: application/json; charset=utf-8`, kecuali `204` (tanpa body) dan file statis.

Perintah standar dari root proyek:

| Perintah | Fungsi |
|---|---|
| `npm install` | Memasang dependency Express dan membuat `package-lock.json`. |
| `npm start` | Menjalankan server di port 3000 (atau `PORT`). |
| `npm run dev` | Menjalankan server dengan `node --watch`. |
| `npm test` | Menjalankan seluruh test (`node --test`, auto-discovery file `*.test.js`). |
| `npm run verify` | Menjalankan `verify.sh` (test + smoke test HTTP). |
| build | **Tidak ada build step.** Frontend disajikan apa adanya dari `public/`. |

## 3. Skema data

### 3.1 Objek Note (bentuk tunggal, dipakai API dan store)

```json
{
  "id": "3f2b1c9e-8a4d-4f6b-9c1e-2d7a5b8e4f10",
  "title": "Belanja mingguan",
  "content": "Susu, telur, roti",
  "createdAt": "2026-11-08T09:00:00.000Z",
  "updatedAt": "2026-11-08T09:00:00.000Z"
}
```

Aturan field:

| Field | Tipe | Aturan |
|---|---|---|
| `id` | string | UUID v4 dari `crypto.randomUUID()`. Dibuat sekali saat create, tidak pernah berubah. |
| `title` | string | Wajib. Disimpan setelah `trim()`. Panjang 1–200 karakter setelah trim. |
| `content` | string | Opsional saat create; default `""`. Tidak di-trim (spasi/indentasi dipertahankan). Maksimal 10.000 karakter. |
| `createdAt` | string | ISO 8601 UTC dengan milidetik (`new Date().toISOString()`), dibuat saat create, tidak berubah. |
| `updatedAt` | string | ISO 8601 UTC dengan milidetik. Sama dengan `createdAt` saat create; diperbarui setiap update sukses. |

Urutan daftar: `updatedAt` **descending**. Jika sama, `createdAt` descending. Jika masih sama, `id` ascending (lexicographic) agar deterministik.

### 3.2 Format file data

`data/notes.json` (atau `DATA_FILE`) berisi satu objek JSON:

```json
{
  "version": 1,
  "notes": []
}
```

- Ditulis pretty-print 2 spasi dan diakhiri newline: `JSON.stringify(data, null, 2) + "\n"`.
- `version` harus `1`.
- File dibuat otomatis (beserta direktori induknya) saat operasi tulis pertama. Operasi baca pada file yang belum ada menganggap data kosong dan **tidak** wajib membuat file.
- Penulisan **atomik**: tulis ke `<filePath>.tmp` di direktori yang sama, lalu `rename` ke `<filePath>`.
- File korup / JSON tidak valid / bentuk tidak sesuai: method store melempar `Error` (tidak boleh diam-diam mereset data). Route memetakannya ke `500 INTERNAL_ERROR`.
- Semua operasi store dijalankan berurutan melalui satu antrean internal (promise chain) agar tidak ada update yang hilang.

## 4. Kontrak modul store — `server/store.js`

Store adalah satu-satunya modul yang membaca/menulis file data. Tidak boleh memakai Express dan tidak boleh punya dependency eksternal (hanya modul bawaan Node: `fs/promises`, `path`, `crypto`).

### 4.1 Ekspor

```js
const { createStore } = require('./server/store');
const store = createStore({ filePath: '/absolute/path/notes.json' });
```

- `createStore({ filePath })` **sinkron**, mengembalikan objek store. `filePath` wajib string non-kosong; jika tidak, lempar `TypeError`.
- Tidak ada state global. Dua instance dengan `filePath` sama harus melihat data yang sama (dibaca dari disk).

### 4.2 Method (semua `async` / mengembalikan Promise)

| Method | Signature | Perilaku |
|---|---|---|
| `list` | `list()` → `Promise<Note[]>` | Mengembalikan semua catatan, sudah diurutkan sesuai §3.1. File tidak ada → `[]`. |
| `get` | `get(id)` → `Promise<Note \| null>` | `id` string. Tidak ditemukan → `null`. |
| `create` | `create({ title, content })` → `Promise<Note>` | `ID`, `createdAt`, `updatedAt` dibuat store. `content` yang tidak diberikan menjadi `""`. `title` di-`trim()`. Mengembalikan objek Note yang tersimpan. |
| `update` | `update(id, patch)` → `Promise<Note \| null>` | `patch` boleh berisi `title` dan/atau `content`. Field yang tidak ada tidak diubah. `title` di-`trim()`. `updatedAt` diperbarui. `id` tidak ditemukan → `null` dan file tidak berubah. |
| `remove` | `remove(id)` → `Promise<boolean>` | `true` jika terhapus, `false` jika tidak ditemukan. |

### 4.3 Batas tanggung jawab

- **Store tidak memvalidasi aturan bisnis panjang/required**; validasi request adalah tanggung jawab route. Namun store tetap melakukan normalisasi `title.trim()` dan default `content = ""`.
- Store tidak menangani HTTP, status code, atau pesan error API.
- Route **tidak boleh** membaca/menulis file data secara langsung; semua akses lewat method store.

## 5. Kontrak HTTP API

Base URL lokal: `http://localhost:3000`. Semua endpoint API berprefix `/api`.

### 5.1 Konvensi umum

- Body request dan response adalah JSON kecuali `204`.
- Request `POST`/`PUT` wajib mengirim `Content-Type: application/json`. Body maksimum **100 KB**.
- Sukses mengembalikan objek/array langsung (tanpa envelope).
- Error selalu memakai envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data catatan tidak valid",
    "details": [
      { "field": "title", "message": "Judul wajib diisi" }
    ]
  }
}
```

- `details` hanya ada untuk `VALIDATION_ERROR`.
- Pesan `message` dan `details[].message` **persis** seperti tabel §5.4 (bahasa Indonesia).
- Tidak ada stack trace, nama file, atau detail internal di response.

### 5.2 Daftar endpoint

| Method | Path | Sukses | Error yang mungkin |
|---|---|---|---|
| GET | `/api/health` | `200` | — |
| GET | `/api/notes` | `200` array Note | `500` |
| POST | `/api/notes` | `201` Note | `400`, `413`, `500` |
| GET | `/api/notes/:id` | `200` Note | `404`, `500` |
| PUT | `/api/notes/:id` | `200` Note | `400`, `404`, `413`, `500` |
| DELETE | `/api/notes/:id` | `204` | `404`, `500` |

Method/path lain di bawah `/api` → `404 NOT_FOUND` JSON. Tidak memakai `405`.

### 5.3 Detail endpoint

#### GET `/api/health`

Response `200`:

```json
{ "status": "ok" }
```

#### GET `/api/notes`

Response `200`:

```json
[
  {
    "id": "3f2b1c9e-8a4d-4f6b-9c1e-2d7a5b8e4f10",
    "title": "Belanja mingguan",
    "content": "Susu, telur, roti",
    "createdAt": "2026-11-08T09:00:00.000Z",
    "updatedAt": "2026-11-08T09:00:00.000Z"
  }
]
```

Daftar kosong → `200` dengan body `[]`.

#### POST `/api/notes`

Request:

```json
{ "title": "Ide proyek", "content": "Buat aplikasi catatan" }
```

- `title` wajib, string, 1–200 karakter setelah trim.
- `content` opsional; jika tidak dikirim → `""`; jika dikirim harus string, maksimal 10.000 karakter.
- Field asing diabaikan.

Response `201`:

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "title": "Ide proyek",
  "content": "Buat aplikasi catatan",
  "createdAt": "2026-11-08T10:15:30.123Z",
  "updatedAt": "2026-11-08T10:15:30.123Z"
}
```

Response `400` (contoh judul kosong):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data catatan tidak valid",
    "details": [
      { "field": "title", "message": "Judul wajib diisi" }
    ]
  }
}
```

#### GET `/api/notes/:id`

Response `200`: objek Note (bentuk sama seperti elemen daftar).

Response `404`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Catatan tidak ditemukan"
  }
}
```

#### PUT `/api/notes/:id`

Request (kirim minimal satu field; field yang tidak dikirim tidak diubah):

```json
{ "title": "Belanja mingguan (baru)", "content": "Susu, telur, roti, kopi" }
```

- `title`, jika dikirim: string, 1–200 karakter setelah trim.
- `content`, jika dikirim: string, maksimal 10.000 karakter (tidak di-trim).
- Body `{}` atau tanpa `title`/`content` → `400 VALIDATION_ERROR` dengan detail field `body`.
- `updatedAt` diisi waktu update; `createdAt` dan `id` tidak berubah.

Response `200`: objek Note setelah update.

Response `404`: envelope `NOT_FOUND` seperti di atas.
Response `400`: envelope `VALIDATION_ERROR` sesuai §5.4.

#### DELETE `/api/notes/:id`

Response sukses `204` dengan body kosong (tanpa `Content-Type` JSON).

Response `404`: envelope `NOT_FOUND` “Catatan tidak ditemukan”.

#### Route API tidak dikenal

Response `404`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Endpoint tidak ditemukan"
  }
}
```

### 5.4 Pesan validasi & kode error (persis)

Kode error yang dipakai: `VALIDATION_ERROR`, `INVALID_JSON`, `NOT_FOUND`, `PAYLOAD_TOO_LARGE`, `INTERNAL_ERROR`.

| Kondisi | Status | `code` | `message` | `details` |
|---|---|---|---|---|
| Body bukan objek JSON | 400 | `VALIDATION_ERROR` | `Data catatan tidak valid` | `[{"field":"body","message":"Body harus berupa objek JSON"}]` |
| `title` tidak ada / `null` / string kosong setelah trim | 400 | `VALIDATION_ERROR` | `Data catatan tidak valid` | `[{"field":"title","message":"Judul wajib diisi"}]` |
| `title` bukan string | 400 | `VALIDATION_ERROR` | `Data catatan tidak valid` | `[{"field":"title","message":"Judul harus berupa teks"}]` |
| `title` > 200 karakter setelah trim | 400 | `VALIDATION_ERROR` | `Data catatan tidak valid` | `[{"field":"title","message":"Judul maksimal 200 karakter"}]` |
| `content` ada tapi bukan string | 400 | `VALIDATION_ERROR` | `Data catatan tidak valid` | `[{"field":"content","message":"Isi harus berupa teks"}]` |
| `content` > 10.000 karakter | 400 | `VALIDATION_ERROR` | `Data catatan tidak valid` | `[{"field":"content","message":"Isi maksimal 10000 karakter"}]` |
| PUT tanpa `title` dan tanpa `content` | 400 | `VALIDATION_ERROR` | `Data catatan tidak valid` | `[{"field":"body","message":"Kirim minimal satu field: title atau content"}]` |
| JSON rusak (parse error) | 400 | `INVALID_JSON` | `Body request bukan JSON yang valid` | tidak ada |
| Body > 100 KB | 413 | `PAYLOAD_TOO_LARGE` | `Body request terlalu besar` | tidak ada |
| Catatan tidak ditemukan | 404 | `NOT_FOUND` | `Catatan tidak ditemukan` | tidak ada |
| Endpoint API tidak ditemukan | 404 | `NOT_FOUND` | `Endpoint tidak ditemukan` | tidak ada |
| Error tak terduga / file data korup | 500 | `INTERNAL_ERROR` | `Terjadi kesalahan pada server` | tidak ada |

Aturan tambahan validasi:
- Jika beberapa field invalid, `details` boleh berisi lebih dari satu entri, urut `title` lalu `content`.
- `title` string berisi spasi saja dianggap kosong.
- Field asing diabaikan, bukan error.
- Body array/angka/string/boolean → `VALIDATION_ERROR` body.

### 5.5 Static file & non-API route

| Request | Hasil |
|---|---|
| `GET /` | `public/index.html` |
| `GET /styles.css` | `public/styles.css` |
| `GET /app.js` | `public/app.js` |
| Path non-API lain | `404` teks biasa (`Not Found`); **tidak ada** fallback SPA ke `index.html` |

File statis disajikan oleh `express.static(path.join(__dirname, '..', 'public'))`.

## 6. Kontrak backend — `server/app.js`, `server/index.js`, `server/routes/notes.js`

### 6.1 `server/app.js`

```js
const { createApp } = require('./app');
const app = createApp({ store });
```

- `createApp({ store })` menerima objek store sesuai §4 dan mengembalikan Express app **tanpa** memanggil `listen`.
- Menggunakan `express.json({ limit: '100kb' })`.
- Memasang router catatan di `/api`.
- Menyediakan `GET /api/health`.
- Menyajikan `public/` secara statis.
- Memasang handler `404` API (setelah semua route API) dan error middleware (paling akhir) yang memetakan:
  - `SyntaxError` dengan `err.type === 'entity.parse.failed'` → `400 INVALID_JSON`
  - `err.type === 'entity.too.large'` → `413 PAYLOAD_TOO_LARGE`
  - lainnya → `500 INTERNAL_ERROR`
- Tidak boleh membocorkan stack trace.

### 6.2 `server/routes/notes.js`

- Mengekspor `createNotesRouter(store)` yang mengembalikan `express.Router()`.
- Menangani `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id` relatif terhadap mount `/api/notes`.
- Validasi dilakukan di sini sebelum memanggil store.
- `DELETE` sukses memakai `res.status(204).end()`.
- Semua handler `async`; error store diteruskan ke `next(err)`.

### 6.3 `server/index.js`

- Membaca `PORT` dan `DATA_FILE` sesuai §2.
- `DATA_FILE` default: `path.resolve(__dirname, '..', 'data', 'notes.json')`.
- Jika `DATA_FILE` relatif: `path.resolve(process.cwd(), process.env.DATA_FILE)`.
- Membuat store, memanggil `createApp({ store })`, lalu `listen(port)`.
- Mencetak satu baris log: `Catatan2 berjalan di http://localhost:<port>`.
- Tidak boleh menjalankan `listen` saat di-`require` oleh test (test hanya memakai `app.js`).

## 7. Kontrak frontend — `public/`

### 7.1 Aset

- `index.html`, `styles.css`, `app.js` — tanpa framework, tanpa CDN, tanpa build, tanpa import eksternal.
- `app.js` dimuat dengan `<script src="/app.js" defer></script>`; CSS dengan `<link rel="stylesheet" href="/styles.css">`.
- Semua request memakai path relatif (`/api/notes`, bukan URL absolut dengan host lain).

### 7.2 ID dan selector wajib (stabil, dipakai QA/UI)

| Selector | Elemen | Wajib |
|---|---|---|
| `#note-form` | `<form>` tambah/edit | ya |
| `#title` | `<input type="text" maxlength="200">` dengan `<label for="title">` | ya |
| `#content` | `<textarea maxlength="10000">` dengan `<label for="content">` | ya |
| `#submit-btn` | tombol submit | ya |
| `#cancel-btn` | tombol batal, `type="button"`, `hidden` saat mode tambah | ya |
| `#form-error` | area pesan error, `role="alert"`, kosong saat tidak ada error | ya |
| `#notes-list` | container daftar catatan | ya |
| `#list-status` | area status loading/error daftar, `role="status"` | ya |

- Setiap kartu catatan memakai `<article class="note" data-id="<id>">`, judul di `.note-title`, isi di `.note-content`, waktu di `.note-updated`, tombol `.edit-btn` dan `.delete-btn`.
- Teks tombol: `Tambah Catatan` (mode tambah), `Simpan Perubahan` (mode edit), `Batal`, `Edit`, `Hapus`.

### 7.3 Perilaku wajib

1. Saat halaman dimuat: tampilkan “Memuat catatan…” di `#list-status`, panggil `GET /api/notes`, render daftar, lalu kosongkan status.
2. Daftar kosong: tampilkan paragraf “Belum ada catatan.” di dalam `#notes-list`.
3. Submit form:
   - Mode tambah → `POST /api/notes` dengan `{title, content}`.
   - Mode edit → `PUT /api/notes/:id` dengan `{title, content}`.
   - Sukses: reset form ke mode tambah, muat ulang daftar, kosongkan `#form-error`.
   - Gagal: tampilkan pesan dari `error.message` (fallback: “Gagal menyimpan catatan.”) di `#form-error`; isian tidak dihapus.
4. Klik Edit: isi `#title` dan `#content`, simpan id aktif, ubah label tombol menjadi “Simpan Perubahan”, tampilkan `#cancel-btn`, fokus ke `#title`.
5. Klik Batal: kosongkan form, hapus id aktif, kembalikan tombol ke “Tambah Catatan”, sembunyikan `#cancel-btn`, kosongkan `#form-error`.
6. Klik Hapus: `window.confirm('Hapus catatan ini?')`. Jika ya → `DELETE /api/notes/:id`, lalu muat ulang daftar. Jika catatan yang dihapus sedang diedit, panggil perilaku Batal.
7. Error jaringan/API saat memuat daftar: tampilkan pesan error di `#list-status`; jangan render kartu parsial.
8. Semua data pengguna (`title`, `content`) dirender dengan `textContent`/node teks, **bukan** `innerHTML`. Tidak ada eksekusi HTML dari data.
9. Format waktu: `new Date(updatedAt).toLocaleString('id-ID')`; jika gagal, tampilkan string asli.
10. Form tidak reload halaman (`preventDefault`). Tombol Hapus/Edit bertipe `button`.

## 8. Kontrak devops — `package.json`, README, `.gitignore`

### 8.1 `package.json` (field dan nilai persis)

```json
{
  "name": "catatan2",
  "version": "1.0.0",
  "private": true,
  "description": "Aplikasi catatan sederhana dengan REST API Express dan UI satu halaman",
  "main": "server/index.js",
  "engines": { "node": ">=20" },
  "scripts": {
    "start": "node server/index.js",
    "dev": "node --watch server/index.js",
    "test": "node --test",
    "verify": "bash verify.sh"
  },
  "dependencies": {
    "express": "^4.21.2"
  }
}
```

- Tidak ada `devDependencies`. Test memakai `node:test` dan `fetch` bawaan Node.
- `npm test` memakai `node --test` tanpa argumen direktori; file test ditemukan otomatis dari pola `*.test.js`. Jangan memakai `node --test tests/` karena Node memperlakukan argumen direktori sebagai modul.
- `npm install` harus menghasilkan `package-lock.json`; lock file di-commit.

### 8.2 `.gitignore` (final)

```
node_modules/
.team/
data/notes.json
data/*.tmp
*.log
.DS_Store
```

### 8.3 `README.md`

Wajib memuat:
- Deskripsi singkat aplikasi dan stack.
- Prasyarat (Node.js >= 20, npm).
- Perintah: `npm install`, `npm start`, `npm run dev`, `npm test`, `npm run verify`.
- URL aplikasi: `http://localhost:3000`.
- Lokasi data dan env `PORT`/`DATA_FILE`.
- Ringkasan endpoint API (tabel method + path + status sukses).
- Struktur direktori singkat.

## 9. Kontrak QA — `tests/` dan `verify.sh`

### 9.1 Test otomatis (`node:test`)

- `tests/store.test.js`: membuat store dengan `filePath` di direktori sementara (`fs.mkdtemp`), menguji:
  - list pada file belum ada → `[]`;
  - create menghasilkan Note lengkap dan menulis file sesuai §3.2;
  - get/update/remove termasuk kasus id tidak ditemukan;
  - data terlihat oleh instance store baru dengan file yang sama (persistensi);
  - file JSON korup → method melempar error.
- `tests/api.test.js`: memakai `createApp({ store })` dengan `DATA_FILE` sementara, `server.listen(0)` (port ephemeral), lalu `fetch` ke port tersebut. Menguji minimal:
  - health, list kosong;
  - create sukses + validasi judul kosong/terlalu panjang + `content` bukan string;
  - get satu catatan + 404;
  - update (parsial dan penuh) + 404 + PUT kosong;
  - delete + 404;
  - JSON rusak → `400 INVALID_JSON`;
  - urutan `updatedAt` descending;
  - endpoint API tidak dikenal → 404.
- Test tidak boleh menyentuh `data/notes.json` asli dan tidak boleh bergantung pada port 3000.
- Test harus dapat berjalan paralel/berulang tanpa state saling mempengaruhi.
- `npm test` menjalankan `node --test` (auto-discovery). Jangan memakai argumen direktori seperti `node --test tests/`.

### 9.2 `verify.sh`

- Shebang `#!/usr/bin/env bash`, `set -euo pipefail`, executable (`chmod +x`).
- Menentukan root dari lokasi skrip, lalu `cd` ke root.
- Menjalankan `npm install --no-audit --no-fund` bila `node_modules/` belum ada.
- Menjalankan `npm test`.
- Menjalankan smoke test HTTP nyata:
  - `DATA_FILE` di direktori sementara, `PORT` default `3000` (boleh dioverride env `PORT`).
  - Jalankan `node server/index.js` di background, tunggu `GET /api/health` sukses (maksimal ±10 detik).
  - Lakukan POST → GET list → PUT → DELETE → cek 404; verifikasi status code dan isi JSON penting.
  - Selalu matikan proses server lewat `trap` (termasuk saat gagal).
- Mencetak `VERIFY OK` bila semua lulus; exit non-zero pada kegagalan pertama.
- Tidak boleh mengubah file implementasi.

## 10. Matriks kepemilikan (ringkas)

| Area | Pemilik |
|---|---|
| `server/store.js`, `data/` | database |
| `server/app.js`, `server/index.js`, `server/routes/` | backend |
| `public/` | frontend |
| `package.json`, `package-lock.json`, `README.md`, `.gitignore` | devops |
| `tests/`, `verify.sh` | qa |

Perubahan lintas area harus melalui pembaruan kontrak ini terlebih dahulu, bukan dilakukan diam-diam di dalam tugas.
