create extension if not exists "pgcrypto";

create table if not exists public.optimization_action_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ad_account_id text not null,
  recommendation_id uuid references public.optimization_recommendations(id) on delete set null,
  action_type text not null,
  entity_type text not null,
  entity_id text not null,
  status text not null default 'pending',
  request_json jsonb not null default '{}'::jsonb,
  response_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists optimization_action_logs_user_account_idx
on public.optimization_action_logs(user_id, ad_account_id, created_at desc);

create index if not exists optimization_action_logs_recommendation_idx
on public.optimization_action_logs(recommendation_id);

alter table public.optimization_action_logs enable row level security;

drop policy if exists "Users read own optimization action logs" on public.optimization_action_logs;
create policy "Users read own optimization action logs" on public.optimization_action_logs
for select to authenticated
using (auth.uid() = user_id);
