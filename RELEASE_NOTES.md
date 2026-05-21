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

## 2026-05-21 - Autopilot schedule guard

### Đã bổ sung

- Thêm migration `202605210008_add_optimization_authorization_window.sql`.
- UI `Tối ưu Ads` cho khách bật/tắt khung giờ app được phép tối ưu theo từng tài khoản quảng cáo.
- API lưu ủy quyền nhận thêm `optimization_window` nhưng vẫn fallback an toàn nếu production chưa chạy migration mới.
- `PUT /api/optimization/recommendations` kiểm tra khung giờ ở server trước khi gọi Meta hoặc ghi proposal.
- Nếu ngoài khung giờ, app không fake success: trả lỗi rõ và ghi log `blocked` vào lịch sử tối ưu.
- Panel `Kiểm tra trước khi áp dụng` hiển thị thêm điều kiện khung giờ để khách hiểu vì sao nút áp dụng đang bật/tắt.

### Kiểm tra cần chạy lại sau migration

- Chạy migration mới trong Supabase production.
- Bật khung giờ, đặt giờ hiện tại nằm ngoài khung, thử áp dụng recommendation đã duyệt: phải bị chặn và có log.
- Đặt giờ hiện tại nằm trong khung, thử lại: route tiếp tục qua các lớp kiểm tra quyền/ngân sách như cũ.

## 2026-05-21 - Campaign scale UX, admin-only industry profile

### Đã bổ sung/sửa

- `Hồ sơ ngành hàng` trong `Tối ưu Ads` chỉ hiển thị với Owner/Manager.
- Thêm suy luận hồ sơ ngành từ dữ liệu Meta đã sync: campaign, creative, bài quảng cáo, target, ngân sách và chỉ số đã lưu.
- Khách thường không còn phải nhập ngành/mô hình/offer thủ công.
- Scale camp cũ có nút hành động chính ngay trên khu vực chọn campaign.
- Bảng campaign trong Scale camp có ô tìm kiếm theo tên/ID và thanh trượt để xem nhanh nhiều chiến dịch.
- Route `POST /api/meta/scale` không còn phụ thuộc hoàn toàn vào Meta `/copies` khi nhân bản campaign: app tự tạo campaign PAUSED mới và tạo lại các adset nguồn ở trạng thái PAUSED.
- API key/env status được chuyển sang khu `Quản trị`; trang `Cài đặt` của khách chỉ còn thông tin tài khoản.

### Kiểm tra đã chạy

- `npm.cmd run typecheck`: pass.
- `npm.cmd run lint`: pass.
- `npm.cmd test`: pass, 10 files / 37 tests.
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
- Recommendation engine dùng benchmark ngành để thêm nhận định như CTR/CPC/CPM tốt hơn hoặc kém hơn mặt bằng ngành vào reason/evidence.

## 2026-05-21 - Creator Ads AI foundation

### Đã bổ sung

- Thêm `POST /api/ai/content-ads`, gọi Gemini server-side để tạo gói content quảng cáo.
- Thêm schema/test cho gói content: angle, hook, primary text, headline, CTA, creative brief, compliance notes và kế hoạch test.
- Trang `Creative` có khu vực `Creator Ads AI`, cho nhập sản phẩm, ngành, khách hàng mục tiêu, offer, chính sách bán hàng và lý do khách phân vân.
- Content được tạo chỉ để review/copy, chưa tự đăng post và chưa tự launch campaign.

## 2026-05-21 - Ads content library

### Đã bổ sung

- Thêm migration `202605210007_create_ads_content_library.sql`.
- Thêm `GET/POST /api/ai/content-library` để lưu/lấy gói content đã tạo bằng Creator Ads AI.
- Trang `Creative` có nút `Lưu vào thư viện` và danh sách content đã lưu.
- Thư viện content là bước đệm để sau này chọn lại content thắng và đưa vào Campaign Builder.

## 2026-05-21 - Content library trong Campaign Builder

### Đã bổ sung

- Trang `Tạo Campaign AI` tải content đã lưu từ Creator Ads AI.
- Form `Tạo camp mới` có selector `Content quảng cáo đã lưu` để đổ nhanh sản phẩm, ngành, mục tiêu, khách hàng, offer, nội dung mẫu và brief media vào cấu hình campaign.
- Preview vẫn là bước review an toàn, không tự launch Meta cho đến khi khách bấm `Launch lên Meta PAUSED`.

## 2026-05-21 - Creator Ads AI dùng hồ sơ ngành

### Đã bổ sung

- `POST /api/ai/content-ads` có thể nhận `ad_account_id` và tự đọc hồ sơ ngành của đúng user/account ở server.
- Prompt Gemini được bổ sung ngữ cảnh ngành, mô hình bán hàng, loại offer, giá trị đơn trung bình, khách hàng mục tiêu và ghi chú tối ưu nếu đã lưu ở `Tối ưu Ads`.
- Nếu chưa có bảng/hồ sơ ngành, chức năng vẫn fallback an toàn và không crash.

## 2026-05-21 - Recommendation scoring theo benchmark ngành

### Đã bổ sung

- Recommendation engine không còn chỉ dùng ngưỡng cứng `CTR < 1%`; nếu có benchmark ngành đủ mẫu, ngưỡng CTR thấp sẽ tính theo median ngành.
- Gợi ý scale ngân sách có thể dựa trên chi phí/kết quả tốt hơn benchmark ngành, không chỉ so với các campaign trong cùng account.
- Khi benchmark chưa đủ mẫu, engine tự fallback về ngưỡng mặc định để tránh khuyến nghị quá tự tin.

## 2026-05-21 - Autopilot apply readiness

### Đã bổ sung

- Mỗi recommendation trong `Tối ưu Ads` có panel `Kiểm tra trước khi áp dụng`.
- UI nói rõ khuyến nghị đã duyệt chưa, account đã bật ủy quyền chưa, action có nằm trong phạm vi được phép chưa và thay đổi ngân sách có vượt giới hạn không.
- Những action chưa có API apply tự động an toàn được ghi rõ là proposal/log, không fake tự chỉnh Meta.

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

## 2026-05-21 - Optimization next action summary

### Đã bổ sung

- Trang `Tối ưu Ads` có khối `Ưu tiên hôm nay`, dịch danh sách recommendation thành bước tiếp theo dễ hiểu cho chủ doanh nghiệp.
- Hiển thị nhanh số khuyến nghị ưu tiên cao, chờ duyệt, sẵn sàng áp dụng và số hành động bị chặn/lỗi.
- Khối này nhắc rõ app chỉ áp dụng khi khuyến nghị đã duyệt và tài khoản đã bật ủy quyền có kiểm soát.

### Kiểm tra đã chạy

- `npm.cmd run typecheck`: pass.
- `npm.cmd run lint`: pass.
- `npm.cmd test`: pass.
- `npm.cmd run build`: pass.
