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
  getMetaManagedPageAccessToken,
  metaErrorResponse,
  publishMetaPageFeedPost,
  publishMetaPagePhotoPost
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
    const pageAccessToken = await getMetaManagedPageAccessToken(payload.pageId, accessToken);

    if (!pageAccessToken) {
      return NextResponse.json(
        {
          error:
            "Không lấy được Page Access Token cho Fanpage này. Hãy yêu cầu khách đăng nhập lại Facebook và cấp quyền pages_show_list/pages_manage_posts."
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
