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

## 2026-05-21 - Optimization Autopilot foundation

### Đã bổ sung

- Cập nhật heartbeat automation xuống 5 phút/lần trong 10 tiếng.
- Thêm roadmap super app: `SUPER_APP_ROADMAP.md`.
- Thêm migration `202605210004_create_meta_optimization_tables.sql` để lưu:
  - lịch sử sync Meta,
  - snapshot tài khoản quảng cáo,
  - snapshot campaign,
  - snapshot creative/ad,
  - ủy quyền tối ưu tự động,
  - khuyến nghị tối ưu,
  - hồ sơ học theo ngành.
- Thêm rule engine tối ưu: `lib/optimization/recommendations.ts`.
- Thêm test rule engine: `lib/optimization/recommendations.test.ts`.
- Thêm API `POST /api/meta/sync-insights` để quét dữ liệu từ tất cả tài khoản quảng cáo user đăng nhập và lưu Supabase.
- Thêm API `GET/POST /api/optimization/recommendations` để đọc/tạo khuyến nghị tối ưu từ dữ liệu đã lưu.

### Trạng thái an toàn

- API mới chỉ sync và tạo recommendation ở trạng thái `draft`.
- Chưa tự áp dụng thay đổi lên Meta nếu khách chưa ủy quyền.
- Bảng `optimization_authorizations` đã sẵn sàng cho bước bật ủy quyền theo từng account.

## 2026-05-21 - Optimization Center UI

### Đã bổ sung

- Thêm menu/trang `Tối ưu Ads` tại `/optimization`.
- Thêm API `GET/PATCH /api/optimization/authorization` để bật/tắt ủy quyền tối ưu theo từng tài khoản quảng cáo.
- UI cho khách chọn account, chọn khoảng thời gian, đồng bộ dữ liệu Meta và tạo khuyến nghị tối ưu.
- UI ủy quyền có kiểm soát:
  - chọn loại hành động được phép,
  - giới hạn phần trăm thay đổi ngân sách,
  - tùy chọn luôn cần duyệt thủ công.
- Danh sách khuyến nghị hiển thị priority, loại hành động, lý do và kỳ vọng tác động.
- Nút áp dụng vẫn disabled có giải thích; chưa tự chỉnh Meta khi chưa có bước confirm/apply an toàn.

### Kiểm tra đã chạy

- `npm.cmd run typecheck`: pass.
- `npm.cmd run lint`: pass.
- `npm.cmd test`: pass.
- `npm.cmd run build`: pass.

## 2026-05-21 - Optimization action audit log

### Đã bổ sung

- Thêm migration `202605210005_create_optimization_action_logs.sql`.
- Mọi lần apply recommendation đều có thể ghi log vào `optimization_action_logs`.
- Những lần bị chặn vì chưa duyệt, chưa bật ủy quyền, ngoài phạm vi ủy quyền hoặc vượt giới hạn ngân sách cũng được ghi log dạng `blocked`.
- API apply chặn thay đổi ngân sách vượt `max_daily_budget_change_percent`.
- UI thêm confirm trước khi áp dụng khuyến nghị.

### Kiểm tra đã chạy

- `npm.cmd run typecheck`: pass.
- `npm.cmd run lint`: pass.
- `npm.cmd test`: pass.
- `npm.cmd run build`: pass.

## 2026-05-21 - Account industry profile

### Đã bổ sung

- Thêm migration `202605210006_create_account_industry_profiles.sql`.
- Thêm `GET/PATCH /api/optimization/industry-profile` để lưu hồ sơ ngành theo từng tài khoản quảng cáo.
- Trang `Tối ưu Ads` có card `Hồ sơ ngành hàng`: ngành chính, mô hình bán hàng, loại offer, giá trị đơn trung bình, khách hàng mục tiêu và ghi chú tối ưu.
- Đây là nền để Autopilot học benchmark theo ngành, không dùng một bộ quy tắc chung cho mọi tài khoản.
- Recommendation engine đã gắn hồ sơ ngành vào reason/evidence khi tạo khuyến nghị mới.

## 2026-05-21 - Industry benchmark learning

### Đã bổ sung

- Thêm `lib/optimization/industry-learning.ts` để tính median CTR/CPC/CPM/CPL theo ngành và objective.
- Thêm `GET/POST /api/optimization/industry-learning`.
- Trang `Tối ưu Ads` có bảng `Benchmark ngành` và nút `Học từ dữ liệu đã sync`.
- Dữ liệu benchmark chỉ là aggregate ẩn danh, không hiển thị account/campaign của khách khác.

## 2026-05-21 - Optimization action history UI

### Đã bổ sung

- Thêm `GET /api/optimization/action-logs` để đọc lịch sử tối ưu theo user/account.
- Trang `Tối ưu Ads` có panel `Lịch sử tối ưu`, hiển thị hành động đã chặn, đã áp dụng, thất bại hoặc chỉ ghi nhận proposal.
- Sau khi áp dụng recommendation, UI tự tải lại lịch sử để khách thấy dấu vết ngay.
- Nếu Supabase chưa chạy migration action log, API trả danh sách rỗng kèm trạng thái fallback thay vì làm crash app.

## 2026-05-21 - Recommendation approval gate

### Đã bổ sung

- Thêm `PATCH /api/optimization/recommendations` để duyệt, từ chối hoặc mở lại khuyến nghị.
- Thêm `PUT /api/optimization/recommendations` để apply có kiểm soát:
  - bắt buộc recommendation đã được duyệt,
  - bắt buộc account đã bật ủy quyền,
  - bắt buộc loại hành động nằm trong phạm vi được phép,
  - các hành động chưa có API an toàn sẽ ghi nhận dạng proposal-only thay vì fake apply.
- UI `Tối ưu Ads` có nút `Duyệt`, `Từ chối`, `Mở lại`, `Áp dụng`.

### Kiểm tra đã chạy

- `npm.cmd run typecheck`: pass.
- `npm.cmd run lint`: pass.
- `npm.cmd test`: pass.
- `npm.cmd run build`: pass.
