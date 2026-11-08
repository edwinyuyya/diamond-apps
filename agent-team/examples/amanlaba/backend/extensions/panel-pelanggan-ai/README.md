# Panel Pelanggan AI — Stub (Belum Diimplementasikan)

## Tujuan

Panel Pelanggan AI dirancang sebagai ekstensi masa depan AmanLaba untuk menilai
satu harga jual memakai banyak persona pelanggan sintetis. Keluarannya nanti
berupa skor penerimaan, keberatan per persona, dan rekomendasi harga.

Ekstensi ini **tidak** memakai AI/LLM pada rilis MVP dan **tidak** diaktifkan.

## Status

**`belum-diimplementasikan`** (`VERSI = "0.0.0"`).

- Tidak ada logika penilaian.
- Tidak ada endpoint HTTP.
- Tidak ada panggilan jaringan.
- Tidak ada elemen UI.
- Tidak diimpor oleh `backend/server.js`.

Memanggil `nilaiHarga()` selalu menolak dengan `Error` berkode
`E_BELUM_DIIMPLEMENTASIKAN` dan pesan
`"Panel Pelanggan AI belum diimplementasikan."`.

## Antarmuka

`index.js` mengekspor:

```js
export const NAMA = "panel-pelanggan-ai";
export const VERSI = "0.0.0";
export const STATUS = "belum-diimplementasikan";
export function buatPanelPelangganAi(konfigurasi = {}) {}
```

`buatPanelPelangganAi()` mengembalikan:

```js
{
  nama: "panel-pelanggan-ai",
  versi: "0.0.0",
  status: "belum-diimplementasikan",
  async nilaiHarga(payload) {
    // menolak dengan kode E_BELUM_DIIMPLEMENTASIKAN
  }
}
```

## Kontrak Masa Depan (Belum Aktif)

Contoh payload yang direncanakan:

```json
{
  "skenario": { "hargaJual": { "min": 12000, "mode": 15000, "max": 18000 } },
  "harga": 15000,
  "opsi": { "seed": 12345, "jumlahPersona": 20, "iterasiPersona": 3 }
}
```

Contoh respons yang direncanakan:

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
  "meta": { "seed": 12345, "jumlahPersona": 20, "versi": "1.0.0" }
}
```

## Mengapa Tidak Dirutekan

- Status masih `belum-diimplementasikan`, sehingga belum ada perilaku yang
  layak diekspos ke pengguna.
- Menjaga mesin simulasi inti dan API MVP tetap stabil serta deterministik.
- Menghindari klaim fitur yang belum benar-benar tersedia.

## Langkah Aktivasi Masa Depan

1. Implementasikan `nilaiHarga(payload)` secara deterministik berdasarkan
   `opsi.seed` (gunakan RNG ber-seed, bukan `Math.random()`).
2. Tambahkan validasi payload dan pesan galat berbahasa Indonesia.
3. Tambahkan endpoint baru dengan prefix `/api/panel-pelanggan` **tanpa**
   mengubah endpoint yang sudah ada.
4. Sambungkan UI secara opt-in agar tidak memperlambat alur simulasi utama.
5. Perbarui `STATUS` dan `VERSI`, lalu tambahkan test QA untuk perilaku baru.
6. Baru setelah itu impor modul ini dari server/rute terkait.
