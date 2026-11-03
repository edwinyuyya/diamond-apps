-- Hanya jika database SUDAH dibuat dengan schema.sql versi lama. Database baru cukup jalankan schema.sql.
alter table sessions add column kind text not null default 'venue' check (kind in ('venue','online'));
alter table sessions drop constraint sessions_date_key;
alter table sessions add constraint sessions_date_kind_key unique (date, kind);
create table recordings (
  id uuid default gen_random_uuid() primary key,
  title text not null, description text,
  price int not null check (price > 0), access_url text,
  is_open boolean not null default true, created_at timestamptz default now()
);
alter table recordings enable row level security;
alter table registrations alter column session_id drop not null;
alter table registrations add column recording_id uuid references recordings(id) on delete cascade;
alter table registrations add check (session_id is not null or recording_id is not null);
-- lalu jalankan fungsi create_recording_order dari bagian bawah schema.sql
