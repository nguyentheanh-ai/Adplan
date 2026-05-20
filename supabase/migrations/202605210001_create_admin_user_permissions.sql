create extension if not exists "pgcrypto";

create table if not exists public.admin_user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  facebook_id text,
  facebook_user_id text,
  facebook_name text,
  facebook_email text,
  role text not null default 'viewer',
  permissions jsonb not null default '{}'::jsonb,
  ad_account_ids jsonb not null default '[]'::jsonb,
  page_ids jsonb not null default '[]'::jsonb,
  locked_sections text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_user_permissions
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists facebook_id text,
  add column if not exists facebook_user_id text,
  add column if not exists facebook_name text,
  add column if not exists facebook_email text,
  add column if not exists role text not null default 'viewer',
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists ad_account_ids jsonb not null default '[]'::jsonb,
  add column if not exists page_ids jsonb not null default '[]'::jsonb,
  add column if not exists locked_sections text[] not null default '{}',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.admin_user_permissions
  drop constraint if exists admin_user_permissions_role_check;

alter table public.admin_user_permissions
  add constraint admin_user_permissions_role_check
  check (role in ('owner', 'manager', 'member', 'viewer'));

update public.admin_user_permissions
set facebook_user_id = coalesce(facebook_user_id, facebook_id)
where facebook_user_id is null;

create unique index if not exists admin_user_permissions_user_id_uidx
  on public.admin_user_permissions(user_id)
  where user_id is not null;

create index if not exists admin_user_permissions_facebook_user_id_idx
  on public.admin_user_permissions(facebook_user_id);

create index if not exists admin_user_permissions_role_idx
  on public.admin_user_permissions(role);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_user_permissions_set_updated_at on public.admin_user_permissions;
create trigger admin_user_permissions_set_updated_at
before update on public.admin_user_permissions
for each row execute function public.set_updated_at();

alter table public.admin_user_permissions enable row level security;

drop policy if exists "Users can read own admin permission" on public.admin_user_permissions;
create policy "Users can read own admin permission"
on public.admin_user_permissions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update own admin permission metadata" on public.admin_user_permissions;
create policy "Users can update own admin permission metadata"
on public.admin_user_permissions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
