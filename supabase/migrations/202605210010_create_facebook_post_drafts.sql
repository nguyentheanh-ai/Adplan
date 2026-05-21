create table if not exists public.facebook_post_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id text,
  title text,
  status text not null default 'draft',
  source text not null default 'agent',
  draft_json jsonb not null default '{}'::jsonb,
  publish_result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facebook_post_drafts_user_updated_idx
on public.facebook_post_drafts(user_id, updated_at desc);

drop trigger if exists facebook_post_drafts_set_updated_at on public.facebook_post_drafts;
create trigger facebook_post_drafts_set_updated_at
before update on public.facebook_post_drafts
for each row
execute function public.set_updated_at();

alter table public.facebook_post_drafts enable row level security;

drop policy if exists "Users manage own facebook post drafts" on public.facebook_post_drafts;
create policy "Users manage own facebook post drafts" on public.facebook_post_drafts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

