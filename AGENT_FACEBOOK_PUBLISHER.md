# Agent Facebook Publisher Ingest

Agent không cần yêu cầu khách copy JSON thủ công. Agent có thể tự nạp draft vào webapp bằng endpoint:

```http
POST /api/facebook-publisher/drafts
```

## Env cần có trên webapp

```text
AGENT_INGEST_KEY=chuoi-bi-mat-noi-bo
AGENT_INGEST_USER_ID=supabase-user-id-mac-dinh
```

Với app đa khách hàng, Agent có thể gửi thêm `user_id` trong body nếu đã biết Supabase user ID của khách.

## Header

```text
x-agent-ingest-key: <AGENT_INGEST_KEY>
content-type: application/json
```

## Body mẫu

```json
{
  "page_id": "optional-facebook-page-id",
  "draft": {
    "title": "Post bán hàng dịch vụ spa",
    "caption": "Caption do Agent viết...",
    "cta": "Inbox để nhận tư vấn",
    "link": "https://www.theanhmarketing.com/",
    "image": {
      "url": "https://example.com/agent-image.png",
      "alt": "Ảnh social post do Agent tạo"
    },
    "approved": false
  }
}
```

## Sau khi Agent nạp

Khách mở:

```text
/facebook-publisher
```

Trang sẽ hiện bài trong mục **Draft Agent chờ duyệt**. Khách bấm vào draft, kiểm tra preview, tick duyệt và bấm **Đăng lên Fanpage**.

## Lưu ý

- Agent chỉ nạp draft, không tự publish.
- Webapp vẫn giữ bước khách duyệt thủ công trước khi đăng.
- Không gửi Page Access Token qua endpoint này.
- Nếu ảnh là file local, nên upload ảnh lên nơi có URL public hoặc gửi dạng `imageDataUrl` khi kích thước hợp lý.

