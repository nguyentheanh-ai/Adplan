# Feature Map - adsplan

## Authentication and Facebook OAuth

Routes: `/login`, `/api/auth/facebook/start`, `/api/auth/facebook/callback`, `/api/auth/logout`.

Files: `lib/auth/session.ts`, `lib/auth/facebook-oauth.ts`, `lib/auth/protected-routes.ts`, `proxy.ts`.

Environment: `META_APP_ID`, `META_APP_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Guard: tokens and OAuth exchanges stay server-side.

## Greezhub workspace

Routes: `/workspace/[[...slug]]`, `/api/workspace/app-state`, `/api/workspace/link-preview`.

Files: `components/workspace/greezhub-workspace-app.tsx`, `components/workspace/workspace-overview.tsx`, `components/app-shell.tsx`, `lib/navigation.ts`.

Guard: keep real workspace integration; do not replace it with mock student/course UI.

## Meta dashboards and campaign tree

Routes: `/ads-facebook`, `/ads-facebook/campaigns`, `/api/meta/adaccounts`, `/api/meta/campaign-tree`, `/api/meta/sync-insights`.

Files: `components/meta/meta-dashboard.tsx`, `components/ads/FacebookAdsDashboard.tsx`, `lib/meta/facebook.ts`, `lib/meta/sync-insights.ts`.

Environment: `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_API_VERSION`.

Guard: use the configured/default account logic; do not print tokens.

## Campaign builder and launch

Routes: `/ads-facebook/campaign-builder`, `/api/meta/create-campaign`, `/api/meta/launch-campaign`, `/api/campaign-drafts`.

Files: `components/campaign-builder/campaign-builder-client.tsx`, `lib/campaign-builder.ts`, `lib/ads-plan-schema.ts`.

Guard: real campaigns remain paused/conservative unless explicitly approved.

## Facebook Publisher

Routes: `/ads-facebook/publisher`, `/api/facebook-publisher/drafts`, `/api/facebook-publisher/publish`, `/api/facebook-publisher/agent-publish`.

Files: `components/facebook-publisher/facebook-publisher-client.tsx`, `lib/facebook-publisher.ts`, `lib/facebook-provider-token-store.ts`.

Guard: default to draft; live publish requires explicit request and existing permission.

## Optimization

Routes: `/ads-facebook/optimization`, `/api/optimization/recommendations`, `/api/optimization/authorization`, `/api/meta/scale`.

Files: `components/optimization/optimization-center-client.tsx`, `lib/optimization/recommendations.ts`, `lib/optimization/authorization-window.ts`, `lib/meta/scale-clone.ts`.

Guard: recommendation and execution are separate; log approved actions.

## Revenue report

Routes: `/admin/revenue-report`, `/api/admin/revenue-report/summary`, `/api/admin/revenue-report/orders`, `/api/admin/revenue-report/meta-insights`.

Files: `components/revenue-report/revenue-report-client.tsx`, `lib/revenue-report-service.ts`, `lib/revenue-report-data.ts`, `lib/revenue-report-meta.ts`.

Guard: do not confuse Adplan community users with website customers/orders.

## Agent keys

Routes: `/api/agent-keys`, `/api/agent-keys/[id]`, `/api/admin/agent-keys`.

Files: `lib/agent-keys.ts`, `lib/agent-keys-shared.ts`, `components/facebook-publisher/agent-key-manager.tsx`.

Environment: `AGENT_INGEST_KEY`, `AGENT_INGEST_USER_ID`.

Guard: never expose key values in logs/docs/client code.
