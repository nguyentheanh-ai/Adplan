create extension if not exists "pgcrypto";

create table if not exists public.campaign_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id text,
  page_id text,
  mode text not null default 'new_campaign',
  name text not null,
  status text not null default 'draft',
  input_json jsonb not null default '{}'::jsonb,
  preview_json jsonb not null default '{}'::jsonb,
  meta_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id text,
  name text not null,
  mode text not null,
  template_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_scale_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id text not null,
  source_campaign_id text,
  source_adset_id text,
  action text not null,
  quantity integer not null default 1,
  budget_amount numeric,
  status text not null default 'draft',
  request_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_clone_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id text not null,
  source_type text not null,
  source_id text not null,
  cloned_ids jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  request_json jsonb not null default '{}'::jsonb,
  response_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists campaign_drafts_user_id_idx on public.campaign_drafts(user_id);
create index if not exists campaign_drafts_account_id_idx on public.campaign_drafts(account_id);
create index if not exists campaign_sequences_user_id_idx on public.campaign_sequences(user_id);
create index if not exists campaign_scale_jobs_user_id_idx on public.campaign_scale_jobs(user_id);
create index if not exists campaign_clone_logs_user_id_idx on public.campaign_clone_logs(user_id);

drop trigger if exists campaign_drafts_set_updated_at on public.campaign_drafts;
create trigger campaign_drafts_set_updated_at
before update on public.campaign_drafts
for each row execute function public.set_updated_at();

drop trigger if exists campaign_sequences_set_updated_at on public.campaign_sequences;
create trigger campaign_sequences_set_updated_at
before update on public.campaign_sequences
for each row execute function public.set_updated_at();

drop trigger if exists campaign_scale_jobs_set_updated_at on public.campaign_scale_jobs;
create trigger campaign_scale_jobs_set_updated_at
before update on public.campaign_scale_jobs
for each row execute function public.set_updated_at();

alter table public.campaign_drafts enable row level security;
alter table public.campaign_sequences enable row level security;
alter table public.campaign_scale_jobs enable row level security;
alter table public.campaign_clone_logs enable row level security;

drop policy if exists "Users manage own campaign drafts" on public.campaign_drafts;
create policy "Users manage own campaign drafts" on public.campaign_drafts
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own campaign sequences" on public.campaign_sequences;
create policy "Users manage own campaign sequences" on public.campaign_sequences
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own campaign scale jobs" on public.campaign_scale_jobs;
create policy "Users manage own campaign scale jobs" on public.campaign_scale_jobs
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users read own campaign clone logs" on public.campaign_clone_logs;
create policy "Users read own campaign clone logs" on public.campaign_clone_logs
for select to authenticated
using (auth.uid() = user_id);
