# AI Ads Planner - Checklist vận hành 10 tiếng

Ngày lập: 2026-05-21  
Mục tiêu: đưa app tới trạng thái đủ dễ dùng để demo/bán cho chủ doanh nghiệp, đồng thời không làm giả thành công, không lộ secret, không tạo campaign ACTIVE.

## Nguồn tham chiếu chính

- Meta Marketing API: https://developers.facebook.com/docs/marketing-api/
- Meta Campaigns edge: https://developers.facebook.com/docs/marketing-api/reference/ad-account/campaigns/
- Meta Adsets edge: https://developers.facebook.com/docs/marketing-api/reference/ad-account/adsets/
- Meta Ad Creatives edge: https://developers.facebook.com/docs/marketing-api/reference/ad-account/adcreatives/
- Meta Ads edge: https://developers.facebook.com/docs/marketing-api/reference/ad-account/ads/
- Gemini generateContent: https://ai.google.dev/api/generate-content
- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output

## Luật bất biến trong 10 tiếng

- Không expose `META_ACCESS_TOKEN`, `META_APP_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`.
- Không commit `.env.local`.
- Không tạo campaign/adset/ad ở trạng thái `ACTIVE`; tất cả launch thật mặc định `PAUSED`.
- Không fake success. API lỗi thì UI phải nói dễ hiểu và lưu blocker.
- Không để button chính bấm im lặng.
- Không làm flow phức tạp hơn Facebook Ads Manager.
- Không hardcode ad account/page/post/token.
- Không dùng mock data ở phần đã có dữ liệu Meta thật.
- Mọi thay đổi lớn phải chạy ít nhất: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`.
- Nếu build fail thì dừng tính năng mới, sửa build trước.

## Định nghĩa "bán được" cho MVP

- Chủ doanh nghiệp đăng nhập Facebook và thấy tài khoản quảng cáo của họ.
- Họ chọn được tài khoản mặc định, app nhớ và các trang dùng lại ngay, không phải load lại vô lý.
- Họ hiểu tài khoản/page/post nào thiếu quyền.
- Họ tạo được preview campaign rõ cây: Campaign -> Nhóm quảng cáo -> Quảng cáo.
- Họ chỉ cần trả lời các câu hỏi kinh doanh đơn giản, không phải học thuật ngữ ads.
- Họ có AI tư vấn trước khi tạo quảng cáo.
- Họ xem báo cáo được bằng ngôn ngữ dễ hiểu: chi tiêu, lead, tin nhắn, CTR, CPC, CPM, chi phí mỗi kết quả.
- Họ export báo cáo khi cần gửi cho sếp/đội marketing.
- Admin quản lý được user Facebook và khóa/mở tính năng.

## Blocker cần lưu nhưng không làm dừng toàn bộ

| Blocker | Cách app phải xử lý | File cần ghi chú |
| --- | --- | --- |
| Thiếu `ads_read` | Cho xem UI, disable đọc báo cáo/campaign, hướng dẫn cấp quyền | `RELEASE_NOTES.md` |
| Thiếu `ads_management` | Cho preview/lưu draft, disable launch/clone/update budget | `RELEASE_NOTES.md` |
| Thiếu `pages_show_list` | Cho nhập link page để kiểm tra, báo không load được page list | `RELEASE_NOTES.md` |
| Thiếu `pages_read_engagement` | Báo không đọc được post/creative, vẫn cho tạo bằng post ID thủ công nếu hợp lệ | `RELEASE_NOTES.md` |
| Thiếu Gemini key | Disable AI Consultant, phần còn lại vẫn chạy | `RELEASE_NOTES.md` |
| Supabase bảng chưa sync | UI fallback không crash, admin thấy hướng dẫn chạy SQL | `SETUP_SUPABASE.md` |
| Token hết hạn | Báo đăng nhập lại Facebook, không show raw error dài | UI toast/error panel |
| Meta API rate limit | Báo chờ rồi thử lại, giữ dữ liệu cache cũ nếu có | UI error panel |

## Bộ nhu cầu thực tế của chủ doanh nghiệp cần bổ sung

- Chọn mục tiêu bằng ngôn ngữ đời thường: "Muốn khách nhắn tin", "Muốn lấy số điện thoại", "Muốn kéo người về web", "Muốn bán hàng".
- Gợi ý ngân sách tối thiểu theo mục tiêu và ngành, tránh chia quá nhiều nhóm khi ngân sách thấp.
- Cảnh báo trước khi chạy: tài khoản bị hạn chế, thiếu phương thức thanh toán, page không có quyền admin, bài viết không đủ điều kiện, landing page thiếu URL.
- Lưu "mẫu chiến dịch" để lần sau chỉ thay bài/media/ngân sách.
- Lưu "tệp khách hàng" từ nhóm quảng cáo cũ: tuổi, giới tính, vị trí, sở thích, hành vi, placement.
- Nút "Dùng lại tệp này" khi tạo campaign mới.
- AI tư vấn: hỏi ít, gợi ý cấu trúc, giải thích tại sao.
- Preview dễ đọc: nếu chỉ có campaign mà thiếu nhóm/quảng cáo thì báo ngay.
- Checklist bên phải đổi theo mode và tick thật theo dữ liệu thật.
- Dashboard không tự quét lại khi qua lại tab; chỉ refresh khi user bấm "Làm mới".
- Creative dashboard phải giúp biết creative nào thắng, không chỉ liệt kê ảnh.
- Báo cáo Ads có filter ngay trên bảng: tìm tên campaign, trạng thái, objective, sort spend/CTR/CPC/CPL/result.
- Export báo cáo dành cho chủ doanh nghiệp: PDF/Excel/CSV có tiêu đề, account, khoảng ngày, KPI, insight.
- Admin phân quyền theo user Facebook thật, không ai cũng vào admin.

## Ma trận quyền Meta cần kiểm tra

| Tính năng | Quyền tối thiểu | Nếu thiếu quyền |
| --- | --- | --- |
| Quét tài khoản quảng cáo | `ads_read` | Disable account/report, hiện hướng dẫn cấp quyền |
| Xem campaign/adset/ad | `ads_read` | Không crash, báo thiếu quyền đọc quảng cáo |
| Tạo campaign/adset/ad PAUSED | `ads_management` | Cho preview/draft, khóa launch |
| Đọc Page list | `pages_show_list` | Cho nhập link page, báo cần quyền đọc danh sách page |
| Đọc post trên page | `pages_read_engagement`, có quyền page | Báo không đọc được post, cho nhập post ID/link bài |
| Đọc nội dung post/creative | `pages_read_user_content` nếu Meta yêu cầu | Hiện post ID/link thay text nếu thiếu quyền |
| Business/asset nâng cao | `business_management` | Không chặn MVP, chỉ báo thiếu quyền nâng cao |

## Chạy 10 tiếng - Lịch làm chi tiết

### Giờ 1 - Chốt nền ổn định: Supabase, Admin, cache dữ liệu

**Mục tiêu:** Không còn lỗi bảng permission; admin chỉ người được cấp quyền mới vào; chuyển tab không load lại vô lý.

**File dự kiến sửa:**
- `app/admin/page.tsx`
- `app/api/admin/permissions/route.ts`
- `lib/admin-permissions.ts`
- `lib/supabase/server.ts`
- `components/app-shell.tsx`
- `components/meta-account-provider.tsx` hoặc file provider tương ứng
- `SETUP_SUPABASE.md`

**Checklist:**
- [ ] Kiểm tra route admin đang guard bằng gì.
- [ ] Nếu admin guard đang fallback quá rộng, sửa thành chỉ cho `role = owner | admin`.
- [ ] Seed cứng tạm thời bằng server-side env `ADMIN_FACEBOOK_IDS` nếu Supabase permission chưa có.
- [ ] Đảm bảo user Facebook login được upsert vào bảng profile/users nội bộ.
- [ ] `admin_user_permissions` đọc/ghi qua server route, không gọi service role từ client.
- [ ] Lưu selected ad account vào localStorage và context.
- [ ] Khi chuyển trang, dùng cache context trước; chỉ gọi API khi chưa có data hoặc user bấm "Làm mới".
- [ ] Loading chuyển tab dùng mini top progress, không blank cả trang.

**Test bắt buộc:**
- [ ] User thường vào `/admin` bị redirect hoặc thấy thông báo không có quyền.
- [ ] Admin vào `/admin` thấy danh sách user Facebook.
- [ ] Reload `/settings` vẫn thấy đúng user id.
- [ ] Chọn account ở dashboard, qua report rồi quay lại dashboard không tự quét lại.
- [ ] `npm.cmd run typecheck`.

**Done khi:**
- Không còn raw error "Could not find table".
- Admin không mở cho mọi user.
- Không có secret trong bundle client.

### Giờ 2 - Meta readiness center cho người không kỹ thuật

**Mục tiêu:** App nói rõ tài khoản nào dùng được, page/post nào thiếu quyền, không để khách đoán.

**File dự kiến sửa:**
- `app/api/meta/adaccounts/route.ts`
- `app/api/meta/pages/route.ts`
- `app/api/meta/page-posts/route.ts`
- `lib/meta/facebook.ts`
- `components/meta-readiness-card.tsx`
- `components/campaign-builder/campaign-builder-client.tsx`

**Checklist:**
- [ ] Route ad accounts trả thêm `currency`, `timezone_name`, `account_status`, `disable_reason` nếu có.
- [ ] Route pages đọc theo user token/server token hiện có; nếu thiếu quyền trả code dễ hiểu.
- [ ] Route page posts hỗ trợ nhập link fanpage hoặc page ID.
- [ ] Khi không load được post, UI hiện: "Bạn chưa có quyền quản trị page hoặc token thiếu quyền đọc bài viết."
- [ ] Không có nút "Nạp tài khoản" trong Creative/Customer Audience nếu không dùng.
- [ ] Meta error normalize thành nhóm: thiếu quyền, token hết hạn, account bị hạn chế, sai ID, rate limit.

**Test bắt buộc:**
- [ ] Gọi `/api/meta/adaccounts` không lộ token.
- [ ] Chọn account xong account ID hiển thị để kiểm tra.
- [ ] Nhập fanpage link không có quyền, UI báo dễ hiểu.
- [ ] `npm.cmd test`.

**Done khi:**
- Khách biết rõ "thiếu quyền gì" thay vì thấy lỗi kỹ thuật.

### Giờ 3 - Flow tạo camp mới cực đơn giản

**Mục tiêu:** Chủ doanh nghiệp tạo preview đúng cấu trúc trong 2 phút.

**File dự kiến sửa:**
- `components/campaign-builder/campaign-builder-client.tsx`
- `lib/campaign-builder.ts`
- `lib/campaign-builder-advanced.test.ts`
- `app/api/campaign-sequences/route.ts`
- `lib/meta/types.ts`

**Checklist:**
- [ ] Đưa chọn tài khoản quảng cáo lên đầu.
- [ ] Fanpage chọn từ page list, fallback nhập link/ID.
- [ ] Objective hiển thị tiếng Việt: Tin nhắn, Tương tác, Traffic, Lead, Sales.
- [ ] Budget < 300k gợi ý `1-1-1`.
- [ ] Budget 300k đến dưới 1tr gợi ý `1-3-3`.
- [ ] Budget >= 1tr cho custom nhưng vẫn gợi ý số nhỏ.
- [ ] Preview `1-1-1` có 1 campaign, 1 adset, 1 ad.
- [ ] Preview `1-3-3` có 1 campaign, 3 adsets, 9 ads.
- [ ] Tên campaign đúng `Ngay_Thang_MucTieu_SanPham_Tep_Post`.
- [ ] Tên adset đúng `MaChienDich_Tep_DoTuoi`.
- [ ] Tên ad đúng `MaChienDich_3ChuDauPost`.
- [ ] Không còn tên `[OUTCOME_...] - ad - date`.
- [ ] Checklist bên phải tick theo dữ liệu thật.

**Test bắt buộc:**
- [ ] Unit test naming helper.
- [ ] Unit test preview `1-1-1`.
- [ ] Unit test preview `1-3-3`.
- [ ] Browser smoke nếu chạy local được.

**Done khi:**
- Preview cây rõ và không có `undefined/null` trong tên.

### Giờ 4 - Launch thật PAUSED cho đường đơn giản nhất

**Mục tiêu:** Launch được path an toàn: post có sẵn -> campaign/adset/ad PAUSED.

**File dự kiến sửa:**
- `app/api/meta/launch-campaign/route.ts`
- `lib/meta/facebook.ts`
- `components/campaign-builder/campaign-builder-client.tsx`
- `lib/meta/errors.ts`

**Checklist:**
- [ ] Route nhận `CampaignDraft`.
- [ ] Validate có ad account, campaign, ít nhất 1 adset, ít nhất 1 ad.
- [ ] Validate có page/post hoặc creative input đủ an toàn.
- [ ] Tạo campaign trước với `status = PAUSED`.
- [ ] Tạo từng adset với `status = PAUSED`.
- [ ] Tạo creative từ post có sẵn bằng `object_story_id` nếu có.
- [ ] Tạo ads với `status = PAUSED`.
- [ ] Nếu campaign tạo được nhưng adset lỗi, báo rõ và lưu log partial.
- [ ] Nếu adset tạo được nhưng ads lỗi, báo ads nào lỗi.
- [ ] UI progress: "Đang tạo campaign", "Đang tạo nhóm 1/3", "Đang tạo quảng cáo 1/9".
- [ ] Không bật launch nếu thiếu `ads_management`.

**Test bắt buộc:**
- [ ] Test route validation thiếu adset.
- [ ] Test route validation thiếu ads.
- [ ] Test mocked Meta success trả ID đủ 3 tầng.
- [ ] Test mocked Meta adset failure không tạo ads.

**Done khi:**
- Button launch không còn disabled vô nghĩa nếu đủ quyền/env.
- Thành công thật trả ID campaign/adset/ad.

### Giờ 5 - Scale camp cũ hoạt động thật và dễ hiểu

**Mục tiêu:** Flow scale không có nút chết, không có bảng debug.

**File dự kiến sửa:**
- `app/api/meta/scale/route.ts`
- `app/api/meta/campaigns/route.ts`
- `app/api/meta/adsets/route.ts`
- `lib/meta/facebook.ts`
- `components/campaign-builder/campaign-builder-client.tsx`

**Checklist:**
- [ ] Hành động: Nhân bản chiến dịch, Nhân bản nhóm quảng cáo, Tăng ngân sách.
- [ ] Bấm "Lấy campaign" mới quét.
- [ ] Bảng campaign chỉ có radio chọn, không có nút clone từng dòng.
- [ ] Chọn dòng đồng bộ campaign nguồn.
- [ ] Nhân bản nhóm thì load adset nguồn.
- [ ] Có số lượng nhân bản.
- [ ] Có ngân sách mới nếu cần.
- [ ] Nút chính nằm dưới form: "Nhân bản chiến dịch", "Nhân bản nhóm", "Cập nhật ngân sách".
- [ ] API clone/update không sẵn thì disable hoặc báo "Chưa cấu hình API clone", không im lặng.
- [ ] Lưu log vào `campaign_clone_logs`.

**Test bắt buộc:**
- [ ] Lấy campaign trả danh sách.
- [ ] Bấm nút chính không chọn nguồn thì toast cảnh báo.
- [ ] Mock clone campaign success.
- [ ] Mock update budget success.

**Done khi:**
- Người dùng biết đúng thứ tự bấm.

### Giờ 6 - A/B Testing đơn giản hơn Ads Manager

**Mục tiêu:** Người không rành ads vẫn tạo được draft A/B.

**File dự kiến sửa:**
- `components/campaign-builder/campaign-builder-client.tsx`
- `lib/campaign-builder.ts`
- `app/api/campaign-ab-tests/route.ts`
- `lib/campaign-builder-advanced.test.ts`

**Checklist:**
- [ ] Bước 1 có 4 card: Test bài viết, Test media, Test tệp, Test vị trí.
- [ ] Bước 2 thông tin chung: account, fanpage, objective, budget, ngày, khu vực, tuổi, giới tính.
- [ ] Bước 3 biến thể A/B mặc định.
- [ ] Có nút thêm biến thể.
- [ ] Test bài viết không cho trùng post.
- [ ] Test media không cho trùng media.
- [ ] Test audience không cho trùng audience.
- [ ] Test placement không cho trùng placement.
- [ ] Preview giải thích chỉ nên thay đổi 1 yếu tố.
- [ ] Nút tạo thật chỉ hiện nếu backend sẵn; nếu chưa, lưu draft rõ ràng.

**Test bắt buộc:**
- [ ] Duplicate post bị chặn.
- [ ] 2 post khác nhau tạo preview được.
- [ ] Save draft ghi Supabase hoặc fallback báo rõ.

**Done khi:**
- Không có form kỹ thuật khó hiểu.

### Giờ 7 - Gemini AI Consultant

**Mục tiêu:** AI hỏi ít, tư vấn đúng, map vào form tạo preview.

**File dự kiến sửa:**
- `app/api/ai/consultant/route.ts`
- `components/campaign-builder/ai-consultant.tsx`
- `components/campaign-builder/campaign-builder-client.tsx`
- `lib/ai-consultant.ts`
- `lib/ai-consultant.test.ts`

**Checklist:**
- [ ] Route server-side gọi Gemini, không gọi từ frontend.
- [ ] Nếu thiếu `GEMINI_API_KEY`, UI báo "Chưa cấu hình Gemini API key".
- [ ] System prompt nói vai trò chuyên gia ads cho SME Việt Nam.
- [ ] AI hỏi các thông tin tối thiểu: bán gì, mục tiêu, ngân sách, khách hàng, scale/tạo mới/test.
- [ ] Output có JSON schema: mode, objective, product, budget, location, ageRange, gender, pageId, postId, audience, structure, reason, missingFields, canCreatePreview.
- [ ] Validate JSON bằng zod hoặc parser chặt.
- [ ] Nếu AI trả JSON lỗi, retry 1 lần.
- [ ] UI hiện tóm tắt đề xuất, lý do, thiếu gì.
- [ ] Nút "Chấp thuận & tạo preview" map JSON vào form, không auto launch.

**Test bắt buộc:**
- [ ] Missing key route trả 503 dễ hiểu.
- [ ] Mock Gemini JSON hợp lệ map được vào input.
- [ ] Invalid JSON retry hoặc báo lỗi.

**Done khi:**
- AI giúp khách điền form chứ không chỉ chat chơi.

### Giờ 8 - Dashboard/report/creative/customer audience sạch cho khách hàng

**Mục tiêu:** Dữ liệu đã có phải hiển thị nhanh, không lỗi font, không load lại vô lý.

**File dự kiến sửa:**
- `app/dashboard/page.tsx`
- `app/reports/page.tsx`
- `app/creative/page.tsx`
- `app/audiences/page.tsx`
- `components/dashboard/*`
- `components/reports/*`
- `components/creative/*`

**Checklist:**
- [ ] Fix tất cả mojibake tiếng Việt.
- [ ] Dashboard bỏ "Tổng tài khoản" và "Tài khoản hoạt động" nếu user không cần.
- [ ] Dashboard không có nút export, chỉ link sang Báo cáo Ads.
- [ ] Biểu đồ ngày cho chọn spend/CTR/CPC và line/bar.
- [ ] Có dashboard đối sánh cùng khoảng thời gian bên cạnh.
- [ ] Report đưa bảng xuống dưới, show đủ chỉ số.
- [ ] Filter nằm ngay trên tiêu đề bảng.
- [ ] Creative tách tên creative và ID.
- [ ] Creative có link bài post nếu có.
- [ ] Creative không có nút nạp tài khoản.
- [ ] Tệp khách hàng lấy tuổi, giới tính, sở thích, hành vi, địa lý từ adset.
- [ ] Cho lưu tệp khách hàng lại để dùng khi tạo campaign.

**Test bắt buộc:**
- [ ] Mở dashboard sau khi data cache có, không re-fetch nếu chưa bấm refresh.
- [ ] Report filter không làm crash khi dữ liệu rỗng.
- [ ] Creative modal có nút đóng.
- [ ] Font tiếng Việt đúng trên production build.

**Done khi:**
- App nhìn như công cụ bán được, không còn text lỗi.

### Giờ 9 - Tài liệu vận hành, test checklist, release notes

**Mục tiêu:** Người khác test/maintain được mà không hỏi lại.

**File dự kiến tạo/sửa:**
- `SELLER_TEST_CHECKLIST.md`
- `RELEASE_NOTES.md`
- `SETUP_SUPABASE.md`
- `README.md`

**Checklist:**
- [ ] Viết checklist login Facebook.
- [ ] Viết checklist load ad account.
- [ ] Viết checklist load page/post.
- [ ] Viết checklist preview `1-1-1`.
- [ ] Viết checklist preview `1-3-3`.
- [ ] Viết checklist launch PAUSED.
- [ ] Viết checklist scale campaign/adset/budget.
- [ ] Viết checklist A/B content.
- [ ] Viết checklist Gemini consultant.
- [ ] Viết checklist admin phân quyền.
- [ ] Ghi env bắt buộc, không ghi secret thật.
- [ ] Ghi quyền Meta cần xin.

**Test bắt buộc:**
- [ ] Tài liệu không chứa token/key thật.
- [ ] Link route trong docs đúng với app.

**Done khi:**
- Bên thứ ba đọc docs có thể tự test flow.

### Giờ 10 - Regression, production build, deploy smoke

**Mục tiêu:** Kết thúc 10 tiếng bằng bản deploy được, không chỉ chạy máy local.

**Checklist:**
- [ ] `git status --short` hiểu rõ file nào thay đổi.
- [ ] `npm.cmd run typecheck`.
- [ ] `npm.cmd run lint`.
- [ ] `npm.cmd test`.
- [ ] `npm.cmd run build`.
- [ ] Search token leak: `GEMINI_API_KEY`, `META_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Không log token ở server/client.
- [ ] Commit với message rõ.
- [ ] Push branch/main theo yêu cầu hiện tại.
- [ ] Deploy Vercel production.
- [ ] Smoke test production: login, dashboard, report, campaign builder, admin guard.
- [ ] Ghi blocker còn lại trong `RELEASE_NOTES.md`.

**Done khi:**
- Build pass.
- Production route chính mở được.
- Không còn button chết trong flow chính.

## Test vận hành chi tiết

### Login/Auth
- [ ] Mở `/login`.
- [ ] Đăng nhập Facebook.
- [ ] Callback về `/dashboard`.
- [ ] Settings hiện tên user và user ID.
- [ ] User được lưu để admin nhìn thấy.

### Account mặc định
- [ ] Chọn account A.
- [ ] Refresh page.
- [ ] Account A vẫn được chọn.
- [ ] Sang `/reports` account A vẫn là mặc định.
- [ ] Sang `/campaign-builder` account A vẫn là mặc định.

### Campaign mới
- [ ] Chọn account.
- [ ] Chọn/nhập fanpage.
- [ ] Chọn objective Tin nhắn.
- [ ] Nhập sản phẩm.
- [ ] Nhập budget 200000.
- [ ] App gợi ý `1-1-1`.
- [ ] Tạo preview có 1 campaign, 1 adset, 1 ad.
- [ ] Tên không có dấu, không undefined.
- [ ] Launch chỉ bật nếu đủ quyền và đủ dữ liệu.

### Campaign mới 1-3-3
- [ ] Nhập budget 500000.
- [ ] App gợi ý `1-3-3`.
- [ ] Tạo preview có 1 campaign, 3 adsets, 9 ads.
- [ ] Copy JSON hoạt động.
- [ ] Xuất JSON hoạt động.

### Scale camp cũ
- [ ] Bấm "Lấy campaign".
- [ ] Danh sách campaign hiện với radio.
- [ ] Chọn 1 campaign.
- [ ] Nhập số lượng 2.
- [ ] Bấm nút chính.
- [ ] Nếu thiếu quyền, toast nói thiếu `ads_management`.
- [ ] Nếu clone chạy, log Supabase được ghi.

### A/B content
- [ ] Chọn Test bài viết.
- [ ] Biến thể A chọn Post 1.
- [ ] Biến thể B chọn Post 1.
- [ ] Tạo preview bị chặn vì trùng post.
- [ ] Đổi biến thể B sang Post 2.
- [ ] Preview thành công.

### Gemini
- [ ] Thiếu key: UI báo chưa cấu hình.
- [ ] Có key: chat nhận tư vấn.
- [ ] AI trả missingFields nếu thiếu dữ liệu.
- [ ] Chấp thuận tạo preview không auto launch.

### Admin
- [ ] User thường không thấy menu Admin.
- [ ] User thường vào `/admin` trực tiếp bị chặn.
- [ ] Admin thấy danh sách user Facebook.
- [ ] Admin khóa Báo cáo Ads cho user B.
- [ ] User B không vào được Báo cáo Ads hoặc thấy thông báo khóa mục.

## Backlog ưu tiên nếu còn thời gian

1. Wizard "Kiểm tra sẵn sàng chạy ads" trước launch.
2. Gợi ý ngân sách theo mục tiêu/ngành/độ rộng tệp.
3. Lưu mẫu campaign theo ngành: spa, khóa học, shop, nhà hàng, B2B.
4. Thư viện hook quảng cáo theo ngành.
5. So sánh creative thắng/thua theo post.
6. Cảnh báo frequency cao và CTR thấp.
7. Gợi ý tắt/tăng ngân sách dựa trên rule.
8. Export PDF đẹp cho chủ doanh nghiệp.
9. Lịch sử thay đổi ngân sách/clone.
10. Audit log admin.

## Cách báo cáo mỗi vòng 60-90 phút

- Phase đã xong.
- File đã sửa.
- Test đã chạy.
- Lỗi đã fix.
- Blocker cần quyền/env.
- Việc đang làm tiếp theo.

## Tiêu chí dừng cuối cùng

- Không còn lỗi build/type/lint/test.
- Không còn lỗi font lớn trong các trang chính.
- Admin guard hoạt động.
- Campaign Builder có preview đúng cấu trúc.
- Launch thật nếu đủ quyền tạo `PAUSED`, không tạo `ACTIVE`.
- Gemini consultant server-side hoặc disabled rõ nếu thiếu key.
- Có tài liệu test và release notes.
