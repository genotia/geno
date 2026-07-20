-- Merchant applications.
-- Listing a business no longer creates an account directly. A request is
-- recorded here and emailed to the owner, who approves before any access
-- is granted.

create table if not exists public.merchant_applications (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  business_name  text not null,
  address        text,
  email          text not null,
  phone          text,
  num_branches   int,
  num_staff      int,
  plan           text,
  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  -- Secret that authorises the approve/reject links in the owner email.
  approval_token text not null default gen_random_uuid()::text,
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz,
  reviewed_by    text,
  notes          text
);

-- Safe to re-run if the table was created before the token column existed.
alter table if exists public.merchant_applications
  add column if not exists approval_token text not null default gen_random_uuid()::text;

create index if not exists merchant_applications_status_idx
  on public.merchant_applications (status, created_at desc);

create index if not exists merchant_applications_email_idx
  on public.merchant_applications (lower(email));

-- Row level security with no policies: the anon key can neither read nor
-- write. Only the edge function, which uses the service role key, can
-- insert. That is what stops a signup from granting itself access.
alter table public.merchant_applications enable row level security;
