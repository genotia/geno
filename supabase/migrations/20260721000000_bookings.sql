-- Customer bookings.
-- Written from the browser by the logged-in user, so row level security is
-- what keeps one person's bookings out of another person's account.

create table if not exists public.bookings (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  deal_id    text,
  merchant   text not null,
  offer      text,
  "window"   text,
  price      int not null default 0,
  code       text,
  -- 'booked' straight from a deal, or 'negotiated' after agreeing a price.
  kind       text not null default 'booked'
             check (kind in ('booked', 'negotiated')),
  status     text not null default 'confirmed'
             check (status in ('confirmed', 'cancelled', 'redeemed')),
  created_at timestamptz not null default now()
);

create index if not exists bookings_user_idx
  on public.bookings (user_id, created_at desc);

alter table public.bookings enable row level security;

-- Each policy is scoped to the caller's own rows. There is deliberately no
-- policy for anon, so a logged-out client cannot read or write anything.
drop policy if exists "own bookings readable" on public.bookings;
create policy "own bookings readable"
  on public.bookings for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "own bookings insertable" on public.bookings;
create policy "own bookings insertable"
  on public.bookings for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "own bookings updatable" on public.bookings;
create policy "own bookings updatable"
  on public.bookings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own bookings deletable" on public.bookings;
create policy "own bookings deletable"
  on public.bookings for delete
  to authenticated
  using (auth.uid() = user_id);
