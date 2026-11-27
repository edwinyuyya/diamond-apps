-- v3: cegah pendaftaran ganda + penanda 'sudah transfer'. Jalankan di database yang sudah ada.
alter table registrations add column if not exists transferred_at timestamptz;

create or replace function create_registration(
  p_session uuid, p_name text, p_wa text, p_donation int, p_hold_minutes int
) returns registrations language plpgsql security definer set search_path = public as $$
declare s sessions; used int; code int; tries int := 0; r registrations;
begin
  select * into s from sessions where id = p_session for update;
  if not found or not s.is_open or s.date < (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'SESSION_CLOSED';
  end if;
  -- Cegah pendaftaran ganda (nomor WA + nama sama di sesi yang sama): kembalikan yang sudah ada
  select * into r from registrations
    where session_id = p_session and whatsapp = p_wa and lower(btrim(full_name)) = lower(btrim(p_name))
      and (status = 'paid' or (status = 'pending' and expires_at > now()))
    order by created_at limit 1;
  if found then return r; end if;
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

create or replace function create_recording_order(
  p_recording uuid, p_name text, p_wa text, p_hold_minutes int
) returns registrations language plpgsql security definer set search_path = public as $$
declare rec recordings; code int; tries int := 0; r registrations;
begin
  select * into rec from recordings where id = p_recording and is_open for update;
  if not found then raise exception 'SESSION_CLOSED'; end if;
  select * into r from registrations
    where recording_id = p_recording and whatsapp = p_wa and lower(btrim(full_name)) = lower(btrim(p_name))
      and (status = 'paid' or (status = 'pending' and expires_at > now()))
    order by created_at limit 1;
  if found then return r; end if;
  loop
    code := 100 + floor(random() * 900)::int;
    exit when not exists (select 1 from registrations
      where status = 'pending' and expires_at > now() and total = rec.price + code);
    tries := tries + 1;
    if tries > 50 then raise exception 'NO_CODE'; end if;
  end loop;
  insert into registrations (recording_id, full_name, whatsapp, donation, unique_code, total, expires_at)
  values (rec.id, p_name, p_wa, rec.price, code, rec.price + code, now() + make_interval(mins => p_hold_minutes))
  returning * into r;
  return r;
end $$;
revoke execute on function create_recording_order from public, anon, authenticated;

create or replace function create_free_registration(
  p_session uuid, p_name text, p_wa text
) returns registrations language plpgsql security definer set search_path = public as $$
declare s sessions; used int; r registrations;
begin
  select * into s from sessions where id = p_session for update;
  if not found or not s.is_open or s.price is not null
     or s.date < (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'SESSION_CLOSED';
  end if;
  -- Cegah pendaftaran ganda (nomor WA + nama sama di sesi yang sama): kembalikan yang sudah ada
  select * into r from registrations
    where session_id = p_session and whatsapp = p_wa and lower(btrim(full_name)) = lower(btrim(p_name))
      and (status = 'paid' or (status = 'pending' and expires_at > now()))
    order by created_at limit 1;
  if found then return r; end if;
  select count(*) into used from registrations
    where session_id = p_session and (status = 'paid' or (status = 'pending' and expires_at > now()));
  if used >= s.quota then raise exception 'FULL'; end if;
  insert into registrations (session_id, full_name, whatsapp, donation, unique_code, total, status, expires_at, paid_at)
  values (p_session, p_name, p_wa, 0, 0, 0, 'paid', now(), now())
  returning * into r;
  return r;
end $$;
revoke execute on function create_free_registration from public, anon, authenticated;
