# Workspace UI Sync Next Session

## Current technical baseline

- `Workspace` is mounted at `/workspace/[[...slug]]` with the real Greezhub static app assets under `public/greezhub-workspace`.
- Workspace persistence now goes through Adplan backend route `/api/workspace/app-state`.
- The route uses the existing Adplan session cookie and server-side Supabase admin client.
- Users should not see a second Workspace/Supabase login screen inside `/workspace`.
- `public.greezhub-workspace` keeps localStorage as a fallback, but the preferred remote store is `public.app_state`.
- `public.app_state` exists in Supabase and is protected by RLS policies for direct client fallback.

## UI sync goal

Make the merged app feel like one product with two main zones:

- `Ads Facebook`
- `Workspace`

The next pass should sync typography, spacing, navigation weight, empty states, and card hierarchy without changing sensitive Ads backend flows.

## What to fix visually next

- Remove the feeling of two unrelated shells by normalizing header height, sidebar width, icon style, and account/logout placement.
- Keep Workspace module behavior from Greezhub, but align colors and surface hierarchy closer to Adplan.
- Keep `/ads` as the Ads feature launcher plus original Adplan modules.
- Keep `/workspace` as the Greezhub workspace hub, not a placeholder dashboard.
- Preserve the no-second-login flow for Workspace.

## Verification checklist

- Run `npm.cmd test`.
- Run `npm.cmd run typecheck`.
- Run `npm.cmd run lint`.
- Run `npm.cmd run build`.
- Screenshot desktop and mobile for `/ads`, `/ads/facebook-publisher`, `/workspace`, `/workspace/documents`, and `/workspace/notes`.
- Confirm production private routes still redirect to `/login` when unauthenticated.
- Confirm logged-in/local preview `/workspace` does not show the old `Supabase chua co URL hop le` toast.
