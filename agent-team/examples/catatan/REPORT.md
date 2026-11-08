# REPORT — Catatan2

**Peran:** Code Reviewer
**Tanggal:** 2026-11-08
**Ruang lingkup:** perbandingan implementasi terhadap `SPEC.md`/`CONTRACT.md`, pemeriksaan keamanan dasar, dan verifikasi ulang `verify.sh`.
**Keputusan:** **LULUS** — seluruh fitur MVP selesai dan sesuai kontrak. Tidak ada temuan kritis/tinggi. Ada beberapa rekomendasi hardening (lihat §5).

---

## 1. Ringkasan

Aplikasi catatan lokal sesuai spesifikasi: REST API Express 4 + penyimpanan file JSON + UI satu halaman
HTML/CSS/JS vanilla, tanpa build step dan tanpa dependency selain Express. Seluruh 27 test otomatis lulus,
`verify.sh` lulus dengan exit code 0 (`VERIFY OK`), dan working tree bersih.

Verifikasi yang saya jalankan sendiri:

| Pemeriksaan | Hasil |
|---|---|
| `bash verify.sh` (npm test + smoke HTTP nyata di port 3000) | **LULUS**, `VERIFY OK`, exit `0` |
| `npm test` via verify (27 test: 13 store + 14 API) | **27 pass, 0 fail** |
| `npm audit --omit=dev --offline` | **0 vulnerabilities** (express 4.22.3, memenuhi `^4.21.2`) |
| Persistensi lintas restart server (POST → matikan → start ulang → GET list) | **LULUS**, catatan tetap ada |
| `data/` tidak dibuat / `data/notes.json` tidak tersentuh | **Terbukti** (direktori `data/` tidak ada) |
| Scan XSS (`innerHTML`, `eval`, `document.write`, `insertAdjacentHTML`) | **Tidak ditemukan** di `public/` maupun `server/` |
| Scan secret hardcoded (password/token/API key/private key) | **Tidak ditemukan** |
| Scan URL eksternal / CDN | **Tidak ditemukan** (hanya `http://localhost` pada log) |
| `git status` | **Bersih**, tidak ada file tak ter-commit |

Catatan: `Docker`, autentikasi, database eksternal, framework frontend, dan fitur di luar MVP memang
tidak ada — sesuai §2.2 SPEC, bukan kekurangan.

---

## 2. Cara menjalankan

Prasyarat: **Node.js >= 20** dan npm (diuji pada Node v22.23.4, npm 10.9.9).

```bash
cd /home/user/diamond-apps/agent-team/projects/catatan2
npm install          # hanya Express; menghasilkan package-lock.json
npm start            # server di http://localhost:3000
```

Lalu buka `http://localhost:3000`.

Perintah lain:

```bash
npm run dev          # node --watch
npm test             # 27 test (node --test), tanpa data asli & tanpa port tetap
npm run verify       # npm test + smoke test HTTP nyata (port 3000, DATA_FILE sementara)
```

Konfigurasi opsional:

```bash
PORT=4000 DATA_FILE=/tmp/catatan.json npm start
```

- `PORT` tidak valid → jatuh ke `3000`.
- `DATA_FILE` relatif di-resolve terhadap `cwd`; absolut dipakai apa adanya.
- File data default `data/notes.json`, dibuat otomatis saat tulis pertama (format
  `{"version":1,"notes":[]}`, pretty-print 2 spasi + newline).
- Smoke test `verify.sh` memakai `DATA_FILE` di direktori `mktemp` dan tidak menyentuh data asli.

---

## 3. Fitur selesai vs belum

### 3.1 Fitur MVP (SPEC §2.1) — semua selesai

| # | Fitur | Status | Bukti |
|---|---|---|---|
| 1 | Lihat daftar catatan, terbaru diperbarui di atas | ✅ | `GET /api/notes`; sort `updatedAt desc → createdAt desc → id asc` (test) |
| 2 | Tambah catatan (judul wajib, isi opsional) | ✅ | `POST /api/notes` → 201 (test + smoke) |
| 3 | Edit catatan | ✅ | `PUT /api/notes/:id` parsial/penuh (test); UI mode edit + Batal |
| 4 | Hapus dengan konfirmasi | ✅ | `window.confirm('Hapus catatan ini?')`; `DELETE` → 204 (test + smoke) |
| 5 | Validasi input (judul ≤ 200, isi ≤ 10.000, judul wajib) | ✅ | Tabel §5.4 persis; diuji termasuk trim, tipe salah, batas panjang |
| 6 | Penyimpanan persisten `data/notes.json` | ✅ | Store menulis atomik `.tmp` + rename; saya uji restart server |
| 7 | Error JSON konsisten & pesan UI terbaca | ✅ | Envelope `{error:{code,message,details?}}`; fallback pesan di UI |
| 8 | UI satu halaman (form, daftar, empty/loading/error, tombol Batal) | ✅ | `public/index.html` + `app.js`; ID wajib §7.2 lengkap |
| 9 | Health check `GET /api/health` | ✅ | 200 `{"status":"ok"}` (test + smoke) |
| 10 | Test otomatis + `verify.sh` | ✅ | 27 test; `verify.sh` executable (`100755`), exit non-zero saat gagal |
| — | Persistensi setelah restart | ✅ | Diverifikasi manual: POST → stop → start → list masih berisi catatan |

Kriteria penerimaan SPEC §6: 1–13 semuanya terpenuhi. Poin 8–10 (alur UI) diverifikasi lewat review kode +
smoke HTTP; tidak ada otomatisasi browser (lihat §3.3).

### 3.2 Fitur di luar MVP — tidak dikerjakan (sesuai spec)

Login/multi-user, pencarian/filter/tag, pagination, markdown/lampiran, cloud/WebSocket, database eksternal,
build step/framework frontend/CDN, Docker/HTTPS/auth, migrasi data — semuanya sengaja tidak ada sesuai §2.2.

### 3.3 Kesenjangan nyata (bukan pelanggaran spec)

1. **Tidak ada test otomatis untuk UI/DOM.** Test hanya mencakup store + HTTP API. Perilaku UI
   (mode edit, batal, konfirmasi, render `textContent`, empty/loading/error state) diverifikasi manual
   dan lewat pembacaan kode, bukan browser test. Spec tidak mewajibkan browser test.
2. **Smoke test `verify.sh` tidak menguji validasi 400/413 dan restart.** Kasus 400/413 sudah diuji unit
   test `tests/api.test.js`; restart saya uji manual. Cukup untuk MVP, tetapi bisa diperkuat.
3. **README sedikit basi:** `README.md` §Menjalankan menyebut `npm run verify` "baru tersedia setelah
   file tersebut ada"; `verify.sh` sekarang sudah ada. Hanya catatan dokumentasi.

---

## 4. Kesesuaian kontrak (sorotan)

- `package.json` persis §8.1 (tanpa `devDependencies`, `node --test` tanpa argumen direktori) ✔
- `.gitignore` persis §8.2; `verify.sh` mode `100755` ✔
- Struktur direktori persis §1; tidak ada file tak terduga di repo (selain `SPEC/CONTRACT/NOTES/plan/REPORT`) ✔
- Store hanya memakai `fs/promises`, `path`, `crypto`; tanpa state global; antrean per instance ✔
- Tulis atomik `.tmp` + `rename`; file korup melempar `Error` tanpa reset (diuji) ✔
- Route memakai store saja, tidak menyentuh file; error store → `next(err)` ✔
- 204 tanpa body; `Content-Type: application/json; charset=utf-8` pada response API (diuji) ✔
- Body `array`/`number`/`string`/`boolean`/`null` → 400 `VALIDATION_ERROR` body (saya uji manual) ✔
- `PATCH`/method lain di path dikenal → 404 (tanpa 405), sesuai §5.2 ✔
- Tidak ada fallback SPA; path non-API → 404 teks `Not Found` ✔
- Frontend memakai ID wajib §7.2, teks tombol persis, semua data pengguna via `textContent` ✔

---

## 5. Risiko & temuan keamanan

Ringkasan: tidak ada temuan **Kritis** atau **Tinggi**. Berikut temuan yang tersisa, diurutkan menurut
dampak.

| # | Tingkat | Temuan |
|---|---|---|
| 1 | **Sedang** | Server mengikat semua network interface tanpa autentikasi |
| 2 | Rendah | `X-Powered-By: Express` dan tidak ada security header/CSP |
| 3 | Rendah | Malformed percent-encoding di path → `500 INTERNAL_ERROR` (bukan 4xx) |
| 4 | Rendah (diterima) | File data plaintext, izin file bergantung umask |
| 5 | Rendah (diterima) | Tanpa rate limiting; `.tmp` path tetap → single-process saja |
| 6 | Info | Tidak ada token CSRF (risiko rendah karena JSON-only + tanpa CORS) |

### 5.1 [Sedang] Bind ke semua interface tanpa autentikasi

`server/index.js:41` memanggil `app.listen(port, ...)` tanpa host, sehingga Node mengikat `0.0.0.0`/`::`.
Aplikasi memang tanpa autentikasi (sesuai SPEC §7), dan SPEC menyarankan server "hanya dijalankan di
localhost/jaringan tepercaya". Akibatnya, siapa pun di jaringan yang sama dapat membaca, membuat,
mengubah, dan menghapus **semua** catatan lewat API, meskipun log hanya mencetak `http://localhost:<port>`.

- **Dampak:** kebocoran/modifikasi data catatan pada jaringan bersama (kantor, Wi-Fi publik, kontainer
  dengan port yang di-publish).
- **Saran:** bind eksplisit ke loopback secara default, mis. `app.listen(port, '127.0.0.1', ...)`, atau
  tambahkan env `HOST` dengan default `127.0.0.1` dan dokumentasikan. `verify.sh` tetap lulus karena
  smoke test memakai `127.0.0.1`.

### 5.2 [Rendah] Header hardening

Response menyertakan `X-Powered-By: Express` dan tidak menyertakan `Content-Security-Policy`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, atau proteksi framing. Untuk aplikasi lokal
dampaknya kecil (tidak ada data sensitif pihak ketiga, tidak ada aset eksternal), tetapi mudah diperbaiki:
matikan `X-Powered-By` (`app.disable('x-powered-by')`) dan tambahkan CSP ketat (semua aset berasal dari
origin sendiri, tanpa inline script).

### 5.3 [Rendah] Error middleware memetakan semua error lain ke 500

`server/app.js:54-83` hanya memetakan `entity.parse.failed` → 400 dan `entity.too.large` → 413. Error
lain — termasuk `URIError` dari path dengan percent-encoding rusak — menjadi `500 INTERNAL_ERROR`.
Reproduksi (server nyata):

```bash
curl -s -o /dev/null -w '%{http_code}\n' 'http://127.0.0.1:3000/api/notes/%E0%A4%A'
# output: 500  (body: {"error":{"code":"INTERNAL_ERROR",...}})
```

Ini bukan kebocoran informasi (pesan generik, tanpa stack trace), tetapi 500 untuk input klien yang
invalid menyesatkan dan mengotori log. **Saran:** jika `err.status`/`err.statusCode` berada di 400–499,
kembalikan envelope JSON generik 4xx; sisanya tetap 500.

### 5.4 [Rendah, diterima] Data plaintext & izin file

`data/notes.json` ditulis dengan mode default (umumnya `0644` tergantung umask), sehingga pengguna lokal
lain dapat membacanya. SPEC §7 sudah menyatakan data plaintext dan "bukan untuk data sensitif", jadi ini
risiko yang diterima. **Saran opsional:** tulis file dengan mode `0600` bila aplikasi dipakai di mesin
bersama.

### 5.5 [Rendah, diterima] Ketiadaan rate limiting dan batas skalabilitas

Tidak ada rate limiting; setiap request membaca seluruh file. Body dibatasi 100 KB dan field divalidasi,
sehingga risiko DoS lokal kecil. Penulisan memakai `<filePath>.tmp` tetap, sehingga dua proses pada file
yang sama dapat saling menimpa — konsisten dengan asumsi single-process SPEC §7.

### 5.6 [Info] CSRF

Tidak ada token CSRF. Risiko rendah: tidak ada CORS header, `express.json` hanya mem-parse
`application/json`, `PUT`/`DELETE` memerlukan preflight, dan body `text/plain` tidak diparse sebagai JSON.
Bila nanti bind diubah ke publik atau auth ditambahkan, pertimbangkan proteksi CSRF/Origin check.

### 5.7 Pemeriksaan yang lulus

- **Injection:** tidak ada SQL/command; `:id` hanya dipakai untuk pencarian di array, bukan path file.
  Tidak ada `eval`/`new Function`/`document.write`.
- **XSS:** semua data pengguna (`title`, `content`) dirender via `textContent`/`setAttribute`; tidak ada
  `innerHTML`. Content-Type API benar, `express.static` aman dari traversal.
- **Secret hardcoded:** tidak ada kredensial/token/private key di repo.
- **Validasi input:** tipe, batas panjang, trim, body maksimum 100 KB, body non-objek — semuanya ditolak
  dengan pesan persis kontrak.
- **Kebocoran error:** stack trace tidak pernah dikirim ke klien.
- **Dependency:** hanya Express 4.22.3; audit offline melaporkan 0 kerentanan.

---

## 6. Saran langkah berikutnya

Prioritas tinggi:

1. **Bind ke loopback secara default** (atau env `HOST` default `127.0.0.1`) — menutup risiko §5.1 tanpa
   mengubah perilaku fitur; jalankan ulang `verify.sh` setelahnya.
2. **Perbaiki pemetaan error 4xx** di `server/app.js` agar input klien invalid (mis. URI rusak) tidak
   menjadi 500 (§5.3), lalu tambahkan test regresi untuk kasus tersebut.

Prioritas sedang:

3. **Hardening header**: `app.disable('x-powered-by')`, CSP ketat, `nosniff`, `Referrer-Policy`,
   `X-Frame-Options`/`frame-ancestors` (§5.2).
4. **Perluas `verify.sh`** (opsional): cek 400 validasi judul kosong, 413 body besar, dan persistensi
   setelah restart server; saat ini hanya unit test yang menutup validasi.
5. **Perbarui README** agar tidak lagi menyebut `verify.sh` "belum tersedia" (§3.3).

Prioritas rendah / opsional:

6. Tulis file data dengan mode `0600` bila dipakai di mesin multi-user (§5.4).
7. Tambahkan test UI otomatis (mis. tanpa dependency tambahan, atau manual checklist berkala) bila UI
   akan terus berkembang.
8. Pertimbangkan graceful shutdown (`SIGTERM`/`SIGINT`) di `server/index.js`; penulisan sudah atomik
   sehingga risikonya kecil, tetapi shutdown bersih lebih rapi.

---

## 7. Kesimpulan

Implementasi **memenuhi** `SPEC.md` dan `CONTRACT.md`: seluruh fitur MVP selesai, 27 test lulus,
`verify.sh` lulus end-to-end dari kondisi bersih, tidak ada secret hardcoded, tidak ada XSS, dan validasi
input server-side kuat. Satu-satunya temuan berdampak nyata adalah **server terikat ke semua interface
tanpa autentikasi** (§5.1) — relevan hanya bila aplikasi dijalankan di jaringan tidak tepercaya, dan
perbaikannya kecil. Tidak ada perubahan kode aplikasi yang dilakukan oleh reviewer ini; dokumen ini
adalah satu-satunya file yang ditambahkan.
