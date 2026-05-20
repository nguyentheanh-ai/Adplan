create extension if not exists "pgcrypto";

create table if not exists public.meta_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'running',
  date_start date not null,
  date_end date not null,
  account_count integer not null default 0,
  campaign_count integer not null default 0,
  ad_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.meta_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sync_run_id uuid references public.meta_sync_runs(id) on delete set null,
  ad_account_id text not null,
  account_name text,
  currency text,
  timezone_name text,
  account_status integer,
  business_id text,
  business_name text,
  snapshot_date date not null default current_date,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, ad_account_id, snapshot_date)
);

create table if not exists public.meta_campaign_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sync_run_id uuid references public.meta_sync_runs(id) on delete set null,
  ad_account_id text not null,
  campaign_id text not null,
  campaign_name text,
  status text,
  objective text,
  date_start date not null,
  date_end date not null,
  spend numeric not null default 0,
  impressions numeric not null default 0,
  reach numeric not null default 0,
  clicks numeric not null default 0,
  leads numeric not null default 0,
  messages numeric not null default 0,
  engagements numeric not null default 0,
  purchases numeric not null default 0,
  ctr numeric not null default 0,
  cpc numeric not null default 0,
  cpm numeric not null default 0,
  cost_per_result numeric not null default 0,
  roas numeric,
  conversion_value numeric not null default 0,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, ad_account_id, campaign_id, date_start, date_end)
);

create table if not exists public.meta_ad_creative_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sync_run_id uuid references public.meta_sync_runs(id) on delete set null,
  ad_account_id text not null,
  campaign_id text,
  campaign_name text,
  adset_id text,
  adset_name text,
  ad_id text not null,
  ad_name text,
  creative_id text,
  creative_name text,
  post_id text,
  post_url text,
  format text,
  body text,
  headline text,
  description text,
  cta text,
  landing_url text,
  audience_age_range text,
  audience_gender text,
  audience_locations text,
  audience_interests text,
  audience_behaviors text,
  date_start date not null,
  date_end date not null,
  spend numeric not null default 0,
  impressions numeric not null default 0,
  reach numeric not null default 0,
  leads numeric not null default 0,
  messages numeric not null default 0,
  engagements numeric not null default 0,
  ctr numeric not null default 0,
  cpc numeric not null default 0,
  cpm numeric not null default 0,
  cpl numeric,
  cost_per_message numeric,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, ad_account_id, ad_id, date_start, date_end)
);

create table if not exists public.optimization_authorizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ad_account_id text not null,
  status text not null default 'disabled',
  allowed_actions jsonb not null default '[]'::jsonb,
  max_daily_budget_change_percent numeric not null default 20,
  max_daily_budget_change_amount numeric,
  require_manual_approval boolean not null default true,
  authorized_by text,
  authorized_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, ad_account_id)
);

create table if not exists public.optimization_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ad_account_id text not null,
  entity_type text not null,
  entity_id text not null,
  entity_name text,
  recommendation_type text not null,
  priority text not null default 'medium',
  title text not null,
  reason text not null,
  expected_impact text,
  action_payload jsonb not null default '{}'::jsonb,
  evidence_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  approved_by text,
  approved_at timestamptz,
  applied_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.industry_learning_profiles (
  id uuid primary key default gen_random_uuid(),
  industry_key text not null,
  objective text not null,
  sample_size integer not null default 0,
  median_ctr numeric,
  median_cpc numeric,
  median_cpm numeric,
  median_cpl numeric,
  median_cost_per_message numeric,
  winning_patterns jsonb not null default '{}'::jsonb,
  losing_patterns jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(industry_key, objective)
);

create index if not exists meta_sync_runs_user_id_idx on public.meta_sync_runs(user_id);
create index if not exists meta_account_snapshots_user_account_idx on public.meta_account_snapshots(user_id, ad_account_id);
create index if not exists meta_campaign_snapshots_user_account_idx on public.meta_campaign_snapshots(user_id, ad_account_id, date_start, date_end);
create index if not exists meta_ad_creative_snapshots_user_account_idx on public.meta_ad_creative_snapshots(user_id, ad_account_id, date_start, date_end);
create index if not exists optimization_authorizations_user_account_idx on public.optimization_authorizations(user_id, ad_account_id);
create index if not exists optimization_recommendations_user_account_idx on public.optimization_recommendations(user_id, ad_account_id, status);
create index if not exists industry_learning_profiles_industry_idx on public.industry_learning_profiles(industry_key, objective);

drop trigger if exists optimization_authorizations_set_updated_at on public.optimization_authorizations;
create trigger optimization_authorizations_set_updated_at
before update on public.optimization_authorizations
for each row execute function public.set_updated_at();

drop trigger if exists optimization_recommendations_set_updated_at on public.optimization_recommendations;
create trigger optimization_recommendations_set_updated_at
before update on public.optimization_recommendations
for each row execute function public.set_updated_at();

alter table public.meta_sync_runs enable row level security;
alter table public.meta_account_snapshots enable row level security;
alter table public.meta_campaign_snapshots enable row level security;
alter table public.meta_ad_creative_snapshots enable row level security;
alter table public.optimization_authorizations enable row level security;
alter table public.optimization_recommendations enable row level security;
alter table public.industry_learning_profiles enable row level security;

drop policy if exists "Users manage own meta sync runs" on public.meta_sync_runs;
create policy "Users manage own meta sync runs" on public.meta_sync_runs
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own account snapshots" on public.meta_account_snapshots;
create policy "Users manage own account snapshots" on public.meta_account_snapshots
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own campaign snapshots" on public.meta_campaign_snapshots;
create policy "Users manage own campaign snapshots" on public.meta_campaign_snapshots
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own creative snapshots" on public.meta_ad_creative_snapshots;
create policy "Users manage own creative snapshots" on public.meta_ad_creative_snapshots
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own optimization authorization" on public.optimization_authorizations;
create policy "Users manage own optimization authorization" on public.optimization_authorizations
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own optimization recommendations" on public.optimization_recommendations;
create policy "Users manage own optimization recommendations" on public.optimization_recommendations
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Authenticated users read industry learning profiles" on public.industry_learning_profiles;
create policy "Authenticated users read industry learning profiles" on public.industry_learning_profiles
for select to authenticated using (true);
