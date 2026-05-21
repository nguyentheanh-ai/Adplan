create table if not exists public.ad_clone_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  ad_account_id text not null,
  source_ad_id text not null,
  target_adset_id text,
  endpoint text not null,
  status text not null default 'failed',
  method text,
  meta_error_code text,
  meta_error_subcode text,
  fbtrace_id text,
  copied_ad_id text,
  request_json jsonb not null default '{}'::jsonb,
  response_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ad_clone_logs enable row level security;

drop policy if exists "Users can read own ad clone logs" on public.ad_clone_logs;
create policy "Users can read own ad clone logs"
  on public.ad_clone_logs
  for select
  using (auth.uid() = user_id);

create index if not exists ad_clone_logs_user_created_idx
  on public.ad_clone_logs (user_id, created_at desc);

create index if not exists ad_clone_logs_account_source_idx
  on public.ad_clone_logs (ad_account_id, source_ad_id);
