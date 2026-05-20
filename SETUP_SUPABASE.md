# Supabase setup for AI Ads Planner

Run the SQL files in this order in Supabase SQL Editor, or use Supabase CLI migrations:

1. `supabase/schema.sql`
2. `supabase/migrations/202605210001_create_admin_user_permissions.sql`
3. `supabase/migrations/202605210002_create_campaign_planner_tables.sql`
4. `supabase/migrations/202605210003_create_ab_testing_tables.sql`

## What the migrations add

- `admin_user_permissions`: app-level roles and feature locks for Facebook users.
- `campaign_drafts`: saved campaign previews before launch.
- `campaign_sequences`: reusable campaign flow/templates.
- `campaign_scale_jobs`: scale-campaign jobs such as clone campaign/adset or budget change.
- `campaign_clone_logs`: audit log for clone requests.
- `campaign_ab_tests`: A/B test draft/config.
- `campaign_ab_test_variants`: variants attached to each A/B test.

## Admin bootstrap

The app can bootstrap an admin from environment variables:

```bash
ADMIN_USER_IDS=
ADMIN_FACEBOOK_IDS=622569270580836
ADMIN_FACEBOOK_PROFILE_URLS=https://www.facebook.com/theanh.marketing
ADMIN_FACEBOOK_USERNAMES=theanh.marketing
```

The service role key must stay server-side only. Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.

## RLS

The migration enables Row Level Security and adds owner policies for normal authenticated users. Server routes use the Supabase service role for admin operations and never send the service role to the frontend.
