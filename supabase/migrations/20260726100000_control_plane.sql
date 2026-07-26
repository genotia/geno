-- ── Platform control plane: plans, modules, subscriptions, usage ──
-- Powers the admin (balaji) control plane: who's onboarded, what plan they're
-- on, which modules exist per tier, and live usage. Visibility-first — nothing
-- here enforces limits on merchants yet; it's for the admin to see and assign.

-- 1. Plan catalog (prices in ₹/month; edit freely).
create table if not exists public.plans (
  key           text primary key,          -- starter | growth | pro
  name          text not null,             -- Marketplace | Business | AI Pro
  rank          int  not null,             -- higher unlocks more
  price_monthly int  not null default 0,
  tagline       text
);
insert into public.plans (key, name, rank, price_monthly, tagline) values
  ('starter', 'Marketplace', 1,    0, 'List services, post off-peak deals, take bookings online'),
  ('growth',  'Business',    2, 2499, 'Full operations — staff, inventory, loyalty, CRM and more'),
  ('pro',     'AI Pro',      3, 4999, 'Business plus AI agents, marketing automation and ads')
on conflict (key) do update
  set name = excluded.name, rank = excluded.rank, tagline = excluded.tagline;

-- 2. Module catalog. min_plan_rank = the lowest tier that unlocks it.
create table if not exists public.modules (
  key            text primary key,
  name           text not null,
  grp            text,            -- display grouping
  min_plan_rank  int  not null default 1,
  category_scope text[] default '{}'::text[],   -- empty = all categories
  sort           int  not null default 0
);
insert into public.modules (key, name, grp, min_plan_rank, sort) values
  ('services',           'Services',             'Marketplace', 1,  10),
  ('deals',              'Deals',                'Marketplace', 1,  20),
  ('bookings',           'Bookings',             'Marketplace', 1,  30),
  ('clients',            'Clients / CRM',        'Operations',  2,  40),
  ('staff',              'Staff',                'Operations',  2,  50),
  ('roster',             'Roster & leave',       'Operations',  2,  60),
  ('rooms',              'Rooms',                'Operations',  2,  70),
  ('memberships',        'Memberships',          'Operations',  2,  80),
  ('products',           'Products',             'Operations',  2,  90),
  ('inventory',          'Inventory',            'Operations',  2, 100),
  ('suppliers',          'Suppliers',            'Operations',  2, 110),
  ('loyalty',            'Loyalty',              'Operations',  2, 120),
  ('invoices',           'Invoices',             'Operations',  2, 130),
  ('marketing',          'Marketing automation', 'AI Pro',      3, 140),
  ('ads',                'Ads',                  'AI Pro',      3, 150),
  ('ai_agents',          'AI agents',            'AI Pro',      3, 160),
  ('campaign_templates', 'Campaign templates',   'AI Pro',      3, 170)
on conflict (key) do update
  set name = excluded.name, grp = excluded.grp, min_plan_rank = excluded.min_plan_rank, sort = excluded.sort;

-- 3. One subscription per merchant.
create table if not exists public.merchant_subscriptions (
  merchant_id   uuid primary key references public.merchants(id) on delete cascade,
  plan_key      text not null references public.plans(key) default 'growth',
  status        text not null default 'active'
                check (status in ('trial', 'active', 'past_due', 'cancelled')),
  started_at    timestamptz not null default now(),
  renews_at     timestamptz,
  trial_ends_at timestamptz,
  updated_at    timestamptz not null default now()
);
-- Default every existing merchant to Business/active (editable in the panel).
insert into public.merchant_subscriptions (merchant_id, plan_key, status)
select id, 'growth', 'active' from public.merchants
on conflict (merchant_id) do nothing;

-- 4. Per-merchant usage, counted live from the operational tables.
--    security definer so it can read across tenants; execute is restricted to
--    the service role, which the admin-metrics edge function uses.
create or replace function public.admin_merchant_usage()
returns table (
  merchant_id uuid,
  bookings    bigint,
  clients     bigint,
  staff       bigint,
  services    bigint,
  deals       bigint,
  products    bigint,
  memberships bigint,
  last_active timestamptz
)
language sql
security definer
set search_path = public
as $$
  select m.id,
    (select count(*) from bookings    b  where b.merchant_id  = m.id),
    (select count(*) from clients     c  where c.merchant_id  = m.id),
    (select count(*) from staff       s  where s.merchant_id  = m.id),
    (select count(*) from services    sv where sv.merchant_id = m.id),
    (select count(*) from deals       d  where d.merchant_id  = m.id),
    (select count(*) from products    p  where p.merchant_id  = m.id),
    (select count(*) from memberships mm where mm.merchant_id = m.id),
    (select max(b.created_at) from bookings b where b.merchant_id = m.id)
  from merchants m;
$$;
revoke all on function public.admin_merchant_usage() from public, anon, authenticated;

-- 5. RLS — catalog + subscriptions readable by admins (the panel reads these
--    directly); cross-tenant usage always goes through the service-role API.
alter table public.plans                 enable row level security;
alter table public.modules               enable row level security;
alter table public.merchant_subscriptions enable row level security;

drop policy if exists "plans read by admins" on public.plans;
create policy "plans read by admins" on public.plans for select to authenticated using (public.is_admin());
drop policy if exists "modules read by admins" on public.modules;
create policy "modules read by admins" on public.modules for select to authenticated using (public.is_admin());
drop policy if exists "subs managed by admins" on public.merchant_subscriptions;
create policy "subs managed by admins" on public.merchant_subscriptions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
