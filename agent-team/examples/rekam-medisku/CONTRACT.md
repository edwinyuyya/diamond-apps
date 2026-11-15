# CONTRACT.md — Kontrak Antarmuka Rekam Medisku

Dokumen ini adalah **sumber kebenaran tunggal** untuk semua modul. Setiap tugas implementasi wajib
mengikuti nama ekspor, bentuk data, perilaku, path, dan ID DOM di sini. Tidak ada framework dan
tidak ada request eksternal saat runtime.

**Aturan kerja**

1. Hanya tulis berkas yang tercantum di `owns` tugasmu. Jangan mengedit `CONTRACT.md`, `SPEC.md`,
   atau `plan.json`.
2. Semua modul memakai **ES modules** dan path relatif dengan ekstensi `.js`.
3. Modul logika (`app/js/logic/*`), `model.js`, `storage.js`, `state.js`, `crypto.js`, `backup.js`,
   `qr.js`, `photos.js` (bagian non-DOM), `scanSession.js`, dan builder grafik **bebas DOM**: aman
   diimpor `node:test`.
4. Modul UI boleh mengakses DOM hanya saat fungsi `render`/`mount` dipanggil, bukan saat impor.
5. **Dependency hanya untuk vendoring OCR/ASR.** Paket `tesseract.js`, `@tesseract.js-data/ind`,
   `@tesseract.js-data/eng`, dan `@huggingface/transformers@4.3.2` dipasang lewat npm lalu
   **disalin** ke `public/vendor`/`public/vendor/suara`. Model Whisper `Xenova/whisper-base`
   (q8) disalin/diunduh **hanya saat `npm run vendor:whisper`** dari `huggingface.co` atau
   `us.aws.cdn.hf.co` (build-time). Runtime memuat salinan lokal same-origin dan **tidak pernah**
   mengunduh model. Jangan memakai CDN, font eksternal, analytics, cloud OCR, atau `fetch` ke luar
   origin. Satu-satunya aliran audio ke luar perangkat yang diizinkan adalah Web Speech API
   **setelah persetujuan eksplisit** (8B.4).
6. Semua teks antarmuka berbahasa Indonesia. Kode status internal memakai istilah Inggris
   (`'low'`, `'taken'`, dst.) dan diterjemahkan di UI.
7. `CONTRACT.md` mendefinisikan perilaku minimum. Boleh menambah fungsi internal/private, tetapi
   **jangan mengubah/menghilangkan** ekspor publik yang tercantum.
8. **Hasil OCR/terjemahan/parser tidak pernah disimpan otomatis.** Penyimpanan hanya lewat aksi
   eksplisit pengguna setelah checkbox verifikasi dicentang.
9. Titik ekstensi OCR cloud hanya boleh didokumentasikan dan **nonaktif**. Dilarang mengimplementasi
   panggilan jaringan atau mengirim foto/teks ke layanan luar.
10. **Suara bukan verifikasi.** Entri obat yang dibuat/dikonfirmasi dengan suara, atau tanpa
    pemeriksaan pendamping, wajib berstatus `pemeriksaanOrangLain.status = 'belum'`. Hanya layar
    Pemeriksaan Pendamping (nama + pernyataan manusia) yang boleh mengubahnya menjadi `'sudah'`.
11. **Audio tidak pernah disimpan atau dikirim oleh mesin offline.** Mesin Web Speech hanya boleh
    dipakai setelah persetujuan eksplisit tercatat dan dapat dicabut. Tidak ada always-on listening,
    perekaman latar belakang, atau unggahan audio oleh kode aplikasi.
12. **Tidak ada simpan otomatis dari suara.** Semua isian dibacakan ulang dan dikonfirmasi persis
    "Apakah benar yang sudah dicatat?"; jawaban selain "ya"/"benar" atau tombol "Ya, benar" tidak
    menyimpan.
13. **Nama obat tidak pernah diambil dari teks bebas ASR.** Nama dipilih dari daftar obat
    tersimpan, hasil pindai resep yang dibacakan satu per satu, ketikan/pasta pendamping, atau
    ejaan huruf-per-huruf dengan pembacaan ulang. Jalur obat utama adalah **tanya satu per satu**
    (8B.11–8B.15).
14. **Keluaran ASR yang rusak/berulang ditolak.** Setiap hasil melewati penjaga ASR (8B.11):
    maksimum 8 detik rekaman per jawaban, token keluaran kecil, deteksi pengulangan/karakter
    aneh. Ditolak → "tidak terdengar" dan pertanyaan diulang, bukan di-parse paksa.

---

## 1. Struktur Direktori & Kepemilikan

```
.
├── package.json                  # t8/t20/t28 devops
├── README.md                     # t8  devops
├── server.js                     # t8  devops
├── verify.sh                     # t16/t27/t34 qa
├── scripts/
│   ├── vendor-ocr.mjs            # t12 frontend/ocr
│   └── vendor-whisper.mjs        # t28 devops (offline ASR Whisper)
├── public/
│   └── vendor/                   # t12 (dihasilkan `npm run vendor:ocr`)
│       ├── manifest.json
│       ├── tesseract/
│       │   ├── tesseract.esm.min.js
│       │   └── worker.min.js
│       ├── tesseract-core/
│       │   ├── tesseract-core.wasm
│       │   ├── tesseract-core.wasm.js
│       │   ├── tesseract-core-simd.wasm
│       │   └── tesseract-core-simd.wasm.js
│       ├── lang/
│       │   ├── ind.traineddata.gz
│       │   └── eng.traineddata.gz
│       └── suara/                # t28 (dihasilkan `npm run vendor:whisper`)
│           ├── manifest.json
│           ├── transformers/     # salinan @huggingface/transformers 4.3.2
│           │   └── transformers.min.js
│           ├── onnx/             # onnxruntime-web WASM same-origin
│           │   ├── ort-wasm-simd-threaded.wasm
│           │   └── ort-wasm-simd-threaded.mjs
│           └── models/Xenova/whisper-base/  # model q8; daftar lengkap di 8B.3
│               ├── config.json
│               ├── tokenizer.json
│               ├── vocab.json
│               ├── merges.txt
│               └── onnx/
│                   ├── encoder_model_quantized.onnx
│                   └── decoder_model_merged_quantized.onnx
├── app/
│   ├── index.html                # t4/t26 frontend (shell)
│   ├── manifest.webmanifest      # t8  devops (PWA)
│   ├── sw.js                     # t8/t20/t28 devops (PWA)
│   ├── icons/
│   │   └── icon.svg              # t7  frontend (dokumen)
│   ├── css/
│   │   ├── style.css             # t4  frontend (shell)
│   │   ├── print.css             # t7  frontend (dokumen)
│   │   └── suara.css             # t26/t32 frontend (aksesibilitas suara)
│   └── js/
│       ├── app.js                # t4/t26 frontend (shell/router)
│       ├── dom.js                # t4  frontend (helper)
│       ├── model.js              # t1  database
│       ├── storage.js            # t1  database
│       ├── state.js              # t1  database
│       ├── crypto.js             # t1  database
│       ├── backup.js             # t1  database
│       ├── qr.js                 # t7  frontend (dokumen)
│       ├── photos.js             # t13 frontend (pindai)
│       ├── scanSession.js        # t13 frontend (pindai)
│       ├── a11y.js               # t26 frontend (aksesibilitas)
│       ├── ocr/
│       │   ├── adaptor.js        # t12 frontend/ocr
│       │   └── tesseractEngine.js# t12 frontend/ocr
│       ├── suara/
│       │   ├── adaptor.js        # t18/t29 frontend (satu adaptor suara)
│       │   ├── mesin.js          # t18 frontend (pemilih mesin + pengaturan)
│       │   ├── whisperEngine.js  # t29 backend (Whisper malas dimuat + status model)
│       │   ├── penjagaAsr.js     # t29 backend (penjaga durasi/keluaran ASR)
│       │   ├── offlineEngine.js  # t29 (alias kompatibilitas -> whisperEngine.js)
│       │   ├── alurTanya.js      # t33 frontend (orkestrasi tanya satu per satu)
│       │   ├── ttsTanya.js       # t33 frontend (pertanyaan & pembacaan ulang)
│       │   ├── webSpeech.js      # t19 frontend (opsional)
│       │   ├── persetujuan.js    # t19 frontend (persetujuan pihak ketiga)
│       │   ├── tts.js            # t21 frontend (pembaca ulang)
│       │   ├── konfirmasi.js     # t21 frontend (integrasi TTS + dengar)
│       │   ├── navigasiSuara.js  # t23 frontend (perintah navigasi)
│       │   └── penandaPemeriksaan.js # t24 backend (penanda teks/aria)
│       ├── logic/
│       │   ├── dates.js          # t2  backend
│       │   ├── schedule.js       # t2  backend
│       │   ├── stock.js          # t2  backend
│       │   ├── adherence.js      # t2  backend
│       │   ├── safety.js         # t3  backend
│       │   ├── vitals.js         # t3  backend
│       │   ├── summary.js        # t3  backend
│       │   ├── resepKamus.js     # t9  backend
│       │   ├── resep.js          # t9  backend
│       │   ├── resepSediaan.js   # t10 backend
│       │   ├── resepJadwal.js    # t10 backend
│       │   ├── rekam.js          # t11 backend
│       │   ├── labParse.js       # t11 backend
│       │   ├── ucapanAngka.js    # t17 backend
│       │   ├── ucapanObat.js     # t17 backend
│       │   ├── ucapanVital.js    # t17 backend
│       │   ├── konfirmasiSuara.js# t21 backend (mesin keadaan murni)
│       │   ├── perintahNavigasi.js # t23 backend
│       │   ├── pemeriksaan.js    # t24 backend (status pemeriksaan)
│       │   ├── kosakataTertutup.js # t30 backend (kosakata jawaban tertutup)
│       │   ├── pencocokJawaban.js  # t30 backend (pencocok fuzzy deterministik)
│       │   ├── tanyaSatuPerSatu.js # t31 backend (mesin keadaan murni)
│       │   └── pemilihNamaObat.js  # t31 backend (nama dari daftar/pindai/ketik/ejaan)
│       └── ui/
│           ├── dashboard.js      # t5/t25 frontend
│           ├── profile.js        # t5  frontend
│           ├── settings.js       # t5  frontend
│           ├── lock.js           # t5  frontend
│           ├── visits.js         # t6  frontend
│           ├── attachments.js    # t6  frontend
│           ├── meds.js           # t6/t25 frontend
│           ├── vitals.js         # t6  frontend
│           ├── chart.js          # t6  frontend
│           ├── emergency.js      # t7  frontend
│           ├── report.js         # t7/t25 frontend
│           ├── scan.js           # t13 frontend (pindai)
│           ├── photo-capture.js  # t13 frontend (pindai)
│           ├── scan-review.js    # t14 frontend (tinjau)
│           ├── suara-pengaturan.js # t18/t32 frontend (pilih mesin + status model)
│           ├── isi-suara.js      # t22/t33 frontend (layar Isi dengan Suara)
│           ├── isi-suara-obat.js # t22 frontend
│           ├── isi-suara-vital.js# t22 frontend
│           ├── isi-suara-minum.js# t22 frontend
│           ├── pemeriksaan.js    # t25 frontend (Pemeriksaan Pendamping)
│           ├── status-pemeriksaan.js # t25 frontend (badge bersama)
│           ├── bantuan-suara.js  # t26 frontend (bantuan perintah)
│           ├── tanya-suara.js    # t32 frontend (layar tanya satu per satu)
│           └── pemilih-nama-obat.js # t32 frontend (pemilih nama obat)
└── tests/
    ├── logic.test.js             # t16 qa
    ├── security.test.js          # t16 qa
    ├── platform.test.js          # t16 qa
    ├── scan.test.js              # t16 qa
    ├── resep.test.js             # t15 backend (korpus uji)
    ├── ucapan.test.js            # t17 backend (korpus uji ucapan)
    ├── suara.test.js             # t27 qa (adaptor, TTS, konfirmasi, pemeriksaan)
    ├── dom-a11y.test.js          # t27 qa (label/role/fokus DOM)
    ├── tanya.test.js             # t34 qa (korpus 60+ jawaban, pencocok, mesin keadaan)
    ├── penjaga-asr.test.js       # t34 qa (durasi, token, pengulangan, output palsu)
    ├── whisper-integration.test.js # t34 qa (opsional; hanya bila model lokal ada)
    ├── helpers/
    │   └── fake-dom.js           # t27 qa (DOM minimal tanpa dependency)
    └── fixtures/
        ├── resep-cases.js        # t15 backend (korpus uji)
        ├── ucapan-cases.js       # t17 backend (minimal 40 ucapan)
        └── tanya-cases.js        # t34 qa (minimal 60 jawaban tertutup + varian salah dengar)
```

Catatan: `app/js/logic/vitals.js` (logika) dan `app/js/ui/vitals.js` (layar) adalah dua berkas
berbeda. Impor di UI memakai `../logic/vitals.js` dan `./chart.js`.

---

## 2. Runtime, Environment, dan Perintah

- **Node.js ≥ 20** (wajib untuk `node:test`, `fetch`, Web Crypto global).
- Browser modern dengan IndexedDB, Web Crypto, WebAssembly, Worker, service worker. `http://localhost`
  adalah secure context sehingga crypto, kamera (setelah izin), dan service worker tersedia.
- **Port default 3000**, host default `127.0.0.1`.

| Variabel | Default | Arti |
|----------|---------|------|
| `PORT` | `3000` | Port HTTP server statis. `0` = port ephemeral (untuk test). |
| `HOST` | `127.0.0.1` | Alamat bind. Ubah ke `0.0.0.0` hanya jika paham risikonya. |
| `VENDOR_DIR` | `<repo>/public/vendor` | Direktori aset OCR **dan suara** yang disajikan di `/vendor/`. |
| `WHISPER_VENDOR_DIR` | `<repo>/public/vendor/suara` | Tujuan `scripts/vendor-whisper.mjs`; akar model lokal. |
| `WHISPER_MODEL_ID` | `Xenova/whisper-base` | Id model. Folder lokal: `<WHISPER_VENDOR_DIR>/models/Xenova/whisper-base`. |
| `WHISPER_MODEL_BASE_URL` | `https://huggingface.co/Xenova/whisper-base/resolve/main/` | **Hanya build-time.** Host yang diizinkan: `huggingface.co`, `us.aws.cdn.hf.co`. Tidak dibaca runtime. |
| `WHISPER_MODEL_SOURCE` | `<repo>/vendor-src/whisper-base` | Bila ada, salin dari folder ini tanpa jaringan. |
| `WHISPER_ALLOW_DOWNLOAD` | `1` | `0` = vendoring gagal bila sumber lokal tidak ada. Tidak pernah dibaca runtime. |

Perintah (dari root proyek):

```bash
npm install           # memasang paket OCR & ASR untuk vendoring
npm run vendor:ocr    # menyalin Tesseract.js + WASM + data ind/eng ke public/vendor
npm run vendor:whisper # menyalin transformers.js + onnxruntime-web WASM + model Whisper q8
npm start             # node server.js
npm test             # node --test tests/*.test.js
npm run verify       # bash verify.sh
bash verify.sh       # test + smoke test server + cek vendor
```

`package.json` wajib:

```json
{
  "name": "rawatku",
  "private": true,
  "type": "module",
  "version": "1.1.0",
  "engines": { "node": ">=20" },
  "scripts": {
    "start": "node server.js",
    "test": "node --test tests/*.test.js",
    "verify": "bash verify.sh",
    "vendor:ocr": "node scripts/vendor-ocr.mjs",
    "vendor:whisper": "node scripts/vendor-whisper.mjs"
  },
  "devDependencies": {
    "tesseract.js": "^6.0.1",
    "@tesseract.js-data/ind": "^1.0.0",
    "@tesseract.js-data/eng": "^1.0.0",
    "@huggingface/transformers": "4.3.2"
  }
}
```

Tidak ada `dependencies` runtime: browser memuat salinan `public/vendor` dan
`public/vendor/suara`. `npm test` tidak boleh mengimpor Tesseract/Transformers dan tidak boleh
membutuhkan jaringan. `npm run vendor:whisper` boleh mengunduh model **hanya saat build/vendoring**;
runtime tidak pernah mengunduh apa pun. Setelah vendoring, folder `/vendor/suara/` harus lengkap
sehingga aplikasi dapat dipakai sepenuhnya offline.

---

## 3. Server Statis (`server.js`)

### 3.1 Ekspor

```js
export function createServer({ rootDir, vendorDir } = {}) // -> http.Server, BELUM listen
export async function startServer({ port, host, vendorDir } = {}) // -> { server, port, host, url }
```

- `rootDir` default: direktori `app/` relatif terhadap `server.js`
  (`fileURLToPath(new URL('./app/', import.meta.url))`).
- `vendorDir` default: `public/vendor/` relatif terhadap `server.js`; boleh dioverride lewat
  `VENDOR_DIR` (dibaca `startServer`) atau opsi `createServer` (dipakai test).
- `createServer` dipakai test: `server.listen(0, '127.0.0.1')`.
- `startServer` membaca `PORT`/`HOST`, menangani error `EADDRINUSE`, dan mencetak
  `Rekam Medisku berjalan di http://<host>:<port>`.
- Auto-start hanya jika dijalankan langsung (`import.meta.url === pathToFileURL(process.argv[1]).href`).
- Saat menerima `SIGINT`/`SIGTERM`: tutup server dengan rapi.

### 3.2 Endpoint

Tidak ada endpoint data medis. Server hanya berkas statis, aset OCR/ASR vendor, dan health check.

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET/HEAD | `/health` | – | `200 application/json` → `{"status":"ok","app":"rawatku","version":"1.1.0"}` |
| GET/HEAD | `/` | – | `200 text/html` → isi `app/index.html` |
| GET/HEAD | `/<path>` | – | Berkas di bawah `app/` (`/css/style.css`, `/js/app.js`, `/sw.js`, `/manifest.webmanifest`, `/icons/icon.svg`, dst.) |
| GET/HEAD | `/vendor/<path>` | – | Berkas di bawah `vendorDir` (`/vendor/manifest.json`, `/vendor/tesseract/worker.min.js`, `/vendor/tesseract-core/*.wasm`, `/vendor/lang/ind.traineddata.gz`, dst.) |
| GET/HEAD | path tak ada | – | `404 text/plain; charset=utf-8` → `404 Tidak ditemukan` |
| selain GET/HEAD | apa pun | – | `405` + header `Allow: GET, HEAD`, body `405 Metode tidak diizinkan` |

Detail:

- Path di-`decodeURIComponent` **satu kali**. Tolak NUL, path traversal (`..`), dan path absolut
  dengan **404** (jangan bocorkan struktur filesystem). Jangan pernah menyajikan direktori.
  Aturan ini berlaku untuk `rootDir` **dan** `vendorDir`.
- `/health` tidak membaca disk, `Cache-Control: no-store`.
- Berkas statis app: `Cache-Control: no-cache` (service worker yang mengurus cache offline).
- Berkas `/vendor/*`: `Cache-Control: public, max-age=31536000, immutable` (nama berkas
  di-vendor per versi); service worker tetap boleh meng-cache.
- Header keamanan setiap respons: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `X-Frame-Options: DENY`, `Cross-Origin-Resource-Policy: same-origin`.
- MIME: `.html text/html; charset=utf-8`, `.css text/css; charset=utf-8`,
  `.js`/`.mjs text/javascript; charset=utf-8`, `.json application/json; charset=utf-8`,
  `.webmanifest application/manifest+json; charset=utf-8`, `.svg image/svg+xml`,
  `.png image/png`, `.jpg`/`.jpeg image/jpeg`, `.webp image/webp`, `.ico image/x-icon`,
  `.txt text/plain; charset=utf-8`, `.pdf application/pdf`,
  **`.wasm application/wasm`**, **`.gz application/gzip`**, **`.onnx application/octet-stream`**,
  `.traineddata application/octet-stream`, `.data application/octet-stream`; lainnya
  `application/octet-stream`. `.onnx` **tidak boleh** disajikan sebagai `text/plain`.
- HEAD mengirim header + `Content-Length` tanpa body.
- Tidak ada logging isi request/path per permintaan (privasi). Hanya log sekali saat start.
- Tidak ada CORS (same-origin saja) dan tidak ada API tulis.
- Browser harus menerima `.wasm` sebagai `application/wasm` agar kompilasi streaming bekerja.
- Aset Whisper (`.mjs`, `.wasm`, `.onnx`) wajib same-origin dengan MIME di atas. Engine memakai
  `numThreads = 1`, jadi server **tidak** memerlukan header COOP/COEP; jangan menambahkan header
  yang memblokir worker same-origin.

---

## 4. Model Data (`app/js/model.js` — t1)

### 4.1 Konstanta

```js
export const APP_ID = 'rawatku';
export const APP_VERSION = '1.1.0';
export const SCHEMA_VERSION = 1;               // field baru bersifat aditif; versi tetap 1
export const EMERGENCY_NUMBERS = ['112', '119'];

export const DISCLAIMERS = {
  app: 'Rekam Medisku bukan alat medis. Aplikasi ini tidak mendiagnosis, tidak menyarankan dosis, dan tidak memeriksa interaksi obat. Data ditulis sendiri oleh pemilik. Konsultasikan selalu dengan dokter atau apoteker.',
  duplicate: 'Pemeriksaan ini hanya membandingkan teks bahan aktif yang Anda masukkan (huruf besar/kecil dan tanda baca diabaikan). Ini bukan pemeriksaan interaksi obat atau duplikasi resep. Konsultasikan dengan dokter atau apoteker.',
  range: 'Rentang acuan diatur sendiri oleh pemilik/dokter. Nilai di luar rentang bukan diagnosis. Konsultasikan dengan tenaga kesehatan.',
  emergency: 'Kartu ini berisi data yang Anda tulis sendiri, bukan penilaian medis. Dalam darurat, hubungi 112 atau 119.',
  summary: 'Ringkasan ini dibuat otomatis dari catatan Anda untuk membantu komunikasi dengan dokter. Ini bukan rekomendasi medis. Diskusikan dengan dokter.',
  stock: 'Perkiraan stok dihitung dari jadwal dan jumlah stok yang Anda masukkan. Pemakaian sebenarnya bisa berbeda; konsultasikan dengan apoteker/dokter.',
  privacy: 'Data hanya disimpan di perangkat ini. Tidak ada akun, cloud, atau pelacak.',
  ocr: 'Hasil pemindaian foto bisa salah, terutama tulisan tangan. Periksa setiap angka dan nama obat dengan dokumen asli. Kesalahan membaca dosis bisa berbahaya. Cocokkan dengan apoteker atau dokter.',
  resep: 'Terjemahan ini hanya membantu membaca singkatan resep; bukan saran dosis. Cocokkan dengan apoteker atau dokter sebelum diminum.',
  rekam: 'Hasil ini hanya menyalin teks dokumen, bukan diagnosis atau interpretasi. Cocokkan dengan dokumen asli dan dokter.',
  review: 'Periksa dan sunting semua bidang sebelum menyimpan. Data tidak disimpan sampai Anda mencentang "Saya sudah mencocokkan dengan resep asli".',
  photo: 'Foto sumber disimpan hanya di perangkat ini dan tidak dikirim ke layanan luar. Cadangan JSON tidak menyertakan byte foto.'
};

export const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-','tidak tahu'];
export const SEX_OPTIONS = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
  { value: '', label: 'Tidak disebutkan' }
];

export const VITAL_TYPES = {
  tension:     { label: 'Tekanan darah', unit: 'mmHg', kind: 'dual', components: ['systolic','diastolic'], componentLabels: { systolic: 'Sistolik', diastolic: 'Diastolik' } },
  glucose:     { label: 'Gula darah', unit: 'mg/dL', kind: 'single', components: ['value'] },
  weight:      { label: 'Berat badan', unit: 'kg', kind: 'single', components: ['value'] },
  temperature: { label: 'Suhu tubuh', unit: '°C', kind: 'single', components: ['value'] },
  pulse:       { label: 'Denyut nadi', unit: 'bpm', kind: 'single', components: ['value'] },
  spo2:        { label: 'Saturasi oksigen (SpO₂)', unit: '%', kind: 'single', components: ['value'] }
};

export const VITAL_TYPE_ORDER = ['tension','glucose','weight','temperature','pulse','spo2'];
export const RANGE_METRICS = ['systolic','diastolic','glucose','weight','temperature','pulse','spo2'];
export const SETTINGS_DEFAULTS = { fontLarge: false, highContrast: false, reminders: true };
export const MAX_ATTACHMENT_BYTES = 1048576;       // 1 MiB per berkas
export const MAX_ATTACHMENTS_PER_VISIT = 10;
export const ALLOWED_ATTACHMENT_MIME = [
  'image/jpeg','image/png','image/webp','image/gif','application/pdf'
];

export const SCAN_KINDS = ['resep', 'etiket', 'rekam-medis'];
export const ALLOWED_SOURCE_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_SOURCE_PHOTO_BYTES = 2097152;     // 2 MiB setelah kompresi
export const MAX_SOURCE_PHOTO_DIMENSION = 2000;
export const MAX_OCR_TEXT_CHARS = 20000;
export const OCR_LOW_CONFIDENCE = 0.6;
export const PARSER_RESEP_VERSION = 'resep-v1';
export const PARSER_REKAM_VERSION = 'rekam-v1';

export const ITEM_COLLECTIONS = ['visits','medications','doseLogs','vitals','labs','refRanges','questions'];
export const ITEM_PREFIXES = {
  profiles: 'prf', visits: 'vis', medications: 'med', doseLogs: 'dose',
  vitals: 'vit', labs: 'lab', refRanges: 'ref', questions: 'q', photos: 'pho'
};
```

`VITAL_TYPES[type].unit` dipakai sebagai default satuan vital.

### 4.2 Bentuk State

```js
{
  app: 'rawatku',
  schemaVersion: 1,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-09T01:00:00.000Z',
  settings: { fontLarge: false, highContrast: false, reminders: true },
  activeProfileId: 'prf_...',
  profiles: [Profile],
  visits: [Visit],
  medications: [Medication],
  doseLogs: [DoseLog],
  vitals: [Vital],
  labs: [Lab],
  refRanges: [RefRange],
  questions: [Question]
}
```

Semua item punya `id`, `profileId` (kecuali Profile), `createdAt`, `updatedAt` (ISO 8601 UTC).
**Foto sumber tidak berada di state/vault**; lihat `photos.js` dan API `state.saveSourcePhoto`.

#### Profile
```js
{
  id: 'prf_xxx',
  name: 'Budi Santoso',                 // wajib, non-kosong
  birthDate: '1962-04-17',              // YYYY-MM-DD | null
  sex: 'L',                             // 'L' | 'P' | ''
  bloodType: 'O+',                      // salah satu BLOOD_TYPES
  allergies: ['penisilin'],             // string[]
  chronicConditions: ['hipertensi'],    // string[]
  emergencyContacts: [                  // maks. 3, UI MVP satu
    { name: 'Siti', relation: 'Istri', phone: '081234567890' }
  ],
  doctor: { name: 'dr. Sari', facility: 'Klinik Sehat', phone: '0215551234' },
  notes: '',
  createdAt, updatedAt
}
```

#### Visit
```js
{
  id: 'vis_xxx', profileId,
  date: '2026-11-01',                   // YYYY-MM-DD wajib
  doctorName: 'dr. Sari',
  facility: 'Klinik Sehat',
  complaint: 'pusing dan tengkuk kaku',
  diagnosis: 'hipertensi (ditulis pemilik)', // teks pemilik/dokumen, bukan hasil aplikasi
  notes: '',
  attachments: [Attachment],            // maks. 10
  source: SourceMeta | null,            // metadata pindai rekam medis (lihat 4.3)
  createdAt, updatedAt
}
```

#### Attachment
```js
{ id: 'att_xxx', name: 'hasil-lab.jpg', mime: 'image/jpeg',
  size: 182304, dataBase64: '<base64 tanpa prefix>', addedAt: ISO }
```

#### Medication
```js
{
  id: 'med_xxx', profileId,
  name: 'Amlodipin',                    // wajib
  activeIngredient: 'amlodipine',
  dose: '5', doseUnit: 'mg',
  instructions: 'sesudah makan',
  times: ['08:00'],                     // HH:mm[]; [] = bila perlu/tanpa jadwal
  daysOfWeek: [0,1,2,3,4,5,6],          // 0=Minggu ... 6=Sabtu
  startDate: '2026-11-01', endDate: null,
  stock: { remaining: 30, unit: 'tablet', unitsPerDose: 1 }, // remaining: number|null
  refillReminderDays: 3,                // integer ≥ 0
  active: true,
  notes: '',
  source: SourceMeta | null,            // metadata pindai resep/etiket
  createdAt, updatedAt
}
```

#### SourceMeta (dipakai `Medication.source`, `Visit.source`, `Lab.source`)
```js
{
  kind: 'resep' | 'etiket' | 'rekam-medis',
  photoId: 'pho_xxx' | null,            // null bila jalur ketik/tempel teks
  photoMime: 'image/jpeg' | null,
  ocrText: '',                           // teks OCR mentah / teks tempelan, ≤ MAX_OCR_TEXT_CHARS
  ocrConfidence: 0.87,                   // 0..1 | null (null untuk jalur ketik/tempel)
  translatedText: '',                    // terjemahan/ringkasan yang disimpan, ≤ MAX_OCR_TEXT_CHARS
  verifiedByUser: true,
  verifiedAt: '2026-11-09T10:00:00.000Z',
  parserVersion: 'resep-v1' | 'rekam-v1'
}
```
Aturan: bila `verifiedByUser === true`, `verifiedAt` wajib ISO valid. `photoId` hanya boleh
menunjuk foto milik `profileId` yang sama (divalidasi saat simpan oleh UI/state).

#### DoseLog
```js
{
  id: 'dose_med_001_2026-11-09_0800',
  profileId, medicationId,
  date: '2026-11-09', time: '08:00',
  status: 'taken',                      // 'taken' | 'skipped'
  takenAt: ISO,
  createdAt, updatedAt
}
```
ID deterministik lewat `makeDoseLogId(medicationId, date, time)` → `dose_${medicationId}_${date}_${time.replace(':','')}`.
Satu log per kombinasi obat+tanggal+jam. `takenAt` = waktu pencatatan.

#### Vital
```js
{
  id: 'vit_xxx', profileId,
  type: 'tension',                      // kunci VITAL_TYPES
  date: '2026-11-08', time: '07:30',
  values: { systolic: 150, diastolic: 95 }, // tension
  // atau values: { value: 180 }
  unit: 'mmHg',                         // default VITAL_TYPES[type].unit
  note: '',
  createdAt, updatedAt
}
```

#### Lab
```js
{
  id: 'lab_xxx', profileId,
  date: '2026-11-01',
  name: 'HbA1c', value: 7.2, unit: '%',
  refLow: 4, refHigh: 5.6,              // number|null
  note: '', facility: '',
  source: SourceMeta | null,            // metadata pindai rekam medis
  createdAt, updatedAt
}
```

#### RefRange
```js
{
  id: 'ref_xxx', profileId,
  metric: 'systolic',                   // salah satu RANGE_METRICS
  low: 90, high: 140,                   // number|null, minimal satu terisi
  unit: 'mmHg',
  createdAt, updatedAt
}
```
Satu rentang per `profileId+metric` secara logika; jika ada duplikat, `resolveRange` memakai
`updatedAt` terbaru.

#### Question (pertanyaan manual)
```js
{
  id: 'q_xxx', profileId,
  text: 'Apakah saya perlu mengurangi garam?',
  source: 'manual',                     // selalu 'manual' untuk yang disimpan
  done: false,
  createdAt, updatedAt
}
```
Pertanyaan otomatis untuk dokter **tidak disimpan**; dibuat ulang oleh `summary.js`.

### 4.3 Fungsi

```js
export function newId(prefix = 'id')            // prefix + '_' + acak; pakai crypto.randomUUID bila ada
export function nowISO()                        // new Date().toISOString()
export function makeDoseLogId(medicationId, dateISO, time)

export function createEmptyState({ profileName = 'Saya', now = new Date() } = {})
export function createProfile(input = {})        // isi id/timestamps/default
export function createVisit(input = {})
export function createMedication(input = {})
export function createVital(input = {})
export function createLab(input = {})
export function createRefRange(input = {})
export function createQuestion(input = {})
export function createDoseLog(input = {})
export function createItem(collection, input = {}) // dispatch ke factory di atas (kecuali profiles)
export function validateItem(collection, item)      // lempar ValidationError bila invalid
export function validateSourceMeta(source)          // lempar ValidationError bila invalid
export function normalizeState(raw)                 // validasi root + isi default + migrasi versi 1
export function cloneState(state)                   // structuredClone
export function profileById(state, id)
export function activeProfile(state)
export function ageFromBirthDate(birthDate, now = new Date()) // number|null
```

Aturan validasi minimum:

- `profile.name` non-kosong; semua array string; `emergencyContacts` maks. 3.
- `visit.date` valid; `attachments` array ≤ 10; tiap attachment valid; `source` null atau valid.
- `medication.name` non-kosong; `times` array jam valid (boleh kosong); `daysOfWeek` unik ∈ 0..6;
  `startDate`/`endDate` valid atau null; `stock.remaining` null atau ≥ 0; `unitsPerDose` > 0;
  `refillReminderDays` integer ≥ 0; `source` null atau valid.
- `vital.type` dikenal; `date` valid; nilai finite; tension wajib `systolic` & `diastolic`.
- `lab.name` non-kosong; `value` finite; refLow/refHigh null atau finite; bila keduanya ada,
  refLow ≤ refHigh; `source` null atau valid.
- `refRange.metric` ∈ RANGE_METRICS; low/high null atau finite; minimal satu tidak null; bila
  keduanya ada, low ≤ high.
- `doseLog` status ∈ `taken|skipped`; date/time valid; `id` bila kosong dibuat.
- `question.text` non-kosong.
- `source`: `kind` ∈ SCAN_KINDS; `photoId` string atau null; `ocrText`/`translatedText` string
  ≤ MAX_OCR_TEXT_CHARS; `ocrConfidence` null atau 0..1; `verifiedByUser` boolean;
  `verifiedAt` ISO valid bila `verifiedByUser`; `parserVersion` string.
- `normalizeState` mempertahankan item lama yang tidak punya `source` dengan mengisi `source:null`.
  Item dengan `source` tidak valid tetap dipertahankan tetapi `source` di-reset ke `null`.
- Attachment: `mime` ∈ ALLOWED_ATTACHMENT_MIME; `dataBase64` string non-kosong; ukuran decoded
  ≤ MAX_ATTACHMENT_BYTES; `size` number ≥ 0.

`ValidationError`:

```js
class ValidationError extends Error {
  constructor(message, { code = 'DATA_TIDAK_VALID', field = null } = {}) { ... }
}
```

`normalizeState(raw)`:

- `raw.app !== 'rawatku'` atau `raw.schemaVersion !== 1` → `Error` dengan `.code = 'VERSI_TIDAK_DIDUKUNG'`.
- Isi default `settings`, pastikan array koleksi ada.
- Item yang tidak lolos `validateItem` **dilewati** (tidak boleh membuat seluruh data hilang).
- Pastikan minimal satu profil; bila kosong buat profil "Saya" dengan id baru.
- `activeProfileId` harus menunjuk profil yang ada; jika tidak, pakai profil pertama.
- Jangan mengubah id/timestamp item yang valid.

### 4.4 Tambahan aditif untuk antarmuka suara (t17–t34)

`model.js` (t1) **tidak diubah**. Semua tambahan di bawah bersifat aditif: item lama tetap valid,
`validateItem` tidak membuang field asing, dan `schemaVersion` tetap `1`. Modul baru wajib
menyediakan fungsi normalisasi/default; UI wajib memanggilnya sebelum menampilkan/menyimpan.

#### Medication (bentuk diperluas)
```js
{
  // ... field Medication 4.2 tetap sama ...
  dibuatDengan: 'manual' | 'suara' | 'pindai',       // default 'manual'
  dikonfirmasiDengan: 'manual' | 'suara' | null,     // null bila tidak ada konfirmasi
  pemeriksaanOrangLain: {
    status: 'belum' | 'sudah',                       // default 'belum'
    oleh: '',                                        // nama pendamping/apoteker (wajib saat 'sudah')
    waktu: null,                                     // ISO UTC | null
    pernyataan: null,                                // persis PERNYATAAN_PEMERIKSAAN saat 'sudah'
    sumber: 'belum-diperiksa' | 'pendamping' | 'apoteker'
  }
}
```
Aturan:
- Item lama tanpa `pemeriksaanOrangLain` **dianggap `'belum'`** lewat `pastikanPemeriksaan`.
- Entri yang dibuat/dikonfirmasi dengan suara **wajib** `dibuatDengan`/`dikonfirmasiDengan` = `'suara'`
  dan `pemeriksaanOrangLain.status = 'belum'`; tidak ada jalur suara yang boleh mengubahnya menjadi
  `'sudah'`.
- `source.verifiedByUser` (pencocokan foto) **bukan** pemeriksaan pendamping dan tidak boleh
  ditampilkan sebagai "terverifikasi oleh pendamping". Keduanya ditampilkan terpisah.
- Vital dan DoseLog tidak wajib punya `pemeriksaanOrangLain`; obat adalah sumber kebenaran status.

#### Settings (bentuk diperluas)
```js
settings.suara = {
  mesin: 'offline' | 'web-speech',                   // default 'offline'
  webSpeechPersetujuan: {
    diberikan: false,                                // default false
    diberikanPada: null,                             // ISO | null
    versi: null                                      // 'web-speech-v1' | null
  },
  tts: true,                                         // pembacaan ulang aktif
  kecepatan: 0.9                                     // 0.5..1.5
}
```
`normalisasiPengaturanSuara(settings)` mengisi default tanpa pernah mengaktifkan web-speech.
`settings.fontLarge`/`highContrast` yang ada tetap dipakai untuk semua layar baru.

#### Konstanta baru (diekspor modul baru, bukan `model.js`)
| Konstanta | Modul | Nilai |
|-----------|-------|-------|
| `MESIN_SUARA` | `suara/mesin.js` | lihat 8B.2 |
| `DISCLAIMERS_SUARA` | `suara/mesin.js` | lihat 8B.2 |
| `PERTANYAAN_KONFIRMASI` | `logic/konfirmasiSuara.js` | `'Apakah benar yang sudah dicatat?'` |
| `MAKS_PERTANYAAN_ULANG` | `logic/konfirmasiSuara.js` | `2` |
| `PAGAR_TAKARAN_MAKS` | `logic/ucapanObat.js` | `4` |
| `PAGAR_FREKUENSI_MAKS` | `logic/ucapanObat.js` | `8` |
| `PEMERIKSAAN_STATUS` | `logic/pemeriksaan.js` | `['belum','sudah']` |
| `PERNYATAAN_PEMERIKSAAN` | `logic/pemeriksaan.js` | lihat 8B.9 |
| `LABEL_BELUM_DIPERIKSA` | `logic/pemeriksaan.js` | `'Belum diperiksa pendamping/apoteker'` |
| `WHISPER_VENDOR` | `suara/whisperEngine.js` | lihat 8B.3 |
| `MAKS_DURASI_REKAM_MS` | `suara/penjagaAsr.js` | `8000` |
| `MAKS_TOKEN_KELUARAN` | `suara/penjagaAsr.js` | `48` |
| `AMBANG_COCOK` | `logic/pencocokJawaban.js` | `0.72` |
| `MARGIN_AMBIGU` | `logic/pencocokJawaban.js` | `0.08` |
| `URUTAN_PERTANYAAN` | `logic/kosakataTertutup.js` | lima pertanyaan 8B.12 |
| `LANGKAH_TANYA` | `logic/tanyaSatuPerSatu.js` | lihat 8B.13 |
| `MAKS_GAGAL_PAHAM` | `logic/tanyaSatuPerSatu.js` | `2` |

---

## 5. Penyimpanan Lokal

### 5.1 Vault (`app/js/storage.js` — t1)

Satu record vault. Isi record dibangun `state.js`, bukan storage.

```js
export const DB_NAME = 'rawatku';
export const DB_VERSION = 1;
export const STORE_NAME = 'vault';
export const LS_KEY = 'rawatku:vault';

export function createStorage(options = {}) // -> Storage
```

`options`: `{ indexedDB = globalThis.indexedDB, localStorage = globalThis.localStorage, dbName, storeName, lsKey }`.
Bila `indexedDB` tidak ada/gagal, jatuh ke localStorage; bila tidak ada, ke memori.

```js
Storage = {
  get kind() { return 'indexeddb' | 'localstorage' | 'memory'; },
  async get(),        // object|null (record JSON yang disimpan apa adanya)
  async put(record),  // simpan JSON-serializable record; resolve setelah selesai
  async clear(),      // hapus record
  async usage()       // { bytes: number|null }
}
```

- IndexedDB: buka `rawatku` v1, object store `vault` (keyPath tidak ada), key tetap `'state'`.
  `onupgradeneeded` membuat store. Error buka/tulis → fallback otomatis dan update `kind`.
- localStorage: `LS_KEY`; bila quota penuh, lempar `Error` dengan `.code = 'PENYIMPANAN_PENUH'`.
- Memori: `let record = null` (untuk test Node).
- `get` mengembalikan objek (parse JSON) atau `null`; record rusak → `Error` `.code='DATA_RUSAK'`.
- `usage.bytes` = perkiraan ukuran JSON UTF-8 record; `null` bila tidak diketahui.
- Tidak ada data medis di localStorage selain vault; kunci session tidak pernah dipersist.

### 5.2 Penyimpanan foto sumber (`app/js/photos.js` — t13)

Foto sumber berada di IndexedDB **terpisah** agar tidak menulis ulang vault besar dan agar dapat
dienkripsi dengan kunci sesi oleh `state.js`.

```js
export const PHOTO_DB_NAME = 'rawatku-photos';
export const PHOTO_DB_VERSION = 1;
export const PHOTO_STORE = 'photos';
export const MAX_SOURCE_PHOTO_BYTES = 2097152;       // re-export dari model
export const MAX_SOURCE_PHOTO_DIMENSION = 2000;

export class PhotoError extends Error {
  constructor(message, { code = 'FOTO_TIDAK_VALID' } = {}) { ... }
  // code: FOTO_TIDAK_VALID | FOTO_TERLALU_BESAR | FOTO_TIDAK_ADA | PENYIMPANAN_PENUH
}

export function createPhotoStore({
  indexedDB = globalThis.indexedDB,
  dbName = PHOTO_DB_NAME,
  storeName = PHOTO_STORE,
  now = () => new Date()
} = {}) // -> PhotoStore

export async function fileToSourcePhoto(file, {
  maxBytes = MAX_SOURCE_PHOTO_BYTES,
  maxDimension = MAX_SOURCE_PHOTO_DIMENSION
} = {}) // -> { mime, dataBase64, bytes, width, height, name }

export function photoDataUrl(photo)   // `data:<mime>;base64,<dataBase64>`
export function photoBytes(photo)     // perkiraan decoded bytes
export function validatePhotoRecord(photo) // lempar PhotoError
```

`PhotoStore`:

```js
{
  get kind() { return 'indexeddb' | 'memory'; },
  async init(),
  async put(record),                 // simpan record utuh; resolve record
  async get(id),                     // record | null
  async delete(id),
  async list({ profileId = null } = {}), // PhotoRecord[]
  async usage(),                     // { bytes: number|null }
  async clear()
}
```

`PhotoRecord`:

```js
{
  id: 'pho_xxx',
  profileId: 'prf_xxx',
  kind: 'resep' | 'etiket' | 'rekam-medis',
  mime: 'image/jpeg' | 'image/png' | 'image/webp',
  bytes: 240000,                     // decoded bytes setelah kompresi
  width: 1600, height: 1200,         // number|null
  dataBase64: '<base64>' | null,     // null bila encrypted
  crypto: {                          // envelope sealWithKey hasil state; null bila plain
    iv: '<base64>', ciphertext: '<base64>'
  } | null,
  encrypted: false,
  createdAt: ISO, updatedAt: ISO
}
```

- IndexedDB: `rawatku-photos` v1, store `photos`, `keyPath: 'id'`. Tidak ada fallback ke
  localStorage (foto tidak boleh masuk kuota localStorage); bila IndexedDB tidak ada → memori
  (untuk test) dan `kind='memory'`.
- `put` memvalidasi: `id` string, `profileId` string, `mime` ∈ ALLOWED_SOURCE_PHOTO_MIME,
  `bytes` ≤ MAX_SOURCE_PHOTO_BYTES, tepat satu dari `dataBase64`/`crypto` terisi.
- `get`/`list` mengembalikan record apa adanya (masih terenkripsi bila ada). Dekripsi dilakukan
  `state.getSourcePhoto`.
- `usage.bytes` = perkiraan ukuran record; `null` bila tidak diketahui.
- `fileToSourcePhoto` **memakai DOM** (canvas/FileReader) dan tidak diimpor `node:test`.
  Algoritma kompresi:
  1. Tolak mime di luar ALLOWED_SOURCE_PHOTO_MIME → `FOTO_TIDAK_VALID`.
  2. Baca gambar; jika dimensi > `maxDimension`, skala proporsional.
  3. Encode JPEG kualitas 0.85; jika > `maxBytes`, turunkan kualitas bertahap
     (0.75, 0.65, 0.55, 0.45) lalu perkecil dimensi 0.8× dan ulangi (maks. 6 percobaan).
  4. Jika masih > `maxBytes` → `FOTO_TERLALU_BESAR`.
  5. Kembalikan base64 tanpa prefix `data:`.
- Memori/IndexedDB penuh → `PENYIMPANAN_PENUH`.

---

## 6. Enkripsi & Cadangan

### 6.1 `app/js/crypto.js` — t1

Memakai `globalThis.crypto.subtle` (browser & Node ≥ 20). Tanpa DOM.

```js
export const DEFAULT_ITERATIONS = 310000;
export const KDF = 'PBKDF2-SHA256';
export const ALG = 'AES-GCM-256';

export class CryptoError extends Error {
  constructor(message, { code = 'DATA_RUSAK' } = {}) { ... } // code: KATA_SANDI_SALAH|DATA_RUSAK|KRIPTO_TIDAK_TERSEDIA
}

export function cryptoAvailable()                 // boolean
export function randomBytes(length)               // Uint8Array
export function toBase64(bytes)                   // string standar (btoa aman untuk biner)
export function fromBase64(str)                   // Uint8Array
export async function deriveKey(password, saltBytes, iterations = DEFAULT_ITERATIONS)
                                                  // -> CryptoKey AES-GCM 256, PBKDF2 SHA-256
export async function sealWithKey(object, key)    // -> { iv: base64, ciphertext: base64 }
export async function openWithKey({ iv, ciphertext }, key) // -> object
export async function encryptJSON(object, password, { iterations = DEFAULT_ITERATIONS, salt } = {})
export async function decryptJSON(envelope, password)
```

Envelope kripto:

```js
{
  alg: 'AES-GCM-256',
  kdf: 'PBKDF2-SHA256',
  iterations: 310000,
  salt: '<base64 16 byte>',
  iv: '<base64 12 byte>',
  ciphertext: '<base64>'
}
```

- Plaintext yang dienkripsi: `JSON.stringify(object)` UTF-8. AAD tidak dipakai.
- `encryptJSON`: salt acak 16 byte bila `options.salt` tidak diberikan (boleh Uint8Array).
- `decryptJSON`: derive dari `envelope.salt` + `envelope.iterations`; salah kata sandi /
  ciphertext rusak → `CryptoError` code `KATA_SANDI_SALAH` (jangan bocorkan detail). JSON rusak →
  `DATA_RUSAK`. `subtle` tidak ada → `KRIPTO_TIDAK_TERSEDIA`.
- `sealWithKey` memakai IV acak 12 byte baru setiap panggilan. Dipakai juga untuk isi foto.

### 6.2 `app/js/backup.js` — t1

```js
export const BACKUP_FORMAT = 'rawatku-backup';
export class BackupError extends Error { code: 'BUKAN_CADANGAN_RAWATKU'|'CADANGAN_TERKUNCI'|'KATA_SANDI_SALAH'|'VERSI_TIDAK_DIDUKUNG'|'DATA_RUSAK' }
export async function createBackup(state, { password = null, now = new Date() } = {})
  // -> { filename: 'rawatku-cadangan-YYYYMMDD-HHmm.rawatku.json', text, meta: { createdAt, encrypted, profileCount, schemaVersion, photoCount } }
export async function readBackup(text, { password = null } = {})
  // -> { state, meta: { createdAt, encrypted, schemaVersion, profileCount, photoCount } }
```

Bentuk berkas:

```js
{
  app: 'rawatku',
  format: 'rawatku-backup',
  version: 1,
  createdAt: '2026-11-09T10:00:00.000Z',
  encrypted: true,
  data: /* state (plain) ATAU envelope kripto dari encryptJSON */ 
}
```

- `createBackup` tanpa password → `encrypted:false`, `data` = state.
  Dengan password → `encrypted:true`, `data` = envelope `encryptJSON(state, password)`.
- `readBackup` memvalidasi `app/format/version`; format salah → `BUKAN_CADANGAN_RAWATKU`;
  versi ≠ 1 → `VERSI_TIDAK_DIDUKUNG`; terenkripsi tanpa password → `CADANGAN_TERKUNCI`;
  password salah → `KATA_SANDI_SALAH`; hasil didekripsi dinormalisasi `normalizeState`.
- Nama berkas memakai waktu lokal `YYYYMMDD-HHmm`.
- **Foto sumber tidak disertakan** dalam cadangan JSON v1. `meta.photoCount` memberi tahu jumlah
  foto yang tidak ikut. UI wajib menampilkan `DISCLAIMERS.photo`.
- Tidak memakai `Blob`, `File`, atau DOM (UI yang membuat unduhan).

---

## 7. Logika Murni

Semua fungsi di bawah **tanpa DOM**, deterministik, dan diuji `node:test`. Tanggal disimpan sebagai
`YYYY-MM-DD` lokal; jam `HH:mm`; timestamp sebagai ISO UTC. Fungsi yang menerima `now` default
`new Date()`.

### 7.1 `app/js/logic/dates.js` — t2

```js
export function todayISO(now = new Date())                    // 'YYYY-MM-DD' lokal
export function toISODate(date)                               // Date -> 'YYYY-MM-DD' lokal
export function parseISODate(iso)                             // -> Date lokal jam 12:00
export function isValidDateISO(iso)                           // boolean
export function isValidTime(hhmm)                             // 'HH:mm' 00:00–23:59
export function timeToMinutes(hhmm)                           // 0..1439
export function minutesToTime(minutes)                        // 'HH:mm'
export function addDays(dateISO, n)                           // 'YYYY-MM-DD'
export function diffDays(fromISO, toISO)                      // integer to - from
export function startOfWeek(dateISO, weekStartsOn = 1)        // default Senin
export function endOfWeek(dateISO, weekStartsOn = 1)
export function isoWeekNumber(dateISO)                        // { year, week }
export function weekKey(dateISO)                              // '2026-W45'
export function formatDateID(dateISO, style = 'long')         // long/short/numeric
export function formatDateTimeID(date)                        // '9 November 2026, 08.05'
export function dayNameID(dateISO)                            // 'Senin'
export function formatBytes(n)                                // '850 KB', '1,2 MB'
```

`formatDateID` memakai `Intl.DateTimeFormat('id-ID', ...)`; input invalid → string kosong `''`.
`parseISODate` memakai tengah hari lokal untuk menghindari pergeseran zona waktu/DST.

### 7.2 `app/js/logic/schedule.js` — t2

```js
export const DAY_LABELS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']; // indeks = Date.getDay()
export const MISSED_GRACE_MINUTES = 180;

export function isMedicationActiveOn(med, dateISO)
export function doseKey(medicationId, dateISO, time)
export function buildDosesForDate(medications, dateISO, { profileId = null } = {})
export function applyDoseLogs(doses, doseLogs, { now = new Date(), graceMinutes = MISSED_GRACE_MINUTES } = {})
export function summarizeDoses(dosesWithStatus)   // { total, taken, skipped, missed, pending, percent }
export function nextDose(medications, { from = new Date(), horizonDays = 14, profileId = null, doseLogs = [] } = {})
export function formatSchedule(med)               // 'Setiap hari · 08:00, 20:00'
```

Bentuk dose:

```js
{
  key: '2026-11-09T08:00|med_001',
  medicationId, profileId, name, activeIngredient,
  dose: '5', doseUnit: 'mg', time: '08:00', date: '2026-11-09',
  scheduledAt: '<ISO UTC dari waktu lokal>',
  unitsPerDose: 1,
  status: 'pending' | 'taken' | 'skipped' | 'missed'   // setelah applyDoseLogs
}
```

Aturan:

- `isMedicationActiveOn`: `active !== false`, date valid, dalam `startDate`/`endDate` (inklusif),
  dan `daysOfWeek` (default semua hari bila kosong) memuat hari tersebut. `times` kosong → tetap
  aktif tetapi tidak menghasilkan dose.
- `buildDosesForDate`: filter `profileId` bila diberikan; hasil diurutkan `time` lalu `name`.
  `scheduledAt` dibentuk dari tanggal + jam **lokal**.
- `applyDoseLogs`: cocokkan `date+time+medicationId`; log `taken`/`skipped` menang. Tanpa log:
  `scheduledAt + graceMinutes < now` → `missed`; selain itu `pending`.
- `summarizeDoses`: `percent = denom ? Math.round(taken*100/denom) : null` dengan
  `denom = taken+skipped+missed`; `pending` tidak masuk denominator.
- `nextDose`: cari dose berstatus `pending` dengan `scheduledAt >= from` dalam horizon; kembalikan
  dose atau `null`.
- `formatSchedule`: `"Setiap hari · 08:00, 20:00"`; subset hari
  `"Sen, Rab, Jum · 08:00"`; tambahkan `" · 1 Nov 2026–30 Nov 2026"` bila ada tanggal
  (`s.d.` bila hanya endDate). Jam diurutkan.

### 7.3 `app/js/logic/adherence.js` — t2

```js
export function weeklyAdherence({
  medications = [], doseLogs = [], weekStartISO,
  now = new Date(), profileId = null
} = {})
export function adherenceHistory({ medications, doseLogs, weeks = 8, now = new Date(), profileId = null } = {})
export function complianceLabel(percent) // null -> 'Belum ada data'; <70 'Perlu perhatian'; <90 'Cukup'; ≥90 'Baik'
```

`weeklyAdherence` mengembalikan:

```js
{
  weekStart: '2026-11-09', weekEnd: '2026-11-15',
  scheduled: 7, due: 3, taken: 2, skipped: 0, missed: 1, pending: 0,
  percent: 67, label: 'Perlu perhatian',
  byMedication: [{ medicationId, name, due, taken, skipped, missed, pending, percent }]
}
```

- Iterasi 7 hari dari `weekStartISO`; pakai `buildDosesForDate` + `applyDoseLogs`.
- `scheduled` = semua dosis minggu itu; `due` = yang `scheduledAt <= now`.
- Hanya `due` yang masuk hitungan status; `percent` seperti `summarizeDoses`.
- `adherenceHistory`: array `weeks` minggu urut lama → baru; minggu terakhir = minggu berjalan
  (`startOfWeek(todayISO(now))`).

### 7.4 `app/js/logic/stock.js` — t2

```js
export function simulateStockOut(med, { today = todayISO(), maxDays = 365 } = {})
export function predictRefills(medications, { today = todayISO(), profileId = null } = {})
```

`simulateStockOut` mengembalikan:

```js
// stok tidak dilacak
{ tracked: false, medicationId, name, remaining: null, unit, reason: 'stok-tidak-dilacak' }

// stok dilacak
{
  tracked: true, medicationId, name,
  remaining: 30, unit: 'tablet', unitsPerDose: 1,
  dosesPerDay: 1, unitsPerDay: 1,
  daysLeft: 15, runOutDate: '2026-11-24',
  refillByDate: '2026-11-21', refillDue: false,
  active: true, reason: null
}
```

Algoritma:

1. `remaining` bukan angka finite ≥ 0 → `tracked:false`.
2. `active === false` atau `endDate && endDate < today` → `tracked:true`, tanggal & daysLeft
   `null`, `refillDue:false`, `reason:'obat-tidak-aktif'`.
3. Simulasi hari `offset = 0..maxDays`:
   - `date = addDays(today, offset)`; lewati hari sebelum `startDate`; hentikan bila melewati
     `endDate`.
   - `needed = times.length * unitsPerDose` bila `isMedicationActiveOn`; 0 bila tidak.
   - Bila `needed > 0` dan `remaining < needed` → `runOutDate = date`,
     `daysLeft = diffDays(today, date)`.
   - Selain itu `remaining -= needed`.
4. Bila tidak pernah kurang dalam horizon → `runOutDate:null`, `daysLeft:null`.
5. `refillByDate = addDays(runOutDate, -refillReminderDays)`; `refillDue = refillByDate <= today`.
6. `dosesPerDay` = rata-rata dosis/hari 7 hari ke depan, bulat 2 desimal;
   `unitsPerDay = round(dosesPerDay * unitsPerDose, 2)`.

Contoh uji: 30 tablet, 2 dosis/hari, 1 unit/dosis, mulai hari ini → `runOutDate = today+15`,
`daysLeft = 15`, `refillByDate = today+12` (reminder 3 hari).

`predictRefills`: array hasil simulasi untuk obat `active !== false` (filter profil), urut:
`refillDue` dulu, lalu `runOutDate` naik, `daysLeft:null` terakhir; `tracked:false` paling akhir.

### 7.5 `app/js/logic/safety.js` — t3

```js
export const FLAG_LABELS = { low: 'Rendah', normal: 'Dalam rentang', high: 'Tinggi', unknown: 'Tanpa rentang' };
export function normalizeIngredient(text)
export function findDuplicateIngredients(medications, { profileId = null } = {})
export function duplicatesForMedication(med, medications)
export function flagValue(value, { low = null, high = null } = {})
export function resolveRange(metric, refRanges, profileId)
export function flagVital(vital, refRanges, { profileId = vital?.profileId } = {})
export function flagLab(lab)
```

- `normalizeIngredient`: `String(text).normalize('NFKC').toLowerCase()`, buang isi tanda kurung,
  ganti non-`[a-z0-9]` dengan spasi, rapikan spasi. Contoh: `"Paracetamol (500 mg)"` →
  `"paracetamol"`. **Tidak ada sinonim/database obat**.
- `findDuplicateIngredients`: hanya `active !== false`, filter profil, kelompokkan per hasil
  normalisasi; kembalikan grup dengan ≥ 2 obat:

```js
[{
  key: 'paracetamol',
  displayName: 'Paracetamol',
  medicationIds: ['med_1','med_2'],
  medicationNames: ['Paracetamol A','Paracetamol B'],
  count: 2
}]
```

- `duplicatesForMedication`: grup yang memuat `med.id`; `[]` bila tidak ada.
- `flagValue`: `null`/bukan angka → `'unknown'`; keduanya null → `'unknown'`; di bawah `low` →
  `'low'`; di atas `high` → `'high'`; selain itu `'normal'`.
- `resolveRange`: cari `refRanges` dengan `metric` dan `profileId`; bila >1 pilih `updatedAt`
  terbaru; kembalikan `{ low, high, unit }` atau `null`.
- `flagVital`: tension periksa `systolic` & `diastolic`; `overall` = `'high'` bila ada high,
  else `'low'`, else `'normal'`, else `'unknown'`:
  ```js
  { vitalId, type, date, flags, overall, ranges, disclaimer: DISCLAIMERS.range }
  ```
- `flagLab`: bandingkan `lab.value` dengan `lab.refLow`/`refHigh`; kembalikan
  `{ labId, name, flag, range: {low,high}, disclaimer }`.

### 7.6 `app/js/logic/vitals.js` — t3

```js
export function pointsForType(type, vitals, { profileId = null, limit = 30 } = {})
export function seriesForMetric(metric, vitals, { profileId = null, limit = 30 } = {})
export function latestFor(type, vitals, { profileId = null } = {})
export function statsFor(points)
export function buildVitalTrend(type, vitals, refRanges, { profileId = null, limit = 30 } = {})
export function formatVital(type, vital)       // '150/95 mmHg' | '180 mg/dL'
export function groupLabResults(labs, { profileId = null, limit = 30 } = {})
```

- Urutan poin: tanggal naik; `limit` mengambil **terbaru** lalu hasil tetap urut naik.
- `pointsForType('tension')` → `{ systolic: [{date,value}], diastolic: [...] }`;
  tipe single → `{ value: [...] }`.
- `latestFor`: vital terbaru (tanggal + time + createdAt) yang `values`-nya relevan.
- `statsFor(points)` → `{ count, min, max, avg, first, last, delta, deltaPct }`.
- `buildVitalTrend`:
  ```js
  {
    type, label, unit, disclaimer,
    series: [{ key, label, unit, points: [{date,value,flag}], range, stats }],
    latest: { date, display, overall, flags } | null
  }
  ```
- `groupLabResults`: kelompokkan per `name` (case-insensitive), urut nama; tiap grup
  `{ name, unit, refLow, refHigh, points, latest, stats }`; `flag` dari `flagLab`.

### 7.7 `app/js/logic/summary.js` — t3

```js
export function buildControlQuestions(state, profileId, { now = new Date(), max = 10 } = {})
export function buildDoctorSummary(state, {
  profileId, now = new Date(), visitLimit = 5, trendLimit = 8, labLimit = 8
} = {})
export function summaryToPlainText(summary)
```

`buildControlQuestions` — pertanyaan **hanya bertanya**, tidak menyarankan terapi/dosis. Aturan,
urut prioritas, maksimum `max` (default 10), dedupe teks:

1. Pertanyaan manual `state.questions` profil dengan `done === false`.
2. Alergi.
3. Duplikasi bahan aktif.
4. Vital terbaru di luar rentang.
5. Lab terbaru di luar rentang.
6. Kepatuhan minggu berjalan < 70%.
7. Perlu tebus.
8. Keluhan kunjungan terakhir (≤ 180 hari).
9. Penyakit kronis.

Bila tidak ada data, kembalikan `[]`. Tidak boleh ada kalimat perintah minum obat, dosis, atau
klaim interaksi.

`buildDoctorSummary`:

```js
{
  app: 'Rekam Medisku',
  generatedAt: ISO,
  profileId,
  profile: { name, age, birthDate, sex, sexLabel, bloodType, allergies, chronicConditions,
             emergencyContacts, doctor },
  activeMedications: [{ id, name, activeIngredient, doseText, scheduleText, startDate, endDate,
                        stock: { remaining, unit, runOutDate, refillDue } }],
  duplicates: [{ key, displayName, medicationNames, count }],
  recentVisits: [{ id, date, dateLabel, doctorName, facility, complaint, diagnosis, notes, attachmentCount }],
  vitals: [{ type, label, display, date, flag, flagLabel, range, stats }],
  labs: [{ id, name, value, unit, date, flag, flagLabel, range }],
  adherence: { weekStart, weekEnd, taken, due, percent, label },
  questions: [string],
  emergencyNumbers: ['112','119'],
  disclaimer: DISCLAIMERS.summary,
  isMedicalAdvice: false
}
```

`summaryToPlainText`: render teks polos berurutan untuk fallback/uji.

### 7.8 Penerjemah resep (`app/js/logic/resepKamus.js`, `app/js/logic/resep.js` — t9)

Modul deterministik, tanpa DOM, tanpa AI, tanpa database obat. Hanya membaca singkatan dan
menyusun kalimat Indonesia awam. Bergantung pada parser di 7.9.

#### 7.8.1 `resepKamus.js`

```js
export const KAMUS_SINGKATAN = { /* lihat tabel di bawah */ };
export const LABEL_BENTUK = {
  tab: 'tablet', caps: 'kapsul', syr: 'sirup', cth: 'sendok teh',
  gtt: 'tetes', supp: 'supositoria', ung: 'salep', inj: 'suntikan'
};
export const LABEL_ATURAN_MAKAN = {
  sebelum: 'sebelum makan', sesudah: 'sesudah makan',
  saat: 'saat makan', 'bila-perlu': 'bila perlu'
};
export const LABEL_WAKTU = {
  pagi: 'pagi', siang: 'siang', malam: 'malam', 'sebelum-tidur': 'sebelum tidur'
};

export function normalisasiResep(teks) // NFKC, lowercase, rapikan spasi/titik
export function tokenisasiResep(teks)  // string[]
export function frasaTerjemahan(obat)  // kalimat Indonesia awam (lihat template)
```

Minimal kamus (boleh ditambah; jangan diubah artinya):

| Token | Arti | Jenis |
|-------|------|-------|
| `dd`, `d.d.` | kali sehari | frekuensi |
| `s`, `signa` | tanda/tulis resep | label |
| `tab`, `tbl`, `tablet` | tablet | bentuk |
| `caps`, `cap`, `kapsul` | kapsul | bentuk |
| `syr`, `sirup` | sirup | bentuk |
| `cth`, `sendok teh` | sendok teh (5 ml) | bentuk/satuan |
| `gtt`, `tetes` | tetes | bentuk |
| `supp`, `supositoria` | supositoria | bentuk |
| `ung`, `salep` | salep | bentuk |
| `inj`, `suntikan` | suntikan | bentuk |
| `pc`, `p.c.`, `sesudah makan`, `setelah makan` | sesudah makan | aturan makan |
| `ac`, `a.c.`, `sebelum makan` | sebelum makan | aturan makan |
| `dc`, `d.c.`, `saat makan`, `bersama makan` | saat makan | aturan makan |
| `prn`, `k.p.`, `bila perlu` | bila perlu | aturan |
| `hs`, `h.s.`, `sebelum tidur` | sebelum tidur | waktu |
| `mane`, `pagi` | pagi | waktu |
| `nocte`, `malam` | malam | waktu |
| `mg`, `mcg`, `µg`, `ug`, `g`, `ml`, `%` | satuan kekuatan | satuan |

`normalisasiResep`:
1. `String(teks).normalize('NFKC').toLowerCase()`.
2. Ganti `p.c.`→`pc`, `a.c.`→`ac`, `d.c.`→`dc`, `h.s.`→`hs`, `k.p.`→`kp`, `d.d.`→`dd`.
3. Ganti `µg`/`ug`→`mcg`.
4. Ganti `[×]`→`x`.
5. Rapikan spasi ganda; pertahankan angka, `/`, `-`, `#`, `.`, `,`, `%`.
6. Jangan membuang titik desimal (`7.2`).

`frasaTerjemahan(obat)` template **persis**:
- Normal: `Diminum {kaliSehari} kali sehari, {takaran} {satuan}, {aturanMakan}, selama {durasiHari} hari`
  dengan klausa `, {aturanMakan}` dan `, selama ...` dihilangkan bila nilainya null.
- Bila `aturanMakan === 'bila-perlu'`: `Diminum bila perlu, {takaran} {satuan}` (+ durasi bila ada).
- Bila `kaliSehari == null`: `Aturan minum belum dikenali; cocokkan dengan apoteker atau dokter.`
- `cth` → takaran ditulis `1 sendok teh (5 ml)`; `gtt` → `3 tetes`; satuan tablet/kapsul/salep
  memakai label bentuk.
- Angka desimal memakai koma (`0,5`) melalui `Intl.NumberFormat('id-ID')`.
- Contoh target: `3 dd 1 tab pc selama 5 hari` →
  `Diminum 3 kali sehari, 1 tablet, sesudah makan, selama 5 hari`.

#### 7.8.2 `resep.js`

```js
export const PARSER_RESEP_VERSION = 'resep-v1';
export const PERINGATAN_RESEP = [
  'Hasil ini adalah draf yang harus dicocokkan dengan resep asli.',
  'Kesalahan membaca dosis bisa berbahaya. Konsultasikan dengan apoteker atau dokter.'
];

export function kenaliResep(teks, { maxObat = 30, now = new Date() } = {})
export function terjemahkanBaris(baris, { indeks = 0 } = {})   // -> ObatTerjemahan | null
export function jadwalUntukObat(obat)                          // -> string[] HH:mm
export function obatKeMedication(obat, {
  profileId = null, today = null, source = null, now = new Date()
} = {}) // -> Medication draft (belum disimpan)
```

`kenaliResep` mengembalikan:

```js
{
  obat: [ObatTerjemahan],
  teksAsli: string,
  kepercayaan: number,                 // rata-rata kepercayaan obat; 0 bila kosong
  bagianTidakDipahami: string[],       // fragmen yang tidak dikenali, dedupe
  peringatan: [DISCLAIMERS.ocr, DISCLAIMERS.resep, ...PERINGATAN_RESEP],
  parserVersion: 'resep-v1',
  isMedicalAdvice: false
}
```

`ObatTerjemahan` (bentuk **wajib**):

```js
{
  nama: 'Amlodipin',
  kekuatan: { nilai: 5, satuan: 'mg', teks: '5 mg' } | null,
  bentukSediaan: { kode: 'tab', label: 'tablet', satuan: 'tablet', satuanLabel: 'tablet' } | null,
  kaliSehari: 3 | null,
  takaranPerDosis: 1 | null,
  satuanTakaran: 'tablet' | 'kapsul' | 'ml' | 'tetes' | 'sendok teh' | ... | null,
  waktuMinum: ['pagi','siang','malam'],       // subset LABEL_WAKTU, dedupe, urut
  aturanMakan: 'sebelum' | 'sesudah' | 'saat' | 'bila-perlu' | null,
  durasiHari: 5 | null,
  jumlahTotal: { jumlah: 15, satuan: 'tablet' } | null,
  jadwalJam: ['07:00','13:00','19:00'],       // string[] HH:mm, [] bila bila-perlu
  polaHarian: [1,0,1] | null,                 // hanya untuk pola "1-0-1"
  teksAsli: 'Amlodipin 5 mg 3 dd 1 tab pc selama 5 hari',
  teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet, sesudah makan, selama 5 hari',
  kepercayaan: 0.85,                          // 0..1, 2 desimal
  bagianTidakDipahami: []
}
```

Aturan `kenaliResep`:

- Pisahkan baris; buang baris kosong, header (`RESEP`, `SIGN A`, `R/` saja), tanggal, identitas
  pasien, dan alamat.
- Baris yang dimulai `R/` atau `R.` → nama obat mengikuti setelahnya.
- Nama obat = teks sebelum penanda frekuensi/bentuk pertama, dibersihkan dari tanda baca ujung.
  Bila kosong → `Obat {indeks+1}` dan tambahkan ke `bagianTidakDipahami`.
- Baris lanjutan yang dimulai `s`/`signa` tanpa nama obat → gabungkan ke obat sebelumnya.
- Maksimal `maxObat` obat; sisanya masuk `bagianTidakDipahami` sebagai `'baris tidak diproses: ...'`.
- `kepercayaan` per obat dihitung:
  `1 - 0.30*(kaliSehari==null) - 0.15*(bentukSediaan==null) - 0.10*(takaranPerDosis==null)
   - 0.05*(aturanMakan==null) - 0.10*min(bagianTidakDipahami.length, 2)`, clamp 0..1,
  dibulatkan 2 desimal. `kenaliResep.kepercayaan` = rata-rata (2 desimal), 0 bila tidak ada obat.
- `jadwalJam` = hasil `jadwalUntukObat` (7.9). Bila `aturanMakan === 'bila-perlu'` → `[]`.
- `teksTerjemahan` = `frasaTerjemahan(obat)`.
- Semua keluaran deterministik: input sama → output sama. `now` hanya dipakai `obatKeMedication`.

`obatKeMedication`:

```js
{
  name: obat.nama,
  activeIngredient: '',
  dose: obat.kekuatan ? String(obat.kekuatan.nilai) : '',
  doseUnit: obat.kekuatan?.satuan || '',
  instructions: obat.teksTerjemahan,
  times: obat.aturanMakan === 'bila-perlu' && !obat.polaHarian ? [] : obat.jadwalJam,
  daysOfWeek: [0,1,2,3,4,5,6],
  startDate: today || todayISO(now),
  endDate: obat.durasiHari ? addDays(startDate, obat.durasiHari - 1) : null,
  stock: {
    remaining: obat.jumlahTotal?.jumlah ?? null,
    unit: obat.bentukSediaan?.satuan || 'tablet',
    unitsPerDose: obat.takaranPerDosis ?? 1
  },
  refillReminderDays: 3,
  active: true,
  notes: `Diterjemahkan dari resep: ${obat.teksAsli}`,
  source: source || null
}
```

### 7.9 Parser sediaan/durasi/jumlah/jadwal (`resepSediaan.js`, `resepJadwal.js` — t10)

#### 7.9.1 `resepSediaan.js`

```js
export const BENTUK_SEDIAAN = {
  tab:  { kode:'tab',  label:'tablet',      satuan:'tablet',   satuanLabel:'tablet' },
  caps: { kode:'caps', label:'kapsul',      satuan:'kapsul',   satuanLabel:'kapsul' },
  syr:  { kode:'syr',  label:'sirup',       satuan:'ml',       satuanLabel:'ml' },
  cth:  { kode:'cth',  label:'sendok teh',  satuan:'ml',       satuanLabel:'sendok teh', faktorMl:5 },
  gtt:  { kode:'gtt',  label:'tetes',       satuan:'tetes',    satuanLabel:'tetes' },
  supp: { kode:'supp', label:'supositoria', satuan:'suppositoria', satuanLabel:'supositoria' },
  ung:  { kode:'ung',  label:'salep',       satuan:'salep',    satuanLabel:'salep' },
  inj:  { kode:'inj',  label:'suntikan',    satuan:'suntikan', satuanLabel:'suntikan' }
};
export const SATUAN_KEKUATAN = ['mg','mcg','g','ml','%'];

export function normalizeAngka(teks)   // '½'/'1/2' -> 0.5; koma -> titik
export function parseRoman(teks)       // I..X, atau angka; null bila invalid
export function parseBentukSediaan(teks) // -> BENTUK_SEDIAAN[kode] | null
export function parseKekuatan(teks)    // -> { nilai, satuan, teks } | null
export function parseDurasi(teks)      // -> { hari, teksAsli } | null
export function parseJumlah(teks)      // -> { jumlah, satuan, teksAsli } | null
```

Aturan:

- `parseBentukSediaan` mengenali token: `tab|tbl|tablet`, `caps|cap|kapsul`, `syr|sirup`,
  `cth|sendok teh`, `gtt|tetes`, `supp|supositoria`, `ung|salep`, `inj|suntikan` (case-insensitive).
- `parseKekuatan`: regex `(\d+(?:[.,]\d+)?)\s*(mcg|mg|g|ml|%)` (µg/ug dinormalisasi `mcg`);
  `teks` memakai satuan ternormalisasi, mis. `5 mg`.
- `parseDurasi`: `(?:selama|x|untuk)\s*(\d+)\s*hari` atau `(\d+)\s*hari`; hanya satu kecocokan;
  `minggu` **tidak** dikonversi otomatis (masuk bagian tidak dipahami).
- `parseJumlah`: `(?:no\.?|nomor|#)\s*([ivxlcdm]+|\d+)`; `satuan` diisi pemanggil bila diketahui.

#### 7.9.2 `resepJadwal.js`

```js
export const JADWAL_BAWAAN = {
  1: ['07:00'],
  2: ['07:00','19:00'],
  3: ['07:00','13:00','19:00'],
  4: ['07:00','12:00','17:00','21:00']
};
export const WAKTU_LABEL_ORDER = ['pagi','siang','malam','sebelum-tidur'];

export function jadwalBawaan(kaliSehari, { mulai = '07:00', selesai = '21:00' } = {})
export function waktuMinumDariJam(times)  // -> ('pagi'|'siang'|'malam'|'sebelum-tidur')[]
export function parseFrekuensi(teks)      // -> { kaliSehari, takaranPerDosis, satuanTakaran, polaHarian, teksAsli } | null
export function parseAturanMakan(teks)    // -> { aturanMakan, waktuMinum }
export function obatKeMedication(obat, { profileId = null, today = null, source = null, now = new Date() } = {})
```

`jadwalBawaan`:
- `1`–`4` memakai tabel di atas.
- `n > 4`: bagi rentang `mulai`–`selesai` (default 07:00–21:00) menjadi `n` titik, bulatkan ke
  5 menit terdekat, unik dan urut. Contoh 5× → `['07:00','10:30','14:00','17:30','21:00']`.
- `null`, `0`, negatif, atau bukan integer → `[]`.
- `n === 0.5` (mis. setiap 2 hari) tidak didukung → `[]` + peringatan di parser.

`waktuMinumDariJam`:
- 05:00–10:59 → `pagi`; 11:00–14:59 → `siang`; 15:00–20:59 → `malam`;
  21:00–04:59 → `sebelum-tidur`. Dedupe, urut `WAKTU_LABEL_ORDER`.

`parseFrekuensi` (case-insensitive, setelah normalisasi; urutan prioritas):
1. Pola harian `\b(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\b` → `polaHarian=[a,b,c]`,
   `kaliSehari = jumlah elemen > 0`, `takaranPerDosis = max(elemen)`,
   `satuanTakaran` dari bentuk (default tablet).
   - `1-0-1` → kali 2, takaran 1; waktu pagi & malam; jadwal `['07:00','19:00']`.
   - Bila elemen berbeda (mis. `1-0-2`) → `bagianTidakDipahami` diisi
     `'pola dosis tidak seragam: 1-0-2'`.
2. `S.2.d.d.C.I`: `\bs\s*\.?\s*(\d+)\s*\.?\s*d\.?\s*d\.?\s*([a-z]+)?\s*\.?\s*([ivxlcdm]+|\d+)\b`
   → kali=2, bentuk dari token (`c`/`caps` → kapsul; `tab` → tablet),
   takaran=`parseRoman('I')`=1.
3. `S 3 dd tab I`: `\bs\s*\.?\s*(\d+)\s*dd\s*([a-z]+)\s*([ivxlcdm]+|\d+)\b`
   → kali=3, bentuk token, takaran Roman.
4. `3 x 1 tab`: `\b(\d+)\s*x\s*([0-9½.,]+)\s*([a-z]+)?\b`
   → kali, takaran `normalizeAngka`, bentuk token bila ada.
5. `3x1`: pola yang sama tanpa spasi.
6. `3 dd 1`: `\b(\d+)\s*dd\s*([0-9½.,]+)?\s*([a-z]+)?\b`
   → kali; takaran default 1 bila tidak ada; bentuk token bila ada.
7. `3 dd` tanpa takaran → kali=3, takaran=1 (default) dan tambahkan catatan
   `'takaran tidak tertulis; default 1'` ke `bagianTidakDipahami` pemanggil.
8. `(\d+)\s*kali\s*sehari` → kali=n, takaran=1.
- Bila tidak ada pola → `null` (bukan menebak).

`parseAturanMakan`:
- `pc|p.c.|sesudah makan|setelah makan` → `{ aturanMakan:'sesudah', waktuMinum:[] }`.
- `ac|a.c.|sebelum makan` → `sebelum`.
- `dc|d.c.|saat makan|bersama makan` → `saat`.
- `prn|kp|k.p.|bila perlu` → `bila-perlu`.
- `hs|h.s.|sebelum tidur` → `{ aturanMakan:null, waktuMinum:['sebelum-tidur'] }`.
- `mane|pagi` → `{ aturanMakan:null, waktuMinum:['pagi'] }`.
- `nocte|malam` → `{ aturanMakan:null, waktuMinum:['malam'] }`.
- Bila lebih dari satu aturan makan berbeda → ambil yang pertama, sisanya masuk
  `bagianTidakDipahami`.

`obatKeMedication`: bentuk dan aturan persis seperti 7.8.2. Di sini boleh memakai
`todayISO`/`addDays` dari `dates.js`.

### 7.10 Parser rekam medis & lab (`rekam.js`, `labParse.js` — t11)

#### 7.10.1 `labParse.js`

```js
export const SATUAN_LAB_UMUM = ['mg/dL','g/dL','%','mmol/L','µmol/L','U/L','IU/L','ng/mL','pg/mL','x10^3/µL','x10^6/µL','/µL'];

export function parseAngkaLab(teks)     // -> number|null
export function parseRujukan(teks)      // -> { low:number|null, high:number|null, teks:string } | null
export function parseBarisLab(baris)    // -> HasilLab | null
export function parseHasilLab(teks)     // -> HasilLab[]
```

`HasilLab`:

```js
{
  nama: 'HbA1c',
  nilai: 7.2,                    // number|null
  nilaiTeks: '7.2',
  satuan: '%',                   // string ('' bila tidak ada)
  rujukan: { low: 4.0, high: 5.6, teks: '4.0 - 5.6' } | null,
  barisAsli: 'HbA1c 7.2 % 4.0 - 5.6',
  kepercayaan: 0.85,             // 0..1, 2 desimal
  bagianTidakDipahami: []
}
```

Aturan:
- `parseAngkaLab`: terima `7.2`, `7,2`, `1.200` (anggap ribuan bila 3 digit setelah titik dan ada
  pemisah lain), `10^3` tidak dianggap angka; kembalikan finite number atau null.
- `parseRujukan`: pola `\(?(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\)?` dengan label
  `rujukan|normal|ref|acuan` opsional; atau `(<low>-<high>)` di ujung baris.
- `parseBarisLab`: minimal nama + angka. Nama = token sebelum angka; satuan = token setelah angka
  bila cocok `SATUAN_LAB_UMUM` atau pola umum (`[a-zA-Zµ%/^0-9]+`); rujukan opsional.
  Baris tanpa angka → `null`.
- `kepercayaan`: 0.9 bila nama+nilai+satuan; 0.8 bila nama+nilai tanpa satuan; 0.7 bila rujukan
  ada tetapi satuan tidak; kurangi 0.1 per bagian tidak dipahami; clamp 0..1.
- `parseHasilLab` memproses baris yang mengandung angka dan minimal 2 token; mengabaikan header
  tabel (`Nama`, `Hasil`, `Satuan`, `Rujukan`).
- Tidak menandai tinggi/rendah dan tidak mendiagnosis; itu tugas modul safety setelah disimpan.

#### 7.10.2 `rekam.js`

```js
export const PARSER_REKAM_VERSION = 'rekam-v1';
export const PERINGATAN_REKAM = [
  'Hasil ini hanya menyalin teks dokumen, bukan diagnosis atau interpretasi.',
  'Periksa tanggal, nama obat/lab, dan angka dengan dokumen asli.'
];

export function kenaliRekamMedis(teks, { now = new Date() } = {})
export function rekamKeKunjungan(draf, {
  profileId = null, photoId = null, photoMime = null,
  ocrText = '', ocrConfidence = null, verifiedAt = null
} = {}) // -> Visit draft
export function labKeLab(hasil, {
  profileId = null, date = null, facility = '',
  photoId = null, photoMime = null, ocrText = '', ocrConfidence = null, verifiedAt = null
} = {}) // -> Lab draft
```

`kenaliRekamMedis` mengembalikan:

```js
{
  draf: {
    tanggal: '2026-11-01' | null,
    tanggalTeks: '01/11/2026',
    faskes: 'RS Sehat Sentosa',
    dokter: 'dr. Sari',
    diagnosisTertulis: ['hipertensi', 'dislipidemia'], // teks setelah label, bukan kesimpulan
    keluhan: '',
    catatan: '',
    nomorRekamMedis: ''
  },
  hasilLab: [HasilLab],
  bagianTidakDipahami: string[],
  kepercayaan: number,             // rata-rata draf+lab, 2 desimal
  teksAsli: string,
  peringatan: [DISCLAIMERS.ocr, DISCLAIMERS.rekam, ...PERINGATAN_REKAM],
  parserVersion: 'rekam-v1',
  isMedicalAdvice: false
}
```

Heuristik label (case-insensitive):
- Tanggal: `tanggal|tgl` → `dd/mm/yyyy`, `dd-mm-yyyy`, `yyyy-mm-dd`, `9 November 2026`
  (nama bulan Indonesia/Inggris). Validasi dengan `isValidDateISO` setelah konversi.
- Faskes: `(rs|rumah sakit|klinik|puskesmas|lab(?:oratorium)?)\s*[:\-]?\s*(.+)` atau baris yang
  mengandung `RS`/`Rumah Sakit`. Simpan teks apa adanya.
- Dokter: `(dr\.?|dokter)\s*[:\-]?\s*(.+)`; simpan gelar/nama apa adanya.
- Diagnosis: `(diagnosa|diagnosis|dx)\s*[:\-]\s*(.+)`; pisahkan koma/titik koma; simpan persis
  teks tertulis. **Jangan menambah diagnosis yang tidak tertulis.**
- Keluhan: `(keluhan|anamnesis)\s*[:\-]\s*(.+)`.
- Nomor RM: `(no\.?\s*(rm|rekam medis)|mrn)\s*[:\-]?\s*(.+)`.
- Catatan: baris lain yang tidak terpakai, digabung `\n`, maks. 2000 karakter.
- Hasil lab memakai `parseHasilLab` pada blok setelah label `hasil lab|laboratorium|lab` atau
  seluruh teks bila tidak ada label.

`kepercayaan`:
- `draf`: 1.0; -0.2 jika tanggal null; -0.15 jika faskes kosong; -0.1 jika dokter kosong;
  -0.15 jika diagnosis kosong.
- `hasilLab`: rata-rata `kepercayaan` tiap lab; 0 bila kosong.
- Total: rata-rata berbobot (`draf` 0.5, lab 0.5) bila ada lab; selain itu `draf`.
- Clamp 0..1, 2 desimal.

`rekamKeKunjungan`:
```js
{
  date: draf.tanggal || todayISO(now),  // bila null, review wajib mengisi; UI menandai
  doctorName: draf.dokter,
  facility: draf.faskes,
  complaint: draf.keluhan,
  diagnosis: draf.diagnosisTertulis.join(', '),
  notes: draf.catatan,
  attachments: [],
  source: {
    kind: 'rekam-medis', photoId, photoMime,
    ocrText: ocrText.slice(0, MAX_OCR_TEXT_CHARS),
    ocrConfidence, translatedText: '', verifiedByUser: Boolean(verifiedAt),
    verifiedAt, parserVersion: 'rekam-v1'
  }
}
```

`labKeLab`:
```js
{
  date: date || todayISO(now),
  name: hasil.nama,
  value: hasil.nilai, unit: hasil.satuan,
  refLow: hasil.rujukan?.low ?? null,
  refHigh: hasil.rujukan?.high ?? null,
  note: '', facility,
  source: {
    kind: 'rekam-medis', photoId, photoMime,
    ocrText: ocrText.slice(0, MAX_OCR_TEXT_CHARS),
    ocrConfidence, translatedText: '', verifiedByUser: Boolean(verifiedAt),
    verifiedAt, parserVersion: 'rekam-v1'
  }
}
```
Keduanya hanya membuat **draf**; tidak menyimpan.

---

## 8. QR (`app/js/qr.js` — t7)

Encoder QR **murni JS**, tanpa DOM/library. Model 2, byte mode, EC level **M**, versi **1–10**,
pemilihan mask otomatis sesuai standar (penalty rules ISO/IEC 18004), quiet zone hanya saat render.

```js
export const QR_MAX_BYTES = 200;
export class QRError extends Error { code: 'QR_TERLALU_PANJANG'|'QR_TIDAK_VALID' }

export function encodeQR(text, { ec = 'M', minVersion = 1, maxVersion = 10 } = {})
// -> { version, size, ec, modules: boolean[][], byteLength }
export function qrToSvg(qr, {
  margin = 4, moduleSize = 4, dark = '#111827', light = '#ffffff',
  ariaLabel = 'Kode QR Kartu Darurat Rekam Medisku'
} = {}) // -> string SVG
export function emergencyPayload(profile, medications = [], {
  maxBytes = QR_MAX_BYTES, emergencyNumbers = ['112','119']
} = {})
// -> { text, truncated, bytes, fields }
```

Aturan QR:

- `size = 17 + 4 * version`; `modules[y][x]` boolean (true = gelap).
- Kapasitas byte maksimum EC M versi 1–10: `[14,26,42,62,84,106,122,152,180,213]`.
  Panjang dihitung dari **UTF-8 bytes**. Melebihi `maxVersion`/kapasitas → `QRError('QR_TERLALU_PANJANG')`.
- Format info, finder pattern, timing pattern, dark module, dan mask wajib benar.
- `qrToSvg` menghasilkan `<svg role="img" aria-label="...">` dengan `<title>`, `viewBox`,
  background terang, modul gelap; tidak memakai font atau resource eksternal.

`emergencyPayload` — teks darurat untuk dipindai tanpa aplikasi:

```
REKAM-MEDISKU-DARURAT v1
Nama: Budi Santoso
Gol darah: O+
Alergi: penisilin
Penyakit: hipertensi
Kontak: Siti (Istri) 081234567890
Obat: Amlodipin 5 mg (08:00)
Darurat: 112 / 119
Catatan: Data ditulis pemilik, bukan diagnosis.
```

- Hanya obat `active !== false`; maks. 3 obat di payload.
- Baris wajib: header, `Nama`, `Gol darah`, `Alergi`, `Kontak`, `Darurat`.
- Pemotongan awal: nama ≤ 30, kontak ≤ 30, alergi ≤ 40, penyakit ≤ 50, obat ≤ 50 karakter.
  Bila hasil masih > `maxBytes`, buang baris opsional (`Penyakit`, `Obat`, `Catatan`) lalu potong
  alergi/kontak lebih pendek; set `truncated:true` setiap kali ada pemotongan.
- Bila baris wajib minimum masih > `maxBytes` → `QRError('QR_TERLALU_PANJANG')`.
- `fields` berisi objek nilai yang dipakai (untuk preview UI).
- Teks memakai `\n`; UTF-8. Tidak ada enkripsi — UI wajib menampilkan peringatan privasi.

---

## 8A. OCR Lokal (`app/js/ocr/adaptor.js`, `app/js/ocr/tesseractEngine.js` — t12)

### 8A.1 Prinsip

- OCR berjalan **di browser** memakai Tesseract.js yang di-vendor. Tidak ada panggilan jaringan
  selain same-origin `/vendor/*`.
- Adaptor adalah satu-satunya pintu masuk OCR. Mesin lain dapat ditukar kelak tanpa mengubah UI.
- OCR hanya menghasilkan `{ teks, kepercayaan, baris[] }`; **tidak** menyimpan apa pun dan
  **tidak** menerjemahkan.
- Titik ekstensi cloud **nonaktif**; fungsi yang memanggilnya wajib melempar error dan tidak boleh
  ada kode jaringan.

### 8A.2 `adaptor.js`

```js
export const OCR_DEFAULTS = {
  languages: ['ind', 'eng'],
  lowConfidence: 0.6,
  maxImageBytes: 10 * 1024 * 1024,
  timeoutMs: 120000
};

export const OCR_ENGINES = {
  tesseract: { id: 'tesseract', label: 'Tesseract.js (lokal)', lokal: true, enabled: true },
  cloud: {
    id: 'cloud', label: 'Layanan visi eksternal (nonaktif)',
    lokal: false, enabled: false, requiresConsent: true, documentationOnly: true
  }
};

export class OcrError extends Error {
  constructor(message, { code = 'OCR_GAGAL', cause = null } = {}) { ... }
  // code: OCR_TIDAK_TERSEDIA | OCR_GAGAL | GAMBAR_TIDAK_VALID
  //     | OCR_TERLALU_BESAR | OCR_CLOUD_NONAKTIF | ADAPTOR_TIDAK_DIKENAL
}

export function ocrTersedia(engineId = 'tesseract') // boolean
export function createOcrAdapter({
  engine = 'tesseract',
  engineImpl = null,              // untuk test: fake engine
  languages = ['ind', 'eng']
} = {}) // -> OcrAdapter

export async function kenaliTeks(gambar, {
  engine = 'tesseract',
  engineImpl = null,
  languages = ['ind', 'eng'],
  onProgress = null,              // ({ status, progress }) => void, progress 0..1
  signal = null,
  timeoutMs = OCR_DEFAULTS.timeoutMs
} = {}) // -> HasilOcr

export function createCloudOcrAdapter() {
  throw new OcrError('OCR cloud tidak diaktifkan. Fitur ini hanya titik ekstensi dan memerlukan persetujuan eksplisit pengguna.', { code: 'OCR_CLOUD_NONAKTIF' });
}
```

`OcrAdapter`:

```js
{
  id: 'tesseract',
  label: 'Tesseract.js (lokal)',
  lokal: true,
  async recognize(source, { languages = ['ind','eng'], onProgress = null, signal = null } = {})
    // -> { baris: BarisOcr[], teks: string }
  async terminate()
}
```

`BarisOcr`:

```js
{
  teks: 'Amlodipin 5 mg',
  kepercayaan: 0.87,              // 0..1
  bbox: { x0: 10, y0: 20, x1: 300, y1: 48 }
}
```

`HasilOcr`:

```js
{
  teks: 'Amlodipin 5 mg\n3 dd 1 tab',
  kepercayaan: 0.84,              // rata-rata kepercayaan baris; 0 bila kosong
  baris: [BarisOcr],
  bahasa: ['ind','eng'],
  mesin: 'tesseract',
  durasiMs: 1234,
  gambar: { lebar: 1600, tinggi: 1200, bytes: 240000 },
  peringatan: [DISCLAIMERS.ocr]
}
```

Aturan:
- `gambar` boleh `File`, `Blob`, `HTMLCanvasElement`, `ImageData`, atau string data URL.
  Di Node/test, fake engine boleh menerima apa saja; adaptor tidak mengimpor DOM.
- Validasi ukuran: bila `File`/`Blob` > `maxImageBytes` → `OCR_TERLALU_BESAR`.
- `kepercayaan` mesin dinormalisasi: jika engine mengembalikan 0–100, bagi 100; clamp 0..1.
- `baris` diambil dari hasil engine; baris kosong dibuang; urut sesuai engine.
- `teks` = `baris.map(b => b.teks).join('\n')`.
- `onProgress` dipanggil minimal saat status `'loading'`, `'recognizing'`, `'done'`.
- `signal` (AbortSignal) membatalkan; error → `OCR_GAGAL`.
- Waktu habis `timeoutMs` → `OCR_GAGAL` dengan pesan timeout.
- `kenaliTeks` membuat adaptor, memanggil `recognize`, lalu `terminate()` di `finally`.
- **Tidak ada** penulisan storage, tidak ada `fetch` eksternal, tidak ada `eval`/`new Function`.

### 8A.3 `tesseractEngine.js`

```js
export const VENDOR_BASE = '/vendor';
export const TESSERACT_VENDOR = {
  modulePath: '/vendor/tesseract/tesseract.esm.min.js',
  workerPath: '/vendor/tesseract/worker.min.js',
  corePath: '/vendor/tesseract-core',
  langPath: '/vendor/lang'
};

export async function createTesseractEngine({
  modulePath = TESSERACT_VENDOR.modulePath,
  workerPath = TESSERACT_VENDOR.workerPath,
  corePath = TESSERACT_VENDOR.corePath,
  langPath = TESSERACT_VENDOR.langPath,
  logger = null
} = {}) // -> OcrAdapter (id 'tesseract')
```

- Browser-only; `import(modulePath)` dinamis (same-origin). Bila import/gagal membuat worker →
  `OCR_TIDAK_TERSEDIA`.
- Membuat worker Tesseract dengan `workerPath`, `corePath`, `langPath` lokal, bahasa
  `['ind','eng']`; tidak boleh memakai CDN/default Tesseract.
- `recognize` mengubah hasil Tesseract menjadi `BarisOcr[]` (confidence Tesseract 0..100 → 0..1).
- Worker dihentikan di `finally` oleh adaptor; implementasi boleh cache worker per bahasa, tetapi
  wajib menyediakan `terminate()`.
- Tidak ada fallback ke cloud. Bila WASM/Worker tidak didukung → `OCR_TIDAK_TERSEDIA`.
- `logger` hanya untuk progress; jangan mencatat teks/gambar ke console.

### 8A.4 Vendor (`scripts/vendor-ocr.mjs` — t12)

Perilaku skrip:
1. Resolve `tesseract.js` dan paket data dari `node_modules`; bila tidak ada, cetak instruksi
   `npm install` lalu exit 1.
2. Salin ke `public/vendor/`:
   - `tesseract.js/dist/tesseract.esm.min.js` → `tesseract/tesseract.esm.min.js`
     (bila tidak ada, gagal dengan pesan jelas; jangan memakai CDN).
   - `tesseract.js/dist/worker.min.js` → `tesseract/worker.min.js`.
   - `tesseract.js-core` (dependency transitif) `tesseract-core*.wasm` dan `tesseract-core*.wasm.js`
     → `tesseract-core/`.
   - `@tesseract.js-data/ind/<versi>/ind.traineddata.gz` → `lang/ind.traineddata.gz`.
   - `@tesseract.js-data/eng/<versi>/eng.traineddata.gz` → `lang/eng.traineddata.gz`.
3. Tulis `public/vendor/manifest.json`:

```json
{
  "generatedAt": "2026-11-09T10:00:00.000Z",
  "packages": {
    "tesseract.js": "6.0.1",
    "@tesseract.js-data/ind": "1.0.0",
    "@tesseract.js-data/eng": "1.0.0"
  },
  "files": [
    { "path": "tesseract/tesseract.esm.min.js", "bytes": 123456, "sha256": "..." }
  ],
  "entry": {
    "module": "/vendor/tesseract/tesseract.esm.min.js",
    "worker": "/vendor/tesseract/worker.min.js",
    "corePath": "/vendor/tesseract-core",
    "langPath": "/vendor/lang"
  }
}
```

4. Idempoten: jalankan ulang menimpa dengan versi yang sama; jangan menyisakan berkas asing.
5. Verifikasi akhir: semua path di `entry` + kedua `*.traineddata.gz` ada dan non-kosong.
6. Tidak mengunduh apa pun dari internet; hanya membaca `node_modules`.

`public/vendor/manifest.json` adalah artefak yang boleh ditulis t12 (folder `public/vendor/`
milik t12). Server menyajikan folder itu di `/vendor/`.

### 8A.5 Larangan cloud (terdokumentasi, nonaktif)

- `OCR_ENGINES.cloud` hanya metadata; `createCloudOcrAdapter()` selalu melempar
  `OCR_CLOUD_NONAKTIF`.
- Tidak boleh ada implementasi `fetch`/XHR/WebSocket ke layanan visi, API key, atau kode unggah.
- Kelak, penggunaan cloud wajib: (a) fitur opt-in eksplisit per dokumen, (b) persetujuan pengguna
  yang tercatat, (c) perubahan CSP dan dokumentasi, (d) tidak menjadi default. Tidak ada bagian
  dari syarat ini yang diimplementasikan pada versi ini.

---

## 8B. Antarmuka Suara (t17–t34)

### 8B.1 Prinsip

- **Satu adaptor, dua mesin.** Semua UI memanggil `kenaliSuara(opsi)`; tidak ada layar yang
  menyentuh `SpeechRecognition` atau mesin Whisper langsung.
- **Offline Whisper adalah bawaan.** Mesin offline memakai `@huggingface/transformers` 4.3.2 +
  `Xenova/whisper-base` q8 (ONNX Runtime WASM) yang disajikan same-origin dari `/vendor/suara/`
  dan **dimuat malas** saat fitur suara pertama kali dipakai. Tidak ada request eksternal saat
  runtime dan tidak ada unduhan model saat runtime.
- **Tanya satu per satu adalah jalur obat utama.** Pengguna tidak mendikte satu kalimat panjang.
  Aplikasi menanyakan frekuensi, takaran, aturan makan, waktu, dan "bila perlu" satu per satu,
  dengan pilihan tertutup + pencocokan deterministik (8B.12–8B.15).
- **Nama obat tidak dari ASR bebas.** Nama dipilih dari daftar obat tersimpan, hasil pindai resep
  yang dibacakan satu per satu, ketikan/pasta, atau ejaan huruf-per-huruf dengan konfirmasi
  (8B.14). Teks bebas ASR tidak pernah menjadi nama obat.
- **Keluaran ASR dijaga.** Rekaman per jawaban maksimum 8 detik, token keluaran kecil, dan hasil
  berulang/aneh ditolak sebagai "tidak terdengar" (8B.11). Parser lama tetap menolak keluaran buruk.
- **Web Speech opt-in.** Nonaktif bawaan; hanya setelah peringatan pihak ketiga + persetujuan
  eksplisit yang tercatat. Bila API tidak ada, opsi disembunyikan dengan pesan jelas.
- **Tidak ada audio yang disimpan.** Offline memproses di memori lalu membuang; tidak ada rekaman
  di IndexedDB/localStorage/vault/server.
- **Suara tidak menyimpan otomatis.** Semua hasil adalah draf sampai dibacakan ulang dan
  dikonfirmasi persis "Apakah benar yang sudah dicatat?".
- **Suara bukan verifikasi.** Status obat tetap `'belum'` sampai Pemeriksaan Pendamping.
- **Jujur soal akurasi.** Whisper-base multilingual **lemah untuk dikte obat berbahasa Indonesia**
  (angka dan nama obat sering salah). UI wajib menyatakan ini, memakai alur tanya + pilihan
  tertutup + pembacaan ulang, dan tidak pernah mengklaim akurasi tinggi.

### 8B.2 `app/js/suara/adaptor.js` + `app/js/suara/mesin.js` — t18

```js
export const MESIN_SUARA = {
  offline: {
    id: 'offline', label: 'Offline (di perangkat)', lokal: true,
    butuhPersetujuan: false, enabled: true, bahasa: 'id-ID'
  },
  'web-speech': {
    id: 'web-speech',
    label: 'Bawaan peramban (audio dikirim ke pihak ketiga)',
    lokal: false, butuhPersetujuan: true, enabled: false, bahasa: 'id-ID'
  }
};

export const DISCLAIMERS_SUARA =
  'Aplikasi hanya mencatat apa yang Anda ucapkan. Pengenalan suara bisa salah, terutama angka dan nama obat. ' +
  'Periksa ulang bacaan aplikasi. Rekam Medisku bukan alat medis dan tidak menyarankan dosis.';

export class SuaraError extends Error {
  constructor(message, { code = 'SUARA_GAGAL', cause = null } = {}) { ... }
  // code: SUARA_TIDAK_TERSEDIA | MIKROFON_DITOLAK | SUARA_GAGAL | SUARA_TIMEOUT
  //     | SUARA_KOSONG | MESIN_TIDAK_DIKENAL | PERSETUJUAN_DIPERLUKAN
  //     | MODEL_TIDAK_TERSEDIA | TTS_TIDAK_TERSEDIA
  //     | ASR_TIDAK_TERDENGAR | ASR_TERLALU_LAMA | ASR_BERULANG
  //     | NAMA_TIDAK_VALID | TANYA_TIDAK_VALID | JAWABAN_TIDAK_DIKENAL
}

export function suaraTersedia(mesinId = 'offline')        // boolean
export function mesinAktif(settings)                      // -> 'offline' | 'web-speech'
export function createAdaptorSuara({
  mesin = 'offline',
  engineImpl = null,             // injeksi untuk test
  bahasa = 'id-ID',
  settings = null
} = {}) // -> AdaptorSuara

export async function kenaliSuara({
  mesin = 'offline',
  engineImpl = null,
  bahasa = 'id-ID',
  settings = null,
  onStatus = null,               // ({ status, mesin }) => void
  signal = null,
  timeoutMs = 20000,
  maksDurasiMs = MAKS_DURASI_REKAM_MS   // 8000; penjaga ASR
} = {}) // -> HasilSuara
```

`AdaptorSuara`:

```js
{
  id: 'offline' | 'web-speech',
  label, lokal,
  async mulai(),                 // minta mikrofon; gagal -> MIKROFON_DITOLAK
  async berhenti(),              // hentikan pendengaran + lepas mikrofon
  async kenali({ signal = null, onStatus = null } = {}) // -> { teks, kepercayaan, alternatif }
  async terminate()
}
```

`HasilSuara`:

```js
{
  teks: 'captopril dua belas koma lima miligram dua kali sehari setengah tablet sebelum makan',
  kepercayaan: 0.82,             // 0..1; engine 0..100 dinormalisasi /100
  mesin: 'offline',              // id mesin/engineImpl
  durasiMs: 1450,
  alternatif: [],                // string[] 0..3, boleh kosong
  peringatan: [DISCLAIMERS_SUARA] // web-speech menambah PERINGATAN_WEB_SPEECH
}
```

Aturan:
- `kenaliSuara` membuat adaptor, `mulai()`, `kenali()`, lalu `berhenti()` + `terminate()` di
  `finally`. Tidak menulis storage, tidak menyimpan audio, tidak memanggil jaringan.
- **Setiap hasil engine wajib melewati `periksaHasilAsr` (8B.11) sebelum dikembalikan.**
  `teks` kosong → `SUARA_KOSONG`; keluaran berulang/aneh/terlalu panjang → `ASR_TIDAK_TERDENGAR`
  (atau `ASR_BERULANG`); `durasiMs > maksDurasiMs + 500` → `ASR_TERLALU_LAMA`. Hasil yang ditolak
  **tidak boleh** di-parse atau disimpan; UI menampilkan "tidak terdengar" lalu mengulang.
- `engineImpl.recognize` menerima `{ bahasa, signal, onStatus, maksDurasiMs }` dan wajib berhenti
  merekam pada `maksDurasiMs`. Adaptor tetap memeriksa durasi sebagai lapisan kedua.
- `teks` kosong/whitespace → `SuaraError` code `SUARA_KOSONG`.
- `timeoutMs` habis → `SUARA_TIMEOUT`; `signal` abort → `SUARA_GAGAL`.
- `engineImpl` (fake) harus punya `{ id, lokal, async start(), async stop(), async recognize({ bahasa, signal, onStatus }) }`.
  Adaptor menormalisasi `teks`, `kepercayaan` (0..1), `alternatif`.
- Mesin `web-speech` tanpa persetujuan valid → `PERSETUJUAN_DIPERLUKAN` sebelum mikrofon diminta.
- `suaraTersedia('offline')` hanya memeriksa **kemampuan platform** (`WebAssembly`, `AudioContext`,
  `getUserMedia`). Kesiapan model diperiksa asinkron lewat `statusModel()` (8B.3) dan ditampilkan
  jujur di Pengaturan Suara; jangan mengklaim model siap sebelum manifest same-origin terbaca.
  `suaraTersedia('web-speech')` = `webSpeechTersedia() && persetujuan valid`.
  `MESIN_SUARA['web-speech'].enabled === false` **secara metadata**; status efektif dihitung
  `bolehPakaiWebSpeech(settings)`.
- `mesin.js` juga mengekspor `normalisasiPengaturanSuara(settings)` dan `pilihMesin(settings)`
  (fallback ke `'offline'` bila mesin tersimpan tidak tersedia/tidak disetujui).
- `DISCLAIMERS_SUARA` wajib ditampilkan di layar suara dan dibacakan pada bantuan.

### 8B.3 Mesin offline Whisper + vendor — `app/js/suara/whisperEngine.js`, `app/js/suara/offlineEngine.js`, `scripts/vendor-whisper.mjs` — t29/t28

Model: `Xenova/whisper-base` multilingual, quantized **q8**, lisensi **Apache-2.0**. Tidak ada model
Indonesia khusus; Whisper-base dipakai dengan `language:'indonesian'`. Kualitas untuk dikte obat
terbatas (lihat 8B.1); karena itu nama obat tidak pernah dari ASR bebas dan jawaban memakai
kosakata tertutup.

```js
export const WHISPER_VENDOR = {
  modulePath: '/vendor/suara/transformers/transformers.min.js',
  wasmPath: '/vendor/suara/onnx/',
  modelPath: '/vendor/suara/models/',
  manifestPath: '/vendor/suara/manifest.json'
};
export const WHISPER_MODEL_ID = 'Xenova/whisper-base';
export const WHISPER_SAMPLE_RATE = 16000;
export const WHISPER_DTYPE = { encoder_model: 'q8', decoder_model_merged: 'q8' };
export const WHISPER_LANGUAGE = 'indonesian';
export const STATUS_MODEL = { SIAP: 'siap', BELUM: 'belum', TIDAK_ADA: 'tidak-ada' };

export function whisperTersedia()          // boolean platform (WebAssembly, AudioContext, getUserMedia)
export async function statusModel({ fetchImpl = globalThis.fetch } = {})
// -> { status:'siap'|'belum'|'tidak-ada', modelId, bytes, files, engine, pesan }
export async function muatModel({
  modulePath = WHISPER_VENDOR.modulePath,
  wasmPath = WHISPER_VENDOR.wasmPath,
  modelPath = WHISPER_VENDOR.modelPath,
  onProgress = null,
  transformerModule = null                   // injeksi untuk test
} = {}) // -> { asr, dispose }
export async function transkripsi(audioFloat32, {
  asr, bahasa = WHISPER_LANGUAGE, maksToken = MAKS_TOKEN_KELUARAN, onStatus = null
} = {}) // -> { teks, kepercayaan, alternatif, durasiMs }
export async function createWhisperEngine({
  modulePath, wasmPath, modelPath, sampleRate = WHISPER_SAMPLE_RATE,
  maksDurasiMs = MAKS_DURASI_REKAM_MS
} = {}) // -> WhisperEngine (id 'offline', lokal true)
export const createOfflineEngine = createWhisperEngine;  // alias kompatibilitas
export const offlineTersedia = whisperTersedia;          // alias kompatibilitas
```

`WhisperEngine` memenuhi antarmuka engine 8B.2:

```js
{
  id: 'offline', lokal: true,
  async start(),     // getUserMedia mono 16 kHz; gagal -> MIKROFON_DITOLAK
  async stop(),      // hentikan perekaman + track.stop()
  async recognize({ bahasa = 'id-ID', signal = null, onStatus = null, maksDurasiMs = 8000 } = {})
  // -> { teks, kepercayaan:null, alternatif:[] }
  async terminate()  // stop + lepas AudioContext + dispose pipeline
}
```

Aturan engine:

- **Malas**: `import(modulePath)` same-origin dan `pipeline(...)` hanya saat `recognize` pertama.
  Tidak ada fallback ke CDN/host lain.
- Konfigurasi wajib sebelum pipeline dibuat: `env.allowRemoteModels = false`,
  `env.allowLocalModels = true`, `env.localModelPath = modelPath` (`/vendor/suara/models/`),
  `env.backends.onnx.wasm.wasmPaths = wasmPath` (`/vendor/suara/onnx/`),
  `env.backends.onnx.wasm.numThreads = 1`.
- Pipeline: `pipeline('automatic-speech-recognition', 'Xenova/whisper-base',
  { dtype: { encoder_model:'q8', decoder_model_merged:'q8' } })`. Model dimuat dari
  `/vendor/suara/models/Xenova/whisper-base/` dan tidak boleh memicu request keluar.
- Audio direkam via `AudioContext` + `MediaStreamAudioSourceNode` (mono 16 kHz) menjadi
  `Float32Array`. Rekaman **berhenti otomatis** pada `maksDurasiMs` (8000 ms) dan audio dibuang
  setelah dikenali. Tidak ada penyimpanan audio/transkrip.
- `transkripsi` memanggil `asr(audio, { language:'indonesian', task:'transcribe',
  max_new_tokens: MAKS_TOKEN_KELUARAN })`; hasil berulang/aneh tetap ditolak penjaga ASR (8B.11).
  `kepercayaan` selalu `null` (pipeline Whisper tidak memberi confidence per kalimat); adaptor
  mengisi `0` dan menambah peringatan "Kepercayaan mesin tidak tersedia".
- `statusModel()` hanya membaca `/vendor/suara/manifest.json` same-origin, lalu memeriksa
  `engine === 'whisper'`, `model.id`, dan keberadaan 12 berkas model di `files[]`. Tidak memuat
  model dan tidak mengunduh. Manifest hilang/rusak → `'tidak-ada'`; manifest ada tetapi model
  belum lengkap → `'belum'`; lengkap → `'siap'`.
- Bila model/WASM tidak ada → `MODEL_TIDAK_TERSEDIA`; jangan mencoba jaringan. Muat pertama dari
  disk ± 1 detik; inferensi lebih lambat daripada mesin peramban.
- `offlineEngine.js` adalah **alias tipis** yang mengekspor ulang semua ekspor `whisperEngine.js`
  (termasuk `createOfflineEngine`/`offlineTersedia`) agar impor lama tetap jalan. Tidak ada
  implementasi ASR kedua dan tidak ada nama model lama di berkas ini.

#### Berkas model wajib (12) di `public/vendor/suara/`

Semua dari `https://huggingface.co/Xenova/whisper-base/resolve/main/` (host unduhan yang diizinkan:
`huggingface.co`, `us.aws.cdn.hf.co`), lisensi Apache-2.0:

| Path relatif terhadap `models/Xenova/whisper-base/` | Ukuran |
|---|---|
| `config.json` | kecil |
| `generation_config.json` | kecil |
| `preprocessor_config.json` | kecil |
| `tokenizer.json` | ± 2 MB |
| `tokenizer_config.json` | kecil |
| `vocab.json` | kecil |
| `merges.txt` | kecil |
| `normalizer.json` | kecil |
| `added_tokens.json` | kecil |
| `special_tokens_map.json` | kecil |
| `onnx/encoder_model_quantized.onnx` | 23,2 MB |
| `onnx/decoder_model_merged_quantized.onnx` | 53,7 MB |

Total ± 80 MB. Tidak boleh ada berkas placeholder (`.gitkeep`, teks "PLACEHOLDER", berkas 0 byte).

`scripts/vendor-whisper.mjs` (pola sama dengan `vendor-ocr.mjs`):

1. Resolve `@huggingface/transformers/package.json` dari `node_modules`; versi wajib `4.3.2`.
   Tidak ada → cetak `npm install`, exit 1. Salin `dist/transformers.min.js` (atau
   `dist/transformers.js` bila versi min tidak ada) ke `public/vendor/suara/transformers/`.
2. Salin ONNX Runtime WASM dari `node_modules/onnxruntime-web/dist/` ke
   `public/vendor/suara/onnx/`: wajib `ort-wasm-simd-threaded.wasm` dan
   `ort-wasm-simd-threaded.mjs`; salin juga varian `.jsep.*` bila ada. Tidak ada → exit 1 dengan
   pesan jelas.
3. Model: bila `WHISPER_MODEL_SOURCE` ada dan berisi 12 berkas, salin dari sana. Selain itu, bila
   `WHISPER_ALLOW_DOWNLOAD=1`, unduh **saat vendoring** dari `WHISPER_MODEL_BASE_URL`; setiap URL
   dan URL akhir setelah redirect wajib berhost `huggingface.co` atau `us.aws.cdn.hf.co`.
   `WHISPER_ALLOW_DOWNLOAD=0` dan sumber lokal tidak ada → exit 1. Jangan pernah mengunduh saat
   runtime.
4. Bersihkan `public/vendor/suara/` dari artefak ASR lama/asing sebelum menulis (folder model
   lama, skrip model, dan berkas placeholder), lalu tulis 12 berkas model ke
   `public/vendor/suara/models/Xenova/whisper-base/`.
5. Hitung `bytes` + `sha256` setiap berkas; tolak berkas 0 byte atau ukuran `.onnx` yang tidak
   wajar (< 1 MB). Tulis `public/vendor/suara/manifest.json`:

```json
{
  "generatedAt": "2026-11-09T10:00:00.000Z",
  "engine": "whisper",
  "license": "Apache-2.0",
  "packages": { "@huggingface/transformers": "4.3.2" },
  "model": {
    "id": "Xenova/whisper-base",
    "quantization": "q8",
    "sampleRate": 16000,
    "language": "indonesian",
    "bytes": 76900000,
    "source": "build-time-only"
  },
  "entry": {
    "module": "/vendor/suara/transformers/transformers.min.js",
    "wasmPath": "/vendor/suara/onnx/",
    "modelPath": "/vendor/suara/models/",
    "modelId": "Xenova/whisper-base"
  },
  "files": [
    { "path": "models/Xenova/whisper-base/config.json", "bytes": 1234, "sha256": "..." },
    { "path": "models/Xenova/whisper-base/onnx/encoder_model_quantized.onnx", "bytes": 23200000, "sha256": "..." }
  ],
  "runtimeExternalRequests": 0
}
```

6. Verifikasi akhir: `entry.module`, dua WASM, dan **semua 12** berkas model ada dan non-kosong;
   `files.length >= 15` (12 model + module + 2 WASM); tidak ada string `PLACEHOLDER` di manifest.
   Idempoten: jalankan ulang menghasilkan manifest setara dan tidak menyisakan berkas asing.
7. `app/sw.js` menambahkan modul suara baru (`whisperEngine.js`, `penjagaAsr.js`,
   `alurTanya.js`, `ttsTanya.js`, `logic/kosakataTertutup.js`, `logic/pencocokJawaban.js`,
   `logic/tanyaSatuPerSatu.js`, `logic/pemilihNamaObat.js`, layar `tanya-suara.js`,
   `pemilih-nama-obat.js`) ke `PRECACHE`. `/vendor/suara/*` tetap **runtime cache** cache-first;
   jangan precache ± 80 MB saat install.

### 8B.4 Mesin Web Speech + persetujuan — `app/js/suara/webSpeech.js`, `persetujuan.js` — t19

```js
export const WEB_SPEECH_LANG = 'id-ID';
export const WEB_SPEECH_CONSENT_VERSION = 'web-speech-v1';
export const PERINGATAN_WEB_SPEECH =
  'Mesin bawaan peramban mengirim rekaman suara Anda ke layanan pihak ketiga (di Chrome, audio ' +
  'diproses Google). Rekam Medisku tidak menyimpan audio, tetapi pengiriman ini di luar kendali ' +
  'aplikasi dan dapat memuat data kesehatan Anda. Aktifkan hanya jika Anda setuju.';

export function webSpeechTersedia()       // boolean
export function buatWebSpeechEngine({
  SpeechRecognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition,
  lang = WEB_SPEECH_LANG
} = {}) // -> engine | null
```

`webSpeech.js`:
- Bila API tidak ada → `webSpeechTersedia()` false, `buatWebSpeechEngine()` null; UI wajib
  **menyembunyikan** opsi dengan pesan "Pengenalan suara bawaan peramban tidak tersedia."
- Engine memakai `recognition.lang = 'id-ID'`, `interimResults = false`, `maxAlternatives = 3`,
  `continuous = false`. Satu ucapan per `recognize`.
- Error `not-allowed`/`service-not-allowed` → `MIKROFON_DITOLAK`; `no-speech` → `SUARA_KOSONG`;
  lainnya → `SUARA_GAGAL`. Tidak menyimpan transkrip/audio.

`persetujuan.js`:
```js
export function statusPersetujuan(settings)   // -> { diberikan, diberikanPada, versi, berlaku }
export function bolehPakaiWebSpeech(settings) // -> boolean (API ada + persetujuan versi berlaku)
export async function berikanPersetujuan(state, {
  now = new Date(), versi = WEB_SPEECH_CONSENT_VERSION, aktifkan = true
} = {}) // -> settings.suara baru
export async function cabutPersetujuan(state, { now = new Date() } = {}) // -> settings.suara baru
export function normalisasiPengaturanSuara(settings)
```
- `berikanPersetujuan` menulis `settings.suara.webSpeechPersetujuan = { diberikan:true,
  diberikanPada: ISO, versi }` dan (bila `aktifkan`) `mesin:'web-speech'` lewat `state.setSettings`.
  Tidak boleh dipanggil tanpa aksi eksplisit pengguna (checkbox + tombol).
- `cabutPersetujuan` mengosongkan persetujuan dan memaksa `mesin:'offline'`; efek langsung.
- Persetujuan versi lama (`versi !== WEB_SPEECH_CONSENT_VERSION`) dianggap tidak berlaku dan UI
  harus meminta persetujuan ulang.
- Tidak ada persetujuan implisit dari memilih opsi; wajib checkbox peringatan + tombol setuju.
- `normalisasiPengaturanSuara` **tidak pernah** mengubah `mesin` menjadi `'web-speech'`.

### 8B.5 Pembaca ulang TTS — `app/js/suara/tts.js` — t21

```js
export const TTS_LANG = 'id-ID';
export function ttsTersedia()                  // boolean
export function pilihSuaraIndonesia(voices = []) // -> SpeechSynthesisVoice | null
export async function bacakan(teks, {
  lang = TTS_LANG, rate = 0.9, pitch = 1, voice = null,
  signal = null, onStart = null, onEnd = null
} = {}) // -> { selesai: boolean, dibatalkan: boolean }
export function hentikanBacaan()
export function teksUlangObat(obat)
export function teksUlangVital(vital)
export function teksUlangMinum(dose)
export function teksUlangJadwal(doses, { statusPemeriksaan = null } = {})
```

Aturan:
- `bacakan` membatalkan ucapan sebelumnya (`speechSynthesis.cancel()`), memilih suara `id-ID` bila
  ada, dan resolve setelah `onend`. `signal` abort / `cancel()` → `{ selesai:false, dibatalkan:true }`.
  `speechSynthesis` tidak ada → `TTS_TIDAK_TERSEDIA` (UI menampilkan teks sebagai gantinya dan
  tetap mewajibkan tombol konfirmasi).
- **Tidak ada TTS saat mikrofon mendengarkan.** Pemanggil wajib `adaptor.berhenti()` sebelum
  `bacakan` dan `adaptor.mulai()` setelah selesai.
- `teksUlangObat` membacakan **semua** yang akan disimpan: nama, kekuatan/dosis, frekuensi,
  takaran + satuan, aturan makan, jam, hari minum, tanggal mulai/selesai, durasi, stok (bila
  diisi), catatan, dan status pemeriksaan. Contoh:
  `"Captopril, dua belas koma lima miligram, dua kali sehari, setengah tablet, sebelum makan. Status: belum diperiksa pendamping atau apoteker."`
- `teksUlangVital`: label jenis, nilai (tensi "seratus empat puluh per sembilan puluh"), satuan,
  tanggal/jam, dan catatan. `teksUlangMinum`: nama obat, jam, dan status pemeriksaan.
- `teksUlangJadwal`: untuk setiap dosis hari ini sebutkan jam, nama, dosis, dan status
  pemeriksaan; bila kosong ucapkan "Tidak ada jadwal obat hari ini."
- Semua angka diucapkan dengan `ucapkanAngka` (8B.7) agar konsisten; tidak ada klaim medis.

### 8B.6 Konfirmasi ya/tidak — `app/js/logic/konfirmasiSuara.js` (murni) + `app/js/suara/konfirmasi.js` — t21

`konfirmasiSuara.js` **bebas DOM, tanpa timer, deterministik**, diuji `node:test`.

```js
export const PERTANYAAN_KONFIRMASI = 'Apakah benar yang sudah dicatat?';
export const MAKS_PERTANYAAN_ULANG = 2;

export function klasifikasiJawaban(teks)   // -> 'ya' | 'tidak' | 'lain'
export function buatSesiKonfirmasi({ ringkasan, maksUlang = MAKS_PERTANYAAN_ULANG } = {}) // -> Sesi
export function jawabKonfirmasi(sesi, teks) // -> { sesi, aksi, ucapan }
```

`Sesi`:
```js
{
  ringkasan: 'Captopril 12,5 mg, 2 kali sehari...',
  pertanyaan: 'Apakah benar yang sudah dicatat?',
  status: 'menunggu' | 'selesai-simpan' | 'selesai-ulangi' | 'selesai-batal',
  maksUlang: 2,
  jumlahTanyaUlang: 0,
  jawabanTerakhir: null,       // string mentah | null
  riwayat: []                  // [{ jawaban, klasifikasi, aksi }]
}
```

`klasifikasiJawaban`:
- Normalisasi NFKC + lowercase + buang tanda baca/spasi berlebih.
- `'ya'`: `ya`, `iya`, `benar`, `betul`, `benar sekali`, `ya benar`, `sudah benar`, `ok`, `oke`.
- `'tidak'`: `tidak`, `nggak`, `enggak`, `gak`, `bukan`, `salah`, `tidak benar`, `keliru`, `no`.
- Selain itu (termasuk kosong) → `'lain'`. Kecocokan **seluruh ucapan**, bukan substring
  ("saya tidak yakin" = `'lain'`, bukan `'tidak'`).

`jawabKonfirmasi` (deterministik):
| Kondisi | `aksi` | `status` baru | `ucapan` |
|---------|--------|---------------|----------|
| status bukan `'menunggu'` | `'tidak-berlaku'` | tetap | `''` |
| `'ya'` | `'simpan'` | `selesai-simpan` | `'Baik, saya simpan.'` |
| `'tidak'` | `'ulangi-entri'` | `selesai-ulangi` | `'Baik, tidak saya simpan. Silakan ulangi.'` |
| `'lain'` dan `jumlahTanyaUlang < maksUlang` | `'tanya-ulang'` | `menunggu` | `PERTANYAAN_KONFIRMASI` |
| `'lain'` dan `jumlahTanyaUlang >= maksUlang` | `'batal'` | `selesai-batal` | `'Saya tidak menyimpan karena tidak ada jawaban yang jelas.'` |

- Setiap `'lain'` menaikkan `jumlahTanyaUlang`; `'ya'`/`'tidak'` tidak.
- `riwayat` mencatat setiap jawaban; objek asli tidak dimutasi.
- Tidak ada efek samping; penyimpanan dilakukan UI hanya saat `aksi === 'simpan'`.

`suara/konfirmasi.js` (integrasi, boleh DOM):
```js
export async function jalankanKonfirmasiSuara({
  adaptor, tts, ringkasan, onTanya = null, signal = null,
  maksUlang = MAKS_PERTANYAAN_ULANG
} = {}) // -> { keputusan: 'simpan'|'batal'|'ulangi-entri', jawabanTerakhir, jumlahTanyaUlang, sesi }
```
- Sebelum setiap TTS: `await adaptor.berhenti()` (wajib, agar suara aplikasi tidak dianggap
  jawaban). Setelah TTS: `await adaptor.mulai()` / `adaptor.kenali()` lagi.
- TTS membacakan `ringkasan` lengkap lalu `PERTANYAAN_KONFIRMASI`; ulangi pertanyaan sesuai
  `jawabKonfirmasi`. Maksimum 2 pertanyaan ulang; `'tidak'` langsung `'ulangi-entri'`.
- Tombol besar `#btn-konfirmasi-ya` / `#btn-konfirmasi-tidak` memanggil mesin yang sama dengan
  `'ya'`/`'tidak'` (tanpa mikrofon), sehingga keyboard/pembaca layar setara.
- Tidak ada penyimpanan di fungsi ini; `keputusan` diserahkan ke layar.

### 8B.7 Parser ucapan angka & satuan Indonesia — `logic/ucapanAngka.js`, `ucapanObat.js`, `ucapanVital.js` — t17

Semua fungsi murni, deterministik, tanpa DOM/AI/dependency. Angka dari ucapan **selalu** diurai
deterministik dan diteruskan ke penerjemah resep/pagar yang ada; tidak menebak yang tidak diucapkan.

#### 8B.7.1 `ucapanAngka.js`

```js
export const KATA_ANGKA = { nol:0, satu:1, dua:2, tiga:3, empat:4, lima:5, enam:6, tujuh:7,
  delapan:8, sembilan:9, sepuluh:10, sebelas:11, seratus:100, seribu:1000, setengah:0.5,
  seperempat:0.25, seperdua:0.5 };

export function normalisasiUcapan(teks)     // NFKC, lowercase, rapikan spasi/tanda baca
export function ucapkanKeAngka(frasa)       // -> number|null
export function ucapkanAngka(nilai)         // -> string Indonesia ('dua belas koma lima')
export function parseAngkaDalamTeks(teks)   // -> { nilai, teksAsli, awal, akhir } | null
export function parseDeretAngka(teks)       // -> number[]
```

Aturan `ucapkanKeAngka` (contoh wajib):
- `setengah` → 0.5; `seperempat` → 0.25; `dua setengah` → 2.5; `satu koma lima` → 1.5;
  `nol koma lima` → 0.5; `dua belas koma lima` → 12.5; `seratus empat puluh` → 140;
  `sembilan puluh` → 90; `seratus empat puluh per sembilan puluh` → `[140, 90]` lewat
  `parseDeretAngka`.
- Satuan `belas` (11–19), `puluh` (20–99), `ratus` (100–999), `ribu` (≥1000), `koma` desimal.
- Menerima digit (`140`, `12,5`, `12.5`) dan campuran (`dua belas koma 5`).
- Frasa tidak lengkap/ambigu → `null` (jangan menebak).
- `ucapkanAngka` dipakai TTS: `12.5` → `'dua belas koma lima'` (bukan "dua belas titik lima").

#### 8B.7.2 `ucapanObat.js`

> **Status:** `parseDikteObat`/`dikteKeObat` adalah jalur **legacy/opsional**. Sejak revisi ini,
> jalur obat utama memakai tanya satu per satu (8B.12–8B.15). Nama obat hasil `dikteKeObat`
> **tidak boleh** dipakai otomatis; hanya boleh menjadi kandidat yang harus dipilih lewat 8B.14.

```js
export const PAGAR_TAKARAN_MAKS = 4;      // tablet/kapsul per dosis
export const PAGAR_FREKUENSI_MAKS = 8;    // kali sehari

export function pagarKewajaranDosis({ takaranPerDosis = null, kaliSehari = null,
  satuanTakaran = null } = {})
// -> { ok: boolean, kode: null|'TAKARAN_TIDAK_WAJAR'|'FREKUENSI_TIDAK_WAJAR', pesan: string }

export function parseDikteObat(teks)       // -> DikteObat | null
export function dikteKeTeksResep(teks)     // -> { resepTeks, ...DikteObat } | null
export function dikteKeObat(teks, { now = new Date(), profileId = null } = {})
// -> { obat, hasilResep, pagar, teksAsli, bagianTidakDipahami, peringatan, isMedicalAdvice:false } | null
```

`DikteObat`:
```js
{
  nama: 'Captopril',
  kekuatan: { nilai: 12.5, satuan: 'mg', teks: '12,5 mg' } | null,
  kaliSehari: 2 | null,
  takaranPerDosis: 0.5 | null,
  satuanTakaran: 'tablet' | 'kapsul' | 'ml' | 'tetes' | 'sendok teh' | null,
  aturanMakan: 'sebelum' | 'sesudah' | 'saat' | 'bila-perlu' | null,
  jadwalJam: ['07:00','19:00'],
  resepTeks: 'Captopril 12.5 mg 2 x 0.5 tablet sebelum makan',
  ucapanAsli: 'Captopril dua belas koma lima miligram, dua kali sehari, setengah tablet, sebelum makan',
  bagianTidakDipahami: []
}
```

Aturan:
- Kenali frekuensi ucapan: `sekali sehari`→1, `dua kali sehari`→2, `tiga kali sehari`→3,
  `empat kali sehari`→4, `setiap hari`→1; `setengah tablet`→0.5 tablet; `dua setengah tablet`→2.5.
- Kenali satuan: `miligram|mg`→mg, `mikrogram|mcg`→mcg, `gram`→g, `mililiter|ml`→ml,
  `tablet`, `kapsul`, `sendok teh`, `tetes`.
- Kenali aturan makan: `sebelum makan`→sebelum, `sesudah/setelah makan`→sesudah,
  `saat makan`→saat, `bila perlu`→bila-perlu.
- `dikteKeTeksResep` menyusun teks kanonik yang **dapat dibaca `kenaliResep`** (pemisah spasi,
  desimal titik). Untuk takaran pecahan wajib memakai pola yang dikenali parser resep, mis.
  `2 x 0.5 tablet` (bukan `2 kali sehari` yang membuat takaran default 1). Lalu panggil parser
  yang sudah ada. `dikteKeObat` mengembalikan
  `ObatTerjemahan` hasil `kenaliResep` (bukan parser kedua), dengan `jadwalJam` dari
  `jadwalUntukObat`.
- **Pagar wajib**: sebelum UI boleh menyimpan, `pagarKewajaranDosis` dipanggil dengan nilai hasil
  parse. Bila `takaranPerDosis > 4` (tablet/kapsul) → `ok:false`, `TAKARAN_TIDAK_WAJAR`;
  bila `kaliSehari > 8` → `ok:false`, `FREKUENSI_TIDAK_WAJAR`. UI wajib menolak simpan otomatis,
  menandai field, dan meminta penyuntingan manual + Pemeriksaan Pendamping. Pagar yang sama
  berlaku untuk jalur teks resep pada layar suara; tidak ada pengecualian "karena suara".
- Tidak adanya angka → `null`, bukan 0. Nama obat hasil parse hanyalah kandidat; **UI dilarang
  langsung memakainya** sebagai nama obat (lihat 8B.14).
- Tidak ada diagnosis/saran dosis; `isMedicalAdvice:false`.

#### 8B.7.3 `ucapanVital.js`

```js
export function parseDikteVital(teks) // -> DikteVital | null
```

`DikteVital`:
```js
{
  jenis: 'tension'|'glucose'|'weight'|'temperature'|'pulse'|'spo2',
  values: { systolic: 140, diastolic: 90 },   // atau { value: 180 }
  unit: 'mmHg',
  teksAsli: 'tensi seratus empat puluh per sembilan puluh',
  bagianTidakDipahami: [],
  peringatan: []
}
```

Contoh wajib: `"tensi seratus empat puluh per sembilan puluh"` → tension 140/90;
`"tekanan darah seratus lima puluh per sembilan puluh lima"` → 150/95;
`"gula darah seratus delapan puluh"` → glucose 180 mg/dL;
`"berat badan tujuh puluh dua koma lima kilo"` → weight 72.5 kg;
`"suhu tiga puluh tujuh koma lima derajat"` → temperature 37.5 °C;
`"nadi delapan puluh"` → pulse 80 bpm; `"saturasi sembilan puluh delapan persen"` → spo2 98 %.
- Hanya jenis di atas; kalimat lain → `null`.
- Tidak menilai normal/tinggi dan tidak mendiagnosis; penanda rentang tetap tugas modul safety.

#### 8B.7.4 Korpus uji 40+ — `tests/fixtures/ucapan-cases.js`, `tests/ucapan.test.js` — t17

Setiap kasus:
```js
{ id: 'u01', jenis: 'angka'|'obat'|'vital', ucapan: '...', harapan: { /* field parsial */ } }
```
Minimal 40 kasus mencakup: angka 0–20, puluhan, ratusan, `koma`, `setengah`, `dua setengah`,
`seperempat`, tensi `per`, semua jenis vital, 10+ dikte obat (kekuatan mg/mcg/g/ml, frekuensi
1–4, takaran 0.5/1/1.5/2.5, aturan makan, tablet/kapsul/sendok teh/tetes), dikte tanpa angka,
dan kasus pagar (`>4 tablet`, `>8 kali`) yang wajib `ok:false`. Test memverifikasi determinisme,
`dikteKeObat` menghasilkan `ObatTerjemahan` dari `kenaliResep`, dan TTS `ucapkanAngka`.

### 8B.8 Perintah navigasi suara — `logic/perintahNavigasi.js`, `suara/navigasiSuara.js` — t23

```js
export const PERINTAH_NAVIGASI = [
  { id:'obat',      frasa:['buka obat','daftar obat','obat'],                 route:'#/obat' },
  { id:'ringkasan', frasa:['ringkasan dokter','buka ringkasan'],              route:'#/ringkasan' },
  { id:'darurat',   frasa:['kartu darurat','darurat'],                        route:'#/darurat' },
  { id:'beranda',   frasa:['beranda','halaman utama','pulang'],               route:'#/' },
  { id:'isi-suara', frasa:['isi dengan suara','catat obat','catat vital','sudah minum'], route:'#/suara' },
  { id:'pemeriksaan', frasa:['pemeriksaan pendamping','periksa obat'],        route:'#/pemeriksaan' },
  { id:'pengaturan-suara', frasa:['pengaturan suara','pilih suara'],          route:'#/suara/pengaturan' },
  { id:'bantuan',   frasa:['bantuan','tolong','apa yang bisa saya katakan'],  route:'#/bantuan-suara' },
  { id:'berhenti',  frasa:['berhenti','diam','batal'],                        action:'berhenti' }
];

export function normalisasiPerintah(teks)
export function kenaliPerintah(teks) // -> { id, frasa, route, action, skor } | null
export function daftarBantuan()      // -> string[] kalimat perintah + arti
export function teksBantuan()        // -> string untuk TTS
export function createNavigasiSuara({ adaptor, navigate, tts = null, umumkan = null } = {})
export async function jalankanPerintahSuara({ adaptor, navigate, tts = null, umumkan = null } = {})
```

- Pencocokan deterministik: normalisasi NFKC/lowercase/tanda baca; cocok persis frasa dulu, lalu
  kemiripan token (Jaccard) ≥ 0.6. Skor tertinggi menang; seri/ambigu → `null` (minta ulang).
  Tidak ada model bahasa/AI/nilai acak.
- `createNavigasiSuara` mengembalikan `{ async dengarkanSekali(), async mulai(), async berhenti(), async terminate() }`.
  `dengarkanSekali` memanggil `kenaliSuara` (atau adaptor yang diberikan), mengumumkan hasil,
  lalu `navigate(route)` atau aksi `berhenti`.
- Perintah `bantuan` membacakan `teksBantuan()` via TTS dan juga menampilkan teks.
- Tidak boleh ada perintah medis ("berapa dosis saya", "obat apa untuk..."); perintah tak dikenal
  dijawab "Perintah tidak dikenali. Ucapkan bantuan untuk daftar perintah." dan tidak memicu aksi.
- Mikrofon berhenti sebelum TTS dan tidak mendengarkan selama aplikasi berbicara.

### 8B.9 Model + layar Pemeriksaan Pendamping — `logic/pemeriksaan.js`, `suara/penandaPemeriksaan.js` (t24); `ui/pemeriksaan.js`, `ui/status-pemeriksaan.js` (t25)

`logic/pemeriksaan.js` (murni):
```js
export const PEMERIKSAAN_STATUS = ['belum','sudah'];
export const PERNYATAAN_PEMERIKSAAN =
  'Saya, pendamping/apoteker yang disebutkan, sudah memeriksa obat ini terhadap resep asli dan menyatakan data ini benar.';
export const LABEL_BELUM_DIPERIKSA = 'Belum diperiksa pendamping/apoteker';

export function defaultPemeriksaan()                       // -> { status:'belum', ... }
export function normalisasiPemeriksaan(nilai)              // invalid -> default; tidak pernah 'sudah' tanpa oleh+waktu+pernyataan
export function pastikanPemeriksaan(item)                  // -> salinan item dengan field default
export function tandaiBelumDiperiksa(item, { sumber = 'belum-diperiksa', waktu = null } = {})
export function tandaiSudahDiperiksa(item, { oleh, waktu = new Date(), pernyataan } = {})
export function butuhPemeriksaan(item)                     // -> boolean
export function labelPemeriksaan(item)                     // -> string tampil/dibacakan
export function ringkasPemeriksaan(items)                  // -> { total, belum, sudah, teks }
export function teksPemeriksaanUntukDibacakan(item)        // -> string
```

Aturan:
- `tandaiSudahDiperiksa` melempar `Error` code `PEMERIKSAAN_TIDAK_VALID` bila `oleh` kosong setelah
  trim, `waktu` bukan ISO valid, atau `pernyataan !== PERNYATAAN_PEMERIKSAAN`. Tidak ada jalur lain.
- `tandaiBelumDiperiksa` mengosongkan `oleh`/`waktu`/`pernyataan` dan mencatat `sumber`.
- `normalisasiPemeriksaan`: status selain `'sudah'` → `'belum'`; `'sudah'` tanpa oleh/waktu/
  pernyataan valid → `'belum'`. Tidak pernah "menaikkan" status.
- `labelPemeriksaan` mengembalikan `LABEL_BELUM_DIPERIKSA` atau
  `'Sudah diperiksa oleh <oleh> pada <waktu>'`; `ringkasPemeriksaan.teks` dipakai live region.
- Entri suara **wajib** `tandaiBelumDiperiksa(med, { sumber:'belum-diperiksa' })` dan
  `dibuatDengan:'suara'`/`dikonfirmasiDengan:'suara'` sebelum `state.upsert`.
- Jangan pernah memakai kata "terverifikasi" untuk status suara/OCR; gunakan "diperiksa".

`suara/penandaPemeriksaan.js`:
```js
export function penandaPemeriksaan(item)
  // -> { status, label, kelas: 'badge-pemeriksaan-belum'|'badge-pemeriksaan-sudah',
  //      ariaLabel, butuhPemeriksaan: boolean }
export function teksPemeriksaanJadwal(dose, medication)
  // -> 'Status obat <nama>: belum diperiksa pendamping atau apoteker.'
export function ringkasPenanda(items) // -> { total, belum, sudah, teks, ariaLabel }
```
Semua layar yang menampilkan obat (daftar obat, pengingat hari ini, ringkasan dokter, Isi dengan
Suara, Pemeriksaan) **wajib** memakai `penandaPemeriksaan` dan menampilkan labelnya sebagai teks
(bukan warna saja). `teksUlangJadwal` memakai `teksPemeriksaanJadwal` sehingga status ikut
dibacakan.

Layar Pemeriksaan: lihat 9.4.11. Perubahan status hanya lewat `state.upsert('medications', item)`
setelah `tandaiSudahDiperiksa` berhasil.

### 8B.10 Pengaturan Suara — `ui/suara-pengaturan.js` — t18/t32

IDs dan perilaku di 9.4.9. Ringkasan:
- Default `mesin:'offline'`; opsi offline selalu tampil.
- Status model **jujur** dari `statusModel()` (8B.3): `'siap'` / `'belum'` / `'tidak-ada'` +
  perkiraan ukuran ± 80 MB. Bila belum/tidak ada, tampilkan cara menjalankan
  `npm run vendor:whisper`; jangan pernah menawarkan unduhan runtime.
- Peringatan tetap: offline **lebih lambat dan kurang akurat** untuk dikte obat; alur tanya,
  pilihan tertutup, dan pembacaan ulang wajib dipakai. Jangan mengklaim akurasi tinggi.
- Opsi web-speech: **disembunyikan** bila API tidak ada (dengan pesan `#suara-tidak-tersedia`),
  atau butuh checkbox peringatan `#suara-setuju-checkbox` + `#btn-suara-setuju`.
- Setelah disetujui: `#suara-persetujuan-status` menampilkan waktu + versi; `#btn-suara-cabut`
  selalu tersedia dan langsung memaksa offline.
- TTS dan kecepatan dapat diatur; perubahan disimpan via `state.setSettings` tanpa reload.
- Tidak ada request apa pun hanya karena membuka layar ini; `statusModel()` hanya membaca manifest
  same-origin dan tidak memuat model.

### 8B.11 Penjaga ASR — `app/js/suara/penjagaAsr.js` — t29

Modul **murni, bebas DOM, tanpa timer/dependency**, diuji `node:test`. Semua hasil mesin (Whisper
maupun Web Speech) melewati modul ini sebelum di-parse.

```js
export const MAKS_DURASI_REKAM_MS = 8000;
export const TOLERANSI_DURASI_MS = 500;
export const MAKS_TOKEN_KELUARAN = 48;
export const MAKS_KARAKTER = 240;
export const RASIO_HURUF_MIN = 0.55;
export const PENGULANGAN_MAKS = 3;

export function periksaDurasi(durasiMs, { maksMs = MAKS_DURASI_REKAM_MS } = {})
// -> { ok, kode: null|'ASR_TERLALU_LAMA', pesan }
export function deteksiPengulangan(teks, { maks = PENGULANGAN_MAKS } = {})
// -> { berulang, pola, jumlah }
export function periksaKeluaranAsr(teks, {
  maksToken = MAKS_TOKEN_KELUARAN, maksKarakter = MAKS_KARAKTER
} = {}) // -> { ok, kode, alasan, teksBersih }
export function periksaHasilAsr(hasil, {
  maksDurasiMs = MAKS_DURASI_REKAM_MS, maksToken = MAKS_TOKEN_KELUARAN
} = {}) // -> { ok, kode, alasan, hasil }
export function ringkasTolakAsr(kode) // -> pesan Indonesia untuk UI/TTS
```

Aturan (deterministik):

1. Normalisasi NFKC, rapikan spasi, buang spasi di ujung. `teksBersih` dipakai jika lolos.
2. Kosong/whitespace → `ASR_TIDAK_TERDENGAR`, alasan `kosong`.
3. `durasiMs > maksDurasiMs + 500` → `ASR_TERLALU_LAMA`, alasan `durasi`.
4. `teks.length > 240` atau jumlah token whitespace > `MAKS_TOKEN_KELUARAN` (48) →
   `ASR_TIDAK_TERDENGAR`, alasan `terlalu-panjang`.
5. **Pengulangan**: token yang sama berulang ≥ 4 kali berturut-turut, atau pola panjang 1–8
   karakter berulang ≥ 4 kali berturut-turut → `ASR_BERULANG`. Wajib menolak keluaran palsu
   `'2.2.2.2.2.2.2.2'` dan `'bla bla bla bla bla'`.
6. **Rasio huruf**: untuk teks ≥ 8 karakter, `huruf / (huruf + digit + tanda baca)` < 0.55 →
   `ASR_TIDAK_TERDENGAR`, alasan `bukan-kata`. Pengecualian: teks ≤ 3 karakter yang seluruhnya
   digit (jawaban angka pendek) diterima.
7. Teks yang lolos dikembalikan apa adanya di `teksBersih`; modul **tidak** memperbaiki/menebak
   kata dan **tidak** memanggil parser.
8. `periksaHasilAsr` menjalankan (3) lalu (2/4/5/6) dan mengembalikan `{ ok:false, kode, alasan,
   hasil:null }`; pemanggil **wajib** memperlakukan ini sebagai "tidak terdengar" (ulangi
   pertanyaan atau tampilkan tombol), bukan sebagai jawaban.
9. `ringkasTolakAsr`: `ASR_TERLALU_LAMA` → "Rekaman terlalu lama. Jawab singkat, maksimal delapan
   detik."; `ASR_BERULANG`/lain → "Tidak terdengar dengan jelas. Silakan ulangi atau pilih tombol."

### 8B.12 Kosakata tertutup + pencocok jawaban — `logic/kosakataTertutup.js`, `logic/pencocokJawaban.js` — t30

Kedua modul **murni, deterministik, bebas DOM/model bahasa/AI**. Tidak ada tebakan bebas: hanya
nilai dalam kosakata tertutup yang boleh dihasilkan.

#### 8B.12.1 `kosakataTertutup.js`

```js
export const PERTANYAAN_TANYA = {
  frekuensi: {
    id: 'frekuensi', tipe: 'pilihan', pertanyaan: 'Berapa kali sehari?',
    pilihan: [1,2,3,4,5,6,7,8],
    label: { 1:'1 kali', 2:'2 kali', 3:'3 kali', 4:'4 kali',
             5:'5 kali', 6:'6 kali', 7:'7 kali', 8:'8 kali' },
    sinonim: {
      1:['sekali','satu kali','1 kali','sehari sekali','sekali sehari'],
      2:['dua kali','2 kali','dua kali sehari','dua kalisahari','duakali'],
      3:['tiga kali','3 kali','tiga kali sehari'],
      4:['empat kali','4 kali','empat kali sehari'],
      5:['lima kali','5 kali','lima kali sehari'],
      6:['enam kali','6 kali','enam kali sehari'],
      7:['tujuh kali','7 kali','tujuh kali sehari'],
      8:['delapan kali','8 kali','delapan kali sehari']
    }
  },
  takaran: {
    id: 'takaran', tipe: 'pilihan', pertanyaan: 'Berapa tablet sekali minum?',
    pilihan: [0.5,1,1.5,2,2.5,3,3.5,4],
    label: { 0.5:'setengah tablet', 1:'satu tablet', 1.5:'satu setengah tablet',
             2:'dua tablet', 2.5:'dua setengah tablet', 3:'tiga tablet',
             3.5:'tiga setengah tablet', 4:'empat tablet' },
    sinonim: {
      0.5:['setengah','setengah tablet','separuh','0,5 tablet','0.5 tablet'],
      1:['satu','satu tablet','1 tablet','sebutir'],
      1.5:['satu setengah','satu setengah tablet','1,5 tablet','1.5 tablet'],
      2:['dua','dua tablet','2 tablet'],
      2.5:['dua setengah','dua setengah tablet','dua koma lima','2,5 tablet','2.5 tablet'],
      3:['tiga','tiga tablet','3 tablet'],
      3.5:['tiga setengah','tiga setengah tablet','3,5 tablet','3.5 tablet'],
      4:['empat','empat tablet','4 tablet']
    }
  },
  aturanMakan: {
    id: 'aturanMakan', tipe: 'pilihan', pertanyaan: 'Sebelum, sesudah, atau saat makan?',
    pilihan: ['sebelum','sesudah','saat'],
    label: { sebelum:'sebelum makan', sesudah:'sesudah makan', saat:'saat makan' },
    sinonim: {
      sebelum:['sebelum','sebelum makan','sebelumnya','semelum','sebelom'],
      sesudah:['sesudah','sesudah makan','setelah','setelah makan','habis makan'],
      saat:['saat','saat makan','bersama makan','sambil makan','waktu makan']
    }
  },
  waktu: {
    id: 'waktu', tipe: 'multi', pertanyaan: 'Pagi, siang, sore, malam, atau sebelum tidur?',
    pilihan: ['pagi','siang','sore','malam','sebelum-tidur'],
    label: { pagi:'pagi', siang:'siang', sore:'sore', malam:'malam',
             'sebelum-tidur':'sebelum tidur' },
    sinonim: {
      pagi:['pagi','pagi hari','waktu pagi'],
      siang:['siang','siang hari','tengah hari'],
      sore:['sore','sore hari','petang'],
      malam:['malam','malam hari'],
      'sebelum-tidur':['sebelum tidur','sebelum bobo','sebelum istirahat','mau tidur']
    }
  },
  bilaPerlu: {
    id: 'bilaPerlu', tipe: 'ya-tidak', pertanyaan: 'Hanya kalau perlu?',
    pilihan: [true,false],
    label: { true:'Ya, hanya kalau perlu', false:'Tidak, rutin' },
    sinonim: {
      true:['ya','iya','benar','perlu','kalau perlu','bila perlu','hanya kalau perlu','prn'],
      false:['tidak','nggak','enggak','gak','tidak perlu','tidak rutin','rutin','setiap hari']
    }
  }
};
export const URUTAN_PERTANYAAN = ['frekuensi','takaran','aturanMakan','waktu','bilaPerlu'];

export function pertanyaanUntuk(id)       // -> definisi atau null
export function pilihanUntuk(id)          // -> array nilai
export function labelPilihan(id, nilai)   // -> label Indonesia
export function semuaNilai(id)            // -> array nilai valid
```

- Pertanyaan dan pilihan **persis** di atas; TTS membacakan `pertanyaan` lalu label pilihan.
- `waktu` satu-satunya langkah `multi`; jawaban boleh satu atau beberapa nilai, tanpa duplikat.
- Tidak ada pilihan "lain", "bebas", atau angka di luar daftar.

#### 8B.12.2 `pencocokJawaban.js`

```js
export const AMBANG_COCOK = 0.72;
export const MARGIN_AMBIGU = 0.08;

export function normalisasiJawaban(teks)   // NFKC, lowercase, buang tanda baca, rapikan spasi
export function jarakEdit(a, b)            // Levenshtein bilangan bulat
export function kodeFonetis(teks)          // normalisasi fonetis sederhana (lihat aturan)
export function skorKemiripan(a, b)        // 0..1
export function cocokkanJawaban(teks, pertanyaanId, {
  ambang = AMBANG_COCOK, margin = MARGIN_AMBIGU
} = {}) // -> HasilCocok
export function cocokkanBanyak(teks, pertanyaanId, opsi = {}) // -> HasilCocok (untuk 'waktu')
```

`HasilCocok`:
```js
{
  status: 'cocok' | 'ambigu' | 'tidak-cocok',
  nilai: 2 | 0.5 | 'sebelum' | ['pagi','malam'] | true | null,
  pilihan: [...],                 // 0..3 kandidat teratas { nilai, label, skor }
  skor: 0.94,                     // skor kandidat teratas | 0
  kandidat: [{ nilai, label, skor }],
  alasan: 'sinonim'|'angka'|'kemiripan'|'ambigu'|'di-bawah-ambang'|'kosong'
}
```

Aturan pencocokan:

1. Normalisasi; kosong → `tidak-cocok` alasan `kosong`. **Jangan pernah** mengembalikan nilai
   default saat kosong.
2. Cocok persis dengan sinonim/label → skor `1`, status `cocok`, alasan `sinonim`.
3. Angka: untuk `frekuensi`/`takaran`, pakai `ucapkanKeAngka`/`parseAngkaDalamTeks` (8B.7.1);
   nilai yang persis ada di `pilihan` → `cocok`, alasan `angka`. Contoh:
   `'dua kali sehari'`/`'Dua Kalisahari'` → `2`; `'setengah'` → `0.5`;
   `'satu setengah'`/`'1,5'` → `1.5`; `'dua koma lima'` → `2.5`.
4. Kemiripan: bandingkan teks ternormalisasi dengan setiap sinonim/label memakai
   `skorKemiripan = max(1 - jarakEdit(a,b)/max(len), 1 - jarakEdit(fon(a),fon(b))/max(len))`.
   `kodeFonetis`: lowercase, buang non-huruf/angka, `ph→f`, `v→f`, `sy→s`, `kh→k`, `dj→j`,
   `tj→c`, `oe→u`, lalu hapus spasi dan huruf kembar. Contoh wajib: `'Semelum'` → `sebelum`
   (skor ≥ 0.8); `'Kalisahari'` setelah normalisasi tanpa spasi cocok dengan `kali sehari`.
5. Kandidat teratas < `AMBANG_COCOK` → `tidak-cocok`, alasan `di-bawah-ambang`. Wajib:
   `'sahurabla'` → `tidak-cocok` untuk **semua** pertanyaan.
6. Bila dua nilai berbeda memiliki skor ≥ ambang dan selisih skor teratas < `MARGIN_AMBIGU` →
   `ambigu`, `nilai:null`; UI mengulang pertanyaan (maks. 2) lalu menampilkan tombol.
7. **Larangan memaksa**: jawaban yang relevan untuk pertanyaan lain tidak boleh dipetakan.
   Contoh wajib: `'pagi'` untuk `frekuensi` → `tidak-cocok`; `'dua kali sehari'` untuk
   `aturanMakan` → `tidak-cocok`; `'sesudah makan'` untuk `takaran` → `tidak-cocok`.
8. `cocokkanBanyak` memecah jawaban pada `,`, `dan`, `serta`, `&`; setiap potongan harus cocok
   dengan nilai `waktu` yang berbeda. Semua cocok → `cocok` dengan array terurut sesuai
   `pilihan`; ada `ambigu` → `ambigu`; ada `tidak-cocok` → `tidak-cocok`. Contoh:
   `'pagi dan malam'` → `['pagi','malam']`; `'sebelum tidur'` → `['sebelum-tidur']`.
9. Deterministik: input sama → keluaran sama; tanpa `Math.random`, tanpa model, tanpa jaringan.

#### 8B.12.3 Korpus minimum (diuji t34)

`tests/fixtures/tanya-cases.js` berisi **minimal 60** jawaban realistis, termasuk varian salah
dengar Whisper, contoh wajib: `'Dua Kalisahari'`→frekuensi 2, `'Semelum'`→sebelum,
`'sahurabla'`→tidak-cocok, `'dua kali sehari'` vs `'2 kali'`, `'setengah'`/`'satu setengah'`,
`'pagi dan malam'`, `'sebelum tidur'`, `'kalau perlu'`/`'tidak perlu'`, serta minimal 8 kasus
negatif lintas-pertanyaan dan 4 kasus ambigu. Test juga memastikan pencocok tidak pernah
mengembalikan nilai di luar `pilihan`.

### 8B.13 Mesin keadaan tanya satu per satu — `logic/tanyaSatuPerSatu.js` — t31

**Murni, deterministik, bebas DOM/timer/jaringan.** Tidak memanggil ASR/TTS/state; UI/orkestrator
yang melakukannya. Sesi tidak pernah disimpan ke storage.

```js
export const LANGKAH_TANYA = ['nama','frekuensi','takaran','aturanMakan','waktu','bilaPerlu','konfirmasi','selesai'];
export const MAKS_GAGAL_PAHAM = 2;

export function buatSesiTanya({ profileId = null, sumberNama = null, nama = null,
  now = new Date() } = {}) // -> SesiTanya
export function pertanyaanSaatIni(sesi) // -> PertanyaanAktif
export function jawabTanya(sesi, teks, { sumber = 'suara' } = {}) // -> HasilLangkah
export function pilihJawabanTombol(sesi, nilai)       // -> HasilLangkah (tanpa ASR)
export function ketikJawaban(sesi, teks)              // -> HasilLangkah (tanpa ASR)
export function lanjutKeKonfirmasi(sesi)              // -> HasilLangkah
export function ringkasSesi(sesi)                     // -> string untuk TTS/konfirmasi
export function bangunMedicationDariSesi(sesi, { now = new Date(), profileId = null } = {})
// -> Medication (bentuk di 8B.15)
export function selesaikanSesi(sesi, { simpan = false, now = new Date() } = {})
// -> { sesi, medication: Medication|null, aksi }
```

`SesiTanya`:
```js
{
  id: 'tny_xxx', profileId,
  langkah: 'nama'|'frekuensi'|'takaran'|'aturanMakan'|'waktu'|'bilaPerlu'|'konfirmasi'|'selesai',
  status: 'aktif'|'selesai'|'batal',
  nama: null, sumberNama: null,       // 'daftar'|'pindai'|'ketik'|'ejaan'
  jawaban: { frekuensi:null, takaran:null, aturanMakan:null, waktu:[], bilaPerlu:null },
  gagalPaham: { frekuensi:0, takaran:0, aturanMakan:0, waktu:0, bilaPerlu:0 },
  modeTombol: false,
  riwayat: [{ langkah, teks, status, nilai, waktu }],
  dibuatPada: ISO
}
```

`HasilLangkah`:
```js
{
  sesi,                                  // sesi baru; objek lama tidak dimutasi
  aksi: 'terima'|'ulangi'|'tombol'|'konfirmasi'|'selesai'|'batal'|'tidak-berlaku'
       |'tolak-nama-dari-suara',
  pertanyaan: PertanyaanAktif|null,
  ucapan: string,                        // teks yang harus dibacakan TTS (boleh '')
  error: null | { code, pesan }
}
```

Aturan:

1. **Langkah `nama` tidak menerima ASR bebas.** `jawabTanya(sesi, teks, {sumber:'suara'})` pada
   langkah ini mengembalikan `aksi:'tolak-nama-dari-suara'`, `error.code:'NAMA_TIDAK_VALID'`,
   `ucapan:'Nama obat tidak bisa dari suara bebas. Pilih dari daftar, ketik, atau eja.'`, dan
   **tidak** mengubah `nama`. Nama hanya masuk lewat `pilihJawabanTombol`/`ketikJawaban` dari
   `pemilihNamaObat` (8B.14) atau `namaAwal` yang sudah dikonfirmasi.
2. Nama divalidasi `validasiNamaObat` (8B.14); gagal → error `NAMA_TIDAK_VALID`, tetap di langkah
   `nama`.
3. Langkah tertutup memakai `cocokkanJawaban`/`cocokkanBanyak` (8B.12). `cocok` → nilai disimpan,
   `gagalPaham[langkah] = 0`, maju ke langkah berikutnya, `aksi:'terima'`.
4. `ambigu`/`tidak-cocok` → `gagalPaham[langkah] += 1` (maksimum 2):
   - percobaan gagal ke-1 → `aksi:'ulangi'`, `ucapan` = pertanyaan persis lagi;
   - percobaan gagal ke-2 → `aksi:'tombol'`, `modeTombol:true`, `bolehTombol:true`,
     `bolehKetik:true`, `ucapan` = pertanyaan + `'Silakan pilih tombol atau ketik jawaban.'`;
   - setelah `modeTombol`, kegagalan ASR berikutnya tetap `aksi:'tombol'` tanpa menambah counter
     dan tanpa mengulang TTS berkali-kali. **Tidak boleh** memaksa cocok.
5. `pilihJawabanTombol(sesi, nilai)` dan `ketikJawaban(sesi, teks)` memakai validasi yang sama
   tetapi **selalu** menerima nilai persis dari kosakata (tombol) atau hasil pencocokan ketikan;
   nilai di luar `pilihan` → `error.code:'TANYA_TIDAK_VALID'`.
6. `waktu`: nilai boleh array; simpan terurut sesuai `PERTANYAAN_TANYA.waktu.pilihan`, tanpa
   duplikat. Bila `bilaPerlu:true`, jawaban waktu tetap dicatat untuk ringkasan, tetapi jadwal
   akhir `times` menjadi `[]` (lihat 8B.15).
7. Setelah `bilaPerlu` terjawab, `lanjutKeKonfirmasi` mengembalikan `aksi:'konfirmasi'`,
   `pertanyaan.pertanyaan === PERTANYAAN_KONFIRMASI` (8B.6). Tidak ada penyimpanan di sini.
8. `ringkasSesi` membacakan **semua** yang akan disimpan: nama, takaran + "tablet", frekuensi,
   aturan makan, waktu, dan "hanya kalau perlu: ya/tidak", lalu status
   `'Belum diperiksa pendamping/apoteker'`. Angka memakai `ucapkanAngka`.
9. `selesaikanSesi(sesi,{simpan:true})` hanya bila semua langkah terjawab; mengembalikan
   `medication` dari `bangunMedicationDariSesi` (diekspor modul ini; bentuk di 8B.15).
   `simpan:false` → `medication:null`, `aksi:'batal'`. Tidak pernah menyimpan sendiri.
10. Pagar wajib: `lanjutKeKonfirmasi`/`selesaikanSesi` memanggil `pagarKewajaranDosis` dengan
    `takaranPerDosis`/`kaliSehari`/`satuanTakaran:'tablet'`; `ok:false` →
    `TANYA_TIDAK_VALID`, tidak boleh lanjut/simpan. Kosakata tertutup sudah membatasi 1–8 kali
    dan 0,5–4 tablet, tetapi pagar tetap dijalankan.

### 8B.14 Pemilih nama obat — `logic/pemilihNamaObat.js` — t31

**Murni, bebas DOM/ASR.** Nama obat hanya berasal dari empat sumber tertutup; teks bebas ASR
tidak pernah menjadi nama.

```js
export const SUMBER_NAMA_OBAT = ['daftar','pindai','ketik','ejaan'];
export const HURUF_EJAAN = 'abcdefghijklmnopqrstuvwxyz0123456789- ';
export const NAMA_HURUF = { a:'a', be:'b', ce:'c', de:'d', e:'e', ef:'f', ge:'g',
  ha:'h', i:'i', je:'j', ka:'k', el:'l', em:'m', en:'n', o:'o', pe:'p',
  ki:'q', er:'r', es:'s', te:'t', u:'u', ve:'v', we:'w', eks:'x', ye:'y', zet:'z' };
export const PERTANYAAN_EJAAN = 'Apakah nama obatnya '; // + nama + '?'

export function validasiNamaObat(nama) // -> { ok, nama, kode:null|'NAMA_TIDAK_VALID', pesan }
export function daftarNamaDariObat(medications = []) // -> string[] unik, urut abjad
export function daftarNamaDariPindai(hasilPindai = []) // -> string[] unik, urut abjad
export function bacaSatuPerSatu(namaList = []) // -> [{ nama, pertanyaan:'<nama>? ya atau tidak' }]
export function cocokkanYaTidak(teks) // -> 'ya'|'tidak'|'lain' (pakai klasifikasiJawaban)
export function buatSesiNama({ sumber = null, kandidat = [] } = {}) // -> SesiNama
export function pilihNama(sesi, { sumber, nama = null, medications = [], hasilPindai = [] } = {})
export function jawabNama(sesi, teks)     // ya/tidak untuk daftar/pindai; lain -> ulangi
export function ketikNama(sesi, teks)     // hanya teks ketikan/pasta; validasi
export function mulaiEjaan(sesi)
export function tambahHuruf(sesi, teks)   // satu huruf/nama huruf; closed alphabet
export function hapusHuruf(sesi)
export function selesaiEjaan(sesi)        // -> menunggu konfirmasi ejaan
export function konfirmasiEjaan(sesi, teks) // ya -> nama final; tidak -> reset ejaan
```

`SesiNama`:
```js
{
  sumber: null|'daftar'|'pindai'|'ketik'|'ejaan',
  kandidat: [], indeks: 0,
  nama: null, ejaan: '',
  status: 'memilih'|'menunggu-konfirmasi-ejaan'|'selesai'|'batal',
  jumlahTanyaUlang: 0,
  riwayat: []
}
```

Aturan:

1. `daftarNamaDariObat` mengembalikan nama unik dari `state.getState().medications` profil aktif;
   `daftarNamaDariPindai` dari hasil `kenaliResep`/scan review. Tidak ada nama dari ASR bebas.
2. `bacaSatuPerSatu` menghasilkan pertanyaan persis `'<nama>? ya atau tidak'`; TTS dibacakan
   `ttsTanya.teksNamaDariDaftar`. `jawabNama` memakai `klasifikasiJawaban` (8B.6): `'ya'` →
   `selesai`; `'tidak'` → kandidat berikutnya; `'lain'` diulang maks. 2 lalu mode tombol/ketik.
   Bila kandidat habis → `status:'batal'`, pesan "Nama tidak ditemukan. Ketik atau eja nama obat."
3. `ketikNama` hanya menerima teks yang **diketik/ditempel** oleh pendamping. Parameter ini tidak
   boleh diisi dari `kenaliSuara`; UI wajib memakai `<input>`/`<textarea>`.
4. Ejaan: `mulaiEjaan` → `sumber:'ejaan'`, `ejaan:''`. `tambahHuruf` menerima satu huruf
   (`'b'`) atau nama huruf (`'be'`) dari `NAMA_HURUF`; normalisasi lowercase; selain itu →
   `error.code:'NAMA_TIDAK_VALID'`, minta ulang huruf. `hapusHuruf` menghapus karakter terakhir.
5. `selesaiEjaan` → `status:'menunggu-konfirmasi-ejaan'` dan pertanyaan
   `'Apakah nama obatnya <nama>?'`. `konfirmasiEjaan('ya')` → `selesai`, nama final;
   `'tidak'` → reset `ejaan`, kembali `memilih`; `'lain'` diulang maks. 2 lalu tombol.
6. `validasiNamaObat`: trim, 2–80 karakter, minimal 2 huruf, tidak boleh hanya angka/tanda baca,
   tanpa karakter kontrol. Nama final **wajib** lolos sebelum masuk `tanyaSatuPerSatu`.
7. Modul tidak memanggil ASR/TTS/state dan tidak menyimpan apa pun.

### 8B.15 Orkestrasi tanya + TTS — `app/js/suara/alurTanya.js`, `app/js/suara/ttsTanya.js` — t33

`ttsTanya.js`:
```js
export const PERTANYAAN_TANYA_TEKS = {
  frekuensi: 'Berapa kali sehari?',
  takaran: 'Berapa tablet sekali minum?',
  aturanMakan: 'Sebelum, sesudah, atau saat makan?',
  waktu: 'Pagi, siang, sore, malam, atau sebelum tidur?',
  bilaPerlu: 'Hanya kalau perlu?'
};
export function teksPertanyaan(id, sesi = null) // -> string persis
export function teksPilihan(id)                 // -> 'Satu kali, dua kali, ...'
export function teksNamaDariDaftar(nama)        // -> '<nama>? ya atau tidak'
export function teksEjaan(teks)                 // -> 'B, e, t, a, ...' / 'B satu dua'
export function teksKonfirmasiTanya(ringkasan)  // -> ringkasan + ' ' + PERTANYAAN_KONFIRMASI
export async function bacakanPertanyaan(tts, id, sesi = null, { signal = null } = {})
```

- `bacakanPertanyaan` memakai `bacakan` (8B.5) dan `hentikanBacaan`; bila TTS tidak tersedia
  (atau `settings.suara.tts === false`), mengembalikan `{ selesai:false, dibatalkan:false }` dan
  UI wajib menampilkan pertanyaan sebagai teks + tombol.
- Pertanyaan **persis** seperti konstanta; jangan menambah kalimat yang mengubah arti.
- TTS tidak boleh berbunyi saat mikrofon mendengarkan; orkestrator menghentikan adaptor dulu.

`alurTanya.js`:
```js
export async function jalankanTanyaSatuPerSatu({
  adaptor, tts = null, state = null, profileId = null,
  sumberNama = 'daftar', namaAwal = null,
  onPertanyaan = null, onHasil = null, onStatus = null, onTolakAsr = null,
  signal = null, maksDurasiMs = MAKS_DURASI_REKAM_MS
} = {}) // -> { keputusan:'simpan'|'batal'|'ulangi', sesi, medication, jawabanTerakhir }
```

`alurTanya.js` memakai `bangunMedicationDariSesi` dari `logic/tanyaSatuPerSatu.js` (t31); boleh
mengekspor ulang untuk kenyamanan, tetapi implementasinya tetap di modul logika agar tidak ada
impor melingkar.

Alur wajib:

1. **Nama**: bila `namaAwal` belum ada, jangan meminta ASR bebas. Layar menampilkan pilihan
   sumber (daftar/pindai/ketik/ejaan) dari `pemilihNamaObat`; nama final divalidasi, lalu sesi
   `tanyaSatuPerSatu` dibuat dengan `nama`/`sumberNama`.
2. Untuk setiap langkah `frekuensi`→`bilaPerlu`: `await adaptor.berhenti()`; bacakan pertanyaan
   (TTS) — atau tampilkan teks bila TTS mati; `await adaptor.mulai()`; `kenaliSuara({adaptor?,
   maksDurasiMs})` diperlakukan sebagai **satu jawaban**; guard 8B.11 sudah menolak keluaran
   buruk. Lalu `jawabTanya(sesi, hasil.teks)`.
3. `aksi:'ulangi'` → ulangi pertanyaan yang sama. `aksi:'tombol'` → hentikan mikrofon, tampilkan
   tombol pilihan (48 px) + isian ketik; jawaban tombol/ketikan memakai
   `pilihJawabanTombol`/`ketikJawaban`. Jangan mengulang ASR tanpa batas.
4. Bila `kenaliSuara` melempar `ASR_TIDAK_TERDENGAR`/`ASR_BERULANG`/`ASR_TERLALU_LAMA`/`SUARA_KOSONG`/
   `SUARA_TIMEOUT`, perlakukan sebagai satu kegagalan paham (`onTolakAsr`, lalu ulangi/tombol).
   Jangan mem-parse pesan error sebagai jawaban.
5. Setelah lima jawaban: `lanjutKeKonfirmasi`; hentikan mikrofon; bacakan `ringkasSesi` +
   `PERTANYAAN_KONFIRMASI`; dengarkan atau pakai tombol besar. Gunakan
   `jalankanKonfirmasiSuara`/`jawabKonfirmasi` (8B.6). `'simpan'` → `selesaikanSesi(sesi,
   {simpan:true})`; `'ulangi-entri'` → `keputusan:'ulangi'` tanpa menyimpan; 2 jawaban tidak jelas
   → `'batal'`.
6. Hanya pada `keputusan:'simpan'`: `medication` dibangun `bangunMedicationDariSesi` dan ditulis
   dengan `state.upsert('medications', medication)`. Tidak ada penulisan sebelum itu. Jangan
   menyimpan sesi/jawaban parsial ke storage.
7. `onPertanyaan(pertanyaanAktif)`, `onHasil(hasilLangkah)`, `onStatus({status, langkah, sesi})`
   dipanggil untuk UI; semua opsional. `signal` abort → `keputusan:'batal'`, sesi dibuang.
8. Tidak ada audio/transkrip yang disimpan; tidak ada request jaringan.

`bangunMedicationDariSesi` (di `logic/tanyaSatuPerSatu.js`) menghasilkan **tepat** bentuk berikut
(field lain mengikuti 4.2/4.4):

```js
{
  id: 'med_xxx', profileId,
  name: sesi.nama,                       // hanya dari 8B.14
  activeIngredient: '', dose: '', doseUnit: '',
  instructions: '2 kali sehari, sesudah makan, pagi dan malam', // + ', hanya kalau perlu'
  times: sesi.jawaban.bilaPerlu ? [] : petaWaktu(sesi.jawaban.waktu),
  daysOfWeek: [0,1,2,3,4,5,6],
  startDate: 'YYYY-MM-DD', endDate: null,
  stock: { remaining: null, unit: 'tablet', unitsPerDose: sesi.jawaban.takaran },
  refillReminderDays: 3, active: true, notes: '',
  source: null,
  dibuatDengan: 'suara', dikonfirmasiDengan: 'suara',
  pemeriksaanOrangLain: defaultPemeriksaan(),   // status 'belum', sumber 'belum-diperiksa'
  createdAt: ISO, updatedAt: ISO
}
```

- `petaWaktu`: `pagi→'07:00'`, `siang→'13:00'`, `sore→'17:00'`, `malam→'19:00'`,
  `sebelum-tidur→'21:00'`; unik dan terurut. Bila bukan "bila perlu" dan `waktu` kosong (tidak
  seharusnya terjadi), pakai `jadwalBawaan(sesi.jawaban.frekuensi)` dari `logic/resepJadwal.js`.
- `dose`/`doseUnit` sengaja kosong karena alur tanya tidak menanyakan kekuatan; pendamping dapat
  menyuntingnya nanti di Pemeriksaan Pendamping. Jangan mengarang kekuatan dari nama.
- `pemeriksaanOrangLain` **wajib** `status:'belum'`; suara tidak pernah menaikkannya.
- `verifiedByUser` tidak diisi; `source:null` karena tidak ada foto resep.

### 8B.16 Aturan lintas modul alur tanya

- Tidak ada jalur yang mengubah teks ASR bebas menjadi `name`, `dose`, atau `doseUnit`.
- Pencocok yang mengembalikan `ambigu`/`tidak-cocok` **tidak boleh** dipaksa oleh UI; UI hanya
  boleh menampilkan ulang pertanyaan (maks. 2) lalu tombol/ketikan.
- Semua pertanyaan, pilihan, dan pesan yang dibacakan berasal dari konstanta kontrak; jangan
  mengarang pertanyaan medis atau saran dosis.
- Tombol dan ketikan setara dengan suara: setiap langkah dapat diselesaikan tanpa mikrofon.
- Pembacaan ulang dan konfirmasi "Apakah benar yang sudah dicatat?" wajib; tidak ada simpan
  otomatis.
- Semua entri berakhir `pemeriksaanOrangLain.status === 'belum'`; Pemeriksaan Pendamping
  satu-satunya jalur perubahan (8B.9).

---

## 9. Lapisan UI

### 9.1 Aturan umum

- Semua layar mengekspor `export async function render(root, ctx)` dan **wajib** mengosongkan
  `root` lalu membuat satu elemen root `<section id="screen-<nama>">`.
- `render` boleh mengembalikan fungsi cleanup (opsional).
- Jangan memakai `innerHTML` untuk data pengguna. Pakai `dom.h`/`textContent`. Pengecualian:
  string SVG grafik/QR yang dihasilkan modul internal dan sudah di-escape.
- Setelah mutasi state: `await ctx.state....(); ctx.toast('...'); await ctx.refresh();`
- Jangan menyimpan data medis di variabel global/localStorage/sessionStorage. Draf pindai hanya
  di memori lewat `scanSession.js` dan dibuang saat batal/simpan/reload.
- Semua `addEventListener` dibersihkan oleh cleanup bila mendaftarkan listener pada `window`,
  `document`, kamera, atau timer. Listener pada elemen yang dibuang tidak perlu.
- Form harus memakai `<label for>`, pesan error `role="alert"`, `required` bila wajib.
  Semua submit handler memanggil `event.preventDefault()`.
- Tanggal memakai `<input type="date">`, jam `<input type="time">`.
- **Tidak ada auto-save** pada layar pindai/tinjau. Tombol simpan nonaktif sampai verifikasi.

### 9.2 `app/js/dom.js` — t4

```js
export function h(tag, props = {}, ...children)
export function qs(selector, root = document)
export function qsa(selector, root = document)
export function clear(node)
export function on(node, event, handler, options)   // -> unsubscribe function
export function escapeHtml(value)                    // & < > " '
export function setText(node, text)
export function fragment(...children)                // DocumentFragment
```

`h` tidak boleh memakai `innerHTML`. Atribut boolean (`disabled`, `checked`, `required`, `hidden`)
diset sebagai properti. `on` memasang `addEventListener` dan mengembalikan fungsi pelepas.

### 9.3 `app/js/app.js` — t4

```js
export const ROUTES = {
  '#/':          { title: 'Beranda',                 module: './ui/dashboard.js' },
  '#/profil':    { title: 'Profil',                  module: './ui/profile.js' },
  '#/kunjungan': { title: 'Kunjungan',               module: './ui/visits.js' },
  '#/obat':      { title: 'Obat',                    module: './ui/meds.js' },
  '#/vital':     { title: 'Vital & Lab',             module: './ui/vitals.js' },
  '#/pindai':    { title: 'Pindai Dokumen',          module: './ui/scan.js' },
  '#/tinjau':    { title: 'Tinjau Hasil Pindai',      module: './ui/scan-review.js' },
  '#/darurat':   { title: 'Kartu Darurat',           module: './ui/emergency.js' },
  '#/ringkasan': { title: 'Ringkasan Dokter',        module: './ui/report.js' },
  '#/pengaturan':{ title: 'Pengaturan',              module: './ui/settings.js' },
  '#/kunci':     { title: 'Terkunci',                module: './ui/lock.js' },
  '#/suara':     { title: 'Isi dengan Suara',         module: './ui/isi-suara.js' },
  '#/suara/tanya':      { title: 'Tanya Obat Satu per Satu', module: './ui/tanya-suara.js' },
  '#/suara/pengaturan': { title: 'Pengaturan Suara',  module: './ui/suara-pengaturan.js' },
  '#/bantuan-suara':    { title: 'Bantuan Suara',     module: './ui/bantuan-suara.js' },
  '#/pemeriksaan':      { title: 'Pemeriksaan Pendamping', module: './ui/pemeriksaan.js' }
};

export async function boot()
export function navigate(hash)          // set location.hash
export async function renderRoute()     // dipakai internal + refresh
export function currentRoute()          // '#/...' ternormalisasi
```

Perilaku `boot()`:

1. `storage = createStorage()`, `state = createState({ storage })`; `await state.init()`.
2. Pasang handler `hashchange`, klik nav, profile switcher, tombol kunci, menu "Lainnya",
   registrasi service worker (`navigator.serviceWorker.register('./sw.js')`, gagal senyap).
3. Terapkan `settings.fontLarge` → `document.documentElement.classList.toggle('is-large-text', bool)`;
   `settings.highContrast` → `document.documentElement.dataset.contrast = bool ? 'high' : 'normal'`.
4. Bila `state.isLocked()`: paksa `#/kunci`, tambah `document.body.classList.add('is-locked')`,
   sembunyikan header/nav/footer lewat CSS. Setelah unlock sukses: hapus class, `navigate('#/')`.
5. Bila tidak terkunci: render route hash saat ini (default `#/`). `renderRoute` selalu
   menyinkronkan `body.is-locked`; bila hash `#/kunci` saat terbuka → arahkan ke `#/`.
6. `state.subscribe` memperbarui header (nama profil, opsi switcher, tombol kunci) dan status
   terkunci saja, **tidak** me-render ulang layar (agar input form tidak hilang).
7. Error tak terduga saat render: tampilkan `<section id="screen-error">` dengan
   `#fatal-error` dan `#btn-fatal-reload`. Jangan menampilkan stack trace.

`ctx` yang diberikan ke setiap layar:

```js
{
  state,                    // instance createState
  profile,                  // profil aktif saat render
  now: () => new Date(),    // jam injectable (default new Date())
  navigate(hash),
  toast(message, tone = 'info'),   // tone: 'info' | 'success' | 'error'
  confirm(message),         // -> boolean (window.confirm)
  refresh()                 // -> Promise<void> render ulang route aktif
}
```

Header/nav shell:

- `#app-header`: brand `Rekam Medisku` (tautan `#/`), `<select id="profile-switcher">`, tombol
  `#btn-lock` (hanya tampil bila `state.isEncrypted()`).
- `#app-nav`: tautan `#nav-home`, `#nav-meds`, `#nav-visits`, `#nav-vitals`, tombol `#btn-more`.
- `#more-menu` (dialog) berisi tautan `#more-scan`, `#more-profile`, `#more-emergency`,
  `#more-report`, `#more-settings`, tombol `#btn-close-more`.
- `#toast-region` (`role="status" aria-live="polite"`), toast hilang otomatis ± 4 detik.
- `#app-disclaimer` berisi `DISCLAIMERS.app`; `#footer-emergency` berisi tautan `tel:112` dan
  `tel:119`.
- Tombol kunci: `await state.lock(); document.body.classList.add('is-locked'); navigate('#/kunci'); renderRoute()`.
- Lock route: `ctx.state` terkunci; hanya `lock.js` yang dirender.

### 9.4 Kontrak layar

Setiap layar mendapat `root` = `#app-view` yang sudah dikosongkan. ID root dan ID kontrol:

#### `ui/dashboard.js` (t5) — `#screen-dashboard`
IDs: `#dash-greeting`, `#dash-profile-summary`, `#dash-today-list`, `#dash-adherence`,
`#dash-adherence-chart`, `#dash-vitals`, `#dash-refills`, `#dash-quick-scan`,
`#dash-quick-emergency`, `#dash-quick-report`.
`#dash-quick-scan` adalah tautan/tombol ke `#/pindai` dengan label "Pindai Resep / Rekam Medis".
Tombol dosis: `[data-action="take-dose"]` / `[data-action="skip-dose"]` dengan
`data-medication-id`, `data-date`, `data-time`. Panggil `state.logDose(...)`.
Gunakan `buildBarChartSVG` untuk `#dash-adherence-chart`. Sorot dosis jatuh tempo bila
`settings.reminders` aktif (pending, `scheduledAt <= now`, selisih ≤ 180 menit) dengan kelas
`is-due` dan teks "Waktunya".

#### `ui/profile.js` (t5) — `#screen-profile`
Form profil aktif + daftar keluarga.
IDs: `#profile-family-list`, `#btn-add-profile`, `#profile-form`, `#profile-name`,
`#profile-birth`, `#profile-sex`, `#profile-blood`, `#profile-allergies`, `#profile-chronic`,
`#profile-contact-name`, `#profile-contact-relation`, `#profile-contact-phone`,
`#profile-doctor-name`, `#profile-doctor-facility`, `#profile-doctor-phone`, `#profile-notes`,
`#btn-save-profile`, `#btn-delete-profile`, `#profile-form-error`, `#profile-family-list`.
Keluarga: tombol `[data-action="switch-profile"]` (`data-profile-id`), `[data-action="delete-profile"]`
dengan konfirmasi. Alergi/penyakit diisi textarea dipisah koma atau baris baru. Simpan kontak
darurat pertama (array tetap didukung). Hapus profil terakhir ditolak state (`PROFIL_TERAKHIR`).

#### `ui/settings.js` (t5) — `#screen-settings`
IDs: `#settings-form`, `#settings-large-text`, `#settings-contrast`, `#settings-reminders`,
`#storage-info`, `#backup-form`, `#export-password`, `#btn-export`, `#import-file`,
`#import-password`, `#btn-import`, `#backup-status`, `#security-form`, `#password-new`,
`#password-confirm`, `#btn-save-password`, `#btn-remove-password`, `#password-warning`,
`#security-status`, `#btn-reset`.
- Toggle langsung memanggil `state.setSettings`, terapkan class, `ctx.toast`, tanpa full refresh.
- Ekspor: `state.exportBackup({password})` → `Blob([text])`, unduh via `<a download>`.
  Tampilkan `DISCLAIMERS.photo` bahwa foto sumber tidak ikut.
- Impor: baca `File.text()`, konfirmasi ganti semua data, `state.importBackup`, tangani error kode.
- Kata sandi: konfirmasi dua field; `state.setPassword`; peringatan "lupa kata sandi = data tidak
  dapat dipulihkan" wajib terlihat. Hapus kata sandi → `state.removePassword`.
- Reset: konfirmasi ganda, `state.resetAll()`.

#### `ui/lock.js` (t5) — `#screen-lock`
IDs: `#screen-lock`, `#lock-form`, `#lock-password`, `#btn-unlock`, `#lock-error`,
`#lock-forgot-warning`.
`state.unlock(password)`; sukses → app.js memuat ulang route. Gagal → pesan dari `error.message`.
Tampilkan `DISCLAIMERS.privacy` dan peringatan lupa kata sandi.

#### `ui/visits.js` (t6) — `#screen-visits`
IDs: `#btn-new-visit`, `#visit-form`, `#visit-id`, `#visit-date`, `#visit-doctor`,
`#visit-facility`, `#visit-complaint`, `#visit-diagnosis`, `#visit-notes`, `#visit-file-input`,
`#visit-attachment-list`, `#btn-save-visit`, `#btn-cancel-visit`, `#visit-form-error`,
`#visit-timeline`, `#visit-count`.
- Label diagnosis: `Diagnosis (sesuai yang Anda tulis)` — bukan hasil aplikasi.
- Linimasa urut tanggal turun. Item: `[data-action="edit-visit"] [data-visit-id]`,
  `[data-action="delete-visit"]`.
- Lampiran memakai `attachments.js`; thumbnail `data:`; tautan unduh PDF; tombol
  `[data-action="remove-attachment"]`.
- `state.upsert('visits', item)` / `state.remove('visits', id)`.
- Bila `visit.source?.verifiedByUser`, tampilkan badge `Diverifikasi dari dokumen` dan, bila
  `photoId`, tautan `[data-action="view-source-photo"]` (`data-photo-id`) yang membuka foto via
  `state.getSourcePhoto`.

#### `ui/attachments.js` (t6)
```js
export const MAX_ATTACHMENT_BYTES = 1048576;
export const MAX_ATTACHMENTS_PER_VISIT = 10;
export const ALLOWED_ATTACHMENT_MIME = ['image/jpeg','image/png','image/webp','image/gif','application/pdf'];
export async function fileToAttachment(file, { maxBytes = MAX_ATTACHMENT_BYTES, maxDimension = 1600 } = {})
export function attachmentDataUrl(att)
export function attachmentBytes(att)
export function validateAttachment(att)
export function formatBytes(n)
```
- Baca via `FileReader`/`arrayBuffer`; tolak mime tak diizinkan dan file > `maxBytes`
  (gambar boleh dikecilkan via canvas; non-gambar ditolak).
- `size` = ukuran data base64 yang disimpan; maks. 1 MiB setelah kompresi.

#### `ui/meds.js` (t6) — `#screen-meds`
IDs: `#btn-new-med`, `#med-form`, `#med-id`, `#med-name`, `#med-ingredient`, `#med-dose`,
`#med-dose-unit`, `#med-instructions`, `#med-times`, `#med-days`, `#med-start`, `#med-end`,
`#med-stock-remaining`, `#med-stock-unit`, `#med-units-per-dose`, `#med-refill-days`,
`#btn-save-med`, `#btn-cancel-med`, `#med-form-error`, `#duplicate-warning`, `#med-list`,
`#today-list`, `#today-date`, `#adherence-summary`, `#adherence-chart`, `#refill-list`.
- `#med-times` input teks dipisah koma (`08:00, 20:00`) → array jam valid.
- `#med-days` berisi checkbox `input[name="med-day"]` nilai 0..6.
- Setelah mengisi bahan aktif, tampilkan `#duplicate-warning` bila `duplicatesForMedication`
  menemukan duplikasi; sertakan `DISCLAIMERS.duplicate` dan nama obat.
- Simpan → `state.upsert('medications', item)` → toast + refresh.
- Hari ini: `buildDosesForDate` + `applyDoseLogs`; tombol
  `[data-action="take-dose"]`/`[data-action="skip-dose"]` → `state.logDose`.
- Kepatuhan: `weeklyAdherence` + `buildBarChartSVG`; label `complianceLabel`.
- Tebus ulang: `predictRefills`; `DISCLAIMERS.stock`.
- Bila obat punya `source?.verifiedByUser`, tampilkan badge `Diverifikasi dari resep` dan tautan
  foto sumber `[data-action="view-source-photo"]` (`data-photo-id`).

#### `ui/vitals.js` (t6) — `#screen-vitals`
IDs: `#vital-tabs`, `#vital-form`, `#vital-date`, `#vital-time`, `#vital-systolic`,
`#vital-diastolic`, `#vital-value`, `#vital-note`, `#btn-save-vital`, `#vital-form-error`,
`#vital-chart`, `#vital-chart-title`, `#vital-list`, `#vital-range-summary`,
`#range-form`, `#range-metric`, `#range-low`, `#range-high`, `#btn-save-range`,
`#range-list`, `#lab-form`, `#lab-name`, `#lab-date`, `#lab-value`, `#lab-unit`,
`#lab-ref-low`, `#lab-ref-high`, `#lab-note`, `#btn-save-lab`, `#lab-list`, `#lab-select`,
`#lab-chart`.
- Tab `[data-vital-type]` (urut `VITAL_TYPE_ORDER`).
- Tension sistolik/diastolik; tipe lain satu nilai.
- Grafik: `buildVitalTrend` → `buildLineChartSVG`.
- Rentang: `#range-metric` berisi `RANGE_METRICS`; simpan `state.upsert('refRanges', ...)`;
  bila metric sama, perbarui item tersebut.
- Lab: `state.upsert('labs', ...)`; `#lab-select` memilih nama lab untuk grafik.
- Hapus: `[data-action="delete-vital"]`, `[data-action="delete-lab"]`,
  `[data-action="delete-range"]` dengan `data-id`.

#### `ui/emergency.js` (t7) — `#screen-emergency`
IDs: `#emergency-card`, `#emergency-name`, `#emergency-blood`, `#emergency-allergies`,
`#emergency-chronic`, `#emergency-contacts`, `#emergency-medications`, `#emergency-qr`,
`#emergency-payload-pre`, `#btn-print-emergency`, `#emergency-numbers`,
`#emergency-privacy-warning`, `#emergency-disclaimer`, `#emergency-truncated-warning`.
- Data dari profil aktif + obat aktif (maks. 3). `emergencyPayload` → `encodeQR` → `qrToSvg`
  dimasukkan ke `#emergency-qr`.
- `#emergency-numbers` memuat tautan `tel:112` dan `tel:119`.
- Tampilkan `DISCLAIMERS.emergency` dan peringatan privasi.
- Tombol cetak memanggil `window.print()`.

#### `ui/report.js` (t7) — `#screen-report`
IDs: `#report-root`, `#btn-print-report`, `#summary-generated-at`, `#summary-profile`,
`#summary-disclaimer`, `#summary-allergies`, `#summary-chronic`, `#summary-medications`,
`#summary-vitals`, `#summary-labs`, `#summary-visits`, `#summary-adherence`, `#questions-list`,
`#summary-emergency-numbers`, `#manual-question-form`, `#manual-question`, `#btn-add-question`.
- `buildDoctorSummary` → render; `#btn-print-report` → `window.print()`.
- Pertanyaan manual checkbox `[data-action="toggle-question"]` (`data-question-id`) →
  `state.upsert('questions', {...q, done})`.
- Form pertanyaan manual: `state.upsert('questions', { text, source:'manual', done:false })`.
- Sertakan `DISCLAIMERS.summary`; diagnosis tetap "sesuai yang Anda tulis".
- Maks. satu halaman A4; class `avoid-break`.

#### `ui/chart.js` (t6)
```js
export function buildLineChartSVG({
  series = [], low = null, high = null,
  title = 'Grafik', unit = '', width = 640, height = 240
} = {}) // -> string SVG
export function buildBarChartSVG({
  bars = [], max = 100, title = 'Grafik', unit = '%', width = 640, height = 200
} = {}) // -> string SVG
export function renderChart(container, svg) // container.innerHTML = svg
```
- Tanpa data → SVG valid dengan teks `Belum ada data`.
- Sumbu, grid, label tanggal, legenda, `<title>`/`<desc>`, `role="img"`, `aria-label`.
- Warna default: `#0f766e`, `#b45309`, `#7c3aed`, `#be123c`.
- Nilai di luar `low/high` diberi titik lebih tebal/warna berbeda + `<title>`.
- Escape semua teks. Tanpa library.

#### `ui/scan.js` (t13) — `#screen-scan`

Layar unggah/kamera dan jalur teks. **Tidak menulis state.**

IDs:
`#screen-scan`, `#scan-mode`, `#scan-source-tabs`, `#scan-tab-photo`, `#scan-tab-text`,
`#scan-panel-photo`, `#scan-panel-text`, `#scan-file-input`, `#scan-camera-button`,
`#scan-camera-video`, `#scan-camera-canvas`, `#btn-capture`, `#scan-image-preview`,
`#scan-text-input`, `#scan-text-preview`, `#btn-run-ocr`, `#btn-parse-text`, `#scan-progress`,
`#scan-status`, `#scan-error`, `#scan-ocr-text`, `#scan-ocr-confidence`, `#scan-warning`,
`#scan-ocr-engine`, `#btn-to-review`, `#scan-photo-meta`.

Perilaku:
- `#scan-mode` berisi `resep` (default) dan `rekam-medis`; label Indonesia:
  `Resep / Etiket Obat`, `Rekam Medis Rumah Sakit`.
- Tab foto/teks wajib dua-duanya ada. Tombol `#scan-tab-photo`/`#scan-tab-text` mengubah
  `aria-selected` dan panel.
- Foto: `#scan-file-input` `accept="image/jpeg,image/png,image/webp" capture="environment"`.
  `#scan-camera-button` meminta `getUserMedia({video:{facingMode:{ideal:'environment'}}})`;
  bila ditolak/tidak didukung → pesan jelas + arahkan ke unggah. `#btn-capture` menggambar frame
  ke canvas → data URL.
- Sebelum OCR: `fileToSourcePhoto` (kompres ≤ 2 MiB, dimensi ≤ 2000) dan tampilkan pratinjau
  serta `#scan-photo-meta`.
- `#btn-run-ocr`: `kenaliTeks(dataUrl, { onProgress })`; progress ke `#scan-progress`
  (`role="progressbar"`, `aria-valuenow`), status ke `#scan-status`. Hasil mentah ke
  `#scan-ocr-text` (readonly textarea), confidence ke `#scan-ocr-confidence`.
  Bila `ocrTersedia()` false → `#scan-error` dengan pesan OCR tidak tersedia dan saran jalur teks.
- Jalur teks: `#scan-text-input`; tombol `#btn-parse-text` langsung mem-parsing
  `kenaliResep`/`kenaliRekamMedis` tanpa OCR. `#scan-text-preview` menampilkan ringkasan
  terjemahan (per obat) secara langsung saat mengetik (debounce 200 ms).
- Setelah ada hasil, `#btn-to-review` menyusun `ScanDraft` (lihat 9.5) via `setScanDraft` lalu
  `ctx.navigate('#/tinjau')`. **Jangan** memanggil `state.upsert`/`saveSourcePhoto` di layar ini.
- `#scan-warning` selalu menampilkan `DISCLAIMERS.ocr` + `DISCLAIMERS.photo`.
- `#scan-ocr-engine` menampilkan `Tesseract.js lokal` atau `Tidak tersedia`.
- Cleanup: hentikan semua track kamera, batalkan OCR (AbortController), lepas timer.
- `#scan-error` `role="alert"`.

#### `ui/scan-review.js` (t14) — `#screen-scan-review`

Layar Tinjau wajib. **Satu-satunya layar yang boleh menyimpan hasil pindai**, setelah verifikasi.

IDs umum:
`#screen-scan-review`, `#review-empty`, `#review-source-panel`, `#review-source-image`,
`#review-source-text`, `#review-ocr-text`, `#review-confidence`, `#review-warning`,
`#review-disclaimer`, `#review-low-confidence`, `#review-unparsed-list`, `#review-items`,
`#review-rekam-fields`, `#review-lab-list`, `#btn-add-item`, `#btn-add-lab`, `#review-verified`,
`#review-verified-label`, `#btn-save-reviewed`, `#btn-cancel-review`, `#review-error`,
`#review-photo-warning`.

IDs per obat (indeks `i` 0-based):
`#review-item-<i>`, `#review-item-name-<i>`, `#review-item-strength-<i>`, `#review-item-form-<i>`,
`#review-item-frequency-<i>`, `#review-item-dose-<i>`, `#review-item-meal-<i>`,
`#review-item-duration-<i>`, `#review-item-total-<i>`, `#review-item-times-<i>`,
`#review-item-translation-<i>`, `#review-item-unparsed-<i>`, `#btn-remove-item-<i>`.

IDs rekam medis:
`#review-rekam-date`, `#review-rekam-facility`, `#review-rekam-doctor`,
`#review-rekam-diagnosis`, `#review-rekam-complaint`, `#review-rekam-notes`.
IDs lab (indeks `j`):
`#review-lab-<j>`, `#review-lab-name-<j>`, `#review-lab-value-<j>`, `#review-lab-unit-<j>`,
`#review-lab-ref-<j>`, `#review-lab-remove-<j>`.

Perilaku:
- Bila `getScanDraft()` null → tampilkan `#review-empty` ("Tidak ada draf pindai...") + tombol
  kembali ke `#/pindai`; jangan error.
- `#review-source-panel`: bila ada foto, tampilkan `photoDataUrl` di `#review-source-image`;
  bila jalur teks, tampilkan teks di `#review-source-text`. Tata letak dua kolom di layar lebar,
  bertumpuk di HP.
- `#review-ocr-text`: textarea teks OCR mentah yang dapat disunting.
- `#review-confidence`: persentase kepercayaan; bila < `OCR_LOW_CONFIDENCE`, tambahkan kelas
  `is-low-confidence` dan isi `#review-low-confidence` dengan penjelasan.
- `#review-unparsed-list`: daftar `bagianTidakDipahami`; setiap item memakai kelas
  `is-review-warning`. Bila kosong, sembunyikan.
- Setiap bidang dapat disunting. Perubahan frekuensi/takaran/bentuk/durasi memanggil ulang
  `frasaTerjemahan`/`jadwalUntukObat` untuk memperbarui `#review-item-translation-<i>` dan
  `#review-item-times-<i>` (kecuali pengguna sudah mengubah jam secara manual; simpan flag lokal
  di memori layar).
- `#btn-add-item` menambah obat kosong; `#btn-remove-item-<i>` menghapus (minimal satu item untuk
  mode resep).
- Mode rekam medis: tampilkan `#review-rekam-fields` + `#review-lab-list`; setiap baris lab dapat
  disunting/dihapus; `#btn-add-lab` menambah baris kosong.
- **Checkbox wajib**: `#review-verified` dengan label persis
  `Saya sudah mencocokkan dengan resep asli` (untuk mode rekam medis:
  `Saya sudah mencocokkan dengan dokumen asli`). `#btn-save-reviewed` `disabled` selama checkbox
  belum dicentang. Mengubah bidang setelah centang **tidak** otomatis membatalkan centang, tetapi
  tombol simpan tetap menghitung ulang validasi.
- `#btn-save-reviewed`:
  1. Bila belum dicentang → `#review-error` `REVIEW_BELUM_DIVERIFIKASI`; tidak menulis apa pun.
  2. Validasi seluruh bidang (nama wajib; frekuensi integer 1–12 atau kosong; jam valid;
     kekuatan angka ≥ 0; durasi integer ≥ 0; tanggal valid). Bila gagal → tampilkan field error,
     tidak menulis.
  3. `verifiedAt = ctx.now().toISOString()`.
  4. Bila ada foto: `photo = await ctx.state.saveSourcePhoto({ profileId, kind, mime,
     dataBase64, width, height })`; dapatkan `photoId`. Bila gagal → tampilkan error, jangan
     lanjut.
  5. Mode resep: untuk setiap obat, `await ctx.state.upsert('medications', obatKeMedication(
     obat, { profileId, today: tanggalMulai, source: { kind, photoId, photoMime, ocrText,
     ocrConfidence, translatedText, verifiedByUser:true, verifiedAt, parserVersion:'resep-v1' } }))`.
  6. Mode rekam medis: `state.upsert('visits', rekamKeKunjungan(...))`; untuk setiap lab
     `state.upsert('labs', labKeLab(...))`.
  7. `clearScanDraft()`; `ctx.toast('Data terverifikasi disimpan.', 'success')`;
     `ctx.navigate(mode === 'resep' ? '#/obat' : '#/kunjungan')`; `await ctx.refresh()`.
  8. Bila penyimpanan gagal di tengah: tampilkan error, **jangan** hapus draf, dan jangan
     menyembunyikan apa yang sudah tersimpan; pesan menyebutkan bahwa sebagian data mungkin
     tersimpan dan pengguna harus memeriksa daftar.
- `#btn-cancel-review`: konfirmasi bila ada perubahan; `clearScanDraft()`; kembali ke `#/pindai`.
- `#review-warning` selalu memuat `DISCLAIMERS.ocr` + `DISCLAIMERS.review` dan kalimat
  `Kesalahan membaca dosis bisa berbahaya. Cocokkan dengan apoteker atau dokter.`
- `#review-photo-warning` memuat `DISCLAIMERS.photo`.
- Tidak ada `innerHTML` untuk data pengguna; semua nilai lewat `.value`/`textContent`.
- Cleanup: lepas listener timer/debounce; draf tetap di memori sampai batal/simpan/reload.

#### 9.4.9 `ui/suara-pengaturan.js` (t18) — `#screen-suara-pengaturan`

IDs:
`#screen-suara-pengaturan`, `#suara-mesin`, `#suara-mesin-offline`, `#suara-mesin-offline-label`,
`#suara-mesin-web`, `#suara-mesin-web-label`, `#suara-mesin-status`, `#suara-web-warning`,
`#suara-setuju-checkbox`, `#btn-suara-setuju`, `#btn-suara-cabut`, `#suara-persetujuan-status`,
`#suara-tidak-tersedia`, `#settings-suara-tts`, `#settings-suara-rate`, `#btn-simulasikan-suara`,
`#suara-pengaturan-error`, `#suara-pengaturan-status`, `#suara-pengaturan-live`,
`#suara-model-status`, `#suara-model-ukuran`, `#suara-model-peringatan`,
`#btn-suara-muat-model`, `#suara-model-progress`, `#suara-model-cara`.

Perilaku:
- Render dari `normalisasiPengaturanSuara(ctx.state.getState().settings)`.
- Radio `name="suara-mesin"`; offline default dan selalu tersedia. Bila `!webSpeechTersedia()`,
  **sembunyikan** radio/opsi web-speech, tampilkan `#suara-tidak-tersedia`
  ("Pengenalan suara bawaan peramban tidak tersedia di peramban ini."), dan jangan tampilkan
  checkbox/tombol setuju.
- Bila tersedia: `#suara-web-warning` **selalu** memuat `PERINGATAN_WEB_SPEECH` (bukan di balik
  modal). Mengaktifkan web-speech hanya lewat `#suara-setuju-checkbox` (label peringatan) +
  `#btn-suara-setuju`; `#btn-suara-setuju` disabled sampai checkbox dicentang. Panggil
  `berikanPersetujuan(ctx.state)` → `ctx.toast` + perbarui `#suara-persetujuan-status`.
- `#btn-suara-cabut` selalu tampil bila pernah ada persetujuan; panggil `cabutPersetujuan`, set
  radio offline, umumkan lewat `#suara-pengaturan-live`.
- `#settings-suara-tts` dan `#settings-suara-rate` (range 0.5–1.5 step 0.1) memanggil
  `state.setSettings({ suara: {...} })` tanpa reload; label nilai kecepatan terlihat.
- **Status model jujur.** Saat render, panggil `statusModel()` (8B.3). Tampilkan di
  `#suara-model-status`: `'siap'` → "Model offline siap (Whisper base, ± 80 MB).";
  `'belum'` → "Model offline belum lengkap."; `'tidak-ada'` → "Model offline belum tersedia."
  `#suara-model-ukuran` menampilkan `bytes` dari manifest (format MB) atau "± 80 MB".
  `#suara-model-cara` selalu memuat `npm run vendor:whisper` untuk pemasangan lokal.
- `#suara-model-peringatan` **selalu** memuat: "Pengenalan offline memakai Whisper base.
  Akurasinya terbatas untuk nama dan dosis obat berbahasa Indonesia, dan lebih lambat daripada
  peramban. Gunakan alur tanya, pilihan tertutup, dan periksa ulang bacaan." Jangan mengklaim
  akurasi tinggi atau model bahasa Indonesia khusus.
- `#btn-suara-muat-model` hanya aktif bila `statusModel().status === 'siap'`; memanggil
  `muatModel()` (memuat dari disk same-origin, **bukan** mengunduh) dan menampilkan progres di
  `#suara-model-progress`. Bila belum/tidak ada, tombol disabled + arahkan ke `#suara-model-cara`.
- `#btn-simulasikan-suara` membacakan contoh kalimat via `bacakan` (bila TTS tersedia) dan
  mengumumkan hasilnya; tidak menyimpan data dan tidak meminta mikrofon.
- Error `role="alert"`; live region `role="status" aria-live="polite"`.
- Tidak ada request eksternal saat membuka layar; `statusModel()` hanya same-origin.

#### 9.4.10 `ui/isi-suara.js` + `isi-suara-obat.js` + `isi-suara-vital.js` + `isi-suara-minum.js` (t22) — `#screen-isi-suara`

Layar utama **Isi dengan Suara**. **Tidak menyimpan tanpa konfirmasi.**

IDs umum:
`#screen-isi-suara`, `#suara-mesin-aktif`, `#suara-mode`, `#suara-tab-obat`, `#suara-tab-vital`,
`#suara-tab-minum`, `#suara-tab-jadwal`, `#suara-panel-obat`, `#suara-panel-vital`,
`#suara-panel-minum`, `#suara-panel-jadwal`, `#btn-suara-mulai`, `#btn-suara-berhenti`,
`#suara-mendengarkan`, `#suara-transkrip`, `#suara-status`, `#suara-live`, `#suara-error`,
`#suara-warning`, `#suara-hasil`, `#suara-ringkasan`, `#suara-pertanyaan-konfirmasi`,
`#btn-konfirmasi-ya`, `#btn-konfirmasi-tidak`, `#btn-suara-ulangi`, `#btn-suara-batal`,
`#suara-pemeriksaan-status`, `#btn-suara-bantuan`, `#btn-suara-pengaturan`, `#suara-pemilih-obat`,
`#btn-suara-tanya-obat`, `#suara-obat-sumber`, `#suara-obat-tanya-status`,
`#suara-obat-legacy-note`.

IDs mode obat:
`#suara-obat-nama`, `#suara-obat-kekuatan`, `#suara-obat-frekuensi`, `#suara-obat-takaran`,
`#suara-obat-aturan`, `#suara-obat-jadwal`, `#suara-obat-terjemahan`, `#suara-obat-pagar`.

IDs mode vital:
`#suara-vital-jenis`, `#suara-vital-sistolik`, `#suara-vital-diastolik`, `#suara-vital-nilai`,
`#suara-vital-unit`, `#suara-vital-waktu`, `#suara-vital-parse`.

IDs mode minum:
`#suara-minum-obat`, `#suara-minum-jam`, `#suara-minum-daftar`, `#btn-suara-minum-catat`.

IDs mode jadwal:
`#suara-jadwal-daftar`, `#btn-suara-bacakan-jadwal`.

Perilaku:
- Tab `[role="tab"]` dengan `aria-selected`; panel `role="tabpanel"`. Mode awal `obat`.
- **Mode obat adalah alur tanya satu per satu.** Panel obat tidak memakai dikte bebas untuk
  mengisi nama/dosis. Tampilkan penjelasan singkat, `#suara-obat-sumber` (pilihan sumber nama
  obat: daftar/pindai/ketik/ejaan), dan tombol besar `#btn-suara-tanya-obat` yang membuka
  `#/suara/tanya`. `#suara-obat-nama` **tidak pernah** diisi dari `kenaliSuara`; field lama tetap
  ada untuk ringkasan/sunting pendamping, bukan hasil ASR. `#suara-obat-tanya-status` menampilkan
  status sesi tanya, dan `#suara-obat-legacy-note` menyatakan bahwa dikte bebas tidak dipakai
  untuk nama obat.
- `#suara-mesin-aktif` menampilkan mesin efektif (`mesinAktif(settings)`) + label; bila offline
  belum ter-vendor, tampilkan pesan dan arahkan ke `#/suara/pengaturan`.
- `#btn-suara-mulai` **tidak aktif di mode obat**. Di mode obat, `#btn-suara-tanya-obat` membuka
  `#/suara/tanya`; seluruh pengisian obat (nama + lima pertanyaan + konfirmasi) ditangani layar
  itu (9.4.13). `dikteKeObat` tidak dipakai untuk mengisi `#suara-obat-nama` atau menyimpan obat.
  Bila field lama ditampilkan, hanya sebagai ringkasan/sunting pendamping; `#suara-obat-pagar`
  tetap menampilkan pagar `pagarKewajaranDosis` dan menyunting di luar batas ditolak.
- Untuk mode vital/minum/jadwal, `#btn-suara-mulai` minta mikrofon, panggil `kenaliSuara`
  (maks. 8 detik + penjaga ASR 8B.11), tampilkan transkrip di `#suara-transkrip`, lalu:
  - vital → `parseDikteVital`; isi field; bila null tampilkan `#suara-error`
    ("Ucapan belum dikenali. Coba ucapkan jenis dan nilainya, misalnya tensi seratus empat puluh per sembilan puluh.").
  - minum → cocokkan nama obat dengan jadwal hari ini; isi `#suara-minum-obat`/`-jam`; pilihan
    `#suara-minum-daftar` untuk dosis yang cocok.
  - jadwal → bacakan `teksUlangJadwal` (dengan status pemeriksaan); tidak menyimpan.
- **Konfirmasi wajib** sebelum simpan (mode vital/minum; mode obat memakai konfirmasi di
  `#/suara/tanya`):
  1. `await adaptor.berhenti()` agar mikrofon tidak mendengar TTS.
  2. `bacakan(teksUlangObat/Vital/Minum + ' ' + PERTANYAAN_KONFIRMASI)`.
  3. Dengarkan jawaban (atau tombol besar). Gunakan `jalankanKonfirmasiSuara`/`jawabKonfirmasi`.
  4. `'simpan'` → baru tulis; `'ulangi-entri'` → bersihkan hasil, fokus ke field pertama, jangan
     menyimpan; setelah 2 jawaban tidak jelas → batal, jangan menyimpan.
- Tombol `#btn-konfirmasi-ya` dan `#btn-konfirmasi-tidak` minimal 48 px, label persis
  "Ya, benar" dan "Tidak", selalu tersedia saat konfirmasi dan dapat diaktifkan keyboard.
- Saat menyimpan obat: bangun Medication via `obatKeMedication`, lalu **wajib**
  `dibuatDengan:'suara'`, `dikonfirmasiDengan:'suara'`, dan
  `pemeriksaanOrangLain = defaultPemeriksaan()` (status `'belum'`). `source:null` bila tidak ada
  foto; jangan mengisi `verifiedByUser` dari suara.
- Saat menyimpan vital: `state.upsert('vitals', ...)` setelah konfirmasi.
- Saat menyimpan minum: `state.logDose({ medicationId, date, time, status:'taken' })` setelah
  konfirmasi; status pemeriksaan obat dibacakan sebelum konfirmasi.
- `#suara-warning` memuat `DISCLAIMERS_SUARA`; `#suara-pemeriksaan-status` memuat
  `LABEL_BELUM_DIPERIKSA` untuk entri baru.
- `#btn-suara-ulangi` mengulang pendengaran; `#btn-suara-batal` menghentikan mikrofon, membuang
  draf memori, dan fokus ke `#btn-suara-mulai`.
- `#btn-suara-bantuan` → `#/bantuan-suara`; `#btn-suara-pengaturan` → `#/suara/pengaturan`.
- **Fokus & live region**: setelah hasil, fokus pindah ke `#suara-ringkasan` atau field error
  pertama; setiap perubahan status/konfirmasi/hasil diumumkan lewat `#suara-live`
  (`role="status" aria-live="polite" aria-atomic="true"`).
- Cleanup: `berhenti()`, `hentikanBacaan()`, lepas listener; tidak ada audio/transkrip tersimpan.

#### 9.4.11 `ui/pemeriksaan.js` (t25) — `#screen-pemeriksaan`

IDs:
`#screen-pemeriksaan`, `#pemeriksaan-empty`, `#pemeriksaan-list`, `#pemeriksaan-detail`,
`#pemeriksaan-obat-nama`, `#pemeriksaan-status`, `#pemeriksaan-sumber`,
`#pemeriksaan-resep-foto`, `#pemeriksaan-resep-kosong`, `#pemeriksaan-terjemahan`,
`#pemeriksaan-field-list`, `#pemeriksaan-nama-pendamping`, `#pemeriksaan-pernyataan`,
`#pemeriksaan-pernyataan-label`, `#btn-pemeriksaan-sahkan`, `#pemeriksaan-error`,
`#pemeriksaan-live`, `#pemeriksaan-filter`, `#pemeriksaan-count`.

Perilaku:
- Daftar medication profil aktif yang `butuhPemeriksaan` (default semua), urut nama; setiap item
  `[data-action="pilih-pemeriksaan"]` `data-medication-id`, menampilkan `penandaPemeriksaan`.
  Filter `#pemeriksaan-filter` (`belum`/`sudah`/`semua`).
- Detail: `#pemeriksaan-obat-nama`; `#pemeriksaan-status` = `labelPemeriksaan`; `#pemeriksaan-sumber`
  menyebut `dibuatDengan`/`dikonfirmasiDengan` dan apakah ada pencocokan foto. Bila
  `source.photoId`, panggil `state.getSourcePhoto` → `photoDataUrl` di `#pemeriksaan-resep-foto`
  (alt "Foto resep asli"); bila tidak ada → `#pemeriksaan-resep-kosong`
  ("Tidak ada foto resep sumber. Cocokkan dengan kemasan/resep asli.").
- `#pemeriksaan-terjemahan` menampilkan `instructions`/`teksTerjemahan` dan field dosis/frekuensi;
  `#pemeriksaan-field-list` daftar nama, kekuatan, takaran, aturan, jadwal.
- `#pemeriksaan-nama-pendamping` wajib (`required`, label "Nama pendamping atau apoteker").
  `#pemeriksaan-pernyataan` checkbox dengan label persis `PERNYATAAN_PEMERIKSAAN`.
  `#btn-pemeriksaan-sahkan` disabled sampai nama non-kosong **dan** checkbox dicentang.
- Simpan: `tandaiSudahDiperiksa(med, { oleh, pernyataan: PERNYATAAN_PEMERIKSAAN, waktu: ctx.now() })`
  → `state.upsert('medications', item)` → toast → `ctx.refresh()`. Error validasi →
  `#pemeriksaan-error` role alert. Umumkan `labelPemeriksaan` baru di `#pemeriksaan-live`.
- Tidak ada perubahan status otomatis; tidak ada tombol "verifikasi karena suara"; tidak ada klaim
  medis. Teks wajib menyebut "diperiksa", bukan "terverifikasi".
- Bila daftar kosong → `#pemeriksaan-empty` ("Tidak ada obat yang menunggu pemeriksaan.").

#### 9.4.12 `ui/bantuan-suara.js` (t26) — `#screen-bantuan-suara`

IDs:
`#screen-bantuan-suara`, `#bantuan-suara-daftar`, `#btn-bacakan-bantuan`, `#bantuan-kembali`,
`#bantuan-suara-live`, `#bantuan-suara-warning`.

Perilaku:
- `daftarBantuan()` dirender sebagai daftar `<ul>`; setiap perintah + arti, termasuk
  "bantuan", navigasi, isi suara, pemeriksaan, dan "berhenti".
- `#btn-bacakan-bantuan` memanggil `bacakan(teksBantuan())`; bila TTS tidak ada, tampilkan teks
  dan `#bantuan-suara-warning` ("Pembaca suara tidak tersedia; daftar perintah tetap dapat dibaca").
- `#bantuan-kembali` kembali ke layar asal (`history.back()` atau `#/suara`).
- `#bantuan-suara-warning` memuat `DISCLAIMERS_SUARA` + "Perintah suara hanya navigasi dan
  pengisian; aplikasi tidak menjawab pertanyaan medis."
- Semua tautan/daftar dapat difokus keyboard; live region mengumumkan aksi.

#### 9.4.13 `ui/tanya-suara.js` (t32) — `#screen-tanya-suara`

Layar **Tanya Obat Satu per Satu** di `#/suara/tanya`. Ini jalur obat utama. Nama obat dipilih
dulu (tidak dari ASR bebas), lalu lima pertanyaan tertutup, lalu konfirmasi persis. Tidak ada
penyimpanan sebelum konfirmasi.

IDs:
`#screen-tanya-suara`, `#tanya-judul`, `#tanya-langkah`, `#tanya-pertanyaan`, `#tanya-pilihan`,
`#btn-tanya-bacakan`, `#btn-tanya-mulai`, `#btn-tanya-berhenti`, `#tanya-mendengarkan`,
`#tanya-transkrip`, `#tanya-ketik`, `#btn-tanya-ketik`, `#btn-tanya-pilih-selesai`,
`#tanya-ringkasan`, `#tanya-konfirmasi`, `#btn-tanya-konfirmasi-ya`, `#btn-tanya-konfirmasi-tidak`,
`#tanya-error`, `#tanya-live`, `#tanya-warning`, `#btn-tanya-batal`, `#btn-tanya-pengaturan`,
`#btn-tanya-ulangi`, `#tanya-sumber-nama`, `#tanya-sumber-daftar`, `#tanya-sumber-pindai`,
`#tanya-sumber-ketik`, `#tanya-sumber-ejaan`, `#tanya-daftar-nama`, `#tanya-nama-pertanyaan`,
`#btn-tanya-nama-ya`, `#btn-tanya-nama-tidak`, `#tanya-nama-ketik`, `#btn-tanya-nama-ketik`,
`#tanya-ejaan`, `#tanya-ejaan-hasil`, `#btn-tanya-ejaan-hapus`, `#btn-tanya-ejaan-selesai`,
`#btn-tanya-ejaan-ya`, `#btn-tanya-ejaan-tidak`.

Perilaku:

1. **Pilih nama dulu.** Render `#tanya-sumber-nama` dengan empat tombol sumber:
   `#tanya-sumber-daftar`, `#tanya-sumber-pindai`, `#tanya-sumber-ketik`,
   `#tanya-sumber-ejaan`. Mikrofon **tidak** boleh dipakai untuk menerima nama bebas.
   - Daftar: `daftarNamaDariObat(state.getState().medications)`; `#tanya-daftar-nama` menampilkan
     kandidat. Bila kosong, nonaktifkan tombol dengan pesan "Belum ada obat tersimpan."
   - Pindai: `daftarNamaDariPindai(hasilPindai)` dari sesi tinjau/pindai; bila kosong, nonaktifkan
     dengan pesan "Tidak ada nama dari hasil pindai."
   - Baca satu per satu: `bacaSatuPerSatu`; TTS `teksNamaDariDaftar(nama)` (persis
     `'<nama>? ya atau tidak'`); tombol `#btn-tanya-nama-ya`/`#btn-tanya-nama-tidak`; jawaban suara
     memakai `cocokkanYaTidak` + penjaga ASR. `'lain'` diulang maks. 2 lalu tombol/ketik.
   - Ketik: `#tanya-nama-ketik` (`<label for>`) + `#btn-tanya-nama-ketik`; panggil `ketikNama`.
     Teks ini hanya dari ketikan/pasta pendamping, **bukan** dari `kenaliSuara`.
   - Ejaan: `mulaiEjaan`; setiap jawaban suara maks. 8 detik dan hanya boleh satu huruf/nama huruf
     (`tambahHuruf`), lalu `#tanya-ejaan-hasil` diperbarui dan TTS membacakan ejaan saat ini.
     `#btn-tanya-ejaan-hapus`, `#btn-tanya-ejaan-selesai`; bila selesai, TTS
     `'Apakah nama obatnya <nama>?'` dengan `#btn-tanya-ejaan-ya`/`#btn-tanya-ejaan-tidak`.
2. Setelah nama valid (`validasiNamaObat`), buat sesi `buatSesiTanya`. Tampilkan
   `#tanya-langkah` = "Langkah 1 dari 5" (bukan untuk nama), `#tanya-pertanyaan` = pertanyaan
   persis, dan `#tanya-pilihan` berisi satu tombol per pilihan (label Indonesia; `aria-pressed`
   untuk waktu multi). Tombol selalu tersedia, bukan hanya setelah ASR gagal.
3. `#btn-tanya-bacakan` membacakan pertanyaan via `bacakanPertanyaan`. `#btn-tanya-mulai`:
   hentikan TTS, mulai mikrofon, `kenaliSuara({maksDurasiMs: 8000})`, lalu `jawabTanya`. Penjaga
   ASR (8B.11) wajib aktif; hasil ditolak → `#tanya-error` "Tidak terdengar dengan jelas..." dan
   tidak di-parse. `#btn-tanya-berhenti` menghentikan mikrofon. `#tanya-transkrip` menampilkan
   teks jawaban (bukan nama).
4. `#tanya-ketik` + `#btn-tanya-ketik` memanggil `ketikJawaban`; untuk waktu multi,
   `#btn-tanya-pilih-selesai` mengirim pilihan tombol yang aktif. Setelah 2 kegagalan paham,
   fokuskan `#tanya-pilihan`/`#tanya-ketik` dan umumkan "Silakan pilih tombol atau ketik jawaban."
   Jangan memaksa pencocokan.
5. Setelah lima jawaban, tampilkan `#tanya-ringkasan` = `ringkasSesi(sesi)`,
   `#tanya-konfirmasi` = `PERTANYAAN_KONFIRMASI`, dan tombol besar `#btn-tanya-konfirmasi-ya`
   ("Ya, benar") / `#btn-tanya-konfirmasi-tidak` ("Tidak") minimal 56 px. TTS membacakan
   `teksKonfirmasiTanya(ringkasan)`. Jawaban suara memakai `klasifikasiJawaban`; `'lain'` maks. 2
   lalu hanya tombol. `#btn-tanya-ulangi` mengulang pertanyaan konfirmasi.
6. **Simpan hanya** bila keputusan `'simpan'`: panggil `selesaikanSesi(sesi,{simpan:true})`,
   lalu `state.upsert('medications', medication)`, `ctx.toast`, umumkan, dan arahkan ke `#/obat`
   (atau tampilkan status berhasil). Bila pagar gagal → `#tanya-error` role alert, jangan simpan.
   `'tidak'`/batal → buang sesi, kembali ke pemilihan nama; tidak ada data tersimpan.
7. `#btn-tanya-batal` menghentikan mikrofon + TTS, membuang sesi, dan kembali ke `#/suara`.
   `#btn-tanya-pengaturan` → `#/suara/pengaturan`. Cleanup layar wajib `berhenti()`,
   `terminate()`, `hentikanBacaan()`, dan melepas listener.
8. `#tanya-warning` memuat `DISCLAIMERS_SUARA` + "Whisper base terbatas untuk nama/dosis obat
   berbahasa Indonesia; alur tanya dan pembacaan ulang dipakai untuk mengurangi kesalahan."
   `#tanya-live` = `role="status" aria-live="polite" aria-atomic="true"`; `#tanya-error` =
   `role="alert"`. Fokus berpindah ke pertanyaan setelah TTS dan ke ringkasan setelah selesai.
9. Tidak ada `innerHTML` untuk data pengguna, tidak ada storage sebelum simpan, tidak ada
   audio/transkrip tersimpan, tidak ada request eksternal.

### 9.5 `app/js/scanSession.js` — t13

Draf pindai **hanya di memori**; tidak boleh memakai localStorage/sessionStorage/IndexedDB.

```js
export function setScanDraft(draft)      // simpan satu draf (menimpa)
export function getScanDraft()           // ScanDraft | null
export function clearScanDraft()
export function subscribeScanDraft(listener) // -> unsubscribe
```

`ScanDraft`:

```js
{
  mode: 'resep' | 'rekam-medis',
  source: 'foto' | 'teks',
  teksAsli: string,
  foto: {
    mime: 'image/jpeg', dataBase64: '<base64>',
    bytes: 240000, width: 1600, height: 1200
  } | null,
  ocr: {
    kepercayaan: 0.84,
    baris: [{ teks, kepercayaan, bbox }],
    mesin: 'tesseract',
    bahasa: ['ind','eng']
  } | null,
  terjemahan: HasilKenaliResep | null,
  rekam: HasilKenaliRekamMedis | null,
  createdAt: ISO
}
```

- Hanya satu draf aktif. `setScanDraft` memanggil listener.
- Draf tidak pernah ditulis ke storage; `clearScanDraft` saat batal/simpan.
- Tidak ada log teks/foto ke console.

---

## 10. CSS, Aksesibilitas, Cetak

### 10.1 `app/css/style.css` — t4

Wajib memuat token:

```css
:root {
  --font-base: 16px;
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-text: #0f172a;
  --color-muted: #475569;
  --color-primary: #0f766e;
  --color-primary-ink: #ffffff;
  --color-danger: #b91c1c;
  --color-warning: #92400e;
  --color-ok: #166534;
  --color-border: #cbd5e1;
  --radius: 12px;
  --touch: 48px;
}
:root.is-large-text { --font-base: 20px; }
:root[data-contrast="high"] { /* latar putih, teks hitam, border tebal, warna status lebih gelap */ }
```

- `html { font-size: var(--font-base); }`, body `line-height: 1.5`.
- `button, input, select, textarea, a.button { min-height: var(--touch); }`; target sentuh ≥ 48 px.
- Fokus: `:focus-visible { outline: 3px solid var(--color-primary); outline-offset: 2px; }`.
- Mobile-first, konten maks. 720 px, navigasi bawah untuk < 720 px.
- Kontras AA (≥ 4.5:1). Jangan mengandalkan warna saja.
- `body.is-locked #app-header, body.is-locked #app-nav, body.is-locked #app-disclaimer { display: none; }`.
- Kelas status: `.flag-low`, `.flag-high`, `.flag-normal`, `.flag-unknown`; `.is-due`;
  `.badge`, `.card`, `.muted`, `.stack`, `.grid`, `.form-row`, `.touch`.
- `.skip-link` tersembunyi sampai fokus. `prefers-reduced-motion` mematikan animasi.
- Kelas pindai/tinjau:
  - `.scan-tabs`, `.scan-panel`, `.scan-preview`, `.scan-camera`, `.scan-video`,
    `.scan-warning`, `.scan-actions`, `.scan-progress`.
  - `.review-layout` (grid dua kolom ≥ 800 px; satu kolom di HP),
    `.review-source`, `.review-fields`, `.review-item`, `.review-item-fields`,
    `.review-translation`, `.review-required`, `.review-low-confidence`,
    `.is-low-confidence`, `.is-review-warning`, `.badge-verified`, `.source-photo`.
  - `.is-low-confidence` wajib disertai teks/ikon "Perlu diperiksa", bukan hanya warna.
  - `.review-required` menandai checkbox verifikasi wajib dan harus terlihat jelas.
- Kelas suara/aksesibilitas/pemeriksaan:
  - `.voice-actions` (tombol besar bertumpuk), `.voice-big-button` (min. 56 px, font ≥ 1.1 rem),
    `.voice-transcript`, `.voice-status`, `.voice-warning`, `.voice-live`, `.voice-tabs`,
    `.voice-panel`, `.voice-result`, `.voice-required`.
  - `.pemeriksaan-layout` (grid dua kolom ≥ 800 px, satu kolom di HP),
    `.pemeriksaan-source`, `.pemeriksaan-fields`, `.pemeriksaan-field-list`,
    `.badge-pemeriksaan-belum`, `.badge-pemeriksaan-sudah`.
  - `.badge-pemeriksaan-belum` wajib disertai ikon/teks "Belum diperiksa pendamping/apoteker"
    (bukan warna saja); `.badge-pemeriksaan-sudah` menyebut nama pemeriksa.
  - `.sr-only` untuk teks pembaca layar; tetap tersedia di pohon aksesibilitas.
  - Kelas alur tanya: `.tanya-layout`, `.tanya-progress`, `.tanya-question`,
    `.tanya-choices`, `.tanya-choice`, `.tanya-choice[aria-pressed="true"]`,
    `.tanya-name-sources`, `.tanya-spell`, `.tanya-summary`, `.tanya-confirm`,
    `.tanya-actions`. Tombol pilihan dan konfirmasi minimal 48 px (konfirmasi 56 px), teks
    pertanyaan minimal 1.25 rem, dan pilihan aktif tidak boleh dibedakan hanya dengan warna.
  - Mode `is-large-text` dan `data-contrast="high"` wajib memperbesar tombol suara dan tetap AA.

### 10.2 `app/css/print.css` — t7

```css
@page { size: A4; margin: 14mm; }
@media print {
  #app-header, #app-nav, #app-disclaimer, #toast-region, .no-print, button { display: none !important; }
  body { background: #fff; color: #000; }
  #app-view { max-width: none; padding: 0; }
  #report-root, #emergency-card { break-inside: avoid; }
  .avoid-break { break-inside: avoid; }
  a { color: #000; text-decoration: none; }
}
```

### 10.3 Aksesibilitas minimum

- `lang="id"`, judul dokumen per route, skip-link ke `#app-view`.
- Semua kontrol punya label; tombol ikon `aria-label`; error `role="alert"`.
- Dialog "Lainnya" memakai `<dialog>` + tombol tutup; fokus kembali ke pemicu.
- Grafik punya teks alternatif (`aria-label` + ringkasan nilai).
- Mode huruf besar/kontras dari `settings` diterapkan ke `<html>`.
- Layar Tinjau: checkbox verifikasi punya label eksplisit; tombol simpan memakai
  `aria-disabled`/`disabled`; field rendah kepercayaan punya teks penjelas.
- Tidak ada auto-play, animasi wajib, atau teks < 14 px.
- **Layar suara, tanya, & pemeriksaan**: setiap hasil/status diumumkan lewat live region
  (`#suara-live`, `#tanya-live`, `#pemeriksaan-live`, `#bantuan-suara-live`,
  `#suara-pengaturan-live`); fokus dipindahkan ke hasil/field error pertama; urutan tab mengikuti
  alur mulai → hasil → konfirmasi → simpan/batal; `#btn-konfirmasi-ya`/`#btn-konfirmasi-tidak`
  dan `#btn-tanya-konfirmasi-ya`/`#btn-tanya-konfirmasi-tidak` memakai `<button type="button">`
  dengan label eksplisit.
- **Layar tanya**: pertanyaan dibacakan dan ditampilkan; pilihan berbentuk tombol dengan
  `aria-pressed` untuk waktu multi; `#tanya-error` role alert; nama obat tidak pernah diisi dari
  transkrip; setelah dua kegagalan paham, fokus berpindah ke tombol/ketikan.
- Radio mesin suara berada dalam `<fieldset>` + `<legend>`; peringatan pihak ketiga dikaitkan
  lewat `aria-describedby`; checkbox persetujuan dan pernyataan pendamping punya label penuh.
- Tombol mikrofon memiliki `aria-pressed` (mendengarkan/tidak) dan teks status yang terlihat;
  tidak ada satu-satunya aksi lewat suara.
- Tabel/daftar status pemeriksaan memakai teks status yang dapat dibaca, bukan hanya badge warna.
- Pemeriksaan DOM otomatis wajib memeriksa: setiap input punya `<label for>`, setiap tombol punya
  nama aksesibel, `role`/`aria-live` ada, dan urutan fokus layar suara/pemeriksaan logis.

---

## 11. PWA (`app/sw.js`, `app/manifest.webmanifest` — t8; `icon.svg` — t7)

### 11.1 Manifest

```json
{
  "name": "Rekam Medisku — Rekam Medis Pribadi",
  "short_name": "Rekam Medisku",
  "description": "Rekam medis dan obat pribadi, tersimpan aman di perangkat.",
  "lang": "id",
  "dir": "ltr",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f8fafc",
  "theme_color": "#0f766e",
  "icons": [
    { "src": "icons/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any maskable" }
  ]
}
```

Tidak ada ikon eksternal. `icon.svg` sederhana (hati/perisai + huruf R) dengan warna token,
tanpa referensi eksternal.

### 11.2 Service worker

- `CACHE_NAME = 'rawatku-v1'`; `VENDOR_CACHE = 'rawatku-vendor-v1'`.
- Daftar precache **persis** (semua path harus ada):

```js
[
  './', './index.html', './manifest.webmanifest', './icons/icon.svg',
  './css/style.css', './css/print.css', './css/suara.css',
  './js/app.js', './js/dom.js', './js/model.js', './js/storage.js', './js/state.js',
  './js/crypto.js', './js/backup.js', './js/qr.js',
  './js/photos.js', './js/scanSession.js',
  './js/ocr/adaptor.js', './js/ocr/tesseractEngine.js',
  './js/logic/dates.js', './js/logic/schedule.js', './js/logic/stock.js',
  './js/logic/adherence.js', './js/logic/safety.js', './js/logic/vitals.js',
  './js/logic/summary.js',
  './js/logic/resepKamus.js', './js/logic/resep.js',
  './js/logic/resepSediaan.js', './js/logic/resepJadwal.js',
  './js/logic/rekam.js', './js/logic/labParse.js',
  './js/logic/ucapanAngka.js', './js/logic/ucapanObat.js', './js/logic/ucapanVital.js',
  './js/logic/konfirmasiSuara.js', './js/logic/perintahNavigasi.js',
  './js/logic/pemeriksaan.js', './js/logic/kosakataTertutup.js',
  './js/logic/pencocokJawaban.js', './js/logic/tanyaSatuPerSatu.js',
  './js/logic/pemilihNamaObat.js',
  './js/suara/adaptor.js', './js/suara/mesin.js', './js/suara/whisperEngine.js',
  './js/suara/penjagaAsr.js', './js/suara/offlineEngine.js', './js/suara/webSpeech.js',
  './js/suara/persetujuan.js', './js/suara/tts.js', './js/suara/konfirmasi.js',
  './js/suara/ttsTanya.js', './js/suara/alurTanya.js', './js/suara/navigasiSuara.js',
  './js/suara/penandaPemeriksaan.js',
  './js/ui/dashboard.js', './js/ui/profile.js', './js/ui/settings.js', './js/ui/lock.js',
  './js/ui/visits.js', './js/ui/attachments.js', './js/ui/meds.js', './js/ui/vitals.js',
  './js/ui/chart.js', './js/ui/emergency.js', './js/ui/report.js',
  './js/ui/scan.js', './js/ui/photo-capture.js', './js/ui/scan-review.js',
  './js/ui/suara-pengaturan.js', './js/ui/isi-suara.js', './js/ui/isi-suara-obat.js',
  './js/ui/isi-suara-vital.js', './js/ui/isi-suara-minum.js', './js/ui/tanya-suara.js',
  './js/ui/pemilih-nama-obat.js', './js/ui/pemeriksaan.js',
  './js/ui/status-pemeriksaan.js', './js/ui/bantuan-suara.js'
]
```

- `install`: `cache.addAll(PRECACHE)` lalu `self.skipWaiting()`.
- `activate`: hapus cache lama (prefix `rawatku-`), termasuk `rawatku-vendor-v1` lama,
  `self.clients.claim()`.
- `fetch`: hanya `GET` same-origin. `/health` → network, jangan cache. Navigasi: cache-first
  (`./index.html` fallback) lalu network; app shell: cache-first + perbarui cache dari network.
- `/vendor/*`: **runtime cache** cache-first; bila miss, network lalu simpan ke `VENDOR_CACHE`.
  Jangan precache aset vendor besar saat install. Jangan cache cross-origin/non-GET.
- `/vendor/suara/*` (transformers, ONNX WASM, model) memakai runtime cache yang sama;
  **jangan** precache ±80 MB saat install. Bila model belum pernah dimuat dan perangkat offline,
  UI menampilkan `MODEL_TIDAK_TERSEDIA` dan tetap menawarkan tombol/ketikan.
- Saat offline dan aset vendor OCR belum pernah dipakai, permintaan `/vendor/*` gagal dengan
  jelas; UI menampilkan `OCR_TIDAK_TERSEDIA` dan menawarkan jalur teks.
- Tidak ada push notification, sync, atau request eksternal.
- Registrasi di `app.js`; gagal → abaikan.

---

## 12. Keamanan, Privasi, dan Error

### 12.1 Larangan keras

- Tidak ada `fetch`/`XHR`/`WebSocket`/`sendBeacon` ke jaringan dari kode aplikasi, **kecuali**
  permintaan same-origin `/vendor/*` yang dilakukan Tesseract/Whisper/adaptor dan aset
  same-origin service worker. Tidak ada host eksternal.
- **Tidak ada unduhan model saat runtime.** `env.allowRemoteModels = false`; model Whisper hanya
  ada karena `npm run vendor:whisper` (build-time) dari `huggingface.co` /
  `us.aws.cdn.hf.co`. `statusModel()` hanya membaca manifest same-origin.
- **Satu-satunya aliran audio ke luar perangkat** adalah Web Speech API setelah persetujuan
  eksplisit (8B.4); itu dilakukan oleh peramban, bukan kode aplikasi. Mesin offline tidak pernah
  mengirim audio. Tidak ada endpoint audio di server.
- Tidak ada URL eksternal di HTML/CSS/JS (kecuali namespace SVG `http://www.w3.org/2000/svg`).
- Tidak ada cloud OCR, API key, unggahan foto/teks, atau endpoint AI visi.
- Tidak ada `eval`, `new Function`, inline `<script>`, atau handler inline `onclick=`.
  WebAssembly Tesseract diizinkan lewat `'wasm-unsafe-eval'`, bukan `'unsafe-eval'`.
- Tidak ada data medis di `console.log`, URL, query string, localStorage selain vault, atau
  sessionStorage. Draf pindai hanya di memori.
- Tidak ada klaim medis: dilarang "diagnosis otomatis", "interaksi obat terdeteksi",
  "dosis yang tepat", atau saran pengobatan. Pertanyaan kontrol berbentuk pertanyaan.
- Hasil OCR/parser tidak boleh dipakai sebagai dasar klaim medis; selalu tampilkan disclaimer.

### 12.2 CSP di `index.html`

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer">
```

- `connect-src 'self'` hanya untuk fetch same-origin aset OCR; tidak boleh ada host lain.
- `worker-src 'self' blob:` untuk worker Tesseract; `script-src 'self' 'wasm-unsafe-eval'`
  untuk WebAssembly; Tesseract worker memakai `importScripts` same-origin.
- Semua skrip eksternal same-origin (`<script type="module" src="./js/app.js">`).
- `style-src 'unsafe-inline'` hanya untuk atribut gaya dinamis.
- Web Speech API tidak dipanggil lewat `fetch`; CSP ini tidak mengubah pengiriman audio oleh
  peramban. Karena itu mesin tersebut **nonaktif bawaan** dan hanya aktif setelah persetujuan
  eksplisit yang tercatat (8B.4). Mesin offline tetap same-origin sepenuhnya.

### 12.3 Vault record

`state.js` menyimpan:

```js
// tanpa kata sandi
{
  app: 'rawatku', schemaVersion: 1, encrypted: false,
  updatedAt: ISO, data: state
}

// dengan kata sandi
{
  app: 'rawatku', schemaVersion: 1, encrypted: true, updatedAt: ISO,
  crypto: {
    alg: 'AES-GCM-256', kdf: 'PBKDF2-SHA256', iterations: 310000,
    salt: '<base64>', iv: '<base64>', ciphertext: '<base64>'
  }
}
```

- Saat terkunci: `state` di memori dibuang, key & salt dibuang, `locked=true`.
- Setiap tulis saat terenkripsi memakai **IV baru** dan key sesi yang sama.
- Ganti kata sandi: salt baru + key baru, tulis ulang vault.
- Hapus kata sandi: tulis ulang plaintext, hapus key.
- `state.init()` tidak pernah menulis; vault kosong baru dibuat saat mutasi pertama.
- Vault rusak/tidak dikenal → error `DATA_RUSAK`; UI menampilkan layar fatal (jangan menghapus
  otomatis).
- Foto sumber: metadata tetap plaintext; isi `dataBase64` dienkripsi dengan `sealWithKey`
  memakai key sesi bila vault terenkripsi. Kunci tidak pernah disimpan bersama foto.

### 12.4 Kode error & pesan UI

| Kode | Pesan Indonesia |
|------|------------------|
| `KATA_SANDI_SALAH` | Kata sandi salah. Data tidak diubah. |
| `DATA_RUSAK` | Data tidak dapat dibaca. Jangan hapus apa pun; coba cadangan terakhir. |
| `KRIPTO_TIDAK_TERSEDIA` | Peramban ini tidak mendukung enkripsi yang dibutuhkan. |
| `BUKAN_CADANGAN_RAWATKU` | Berkas ini bukan cadangan Rekam Medisku. |
| `CADANGAN_TERKUNCI` | Cadangan ini terkunci. Masukkan kata sandi cadangan. |
| `VERSI_TIDAK_DIDUKUNG` | Versi berkas tidak didukung aplikasi ini. |
| `DATA_TIDAK_VALID` | Data belum lengkap atau tidak valid. Periksa kembali. |
| `PROFIL_TERAKHIR` | Minimal satu profil harus tetap ada. |
| `PENYIMPANAN_PENUH` | Penyimpanan perangkat penuh. Ekspor cadangan lalu kosongkan ruang. |
| `BATAS_LAMPIRAN` | Lampiran terlalu besar (maks. 1 MB per berkas). |
| `TIPE_TIDAK_DIDUKUNG` | Jenis berkas tidak didukung (JPEG/PNG/WebP/GIF/PDF). |
| `QR_TERLALU_PANJANG` | Data darurat terlalu panjang untuk QR. Ringkas data obat. |
| `TERKUNCI` | Aplikasi terkunci. Masukkan kata sandi. |
| `OCR_TIDAK_TERSEDIA` | OCR lokal tidak tersedia di peramban ini. Gunakan jalur Ketik/Tempel teks. |
| `OCR_GAGAL` | OCR gagal membaca gambar. Coba foto lebih tajam atau Ketik/Tempel teks. |
| `GAMBAR_TIDAK_VALID` | Gambar tidak dapat dibaca. Gunakan JPEG/PNG/WebP. |
| `OCR_TERLALU_BESAR` | Gambar terlalu besar. Kompres atau pilih foto lain. |
| `OCR_CLOUD_NONAKTIF` | OCR cloud tidak diaktifkan. Fitur ini memerlukan persetujuan eksplisit pengguna. |
| `FOTO_TIDAK_VALID` | Foto sumber tidak valid. |
| `FOTO_TERLALU_BESAR` | Foto sumber terlalu besar setelah dikompres. |
| `FOTO_TIDAK_ADA` | Foto sumber tidak ditemukan. |
| `REVIEW_BELUM_DIVERIFIKASI` | Centang "Saya sudah mencocokkan" sebelum menyimpan. |
| `DRAF_TIDAK_ADA` | Tidak ada draf pindai. Mulai dari layar Pindai. |
| `PARSER_TIDAK_MENGENALI` | Teks belum dapat dikenali. Sunting manual atau tempel teks yang lebih jelas. |
| `SUARA_TIDAK_TERSEDIA` | Pengenalan suara tidak tersedia. Gunakan tombol dan isian biasa. |
| `MIKROFON_DITOLAK` | Izin mikrofon ditolak. Semua fitur tetap dapat dipakai dengan tombol dan keyboard. |
| `SUARA_GAGAL` | Suara tidak dapat diproses. Coba lagi atau gunakan isian biasa. |
| `SUARA_TIMEOUT` | Tidak ada suara yang terdengar. Tekan Mulai bicara lalu ucapkan lagi. |
| `SUARA_KOSONG` | Tidak ada ucapan yang dikenali. Coba lagi dengan suara lebih jelas. |
| `MESIN_TIDAK_DIKENAL` | Mesin suara tidak dikenali. Pilih mesin di Pengaturan Suara. |
| `PERSETUJUAN_DIPERLUKAN` | Mesin bawaan peramban memerlukan persetujuan eksplisit sebelum dipakai. |
| `MODEL_TIDAK_TERSEDIA` | Model suara offline (Whisper base) belum tersedia. Jalankan `npm run vendor:whisper` atau gunakan tombol/isian biasa. |
| `ASR_TIDAK_TERDENGAR` | Tidak terdengar dengan jelas. Ulangi jawaban singkat atau pilih tombol. |
| `ASR_TERLALU_LAMA` | Rekaman terlalu lama. Jawab maksimal delapan detik. |
| `ASR_BERULANG` | Suara terdengar berulang/tidak jelas. Ulangi atau pilih tombol. |
| `NAMA_TIDAK_VALID` | Nama obat tidak valid. Pilih dari daftar, ketik, atau eja huruf per huruf. |
| `TANYA_TIDAK_VALID` | Jawaban di luar pilihan. Pilih tombol atau ulangi dengan kalimat singkat. |
| `JAWABAN_TIDAK_DIKENAL` | Jawaban belum dikenali. Silakan pilih tombol atau ketik jawaban. |
| `TTS_TIDAK_TERSEDIA` | Pembaca suara tidak tersedia. Bacaan ditampilkan sebagai teks; konfirmasi tetap wajib. |
| `PEMERIKSAAN_TIDAK_VALID` | Nama pendamping dan pernyataan pemeriksaan wajib diisi dengan benar. |
| `PAGAR_DOSIS_TIDAK_WAJAR` | Takaran atau frekuensi dari ucapan di luar batas wajar. Periksa dan sunting manual. |

Semua `Error` kustom menyimpan `.code`; UI menampilkan `.message` dan boleh menambahkan saran.
Jangan menampilkan stack trace.

---

## 13. State API (`app/js/state.js` — t1)

```js
import * as cryptoModule from './crypto.js';
import * as backupApi from './backup.js';
import { createStorage } from './storage.js';
import { createPhotoStore } from './photos.js';

export function createState({
  storage = createStorage(),
  cryptoApi = cryptoModule,
  clock = () => new Date(),
  kdfIterations = 310000,
  photoStore = createPhotoStore()
} = {})
```

`state.js` memakai `cryptoApi.deriveKey`, `sealWithKey`, `openWithKey`, `toBase64`,
`fromBase64`, `cryptoAvailable`, dan `CryptoError`; serta `backupApi.createBackup` dan
`readBackup`.

Objek yang dikembalikan:

```js
{
  async init(),             // -> { locked, encrypted, hasVault, kind, photoKind }
  isLocked(),
  isEncrypted(),
  hasVault(),
  getState(),
  getActiveProfile(),
  getProfile(id),
  list(collection, { profileId } = {}),
  async unlock(password),
  async lock(),
  async setPassword(password),
  async removePassword(),
  async addProfile(input),
  async updateProfile(id, patch),
  async removeProfile(id),
  async setActiveProfile(id),
  async upsert(collection, item),
  async remove(collection, id),
  async logDose({ medicationId, date, time, status = 'taken' }),
  async saveSourcePhoto({ profileId = null, kind = 'resep', mime, dataBase64, width = null, height = null }),
  async getSourcePhoto(id),
  async listSourcePhotos({ profileId = null } = {}),
  async deleteSourcePhoto(id),
  async setSettings(patch),
  async exportBackup({ password = null } = {}),
  async importBackup(text, { password = null } = {}),
  async getStorageInfo(),   // -> { kind, bytes, photoKind, photoBytes }
  async resetAll(),
  subscribe(listener)
}
```

Perilaku:

- Semua operasi baca/tulis data (`getState`, `getActiveProfile`, `list`, `upsert`, `remove`,
  `logDose`, `setSettings`, `exportBackup`, `importBackup`, `resetAll`, dan semua operasi foto)
  saat `locked` → error `TERKUNCI`. `lock()` pada vault tanpa kata sandi adalah no-op.
- `init`: baca `storage.get()`.
  - null → state kosong, `hasVault:false`, `locked:false`, `encrypted:false`.
  - plaintext valid (`record.data`) → normalize, `hasVault:true`, `locked:false`.
  - terenkripsi → metadata dimuat, `locked:true`, state tidak ada di memori.
  - rusak → lempar `DATA_RUSAK`.
  - `photoStore.init()` dipanggil; `photoKind` diisi.
- `unlock`: validasi password non-kosong; derive key; buka; normalize; simpan key + salt +
  iterations di memori; `locked=false`; notifikasi. Gagal → `KATA_SANDI_SALAH`.
- `lock`: hanya jika tidak terkunci; kosongkan state/key/salt; `locked=true`.
- `setPassword`: hanya saat terbuka & `cryptoAvailable()`; salt 16 byte baru, derive key;
  simpan vault terenkripsi; update sesi. **Foto yang sudah ada tidak dienkripsi ulang otomatis**
  pada versi ini; foto baru memakai enkripsi. UI wajib menjelaskan.
- `removePassword`: hanya saat terbuka; kosongkan key/salt; simpan plaintext. Foto terenkripsi
  lama tetap membutuhkan kunci; bila tidak ada key, `getSourcePhoto` → `DATA_RUSAK` dan UI
  menyarankan foto tidak dapat dibuka. (Hindari kehilangan: UI memperingatkan sebelum menghapus
  kata sandi.)
- `upsert`: `collection` ∈ ITEM_COLLECTIONS; `profileId` dari item/profil aktif; validasi
  `validateItem`; simpan vault; notifikasi. Khusus `visits`: validasi ulang lampiran.
- `remove`: hapus item; simpan; notifikasi. Foto sumber **tidak** otomatis dihapus.
- `logDose`: id deterministik; `takenAt = clock().toISOString()`; tidak mengubah stok.
- `addProfile`/`updateProfile`/`removeProfile`/`setActiveProfile`: seperti sebelumnya.
  `removeProfile` juga menghapus semua foto `profileId` tersebut via `photoStore.list` +
  `delete` (best effort; kegagalan penghapusan foto tidak boleh menghapus item lain).
- `saveSourcePhoto`:
  - `profileId` default aktif; harus ada.
  - `kind` ∈ SCAN_KINDS; `mime` ∈ ALLOWED_SOURCE_PHOTO_MIME.
  - `dataBase64` string non-kosong; decoded bytes ≤ MAX_SOURCE_PHOTO_BYTES.
  - Bila sesi terenkripsi & key ada:
    `envelope = await cryptoApi.sealWithKey({ dataBase64 }, key)`; record
    `{ dataBase64:null, crypto:envelope, encrypted:true, ... }`.
  - Bila tidak: `{ dataBase64, crypto:null, encrypted:false }`.
  - `id = newId('pho')`, `bytes`, `width`, `height`, `createdAt`, `updatedAt`;
    `await photoStore.put(record)`; notifikasi `{ type:'photo-saved', id }`; return record
    **tanpa** `dataBase64` (hanya metadata + id).
  - Jangan pernah menulis dataBase64 ke vault/state/localStorage.
- `getSourcePhoto(id)`:
  - `record = await photoStore.get(id)`; null → `FOTO_TIDAK_ADA`.
  - Bila `record.encrypted`: butuh key sesi; bila locked → `TERKUNCI`; bila tidak ada key →
    `DATA_RUSAK`; `openWithKey(record.crypto, key)` → `{ dataBase64 }`; kembalikan record +
    `dataBase64`.
  - Bila plain → kembalikan record apa adanya.
- `listSourcePhotos`: metadata saja (tanpa `dataBase64`), filter profil, urut `createdAt` turun.
- `deleteSourcePhoto`: hapus record; notifikasi; item yang menunjuk `photoId` tidak diubah
  (UI menampilkan "foto tidak tersedia").
- `setSettings`/`exportBackup`/`importBackup`/`resetAll` seperti sebelumnya.
  `resetAll` juga `await photoStore.clear()`.
  `exportBackup`/`importBackup` tidak menyertakan byte foto; `meta.photoCount` dihitung dari
  `photoStore.list`.
- `getStorageInfo`: `{ kind, bytes, photoKind: photoStore.kind, photoBytes }`.
- `subscribe`: listener setelah perubahan; error listener diisolasi; unsubscribe idempoten.
- `getState()` mengembalikan objek state aktif; UI tidak boleh memutasi langsung.
- **Field aditif suara (8B/4.4)** tidak diubah oleh `validateItem`; `state.upsert` menyimpannya
  apa adanya. Modul baru wajib memanggil `normalisasiPengaturanSuara`/`pastikanPemeriksaan`
  sebelum membaca. `state.setSettings({ suara: {...} })` menerima objek bersarang dan mengganti
  `settings.suara` secara utuh; UI wajib mengirim salinan lengkap hasil normalisasi.
- `state.upsert('medications', item)` **tidak** boleh menaikkan `pemeriksaanOrangLain.status`;
  hanya layar Pemeriksaan Pendamping yang boleh mengirim status `'sudah'` beserta nama/waktu/
  pernyataan. Entri suara selalu dikirim dengan status `'belum'`.
- Tidak ada API penyimpanan audio/transkrip. Draf suara hanya di memori layar dan dibuang saat
  batal/simpan/reload.

Helper murni:

```js
export function findActiveMedications(state, profileId, now = new Date())
export function getDoseLogMap(doseLogs)
```

---

## 14. Pengujian & `verify.sh`

### 14.1 Berkas test

`npm test` = `node --test tests/*.test.js`. Semua test memakai `node:test` +
`node:assert/strict`. Tidak ada dependency test, tidak ada DOM, tidak ada jaringan. Waktu diuji
dengan `new Date(2026, 10, 9, 7, 0, 0)` (lokal).

**tests/logic.test.js** (t16) wajib mencakup:

- `dates`: format/parse, `addDays`, `diffDays`, `startOfWeek` (Senin), `weekKey`, validasi.
- `schedule`: aktif/nonaktif berdasarkan tanggal & hari; `times` kosong; dua obat urut jam;
  `applyDoseLogs` status taken/skipped/missed/pending dengan grace; `summarizeDoses` percent;
  `nextDose`; `formatSchedule`.
- `stock`: `{ today: '2026-11-09' }`; 30 tablet 2×/hari → `runOutDate='2026-11-24'`,
  `daysLeft=15`, `refillByDate='2026-11-21'`; stok null; nonaktif; urutan `predictRefills`.
- `adherence`: due vs future, status, history, label.
- `safety`: normalisasi, duplikasi aktif, `flagValue`, `resolveRange` terbaru, `flagVital`,
  `flagLab`.
- `vitals`: seri, limit, stats, trend, format, grup lab.
- `summary`: ringkasan lengkap, pertanyaan relevan, `isMedicalAdvice === false`, tanpa saran dosis.

**tests/resep.test.js** (t15) wajib mencakup **sedikitnya 40 kasus** dari
`tests/fixtures/resep-cases.js`. Setiap kasus:

```js
{
  id: 'r01',
  teks: 'Amlodipin 5 mg 3 dd 1 tab pc selama 5 hari',
  harapan: {
    nama: 'Amlodipin',
    kaliSehari: 3,
    takaranPerDosis: 1,
    bentukSediaanKode: 'tab',
    kekuatan: { nilai: 5, satuan: 'mg' },
    aturanMakan: 'sesudah',
    durasiHari: 5,
    jadwalJam: ['07:00','13:00','19:00'],
    teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet, sesudah makan, selama 5 hari'
  }
}
```

Kasus wajib mencakup minimal:
- `3 dd 1`, `3x1`, `3 x 1 tab`, `S 3 dd tab I`, `S.2.d.d.C.I`, `1-0-1`;
- `p.c.`/`pc`, `a.c.`, `d.c.`, `h.s.`, `prn`/`k.p.`, `mane`, `nocte`;
- bentuk `tab`, `caps`, `syr`, `cth`/sendok teh, `gtt`/tetes, `supp`, `ung`/salep, `inj`;
- satuan `mg`, `mcg`, `g`, `ml`;
- durasi `selama 5 hari`, `x 7 hari`;
- jumlah `No. 10`, `#20`;
- kombinasi multi-obat, nama dengan angka, teks tanpa frekuensi (harus menandai tidak dipahami),
  dan teks acak (confidence rendah).
Test juga memverifikasi:
- `kenaliResep` deterministik (dua panggilan sama),
- `ObatTerjemahan` memuat semua bidang wajib,
- `jadwalBawaan(3)` → `['07:00','13:00','19:00']`, `jadwalBawaan(5)` sesuai kontrak,
- `obatKeMedication` menghasilkan `times`, `stock`, `endDate`, `source` benar,
- `parseFrekuensi`/`parseAturanMakan` unit-level,
- tidak ada kata saran dosis pada `teksTerjemahan`.

**tests/scan.test.js** (t16) wajib mencakup:

- `kenaliTeks` dengan fake engine: hasil `{teks, kepercayaan, baris}` benar; confidence 0–100
  dinormalisasi; baris kosong dibuang; `onProgress` dipanggil; `terminate` dipanggil.
- Engine fake melempar → `OCR_GAGAL`; tidak ada penulisan storage (fake state tidak dipakai).
- `createCloudOcrAdapter()` → `OCR_CLOUD_NONAKTIF`; modul tidak memuat URL eksternal.
- `resepSediaan`/`resepJadwal`: semua pola frekuensi dan tabel jadwal.
- `rekam.js`/`labParse.js`: dokumen contoh menghasilkan tanggal/faskes/dokter/diagnosis tertulis
  dan lab nama-nilai-satuan-rujukan; tidak menambah diagnosis; `rekamKeKunjungan`/`labKeLab`
  mengisi `source` dengan `verifiedByUser` sesuai `verifiedAt`.
- `scanSession`: set/get/clear, satu draf, listener; tidak menyentuh storage.
- `photos.js`: `createPhotoStore({indexedDB:null})` → `kind='memory'`; put/get/list/delete/
  clear/usage; validasi mime/ukuran; `state.saveSourcePhoto` dengan krypto memory (iterations
  1000) menyimpan `crypto` dan `getSourcePhoto` mengembalikan base64; locked → `TERKUNCI`;
  `removeProfile` menghapus foto profil; `resetAll` mengosongkan.
- `model`: `validateSourceMeta` menerima/menolak bentuk yang benar; `normalizeState` mengisi
  `source:null` pada item lama; `source` invalid di-reset null.

**tests/ucapan.test.js** (t17) wajib mencakup **sedikitnya 40 kasus** dari
`tests/fixtures/ucapan-cases.js`:
- Angka: nol–dua puluh, puluhan, ratusan, `koma`, `setengah`, `seperempat`, `dua setengah`,
  `seratus empat puluh per sembilan puluh`; digit dan koma/titik desimal; determinisme.
- Obat: minimal 10 dikte (mg/mcg/g/ml, frekuensi 1–4, takaran 0.5/1/1.5/2.5, tablet/kapsul/
  sendok teh/tetes, aturan sebelum/sesudah/saat/bila perlu); `dikteKeTeksResep` → `kenaliResep`
  menghasilkan `ObatTerjemahan` yang sama dengan jalur teks; field wajib lengkap.
- Vital: semua jenis, termasuk contoh persis `"tensi seratus empat puluh per sembilan puluh"` →
  `{systolic:140, diastolic:90}`; ucapan tak dikenal → `null` (bukan menebak).
- Pagar: `takaranPerDosis: 4.5` → `TAKARAN_TIDAK_WAJAR`; `kaliSehari: 9` →
  `FREKUENSI_TIDAK_WAJAR`; nilai wajar → `ok:true`.
- `ucapkanAngka(12.5)` → `'dua belas koma lima'`; tidak ada kata saran dosis/diagnosis.

**tests/suara.test.js** (t27) wajib mencakup:
- `kenaliSuara` dengan fake engine: `{teks, kepercayaan, mesin}` benar, confidence 0–100
  dinormalisasi, `start`/`stop`/`terminate` dipanggil, `SUARA_KOSONG`/`SUARA_TIMEOUT`/abort.
- Adaptor tidak menulis storage dan tidak memuat URL eksternal; `engineImpl` dapat diinjeksi.
- `MESIN_SUARA['web-speech'].enabled === false`; `createAdaptorSuara({mesin:'web-speech'})` tanpa
  persetujuan → `PERSETUJUAN_DIPERLUKAN`; `webSpeechTersedia()` false tanpa API.
- `berikanPersetujuan`/`cabutPersetujuan` menulis dan mencabut `settings.suara`, versi berlaku,
  `cabut` memaksa offline; `normalisasiPengaturanSuara` tidak pernah mengaktifkan web-speech.
- `klasifikasiJawaban` + `jawabKonfirmasi`: "ya"/"benar" → simpan; "tidak"/"salah" → ulangi-entri;
  "lain" ke-1 dan ke-2 → tanya-ulang (maks. 2 pertanyaan ulang), "lain" ke-3 → batal; tidak pernah
  simpan pada jawaban ambigu; sesi selesai idempoten; objek tidak dimutasi.
- `jalankanKonfirmasiSuara` dengan fake adaptor+tts: `berhenti` dipanggil sebelum setiap TTS,
  `mulai` setelah; tidak ada pendengaran saat TTS; keputusan akhir benar.
- `teksUlangObat` memuat nama, dosis, frekuensi, takaran, aturan, jadwal, dan label
  "belum diperiksa"; `teksUlangVital`/`teksUlangMinum`/`teksUlangJadwal` memuat status pemeriksaan.
- `kenaliPerintah`: semua frasa kontrak, `bantuan`, `berhenti`, perintah tak dikenal → null;
  deterministik; tidak ada perintah medis.
- `pemeriksaan`: `tandaiSudahDiperiksa` menolak nama kosong/pernyataan salah/waktu invalid;
  `tandaiBelumDiperiksa` mereset; `normalisasiPemeriksaan` tidak pernah menaikkan status;
  `labelPemeriksaan`/`ringkasPemeriksaan` benar; entri suara berakhir `'belum'`.
- `verify.sh` diperbarui untuk memeriksa `public/vendor/suara/manifest.json` + `entry` dan MIME
  `.wasm` suara; tes tidak membutuhkan jaringan/model nyata.

**tests/penjaga-asr.test.js** (t34) wajib mencakup:

- `periksaDurasi(8000)` → `ok:true`; `8501` → `ASR_TERLALU_LAMA`; nilai negatif/NaN ditolak.
- Teks kosong/whitespace → `ASR_TIDAK_TERDENGAR`; > 240 karakter atau > 48 token →
  `ASR_TIDAK_TERDENGAR` alasan `terlalu-panjang`.
- Pengulangan: `'2.2.2.2.2.2.2.2'`, `'bla bla bla bla bla'`, `'aaaaaaa'` → `ASR_BERULANG`;
  kalimat wajar yang mengulang satu kata 2 kali tidak ditolak.
- Rasio huruf rendah (mis. `'#@$%^&*()'`) → `ASR_TIDAK_TERDENGAR`; teks pendek `'2'`/`'12'`
  tetap lolos (jawaban angka).
- `periksaHasilAsr({teks, durasiMs})` menggabungkan durasi dan keluaran; tidak memutasi input;
  deterministik.
- `ringkasTolakAsr` mengembalikan pesan Indonesia untuk setiap kode.
- **Integrasi adaptor**: fake engine yang mengembalikan `'2.2.2.2.2.2.2.2'` → `kenaliSuara`
  melempar `SuaraError` `ASR_BERULANG`; hasil palsu tidak pernah dikembalikan sebagai `teks`.
  Fake engine dengan `durasiMs` > 8500 → `ASR_TERLALU_LAMA`; `stop`/`terminate` tetap dipanggil.

**tests/tanya.test.js** (t34) wajib mencakup:

- **Korpus ≥ 60** dari `tests/fixtures/tanya-cases.js`; setiap kasus
  `{ id, pertanyaan, ucapan, harapan: { status, nilai } }`. Wajib termasuk:
  `'Dua Kalisahari'`→frekuensi 2, `'Semelum'`→sebelum, `'sahurabla'`→`tidak-cocok`,
  `'dua kali sehari'`/`'2 kali'`, `'setengah'`/`'satu setengah'`/`'dua koma lima'`,
  `'pagi dan malam'`→`['pagi','malam']`, `'sebelum tidur'`→`['sebelum-tidur']`,
  `'kalau perlu'`→true, `'tidak perlu'`→false, minimal 8 kasus negatif lintas-pertanyaan,
  dan minimal 4 kasus ambigu.
- Pencocok tidak pernah mengembalikan nilai di luar `pilihan`; deterministik; `'pagi'` untuk
  `frekuensi` dan `'dua kali sehari'` untuk `aturanMakan` → `tidak-cocok`.
- `tanyaSatuPerSatu`: langkah `nama` menolak `jawabTanya(...,{sumber:'suara'})` dengan
  `aksi:'tolak-nama-dari-suara'` dan tidak mengubah nama; nama dari tombol/ketikan diterima.
- Lima jawaban valid maju langkah; `gagalPaham` maksimum 2; kegagalan ke-1 `ulangi`, ke-2
  `tombol`; `pilihJawabanTombol`/`ketikJawaban` selalu dapat menyelesaikan; objek sesi lama
  tidak dimutasi.
- `ringkasSesi` memuat nama, takaran, frekuensi, aturan makan, waktu, "hanya kalau perlu", dan
  "belum diperiksa"; angka memakai `ucapkanAngka`.
- `selesaikanSesi(...,{simpan:true})` hanya setelah semua jawaban; `medication` memuat
  `dibuatDengan:'suara'`, `dikonfirmasiDengan:'suara'`, `pemeriksaanOrangLain.status:'belum'`,
  `source:null`, `stock.unitsPerDose` benar, `times:[]` bila `bilaPerlu:true`; `simpan:false` →
  `medication:null`; pagar > 4 tablet / > 8 kali → `TANYA_TIDAK_VALID` (walau kosakata tertutup).
- `pemilihNamaObat`: daftar/pindai dibaca satu per satu (`'<nama>? ya atau tidak'`), ya/tidak/lain;
  `ketikNama` menolak nama invalid; ejaan huruf/nama huruf, hapus, selesai, konfirmasi ya/tidak;
  nama tidak pernah berasal dari teks ASR.
- `alurTanya` dengan fake adaptor/tts/state: TTS pertanyaan sebelum mikrofon, `berhenti()` sebelum
  TTS, `mulai()` setelah; ASR guard ditolak dihitung sebagai gagal paham; konfirmasi persis
  `PERTANYAAN_KONFIRMASI`; `state.upsert` **hanya** dipanggil pada keputusan `simpan`; batal/ulangi
  tidak menulis apa pun; tidak ada request jaringan.
- `ttsTanya`: lima pertanyaan persis; `teksNamaDariDaftar('Captopril')` →
  `'Captopril? ya atau tidak'`; `teksKonfirmasiTanya` memuat `PERTANYAAN_KONFIRMASI`.

**tests/whisper-integration.test.js** (t34) — **opsional, jelas di-skip**:

- Cek keberadaan `public/vendor/suara/models/Xenova/whisper-base/onnx/encoder_model_quantized.onnx`
  dan `decoder_model_merged_quantized.onnx` serta `node_modules/@huggingface/transformers`.
  Bila tidak ada → `t.skip('Model Whisper lokal tidak tersedia; jalankan npm run vendor:whisper')`.
- Bila ada: set `env.allowRemoteModels=false`, `env.allowLocalModels=true`,
  `env.localModelPath` absolut ke `public/vendor/suara/models/`, muat pipeline q8, jalankan
  transkripsi pada `Float32Array` sintetis 1 detik (mis. nol/tona rendah), dan pastikan hasilnya
  string tanpa crash. Patch `globalThis.fetch` agar request host eksternal melempar; test gagal
  bila ada unduhan. Batas waktu wajar (≤ 120 detik) dan tidak dijalankan bila model tidak ada.
- `statusModel()` dengan fake `fetchImpl`: manifest `engine:'whisper'` + 12 files → `'siap'`;
  files kurang → `'belum'`; 404/JSON rusak → `'tidak-ada'`; tidak memuat model.

**tests/dom-a11y.test.js** (t27) wajib mencakup (memakai `tests/helpers/fake-dom.js` minimal,
tanpa dependency):
- Setiap layar suara/pemeriksaan/bantuan dirender ke DOM palsu; setiap `input`/`select`/`textarea`
  punya `<label for>` atau `aria-label`; setiap `button` punya nama aksesibel.
- `#suara-live`, `#pemeriksaan-live`, `#bantuan-suara-live` memiliki `role="status"` dan
  `aria-live="polite"`; `#suara-error`/`#pemeriksaan-error` memiliki `role="alert"`.
- Urutan fokus alur suara: mulai → hasil → konfirmasi → simpan/batal; tombol konfirmasi besar
  dan berlabel "Ya, benar"/"Tidak".
- Jumlah minimal tombol 48 px dapat diperiksa lewat kelas `voice-big-button`/token CSS statis.
- ID wajib 9.4.9–9.4.12 ada di layar yang sesuai; tidak ada `onclick=`/`innerHTML` data pengguna.
- Pemeriksaan statis: tidak ada `SpeechRecognition`/`getUserMedia` di luar `suara/` dan
  `photos.js`/`photo-capture.js`; tidak ada URL eksternal baru.

**tests/security.test.js** (t16) wajib mencakup:

- `crypto`: roundtrip dengan `iterations: 1000`; envelope; password salah; base64 roundtrip.
- `backup`: plain/terenkripsi; semua kode error; filename; `meta.photoCount`.
- `qr`: `encodeQR('RAWATKU')` version 1 size 21; finder pattern; determinisme; kapasitas;
  `emergencyPayload` ≤ 200 bytes + 112/119; SVG aman.
- **Sumber aplikasi tidak memuat URL eksternal**: baca `app/index.html`, `app/js/**/*.js`,
  `app/css/*.css`; hanya izinkan `http://www.w3.org/2000/svg` dan path `/vendor/`.
  `connect-src` harus `'self'`, bukan `*`/`https:`.
- CSP memuat `'wasm-unsafe-eval'`, `worker-src 'self' blob:`, `connect-src 'self'`.
- `OCR_ENGINES.cloud.enabled === false`; `createCloudOcrAdapter` melempar; tidak ada API key.
- `public/vendor/manifest.json` (bila ada) tidak memuat URL eksternal; semua `files[].path`
  berada di dalam folder vendor.
- Tidak ada `sessionStorage`/`localStorage` untuk draf pindai (grep sumber scan).

**tests/platform.test.js** (t16) wajib mencakup:

- `model`: factories; validasi visit tanpa tanggal/attachment > 1 MiB; `normalizeState`; id.
- `storage`: memory/localStorage; put/get/clear/usage.
- `state`: memory + clock tetap + `kdfIterations:1000`; init kosong; upsert visit/medication;
  instance baru membaca data; `setPassword` lock/unlock; backup; `removeProfile` cascade;
  `logDose` idempoten; `saveSourcePhoto`/`getSourcePhoto`/`deleteSourcePhoto`.
- `server`: `createServer()` listen port 0; `/health`; `/`; `/js/app.js`; manifest; 404; 405;
  traversal; **vendor**: buat `vendorDir` sementara berisi `manifest.json` dan `dummy.wasm`;
  `GET /vendor/manifest.json` → 200 JSON; `GET /vendor/dummy.wasm` →
  `application/wasm`; `/vendor/../...` → 404; tutup server.

### 14.2 `verify.sh` (t16/t27, diperbarui t34)

Wajib executable, `set -euo pipefail`, dijalankan dari root proyek:

0. **Cek vendor OCR dan Whisper.** Bila tidak lengkap, cetak
   `Jalankan npm install && npm run vendor:ocr && npm run vendor:whisper` lalu exit 1.
   - `public/vendor/manifest.json` + semua berkas `entry` OCR ada dan non-kosong.
   - `public/vendor/suara/manifest.json` ada dan JSON valid; `engine === 'whisper'`;
     `model.id === 'Xenova/whisper-base'`; `model.quantization === 'q8'`;
     `runtimeExternalRequests === 0`; `entry.module`, `entry.wasmPath`, `entry.modelPath` ada.
   - `public/vendor/suara/transformers/transformers.min.js`,
     `public/vendor/suara/onnx/ort-wasm-simd-threaded.wasm`, dan
     `public/vendor/suara/onnx/ort-wasm-simd-threaded.mjs` ada dan non-kosong.
   - **Semua 12 berkas model** di `public/vendor/suara/models/Xenova/whisper-base/` ada dan
     non-kosong: `config.json`, `generation_config.json`, `preprocessor_config.json`,
     `tokenizer.json`, `tokenizer_config.json`, `vocab.json`, `merges.txt`, `normalizer.json`,
     `added_tokens.json`, `special_tokens_map.json`, `onnx/encoder_model_quantized.onnx`,
     `onnx/decoder_model_merged_quantized.onnx`. Kedua `.onnx` wajib > 1 MB.
   - Isi `public/vendor/suara/` hanya boleh `manifest.json`, `transformers/`, `onnx/`, dan
     `models/`; tidak boleh ada folder/berkas ASR lama, berkas 0 byte, atau string `PLACEHOLDER`
     di manifest.
   - Grep statis (hanya berkas aplikasi/skrip, **bukan** `plan.json`/`CONTRACT.md`):
     `package.json`, `scripts/`, `app/`, `README.md`, `verify.sh` tidak boleh memuat nama mesin
     ASR lama, skrip vendoring lama, atau perintah vendoring lama.
1. `node --test tests/*.test.js` (semua test, termasuk `tanya.test.js`,
   `penjaga-asr.test.js`; `whisper-integration.test.js` boleh skip bila model tidak ada).
2. Jalankan `PORT=3210 HOST=127.0.0.1 node server.js` di background; trap kill.
3. Tunggu `GET /health` 200 (maks. ± 5 detik).
4. Smoke test dengan `node --input-type=module -e`:
   - `/health` → 200, JSON `status === 'ok'`, `app === 'rawatku'`, `version === '1.1.0'`.
   - `/` → 200, body memuat `Rekam Medisku`.
   - `/js/app.js` → 200, content-type memuat `javascript`.
   - `/manifest.webmanifest` → 200, memuat `"name"`.
   - `/tidak-ada` → 404; `POST /health` → 405.
   - `/vendor/manifest.json` → 200, JSON memuat `entry`; baca manifest OCR, ambil `.wasm` pertama,
     `GET` → content-type `application/wasm`.
   - `/vendor/suara/manifest.json` → 200 JSON, `engine === 'whisper'`,
     `runtimeExternalRequests === 0`.
   - `GET /vendor/suara/transformers/transformers.min.js` → 200, content-type memuat
     `javascript`.
   - `GET /vendor/suara/onnx/ort-wasm-simd-threaded.wasm` → 200,
     content-type `application/wasm`.
   - `GET /vendor/suara/models/Xenova/whisper-base/onnx/encoder_model_quantized.onnx` → 200,
     content-type `application/octet-stream`; lakukan juga untuk `decoder_model_merged_quantized.onnx`.
   - `GET /vendor/suara/unknown/berkas-lama.js` → 404 (path ASR lama tidak dilayani); pastikan tidak ada
     direktori di luar `transformers/`, `onnx/`, `models/`, dan `manifest.json`.
   - `/vendor/../server.js` (encoded) → 404.
5. Cetak `SEMUA VERIFIKASI LULUS` dan keluar 0 bila semua lulus; cetak log server bila gagal.

Tidak boleh ada test yang bergantung pada jaringan eksternal. `npm install`/vendoring adalah
langkah persiapan terpisah, bukan bagian `verify.sh`. `verify.sh` **tidak boleh** menjalankan
`npm run vendor:whisper` (tidak ada unduhan saat verifikasi).

---

## 15. Matriks Tanggung Jawab & Integrasi

| Tugas | Berkas | Bergantung pada kontrak bagian |
|-------|--------|-------------------------------|
| t1 database | `model.js`, `storage.js`, `state.js`, `crypto.js`, `backup.js` | 4, 5.1, 6, 12.3, 13 |
| t2 backend | `logic/dates.js`, `schedule.js`, `stock.js`, `adherence.js` | 7.1–7.4 |
| t3 backend | `logic/safety.js`, `vitals.js`, `summary.js` | 4, 7.5–7.7 |
| t4 frontend | `index.html`, `style.css`, `app.js`, `dom.js` | 9.1–9.3, 10.1, 12.2 |
| t5 frontend | `ui/dashboard.js`, `profile.js`, `settings.js`, `lock.js` | 9.4, 13 |
| t6 frontend | `ui/visits.js`, `attachments.js`, `meds.js`, `vitals.js`, `chart.js` | 4, 7, 9.4, 13 |
| t7 frontend | `qr.js`, `ui/emergency.js`, `ui/report.js`, `print.css`, `icons/icon.svg` | 7.7, 8, 9.4, 10.2, 11.1 |
| t8 devops | `package.json`, `server.js`, `README.md`, `app/sw.js`, `app/manifest.webmanifest` | 2, 3, 11 |
| t9 backend | `logic/resepKamus.js`, `logic/resep.js` | 4, 7.8, 7.9 |
| t10 backend | `logic/resepSediaan.js`, `logic/resepJadwal.js` | 4, 7.2, 7.9 |
| t11 backend | `logic/rekam.js`, `logic/labParse.js` | 4, 7.1, 7.10 |
| t12 frontend/ocr | `scripts/vendor-ocr.mjs`, `ocr/adaptor.js`, `ocr/tesseractEngine.js`, `public/vendor/` | 8A, 12.2 |
| t13 frontend | `photos.js`, `scanSession.js`, `ui/scan.js`, `ui/photo-capture.js` | 5.2, 8A, 9.4, 9.5, 13 |
| t14 frontend | `ui/scan-review.js` | 4, 7.8–7.10, 8A, 9.4, 13 |
| t15 backend | `tests/resep.test.js`, `tests/fixtures/resep-cases.js` | 7.8–7.9, 14.1 |
| t16 qa | `tests/logic.test.js`, `security.test.js`, `platform.test.js`, `scan.test.js`, `verify.sh` | seluruh dokumen |
| t17 backend | `logic/ucapanAngka.js`, `ucapanObat.js`, `ucapanVital.js`, `tests/ucapan.test.js`, `tests/fixtures/ucapan-cases.js` | 8B.7, 14.1 |
| t18 frontend | `suara/adaptor.js`, `suara/mesin.js`, `ui/suara-pengaturan.js` | 8B.2, 8B.10, 9.4.9 |
| t19 frontend | `suara/webSpeech.js`, `suara/persetujuan.js` | 8B.4 |
| t20 devops (artefak ASR lama; digantikan t28/t29) | `package.json`, `suara/offlineEngine.js`, `public/vendor/suara/`, `app/sw.js` | 2, 3, 8B.3, 11.2 |
| t21 frontend | `logic/konfirmasiSuara.js`, `suara/tts.js`, `suara/konfirmasi.js` | 8B.5, 8B.6 |
| t22 frontend | `ui/isi-suara.js`, `ui/isi-suara-obat.js`, `ui/isi-suara-vital.js`, `ui/isi-suara-minum.js` | 8B.2–8B.7, 9.4.10 |
| t23 frontend | `logic/perintahNavigasi.js`, `suara/navigasiSuara.js` | 8B.8 |
| t24 backend | `logic/pemeriksaan.js`, `suara/penandaPemeriksaan.js` | 4.4, 8B.9 |
| t25 frontend | `ui/pemeriksaan.js`, `ui/status-pemeriksaan.js`, `ui/meds.js`, `ui/dashboard.js`, `ui/report.js` | 8B.9, 9.4.11 |
| t26 frontend | `index.html`, `app.js`, `a11y.js`, `ui/bantuan-suara.js`, `css/suara.css` | 9.3, 9.4.12, 10.1, 10.3 |
| t27 qa | `tests/suara.test.js`, `tests/dom-a11y.test.js`, `tests/helpers/fake-dom.js`, `verify.sh` (diperbarui t34) | 8B, 10.3, 14 |
| t28 devops | `package.json`, `scripts/vendor-whisper.mjs`, `public/vendor/suara/`, `app/sw.js` | 2, 3, 8B.3, 11.2 |
| t29 backend | `suara/whisperEngine.js`, `suara/penjagaAsr.js`, `suara/offlineEngine.js`, `suara/adaptor.js`, `server.js` | 3.2, 8B.2, 8B.3, 8B.11, 12.1 |
| t30 backend | `logic/kosakataTertutup.js`, `logic/pencocokJawaban.js` | 8B.12 |
| t31 backend | `logic/tanyaSatuPerSatu.js`, `logic/pemilihNamaObat.js` | 8B.13, 8B.14 |
| t32 frontend | `ui/tanya-suara.js`, `ui/pemilih-nama-obat.js`, `ui/suara-pengaturan.js`, `css/suara.css`, `app.js` | 9.3, 9.4.9, 9.4.13, 10.1, 10.3 |
| t33 frontend | `suara/alurTanya.js`, `suara/ttsTanya.js`, `ui/isi-suara.js`, `ui/isi-suara-obat.js` | 8B.6, 8B.15, 9.4.10 |
| t34 qa | `tests/tanya.test.js`, `tests/fixtures/tanya-cases.js`, `tests/penjaga-asr.test.js`, `tests/whisper-integration.test.js`, `verify.sh` | 8B.11–8B.16, 14 |

**Integrasi tanpa saling menunggu:** semua modul UI ditulis terhadap ekspor di kontrak, bukan
terhadap implementasi modul lain. Bila ada ketidaksesuaian saat integrasi, perbaiki di berkas
milik tugas masing-masing; jangan mengubah kontrak. `app.js` memakai dynamic import sesuai
`ROUTES`, jadi layar dapat ditambahkan tanpa mengubah shell.

**Definisi selesai global:** `bash verify.sh` lulus; semua route dapat dibuka tanpa error
konsol; data bertahan setelah reload; tidak ada request eksternal; vendor OCR **dan Whisper**
lengkap (12 berkas model + ONNX WASM, tanpa artefak ASR lama); `.wasm` disajikan
`application/wasm` dan `.onnx` `application/octet-stream`; disclaimer & nomor darurat tampil;
hasil pindai tidak pernah tersimpan tanpa centang verifikasi; alur obat utama adalah tanya satu
per satu dengan nama obat dari daftar/pindai/ketik/ejaan (bukan ASR bebas); pencocok menolak
jawaban tak terkait; penjaga ASR menolak keluaran berulang; korpus ≥ 60 jawaban lulus; semua alur
suara inti dapat dijalankan hanya dengan tombol/ketikan; entri suara selalu berstatus belum
diperiksa; konfirmasi "Apakah benar yang sudah dicatat?" tidak dapat dilewati.
