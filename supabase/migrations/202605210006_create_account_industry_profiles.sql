create table if not exists public.account_industry_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ad_account_id text not null,
  industry_key text not null default 'unknown',
  business_model text,
  offer_type text,
  average_order_value numeric,
  target_customer text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, ad_account_id)
);

create index if not exists account_industry_profiles_user_account_idx
on public.account_industry_profiles(user_id, ad_account_id);

create index if not exists account_industry_profiles_industry_idx
on public.account_industry_profiles(industry_key);

drop trigger if exists account_industry_profiles_set_updated_at on public.account_industry_profiles;
create trigger account_industry_profiles_set_updated_at
before update on public.account_industry_profiles
for each row execute function public.set_updated_at();

alter table public.account_industry_profiles enable row level security;

drop policy if exists "Users manage own account industry profiles" on public.account_industry_profiles;
create policy "Users manage own account industry profiles" on public.account_industry_profiles
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
