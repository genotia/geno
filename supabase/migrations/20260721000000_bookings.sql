-- Customer access to bookings.
--
-- NOTE: public.bookings already existed before this migration — it is the
-- merchant-side booking table that merchant/dashboard.html and the DealBox
-- booking form write to. Its columns are:
--
--   id, booking_ref, deal_id, deal_title, merchant_id, merchant_name,
--   time_slot, booking_date, customer_name, customer_email, customer_phone,
--   notes, status, created_at
--
-- So this migration deliberately does NOT create the table, and does NOT
-- enable row level security on it. Turning RLS on here would cut off the
-- merchant dashboard and the anonymous DealBox booking form, both of which
-- read and write this table today. Access is widened, never narrowed.
--
-- There is no user_id column, so a customer is matched on the email address
-- recorded against the booking.

-- Only takes effect if RLS is enabled on the table; harmless otherwise.
drop policy if exists "customers read their own bookings" on public.bookings;
create policy "customers read their own bookings"
  on public.bookings for select
  to authenticated
  using (lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "customers create their own bookings" on public.bookings;
create policy "customers create their own bookings"
  on public.bookings for insert
  to authenticated
  with check (lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Cancelling marks the row so the merchant sees it; customers never delete.
drop policy if exists "customers cancel their own bookings" on public.bookings;
create policy "customers cancel their own bookings"
  on public.bookings for update
  to authenticated
  using (lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
