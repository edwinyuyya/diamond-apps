# Catatan2

Aplikasi catatan sederhana: REST API Express dan UI satu halaman (HTML/CSS/JS vanilla) tanpa build
step, dengan penyimpanan JSON di file lokal.

## Stack

- Node.js 20+ (CommonJS, tanpa build step)
- Express 4 (`^4.21.2`) — satu-satunya dependency runtime
- HTML, CSS, dan JavaScript vanilla untuk frontend (`public/`)
- JSON file store (`server/store.js`) dengan penulisan atomik
- Test memakai `node:test` dan `fetch` bawaan Node (tanpa dependency tambahan)

## Prasyarat

- Node.js **>= 20** (`node --version`)
- npm (disertakan bersama Node.js)

## Menjalankan

Dari root proyek:

```bash
npm install      # memasang Express dan membuat package-lock.json
npm start        # menjalankan server di http://localhost:3000
npm run dev      # menjalankan server dengan node --watch (restart otomatis)
npm test         # menjalankan seluruh test (*.test.js) via node --test
npm run verify   # test + smoke test HTTP lewat verify.sh
```

Buka **http://localhost:3000** setelah `npm start`.

Catatan: `npm run verify` menjalankan `verify.sh` di root proyek (disediakan oleh QA). Perintah ini
baru tersedia setelah file tersebut ada.

## Data dan konfigurasi

Data disimpan sebagai JSON di **`data/notes.json`** (dibuat otomatis saat penulisan pertama, tidak
di-commit). Format file:

```json
{ "version": 1, "notes": [] }
```

Environment variable yang didukung:

| Nama | Default | Keterangan |
|---|---|---|
| `PORT` | `3000` | Port HTTP server. Nilai tidak valid / di luar rentang memakai `3000`. |
| `DATA_FILE` | `<root>/data/notes.json` | Lokasi file data. Path relatif di-resolve terhadap direktori kerja (`process.cwd()`); path absolut dipakai apa adanya. |
| `NODE_ENV` | — | Opsional, tidak mengubah perilaku API. |

Contoh:

```bash
PORT=4000 DATA_FILE=/tmp/catatan.json npm start
```

## API

Base URL: `http://localhost:3000`. Semua endpoint API berprefix `/api` dan mengembalikan JSON.

| Method | Path | Sukses | Keterangan |
|---|---|---|---|
| GET | `/api/health` | `200` | Health check → `{ "status": "ok" }` |
| GET | `/api/notes` | `200` | Daftar catatan, urut `updatedAt` descending |
| POST | `/api/notes` | `201` | Membuat catatan (`title` wajib, `content` opsional) |
| GET | `/api/notes/:id` | `200` | Satu catatan; `404` jika tidak ditemukan |
| PUT | `/api/notes/:id` | `200` | Update parsial (`title` dan/atau `content`) |
| DELETE | `/api/notes/:id` | `204` | Menghapus catatan; `404` jika tidak ditemukan |

Error memakai envelope `{ "error": { "code": ..., "message": ... } }`; validasi mengembalikan `400`
dengan `details`. Detail lengkap ada di `CONTRACT.md` §5.

Contoh:

```bash
curl -s http://localhost:3000/api/health
curl -s -X POST http://localhost:3000/api/notes \
  -H 'Content-Type: application/json' \
  -d '{"title":"Belanja mingguan","content":"Susu, telur, roti"}'
```

## Struktur direktori

```
catatan2/
├── package.json
├── package-lock.json
├── README.md
├── .gitignore
├── verify.sh              # test + smoke test (QA)
├── server/
│   ├── index.js           # entry point: baca PORT/DATA_FILE, listen
│   ├── app.js             # factory Express app (tanpa listen)
│   ├── store.js           # JSON file store
│   └── routes/
│       └── notes.js       # router /api/notes
├── public/                # UI statis (index.html, styles.css, app.js)
├── data/
│   └── notes.json         # dibuat saat runtime; tidak di-commit
└── tests/                 # store.test.js, api.test.js (QA)
```
