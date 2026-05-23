import { NextResponse } from "next/server";
import { z } from "zod";
import {
  logAgentIngestEvent,
  touchAgentIngestKey,
  validateAgentKeyAccess
} from "@/lib/agent-keys";
import { buildFacebookPublishPayload, dataUrlToFilePart } from "@/lib/facebook-publisher";
import { requireFacebookProviderTokenForUser } from "@/lib/meta/auth-token";
import {
  getMetaManagedPages,
  metaErrorResponse,
  publishMetaPageFeedPost,
  publishMetaPageMultiPhotoPost,
  publishMetaPagePhotoPost,
  uploadMetaPageUnpublishedPhoto
} from "@/lib/meta/facebook";

const publishSchema = z.object({
  page_id: z.string().trim().min(1),
  approved: z.boolean().default(true),
  draft: z.record(z.string(), z.unknown())
});

export async function POST(request: Request) {
  const rawKey = request.headers.get("x-agent-ingest-key")?.trim() || "";
  let userId = "";
  let keyId: string | null = null;
  let pageId = "";
  let title = "";

  try {
    if (!rawKey) {
      return NextResponse.json({ error: "Thiếu x-agent-ingest-key." }, { status: 401 });
    }

    const body = publishSchema.parse(await request.json());
    pageId = body.page_id;
    const payload = buildFacebookPublishPayload(body.draft, {
      approved: body.approved,
      pageId: body.page_id
    });
    title = typeof body.draft.title === "string" ? body.draft.title : "";

    const validation = await validateAgentKeyAccess({
      rawKey,
      action: "direct_publish",
      pageId: payload.pageId,
      scheduledPublishTime: payload.scheduledPublishTime
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.reason }, { status: 403 });
    }

    const record = validation.record;
    userId = record.user_id;
    keyId = record.id;

    const accessToken = await requireFacebookProviderTokenForUser(record.user_id);
    const pages = await getMetaManagedPages(accessToken);
    const selectedPage = pages.find((page) => page.id === payload.pageId);
    const pageAccessToken = selectedPage?.access_token || null;

    if (!pageAccessToken) {
      return NextResponse.json(
        {
          error: selectedPage
            ? "Fanpage đã chọn đúng, nhưng Facebook chưa trả Page Access Token cho Page này. Hãy yêu cầu khách bấm Kết nối lại để cấp lại pages_show_list/pages_manage_posts, kiểm tra tài khoản Facebook có quyền quản trị hoặc content task trên Page, rồi thử đăng lại."
            : "Token Facebook hiện tại không còn thấy Fanpage đã chọn. Hãy yêu cầu khách kết nối lại Facebook, cấp pages_show_list/pages_manage_posts và chọn lại đúng Page."
        },
        { status: 403 }
      );
    }

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

      await touchAgentIngestKey(record.id);
      await logAgentIngestEvent({
        userId,
        agentKeyId: record.id,
        action: "direct_publish",
        pageId: payload.pageId,
        title,
        status: "success",
        postId: result.post_id || result.id,
        requestJson: { mode: "photo" },
        responseJson: { photo_id: result.id, post_id: result.post_id || result.id }
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

    if (payload.mode === "multi_photo") {
      const uploadedPhotos = [];
      for (const [index, media] of payload.media.entries()) {
        const filePart = media.dataUrl ? dataUrlToFilePart(media.dataUrl) : null;
        const photo = await uploadMetaPageUnpublishedPhoto({
          pageId: payload.pageId,
          imageUrl: media.url,
          imageBlob: filePart?.blob,
          fileName: filePart ? `agent-post-image-${index + 1}.${filePart.fileName.split(".").pop() || "png"}` : undefined,
          accessToken: pageAccessToken
        });
        uploadedPhotos.push(photo);
      }

      const result = await publishMetaPageMultiPhotoPost({
        pageId: payload.pageId,
        message: payload.message,
        mediaFbids: uploadedPhotos.map((photo) => photo.id),
        scheduledPublishTime: payload.scheduledPublishTime,
        accessToken: pageAccessToken
      });

      await touchAgentIngestKey(record.id);
      await logAgentIngestEvent({
        userId,
        agentKeyId: record.id,
        action: "direct_publish",
        pageId: payload.pageId,
        title,
        status: "success",
        postId: result.id,
        requestJson: { mode: "multi_photo", media_count: uploadedPhotos.length },
        responseJson: { photo_ids: uploadedPhotos.map((photo) => photo.id), post_id: result.id }
      });

      return NextResponse.json({
        data: {
          mode: "photo",
          page_id: payload.pageId,
          photo_id: uploadedPhotos[0]?.id,
          post_id: result.id
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

    await touchAgentIngestKey(record.id);
    await logAgentIngestEvent({
      userId,
      agentKeyId: record.id,
      action: "direct_publish",
      pageId: payload.pageId,
      title,
      status: "success",
      postId: result.id,
      requestJson: { mode: "feed" },
      responseJson: { post_id: result.id }
    });

    return NextResponse.json({
      data: {
        mode: "feed",
        page_id: payload.pageId,
        post_id: result.id
      }
    });
  } catch (error) {
    if (keyId && userId) {
      await logAgentIngestEvent({
        userId,
        agentKeyId: keyId,
        action: "direct_publish",
        pageId: pageId || null,
        title: title || null,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Không thể đăng bài qua Agent."
      }).catch(() => undefined);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload không hợp lệ.", details: error.issues }, { status: 400 });
    }

    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
