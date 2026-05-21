create table if not exists public.ads_content_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  product text not null,
  industry text,
  target_customer text,
  goal text,
  input_json jsonb not null default '{}'::jsonb,
  content_json jsonb not null default '{}'::jsonb,
  source text not null default 'creator_ads_ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ads_content_library_user_created_idx
on public.ads_content_library(user_id, created_at desc);

drop trigger if exists ads_content_library_set_updated_at on public.ads_content_library;
create trigger ads_content_library_set_updated_at
before update on public.ads_content_library
for each row execute function public.set_updated_at();

alter table public.ads_content_library enable row level security;

drop policy if exists "Users manage own ads content library" on public.ads_content_library;
create policy "Users manage own ads content library" on public.ads_content_library
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
