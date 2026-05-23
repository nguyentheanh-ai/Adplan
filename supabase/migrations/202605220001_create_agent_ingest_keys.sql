create table if not exists public.agent_ingest_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  key_hash text not null unique,
  key_prefix text not null,
  label text not null default 'Agent key',
  permissions jsonb not null default '{"canIngestDraft": true, "canPublishDirect": false, "canSchedule": false}'::jsonb,
  allowed_page_ids jsonb not null default '[]'::jsonb,
  daily_post_limit integer,
  allowed_window_json jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists agent_ingest_keys_user_id_idx on public.agent_ingest_keys(user_id, created_at desc);
create index if not exists agent_ingest_keys_revoked_idx on public.agent_ingest_keys(revoked_at);

drop trigger if exists agent_ingest_keys_set_updated_at on public.agent_ingest_keys;
create trigger agent_ingest_keys_set_updated_at
before update on public.agent_ingest_keys
for each row
execute function public.set_updated_at();

alter table public.agent_ingest_keys enable row level security;

drop policy if exists "Users manage own agent ingest keys" on public.agent_ingest_keys;
create policy "Users manage own agent ingest keys" on public.agent_ingest_keys
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.agent_ingest_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  agent_key_id uuid references public.agent_ingest_keys(id) on delete set null,
  action text not null,
  page_id text,
  title text,
  status text not null default 'success',
  post_id text,
  request_json jsonb not null default '{}'::jsonb,
  response_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists agent_ingest_logs_user_created_idx on public.agent_ingest_logs(user_id, created_at desc);
create index if not exists agent_ingest_logs_key_created_idx on public.agent_ingest_logs(agent_key_id, created_at desc);

alter table public.agent_ingest_logs enable row level security;

drop policy if exists "Users read own agent ingest logs" on public.agent_ingest_logs;
create policy "Users read own agent ingest logs" on public.agent_ingest_logs
for select
using (auth.uid() = user_id);

create table if not exists public.facebook_provider_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  facebook_user_id text,
  access_token_encrypted text not null,
  token_expires_at timestamptz,
  granted_scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facebook_provider_tokens_facebook_user_id_idx on public.facebook_provider_tokens(facebook_user_id);

drop trigger if exists facebook_provider_tokens_set_updated_at on public.facebook_provider_tokens;
create trigger facebook_provider_tokens_set_updated_at
before update on public.facebook_provider_tokens
for each row
execute function public.set_updated_at();

alter table public.facebook_provider_tokens enable row level security;
