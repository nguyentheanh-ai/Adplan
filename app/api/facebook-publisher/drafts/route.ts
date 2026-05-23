import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getDevIngestUserId,
  logAgentIngestEvent,
  requireAgentKeyOwnerSession,
  touchAgentIngestKey,
  validateAgentKeyAccess
} from "@/lib/agent-keys";
import { normalizeAgentPostDraft, normalizeFacebookDraftRow } from "@/lib/facebook-publisher";
import { createAdminClient } from "@/lib/supabase/admin";

const ingestSchema = z.object({
  user_id: z.string().uuid().optional(),
  page_id: z.string().trim().optional().nullable(),
  title: z.string().trim().optional().nullable(),
  draft: z.record(z.string(), z.unknown())
});

const updateDraftSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "queued", "failed", "published", "hidden", "scheduled"]),
  publish_result: z.record(z.string(), z.unknown()).optional()
});

const summaryStatuses = ["published", "queued", "draft", "failed", "hidden", "scheduled"] as const;

function buildDraftSummary(rows: Array<{ status?: string | null }> | null | undefined) {
  const summary = {
    published: 0,
    draft: 0,
    hidden: 0,
    scheduled: 0
  };

  for (const row of rows ?? []) {
    if (row.status === "published") summary.published += 1;
    if (row.status === "scheduled") summary.scheduled += 1;
    if (row.status === "hidden") summary.hidden += 1;
    if (row.status === "draft" || row.status === "queued" || row.status === "failed") summary.draft += 1;
  }

  return summary;
}

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("facebook_post_drafts") || message.includes("schema cache");
}

function getIncomingAgentKey(request: Request) {
  return request.headers.get("x-agent-ingest-key")?.trim() || "";
}

async function resolveDraftOwner(request: Request, bodyUserId?: string, pageId?: string | null) {
  try {
    const session = await requireAgentKeyOwnerSession();
    return { userId: session.userId, via: "session" as const, keyId: null as string | null };
  } catch {
    const rawKey = getIncomingAgentKey(request);

    if (!rawKey) return null;

    const devKey = process.env.AGENT_INGEST_KEY;
    if (process.env.NODE_ENV !== "production" && devKey && rawKey === devKey) {
      const devUserId = getDevIngestUserId(bodyUserId);
      if (!devUserId) return null;
      return { userId: devUserId, via: "dev_key" as const, keyId: null as string | null };
    }

    const validation = await validateAgentKeyAccess({
      rawKey,
      action: "draft_ingest",
      pageId
    });

    if (!validation.ok) {
      throw new Error(validation.reason);
    }

    return {
      userId: validation.record.user_id,
      via: "agent_key" as const,
      keyId: validation.record.id
    };
  }
}

export async function GET() {
  try {
    const session = await requireAgentKeyOwnerSession();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("facebook_post_drafts")
      .select("id,page_id,status,draft_json,created_at,updated_at")
      .eq("user_id", session.userId)
      .in("status", ["draft", "queued", "failed"])
      .order("updated_at", { ascending: false })
      .limit(30);

    const { data: summaryRows, error: summaryError } = await admin
      .from("facebook_post_drafts")
      .select("status")
      .eq("user_id", session.userId)
      .in("status", [...summaryStatuses]);

    if (error || summaryError) {
      const currentError = error ?? summaryError;
      if (isMissingTable(currentError)) {
        return NextResponse.json({ data: [], summary: buildDraftSummary([]), storage: "missing_schema" });
      }
      if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []).map(normalizeFacebookDraftRow), summary: buildDraftSummary(summaryRows) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bạn cần đăng nhập Facebook." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  let userId = "";
  let keyId: string | null = null;
  let draftTitle = "";
  let pageId: string | null = null;

  try {
    const body = ingestSchema.parse(await request.json());
    pageId = body.page_id || null;
    const owner = await resolveDraftOwner(request, body.user_id, pageId);

    if (!owner) {
      return NextResponse.json(
        { error: "Thiếu phiên đăng nhập hoặc x-agent-ingest-key hợp lệ để Agent nạp draft." },
        { status: 401 }
      );
    }

    userId = owner.userId;
    keyId = owner.keyId;

    const draft = normalizeAgentPostDraft({ title: body.title, ...body.draft });
    draftTitle = draft.title;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("facebook_post_drafts")
      .insert({
        user_id: userId,
        page_id: pageId,
        title: draft.title,
        status: "queued",
        source: "agent",
        draft_json: draft
      })
      .select("id,page_id,status,draft_json,created_at,updated_at")
      .single();

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json(
          { error: "Chưa có bảng facebook_post_drafts. Hãy chạy migration 202605210010_create_facebook_post_drafts.sql." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (keyId) {
      await touchAgentIngestKey(keyId);
      await logAgentIngestEvent({
        userId,
        agentKeyId: keyId,
        action: "draft_ingest",
        pageId,
        title: draft.title,
        status: "success",
        requestJson: { page_id: pageId, draft_title: draft.title }
      });
    }

    return NextResponse.json({ data: normalizeFacebookDraftRow(data) });
  } catch (error) {
    if (keyId && userId) {
      await logAgentIngestEvent({
        userId,
        agentKeyId: keyId,
        action: "draft_ingest",
        pageId,
        title: draftTitle || null,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Không thể nạp draft từ Agent."
      }).catch(() => undefined);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Draft Agent không hợp lệ.", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể nạp draft từ Agent." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAgentKeyOwnerSession();
    const body = updateDraftSchema.parse(await request.json());
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("facebook_post_drafts")
      .update({
        status: body.status,
        publish_result_json: body.publish_result ?? {}
      })
      .eq("id", body.id)
      .eq("user_id", session.userId)
      .select("id,page_id,status,draft_json,created_at,updated_at")
      .single();

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json(
          { error: "Chưa có bảng facebook_post_drafts. Hãy chạy migration 202605210010_create_facebook_post_drafts.sql." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: normalizeFacebookDraftRow(data) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload cập nhật draft không hợp lệ.", details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể cập nhật draft." }, { status: 400 });
  }
}
