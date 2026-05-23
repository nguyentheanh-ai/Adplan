create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null,
  industry text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  answers_json jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'analyzing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  session_id uuid not null references public.question_sessions(id) on delete cascade,
  persona_json jsonb not null,
  ads_plan_json jsonb not null,
  raw_output text,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_audiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id text,
  code text not null,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id text,
  name text not null,
  objective text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  facebook_id text,
  role text not null default 'member' check (role in ('owner', 'manager', 'member')),
  locked_sections text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists question_sessions_user_id_idx on public.question_sessions(user_id);
create index if not exists question_sessions_project_id_idx on public.question_sessions(project_id);
create index if not exists ai_outputs_user_id_idx on public.ai_outputs(user_id);
create index if not exists ai_outputs_project_id_idx on public.ai_outputs(project_id);
create index if not exists ai_outputs_session_id_idx on public.ai_outputs(session_id);
create index if not exists saved_audiences_user_id_idx on public.saved_audiences(user_id);
create index if not exists campaign_templates_user_id_idx on public.campaign_templates(user_id);
create index if not exists admin_user_permissions_user_id_idx on public.admin_user_permissions(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists question_sessions_set_updated_at on public.question_sessions;
create trigger question_sessions_set_updated_at
before update on public.question_sessions
for each row execute function public.set_updated_at();

drop trigger if exists saved_audiences_set_updated_at on public.saved_audiences;
create trigger saved_audiences_set_updated_at
before update on public.saved_audiences
for each row execute function public.set_updated_at();

drop trigger if exists campaign_templates_set_updated_at on public.campaign_templates;
create trigger campaign_templates_set_updated_at
before update on public.campaign_templates
for each row execute function public.set_updated_at();

drop trigger if exists admin_user_permissions_set_updated_at on public.admin_user_permissions;
create trigger admin_user_permissions_set_updated_at
before update on public.admin_user_permissions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.question_sessions enable row level security;
alter table public.ai_outputs enable row level security;
alter table public.saved_audiences enable row level security;
alter table public.campaign_templates enable row level security;
alter table public.admin_user_permissions enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own projects" on public.projects;
create policy "Users can read own projects"
on public.projects for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own projects" on public.projects;
create policy "Users can insert own projects"
on public.projects for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
on public.projects for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own sessions" on public.question_sessions;
create policy "Users can read own sessions"
on public.question_sessions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own sessions" on public.question_sessions;
create policy "Users can insert own sessions"
on public.question_sessions for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own sessions" on public.question_sessions;
create policy "Users can update own sessions"
on public.question_sessions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own outputs" on public.ai_outputs;
create policy "Users can read own outputs"
on public.ai_outputs for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own outputs" on public.ai_outputs;
create policy "Users can insert own outputs"
on public.ai_outputs for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read own saved audiences" on public.saved_audiences;
create policy "Users can read own saved audiences"
on public.saved_audiences for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own saved audiences" on public.saved_audiences;
create policy "Users can insert own saved audiences"
on public.saved_audiences for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own saved audiences" on public.saved_audiences;
create policy "Users can update own saved audiences"
on public.saved_audiences for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own campaign templates" on public.campaign_templates;
create policy "Users can read own campaign templates"
on public.campaign_templates for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own campaign templates" on public.campaign_templates;
create policy "Users can insert own campaign templates"
on public.campaign_templates for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own campaign templates" on public.campaign_templates;
create policy "Users can update own campaign templates"
on public.campaign_templates for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Production planner/admin additions. Kept additive so existing projects can run this file safely.
alter table public.admin_user_permissions
  add column if not exists facebook_user_id text,
  add column if not exists facebook_name text,
  add column if not exists facebook_email text,
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists ad_account_ids jsonb not null default '[]'::jsonb,
  add column if not exists page_ids jsonb not null default '[]'::jsonb;

alter table public.admin_user_permissions
  drop constraint if exists admin_user_permissions_role_check;

alter table public.admin_user_permissions
  add constraint admin_user_permissions_role_check
  check (role in ('owner', 'manager', 'member', 'viewer'));

update public.admin_user_permissions
set facebook_user_id = coalesce(facebook_user_id, facebook_id)
where facebook_user_id is null;

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

create table if not exists public.facebook_provider_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  facebook_user_id text,
  access_token_encrypted text not null,
  token_expires_at timestamptz,
  granted_scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
