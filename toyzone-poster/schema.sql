-- Toyzone Poster — jalankan di Supabase → SQL Editor → New Query

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,               -- Senin minggu terbit
  product jsonb not null,                 -- snapshot produk dari website
  theme text not null,                    -- baru | promo | terlaris | koleksi | terbatas
  style text,
  caption text not null,
  caption_source text,                    -- ai | template
  schedule_at timestamptz not null,
  status text not null default 'pending', -- pending | approved | rejected | publishing | published | failed
  approved_at timestamptz,
  published_at timestamptz,
  ig_media_id text,
  permalink text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_posts_status_schedule on posts(status, schedule_at);
create index if not exists idx_posts_week on posts(week_start);

create table if not exists settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);

-- RLS aktif TANPA policy publik: hanya server (service role key) yang bisa baca/tulis.
-- Token Instagram aman, tidak bisa dibaca dari browser.
alter table posts enable row level security;
alter table settings enable row level security;
