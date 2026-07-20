-- Analytics + admin access.
--
-- Nothing was being recorded before this: logEvent() only pushed into an
-- in-memory array that died with the tab. This adds the events table the
-- admin panel reads, and the policies that let an admin — and only an
-- admin — read across every user's rows.

/* ── Who is an admin ──────────────────────────────────────────────────── */
create table if not exists public.admins (
  email      text primary key,
  added_at   timestamptz not null default now()
);

insert into public.admins (email) values ('balaji@genoti.ai')
  on conflict (email) do nothing;

-- security definer so the check itself is not subject to RLS on admins.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.admins enable row level security;
drop policy if exists "admins readable by admins" on public.admins;
create policy "admins readable by admins"
  on public.admins for select to authenticated using (public.is_admin());

/* ── Events ───────────────────────────────────────────────────────────── */
create table if not exists public.events (
  id         bigserial primary key,
  name       text not null,               -- page_view, search, category_view, book, …
  visitor_id text,                        -- stable per browser, so we can count people
  session_id text,                        -- resets per tab session
  user_id    uuid references auth.users (id) on delete set null,
  path       text,
  category   text,
  deal_id    text,
  merchant   text,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_created_idx  on public.events (created_at desc);
create index if not exists events_name_idx     on public.events (name, created_at desc);
create index if not exists events_visitor_idx  on public.events (visitor_id);

alter table public.events enable row level security;

-- Anyone may record an event: page views have to work for logged-out
-- visitors. Nobody but an admin may read them back.
drop policy if exists "anyone can record events" on public.events;
create policy "anyone can record events"
  on public.events for insert to anon, authenticated with check (true);

drop policy if exists "events readable by admins" on public.events;
create policy "events readable by admins"
  on public.events for select to authenticated using (public.is_admin());

/* ── Admin read access to the operational tables ──────────────────────── */
-- Customers keep their own-row policies from the bookings migration; this
-- adds a second, admin-only path so the panel can total across everyone.
drop policy if exists "bookings readable by admins" on public.bookings;
create policy "bookings readable by admins"
  on public.bookings for select to authenticated using (public.is_admin());

drop policy if exists "applications readable by admins" on public.merchant_applications;
create policy "applications readable by admins"
  on public.merchant_applications for select to authenticated using (public.is_admin());
