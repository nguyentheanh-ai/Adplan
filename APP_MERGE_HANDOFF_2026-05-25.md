# App Merge Handoff - Greezhub Workspace x Adplan AI

Ngay 2026-05-25. Muc tieu cua file nay la giup phien Codex/Claude sau tiep tuc dung hien trang app da merge, khong doan mo va khong rewrite logic cu.

## Nguyen tac lam tiep

- App hien tai la san pham merge giua Workspace/Greezhub va Ads Facebook/Adplan.
- Ten trai nghiem moi: Greezhub Workspace.
- Uu tien giu logic dang chay: Meta API, Supabase, Publisher, campaign, report, optimization, workspace state.
- Khong tu tao tinh nang gia. Neu khong chac module cu hoat dong ra sao thi doc code/cu phap truoc, hoac hoi anh.
- UI co the sap xep lai, nhung service/API/data layer chi sua khi co loi ro rang.
- Khong in token/key/secret ra chat, log ban giao, docs public.

## Stack va thu muc

- Source repo: `E:\TheAnh-Business-Workspace\04_Adplan_AI`
- Framework: Next.js App Router, React, TypeScript.
- UI: Tailwind CSS, lucide-react, mot so component UI nhe trong `components/ui`.
- Data/Auth: Supabase, custom Facebook OAuth session cookie.
- Meta: Graph API/Marketing API qua `lib/meta/facebook.ts`.
- AI: Gemini qua `lib/gemini.ts` va cac route `app/api/ai/*`.
- Production domain dang dung: `https://adsplan.theanhmarketing.com`.

Thu muc chinh:

- `app/`: pages va API routes.
- `components/`: AppShell, dashboard, Ads pages, Publisher, Workspace wrapper.
- `lib/`: service/data/business logic, auth, Meta API, report, optimization, campaign builder.
- `public/greezhub-workspace/`: app Workspace cu duoc nhung vao Next app bang JS/CSS static.
- `supabase/migrations/`: migrations cho Ads, Publisher, Agent keys, Workspace state.
- `public/agent-post-assets/`: asset mau/anh public dung cho draft/publisher test.

## Auth va bao ve route

Dang nhap chinh hien tai la Facebook OAuth.

- Login UI: `app/login/login-form.tsx`
- Start OAuth: `app/api/auth/facebook/start/route.ts`
- Callback OAuth: `app/api/auth/facebook/callback/route.ts`
- Session cookie helpers: `lib/auth/session.ts`
- Protected route helpers: `lib/auth/protected-routes.ts`
- Middleware/proxy: `proxy.ts`

Flow:

1. Khach vao route chinh ma chua co cookie session se bi redirect ve `/login`.
2. Login Facebook redirect toi Facebook OAuth voi required scopes va optional scopes.
3. Callback exchange code lay token, doc granted scopes, tao/lay Supabase profile, luu session cookie.
4. Token Facebook provider duoc luu server-side trong Supabase table `facebook_provider_tokens`.
5. Sau login callback redirect ve `/ads-facebook`.

Google dang disable trong UI settings/login. Neu sau nay bat Google, can thiet ke lai flow vi Google khong cap quyen Fanpage/Ads; Publisher phai nhac ket noi Facebook rieng.

Dev preview co route `app/api/auth/dev-preview/route.ts` va helper `lib/auth/dev-preview.ts`; chi dung dev/local neu env cho phep.

## AppShell va navigation

Shell chung:

- `components/app-shell.tsx`
- Sidebar trai: Greezhub, top-level nav gom Trang chu, Workspace, Ads Facebook, Cai dat.
- Header tren: account menu, bell, user avatar, Facebook/Page status.
- Mobile: bottom nav va mobile sidebar.
- Sidebar co localStorage key `adplanner_sidebar_hidden`.

Navigation data:

- `lib/navigation.ts`: primary nav va workspace nav.
- `lib/ads-navigation.ts`: Ads feature launcher links.

Thay doi UI gan day:

- Bo promo/upgrade card trong sidebar.
- Bo workspace submenu trong sidebar chinh.
- Workspace submodules hien o `/workspace` duoi dang block.
- Main content dung scroll doc rieng trong `AppShell`.

## Route structure hien tai

Canonical routes:

- `/`: Homepage app moi, chon Workspace hoac Quan ly Facebook.
- `/login`: Facebook login.
- `/workspace`: Workspace overview.
- `/workspace/documents`: Tai lieu.
- `/workspace/notes`: Notes.
- `/workspace/ideas`: Ideas.
- `/workspace/prompts`: Prompts.
- `/workspace/content-plan`: Plan Content.
- `/workspace/calendar`: Calendar.
- `/workspace/tools/clock`: Clock.
- `/workspace/analytics`: Analytics.
- `/workspace/tasks`: Tasks.
- `/ads-facebook`: Dashboard Ads.
- `/ads-facebook/reports`: Bao cao Ads.
- `/ads-facebook/optimization`: Toi uu.
- `/ads-facebook/campaign-builder`: Campaign Builder.
- `/ads-facebook/audiences`: Audiences.
- `/ads-facebook/creative`: Creative.
- `/ads-facebook/history`: Lich su.
- `/ads-facebook/publisher`: Facebook Publisher.
- `/settings`: ket noi tai khoan/Facebook/Ads.
- `/admin`: admin console, section permissions, agent key admin.

Backward compatibility/aliases:

- `/ads-facebook/*` dang export lai page cu tu root Ads pages.
- `/ads/*` van con aliases cu.
- `/dashboard` redirect ve `/ads-facebook`.
- `/facebook-publisher` van ton tai va duoc route alias sang Publisher moi.
- Root Ads pages cu nhu `/reports`, `/optimization`, `/campaign-builder`, `/audiences`, `/creative`, `/history` van con va co permission checks.

## Homepage

File: `app/page.tsx`

Homepage da duoc doi thanh cua vao SaaS theo style user gui:

- Brand feel: Greezhub Workspace.
- Hai card lon: Workspace va Quan ly Facebook.
- Khong phoi het module Ads/Workspace ra homepage.
- Neu chua dang nhap se redirect `/login`.

## Workspace merge

Route Next:

- `app/workspace/[[...slug]]/page.tsx`
- `components/workspace/workspace-overview.tsx`
- `components/workspace/greezhub-workspace-app.tsx`

Flow:

- `/workspace` render `WorkspaceOverview`.
- Cac slug con render `GreezhubWorkspaceApp`.
- Workspace cu duoc nhung vao Next app bang static JS/CSS:
  - `public/greezhub-workspace/app.js`
  - `public/greezhub-workspace/styles.css`
  - `public/greezhub-workspace/knowledge-seeds.js`
- Wrapper set:
  - `window.WORKSPACE_REMOTE_CONFIG = { mode: "adplan_api", endpoint: "/api/workspace/app-state" }`
  - `window.SUPABASE_CONFIG` lay tu public Supabase env.

Workspace persistence:

- API: `app/api/workspace/app-state/route.ts`
- Table: `public.app_state`
- Migration: `supabase/migrations/202605250001_create_workspace_app_state.sql`
- State key chinh trong embedded app gom tasks, prompts, alarms, courses, notes, documentFolders, documents, ideas, contentPlans.

Workspace modules da map:

- Tai lieu/documents
- Notes
- Ideas
- Prompts
- Plan Content
- Calendar
- Clock
- Analytics
- Tasks

Da bo cac block aggregate tren overview:

- `/workspace/content`
- `/workspace/operations`

Neu module con trang xanh/khong render, can kiem tra mapping trong `public/greezhub-workspace/app.js`:

- `pageFromPath`
- `routeForPage`
- `canonicalPathForCurrentRoute`
- `setPage`
- mang `pages` va `moduleSpaces`

## Ads Facebook merge

Canonical UI:

- `/ads-facebook` render lai `app/ads/page.tsx`.
- Ads launcher: `components/ads/ads-feature-launcher.tsx`.
- Meta dashboard: `components/dashboard/meta-intelligence-dashboard.tsx`.

Main Ads modules:

- Dashboard Ads: account overview, Meta intelligence, Ads feature launcher.
- Reports: `components/reports/ads-report-client.tsx`, `lib/reports/ads-report.ts`, `lib/reports/meta-intelligence.ts`.
- Optimization: `components/optimization/optimization-center-client.tsx`, `lib/optimization/*`.
- Campaign Builder: `components/campaign-builder/campaign-builder-client.tsx`, `lib/campaign-builder.ts`.
- Audiences: `components/audiences/audience-library-client.tsx`.
- Creative: `components/creative/creative-intelligence-client.tsx`.
- History: reads generated AI outputs/plans.
- Publisher: see section below.

Permission gating:

- `lib/admin/permissions.ts`
- table `admin_user_permissions`
- root Ads pages check `canCurrentUserAccessSection`.

## Meta API/data layer

Core file: `lib/meta/facebook.ts`

Capabilities:

- Ad accounts: `getMetaAdAccounts`, `getMetaAdAccountDetails`.
- Campaigns/adsets/ads: `getMetaCampaigns`, `getMetaAdsets`, `getMetaAds`.
- Insights: campaign, daily, account, breakdown.
- Creative performance: ads with creatives.
- Clone/scale: clone campaign/adset, update budget.
- Pages: `getMetaManagedPages`.
- Publisher: feed post, photo post, unpublished photo upload, multi-photo post.
- Campaign launch: create paused campaign, adset, creative, ad.
- Targeting search.
- Error classification via `MetaApiError` and `metaErrorResponse`.

Important fix gan day:

`getMetaManagedPages` khong chi doc `/me/accounts` nua. No merge:

- Direct managed pages.
- Business Manager owned/client pages.
- Ad account promoted pages fallback.

UI/API sanitize Page khong tra token ve frontend:

- `sanitizeMetaPage`
- API `/api/meta/pages`

## Facebook Publisher

Page:

- `app/facebook-publisher/page.tsx`
- canonical alias: `app/ads-facebook/publisher/page.tsx`
- client UI: `components/facebook-publisher/facebook-publisher-client.tsx`
- helpers: `lib/facebook-publisher.ts`, `lib/facebook-publisher-ui.ts`

UI hien tai da rut gon theo yeu cau:

1. Chon Page.
2. Chon bai trong Draft.
3. Preview.
4. Dang.

Neu user da login Facebook vao app thi Publisher khong hoi login lai. Neu khong co Facebook connection thi hien state can ket noi Facebook.

Draft inbox:

- API: `app/api/facebook-publisher/drafts/route.ts`
- Table: `facebook_post_drafts`
- GET: list draft queued/draft/failed cho user hien tai.
- POST: Agent hoac session tao draft.
- PATCH: update status sau khi publish.

Publish:

- API: `app/api/facebook-publisher/publish/route.ts`
- Lay provider token server-side.
- Goi `getMetaManagedPages` de lay Page access token.
- Build payload tu draft:
  - text/link feed post
  - single photo
  - multi photo
- Sau publish, UI PATCH draft thanh `published`.

Agent ingestion:

- Table keys: `agent_ingest_keys`
- Table logs: `agent_ingest_logs`
- Key logic: `lib/agent-keys.ts`, `lib/agent-keys-shared.ts`
- Agent gui draft bang header `x-agent-ingest-key`.
- Payload bat buoc co wrapper top-level `draft`.
- Default an toan: draft-only, khong auto publish neu chua ro.

Da test tao draft that tren production:

- Draft ID da tao trong lan test: `22abccc2-3a69-4a99-8a21-9fe028961ec5`
- Title: `Draft test tu Codex Agent`
- Status luc tao: `queued`
- Co 1 image public trong `agent-post-assets`.
- Key test tam thoi da revoke, khong luu trong docs/chat.

Skill agent da dong goi rieng:

- Kit: `E:\The Anh Marketing AI Growth Kit\skills\adplan-facebook-draft\SKILL.md`
- Codex global: `C:\Users\12c1t\.codex\skills\adplan-facebook-draft\SKILL.md`
- Claude global: `C:\Users\12c1t\.claude\skills\adplan-facebook-draft\SKILL.md`

## Supabase migrations/tables quan trong

Migrations:

- `202605210001_create_admin_user_permissions.sql`
- `202605210002_create_campaign_planner_tables.sql`
- `202605210003_create_ab_testing_tables.sql`
- `202605210004_create_meta_optimization_tables.sql`
- `202605210005_create_optimization_action_logs.sql`
- `202605210006_create_account_industry_profiles.sql`
- `202605210007_create_ads_content_library.sql`
- `202605210008_add_optimization_authorization_window.sql`
- `202605210009_create_ad_clone_logs.sql`
- `202605210010_create_facebook_post_drafts.sql`
- `202605220001_create_agent_ingest_keys.sql`
- `202605240020_create_facebook_publisher_schedule_settings.sql`
- `202605250001_create_workspace_app_state.sql`
- `202605250002_harden_public_trigger_functions.sql`

Tables/chuc nang:

- `admin_user_permissions`: phan quyen module Ads.
- `campaign_drafts`, `campaign_sequences`, `campaign_scale_jobs`, `campaign_clone_logs`: campaign builder/scale.
- `campaign_ab_tests`, `campaign_ab_test_variants`: AB testing.
- `meta_sync_runs`, `meta_account_snapshots`, `meta_campaign_snapshots`, `meta_ad_creative_snapshots`: sync Meta insights.
- `optimization_authorizations`, `optimization_recommendations`, `optimization_action_logs`: optimization workflow.
- `industry_learning_profiles`, `account_industry_profiles`: benchmark/industry profile.
- `ads_content_library`: content/creative ads library.
- `ad_clone_logs`: clone diagnostics/logs.
- `facebook_post_drafts`: Publisher draft queue.
- `agent_ingest_keys`, `agent_ingest_logs`: Agent-to-app draft/direct publish authorization.
- `facebook_provider_tokens`: server-side Facebook provider token store.
- `facebook_publisher_schedule_settings`: schedule settings.
- `app_state`: embedded Workspace state per user.

## API surface chinh

Auth:

- `/api/auth/facebook/start`
- `/api/auth/facebook/callback`
- `/api/auth/logout`
- `/api/auth/dev-preview`

Meta:

- `/api/meta/adaccounts`
- `/api/meta/campaigns`
- `/api/meta/adsets`
- `/api/meta/ads`
- `/api/meta/report`
- `/api/meta/breakdown`
- `/api/meta/intelligence`
- `/api/meta/pages`
- `/api/meta/page-check`
- `/api/meta/page-posts`
- `/api/meta/create-campaign`
- `/api/meta/launch-campaign`
- `/api/meta/scale`
- `/api/meta/ads-clone`
- `/api/meta/ads-clone/diagnostics`
- `/api/meta/sync-insights`
- `/api/meta/targeting-search`

Publisher/Agent:

- `/api/facebook-publisher/drafts`
- `/api/facebook-publisher/publish`
- `/api/facebook-publisher/agent-publish`
- `/api/facebook-publisher/schedule-settings`
- `/api/agent-keys`
- `/api/agent-keys/[id]`

Optimization:

- `/api/optimization/recommendations`
- `/api/optimization/action-logs`
- `/api/optimization/authorization`
- `/api/optimization/industry-learning`
- `/api/optimization/industry-profile`

Campaign/content:

- `/api/campaign-drafts`
- `/api/campaign-sequences`
- `/api/campaign-templates`
- `/api/campaign-ab-tests`
- `/api/saved-audiences`
- `/api/ai/consultant`
- `/api/ai/content-ads`
- `/api/ai/content-library`
- `/api/analyze-ads-plan`
- `/api/send-to-n8n`

Workspace:

- `/api/workspace/app-state`

Admin:

- `/api/admin/me`
- `/api/admin/users`
- `/api/admin/agent-keys`

Cron:

- `/api/cron/facebook-auto-publisher`

## Test/build commands

Dung tren Windows:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Dev server:

```powershell
npm.cmd run dev
```

Production/Vercel:

```powershell
npx vercel --prod
```

Sau UI changes phai test bang browser that, nhat la:

- `/`
- `/workspace`
- `/workspace/documents`
- `/workspace/ideas`
- `/workspace/prompts`
- `/ads-facebook`
- `/ads-facebook/publisher`
- `/settings`

## Nhung viec da lam gan day

- Tao AppShell moi thong nhat sidebar/header/main/account.
- Homepage moi theo style SocialHub: hai card Workspace va Quan ly Facebook.
- Route-based app cho `/workspace` va `/ads-facebook`.
- Workspace overview hien modules duoi dang block, khong con submenu day sidebar.
- Bo upgrade/pro card o sidebar.
- Login page doi logo TA Marketing.
- Bao ve route: phai login moi vao app.
- Settings co ket noi/khoi dong lai Facebook.
- Publisher UI rut gon thanh Page -> Draft -> Preview -> Dang.
- Fix page loading: doc Page tu direct pages, Business Manager va promoted pages fallback.
- Them optional Facebook scope `business_management`.
- Tao va test draft thật tren production qua Agent key.
- Dong goi skill `adplan-facebook-draft` cho Codex va Claude.

## Viec can lam tiep

1. Kiem tra lai toan bo Workspace embedded modules bang browser:
   - Documents, Notes, Ideas, Prompts, Plan Content, Calendar, Clock, Analytics, Tasks.
   - Neu trang xanh/trang rong, sua mapping trong `public/greezhub-workspace/app.js`.

2. Don UI Workspace:
   - Workspace embedded app van la JS/CSS app cu.
   - Nen tiep tuc boc UI theo AppShell va dong bo spacing/card/button, nhung khong rewrite logic state.

3. Publisher:
   - Test lai flow thuc te voi Page co token dang bai.
   - Test single image, multi-image, text/link.
   - Neu Page co trong dropdown nhung publish loi, doc response Graph API va `fbtrace_id`, khong doan.

4. Ads dashboard:
   - Giu service layer.
   - Cai thien UI report/filter/stat cards neu can, nhung khong doi Meta API flow.

5. Auth:
   - Neu muon Google login, can thiet ke session/account linking ro:
     - Google = login app.
     - Facebook = connect Ads/Page.
   - Khong bat Google nua neu chua chot flow.

6. Cleanup an toan:
   - Giam aliases cu sau khi dam bao redirect/backward compatibility.
   - Khong xoa route cu neu chua co redirect ro.
   - Khong xoa public Workspace assets neu chua port xong module.

## Canh bao cho phien sau

- Repo dang co nhieu file modified/untracked. Truoc khi sua tiep phai xem `git status --short`.
- `.env.local` co secret, khong in ra chat.
- `public/greezhub-workspace/app.js` la app cu lon; sua can cuc ky can than, uu tien fix mapping/render nho.
- Neu user noi "chua hoat dong", phai mo browser va nhin man hinh that truoc khi bao da xong.
- Neu khong chac mot tinh nang cu nam dau, hoi anh hoac search inventory, khong tu tao module moi.
