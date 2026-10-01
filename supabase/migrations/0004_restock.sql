-- POS remains the stock writer. Web users can read the POS catalog and submit
-- pending restock requests, but only the signed device exchange mutates stock.
create table stock_items (
  store_id uuid not null references stores(id) on delete cascade,
  item_type text not null check (item_type in ('ingredient', 'menu')),
  item_id text not null,
  name text not null,
  unit text,
  current_stock numeric(14,3) default 0 check (current_stock >= 0),
  min_stock numeric(14,3) not null default 0 check (min_stock >= 0),
  pos_updated_at timestamptz,
  primary key (store_id, item_type, item_id)
);

create table restock_events (
  id uuid primary key,
  store_id uuid not null references stores(id) on delete cascade,
  batch_id uuid not null,
  item_type text not null check (item_type in ('ingredient', 'menu')),
  item_id text not null,
  item_name text not null,
  qty numeric(14,3) not null check (qty > 0 and qty <= 1000000),
  unit text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'applied', 'rejected', 'cancelled')),
  reject_reason text,
  stock_after numeric(14,3),
  created_by uuid not null references auth.users(id),
  requester_name text,
  requester_email text,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  applied_by_device text,
  processing_at timestamptz,
  processing_by_device text
);
create index restock_events_store_status_created
  on restock_events (store_id, status, created_at);

create table stock_sync_state (
  store_id uuid primary key references stores(id) on delete cascade,
  device_id text not null,
  ingredients_enabled boolean not null default false,
  last_seen_at timestamptz not null default now()
);

alter table stock_items enable row level security;
alter table restock_events enable row level security;
alter table stock_sync_state enable row level security;

revoke all on stock_items, restock_events, stock_sync_state from anon, authenticated;
grant select on stock_items, restock_events, stock_sync_state to authenticated;

create policy stock_items_member_read on stock_items
  for select to authenticated using (can_access_store(store_id));
create policy restock_events_member_read on restock_events
  for select to authenticated using (can_access_store(store_id));
create policy stock_sync_member_read on stock_sync_state
  for select to authenticated using (can_access_store(store_id));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stock_items') then
      alter publication supabase_realtime add table public.stock_items;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'restock_events') then
      alter publication supabase_realtime add table public.restock_events;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stock_sync_state') then
      alter publication supabase_realtime add table public.stock_sync_state;
    end if;
  end if;
end $$;

create or replace function submit_restock(
  p_store_id uuid,
  p_batch_id uuid,
  p_item_type text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_permission text;
  v_item jsonb;
  v_id uuid;
  v_item_id text;
  v_qty numeric;
  v_name text;
  v_unit text;
  v_stock numeric;
  v_count integer;
  v_pending integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_batch_id is null then raise exception 'INVALID_BATCH'; end if;
  if p_item_type not in ('ingredient', 'menu') then raise exception 'INVALID_ITEM_TYPE'; end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_ITEMS'; end if;
  v_count := jsonb_array_length(p_items);
  if v_count < 1 or v_count > 200 then raise exception 'INVALID_ITEM_COUNT'; end if;

  select permission into v_permission
  from store_users where user_id = v_user and store_id = p_store_id;
  if v_permission is null then raise exception 'STORE_ACCESS_DENIED'; end if;
  if v_permission not in ('owner', 'staff') then raise exception 'RESTOCK_NOT_ALLOWED'; end if;
  perform pg_advisory_xact_lock(hashtext(p_store_id::text));

  select count(*) into v_pending from restock_events
  where store_id = p_store_id and status in ('pending', 'processing');
  if v_pending + v_count > 500 then raise exception 'PENDING_LIMIT_REACHED'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_id := (v_item->>'id')::uuid;
      v_qty := (v_item->>'qty')::numeric;
    exception when others then
      raise exception 'INVALID_ITEM';
    end;
    v_item_id := nullif(v_item->>'itemId', '');
    if v_item_id is null or v_qty is null or v_qty <= 0 or v_qty > 1000000 or v_qty <> round(v_qty, 3) then
      raise exception 'INVALID_ITEM';
    end if;

    select name, unit, current_stock into v_name, v_unit, v_stock
    from stock_items
    where store_id = p_store_id and item_type = p_item_type and item_id = v_item_id;
    if not found then raise exception 'ITEM_NOT_FOUND'; end if;
    if p_item_type = 'menu' and v_stock is null then raise exception 'UNTRACKED_STOCK'; end if;

    insert into restock_events (
      id, store_id, batch_id, item_type, item_id, item_name, qty, unit,
      note, created_by, requester_name, requester_email
    ) values (
      v_id, p_store_id, p_batch_id, p_item_type, v_item_id, v_name, v_qty,
      v_unit, left(coalesce(v_item->>'note', ''), 500), v_user,
      coalesce(auth.jwt()->'user_metadata'->>'name', auth.jwt()->>'email'),
      auth.jwt()->>'email'
    ) on conflict (id) do nothing;
  end loop;

  return p_batch_id;
end;
$$;

create or replace function cancel_restock(p_store_id uuid, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_permission text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select permission into v_permission from store_users
  where user_id = auth.uid() and store_id = p_store_id;
  if v_permission not in ('owner', 'staff') then raise exception 'RESTOCK_NOT_ALLOWED'; end if;
  update restock_events set status = 'cancelled'
  where id = p_id and store_id = p_store_id and status = 'pending';
  return found;
end;
$$;

revoke all on function submit_restock(uuid, uuid, text, jsonb) from public;
revoke all on function cancel_restock(uuid, uuid) from public;
grant execute on function submit_restock(uuid, uuid, text, jsonb) to authenticated;
grant execute on function cancel_restock(uuid, uuid) to authenticated;