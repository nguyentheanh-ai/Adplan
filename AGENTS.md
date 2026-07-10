# Adplan AI Webapp Rules

Applies to this repo: `E:\TheAnh-Business-Workspace\04_Adplan_AI`

Project ID: `adsplan`.

This is the production webapp for `adsplan.theanhmarketing.com`. It combines Ads Facebook workflows and the Greezhub Workspace shell.

Before work, read `E:\_workspace-control\PROJECT_REGISTRY.md`, this file, `CURRENT_STATE.md` and `FEATURE_MAP.md`. Allowed path is this project only; `E:\Adplan AI` is a legacy copy and must not be edited/deployed for an `adsplan` task.

Before coding, understand the current architecture and data flow:

- routes and redirects under `app/`
- Ads Facebook surfaces under `/ads-facebook`
- Workspace surfaces under `/workspace`
- shared shell/navigation in `components/app-shell.tsx` and `lib/navigation.ts`
- Supabase clients and server-side data access in `lib/supabase/*`
- Meta/Facebook integrations in `lib/meta/*`, `lib/auth/*`, and `app/api/meta/*`
- Facebook publisher flows in `lib/facebook-publisher*` and `app/api/facebook-publisher/*`
- embedded Workspace assets in `public/greezhub-workspace/*`

## Serena + GitNexus Code Intelligence

- Use Serena first for semantic code retrieval, symbol/component/function lookup, reference tracing, precise TypeScript/JavaScript edits, and preserving existing behavior.
- Use GitNexus when repo-scale context helps: route/module relationships, dependency graph, execution flow, blast-radius analysis, stale-index checks, or merge/refactor planning.
- Do not use both tools mechanically for every small task. Prefer Serena for exact edits; add GitNexus when graph context reduces risk.
- If GitNexus has no index or appears stale, ask before running `gitnexus analyze` because it writes `.gitnexus/`; do not rely on a missing/stale index.
- Do not run `gitnexus publish` or send code graph data outside the local machine unless explicitly asked.

## Production Guardrails

- Do not rewrite working systems, duplicate components, duplicate data access logic, or bypass existing helpers.
- Preserve business logic, Supabase schema, auth flow, API contracts, Meta/Facebook permissions, publisher behavior, and UI/design system unless the user explicitly approves a change.
- Keep `/ads-facebook/*` as the canonical Ads Facebook route family and preserve compatibility routes/redirects where tests require them.
- Keep `/workspace/*` backed by the real Greezhub Workspace integration; do not replace it with mock/course/student dashboard UI.
- All Meta API calls and Facebook publishing must stay server-side.
- Never print or persist secrets, access tokens, app secrets, Page Access Tokens, service-role keys, CAPI tokens, or agent ingest keys in docs, commits, logs, or final replies.
- Default Facebook publishing work to draft mode unless the user clearly requests live publish and the app permission/config is already enabled.
- Real Meta campaign creation/publishing must stay conservative and paused unless the user explicitly approves another behavior.

## Verification

Before final handoff for code changes, run the checks that match the blast radius. Prefer:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

For route/shell/navigation changes, include the relevant route/navigation/workspace tests. For Meta/Facebook publisher changes, include the relevant `lib/meta/*`, auth, and publisher tests.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
