alter table public.optimization_authorizations
add column if not exists optimization_window jsonb not null
default '{"enabled":false,"start":"08:00","end":"22:00","timezone":"Asia/Ho_Chi_Minh"}'::jsonb;

comment on column public.optimization_authorizations.optimization_window
is 'Customer-controlled schedule for Optimization Autopilot. Server-side apply actions are blocked outside this window when enabled.';
