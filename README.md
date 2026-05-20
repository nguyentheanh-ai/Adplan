# AI Ads Planner

Nền tảng lập kế hoạch và phân tích Meta Ads bằng AI cho SME Việt Nam.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- Gemini API
- Meta Marketing API

## Cài đặt

1. Cài package:

```bash
npm install
```

2. Tạo `.env.local` từ `.env.example`.

3. Điền biến môi trường:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
N8N_WEBHOOK_URL=
META_APP_ID=
META_APP_SECRET=
META_API_VERSION=v23.0
NEXT_PUBLIC_SITE_URL=https://adsplan.theanhmarketing.com
ADMIN_FACEBOOK_IDS=
ADMIN_FACEBOOK_PROFILE_URLS=
ADMIN_FACEBOOK_USERNAMES=
```

Bạn có thể cấp admin theo 1 trong 3 cách:
- `ADMIN_FACEBOOK_IDS`: danh sách `facebook_id` cách nhau bởi dấu phẩy
- `ADMIN_FACEBOOK_PROFILE_URLS`: danh sách URL profile Facebook
- `ADMIN_FACEBOOK_USERNAMES`: danh sách username Facebook (ví dụ `theanh.marketing`)

4. Chạy SQL:

```bash
supabase/schema.sql
```

5. Chạy app:

```bash
npm run dev
```

## Tính năng chính

- Đăng nhập Facebook OAuth (server-side token).
- Dashboard quảng cáo với:
  - tài khoản mặc định dùng chung toàn app
  - KPI + biểu đồ theo ngày
  - biểu đồ đối sánh cùng kỳ
  - bảng campaign có lọc/sắp xếp.
- Báo cáo Ads chuyên sâu:
  - chọn date range
  - breakdown age/gender/placement
  - xuất CSV.
- Tệp khách hàng:
  - lấy từ dữ liệu ad set/creative
  - hiển thị tuổi/giới tính/khu vực/sở thích/hành vi
  - lưu tệp để tái sử dụng khi tạo campaign.
- Creative:
  - phễu hiệu suất
  - bảng creative có lọc campaign/sắp xếp theo lead, tin nhắn, tương tác...
  - link bài post khi Meta trả về.
- Tạo Campaign AI nâng cao:
  - chọn tài khoản quảng cáo ở đầu flow
  - fanpage chọn từ Facebook pages
  - mục tiêu Tin nhắn/Tương tác chọn bài viết sẵn có
  - mục tiêu Lead/Chuyển đổi hỗ trợ media + landing
  - checklist thiếu dữ liệu (vẫn cho tạo preview)
  - lưu mẫu chiến dịch để dùng lại
  - chọn tệp khách hàng đã lưu.
- Admin web:
  - quản lý quyền user (owner/manager/member)
  - khóa/mở từng mục
  - theo dõi người dùng đăng ký
  - chuyển phần Meta API test vào khu Admin.

## API mới

- `GET /api/meta/pages`
- `GET /api/meta/page-posts?page_id=...`
- `GET/POST /api/campaign-templates`
- `GET/POST /api/saved-audiences`
- `GET /api/admin/me`
- `GET/PATCH /api/admin/users`

## Lưu ý bảo mật

- Không expose `META_ACCESS_TOKEN` hoặc `META_APP_SECRET` ra frontend.
- Tất cả gọi Meta API thực hiện ở server route.
- Campaign tạo thật luôn ở trạng thái `PAUSED`.

## Kiểm tra trước deploy

```bash
npm run typecheck
npm run lint
npm run build
```
