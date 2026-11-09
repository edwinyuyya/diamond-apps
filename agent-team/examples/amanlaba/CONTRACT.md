# CONTRACT — AmanLaba

**Kontrak teknis antar modul · versi 1.0 · 8 November 2026**

Dokumen ini adalah sumber kebenaran untuk pekerjaan paralel. Backend, frontend aplikasi, frontend landing/laporan, devops, dan QA **wajib mengikuti nama file, rute, bentuk JSON, token desain, dan ID DOM** di sini. Jika ada konflik antara implementasi dan dokumen ini, dokumen ini yang menang sampai diperbarui secara eksplisit.

---

## 1. Runtime, Konvensi, dan Batasan

| Hal | Ketentuan |
|---|---|
| Runtime | Node.js ≥ 18.17 (disarankan 20 LTS) |
| Modul | ESM, `package.json` wajib `"type": "module"` |
| Dependency npm | **Nol** (runtime dan development) |
| Framework | Tidak ada; gunakan modul `http`, `fs`, `path`, `url` bawaan |
| Port default | **3000** |
| Frontend | HTML + CSS + JavaScript ESM, tanpa bundler |
| Grafik | SVG murni melalui DOM API; tanpa library chart |
| Penyimpanan | `localStorage` di browser; server stateless |
| Test | `node:test`, `node:assert/strict`, `fetch` bawaan Node |
| Bahasa UI | Indonesia |
| Bahasa kode | Bebas, tetapi nama field API dan DOM **wajib persis** seperti dokumen |
| Zona waktu | ISO 8601 UTC untuk semua timestamp (`new Date().toISOString()`) |
| Angka | JSON number asli, bukan string; tanpa pembulatan di API |
| Probabilitas | Rentang `0..1`, bukan persen |
| Mata uang | IDR saja; semua nilai moneter dalam Rupiah |

**Larangan:**

- Tidak ada request ke domain eksternal (font, CDN, analytics, gambar, API pihak ketiga).
- Tidak ada dependency npm, database eksternal, akun, atau layanan cloud.
- Tidak ada kode AI/LLM yang dijalankan.
- Tidak ada penulisan file dari request pengguna.
- Tidak ada `eval`, `new Function`, atau penyisipan HTML dari input pengguna tanpa escape.

---

## 2. Struktur Direktori dan Kepemilikan

```
simulator/
├── package.json                          # t4 devops
├── README.md                             # t4 devops
├── .gitignore                            # t4 devops
├── .nvmrc                                # t4 devops
├── verify.sh                             # t5 qa
├── scripts/
│   └── cek-node.sh                       # t4 devops
├── backend/                              # t1 backend
│   ├── server.js
│   ├── http/
│   │   ├── rute-api.js
│   │   ├── rute-statis.js
│   │   └── util-http.js
│   ├── engine/
│   │   ├── index.js
│   │   ├── rng.js
│   │   ├── distribusi.js
│   │   ├── statistik.js
│   │   ├── validasi.js
│   │   ├── simulasi.js
│   │   ├── sensitivitas.js
│   │   ├── titik-impas.js
│   │   ├── sapuan-harga.js
│   │   └── template.js
│   └── extensions/
│       └── panel-pelanggan-ai/
│           ├── index.js                  # stub, bukan fitur aktif
│           └── README.md
├── public/                               # t2 dan t3
│   ├── index.html                        # t3 landing
│   ├── laporan.html                      # t3 laporan
│   ├── app/
│   │   └── index.html                    # t2 aplikasi
│   └── assets/
│       ├── css/
│       │   ├── base.css                  # t3 token + kelas bersama + landing
│       │   └── app.css                   # t2 gaya khusus aplikasi
│       ├── js/
│       │   ├── landing.js                # t3
│       │   ├── laporan.js                # t3
│       │   └── app/
│       │       ├── utama.js              # t2
│       │       ├── form.js               # t2
│       │       ├── hasil.js              # t2
│       │       ├── grafik.js             # t2
│       │       ├── penyimpanan.js        # t2
│       │       └── format.js             # t2
│       └── img/                          # t3, boleh kosong; SVG inline diutamakan
└── test/                                 # t5 qa
    ├── bantuan/
    │   └── server-uji.js
    ├── engine-statistik.test.js
    ├── api.test.js
    ├── statis.test.js
    └── kontrak.test.js
```

Aturan kepemilikan:

| Tugas | Boleh menulis |
|---|---|
| t1 backend | `backend/` |
| t2 frontend aplikasi | `public/app/`, `public/assets/css/app.css`, `public/assets/js/app/` |
| t3 frontend landing & laporan | `public/index.html`, `public/laporan.html`, `public/assets/css/base.css`, `public/assets/js/landing.js`, `public/assets/js/laporan.js`, `public/assets/img/` |
| t4 devops | `package.json`, `README.md`, `.gitignore`, `.nvmrc`, `scripts/` |
| t5 qa | `test/`, `verify.sh` |

Tidak boleh ada penulisan di luar daftar tersebut. Perubahan lintas modul harus lewat pembaruan kontrak ini.

---

## 3. Mesin Simulasi (Kontrak Modul Murni)

Modul di `backend/engine/` tidak boleh melakukan I/O, membaca `Date`, membaca environment, atau menyimpan state global. Semua fungsi harus deterministik terhadap argumennya (kecuali `meta.durasiMs` dan `meta.dihitungPada`).

### 3.1 Ekspor wajib `backend/engine/index.js`

```js
export const VERSI_MESIN = "1.0.0";
export function buatRng(seed) {}
export function ambilTriangular(rng, distribusi) {}
export function kuantilTriangular(p, distribusi) {}
export function faktorPermintaanHarga(harga, hargaJual) {}
export function validasiSkenario(skenario) {}
export function normalisasiOpsi(opsi = {}) {}
export function persentil(nilaiTerurut, p) {}
export function hitungTitikImpas(skenario) {}
export function analisisSensitivitas(skenario) {}
export function sapuanHarga(skenario, opsi = {}) {}
export function jalankanSimulasi(skenario, opsi = {}) {}
export function daftarTemplate() {}
```

Bentuk `distribusi`: `{ min: number, mode: number, max: number }`.

`normalisasiOpsi(opsi)` mengembalikan `{ iterasi, seed, sapuanHarga }`; `sapuanHarga` selalu berupa objek `{ min, max, langkah }` yang sudah diresolusi. `sapuanHarga(skenario, opsi)` mengembalikan `{ sapuan, terbaik, teraman }`.

### 3.2 RNG ber-seed

- Algoritma: **mulberry32**, state 32-bit.
- Seed integer `0..2147483647`.
- Setiap panggilan mengembalikan `u` di `[0, 1)`.
- Urutan pemanggilan menentukan hasil. Jangan memakai `Math.random()` di jalur simulasi.

Pseudocode kanonik:

```
a = seed mod 2^32
function acak():
  a = (a + 0x6D2B79F5) mod 2^32
  t = a
  t = ((t XOR (t >>> 15)) * (t OR 1)) mod 2^32
  t = (t XOR ((t + ((t XOR (t >>> 7)) * 61 mod 2^32)) mod 2^32)) mod 2^32
  return ((t XOR (t >>> 14)) mod 2^32) / 2^32
```

Catatan implementasi: `>>>` adalah pergeseran kanan tanpa tanda (unsigned). Gunakan operasi 32-bit (`Math.imul`, `>>>`, `|`) agar sesuai mulberry32 kanonik.

### 3.3 Distribusi triangular

`ambilTriangular` selalu mengambil satu angka acak `u` terlebih dahulu, termasuk saat `min === max`, lalu memakai rumus berikut. Untuk `min ≤ mode ≤ max`:

```
jika max === min: kembalikan min
F = (mode - min) / (max - min)
jika u < F:
  x = min + sqrt(u * (max - min) * (mode - min))
selain itu:
  x = max - sqrt((1 - u) * (max - min) * (max - mode))
```

`kuantilTriangular(p, d)` memakai rumus yang sama dengan mengganti `u` menjadi `p`, `p ∈ [0,1]`.

Kasus batas:

- `min === mode`: `F = 0`, selalu masuk cabang kedua.
- `max === mode`: `F = 1`, selalu masuk cabang pertama.
- `min === max`: kembalikan `min`.

### 3.4 Satu iterasi simulasi utama

Untuk `i = 0 .. N-1`, ambil dari **satu RNG** dengan urutan tetap:

1. `harga = ambilTriangular(rng, skenario.hargaJual)`
2. `tetap = ambilTriangular(rng, skenario.biayaTetap)`
3. `variabel = ambilTriangular(rng, skenario.biayaVariabel)`
4. `permintaan = ambilTriangular(rng, skenario.permintaan)`

Hitung:

```
faktor = faktorPermintaanHarga(harga, skenario.hargaJual)
laba = (harga - variabel) * permintaan * faktor - tetap
```

Jangan mengubah urutan ini. Jangan menarik angka acak tambahan di tengah loop.

### 3.4.1 Faktor respons permintaan

`permintaan` pada skenario adalah permintaan pada `hargaJual.mode`. Untuk harga lain:

```
jika hargaJual.max === hargaJual.mode: faktor = 1
selain itu:
  choke = 2 * hargaJual.max - hargaJual.mode
  faktor = clamp((choke - harga) / (2 * (hargaJual.max - hargaJual.mode)), 0, 2)
```

- Faktor 1 pada harga mode.
- Faktor 0,5 pada harga maksimum.
- Faktor 0 pada harga choke.
- Gunakan nilai mentah; jangan dibulatkan.
- Fungsi ini murni dan dipakai oleh simulasi utama, sensitivitas harga, dan sapuan harga.

### 3.5 Statistik

`N = meta.iterasi`.

- `labaRataRata`: rata-rata aritmetika.
- `standarDeviasi`: deviasi standar sampel, pembagi `N - 1` (N ≥ 1000).
- `labaMin`, `labaMax`.
- `peluangRugi`: jumlah `laba < 0` dibagi `N`.
- `peluangUntung`: jumlah `laba >= 0` dibagi `N`.
- Persentil `P5`, `P50`, `P95`: urutkan laba menaik, lalu interpolasi linear:

```
posisi = p * (N - 1)
bawah = floor(posisi)
atas = ceil(posisi)
nilai = arr[bawah] + (posisi - bawah) * (arr[atas] - arr[bawah])
```

- Semua nilai dikembalikan tanpa pembulatan.

### 3.6 Histogram

- `jumlahBin = 30`, kecuali `labaMin === labaMax` maka `jumlahBin = 1`.
- Rentang `[labaMin, labaMax]`, lebar `(labaMax - labaMin) / jumlahBin`.
- Indeks bin `floor((laba - labaMin) / lebar)`, di-clamp ke `0..jumlahBin-1`.
- `proporsi = jumlah / N`.
- Bin bersambung; `akhir` bin ke-i = `mulai` bin ke-(i+1).
- Jika satu bin, `mulai = labaMin`, `akhir = labaMax`.

### 3.7 Titik impas

Memakai nilai **mode**:

```
harga = skenario.hargaJual.mode
variabel = skenario.biayaVariabel.mode
tetap = skenario.biayaTetap.mode
margin = harga - variabel
```

- Jika `margin <= 0`: `valid=false`, `unit=null`, `pendapatan=null`, `catatan` menjelaskan bahwa harga jual harus lebih besar dari biaya variabel per unit.
- Jika `margin > 0`: `unit = ceil(tetap / margin)`, `pendapatan = unit * harga`.
- `valid=true`, `catatan=null`.

### 3.8 Sensitivitas tornado

Empat faktor dengan urutan tetap: `hargaJual`, `biayaTetap`, `biayaVariabel`, `permintaan`.

Untuk setiap faktor:

1. Faktor di posisi P10, faktor lain di nilai `mode` → `labaRendah`.
2. Faktor di posisi P90, faktor lain di nilai `mode` → `labaTinggi`.
3. `delta = labaTinggi - labaRendah`.
4. `dampak = abs(delta)`.
5. Perhitungan laba memakai faktor respons permintaan (3.4.1), termasuk saat `hargaJual` digerakkan.
6. Urutkan hasil menurun berdasarkan `dampak` (tie-break: urutan faktor tetap).

`nilaiRendah` dan `nilaiTinggi` adalah hasil `kuantilTriangular(0.10)` dan `kuantilTriangular(0.90)`.

Label:

| kunci | label |
|---|---|
| `hargaJual` | Harga Jual |
| `biayaTetap` | Biaya Tetap |
| `biayaVariabel` | Biaya Variabel |
| `permintaan` | Permintaan |

### 3.9 Sapuan harga

Jika `opsi.sapuanHarga` tidak diberikan, hitung otomatis:

```
hargaImpas = biayaVariabel.mode + biayaTetap.mode / max(permintaan.mode, 1)
min = max(1, round(min(hargaJual.min, hargaImpas * 0.8)))
max = max(ceil(hargaJual.max), ceil(hargaImpas * 1.6), min + 1000)
langkah = 21
```

Jika diberikan, gunakan nilai pengguna. Rentang harga dibulatkan ke bilangan bulat Rupiah sebelum dipakai.

Rentang yang dilaporkan pada `meta.sapuanHarga` adalah nilai yang sudah dibulatkan.

Untuk setiap titik `k = 0 .. langkah-1`:

```
harga = round(min + (max - min) * k / (langkah - 1))
seedTitik = (seed + 104729 * k) >>> 0
```

Setiap titik membuat RNG baru dari `seedTitik`; RNG simulasi utama tidak dipakai ulang. Jalankan **1500 iterasi** per titik dengan urutan pengambilan: `biayaTetap`, `biayaVariabel`, `permintaan` (harga tetap, tidak diambil dari RNG). Setiap iterasi memakai `laba = (harga - variabel) * permintaan * faktor - tetap`, dengan `faktor = faktorPermintaanHarga(harga, skenario.hargaJual)` yang sama untuk seluruh titik. Hitung `labaRataRata`, `labaP5`, `labaP50`, `peluangRugi`.

Pemilihan rekomendasi:

- `terbaik`: `labaRataRata` maksimum. Tie-break: `peluangRugi` lebih kecil, lalu `harga` lebih kecil.
- `teraman`: `peluangRugi` minimum. Tie-break: `labaRataRata` lebih besar, lalu `harga` lebih kecil.
- Sertakan `alasan` berbahasa Indonesia pada masing-masing.

### 3.10 `jalankanSimulasi(skenario, opsi)`

Mengembalikan objek `data` lengkap seperti pada bagian 5.3, termasuk `meta`, `ringkasan`, `titikImpas`, `histogram`, `sensitivitas`, dan `harga`.

`meta.iterasi`, `meta.seed`, `meta.versiMesin`, dan `meta.sapuanHarga` wajib ada. `meta.durasiMs` dan `meta.dihitungPada` boleh berbeda antar pemanggilan.

### 3.11 Determinisme

Dua pemanggilan dengan `skenario` setara, `iterasi` sama, dan `seed` sama **wajib** menghasilkan seluruh nilai angka identik. Hanya `meta.durasiMs` dan `meta.dihitungPada` yang boleh berbeda.

---

## 4. Skema Data Skenario

### 4.1 Bentuk

```json
{
  "nama": "Warung Makan Bu Sari",
  "mataUang": "IDR",
  "hargaJual": { "min": 12000, "mode": 15000, "max": 18000 },
  "biayaTetap": { "min": 3000000, "mode": 4000000, "max": 5500000 },
  "biayaVariabel": { "min": 5000, "mode": 6500, "max": 8000 },
  "permintaan": { "min": 300, "mode": 600, "max": 1000 }
}
```

`permintaan` adalah permintaan pada `hargaJual.mode`; respons linear pada bagian 3.4.1 menentukan permintaan pada harga lain.

### 4.2 Aturan validasi

| Field | Aturan |
|---|---|
| `nama` | Opsional; string; setelah trim 1–80 karakter; default `"Skenario Tanpa Nama"` |
| `mataUang` | Opsional; hanya `"IDR"`; default `"IDR"` |
| `hargaJual`, `biayaTetap`, `biayaVariabel`, `permintaan` | Wajib objek dengan `min`, `mode`, `max` bertipe number finite |
| Setiap distribusi | `0 ≤ min ≤ mode ≤ max ≤ 1_000_000_000_000` |
| `hargaJual.min` | Harus `> 0` |
| Field tambahan | Diabaikan (kompatibilitas maju) |

### 4.3 Opsi

| Field | Aturan | Default |
|---|---|---|
| `iterasi` | Integer `1000..50000` | `10000` |
| `seed` | Integer `0..2147483647` | `12345` |
| `sapuanHarga` | Opsional; `{min, max, langkah}` | Dihitung otomatis |
| `sapuanHarga.min`, `.max` | Number `> 0`, `max > min`, `≤ 1e12` | — |
| `sapuanHarga.langkah` | Integer `5..40` | `21` |

`sapuanHarga` harus diberikan lengkap atau tidak sama sekali; objek parsial ditolak.

### 4.4 Hasil `validasiSkenario`

```json
{ "valid": true, "galat": [] }
```

```json
{
  "valid": false,
  "galat": [
    { "field": "permintaan.max", "pesan": "max harus lebih besar atau sama dengan mode." }
  ]
}
```

`field` memakai jalur bertitik, misalnya `hargaJual.min`, `opsi.iterasi`, `opsi.sapuanHarga.langkah`.

---

## 5. API HTTP

### 5.1 Aturan umum

- Base URL: origin yang sama, tanpa prefix (`/api/...`).
- Semua respons sukses memakai envelope `{ "data": ... }`.
- Semua respons error memakai envelope `{ "error": { "kode", "pesan", "detail"? } }`.
- `Content-Type: application/json; charset=utf-8`.
- `Cache-Control: no-store`.
- Body JSON maksimum **128 KB**.
- Server tidak memerlukan header autentikasi.
- CORS tidak diaktifkan; halaman memanggil origin yang sama.
- Method selain yang didefinisikan → `405` + header `Allow`.

### 5.2 Daftar endpoint

| Method | Path | Request | Sukses |
|---|---|---|---|
| GET | `/api/health` | — | `200` status server |
| GET | `/api/template` | — | `200` 4 template |
| POST | `/api/simulasi` | `{ skenario, opsi? }` | `200` analisis lengkap |
| POST | `/api/harga` | `{ skenario, opsi? }` | `200` sapuan harga saja |

### 5.3 `POST /api/simulasi`

Request:

```json
{
  "skenario": {
    "nama": "Warung Makan Bu Sari",
    "mataUang": "IDR",
    "hargaJual": { "min": 12000, "mode": 15000, "max": 18000 },
    "biayaTetap": { "min": 3000000, "mode": 4000000, "max": 5500000 },
    "biayaVariabel": { "min": 5000, "mode": 6500, "max": 8000 },
    "permintaan": { "min": 300, "mode": 600, "max": 1000 }
  },
  "opsi": {
    "iterasi": 10000,
    "seed": 12345,
    "sapuanHarga": { "min": 9000, "max": 25000, "langkah": 21 }
  }
}
```

`opsi` boleh dihilangkan seluruhnya. `sapuanHarga` boleh dihilangkan.

Response `200`:

```json
{
  "data": {
    "meta": {
      "iterasi": 10000,
      "seed": 12345,
      "versiMesin": "1.0.0",
      "sapuanHarga": { "min": 9000, "max": 25000, "langkah": 21 },
      "durasiMs": 37,
      "dihitungPada": "2026-11-08T10:00:00.000Z"
    },
    "ringkasan": {
      "labaRataRata": 1234567.8,
      "labaP5": -250000,
      "labaP50": 1100000,
      "labaP95": 2900000,
      "labaMin": -2500000,
      "labaMax": 5200000,
      "standarDeviasi": 900000,
      "peluangRugi": 0.18,
      "peluangUntung": 0.82
    },
    "titikImpas": {
      "valid": true,
      "unit": 471,
      "pendapatan": 7065000,
      "hargaAcuan": 15000,
      "biayaVariabelAcuan": 6500,
      "biayaTetapAcuan": 4000000,
      "marginPerUnit": 8500,
      "catatan": null
    },
    "histogram": {
      "jumlahBin": 30,
      "lebarBin": 256666.6666666667,
      "batasBawah": -2500000,
      "batasAtas": 5200000,
      "bin": [
        { "mulai": -2500000, "akhir": -2243333.3333333335, "jumlah": 120, "proporsi": 0.012 }
      ]
    },
    "sensitivitas": [
      {
        "kunci": "permintaan",
        "label": "Permintaan",
        "nilaiRendah": 433.3333333333333,
        "nilaiTinggi": 800,
        "labaRendah": -700000,
        "labaTinggi": 3100000,
        "delta": 3800000,
        "dampak": 3800000
      }
    ],
    "harga": {
      "sapuan": [
        {
          "harga": 9000,
          "labaRataRata": -1200000,
          "labaP5": -2500000,
          "labaP50": -1100000,
          "peluangRugi": 0.78
        }
      ],
      "terbaik": {
        "harga": 13693,
        "labaRataRata": 1357539,
        "labaP5": -960184,
        "labaP50": 1200000,
        "peluangRugi": 0.185,
        "alasan": "Laba rata-rata tertinggi dari 21 titik sapuan."
      },
      "teraman": {
        "harga": 14220,
        "labaRataRata": 1318768,
        "labaP5": -810057,
        "labaP50": 1250000,
        "peluangRugi": 0.175,
        "alasan": "Peluang rugi terendah dari 21 titik sapuan."
      }
    }
  }
}
```

Catatan contoh: array `histogram.bin` berisi **30** elemen, `sensitivitas` berisi **4** elemen, dan `harga.sapuan` berisi **21** elemen pada implementasi sebenarnya. Angka di atas hanya ilustrasi bentuk; bukan nilai patokan uji.

### 5.4 `POST /api/harga`

Request sama dengan `/api/simulasi`, tetapi hanya bagian sapuan yang dikembalikan.

Response `200`:

```json
{
  "data": {
    "sapuan": [
      {
        "harga": 9000,
        "labaRataRata": -1200000,
        "labaP5": -2500000,
        "labaP50": -1100000,
        "peluangRugi": 0.78
      }
    ],
    "terbaik": {
      "harga": 13693,
      "labaRataRata": 1357539,
      "labaP5": -960184,
      "labaP50": 1200000,
      "peluangRugi": 0.185,
      "alasan": "Laba rata-rata tertinggi dari 21 titik sapuan."
    },
    "teraman": {
      "harga": 14220,
      "labaRataRata": 1318768,
      "labaP5": -810057,
      "labaP50": 1250000,
      "peluangRugi": 0.175,
      "alasan": "Peluang rugi terendah dari 21 titik sapuan."
    },
    "meta": {
      "iterasi": 1500,
      "seed": 12345,
      "versiMesin": "1.0.0",
      "sapuanHarga": { "min": 9000, "max": 25000, "langkah": 21 },
      "durasiMs": 21,
      "dihitungPada": "2026-11-08T10:00:00.000Z"
    }
  }
}
```

`meta.iterasi` pada endpoint ini adalah iterasi per titik sapuan (`1500`), bukan `opsi.iterasi` simulasi utama.

### 5.5 `GET /api/template`

Response `200`:

```json
{
  "data": [
    {
      "id": "warung-makan",
      "nama": "Warung Makan",
      "deskripsi": "Harga menu, bahan baku, dan jumlah porsi per bulan.",
      "emoji": "🍜",
      "skenario": {
        "nama": "Warung Makan",
        "mataUang": "IDR",
        "hargaJual": { "min": 12000, "mode": 15000, "max": 18000 },
        "biayaTetap": { "min": 3000000, "mode": 4000000, "max": 5500000 },
        "biayaVariabel": { "min": 5000, "mode": 6500, "max": 8000 },
        "permintaan": { "min": 300, "mode": 600, "max": 1000 }
      },
      "opsi": { "iterasi": 10000, "seed": 12345 }
    }
  ]
}
```

Implementasi wajib mengembalikan tepat **4** template dengan data pada bagian 7.

### 5.6 `GET /api/health`

```json
{
  "data": {
    "status": "ok",
    "nama": "AmanLaba",
    "versi": "1.0.0",
    "waktu": "2026-11-08T10:00:00.000Z"
  }
}
```

### 5.7 Error

Contoh validasi:

```json
{
  "error": {
    "kode": "VALIDASI_GAGAL",
    "pesan": "Input tidak valid.",
    "detail": [
      { "field": "permintaan.max", "pesan": "max harus lebih besar atau sama dengan mode." }
    ]
  }
}
```

| Kode | HTTP | Kapan |
|---|---|---|
| `VALIDASI_GAGAL` | 400 | Skema/opsi tidak valid |
| `JSON_TIDAK_VALID` | 400 | Body bukan JSON yang dapat diparse |
| `TERLALU_BESAR` | 413 | Body > 128 KB |
| `TIDAK_DITEMUKAN` | 404 | Rute API tidak dikenal |
| `METODE_TIDAK_DIIZINKAN` | 405 | Method tidak didukung pada rute yang ada |
| `INTERNAL` | 500 | Kesalahan tak terduga; jangan bocorkan stack trace ke klien |

Bentuk error non-validasi:

```json
{
  "error": {
    "kode": "METODE_TIDAK_DIIZINKAN",
    "pesan": "Gunakan POST untuk endpoint ini."
  }
}
```

---

## 6. Rute Statis

| Method | Path | File / Perilaku |
|---|---|---|
| GET/HEAD | `/` | `public/index.html` |
| GET/HEAD | `/app` atau `/app/` | `public/app/index.html` |
| GET/HEAD | `/laporan` atau `/laporan/` | `public/laporan.html` |
| GET/HEAD | `/assets/...` | File di bawah `public/assets/` |
| GET | `/favicon.ico` | `204 No Content` |
| GET/HEAD | path lain | `404` halaman HTML sederhana |

Aturan:

- Hanya ekstensi `.html`, `.css`, `.js`, `.svg`, `.png`, `.ico`, `.webmanifest` yang boleh disajikan.
- Tolak path traversal (`..`, `%2e%2e`, NUL) dengan `404`.
- Jangan menampilkan daftar direktori.
- MIME: `.html` → `text/html; charset=utf-8`, `.css` → `text/css; charset=utf-8`, `.js` → `text/javascript; charset=utf-8`, `.svg` → `image/svg+xml`, `.png` → `image/png`, `.ico` → `image/x-icon`, `.webmanifest` → `application/manifest+json`.
- `Cache-Control: no-store` untuk semua respons (MVP).
- Query string diabaikan untuk pencarian file.
- Server harus tetap hidup meski folder `public/` belum lengkap; file yang tidak ada → `404`.

---

## 7. Template Skenario

Empat template dengan data **persis** berikut:

```json
[
  {
    "id": "warung-makan",
    "nama": "Warung Makan",
    "deskripsi": "Harga menu, bahan baku, dan jumlah porsi per bulan.",
    "emoji": "🍜",
    "skenario": {
      "nama": "Warung Makan",
      "mataUang": "IDR",
      "hargaJual": { "min": 12000, "mode": 15000, "max": 18000 },
      "biayaTetap": { "min": 3000000, "mode": 4000000, "max": 5500000 },
      "biayaVariabel": { "min": 5000, "mode": 6500, "max": 8000 },
      "permintaan": { "min": 300, "mode": 600, "max": 1000 }
    },
    "opsi": { "iterasi": 10000, "seed": 12345 }
  },
  {
    "id": "kafe",
    "nama": "Kafe",
    "deskripsi": "Harga minuman, biaya sewa tempat, dan kunjungan per bulan.",
    "emoji": "☕",
    "skenario": {
      "nama": "Kafe",
      "mataUang": "IDR",
      "hargaJual": { "min": 18000, "mode": 25000, "max": 32000 },
      "biayaTetap": { "min": 8000000, "mode": 10000000, "max": 13000000 },
      "biayaVariabel": { "min": 7000, "mode": 9000, "max": 12000 },
      "permintaan": { "min": 400, "mode": 700, "max": 1100 }
    },
    "opsi": { "iterasi": 10000, "seed": 20250 }
  },
  {
    "id": "toko-online",
    "nama": "Toko Online",
    "deskripsi": "Harga produk, biaya iklan, dan jumlah pesanan per bulan.",
    "emoji": "🛍️",
    "skenario": {
      "nama": "Toko Online",
      "mataUang": "IDR",
      "hargaJual": { "min": 75000, "mode": 99000, "max": 129000 },
      "biayaTetap": { "min": 2000000, "mode": 3000000, "max": 4500000 },
      "biayaVariabel": { "min": 40000, "mode": 55000, "max": 70000 },
      "permintaan": { "min": 150, "mode": 350, "max": 700 }
    },
    "opsi": { "iterasi": 10000, "seed": 777 }
  },
  {
    "id": "jasa-freelance",
    "nama": "Jasa Freelance",
    "deskripsi": "Tarif proyek, biaya operasional, dan jumlah proyek per bulan.",
    "emoji": "💻",
    "skenario": {
      "nama": "Jasa Freelance",
      "mataUang": "IDR",
      "hargaJual": { "min": 1500000, "mode": 2500000, "max": 4000000 },
      "biayaTetap": { "min": 1500000, "mode": 2000000, "max": 3000000 },
      "biayaVariabel": { "min": 100000, "mode": 300000, "max": 600000 },
      "permintaan": { "min": 2, "mode": 4, "max": 7 }
    },
    "opsi": { "iterasi": 10000, "seed": 424242 }
  }
]
```

Urutan array wajib: warung-makan, kafe, toko-online, jasa-freelance.

---

## 8. Penyimpanan Lokal

### 8.1 Key dan bentuk

- Key: `amanlaba:skenario:v1`
- Nilai: string JSON array, maksimum **50** entri, terbaru di indeks 0.

```json
[
  {
    "id": "sk_1762500000000_a1b2c3",
    "nama": "Warung Makan Bu Sari",
    "dibuatPada": "2026-11-08T10:00:00.000Z",
    "diperbaruiPada": "2026-11-08T10:00:00.000Z",
    "skenario": {
      "nama": "Warung Makan Bu Sari",
      "mataUang": "IDR",
      "hargaJual": { "min": 12000, "mode": 15000, "max": 18000 },
      "biayaTetap": { "min": 3000000, "mode": 4000000, "max": 5500000 },
      "biayaVariabel": { "min": 5000, "mode": 6500, "max": 8000 },
      "permintaan": { "min": 300, "mode": 600, "max": 1000 }
    },
    "opsi": {
      "iterasi": 10000,
      "seed": 12345,
      "sapuanHarga": null
    }
  }
]
```

### 8.2 Aturan

- ID baru: `sk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.
- Simpan skenario baru → tambahkan di awal array.
- Simpan dengan `id` aktif → perbarui entri tersebut dan `diperbaruiPada`.
- Maksimal 50; jika penuh, tolak dengan pesan "Batas 50 skenario tercapai. Hapus salah satu skenario."
- Hapus → buang entri berdasarkan `id`.
- Muat → isi form, set `id` aktif, dan jalankan simulasi.
- Jika `localStorage` tidak tersedia atau gagal (quota), tampilkan pesan "Penyimpanan lokal tidak tersedia. Skenario tidak dapat disimpan." Aplikasi tetap dapat dipakai tanpa menyimpan.
- Aplikasi tidak boleh menyimpan data sensitif apa pun.
- Jika isi key bukan JSON array yang valid, perlakukan sebagai daftar kosong dan tampilkan peringatan; jangan menimpa data lama secara otomatis sampai pengguna menyimpan.

### 8.3 Hubungan dengan laporan

- Tautan laporan: `/laporan?id=<id>`.
- Halaman laporan membaca key yang sama, mencari `id`.
- Jika `id` tidak ada, tidak ditemukan, atau data rusak → tampilkan `#laporan-galat` dengan pesan "Skenario tidak ditemukan. Kembali ke aplikasi untuk memilih skenario." dan tautan ke `/app`.
- Halaman laporan mengirim `POST /api/simulasi` dengan `skenario` dan `opsi` tersimpan. Jika `opsi.sapuanHarga === null`, field `sapuanHarga` tidak dikirim.
- Halaman laporan tidak menulis apa pun ke `localStorage`.

---

## 9. Halaman dan Perilaku Frontend

Semua halaman wajib memakai `<html lang="id">`, `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, dan judul unik.

### 9.1 Landing `/` (`public/index.html`)

Judul dokumen: `AmanLaba — Simulator Risiko Usaha untuk UMKM`

Urutan bagian wajib:

1. **Header** lengket: logo/merek "AmanLaba", nav `Fitur`, `Cara Kerja`, `Template`, `Harga`, `FAQ`, tombol `Buka Aplikasi` → `/app`.
2. **Hero**:
   - H1 persis: **"Jangan tebak harga jual. Simulasikan risikonya."**
   - Subjudul persis: **"Masukkan biaya dan permintaan sebagai rentang. AmanLaba menghitung 10.000 kemungkinan dan menunjukkan peluang rugi, rentang untung, serta harga jual paling aman."**
   - CTA utama "Coba Simulator Gratis" → `/app`.
   - CTA sekunder "Lihat cara kerja" → `#cara-kerja`.
   - Kartu visual contoh hasil: peluang rugi, P5/P50/P95, mini histogram SVG, label "10.000 simulasi".
3. **Masalah**: minimal 3 kartu tentang bahaya menebak satu angka.
4. **Cara kerja** (`id="cara-kerja"`): 3 langkah — isi rentang, jalankan 10.000 simulasi, putuskan harga.
5. **Fitur** (`id="fitur"`): minimal 6 kartu — Monte Carlo, rentang, histogram, tornado, pencari harga, laporan cetak.
6. **Template** (`id="template"`): 4 kartu sesuai bagian 7, tautan ke `/app`.
7. **Harga** (`id="harga"`): 3 kartu sesuai 9.2.
8. **FAQ** (`id="faq"`): minimal 5 pertanyaan (apa itu Monte Carlo, apakah gratis, di mana data disimpan, apakah ini nasihat keuangan, apakah bisa dicetak, bagaimana permintaan merespons harga).
9. **CTA akhir** menuju `/app`.
10. **Footer**: merek, tautan halaman, disclaimer "AmanLaba adalah alat bantu simulasi, bukan nasihat keuangan.", tahun berjalan.

Larangan landing: testimoni fiktif, logo klien palsu, klaim "dijamin untung", angka statistik yang tidak dapat dipertanggungjawabkan.

### 9.2 Paket harga

| Paket | Harga | Poin wajib | Tombol |
|---|---|---|---|
| Gratis | Rp0 / selamanya | 10.000 iterasi; 1 skenario tersimpan; 4 template; laporan dengan tanda AmanLaba | "Mulai Gratis" → `/app` |
| Pro | Rp49.000 / bulan | Skenario tanpa batas*; semua template; laporan tanpa tanda; pencari harga lengkap | "Coba Pro" |
| Bisnis | Rp149.000 / bulan | Semua fitur Pro; 5 kursi tim; dukungan prioritas; akses awal Panel Pelanggan AI (segera hadir) | "Konsultasi" |

*(Versi demo tidak menerapkan pembatasan paket; semua pengguna dapat menyimpan hingga 50 skenario per browser.)*

Tombol Pro dan Bisnis wajib berupa `button` dengan `data-demo="true"` dan menampilkan teks di `#notifikasi-paket`: **"Versi demo: pembayaran belum tersedia."** Tidak ada form pembayaran, redirect, atau data pribadi.

### 9.3 Aplikasi `/app` (`public/app/index.html`)

Judul dokumen: `AmanLaba — Simulasi Risiko Usaha`

Struktur:

- Header ringkas: merek → `/`, tautan "Beranda" → `/`, indikator seed/iterasi opsional.
- `<main>` dua kolom di desktop: form di kiri, hasil di kanan. Satu kolom di ≤ 960 px.
- Form memakai fieldset dan legend: "Harga & Biaya", "Permintaan", "Pengaturan Simulasi".
- Setiap variabel punya tiga input number: min, mode, max, dengan label jelas. Label permintaan wajib menyebut "pada harga paling mungkin" (mis. "Permintaan per bulan (pada harga mode)") karena model respons harga mengacu ke sana.
- Input `iterasi` (1000–50000, default 10000), `seed` (0–2147483647, default 12345), tombol "Acak Seed".
- Tombol utama "Hitung Risiko".
- Area `#galat` (role alert) dan `#status-hitung` (aria-live polite).
- Panel hasil tersembunyi sebelum hasil pertama.
- Semua tautan aset dan API memakai path absolut (`/assets/...`, `/api/...`) agar `/app` dan `/app/` sama-sama bekerja.
- Daftar template (dari API) dan daftar skenario tersimpan.
- Tombol "Simpan Skenario" dan tautan "Buat Laporan".

Perilaku wajib:

1. Saat halaman dimuat: ambil `GET /api/template` dan baca `localStorage` secara paralel.
2. Jika belum ada skenario tersimpan yang dipilih, terapkan template `warung-makan` dan otomatis jalankan simulasi.
3. Menekan "Hitung Risiko" memvalidasi input klien, lalu `POST /api/simulasi`. Tombol dinonaktifkan dan berubah menjadi "Menghitung…" selama request.
4. Hasil merender semua kartu metrik, titik impas, tiga grafik, dan dua rekomendasi harga. Di dekat grafik harga, tampilkan catatan asumsi respons permintaan linear.
5. Mengubah input setelah hasil tampil menandai state "belum dihitung"; tidak ada auto-hitung kecuali pemuatan template.
6. Memilih template mengisi seluruh field, mengatur seed/iterasi template, menghapus `id` aktif, dan langsung menghitung.
7. "Simpan Skenario" memakai `#nama-skenario`; jika kosong, gunakan "Skenario Tanpa Nama". Setelah simpan, `#tautan-laporan` aktif.
8. Daftar skenario menampilkan nama, tanggal, tombol "Muat", dan "Hapus".
9. "Buat Laporan" hanya aktif jika ada `id` tersimpan; `href` diisi `/laporan?id=<id>`.
10. Error API ditampilkan di `#galat` dengan pesan yang dapat dibaca; tombol kembali aktif.

Format tampilan:

- Uang: `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })`.
- Persen: satu desimal, koma Indonesia (`18,0%`).
- Tanggal: `Intl.DateTimeFormat("id-ID", { dateStyle: "long" })`.
- Angka besar pada grafik boleh memakai format ringkas (`Rp1,2 jt`, `Rp450 rb`, `Rp1,2 M`).

### 9.4 ID DOM wajib

QA dan pembagian kerja bergantung pada ID ini. Jangan mengganti namanya.

**Aplikasi `/app`:**

| ID | Elemen |
|---|---|
| `form-skenario` | `<form>` utama |
| `nama-skenario` | input teks nama |
| `harga-min`, `harga-mode`, `harga-max` | input harga jual |
| `tetap-min`, `tetap-mode`, `tetap-max` | input biaya tetap |
| `variabel-min`, `variabel-mode`, `variabel-max` | input biaya variabel |
| `permintaan-min`, `permintaan-mode`, `permintaan-max` | input permintaan |
| `iterasi` | input jumlah iterasi |
| `seed` | input seed |
| `tombol-acak-seed` | tombol acak seed |
| `tombol-hitung` | tombol submit |
| `galat` | wadah error (`role="alert"`) |
| `status-hitung` | status loading (`aria-live="polite"`) |
| `panel-hasil` | wadah hasil |
| `nilai-peluang-rugi` | nilai peluang rugi |
| `nilai-peluang-untung` | nilai peluang untung |
| `nilai-p5`, `nilai-p50`, `nilai-p95` | persentil laba |
| `nilai-rata-rata`, `nilai-min`, `nilai-maks`, `nilai-deviasi` | statistik lain |
| `nilai-impas-unit`, `nilai-impas-pendapatan` | titik impas |
| `grafik-histogram` | wadah SVG histogram |
| `grafik-tornado` | wadah SVG tornado |
| `grafik-harga` | wadah SVG sapuan harga |
| `label-harga-terbaik`, `alasan-harga-terbaik` | rekomendasi laba terbaik |
| `label-harga-teraman`, `alasan-harga-teraman` | rekomendasi risiko terendah |
| `daftar-template` | wadah kartu template |
| `daftar-skenario` | wadah skenario tersimpan |
| `tombol-simpan` | tombol simpan |
| `tautan-laporan` | `<a>` menuju laporan |
| `notifikasi` | toast (`aria-live="polite"`) |

**Landing `/`:**

`nav-utama`, `tombol-menu`, `tahun`, `cara-kerja`, `fitur`, `template`, `harga`, `faq`, `notifikasi-paket`, `cta-utama`.

**Laporan `/laporan`:**

`laporan`, `laporan-galat`, `laporan-muatan`, `tombol-cetak`, `laporan-nama`, `laporan-tanggal`, `laporan-seed`, `laporan-iterasi`, `laporan-peluang-rugi`, `laporan-p5`, `laporan-p50`, `laporan-p95`, `laporan-impas`, `laporan-histogram`, `laporan-tornado`, `laporan-harga`, `laporan-asumsi`, `laporan-kesimpulan`, `laporan-disclaimer`.

### 9.5 Laporan `/laporan` (`public/laporan.html`)

Judul dokumen: `Laporan Simulasi — AmanLaba`

Konten wajib:

1. Header merek + judul "Laporan Simulasi Risiko Usaha".
2. Metadata: nama skenario, tanggal cetak, seed, iterasi, versi mesin.
3. Kartu metrik: peluang rugi, P5, P50, P95, titik impas unit.
4. Tabel asumsi: empat variabel × min/mode/max, plus catatan bahwa permintaan adalah permintaan pada harga mode dan respons harga linear (faktor 1 di mode, 0,5 di harga maksimum, 0 di harga choke).
5. Histogram laba.
6. Tornado sensitivitas.
7. Grafik sapuan harga + dua rekomendasi (laba terbaik dan risiko terendah) beserta harga dan peluang rugi.
8. Kesimpulan otomatis 1–2 kalimat, contoh: "Dengan harga Rp15.000, peluang rugi 18,0% dan laba tengah Rp1.100.000 per bulan. Harga Rp14.220 memiliki peluang rugi terendah, yaitu 17,5%."
9. Disclaimer: "Hasil ini adalah simulasi berdasarkan asumsi pengguna, bukan jaminan atau nasihat keuangan."
10. Tombol "Cetak / Simpan PDF" di area `#tombol-cetak`.
11. Tanda "Dibuat dengan AmanLaba" di footer.

Perilaku:

- Tampilkan `#laporan-muatan` selama memuat.
- Jika `id` hilang/tidak ditemukan/data rusak atau API gagal → sembunyikan `#laporan`, tampilkan `#laporan-galat`.
- Tombol cetak memanggil `window.print()`.
- Jika query `cetak=1`, panggil `window.print()` satu kali setelah hasil selesai dirender.
- Halaman harus dapat dibaca tanpa JavaScript? Tidak wajib; tampilkan pesan dasar di `<noscript>`.

### 9.6 Gaya cetak

Wajib ada `@media print`:

- `@page { size: A4; margin: 14mm; }`
- Sembunyikan `.tanpa-cetak`, tombol, nav, dan elemen interaktif.
- Latar putih, teks hitam, grafik tetap terlihat.
- Kartu dan grafik tidak terpotong: `break-inside: avoid`.
- Tautan tidak menampilkan URL tambahan.
- Tinggi grafik disesuaikan agar muat beberapa halaman tanpa terpotong.

---

## 10. Sistem Desain

### 10.1 Token wajib

`public/assets/css/base.css` wajib mendeklarasikan token berikut pada `:root`. Halaman aplikasi memakai token yang sama; **tidak boleh** mendefinisikan ulang palet utama di `app.css`.

```css
:root {
  --warna-latar: #F6F7F9;
  --warna-permukaan: #FFFFFF;
  --warna-permukaan-lembut: #F0F4F4;
  --warna-tinta: #0B1526;
  --warna-tinta-lembut: #5B6675;
  --warna-garis: #E3E7ED;
  --warna-utama: #0F766E;
  --warna-utama-terang: #14B8A6;
  --warna-utama-gelap: #115E59;
  --warna-aksen: #F59E0B;
  --warna-aksen-lembut: #FEF3C7;
  --warna-bahaya: #DC2626;
  --warna-bahaya-lembut: #FEE2E2;
  --warna-aman: #15803D;
  --warna-aman-lembut: #DCFCE7;
  --warna-info: #2563EB;
  --gradien-hero: linear-gradient(135deg, #0F766E 0%, #0B3B5A 55%, #4C1D95 100%);
  --radius-kecil: 10px;
  --radius-sedang: 16px;
  --radius-besar: 24px;
  --bayang-1: 0 1px 2px rgba(11, 21, 38, 0.06), 0 8px 24px rgba(11, 21, 38, 0.06);
  --bayang-2: 0 20px 50px rgba(11, 21, 38, 0.16);
  --lebar-maks: 1160px;
  --font-utama: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
}
```

Aturan tipografi:

- Body: 16 px, line-height 1.6, `var(--font-utama)`.
- H1: `clamp(2rem, 5vw, 3.75rem)`, line-height 1.05, letter-spacing -0.02em.
- H2: `clamp(1.5rem, 3vw, 2.25rem)`.
- Angka metrik: `font-variant-numeric: tabular-nums`.
- Tanpa font eksternal.

### 10.2 Kelas bersama wajib

`base.css` harus menyediakan kelas berikut, dan halaman aplikasi wajib memakainya bila relevan:

`.wadah`, `.bagian`, `.judul-bagian`, `.teks-lembut`, `.tombol`, `.tombol--utama`, `.tombol--garis`, `.tombol--halus`, `.tombol--bahaya`, `.kartu`, `.kartu--padat`, `.label`, `.input`, `.pilihan`, `.badge`, `.badge--aman`, `.badge--bahaya`, `.badge--netral`, `.grid-2`, `.grid-3`, `.galat`, `.tabel`, `.sembunyi`, `.hanya-cetak`, `.tanpa-cetak`, `.sr-only`, `.nonaktif`, `.notifikasi`, `.merek`, `.merek__lambang`.

Ketentuan:

- `.wadah`: lebar maksimum `var(--lebar-maks)`, margin inline auto, padding inline 24 px (16 px di ponsel).
- `.tombol`: minimal tinggi 44 px, radius `var(--radius-kecil)`, transisi 150 ms, fokus terlihat.
- `.kartu`: latar `var(--warna-permukaan)`, border 1 px `var(--warna-garis)`, radius `var(--radius-sedang)`, bayangan `var(--bayang-1)`.
- `.input`: tinggi minimal 44 px, border `1px solid var(--warna-garis)`, radius `var(--radius-kecil)`, fokus ring teal.
- `.galat`: latar `var(--warna-bahaya-lembut)`, teks `var(--warna-bahaya)`, border sesuai.
- `.badge`: pil kecil, teks 12–13 px, tebal 600.
- `.grid-2` / `.grid-3`: grid responsif; turun ke satu kolom di ≤ 640 px.
- `.hanya-cetak`: `display: none` di layar, tampil saat cetak.
- `.tanpa-cetak`: tampil di layar, `display: none` saat cetak.
- `.sr-only`: tersembunyi secara visual tetapi terbaca screen reader.

### 10.3 Batas gaya per halaman

- Landing: gaya spesifik di `base.css` dengan selector berawalan `.halaman-landing`.
- Aplikasi: gaya spesifik di `app.css` dengan selector berawalan `.halaman-app` atau kelas berawalan `app-`.
- Laporan: gaya spesifik boleh inline di `laporan.html` dengan selector berawalan `.halaman-laporan`.
- Jangan menimpa token global dari `app.css`.

### 10.4 Responsif dan aksesibilitas

- Breakpoint: `960px` dan `640px`.
- Tanpa scroll horizontal pada 360 px.
- Target sentuh minimal 44 × 44 px.
- Kontras teks minimal WCAG AA.
- `:focus-visible` wajib terlihat (outline 2 px + offset 2 px).
- Form memakai `<label for>` nyata, bukan placeholder sebagai label.
- `aria-live` untuk status dan notifikasi; `role="alert"` untuk error.
- Hormati `prefers-reduced-motion`: matikan animasi/transisi non-esensial.
- Grafik diberi `role="img"` dan `<title>`/`aria-label`; data penting juga tersedia dalam teks/tabel.

---

## 11. Spesifikasi Grafik SVG

Semua grafik dibuat dengan `document.createElementNS("http://www.w3.org/2000/svg", ...)`. Tidak boleh memakai library atau menyisipkan string HTML dari data pengguna.

### 11.1 Histogram laba

- `viewBox="0 0 720 280"`, `preserveAspectRatio="xMidYMid meet"`.
- 30 batang; celah 1–2 px.
- Batang laba negatif memakai `var(--warna-bahaya)`; laba positif `var(--warna-utama)`.
- Garis median putus-putus pada P50, diberi label.
- 4 garis bantu horizontal dan label sumbu Y dalam format ringkas.
- Label sumbu X: laba minimum, nol (jika berada dalam rentang), laba maksimum.
- Legenda "Rugi" dan "Untung".
- Jika seluruh laba sama, tampilkan satu batang penuh dengan label nilainya.
- `<title>`: "Histogram distribusi laba dari 10.000 simulasi".

### 11.2 Tornado sensitivitas

- `viewBox="0 0 720 280"`.
- Empat baris, urut berdasarkan `dampak` menurun.
- Garis nol vertikal di tengah area batang.
- Batang kiri/kanan menunjukkan `labaRendah` dan `labaTinggi`.
- Label variabel di kiri, nilai dalam format ringkas di ujung batang.
- `<title>`: "Diagram tornado: variabel yang paling memengaruhi laba".

### 11.3 Sapuan harga

- `viewBox="0 0 720 300"`.
- Garis laba rata-rata per titik harga, area di bawahnya dengan opasitas rendah.
- Penanda khusus untuk `terbaik` dan `teraman`, dengan label harga.
- Garis vertikal putus-putus untuk harga impas jika tersedia.
- Sumbu Y laba, sumbu X harga.
- `<title>`: "Pencari harga jual: laba rata-rata dan risiko pada setiap harga".

### 11.4 Perilaku data kosong

Jika hasil tidak tersedia, wadah grafik menampilkan teks "Jalankan simulasi untuk melihat grafik." dan tidak membuat SVG rusak.

---

## 12. Environment, Perintah, dan Operasional

### 12.1 Environment variable

| Nama | Default | Fungsi |
|---|---|---|
| `PORT` | `3000` | Port HTTP; `0` berarti OS memilih port (dipakai test) |
| `HOST` | `0.0.0.0` | Alamat bind |
| `NODE_ENV` | `development` | Informatif; `test` boleh menonaktifkan log startup |

Tidak ada file `.env` yang dimuat otomatis. Dokumentasikan pemakaian lewat shell, contoh `PORT=4000 npm start`.

### 12.2 Perintah

| Perintah | Fungsi |
|---|---|
| `npm install` | Tidak diperlukan (nol dependency); boleh dijalankan dan tidak mengubah apa pun |
| `npm start` | `node backend/server.js` |
| `npm run dev` | `node --watch backend/server.js` |
| `npm test` | `node --test test/*.test.js` |
| `npm run verify` | `bash verify.sh` |
| Build | Tidak ada proses build; aset statis disajikan apa adanya |

### 12.3 Kontrak server

`backend/server.js` wajib mengekspor:

```js
export function buatServer(opsi = {}) {}      // mengembalikan http.Server, belum listen
export async function mulaiServer(opsi = {}) {} // listen dan mengembalikan { server, port, url }
```

- `buatServer({ direktoriPublik })` menerima path opsional; default `<root>/public`.
- `mulaiServer({ port, host })` membaca `PORT`/`HOST` bila argumen tidak diberikan.
- Saat dijalankan langsung (`node backend/server.js`), server listen dan mencetak `AmanLaba berjalan di http://<host>:<port>`.
- Saat diimpor untuk test, server **tidak** boleh otomatis listen.
- Shutdown `SIGINT`/`SIGTERM` menutup server dengan rapi.

### 12.4 Struktur package.json minimal

```json
{
  "name": "amanlaba",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Simulator risiko usaha dengan Monte Carlo ber-seed",
  "engines": { "node": ">=18.17" },
  "scripts": {
    "start": "node backend/server.js",
    "dev": "node --watch backend/server.js",
    "test": "node --test test/*.test.js",
    "verify": "bash verify.sh"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

---

## 13. Kontrak QA dan `verify.sh`

QA menulis test otomatis dengan `node:test`; tidak memakai browser automation dan tidak menambah dependency.

### 13.1 Cakupan wajib

**`test/engine-statistik.test.js`**

1. **RNG**: 100.000 sampel; rata-rata `0,5 ± 0,01`; proporsi tiap desil `0,1 ± 0,02`.
2. **Triangular**: kuantil terbalik benar (`CDF(kuantil(p)) ≈ p`); sampel 100.000, proporsi di bawah median `0,5 ± 0,01`.
3. **Kasus analitik** dengan skenario:
   - `hargaJual = {min:15000, mode:15000, max:15000}`
   - `biayaTetap = {min:4000000, mode:4000000, max:4000000}`
   - `biayaVariabel = {min:5000, mode:5000, max:5000}`
   - `permintaan = {min:200, mode:400, max:800}`
   - `iterasi = 20000`, `seed = 12345`
   - Ekspektasi: laba rata-rata `666.666,67 ± 2%`; `peluangRugi ≈ 0,3333 ± 0,02`; `P5 ≈ -1.225.403 ± 150.000`; `P50 ≈ 535.900 ± 150.000`; `P95 ≈ 2.904.555 ± 150.000`; titik impas `400 unit` dan `Rp6.000.000`.
4. **Determinisme**: dua panggilan dengan seed sama menghasilkan angka identik; seed berbeda menghasilkan hasil berbeda.
5. **Histogram**: 30 bin, jumlah seluruh `jumlah` = N, jumlah `proporsi` = 1 (±1e-9), bin bersambung.
6. **Sensitivitas**: 4 item, terurut menurun berdasarkan `dampak`, `dampak = |delta|`; pada kasus analitik, `permintaan` memiliki dampak terbesar.
7. **Sapuan harga**: panjang = `langkah`, harga menaik, `terbaik` = laba rata-rata maksimum, `teraman` = peluang rugi minimum, semua probabilitas di `0..1`. Pada template `warung-makan`, `terbaik.harga` dan `teraman.harga` harus lebih kecil dari harga maksimum sapuan (model respons permintaan harus menghasilkan trade-off, bukan rekomendasi di batas atas).
8. **Titik impas tidak valid** saat `biayaVariabel.mode >= hargaJual.mode`.
9. **Seed 0** dapat dijalankan tanpa error.
10. **Faktor respons permintaan**: `faktorPermintaanHarga(mode, hargaJual) === 1`; pada `max` = 0,5; pada `choke` = 0; hasil selalu di `0..2`; jika `max === mode` selalu 1.

**`test/api.test.js`**

1. `GET /api/health` → 200, `data.status === "ok"`.
2. `GET /api/template` → 200, tepat 4 template dengan ID yang benar.
3. `POST /api/simulasi` valid → 200, struktur `data` lengkap, 30 bin, 4 sensitivitas, 21 titik sapuan.
4. Input `min > max` → 400, `error.kode === "VALIDASI_GAGAL"`, `detail` menyebut field.
5. JSON rusak → 400, `error.kode === "JSON_TIDAK_VALID"`.
6. Body > 128 KB → 413, `error.kode === "TERLALU_BESAR"`.
7. Rute API tak dikenal → 404, `error.kode === "TIDAK_DITEMUKAN"`.
8. Method salah (mis. `POST /api/template`) → 405 dengan header `Allow`.
9. `POST /api/harga` → 200, bentuk sesuai kontrak.
10. Determinisme lewat HTTP: dua request identik menghasilkan data sama, kecuali `meta.durasiMs` dan `meta.dihitungPada`.
11. Path traversal (`/../package.json`, `/%2e%2e/package.json`) → 404.

**`test/statis.test.js`**

1. `/`, `/app`, `/laporan` → 200 dan `text/html`.
2. `/assets/css/base.css`, `/assets/css/app.css`, `/assets/js/app/utama.js`, `/assets/js/laporan.js` → 200 dengan MIME benar.
3. Landing memuat H1, CTA ke `/app`, tiga paket harga, ID wajib.
4. Aplikasi memuat semua ID wajib bagian 9.4.
5. Laporan memuat ID wajib bagian 9.4.
6. Semua halaman memakai `lang="id"`.
7. Tidak ada `src`/`href` yang menunjuk domain eksternal pada HTML.
8. `public/` tidak berisi file di luar kepemilikan yang disepakati.

**`test/kontrak.test.js`**

1. Modul ekstensi ada, mengekspor `NAMA`, `VERSI`, `STATUS`, `buatPanelPelangganAi`.
2. `buatPanelPelangganAi().status === "belum-diimplementasikan"`.
3. Memanggil `nilaiHarga()` menolak dengan `kode === "E_BELUM_DIIMPLEMENTASIKAN"`.
4. `package.json` tidak memiliki dependency.
5. `VERSI_MESIN === "1.0.0"`.

### 13.2 `verify.sh`

Wajib:

- `set -euo pipefail`.
- Memeriksa Node ≥ 18.
- Menjalankan `npm test`.
- Menjalankan server sementara pada port tetap (mis. `3456`), menunggu `/api/health`, lalu memeriksa `GET /`, `GET /app`, `GET /laporan`, dan `GET /api/template`.
- Mematikan server lewat `trap` dalam kondisi apa pun.
- Exit code 0 hanya jika semua langkah lulus; mencetak ringkasan "VERIFIKASI LULUS".
- Dapat dijalankan dari root repo dengan `bash verify.sh`.
- Tidak membutuhkan instalasi dependency.

### 13.3 Batas QA

- QA tidak boleh mengubah kode implementasi untuk membuat test lulus; laporkan kegagalan.
- QA tidak boleh menambah library.
- Test harus deterministik dan tidak bergantung pada urutan eksekusi file test.
- Test API wajib memakai port `0` (ephemeral) saat membuat server, bukan port 3000.

---

## 14. Titik Ekstensi: Panel Pelanggan AI (Stub)

### 14.1 Status

**Belum diimplementasikan.** Hanya kerangka antarmuka dan dokumentasi. Tidak ada logika AI, endpoint, panggilan jaringan, atau elemen UI.

Lokasi: `backend/extensions/panel-pelanggan-ai/`

### 14.2 Antarmuka modul

`index.js` wajib mengekspor:

```js
export const NAMA = "panel-pelanggan-ai";
export const VERSI = "0.0.0";
export const STATUS = "belum-diimplementasikan";
export function buatPanelPelangganAi(konfigurasi = {}) {}
```

`buatPanelPelangganAi()` mengembalikan objek:

```js
{
  nama: "panel-pelanggan-ai",
  versi: "0.0.0",
  status: "belum-diimplementasikan",
  nilaiHarga(payload) {
    // Melempar Error dengan properti kode = "E_BELUM_DIIMPLEMENTASIKAN"
  }
}
```

`nilaiHarga` boleh `async`, tetapi wajib menolak dengan error berkode `E_BELUM_DIIMPLEMENTASIKAN` dan pesan "Panel Pelanggan AI belum diimplementasikan."

### 14.3 Kontrak masa depan (belum aktif)

Payload yang direncanakan:

```json
{
  "skenario": { "hargaJual": { "min": 12000, "mode": 15000, "max": 18000 } },
  "harga": 15000,
  "opsi": { "seed": 12345, "jumlahPersona": 20, "iterasiPersona": 3 }
}
```

Respons yang direncanakan:

```json
{
  "harga": 15000,
  "ringkasan": {
    "skorPenerimaan": 0.72,
    "dayaBeli": "menengah",
    "ringkasanAlasan": "Sebagian besar persona menerima harga, dengan keberatan pada nilai tambah."
  },
  "persona": [
    {
      "id": "hemat-01",
      "nama": "Ibu Rina",
      "profil": { "usia": 38, "domisili": "kota kecil", "sensitivitasHarga": "tinggi" },
      "skorPenerimaan": 0.81,
      "keberatan": ["Harga sedikit di atas ekspektasi"],
      "reaksi": "Akan membeli jika ada promo atau porsi lebih besar."
    }
  ],
  "rekomendasi": {
    "hargaDisarankan": 14000,
    "alasan": "Meningkatkan penerimaan tanpa menurunkan margin secara berarti."
  },
  "meta": {
    "seed": 12345,
    "jumlahPersona": 20,
    "versi": "1.0.0"
  }
}
```

### 14.4 Aturan aktivasi masa depan

- Harus deterministik berdasarkan `seed`.
- Tidak boleh diimpor oleh `server.js` selama status masih `belum-diimplementasikan`.
- Endpoint baru, jika nanti ditambahkan, wajib memakai prefix `/api/panel-pelanggan` dan tidak mengubah endpoint yang ada.
- UI harus opt-in dan tidak boleh memperlambat alur simulasi utama.
- Test QA saat ini hanya memverifikasi stub dan status, bukan kualitas penilaian.

### 14.5 README ekstensi

`backend/extensions/panel-pelanggan-ai/README.md` wajib menjelaskan: tujuan, status belum aktif, antarmuka, contoh payload/respons, alasan tidak dirutekan, dan langkah aktivasi masa depan.

---

## 15. Protokol Kerja Paralel

1. **t1 backend**, **t2 aplikasi**, **t3 landing/laporan**, dan **t4 devops** mulai bersamaan tanpa saling menunggu.
2. Semua pihak memakai dokumen ini sebagai sumber kebenaran; jangan menebak bentuk data.
3. t4 menyediakan `package.json` dengan `"type": "module"` agar t1–t3 dapat menjalankan ESM.
4. t2 dan t3 tidak boleh mengubah `backend/`, `package.json`, atau folder milik pihak lain.
5. t3 menulis `base.css`; t2 hanya memakai token dan kelas yang ditetapkan di bagian 10.
6. Frontend tidak boleh menghitung ulang simulasi sendiri; semua angka berasal dari API.
7. t5 mulai setelah t1–t4 selesai dan menguji hasil integrasi.
8. Jika implementasi menemukan kontrak yang tidak mungkin dipenuhi, hentikan perubahan lintas modul dan catat usulan amendemen kontrak; jangan mengubah antarmuka secara diam-diam.

### Matriks ketergantungan

| Tugas | dependsOn | owns |
|---|---|---|
| t1 backend | — | `backend/` |
| t2 frontend aplikasi | — | `public/app/`, `public/assets/css/app.css`, `public/assets/js/app/` |
| t3 frontend landing & laporan | — | `public/index.html`, `public/laporan.html`, `public/assets/css/base.css`, `public/assets/js/landing.js`, `public/assets/js/laporan.js`, `public/assets/img/` |
| t4 devops | — | `package.json`, `README.md`, `.gitignore`, `.nvmrc`, `scripts/` |
| t5 qa | t1, t2, t3, t4 | `test/`, `verify.sh` |

---

## 16. Ringkasan Perintah Penerimaan

```bash
# tidak perlu install dependency
npm start          # http://localhost:3000
npm test           # test unit, statistik, API, statis, kontrak
npm run verify     # test + smoke test server
```

Kriteria lulus akhir: semua test hijau, `verify.sh` mencetak "VERIFIKASI LULUS", tiga halaman dapat diakses, dan tidak ada request eksternal.
