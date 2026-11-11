-- ====================================================================
-- Migration: 0001_init.sql
-- Description: Multi-Chain Asset Tracker Database Schema with Deny-All RLS
-- ====================================================================

-- 1. Table: Profiles / Users (Telegram Identity)
create table if not exists public.users (
  id bigint primary key, -- telegram_id
  username text,
  first_name text,
  currency_pref text not null default 'USD' check (currency_pref in ('USD', 'IDR')),
  min_alert_usd numeric(8, 2) not null default 1.00,
  hide_spam boolean not null default true,
  is_banned boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- 2. Table: Master Watched Addresses (Global Multi-Tenant Deduplication)
create table if not exists public.watched_addresses (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  blockchain text not null check (blockchain in ('ton', 'solana', 'ethereum', 'bsc', 'base', 'arbitrum', 'polygon')),
  is_active boolean not null default true,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique(address, blockchain)
);

-- 3. Table: User Wallets Association
create table if not exists public.user_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.users(id) on delete cascade,
  watched_address_id uuid not null references public.watched_addresses(id) on delete cascade,
  wallet_label text not null,
  is_demo boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique(user_id, watched_address_id)
);

-- 4. Table: Cached Token Balances (Prevents RPC Rate-Limiting)
-- Using 'nulls not distinct' so native coins (contract_address = NULL) do not duplicate
create table if not exists public.token_balances (
  id uuid primary key default gen_random_uuid(),
  watched_address_id uuid not null references public.watched_addresses(id) on delete cascade,
  token_symbol text not null,
  token_name text not null,
  contract_address text, -- NULL for native coins (ETH, BNB, SOL, TON)
  balance numeric(28, 8) not null default 0,
  price_usd numeric(18, 4) not null default 0,
  value_usd numeric(18, 2) not null default 0,
  logo_url text,
  is_spam boolean not null default false,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique nulls not distinct (watched_address_id, token_symbol, contract_address)
);

-- 5. Table: Transactions / Cash Flow (Webhook Idempotency)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  watched_address_id uuid not null references public.watched_addresses(id) on delete cascade,
  tx_hash text not null,
  blockchain text not null check (blockchain in ('ton', 'solana', 'ethereum', 'bsc', 'base', 'arbitrum', 'polygon')),
  direction text not null check (direction in ('in', 'out')),
  token_symbol text not null,
  amount numeric(28, 8) not null,
  amount_usd numeric(18, 2),
  from_address text not null,
  to_address text not null,
  timestamp timestamp with time zone not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique(blockchain, tx_hash, watched_address_id)
);

-- 6. Table: Daily Portfolio Snapshots (Performance Line/Bar Charts)
create table if not exists public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.users(id) on delete cascade,
  total_value_usd numeric(14, 2) not null,
  recorded_at date not null default current_date,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique(user_id, recorded_at)
);

-- 7. Table: Global System Configuration & Kill Switches
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Seed default configuration
insert into public.app_config (key, value)
values
  ('maintenance_mode', '{"enabled": false, "message": "Server sedang dalam pemeliharaan berkala."}'::jsonb),
  ('max_wallets_per_user', '{"limit": 10}'::jsonb),
  ('demo_whale_wallets', '{"addresses": [{"address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "label": "Vitalik (EVM)"}, {"address": "EQBynBO23ywHy_CgarY9NK9FTz0yDsGvvqq23W61hYUWjVWU", "label": "TON Foundation"}, {"address": "vines1vzrYbzLMRdu58syJa2uSz6DmEcYRVDZZ6255L", "label": "Solana Whale"}]}'::jsonb)
on conflict (key) do nothing;

-- ====================================================================
-- Performance Indexes
-- ====================================================================
create index if not exists idx_user_wallets_user_id on public.user_wallets(user_id);
create index if not exists idx_user_wallets_watched on public.user_wallets(watched_address_id);
create index if not exists idx_watched_addresses_active on public.watched_addresses(is_active);
create index if not exists idx_token_balances_watched on public.token_balances(watched_address_id);
create index if not exists idx_transactions_watched_time on public.transactions(watched_address_id, timestamp desc);
create index if not exists idx_portfolio_snapshots_user_date on public.portfolio_snapshots(user_id, recorded_at desc);

-- ====================================================================
-- Security: Enable Deny-All Row Level Security (RLS)
-- Direct access from public / anon client keys is completely blocked.
-- Cloudflare Worker accesses the database using the Service Role Key.
-- ====================================================================
alter table public.users enable row level security;
alter table public.watched_addresses enable row level security;
alter table public.user_wallets enable row level security;
alter table public.token_balances enable row level security;
alter table public.transactions enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.app_config enable row level security;
