-- ── Admin-managed pricing catalog ──
-- The admin Plans & modules screen becomes the single source of truth for plan
-- prices + which modules each tier unlocks. Those values now drive BOTH the
-- MRR maths and the public merchant/pricing.html page.

-- 1. Align the seeded plan prices with the public pricing page, so turning on
--    DB-driven pricing doesn't visibly change the marketing site and MRR uses
--    the real advertised prices. (Edit freely afterwards in the panel.)
update public.plans set price_monthly = 199  where key = 'starter';   -- Marketplace
update public.plans set price_monthly = 599  where key = 'growth';     -- Business
update public.plans set price_monthly = 1199 where key = 'pro';        -- AI Pro

-- 2. Admins manage the catalog from the panel (edit price/tagline/name, and the
--    tier a module unlocks from). Read policies already exist; add write.
drop policy if exists "plans managed by admins" on public.plans;
create policy "plans managed by admins" on public.plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "modules managed by admins" on public.modules;
create policy "modules managed by admins" on public.modules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 3. The public pricing page is viewed by anonymous visitors, so they must be
--    able to read the (non-sensitive) catalog. Signed-in read already exists.
drop policy if exists "plans readable by anyone" on public.plans;
create policy "plans readable by anyone" on public.plans for select to anon using (true);
drop policy if exists "modules readable by anyone" on public.modules;
create policy "modules readable by anyone" on public.modules for select to anon using (true);
