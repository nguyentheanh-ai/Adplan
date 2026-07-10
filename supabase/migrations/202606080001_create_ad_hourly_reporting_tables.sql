create extension if not exists "pgcrypto";

create table if not exists public.client_ad_account_settings (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  ad_account_id text not null,
  account_name text,
  report_timezone text not null default 'Asia/Ho_Chi_Minh',
  meta_day_reset_hour_vn integer not null default 14,
  reporting_mode text not null default 'vietnam_calendar_day',
  data_lag_hours integer not null default 24,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_ad_account_settings_reset_hour_check check (meta_day_reset_hour_vn >= 0 and meta_day_reset_hour_vn <= 23)
);

create unique index if not exists client_ad_account_settings_client_account_idx
on public.client_ad_account_settings(client_id, ad_account_id);

create table if not exists public.ad_hourly_facts (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  ad_account_id text not null,
  local_date date not null,
  local_hour integer not null,
  local_start_at timestamptz not null,
  local_end_at timestamptz not null,
  meta_date date,
  meta_hour integer,
  spend numeric not null default 0,
  impressions numeric not null default 0,
  reach numeric not null default 0,
  clicks numeric not null default 0,
  ctr numeric not null default 0,
  cpc numeric not null default 0,
  leads numeric not null default 0,
  messages numeric not null default 0,
  source text not null default 'meta_hourly',
  data_status text not null default 'partial',
  raw_json jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_hourly_facts_local_hour_check check (local_hour >= 0 and local_hour <= 23),
  constraint ad_hourly_facts_meta_hour_check check (meta_hour is null or (meta_hour >= 0 and meta_hour <= 23)),
  constraint ad_hourly_facts_data_status_check check (data_status in ('final', 'partial', 'missing'))
);

create unique index if not exists ad_hourly_facts_unique_local_hour_idx
on public.ad_hourly_facts(client_id, ad_account_id, local_date, local_hour);

create index if not exists ad_hourly_facts_account_date_idx
on public.ad_hourly_facts(ad_account_id, local_date);

create table if not exists public.ad_spend_sync_logs (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  ad_account_id text not null,
  sync_window_start date not null,
  sync_window_end date not null,
  status text not null,
  error_message text,
  created_at timestamptz not null default now(),
  constraint ad_spend_sync_logs_status_check check (status in ('success', 'failed', 'partial'))
);

create index if not exists ad_spend_sync_logs_account_created_idx
on public.ad_spend_sync_logs(ad_account_id, created_at desc);

alter table public.client_ad_account_settings enable row level security;
alter table public.ad_hourly_facts enable row level security;
alter table public.ad_spend_sync_logs enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_ad_account_settings_set_updated_at on public.client_ad_account_settings;
create trigger client_ad_account_settings_set_updated_at
before update on public.client_ad_account_settings
for each row execute function public.set_updated_at();

drop trigger if exists ad_hourly_facts_set_updated_at on public.ad_hourly_facts;
create trigger ad_hourly_facts_set_updated_at
before update on public.ad_hourly_facts
for each row execute function public.set_updated_at();

insert into public.client_ad_account_settings (
  client_id,
  ad_account_id,
  account_name,
  report_timezone,
  meta_day_reset_hour_vn,
  reporting_mode,
  data_lag_hours,
  enabled
)
values (
  'greezhub',
  'act_1255736315302940',
  'Greezhub 01',
  'Asia/Ho_Chi_Minh',
  14,
  'vietnam_calendar_day',
  24,
  true
)
on conflict (client_id, ad_account_id) do update
set account_name = excluded.account_name,
    report_timezone = excluded.report_timezone,
    meta_day_reset_hour_vn = excluded.meta_day_reset_hour_vn,
    reporting_mode = excluded.reporting_mode,
    data_lag_hours = excluded.data_lag_hours,
    enabled = excluded.enabled;
