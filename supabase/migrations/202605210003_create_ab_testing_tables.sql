create extension if not exists "pgcrypto";

create table if not exists public.campaign_ab_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id text not null,
  name text not null,
  hypothesis text,
  test_variable text not null default 'creative',
  status text not null default 'draft',
  budget_split jsonb not null default '{}'::jsonb,
  schedule_json jsonb not null default '{}'::jsonb,
  winner_rule_json jsonb not null default '{}'::jsonb,
  preview_json jsonb not null default '{}'::jsonb,
  meta_experiment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_ab_test_variants (
  id uuid primary key default gen_random_uuid(),
  ab_test_id uuid not null references public.campaign_ab_tests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  variant_type text not null default 'creative',
  campaign_id text,
  adset_id text,
  ad_id text,
  payload jsonb not null default '{}'::jsonb,
  metrics_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_ab_tests_user_id_idx on public.campaign_ab_tests(user_id);
create index if not exists campaign_ab_tests_account_id_idx on public.campaign_ab_tests(account_id);
create index if not exists campaign_ab_test_variants_test_id_idx on public.campaign_ab_test_variants(ab_test_id);
create index if not exists campaign_ab_test_variants_user_id_idx on public.campaign_ab_test_variants(user_id);

drop trigger if exists campaign_ab_tests_set_updated_at on public.campaign_ab_tests;
create trigger campaign_ab_tests_set_updated_at
before update on public.campaign_ab_tests
for each row execute function public.set_updated_at();

drop trigger if exists campaign_ab_test_variants_set_updated_at on public.campaign_ab_test_variants;
create trigger campaign_ab_test_variants_set_updated_at
before update on public.campaign_ab_test_variants
for each row execute function public.set_updated_at();

alter table public.campaign_ab_tests enable row level security;
alter table public.campaign_ab_test_variants enable row level security;

drop policy if exists "Users manage own ab tests" on public.campaign_ab_tests;
create policy "Users manage own ab tests" on public.campaign_ab_tests
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own ab test variants" on public.campaign_ab_test_variants;
create policy "Users manage own ab test variants" on public.campaign_ab_test_variants
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
