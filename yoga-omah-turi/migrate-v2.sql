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

-- Tambahan (donasi sukarela tanpa kode unik): jalankan juga fungsi create_free_registration di bawah

-- Pendaftaran donasi sukarela (Kamis): tanpa nominal/kode unik, langsung terdaftar & memotong kuota
create or replace function create_free_registration(
  p_session uuid, p_name text, p_wa text
) returns registrations language plpgsql security definer as $$
declare s sessions; used int; r registrations;
begin
  select * into s from sessions where id = p_session for update;
  if not found or not s.is_open or s.price is not null
     or s.date < (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'SESSION_CLOSED';
  end if;
  select count(*) into used from registrations
    where session_id = p_session and (status = 'paid' or (status = 'pending' and expires_at > now()));
  if used >= s.quota then raise exception 'FULL'; end if;
  insert into registrations (session_id, full_name, whatsapp, donation, unique_code, total, status, expires_at, paid_at)
  values (p_session, p_name, p_wa, 0, 0, 0, 'paid', now(), now())
  returning * into r;
  return r;
end $$;
revoke execute on function create_free_registration from public, anon, authenticated;
