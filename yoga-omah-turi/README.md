# YOGA OMAH TURI — Pendaftaran Online

Next.js + Supabase. Kamis = donasi sukarela, Jumat = tiket Rp 50.000/orang (jadwal dibuat otomatis 8 minggu ke depan, kuota default 20).

## Setup
1. Supabase → SQL Editor → jalankan `schema.sql`.
2. Salin `.env.example` ke `.env.local` (atau isi Environment Variables di Vercel) dan lengkapi.
3. `npm install && npm run dev`. Deploy ke Vercel dengan Root Directory `yoga-omah-turi`.
4. Admin: `/admin` (password `ADMIN_PASSWORD`) — atur kuota, tandai lunas, batalkan.

## Alur kuota
Daftar → kursi ditahan (`HOLD_MINUTES`, default 3 jam) → transfer nominal + kode unik → kirim bukti via WhatsApp → admin tandai **lunas** (kuota terpotong permanen). Pending yang kedaluwarsa otomatis melepas kursi.
