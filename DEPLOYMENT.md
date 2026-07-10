# Deployment - adsplan

- Domain: `adsplan.theanhmarketing.com`.
- Provider: Vercel.
- Project: `adplan` / `prj_Funl5Z2UNdrAW3mipa5NIqDpsLp7`.
- Team: `team_YIVvyUzGxKcfr7hyqZZltpqE`.
- Git: `https://github.com/nguyentheanh-ai/Adplan.git`.
- Production branch: `main`.
- Framework/root/output: Next.js / `.` / `.next`.
- Build: `npm run build`; tests: `npm run test`; lint: `npm run lint`; typecheck: `npm run typecheck`.
- Preview: `node E:\_workspace-control\scripts\workspace.mjs deploy adsplan preview`.
- Production: `node E:\_workspace-control\scripts\workspace.mjs deploy adsplan production`, confirm `DEPLOY adsplan TO PRODUCTION`.
- Rollback: use the Vercel project deployment history after owner approval; do not redeploy a legacy folder as rollback.
- Never deploy from `E:\Adplan AI` or the workspace parent.

Environment names are listed in `.env.example`/registry only; live environment assignment remains unverified because the connector did not expose env listings.
