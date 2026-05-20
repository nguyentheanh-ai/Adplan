# AI Ads Planner

Vietnamese MVP web app for guided Facebook Ads planning. A business owner answers 9 guided questions, Gemini returns structured JSON, and Supabase stores the persona plus reviewable ads plan.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth + Postgres
- Gemini API through server-only API routes
- n8n webhook handoff route

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

3. Fill these values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
N8N_WEBHOOK_URL=
META_APP_ID=
META_API_VERSION=v23.0
```

Production app URL:

```bash
NEXT_PUBLIC_SITE_URL=https://adsplan.theanhmarketing.com
```

4. In Supabase SQL editor, run:

```bash
supabase/schema.sql
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Main Routes

- `/login` - Facebook-only login UI. Supabase Facebook OAuth must be configured before users can enter the app.
- `/dashboard` - recent generated plans and empty state
- `/ask` - guided 9-question AI chat flow
- `/persona/[id]` - generated customer persona
- `/plan/[id]` - reviewable Facebook Ads campaign plan
- `/dashboard/meta` - Meta Graph API connection test, campaign list, and paused campaign creation
- `/settings` - account and environment status

## Server API

### `POST /api/analyze-ads-plan`

Input:

```json
{
  "answers": [
    { "question": "Bạn đang kinh doanh sản phẩm/dịch vụ gì?", "answer": "Spa chăm sóc da" }
  ]
}
```

The route authenticates the user, stores answers in `question_sessions`, calls Gemini with structured JSON output, validates the JSON with Zod, retries once if parsing fails, stores `persona_json` and `ads_plan_json`, then returns the saved output id.

### `POST /api/send-to-n8n`

Input:

```json
{
  "outputId": "uuid"
}
```

The route loads the approved plan and forwards it to `N8N_WEBHOOK_URL`. If no webhook is configured, the UI shows a clear setup error.

### `GET /api/meta/adaccounts`

Server-side route that calls:

```text
https://graph.facebook.com/v23.0/me/adaccounts
```

After Facebook login, the route uses the Facebook OAuth provider token from the Supabase server session, so it returns the ad accounts owned or accessible by the logged-in Facebook user. If there is no Facebook session token, the route returns `401`.

### `GET /api/meta/campaigns`

Server-side route that calls:

```text
https://graph.facebook.com/v23.0/{selected_ad_account_id}/campaigns
```

Fields: `id,name,status,objective,created_time`.

Optional query:

```text
?ad_account_id=act_1295473488844957
```

The Meta dashboard page uses the selected ad account id from local UI state.
The selected account card explicitly shows `ID quảng cáo` (`act_...`) and numeric `Account ID`; the access token is never returned to the browser.

### `POST /api/meta/create-campaign`

Server-only Meta Marketing API route. It always creates campaigns as `PAUSED`.

Input:

```json
{
  "ad_account_id": "act_1295473488844957",
  "name": "AI Ads Planner - Traffic campaign",
  "objective": "OUTCOME_TRAFFIC"
}
```

The route uses the selected `ad_account_id` from the UI and the server-side Facebook session token when available. It sends:

```json
{
  "status": "PAUSED",
  "special_ad_categories": [],
  "buying_type": "AUCTION"
}
```

The app never creates an `ACTIVE` campaign.

## Meta Setup

Add these values to `.env.local`:

```bash
META_APP_ID=your_meta_app_id
META_API_VERSION=v23.0
```

For real Facebook login, configure Supabase Auth provider `Facebook` with your Meta app id/secret and set the callback URL in Meta Developer dashboard. The login page requests:

```text
public_profile,email,ads_read,ads_management,business_management
```

Then open `/login`, continue with Facebook, and the app redirects to `/dashboard/meta`. The page loads ad accounts from `/api/meta/adaccounts`, lets the user choose one, stores that choice in local React state, and uses the selected `ad_account_id` when listing or creating campaigns.

Production Meta access is scoped to the logged-in Facebook session. Do not add a shared user access token to frontend code.

## Security Notes

- `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `N8N_WEBHOOK_URL`, and `META_APP_ID` are used only in server routes/helpers.
- Browser code only reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Supabase RLS policies restrict users to their own projects, sessions, and outputs.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Deploy

For Vercel or another Next.js host, add these environment variables in the hosting dashboard:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
N8N_WEBHOOK_URL=
META_APP_ID=
META_API_VERSION=v23.0
GEMINI_MODEL=gemini-2.0-flash
```

Then configure Supabase Auth redirect URLs for both local and production domains:

```text
http://localhost:3001/**
https://your-domain.com/**
```

In Meta Developer dashboard, set the Facebook OAuth redirect URI to the Supabase callback URL:

```text
https://pppiqhkectojxbmhqcnx.supabase.co/auth/v1/callback
```

Do not deploy `.env.local`. It is ignored by git.
