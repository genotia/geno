-- ── Phase 4 (part 1): upgrade requests + plan-change audit log ──
-- Closes the control loop: a merchant can request an upgrade from a locked
-- module; the admin sees pending requests and assigns the plan; every change
-- to a subscription is recorded automatically.

-- 1. Audit log. Written by a trigger, not the app, so it captures ALL changes
--    (admin panel, SQL editor, anything) and cannot be bypassed.
create table if not exists public.plan_change_log (
  id          bigint generated always as identity primary key,
  merchant_id uuid references public.merchants(id) on delete cascade,
  actor_email text,                 -- who made the change (null for service-role/SQL)
  from_plan   text, to_plan   text,
  from_status text, to_status text,
  changed_at  timestamptz not null default now()
);
create index if not exists plan_change_log_merchant_idx on public.plan_change_log (merchant_id, changed_at desc);

alter table public.plan_change_log enable row level security;
drop policy if exists "plan log readable by admins" on public.plan_change_log;
create policy "plan log readable by admins"
  on public.plan_change_log for select to authenticated using (public.is_admin());

create or replace function public.log_plan_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Skip no-op updates (something other than plan/status changed).
  if tg_op = 'UPDATE'
     and new.plan_key is not distinct from old.plan_key
     and new.status   is not distinct from old.status then
    return new;
  end if;
  insert into public.plan_change_log (merchant_id, actor_email, from_plan, to_plan, from_status, to_status)
  values (
    new.merchant_id,
    nullif(auth.jwt() ->> 'email', ''),
    case when tg_op = 'UPDATE' then old.plan_key end, new.plan_key,
    case when tg_op = 'UPDATE' then old.status  end, new.status
  );
  return new;
end $$;

drop trigger if exists trg_log_plan_change on public.merchant_subscriptions;
create trigger trg_log_plan_change
  after insert or update on public.merchant_subscriptions
  for each row execute function public.log_plan_change();

-- 2. Upgrade requests raised by merchants from a locked module.
create table if not exists public.upgrade_requests (
  id                 bigint generated always as identity primary key,
  merchant_id        uuid not null references public.merchants(id) on delete cascade,
  requested_by       uuid,                    -- auth.users id
  current_plan_key   text,
  requested_plan_key text,
  note               text,
  status             text not null default 'pending'
                     check (status in ('pending', 'actioned', 'dismissed')),
  created_at         timestamptz not null default now(),
  actioned_at        timestamptz,
  actioned_by        text
);
create index if not exists upgrade_requests_status_idx on public.upgrade_requests (status, created_at desc);

alter table public.upgrade_requests enable row level security;

-- A merchant may raise / see requests for a workspace they belong to.
drop policy if exists "merchant creates upgrade request" on public.upgrade_requests;
create policy "merchant creates upgrade request"
  on public.upgrade_requests for insert to authenticated
  with check (exists (
    select 1 from public.merchant_users mu
    where mu.merchant_id = upgrade_requests.merchant_id and mu.user_id = auth.uid()));

drop policy if exists "merchant reads own upgrade requests" on public.upgrade_requests;
create policy "merchant reads own upgrade requests"
  on public.upgrade_requests for select to authenticated
  using (exists (
    select 1 from public.merchant_users mu
    where mu.merchant_id = upgrade_requests.merchant_id and mu.user_id = auth.uid()));

-- Admins see and action everything.
drop policy if exists "upgrade requests managed by admins" on public.upgrade_requests;
create policy "upgrade requests managed by admins"
  on public.upgrade_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
