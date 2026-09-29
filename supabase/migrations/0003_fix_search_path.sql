-- ============================================================================
-- Migration 0003: perbaiki search_path fungsi (pgcrypto ada di schema `extensions`)
--
-- MASALAH: `pair_device` memanggil `digest(...)` (pgcrypto), tetapi fungsinya
-- menyetel `search_path = public`. Di Supabase, pgcrypto dipasang di schema
-- `extensions`, jadi `digest()` TIDAK ditemukan saat RPC dipanggil dari web-app:
--   ERROR: function digest(text, unknown) does not exist
--
-- PERBAIKAN: sertakan `extensions` di search_path semua fungsi security definer.
-- 0001/0002 sudah diperbaiki untuk instalasi BARU; migrasi ini memperbaiki
-- database yang sudah pernah di-`db push` (karena `create or replace` bersifat
-- idempoten, menjalankannya ulang aman).
-- ============================================================================

-- 1) pair_device — inti masalah (memakai digest()).
create or replace function pair_device(p_code text)
returns table (store_id uuid, store_name text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row   pairing_codes%rowtype;
  v_store uuid;
  v_name  text;
  v_uid   uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_row
  from pairing_codes
  where code_hash = encode(digest(upper(regexp_replace(p_code, '\s', '', 'g')), 'sha256'), 'hex')
    and used_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'PAIRING_CODE_INVALID';
  end if;

  select d.store_id into v_store
  from devices d
  where d.device_id = v_row.device_id;

  if v_store is null then
    insert into stores(public_id, name)
    values (gen_random_uuid()::text, 'Toko Baru')
    returning id, name into v_store, v_name;

    update devices
      set store_id = v_store, status = 'active'
      where device_id = v_row.device_id;
  else
    select s.name into v_name from stores s where s.id = v_store;
    update devices set status = 'active'
      where device_id = v_row.device_id and status <> 'active';
  end if;

  insert into store_users(user_id, store_id, permission)
  values (v_uid, v_store, 'owner')
  on conflict do nothing;

  update pairing_codes
    set used_at = now(), used_by = v_uid
    where id = v_row.id;

  return query select v_store, v_name;
end $$;

-- 2) can_access_store — samakan search_path (tidak pakai pgcrypto, tapi konsisten).
create or replace function can_access_store(p_store uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from store_users
    where user_id = auth.uid() and store_id = p_store
  );
$$;

-- 3) revoke_device / activate_device (dari 0002) — samakan search_path.
create or replace function revoke_device(p_device_id text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_store uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select store_id into v_store from devices where device_id = p_device_id;
  if v_store is null then raise exception 'DEVICE_NOT_FOUND'; end if;
  if not can_access_store(v_store) then raise exception 'STORE_ACCESS_DENIED'; end if;
  update devices set status = 'revoked' where device_id = p_device_id;
end $$;

create or replace function activate_device(p_device_id text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_store uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select store_id into v_store from devices where device_id = p_device_id;
  if v_store is null then raise exception 'DEVICE_NOT_FOUND'; end if;
  if not can_access_store(v_store) then raise exception 'STORE_ACCESS_DENIED'; end if;
  update devices set status = 'active' where device_id = p_device_id;
end $$;

revoke all on function pair_device(text) from public;
grant execute on function pair_device(text) to authenticated;
revoke all on function revoke_device(text) from public;
grant execute on function revoke_device(text) to authenticated;
revoke all on function activate_device(text) from public;
grant execute on function activate_device(text) to authenticated;
