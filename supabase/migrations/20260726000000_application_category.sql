-- Category-gated merchant onboarding.
-- Every signup now files an application tagged with its business category;
-- an admin verifies the category and approves, which provisions the tenant.

alter table if exists public.merchant_applications
  add column if not exists category text;

-- The template merchant whose catalog (services, loyalty, memberships…) is
-- copied into every newly-approved salon/spa merchant. Set this to the
-- merchant_id of your built-out spa1admin workspace.
create table if not exists public.onboarding_config (
  key   text primary key,
  value text
);
insert into public.onboarding_config (key, value) values ('salon_spa_template_merchant_id', '')
  on conflict (key) do nothing;

alter table public.onboarding_config enable row level security;
-- Readable/writable by admins only (via is_admin(), defined in the analytics migration).
drop policy if exists "onboarding_config admins" on public.onboarding_config;
create policy "onboarding_config admins"
  on public.onboarding_config for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
