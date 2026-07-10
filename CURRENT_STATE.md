# Current State - adsplan

Updated: 2026-07-10

- Canonical source: this folder and remote `nguyentheanh-ai/Adplan`; local `main` now contains the verified recovery checkpoint and the remote backup branch remains available.
- Live Vercel/domain: `adplan` -> `adsplan.theanhmarketing.com`.
- Active features: Greezhub workspace, Meta dashboards, campaign builder, publisher, optimization, reports and admin tools.
- Known state: the previously dirty tree is classified, secret-scanned, backed up remotely and fast-forwarded after a complete local gate. Legacy source remains deploy-disabled.
- Verification: 126/126 tests, typecheck, lint and Next.js production build pass locally.
- Deploy state: `main` and central guard pass; preview `dpl_Gq9oRFd894PA4a5DdVTgZEbUfgiU` is Ready and smoke-tested.
- Next: push verified `main`, monitor deployment and run login/protected-route live smoke tests.
