-- Ensure admins can write merchant_subscriptions from the panel.
-- RLS is enabled on the table, but the admin management policy from the
-- control-plane migration may be absent on the remote DB (that migration's
-- history was repaired, not re-run). Without a permissive policy for the
-- authenticated writer, an upsert fails: "new row violates row-level security
-- policy for table merchant_subscriptions". Service-role writes (onboarding)
-- bypass RLS, which is why those worked. Recreate the policy, idempotently.
drop policy if exists "subs managed by admins" on public.merchant_subscriptions;
create policy "subs managed by admins"
  on public.merchant_subscriptions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Same belt-and-braces for the catalog admin-write policies, in case they were
-- lost the same way (safe no-ops if already present).
drop policy if exists "plans managed by admins" on public.plans;
create policy "plans managed by admins" on public.plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "modules managed by admins" on public.modules;
create policy "modules managed by admins" on public.modules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
