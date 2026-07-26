-- ── Phase 3: plan enforcement reads ──
-- The merchant dashboard gates modules by the merchant's plan. For that, a
-- merchant's own session needs to read (a) their own subscription row and
-- (b) the plan/module catalog. Until now both were admin-only, so the
-- dashboard could not see its own plan. These policies open exactly that —
-- own row + non-sensitive catalog — and nothing cross-tenant.
--
-- Enforcement fails OPEN: the dashboard only gates when it positively reads a
-- subscription row. Before this migration is applied a merchant reads nothing
-- back (RLS returns empty), so no module is locked — no one gets shut out
-- during the deploy window. Assigning a plan in the admin panel is what turns
-- gating on for a given merchant.

-- Catalog is not sensitive — any signed-in user may read it.
drop policy if exists "plans readable by signed in" on public.plans;
create policy "plans readable by signed in"
  on public.plans for select to authenticated using (true);

drop policy if exists "modules readable by signed in" on public.modules;
create policy "modules readable by signed in"
  on public.modules for select to authenticated using (true);

-- A merchant may read the subscription of a workspace they belong to. Admins
-- keep full read/write through the existing "subs managed by admins" policy;
-- multiple permissive policies are OR-ed, so this only widens SELECT.
drop policy if exists "merchant reads own subscription" on public.merchant_subscriptions;
create policy "merchant reads own subscription"
  on public.merchant_subscriptions for select to authenticated
  using (
    exists (
      select 1 from public.merchant_users mu
      where mu.merchant_id = merchant_subscriptions.merchant_id
        and mu.user_id = auth.uid()
    )
  );
