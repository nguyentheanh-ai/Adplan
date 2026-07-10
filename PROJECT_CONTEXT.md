# Project Context - adsplan

Adplan/Greezhub giúp vận hành Facebook Ads, lập kế hoạch/campaign, đọc báo cáo, tối ưu, quản lý audience và chuẩn bị/publish nội dung Facebook.

- Users: owner/admin và người dùng workspace được cấp quyền.
- Stack: Next.js 16, React, TypeScript, Supabase, Gemini, Meta Graph API.
- Architecture: App Router trong `app/`; UI trong `components/`; Meta/publisher/business logic trong `lib/`; Supabase migrations/schema trong `supabase/`.
- Auth: application session plus Facebook OAuth routes in `app/api/auth/facebook` and `lib/auth`.
- Database: Supabase; schema/migrations are authoritative.
- External services: Meta Graph API, Gemini, Telegram, optional n8n, Vercel.
- Analytics/reporting: Meta insights, cached hourly facts and website-derived revenue reports.
- Fixed decisions: canonical Ads UI is `/ads-facebook/*`; Meta calls/publishing stay server-side; real publish/campaign actions are conservative and require explicit approval.
- Limits: do not mix this app with website customer/community ownership or the legacy `E:\Adplan AI` copy.
