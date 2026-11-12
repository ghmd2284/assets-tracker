-- ====================================================================
-- Migration: 0002_rewards.sql
-- Description: GigaPub Monetization, OfferWall Claims & Rewarded Video Schema
-- ====================================================================

-- 1. Table: User Rewards (OfferWall claims & Rewarded Video audit log)
create table if not exists public.user_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.users(id) on delete cascade,
  reward_id text not null,
  project_id text,
  reward_type text not null default 'offerwall' check (reward_type in ('offerwall', 'video_ad', 'bonus')),
  amount numeric(18, 2) not null default 0,
  hash text,
  confirmation_hash text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique(user_id, reward_id)
);

-- 2. Add columns to public.users for reward points and bonus wallet slots
alter table public.users add column if not exists reward_points numeric(18, 2) not null default 0;
alter table public.users add column if not exists bonus_wallet_slots int not null default 0;

-- 3. Indexes for reward query performance
create index if not exists idx_user_rewards_user on public.user_rewards(user_id);
create index if not exists idx_user_rewards_created_at on public.user_rewards(created_at desc);

-- 4. Enable RLS with service-role full access
alter table public.user_rewards enable row level security;
