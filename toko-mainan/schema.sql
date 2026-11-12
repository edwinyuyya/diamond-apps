-- (Opsional) Simpan pesanan ke Supabase.
-- Jalankan di Supabase → SQL Editor → New Query, lalu isi SUPABASE_URL &
-- SUPABASE_SERVICE_ROLE_KEY di Environment Variables Vercel.

create table if not exists orders (
  id text primary key,
  items jsonb not null,
  subtotal integer not null,
  shipping integer not null,
  unique_code integer not null,
  total integer not null,
  customer jsonb not null,
  status text not null default 'menunggu_pembayaran', -- menunggu_pembayaran | dibayar | dikirim | selesai | batal
  created_at timestamptz not null default now(),
  deadline timestamptz,
  resi text
);

create index if not exists idx_orders_created on orders(created_at desc);

-- RLS aktif TANPA policy publik: hanya server (service role key) yang bisa baca/tulis,
-- jadi data alamat & nomor HP pembeli tidak bisa diakses dari browser.
alter table orders enable row level security;
