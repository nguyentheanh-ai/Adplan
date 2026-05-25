create table if not exists public.app_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "Users can read own app state" on public.app_state;
create policy "Users can read own app state"
on public.app_state for select
to authenticated
using (id = (select auth.uid())::text);

drop policy if exists "Users can insert own app state" on public.app_state;
create policy "Users can insert own app state"
on public.app_state for insert
to authenticated
with check (id = (select auth.uid())::text);

drop policy if exists "Users can update own app state" on public.app_state;
create policy "Users can update own app state"
on public.app_state for update
to authenticated
using (id = (select auth.uid())::text)
with check (id = (select auth.uid())::text);
