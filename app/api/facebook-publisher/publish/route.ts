import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaManagedPages, metaErrorResponse, publishMetaPageFeedPost, publishMetaPagePhotoPost } from "@/lib/meta/facebook";
import { buildFacebookPublishPayload, dataUrlToFilePart } from "@/lib/facebook-publisher";

const publishSchema = z.object({
  page_id: z.string().trim().min(1),
  approved: z.boolean(),
  draft: z.record(z.string(), z.unknown())
});

export async function POST(request: Request) {
  try {
    const body = publishSchema.parse(await request.json());
    const accessToken = await requireFacebookProviderToken();
    const pages = await getMetaManagedPages(accessToken);
    const selectedPage = pages.find((page) => page.id === body.page_id);
    const pageAccessToken = selectedPage?.access_token || null;

    if (!pageAccessToken) {
      return NextResponse.json(
        {
          error: selectedPage
            ? "Fanpage đã chọn đúng, nhưng Facebook chưa trả Page Access Token cho Page này. Hãy bấm Kết nối lại để cấp lại pages_show_list/pages_manage_posts, kiểm tra tài khoản Facebook có quyền quản trị hoặc content task trên Page, rồi thử đăng lại."
            : "Token Facebook hiện tại không còn thấy Fanpage đã chọn. Hãy bấm Kết nối lại, cấp pages_show_list/pages_manage_posts và chọn lại đúng Page."
        },
        { status: 403 }
      );
    }

    const payload = buildFacebookPublishPayload(body.draft, {
      approved: body.approved,
      pageId: body.page_id
    });

    if (payload.mode === "photo") {
      const filePart = payload.imageDataUrl ? dataUrlToFilePart(payload.imageDataUrl) : null;
      const result = await publishMetaPagePhotoPost({
        pageId: payload.pageId,
        caption: payload.caption,
        imageUrl: payload.imageUrl,
        imageBlob: filePart?.blob,
        fileName: filePart?.fileName,
        scheduledPublishTime: payload.scheduledPublishTime,
        accessToken: pageAccessToken
      });

      return NextResponse.json({
        data: {
          mode: "photo",
          page_id: payload.pageId,
          photo_id: result.id,
          post_id: result.post_id || result.id
        }
      });
    }

    const result = await publishMetaPageFeedPost({
      pageId: payload.pageId,
      message: payload.message,
      link: payload.link,
      scheduledPublishTime: payload.scheduledPublishTime,
      accessToken: pageAccessToken
    });

    return NextResponse.json({
      data: {
        mode: "feed",
        page_id: payload.pageId,
        post_id: result.id
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload không hợp lệ.", details: error.issues }, { status: 400 });
    }

    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
