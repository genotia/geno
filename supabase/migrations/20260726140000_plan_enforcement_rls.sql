-- ── Phase 4 (part 2): DB-level plan enforcement ──
-- Phase 3 gates modules in the UI. This closes the API back-door: a merchant
-- on a lower plan cannot read or write the tables behind higher-tier modules,
-- even outside the dashboard. Enforcement is a RESTRICTIVE policy layered on
-- top of each table's existing tenant-isolation policies (restrictive policies
-- are AND-ed with permissive ones), so tenant scoping is unchanged — we only
-- additionally require a high-enough plan.
--
-- Service-role access (the admin-metrics function and any backend job) bypasses
-- RLS entirely, so the admin control plane is unaffected.
--
-- FAILS OPEN: merchant_plan_rank() returns 999 when a merchant has no
-- subscription row, so un-provisioned / newly onboarded merchants are NOT
-- restricted. Enforcement only bites once a real plan is assigned — matching
-- the Phase 3 UI behaviour. Suspension is deliberately NOT enforced here (it
-- would risk locking a merchant out of their own data on an admin misclick);
-- suspension stays a UI pause. This gate is about plan TIER only.

-- Rank of a merchant's plan, or 999 when none is assigned (fail open).
create or replace function public.merchant_plan_rank(m_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.rank
       from public.merchant_subscriptions s
       join public.plans p on p.key = s.plan_key
      where s.merchant_id = m_id
      limit 1),
    999);
$$;

-- Apply the gate. Business (rank ≥ 2) tables and AI Pro (rank ≥ 3) tables.
-- A DO block keeps it DRY and atomic: if any table is missing the whole
-- migration rolls back rather than half-applying.
do $$
declare
  t text;
  business text[] := array[
    'staff','staff_leave','roster',
    'clients','client_segments','loyalty_transactions','loyalty_tiers','loyalty_config',
    'memberships','products',
    'inventory_items','inventory_usage','inventory_intakes','inventory_adjustments',
    'suppliers','invoices'];
  aipro text[] := array[
    'marketing_campaigns','campaign_templates',
    'ad_campaigns','ad_audiences','ad_creatives','merchant_fb_connections'];
begin
  foreach t in array business loop
    execute format('drop policy if exists %I on public.%I', 'plan gate business', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated '
      'using (public.merchant_plan_rank(merchant_id) >= 2) '
      'with check (public.merchant_plan_rank(merchant_id) >= 2)',
      'plan gate business', t);
  end loop;

  foreach t in array aipro loop
    execute format('drop policy if exists %I on public.%I', 'plan gate aipro', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated '
      'using (public.merchant_plan_rank(merchant_id) >= 3) '
      'with check (public.merchant_plan_rank(merchant_id) >= 3)',
      'plan gate aipro', t);
  end loop;
end $$;
