# Current State - adsplan

Updated: 2026-07-10

- Canonical source: this folder and remote `nguyentheanh-ai/Adplan`; `main` remains unchanged while this worktree is isolated on local branch `chore/workspace-recovery-20260710`.
- Live Vercel/domain: `adplan` -> `adsplan.theanhmarketing.com`.
- Active features: Greezhub workspace, Meta dashboards, campaign builder, publisher, optimization, reports and admin tools.
- Known state: the previously dirty tree is classified, secret-scanned and prepared as a local recovery checkpoint. Legacy source is retained but its local Vercel identity has been removed.
- Verification: 126/126 tests, typecheck, lint and Next.js production build pass locally.
- Deploy state: production remains blocked because the recovery branch is not `main` and is not pushed/merged.
- Next: review/split the recovery checkpoint by feature before any deliberate merge into `main`.
