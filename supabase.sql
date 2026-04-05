-- Run this in Supabase SQL editor to create the deposit_requests table
create table if not exists public.deposit_requests (
  id text primary key,
  account_id text,
  token_code text,
  token_name text,
  network_label text,
  address text,
  requested_amount_usd numeric,
  credited_amount_usd numeric,
  status text,
  copied_at timestamptz,
  submitted_by_telegram_id text,
  approval_message text,
  created_at timestamptz default timezone('utc'::text, now()),
  reviewed_at timestamptz
);
