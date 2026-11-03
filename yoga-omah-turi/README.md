# Harmony of Life — Pendaftaran Online

Next.js + Supabase. Venue Omah Turi: Kamis = donasi sukarela, Jumat = tiket Rp 50.000/orang (jadwal dibuat otomatis 8 minggu ke depan, kuota default 20).

## Setup
1. Supabase → SQL Editor → jalankan `schema.sql`.
2. Salin `.env.example` ke `.env.local` (atau isi Environment Variables di Vercel) dan lengkapi.
3. `npm install && npm run dev`. Deploy ke Vercel dengan Root Directory `yoga-omah-turi`.
4. Admin: `/admin` (password `ADMIN_PASSWORD`) — atur kuota, tandai lunas, batalkan.

## Alur kuota
Daftar → kursi ditahan (`HOLD_MINUTES`, default 3 jam) → transfer nominal + kode unik → kirim bukti via WhatsApp → admin tandai **lunas** (kuota terpotong permanen). Pending yang kedaluwarsa otomatis melepas kursi.

## Foto
- `public/photos/` → carousel di bagian atas.
- `public/photos/venue/`, `online/`, `record/` → galeri dokumentasi di tiap menu (Omah Turi, Online Live, Rekaman) dan foto kecil di kartunya.
Format .jpg/.png/.webp; urut menurut nama file. Folder kosong = bagian itu tidak tampil.
