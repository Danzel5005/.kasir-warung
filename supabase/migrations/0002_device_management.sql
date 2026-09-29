-- ============================================================================
-- Migration 0002: RPC manajemen perangkat oleh pemilik store (web-app)
--
-- Kenapa RPC, bukan policy UPDATE?
--   Memberi user izin UPDATE pada tabel devices berisiko: user bisa mengubah
--   `credential_hash`, `store_id`, atau `device_id` milik store-nya (atau
--   mencurangi isolasi). Dengan RPC `security definer`, kita batasi HANYA
--   kolom `status` yang boleh berubah, dan hanya untuk device milik user.
-- ============================================================================

-- Cabut perangkat (revoke). POS akan berhenti mengirim (403 DEVICE_REVOKED)
-- dan otomatis clearRegistration() via polling devices-status.
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

-- Aktifkan kembali perangkat yang di-revoke.
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

revoke all on function revoke_device(text) from public;
revoke all on function activate_device(text) from public;
grant execute on function revoke_device(text) to authenticated;
grant execute on function activate_device(text) to authenticated;
