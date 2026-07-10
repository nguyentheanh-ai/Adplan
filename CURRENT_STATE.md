# Current State - adsplan

Updated: 2026-07-10

- Canonical source: this folder and remote `nguyentheanh-ai/Adplan`; local `main` now contains the verified recovery checkpoint and the remote backup branch remains available.
- Live Vercel/domain: `adplan` -> `adsplan.theanhmarketing.com`.
- Active features: Greezhub workspace, Meta dashboards, campaign builder, publisher, optimization, reports and admin tools.
- Known state: the previously dirty tree is classified, secret-scanned, backed up remotely and fast-forwarded after a complete local gate. Legacy source remains deploy-disabled.
- Verification: 126/126 tests, typecheck, lint and Next.js production build pass locally.
- Deploy state: Git-backed production `dpl_4mWMtPkJmxkmqLEisKpdpiC5T2yq` is Ready; login, protected pages and owner-only API passed live smoke tests.
- Next: monitor normally and use the central guard for every future preview/production deployment.
