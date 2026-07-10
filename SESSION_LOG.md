# Session Log

## 2026-07-10 - Verify recovery release candidate

Phạm vi: integrate the preserved recovery checkpoint into `main`.
Các file đã thay đổi: existing recovery checkpoint plus `CURRENT_STATE.md` and `SESSION_LOG.md`.
Kết quả: fast-forward integration completed; remote backup branch exists; preview `dpl_Gq9oRFd894PA4a5DdVTgZEbUfgiU` is Ready.
Kiểm tra đã chạy: 126/126 tests, typecheck, lint, local build, Vercel build and preview smoke.
Việc còn lại: normal post-release monitoring; no blocker remains.
Cảnh báo: real Meta campaign actions remain conservative and protected.

## 2026-07-10 - Workspace governance

Phạm vi: project identity, live domain, feature map and deploy documentation.

Các file đã thay đổi: `AGENTS.md`, `.vercel/project.json`, `PROJECT_CONTEXT.md`, `FEATURE_MAP.md`, `DEPLOYMENT.md`, `CURRENT_STATE.md`, `SESSION_LOG.md`.

Kết quả: canonical project ID is `adsplan`; live domain corrected to `adsplan.theanhmarketing.com`.

Kiểm tra đã chạy: registry validation, live Vercel read-only comparison, central guard tests.

Việc còn lại: classify dirty tree and legacy copy before deploy.

Cảnh báo: no deploy was run.

## 2026-07-10 - Preserve verified workspace recovery state

Phạm vi: classify and preserve the existing mixed working tree without changing production.
Các file đã thay đổi: existing Ads product, reporting, publisher, admin/auth, brand, tests, config and `.env.example` contract.
Kết quả: local branch `chore/workspace-recovery-20260710`; `.env.example` contains names only; `main` and live Vercel remain unchanged.
Kiểm tra đã chạy: 126/126 tests, typecheck, lint, build, staged secret scan and `git diff --cached --check`.
Việc còn lại: review/split by feature before any merge; no push performed.
Cảnh báo: production deploy is intentionally blocked by branch mismatch while customers are active.
