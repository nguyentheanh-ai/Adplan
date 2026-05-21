# AI Ads Planner - Định hướng Super App

Mục tiêu dài hạn: biến app thành trợ lý tăng trưởng quảng cáo cho chủ doanh nghiệp, không chỉ tạo campaign. App phải phân tích dữ liệu thật, hiểu ngành hàng, viết content mạnh, đề xuất tối ưu và chỉ tự chỉnh khi khách đã ủy quyền rõ.

## Trục sản phẩm chính

### 1. Data Brain - Kho dữ liệu quảng cáo

- Lưu snapshot từ tất cả tài khoản quảng cáo mà user đăng nhập.
- Lưu campaign/adset/ad/creative theo ngày và theo khoảng thời gian.
- Lưu audience cũ: tuổi, giới tính, địa lý, sở thích, hành vi, placement.
- Lưu creative thắng/thua: headline, body, CTA, post ID, landing URL, format.
- Gom dữ liệu theo ngành hàng để học pattern.
- Không trộn dữ liệu nhạy cảm giữa khách hàng ở UI; chỉ dùng dữ liệu tổng hợp/ẩn danh cho benchmark.

### 2. Optimization Copilot - Nhận định và tối ưu thay khách

- Giai đoạn 1: chỉ đưa khuyến nghị.
- Giai đoạn 2: khách bấm duyệt từng khuyến nghị.
- Giai đoạn 3: khách ủy quyền theo rule, app tự thực hiện trong giới hạn.
- Mọi hành động tự động phải có:
  - loại hành động được phép,
  - giới hạn tăng/giảm ngân sách,
  - account được phép,
  - trạng thái approval,
  - log trước/sau,
  - rollback note.

Khuyến nghị cần có:
- Campaign đốt tiền không ra lead/message.
- Creative thắng nên nhân bản concept.
- Creative mỏi do frequency cao.
- CTR thấp cần đổi hook.
- CPM tăng bất thường cần kiểm tra tệp/placement.
- CPL tốt nên tăng ngân sách 10-20%.
- Campaign có result nhưng ngân sách quá thấp nên scale.
- Campaign quá nhiều nhóm so với ngân sách nên gom lại.

### 3. Campaign Builder - Lên camp đúng cấu trúc

- Tạo camp mới từ mục tiêu kinh doanh.
- Scale camp cũ.
- Testing A/B đơn giản.
- Dùng lại tệp khách hàng đã lưu.
- Dùng lại mẫu campaign.
- Launch PAUSED, không launch ACTIVE.
- Tên campaign/adset/ad theo mã và format dễ kiểm soát.

### 4. Creative & Post Generator - Skill Creator Ads

Khách nhập:
- sản phẩm/dịch vụ,
- chính sách bán hàng,
- ưu đãi,
- tệp khách hàng,
- điểm đau,
- phản đối thường gặp,
- bằng chứng,
- giọng thương hiệu.

App tạo:
- 10 hook mạnh,
- 5 angle quảng cáo,
- 3 post bán hàng,
- 3 kịch bản video ngắn,
- 3 headline,
- 3 mô tả,
- CTA theo mục tiêu,
- biến thể A/B cho post/media/audience.

Sau này:
- tạo post nháp,
- gợi ý ảnh/video cần quay,
- kiểm tra content có quá chung chung không,
- map content vào Campaign Builder.

### 5. Industry Learning - Học theo ngành

Mỗi ngành cần học:
- mục tiêu nào thường hiệu quả,
- ngân sách tối thiểu nên bắt đầu,
- cấu trúc camp nên dùng,
- CTR/CPC/CPM/CPL benchmark,
- creative angle thắng,
- audience thường hiệu quả,
- lỗi phổ biến.

Ngành ưu tiên:
- Spa/thẩm mỹ,
- khóa học/đào tạo,
- shop thời trang/mỹ phẩm,
- nhà hàng/cafe,
- bất động sản,
- B2B dịch vụ,
- phòng khám,
- local service.

## Checklist triển khai tiếp theo

### Phase A - Nền dữ liệu và consent

- [x] Migration `meta_sync_runs`.
- [x] Migration `meta_account_snapshots`.
- [x] Migration `meta_campaign_snapshots`.
- [x] Migration `meta_ad_creative_snapshots`.
- [x] Migration `optimization_authorizations`.
- [x] Migration `optimization_recommendations`.
- [x] Migration `industry_learning_profiles`.
- [x] API sync dữ liệu Meta: `POST /api/meta/sync-insights`.
- [x] API tạo recommendation từ dữ liệu đã lưu: `POST /api/optimization/recommendations`.
- [x] UI quản lý ủy quyền tối ưu cho từng account.
- [x] UI lịch sử sync dữ liệu gần nhất.
- [x] UI danh sách recommendation ở trạng thái nháp.
- [x] Nút duyệt/từ chối recommendation.

### Phase B - Optimization Action Center

- [ ] Card "Việc nên làm hôm nay".
- [ ] Recommendation priority high/medium/low.
- [ ] Action types: tăng ngân sách, giảm ngân sách, tạm dừng để kiểm tra, nhân bản winner, tạo creative mới.
- [ ] Confirm modal trước khi áp dụng.
- [ ] Kiểm tra authorization trước khi gọi Meta.
- [x] Kiểm tra authorization trước khi gọi Meta.
- [x] Log action vào Supabase.
- [x] Không áp dụng nếu vượt giới hạn ủy quyền.

### Phase C - Industry Brain

- [ ] Cho user khai báo ngành hàng trên account/project.
- [ ] Map campaign/creative về ngành.
- [ ] Tính benchmark ngành nội bộ.
- [ ] Hiển thị "so với ngành của bạn".
- [ ] Gợi ý cấu trúc campaign theo ngành.
- [ ] Gợi ý content angle theo ngành.

### Phase D - Creator Ads Skill

- [ ] Form nhập sản phẩm/chính sách/khuyến mãi.
- [ ] Prompt Gemini chuyên creator ads tiếng Việt.
- [ ] JSON schema cho content package.
- [ ] UI duyệt hook/angle/post/script.
- [ ] Copy post.
- [ ] Lưu content vào thư viện.
- [ ] Dùng content đã chọn để tạo campaign preview.

### Phase E - Autopilot có kiểm soát

- [ ] Khách bật ủy quyền theo account.
- [ ] Chọn hành động được phép.
- [ ] Chọn giới hạn tăng ngân sách/ngày.
- [ ] Chọn khung giờ app được phép tối ưu.
- [ ] App chỉ tạo proposal nếu chưa đủ quyền.
- [ ] App chỉ apply khi authorization hợp lệ.
- [ ] Mọi action đều có log, trạng thái, lỗi, rollback note.

## Nguyên tắc an toàn

- Không tự tắt campaign nếu khách chưa ủy quyền.
- Không tăng ngân sách quá giới hạn.
- Không dùng dữ liệu khách A hiển thị cho khách B.
- Không fake benchmark khi chưa đủ sample.
- Không tự launch ACTIVE.
- Không chạy automation nếu token hết hạn.

## Nguồn kỹ thuật

- Meta Marketing API Insights: https://developers.facebook.com/docs/marketing-api/insights/
- Meta Marketing API Campaigns: https://developers.facebook.com/docs/marketing-api/reference/ad-account/campaigns/
- Meta Marketing API Adsets: https://developers.facebook.com/docs/marketing-api/reference/ad-account/adsets/
- Meta Marketing API Ads: https://developers.facebook.com/docs/marketing-api/reference/ad-account/ads/
- Gemini API generateContent: https://ai.google.dev/api/generate-content
- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output

## Progress 2026-05-21 - Autopilot transparency

- [x] Add server route `GET /api/optimization/action-logs`.
- [x] Show "Lịch sử tối ưu" inside Optimization Center.
- [x] Reload logs after apply recommendation.
- [x] Keep missing-schema fallback so production does not crash before Supabase migrations are applied.

## Progress 2026-05-21 - Industry context

- [x] Add migration `account_industry_profiles`.
- [x] Add server route `GET/PATCH /api/optimization/industry-profile`.
- [x] Add Optimization Center form for account industry, business model, offer, average order value, target customer and notes.
- [x] Use account industry context inside recommendation reason/evidence.
- [x] Add anonymized industry benchmark rebuild from synced Meta campaign snapshots.
- [x] Use industry benchmark context inside recommendation evidence/reason.
- [ ] Use account industry context directly inside scoring thresholds and content generation.
