# Toyzone Poster — Konten & Posting Instagram Otomatis

Aplikasi terpisah untuk @toyzone888. Developed by **Nexora** (08131888116).

## Cara kerja
1. **Setiap Minggu 08.00 WIB** sistem memilih 5 produk dari website Toyzone
   (Produk Baru, Promo, Terlaris, Koleksi Premium, Stok Terbatas), lalu membuat
   **desain gambar** (template Toyzone 1080×1350) dan **caption** untuk Senin–Jumat
   jam 19.00 WIB minggu depan.
2. **Owner membuka dashboard → Pengajuan**, lalu untuk tiap postingan:
   Setujui / Tolak / edit caption & jadwal / buat caption baru / ganti produk.
3. Postingan yang **disetujui** terbit otomatis di Instagram sesuai jadwal.
   Yang tidak disetujui **tidak akan pernah** terposting.
4. Hasilnya tercatat di menu **Riwayat** (dengan link ke postingan Instagram).

## Yang dibutuhkan
| Kebutuhan | Keterangan | Biaya |
|---|---|---|
| Akun IG Business/Creator | Syarat posting lewat API resmi Instagram | Gratis |
| Access Token Instagram | Panduan ada di dashboard → Pengaturan | Gratis |
| Supabase | Database (jalankan `schema.sql` di SQL Editor) | Gratis |
| Hosting | Netlify atau Vercel | Gratis |
| Caption AI (opsional) | **FreeLLMAPI** (gratis, perlu server sendiri) atau **Claude** (bayar per pemakaian). Tanpa keduanya = caption template | Gratis / sangat kecil |

## Pasang (deploy)
1. Buat project Supabase → SQL Editor → jalankan isi `schema.sql`.
2. Deploy folder `toyzone-poster` ke Netlify (Base directory: `toyzone-poster`) atau Vercel (Root Directory: `toyzone-poster`).
3. Isi Environment Variables sesuai `env.example`.
4. Buka aplikasi → login → **Pengaturan** → tempel Access Token Instagram.

## Caption gratis dengan FreeLLMAPI
[FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi) menggabungkan jatah gratis
banyak penyedia AI (Google, Groq, Mistral, dll.) dalam satu alamat API.
1. Jalankan FreeLLMAPI di server yang **menyala 24 jam** dan bisa diakses dari internet
   (VPS, atau komputer di rumah + Cloudflare Tunnel). Butuh Docker:
   `curl -fsSL https://freellmapi.co/install.sh | bash`
2. Buka dashboard FreeLLMAPI → **Keys**: tambahkan API key gratis dari beberapa penyedia,
   lalu salin **unified key** (`freellmapi-...`).
3. Isi env Toyzone Poster: `FREELLM_BASE_URL=https://alamat-server-kamu/v1`,
   `FREELLM_API_KEY=freellmapi-...`, `FREELLM_MODEL=auto`.

Catatan: menurut pembuatnya FreeLLMAPI ditujukan untuk eksperimen pribadi, tanpa jaminan
layanan, dan kualitas model gratis bisa naik-turun. Kalau FreeLLMAPI mati atau gagal,
Toyzone Poster otomatis memakai caption template, jadi pengajuan mingguan tetap dibuat.
Owner tetap memeriksa & bisa mengedit caption sebelum menyetujui.

## Penjadwal (cron)
- **Netlify**: otomatis lewat `netlify/functions/cron-weekly.mjs` (Minggu 08.00 WIB)
  dan `cron-publish.mjs` (tiap jam, menit ke-2).
- **Vercel**: `vercel.json` (paket gratis hanya boleh 1x sehari, jadi posting dicek jam 19.02 WIB).
- Alternatif: cron-job.org memanggil `GET /api/cron/publish` dan `/api/cron/weekly`
  dengan header `Authorization: Bearer <CRON_SECRET>`.

## Uji coba lokal
```bash
npm install
```
```bash
ADMIN_PASSWORD=tes123 SESSION_SECRET=acak1 CRON_SECRET=acak2 STORE_URL=http://localhost:3100 npm run dev
```
Tanpa Supabase, data disimpan di `.data/db.json` (hanya untuk uji coba lokal).

## File penting
| File | Isi |
|---|---|
| `lib/config.js` | Jadwal, jumlah postingan, tema, gaya caption, model AI |
| `lib/render.jsx` | Desain template gambar postingan |
| `lib/caption.js` | Instruksi penulisan caption (AI & template cadangan) |
| `lib/planner.js` | Aturan pemilihan produk tiap minggu |
