-- OTP codes table for custom Mailgun-based email verification
create table if not exists public.otp_codes (
  id          uuid        default gen_random_uuid() primary key,
  email       text        not null,
  code        text        not null,
  expires_at  timestamptz not null,
  used        boolean     default false,
  created_at  timestamptz default now()
);

create index if not exists otp_codes_lookup
  on public.otp_codes (email, used, expires_at);

-- Only the service role (edge functions) can read/write this table
alter table public.otp_codes enable row level security;

-- Auto-delete expired codes (optional cleanup)
create index if not exists otp_codes_expires
  on public.otp_codes (expires_at);
