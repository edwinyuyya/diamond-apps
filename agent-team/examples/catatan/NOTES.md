# NOTES — Catatan lintas area

## t1 (database) — server/store.js

### Status
`server/store.js` sudah lengkap dan sesuai CONTRACT.md §3–§4. Implementasi dari percobaan
sebelumnya dipertahankan; hanya specifier modul bawaan diubah dari `node:fs/promises` dkk.
menjadi `fs/promises`, `path`, `crypto` agar persis seperti §4 (fungsional identik).

### Asumsi / keputusan
- Antrean promise bersifat **per instance** (tidak ada state global, sesuai §4.1). Setiap operasi,
  termasuk baca, masuk antrean; file dibaca ulang dari disk pada setiap operasi.
- File tidak ada (`ENOENT`) → data kosong `{version:1,notes:[]}`; error fs lain diteruskan.
- File korup / JSON invalid / `version !== 1` / `notes` bukan array / note bukan objek dengan lima
  field string → `Error`, file tidak pernah direset atau ditimpa.
- Field asing pada note dibuang saat parse; bentuk Note yang dikembalikan selalu lima field.
- `title` di-`trim()`; non-string → `TypeError` (store tidak memvalidasi panjang/required, §4.3).
- `content` yang tidak diberikan → `""`; tidak di-trim. Store tidak memvalidasi tipe/panjang.
- `update` id tidak ditemukan → `null` **tanpa menulis** (file byte-identik). Untuk id yang ada,
  `updatedAt` selalu diperbarui.
- Urutan memakai perbandingan string ISO (lebar tetap, setara kronologis): `updatedAt` desc,
  `createdAt` desc, `id` asc.
- Tulis atomik: `mkdir -p` direktori induk → tulis `<filePath>.tmp` → `rename`. Tidak ada akses
  file lain.
- `data/` tidak dibuat/di-commit sekarang; direktori dibuat otomatis saat tulis pertama
  (sesuai §3.2). Tidak ada file tambahan di `data/`.

### Catatan integrasi (penting untuk devops)
- Workspace induk `/home/user/diamond-apps/agent-team/package.json` berisi `"type": "module"`.
  Selama `catatan2/package.json` belum ada, Node memperlakukan `server/store.js` sebagai ESM
  sehingga `require('./server/store')` gagal (`require is not defined in ES module scope`).
  Ini akan hilang begitu devops membuat `catatan2/package.json` persis §8.1 (tanpa field `type`,
  default CommonJS). Tidak ada perubahan kode store yang diperlukan.
- Verifikasi t1 dijalankan terhadap salinan identik di direktori dengan `package.json`
  `{"type":"commonjs"}`: 9 test `node:test` lulus (list file absen, create/format file, get/update/
  remove + id tidak ditemukan, persistensi antar instance, urutan, file korup tidak direset,
  antrean 40 create/update konkuren tanpa update hilang, update id absen tidak mengubah file).

## t4 (devops) — bootstrap proyek

### Status
`package.json` (persis §8.1), `package-lock.json` (lockfileVersion 3, express 4.22.3 memenuhi
`^4.21.2`, tanpa devDependencies), `README.md`, dan `.gitignore` (persis §8.2, `.team/` tetap
diabaikan). Tidak ada build step. `verify.sh` dan `tests/` tidak dibuat karena milik QA.

### Verifikasi yang dijalankan
- `npm install` bersih (68 paket, 0 vulnerabilities) dan menghasilkan `package-lock.json`.
- `npm test` → `node --test` (auto-discovery), exit 0 dengan 0 test saat `tests/` belum ada.
- `npm start` di port default 3000 dan pada `PORT=3123`: log `Catatan2 berjalan di
  http://localhost:<port>`, `GET /api/health` 200, POST/GET `/api/notes` 200/201 dengan
  `DATA_FILE` sementara, `GET /` menyajikan `public/index.html` 200.
- `npm run dev` (`node --watch`) berhasil start.
- `resolvePort(undefined)`/`resolvePort('abc')` → 3000; `DATA_FILE` default → `<root>/data/notes.json`.
- `git check-ignore` mengonfirmasi semua pola `.gitignore` berlaku.

### Asumsi / catatan lingkungan
- Node yang tersedia 22.23.4 (memenuhi `engines.node >= 20`); tidak ada field `type`, sehingga
  proyek berjalan sebagai CommonJS seperti yang dibutuhkan `server/` dan `tests/`.
- Saat verifikasi, ada proses server lama (dari percobaan sebelumnya, cwd sudah terhapus) yang
  menahan port 3000; proses itu dihentikan agar pengujian port default valid. Ini bukan file
  proyek dan tidak memengaruhi isi repo.
- `npm run verify` akan gagal sampai QA menambahkan `verify.sh` (perilaku sesuai pembagian tugas).

## t5 (qa) — test otomatis + verify.sh

### Status
- `tests/store.test.js` (13 test) dan `tests/api.test.js` (14 test) dibuat memakai `node:test` +
  `node:assert/strict`, tanpa dependency tambahan.
- `verify.sh` dibuat dan executable (`chmod +x`), sesuai CONTRACT.md §9.2.
- Tidak ada file implementasi yang diubah. `data/` tidak dibuat dan `data/notes.json` asli tidak
  pernah disentuh (semua test memakai `fs.mkdtemp` di direktori sementara).

### Cakupan test
- Store: `filePath` invalid; list file belum ada → `[]`; create (UUID, trim title, content default,
  format file pretty-print + newline); get; update parsial/penuh + id tak dikenal (file byte-identik);
  remove; persistensi lintas instance; file JSON korup dan bentuk tidak sesuai melempar `Error`
  tanpa mereset file; urutan `updatedAt desc → createdAt desc → id asc`; 25 create konkuren.
- API (`createApp({store})`, `listen(0)`, `fetch`): health; list kosong; create sukses; validasi
  title/content persis §5.4 (termasuk body array dan urutan details); get + 404; PUT parsial/penuh,
  PUT `{}`, PUT 404; DELETE 204 tanpa body + 404; JSON rusak → `400 INVALID_JSON`; body > 100 KB →
  `413 PAYLOAD_TOO_LARGE`; urutan `updatedAt`; endpoint API tak dikenal → 404.
- Tidak ada test yang memakai port tetap 3000 atau `data/notes.json` asli; setiap test memakai
  direktori dan app instance sendiri sehingga aman berulang/paralel.

### Perilaku verify.sh
- `set -euo pipefail`, `cd` ke root dari lokasi skrip, `npm install --no-audit --no-fund` hanya bila
  `node_modules/` belum ada, lalu `npm test`.
- Smoke test HTTP nyata: `DATA_FILE` di `mktemp -d`, `PORT` default 3000 (override via env; nilai
  tidak valid jatuh ke 3000), poll `/api/health` maksimal 10 detik (sesuai §9.2), lalu
  POST → GET list → PUT → GET `/` → DELETE → GET (404) → endpoint API tak dikenal (404).
  Status code, envelope error, isi JSON penting, dan `#note-form` di halaman utama diverifikasi.
- `trap EXIT/INT/TERM` selalu mematikan server dan menghapus direktori sementara; mencetak
  `VERIFY OK` hanya bila semua lulus; kegagalan pertama mencetak `VERIFY GAGAL: <alasan>` + body/log
  terkait dan exit non-zero.

### Verifikasi yang dijalankan
- `npm test` → 27 test, 27 pass, 0 fail; dijalankan berulang (3x) tetap lulus.
- `./verify.sh` → exit 0, `VERIFY OK`, port 3000 bebas lagi setelah selesai; dijalankan 2x (idempoten).
- Salinan bersih tanpa `node_modules/` di `/tmp` → `npm install` berjalan, 27 test lulus,
  smoke test lulus, `VERIFY OK`, exit 0.
- Uji jalur gagal: port 3456 diduduki server dummy (503) lalu `PORT=3456 ./verify.sh` → exit 1 dengan
  pesan `VERIFY GAGAL: server berhenti sebelum siap (kemungkinan port 3456 sudah dipakai)`.
- `bash -n verify.sh` dan `node --check` kedua file test lulus.

### Kegagalan kontrak
Tidak ditemukan. Implementasi `server/store.js`, `server/app.js`, `server/routes/notes.js`, dan
`server/index.js` memenuhi kontrak yang diuji.
