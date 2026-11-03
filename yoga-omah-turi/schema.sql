-- Jalankan di Supabase -> SQL Editor
create table sessions (
  id uuid default gen_random_uuid() primary key,
  date date not null unique,
  quota int not null default 20 check (quota >= 0),
  note text,
  price int check (price is null or price > 0), -- null = donasi sukarela, angka = tiket harga tetap per orang
  is_open boolean not null default true,
  created_at timestamptz default now()
);

create table registrations (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  full_name text not null,
  whatsapp text not null,
  donation int not null,
  unique_code int not null,
  total int not null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz default now()
);
create index on registrations(session_id, status);

-- RLS aktif tanpa policy: hanya server (service role) yang bisa akses data
alter table sessions enable row level security;
alter table registrations enable row level security;

-- Pendaftaran atomik: kunci baris sesi supaya kuota tidak bisa kelebihan saat ramai
create or replace function create_registration(
  p_session uuid, p_name text, p_wa text, p_donation int, p_hold_minutes int
) returns registrations language plpgsql security definer as $$
declare s sessions; used int; code int; tries int := 0; r registrations;
begin
  select * into s from sessions where id = p_session for update;
  if not found or not s.is_open or s.date < (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'SESSION_CLOSED';
  end if;
  select count(*) into used from registrations
    where session_id = p_session and (status = 'paid' or (status = 'pending' and expires_at > now()));
  if used >= s.quota then raise exception 'FULL'; end if;
  loop
    code := 100 + floor(random() * 900)::int;
    exit when not exists (select 1 from registrations
      where status = 'pending' and expires_at > now() and total = p_donation + code);
    tries := tries + 1;
    if tries > 50 then raise exception 'NO_CODE'; end if;
  end loop;
  insert into registrations (session_id, full_name, whatsapp, donation, unique_code, total, expires_at)
  values (p_session, p_name, p_wa, p_donation, code, p_donation + code, now() + make_interval(mins => p_hold_minutes))
  returning * into r;
  return r;
end $$;
revoke execute on function create_registration from public, anon, authenticated;
