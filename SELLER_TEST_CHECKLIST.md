# AI Ads Planner - Checklist test vận hành cho người bán

Mục tiêu: dùng checklist này để test app như một chủ doanh nghiệp thật, không test kiểu kỹ thuật viên.

## 1. Đăng nhập

- [ ] Mở `/login`.
- [ ] Bấm đăng nhập Facebook.
- [ ] Sau callback, app vào `/dashboard`.
- [ ] Vào `/settings`, thấy tên Facebook và User ID.
- [ ] Không thấy token/key bí mật nào trên giao diện.

## 2. Quyền admin

- [ ] User thường không thấy menu `Quản trị`.
- [ ] User thường mở thẳng `/admin` bị đưa về dashboard.
- [ ] Admin mở `/admin` thấy danh sách user Facebook.
- [ ] Admin đổi role/khóa mục cho user.
- [ ] User bị khóa mục không thấy hoặc không dùng được mục đó.

## 3. Tài khoản quảng cáo mặc định

- [ ] Vào dashboard, chọn một tài khoản quảng cáo.
- [ ] Sang `Báo cáo Ads`, tài khoản đó được chọn sẵn.
- [ ] Sang `Tạo Campaign AI`, tài khoản đó được chọn sẵn.
- [ ] Quay lại dashboard không tự quét lại nếu chưa bấm `Làm mới`.

## 4. Tạo campaign mới - preview 1-1-1

- [ ] Vào `Tạo Campaign AI`.
- [ ] Chọn tài khoản quảng cáo.
- [ ] Chọn fanpage hoặc nhập link fanpage để kiểm tra quyền.
- [ ] Chọn mục tiêu `Tin nhắn`.
- [ ] Nhập sản phẩm/dịch vụ.
- [ ] Nhập ngân sách dưới 300.000đ/ngày.
- [ ] Chọn bài viết có sẵn trên Page.
- [ ] Bấm `Tạo preview`.
- [ ] Preview có đúng 1 Campaign, 1 Nhóm quảng cáo, 1 Quảng cáo.
- [ ] Tên campaign không có `undefined`, không có dạng `[OUTCOME_] - ad`.

## 5. Tạo campaign mới - preview 1-3-3

- [ ] Nhập ngân sách từ 300.000đ đến dưới 1.000.000đ/ngày.
- [ ] Chọn mô hình `1 Campaign - 3 Nhóm - 9 Quảng cáo`.
- [ ] Bấm `Tạo preview`.
- [ ] Preview có 1 Campaign, 3 Nhóm quảng cáo, 9 Quảng cáo.
- [ ] Nút `Copy cấu hình` có phản hồi.
- [ ] Nút `Xuất JSON` tải file.

## 6. Launch lên Meta

- [ ] Chỉ launch khi đã có preview và đã chọn bài viết Page.
- [ ] Bấm `Launch lên Meta PAUSED`.
- [ ] Nếu thiếu quyền `ads_management`, app báo thiếu quyền.
- [ ] Nếu thiếu post/page quyền, app báo cần chọn bài viết hoặc quyền page.
- [ ] Nếu thành công, campaign/adset/ad tạo trên Meta đều ở trạng thái `PAUSED`.

## 7. Scale camp cũ

- [ ] Chọn mode `Scale camp cũ`.
- [ ] Chọn hành động: nhân bản campaign, nhân bản nhóm, hoặc tăng ngân sách.
- [ ] Chọn khoảng thời gian.
- [ ] Bấm `Lấy campaign`.
- [ ] Bảng campaign chỉ có radio chọn, không có nút nhân bản từng dòng.
- [ ] Chọn campaign nguồn.
- [ ] Nếu nhân bản nhóm, chọn adset nguồn.
- [ ] Nhập số lượng nhân bản.
- [ ] Bấm nút chính ở dưới form.
- [ ] Button có loading, không bấm im lặng.
- [ ] Nếu thiếu quyền, app báo rõ.

## 8. Testing A/B

- [ ] Chọn `Testing A/B`.
- [ ] Chọn một trong 4 card: bài viết, media, tệp khách hàng, vị trí hiển thị.
- [ ] Nhập thông tin chung.
- [ ] Có sẵn biến thể A và B.
- [ ] Nhập trùng dữ liệu ở biến đang test.
- [ ] Bấm `Tạo preview`, app chặn và báo trùng.
- [ ] Đổi biến thể khác nhau, preview tạo được.
- [ ] Bấm `Tạo A/B Test`, app lưu draft hoặc báo rõ nếu Supabase thiếu bảng.

## 9. AI tư vấn tạo quảng cáo

- [ ] Nhập yêu cầu bằng ngôn ngữ đời thường.
- [ ] Bấm `Hỏi AI tư vấn`.
- [ ] Nếu thiếu `GEMINI_API_KEY`, app báo chưa cấu hình.
- [ ] Nếu có key, AI trả tư vấn, mục tiêu, ngân sách, cấu trúc đề xuất.
- [ ] Bấm `Chấp thuận & tạo preview`.
- [ ] App map dữ liệu vào form và tạo preview nếu đủ thông tin.
- [ ] App không tự launch lên Meta.

## 10. Báo cáo Ads

- [ ] Chọn account.
- [ ] Chọn khoảng thời gian.
- [ ] Bấm lấy báo cáo.
- [ ] KPI hiện chi tiêu, impression, CTR, CPC, CPM, kết quả.
- [ ] Bảng campaign có filter/sort.
- [ ] Export CSV hoạt động.
- [ ] Nếu thiếu quyền, app báo thiếu `ads_read` hoặc quyền tương ứng.

## 11. Creative

- [ ] Vào `Creative`.
- [ ] Chọn account và khoảng thời gian.
- [ ] Bấm lấy báo cáo creative.
- [ ] Thấy tổng creative, lead, tin nhắn, chi tiêu.
- [ ] Tên creative tách khỏi ID.
- [ ] Nếu có post link, link mở được.
- [ ] Modal chi tiết có nút đóng.

## 12. Tệp khách hàng

- [ ] Vào `Tệp khách hàng`.
- [ ] Lấy dữ liệu từ adset cũ.
- [ ] Thấy tuổi, giới tính, vị trí, sở thích/hành vi nếu Meta trả về.
- [ ] Lưu được tệp.
- [ ] Sang Campaign Builder, chọn lại tệp đã lưu.

## 13. Kiểm tra cuối

- [ ] Không còn lỗi font tiếng Việt lớn.
- [ ] Không còn button chính bấm không phản hồi.
- [ ] Không có campaign nào tự tạo ACTIVE.
- [ ] Không có token/key trong frontend.
- [ ] `npm.cmd run typecheck` pass.
- [ ] `npm.cmd run lint` pass.
- [ ] `npm.cmd test` pass.
- [ ] `npm.cmd run build` pass.
