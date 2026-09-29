-- ============================================================================
-- DEN POS — Cloud Sync middleware (PLAN-WEBSYNC)
-- Migration 0001: tabel, RLS, helper, RPC pairing.
--
-- Catatan desain:
--  * POS bukan Supabase Auth user → auth mesin pakai HMAC, ditangani Edge
--    Function (service_role). RLS di sini hanya untuk web-app (auth.uid()).
--  * Secret perangkat TIDAK disimpan plaintext: devices.credential_hash =
--    sha256(device_secret). Pairing code juga disimpan sebagai hash.
--  * Isolasi store dilakukan di DATABASE (RLS), bukan di React.
-- ============================================================================

-- pgcrypto (digest/gen_random_uuid) — biasanya sudah ada di Supabase, ini jaga-jaga.
create extension if not exists pgcrypto;

-- ── STORES ──────────────────────────────────────────────────────────────────
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- ── DEVICES ─────────────────────────────────────────────────────────────────
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete set null,
  device_id text unique not null,                 -- dev_xxxx dari POS
  device_name text,
  credential_hash text not null,                  -- sha256(device_secret)
  status text not null default 'pending',         -- pending | active | revoked
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_devices_store on devices(store_id);
create index if not exists idx_devices_status on devices(status);

-- ── PAIRING CODES (disimpan sebagai HASH) ───────────────────────────────────
create table if not exists pairing_codes (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references devices(device_id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_pairing_device on pairing_codes(device_id);
create index if not exists idx_pairing_active on pairing_codes(code_hash) where used_at is null;

-- ── STORE_USERS (dasar RLS) ─────────────────────────────────────────────────
create table if not exists store_users (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  permission text not null default 'owner',       -- owner | staff | viewer
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);
create index if not exists idx_store_users_user on store_users(user_id);

-- ── SYNCED TRANSACTIONS (idempoten per store+trx) ───────────────────────────
create table if not exists synced_transactions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  device_id text not null,
  trx_id text not null,
  batch_id uuid,
  payload jsonb not null,
  occurred_at timestamptz,
  synced_at timestamptz not null default now(),
  unique (store_id, trx_id)
);
create index if not exists idx_synced_trx_store_time on synced_transactions(store_id, occurred_at desc);

-- ── DEVICE NONCES (anti-replay) ─────────────────────────────────────────────
-- Edge Function mencatat nonce yang sudah dipakai; request dengan nonce sama
-- dalam window timestamp ditolak. Baris lama dibersihkan berkala (lihat komentar
-- di akhir file).
create table if not exists device_nonces (
  device_id text not null,
  nonce text not null,
  seen_at timestamptz not null default now(),
  primary key (device_id, nonce)
);
create index if not exists idx_device_nonces_seen on device_nonces(seen_at);

-- ============================================================================
-- RLS — isolasi store untuk WEB-APP (auth.uid())
-- ============================================================================

alter table stores enable row level security;
alter table devices enable row level security;
alter table store_users enable row level security;
alter table synced_transactions enable row level security;
alter table pairing_codes enable row level security;
-- device_nonces: TIDAK diberi policy -> hanya service_role yang menyentuh.

-- Helper: apakah user yang login boleh melihat store ini?
-- security definer supaya bisa membaca store_users tanpa policy rekursif.
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

-- User hanya melihat store miliknya.
drop policy if exists store_member_read on stores;
create policy store_member_read on stores
  for select using (can_access_store(id));

-- User melihat perangkat milik store-nya sendiri.
drop policy if exists store_member_read_devices on devices;
create policy store_member_read_devices on devices
  for select using (can_access_store(store_id));

-- User melihat transaksi milik store-nya sendiri.
drop policy if exists store_member_read_trx on synced_transactions;
create policy store_member_read_trx on synced_transactions
  for select using (can_access_store(store_id));

-- User melihat keanggotaan store-nya sendiri (perlu untuk memuat daftar store).
drop policy if exists store_member_read_membership on store_users;
create policy store_member_read_membership on store_users
  for select using (user_id = auth.uid());

-- pairing_codes: TIDAK ada policy -> web-app memakai RPC pair_device()
-- (security definer) dan tidak menyentuh tabel ini langsung.

-- ============================================================================
-- RPC: pair_device(code) — dipanggil WEB-APP setelah user login.
-- Menghubungkan user -> store -> device. Kode sekali pakai, ada kedaluwarsa.
-- ============================================================================
create or replace function pair_device(p_code text)
returns table (store_id uuid, store_name text)
language plpgsql
security definer
-- PENTING: `extensions` ikut di search_path karena pgcrypto (digest,
-- gen_random_uuid) dipasang di schema `extensions` oleh Supabase.
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

  -- Cari kode yang cocok & masih berlaku. `code_hash` memakai sha256(hex) dari
  -- kode uppercase tanpa spasi — samakan dengan pembuatan di devices-register.
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

  -- Store untuk device ini (dibuat sekali saat pairing pertama).
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
    -- Device yang menunggu di-aktifkan kembali (mis. setelah revoke).
    update devices set status = 'active'
      where device_id = v_row.device_id and status <> 'active';
  end if;

  -- Hubungkan user ke store sebagai owner (sekali saja).
  insert into store_users(user_id, store_id, permission)
  values (v_uid, v_store, 'owner')
  on conflict do nothing;

  -- Kode sekali pakai.
  update pairing_codes
    set used_at = now(), used_by = v_uid
    where id = v_row.id;

  return query select v_store, v_name;
end $$;

-- Hanya user login yang boleh memanggil pair_device.
revoke all on function pair_device(text) from public;
grant execute on function pair_device(text) to authenticated;

-- ============================================================================
-- PEMBERSIHAN (opsional, jalankan berkala via pg_cron bila tersedia)
--   delete from pairing_codes where expires_at < now() - interval '1 day';
--   delete from device_nonces  where seen_at    < now() - interval '1 hour';
-- ============================================================================
