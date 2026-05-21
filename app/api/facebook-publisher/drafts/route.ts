import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeAgentPostDraft, normalizeFacebookDraftRow } from "@/lib/facebook-publisher";

const ingestSchema = z.object({
  user_id: z.string().uuid().optional(),
  page_id: z.string().trim().optional().nullable(),
  title: z.string().trim().optional().nullable(),
  draft: z.record(z.string(), z.unknown())
});

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("facebook_post_drafts") || message.includes("schema cache");
}

function hasValidAgentKey(request: Request) {
  const expected = process.env.AGENT_INGEST_KEY;
  if (!expected) return false;
  return request.headers.get("x-agent-ingest-key") === expected;
}

async function resolveUserId(request: Request, bodyUserId?: string) {
  const session = await getAppSession();
  if (session?.userId) return session.userId;

  if (hasValidAgentKey(request)) {
    const fallbackUserId = bodyUserId || process.env.AGENT_INGEST_USER_ID;
    if (fallbackUserId) return fallbackUserId;
  }

  return null;
}

export async function GET() {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("facebook_post_drafts")
    .select("id,page_id,status,draft_json,created_at,updated_at")
    .eq("user_id", session.userId)
    .in("status", ["draft", "queued", "failed"])
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ data: [], storage: "missing_schema" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: (data ?? []).map(normalizeFacebookDraftRow) });
}

export async function POST(request: Request) {
  try {
    const body = ingestSchema.parse(await request.json());
    const userId = await resolveUserId(request, body.user_id);
    if (!userId) {
      return NextResponse.json(
        { error: "Thiếu phiên đăng nhập hoặc x-agent-ingest-key/AGENT_INGEST_USER_ID để Agent tự nạp draft." },
        { status: 401 }
      );
    }

    const draft = normalizeAgentPostDraft({ title: body.title, ...body.draft });
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("facebook_post_drafts")
      .insert({
        user_id: userId,
        page_id: body.page_id || null,
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

    return NextResponse.json({ data: normalizeFacebookDraftRow(data) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Draft Agent không hợp lệ.", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể nạp draft từ Agent." }, { status: 400 });
  }
}
