# AI Ads Planner - Release notes vận hành

## 2026-05-21

### Đã hoàn thành trong vòng hiện tại

- Thêm checklist vận hành 10 tiếng cho hướng phát triển sản phẩm: `SELLER_10H_EXECUTION_CHECKLIST.md`.
- Thêm checklist test cho người bán/demo: `SELLER_TEST_CHECKLIST.md`.
- Nối route server-side `POST /api/meta/launch-campaign`.
- Launch campaign mới theo đường an toàn: Campaign -> Adset -> Creative từ bài viết Page -> Ads, tất cả `PAUSED`.
- Nút `Launch lên Meta PAUSED` trong Campaign Builder không còn là nút chết.
- Thêm Gemini AI Consultant server-side tại `POST /api/ai/consultant`.
- Thêm UI `AI tư vấn tạo quảng cáo` trong Campaign Builder.
- AI Consultant map đề xuất vào form và tạo preview, không auto launch.
- Sửa admin fallback: user admin cấu hình vẫn được vào admin nếu schema Supabase đang lệch.
- Bổ sung icon sidebar thiếu để tránh dấu hỏi ở UI.
- Bổ sung test cho AI Consultant mapping.

### Kiểm tra đã chạy

- `npm.cmd run typecheck`: pass.
- `npm.cmd run lint`: pass.
- `npm.cmd test`: pass, 5 files / 19 tests.
- `npm.cmd run build`: pass.

### Blocker quyền/env cần xử lý khi test thật

- `GEMINI_API_KEY`: nếu chưa có, AI Consultant sẽ báo chưa cấu hình và không làm app crash.
- `ads_read`: cần để đọc tài khoản quảng cáo, campaign, report.
- `ads_management`: cần để launch campaign/adset/ad và scale camp.
- `pages_show_list`: cần để load danh sách Fanpage.
- `pages_read_engagement`: cần để đọc bài viết Page.
- Quyền admin Page: nếu thiếu, app không load được post và phải báo rõ cho khách.

### Lưu ý an toàn

- Không commit `.env.local`.
- Không in token/key ra UI hoặc log.
- Tất cả campaign/adset/ad tạo thật phải ở trạng thái `PAUSED`.
- Nếu Meta API lỗi giữa chừng, route trả `partial_success` hoặc error rõ; không fake success.
