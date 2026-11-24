-- BudgetFlow records are isolated from Settle Up's existing tables.
create schema if not exists budgetflow_private;
revoke all on schema budgetflow_private from public, anon;
grant usage on schema budgetflow_private to authenticated;

-- Check revocation as well as JWT ownership. This helper exposes only a boolean.
create function budgetflow_private.session_active() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions s join auth.users u on u.id = s.user_id
    where s.user_id = (select auth.uid())
      and s.id::text = (select auth.jwt()->>'session_id')
      and (s.not_after is null or s.not_after > now())
      and u.email_confirmed_at is not null and u.deleted_at is null
      and (u.banned_until is null or u.banned_until <= now())
  );
$$;
revoke all on function budgetflow_private.session_active() from public, anon;
grant execute on function budgetflow_private.session_active() to authenticated;

create table public.budgetflow_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  last_write_id uuid not null,
  updated_at timestamptz not null default now(),
  constraint budgetflow_snapshot_shape check ((
    jsonb_typeof(snapshot) = 'object' and
    snapshot->>'version' = '1' and snapshot->>'mode' = 'personal' and
    jsonb_typeof(snapshot->'profile') = 'object' and
    jsonb_typeof(snapshot->'months') = 'object' and
    jsonb_typeof(snapshot->'sources') = 'array' and
    jsonb_typeof(snapshot->'goals') = 'array' and
    jsonb_typeof(snapshot->'contributions') = 'array' and
    snapshot ? 'selectedMonth' and octet_length(snapshot::text) < 2000000
  ) is true)
);
alter table public.budgetflow_workspaces enable row level security;
revoke all on public.budgetflow_workspaces from public, anon, authenticated;
grant select, insert on public.budgetflow_workspaces to authenticated;
grant update (snapshot, revision, last_write_id, updated_at) on public.budgetflow_workspaces to authenticated;
create policy budgetflow_read_own on public.budgetflow_workspaces for select to authenticated
  using (owner_id = (select auth.uid()) and (select budgetflow_private.session_active()));
create policy budgetflow_insert_own on public.budgetflow_workspaces for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select budgetflow_private.session_active()));
create policy budgetflow_update_own on public.budgetflow_workspaces for update to authenticated
  using (owner_id = (select auth.uid()) and (select budgetflow_private.session_active()))
  with check (owner_id = (select auth.uid()) and (select budgetflow_private.session_active()));

-- Compare-and-swap avoids losing another tab's edits. A repeated request is safe.
create function public.budgetflow_save_workspace(
  p_owner_id uuid, p_expected_revision bigint, p_snapshot jsonb, p_write_id uuid
) returns bigint language plpgsql security invoker set search_path = ''
as $$
declare existing public.budgetflow_workspaces%rowtype;
begin
  if p_owner_id is distinct from (select auth.uid()) or not budgetflow_private.session_active() then
    raise exception 'An active, verified session is required.' using errcode = '42501';
  end if;
  select * into existing from public.budgetflow_workspaces
    where owner_id = p_owner_id for update;
  if not found then
    if p_expected_revision <> 0 then
      raise exception 'The saved plan changed. Reload before saving.' using errcode = '40001';
    end if;
    insert into public.budgetflow_workspaces (owner_id, snapshot, revision, last_write_id)
      values (p_owner_id, p_snapshot, 1, p_write_id) on conflict do nothing;
    if not found then
      raise exception 'The saved plan changed. Reload before saving.' using errcode = '40001';
    end if;
    return 1;
  end if;
  if existing.last_write_id = p_write_id and existing.snapshot = p_snapshot then
    return existing.revision;
  end if;
  if existing.revision <> p_expected_revision then
    raise exception 'The saved plan changed. Reload before saving.' using errcode = '40001';
  end if;
  update public.budgetflow_workspaces set snapshot = p_snapshot,
    revision = existing.revision + 1, last_write_id = p_write_id, updated_at = now()
    where owner_id = p_owner_id;
  return existing.revision + 1;
end;
$$;
revoke all on function public.budgetflow_save_workspace(uuid,bigint,jsonb,uuid) from public, anon;
grant execute on function public.budgetflow_save_workspace(uuid,bigint,jsonb,uuid) to authenticated;
