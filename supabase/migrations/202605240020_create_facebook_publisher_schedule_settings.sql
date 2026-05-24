create table if not exists public.facebook_publisher_schedule_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  page_id text not null,
  daily_post_count integer not null default 3 check (daily_post_count between 1 and 10),
  schedule_times text[] not null default array['09:00', '14:00', '20:00'],
  timezone text not null default 'Asia/Saigon',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists facebook_publisher_schedule_settings_set_updated_at on public.facebook_publisher_schedule_settings;
create trigger facebook_publisher_schedule_settings_set_updated_at
before update on public.facebook_publisher_schedule_settings
for each row
execute function public.set_updated_at();

alter table public.facebook_publisher_schedule_settings enable row level security;

drop policy if exists "Users manage own facebook publisher schedule settings" on public.facebook_publisher_schedule_settings;
create policy "Users manage own facebook publisher schedule settings" on public.facebook_publisher_schedule_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
