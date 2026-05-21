# Test nhân bản quảng cáo Meta Ads

Luồng này chỉ chạy server-side, không expose access token ra frontend.

## Điều kiện trước khi test

- User đã đăng nhập Facebook lại sau khi app xin các scope:
  - `ads_read`
  - `ads_management`
  - `read_insights`
  - `pages_show_list`
  - `pages_read_engagement`
- User có quyền chạy/quản lý quảng cáo trên ad account trong Business Settings.
- Ad account không bị hạn chế, không lỗi thanh toán.
- Dòng creative trong app phải có `adId` thật của object Ads.

## Test từ UI

1. Vào trang `Creative`.
2. Chọn tài khoản quảng cáo và bấm `Lấy báo cáo creative`.
3. Ở bảng creative, bấm `Nhân bản`.
4. Chọn `Giữ nguyên nhóm quảng cáo gốc` hoặc chọn một adset đích.
5. Bấm `Kiểm tra trước khi nhân bản`.
6. Nếu checklist pass, bấm `Nhân bản`.
7. Kết quả thành công phải hiển thị:
   - `copied_ad_id`
   - trạng thái `PAUSED`
   - phương thức clone: `/ad_id/copies` hoặc fallback tạo ad PAUSED.

## Test API nội bộ

POST `/api/meta/ads-clone/diagnostics`

```json
{
  "ad_account_id": "act_123",
  "source_ad_id": "120000000000",
  "target_adset_id": "120000000001"
}
```

POST `/api/meta/ads-clone`

```json
{
  "ad_account_id": "act_123",
  "source_ad_id": "120000000000",
  "target_adset_id": null
}
```

`source_ad_id` bắt buộc là ID quảng cáo. Không dùng `campaign_id`, `adset_id`, `creative_id` hoặc `post_id`.

## Log an toàn

Log clone chỉ lưu:

- thời gian
- ad account id
- source ad id
- target adset id
- endpoint đã gọi
- trạng thái success/fail
- Meta error code/subcode/fbtrace_id
- copied ad id nếu có

Không lưu access token, app secret hoặc Authorization header.
