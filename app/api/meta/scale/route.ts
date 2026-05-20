import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth/session";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { cloneMetaObject, metaErrorResponse, updateMetaBudget } from "@/lib/meta/facebook";
import { createAdminClient } from "@/lib/supabase/admin";

const scaleSchema = z.object({
  ad_account_id: z.string().min(3),
  action: z.enum(["clone_campaign", "clone_adset", "increase_budget"]),
  source_campaign_id: z.string().optional(),
  source_adset_id: z.string().optional(),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
  new_budget: z.string().optional()
});

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("campaign_clone_logs") || message.includes("schema cache");
}

async function saveCloneLog(payload: {
  userId: string;
  accountId: string;
  sourceType: string;
  sourceId: string;
  clonedIds: string[];
  status: string;
  request: unknown;
  response: unknown;
  errorMessage?: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("campaign_clone_logs").insert({
    user_id: payload.userId,
    account_id: payload.accountId,
    source_type: payload.sourceType,
    source_id: payload.sourceId,
    cloned_ids: payload.clonedIds,
    status: payload.status,
    request_json: payload.request,
    response_json: payload.response,
    error_message: payload.errorMessage || null
  });

  if (error && !isMissingTable(error)) throw new Error(error.message);
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Ban can dang nhap Facebook." }, { status: 401 });

  let body: z.infer<typeof scaleSchema> | null = null;
  try {
    body = scaleSchema.parse(await request.json());
    const accessToken = await requireFacebookProviderToken();
    const sourceId = body.action === "clone_adset" ? body.source_adset_id : body.source_campaign_id;
    if (!sourceId) return NextResponse.json({ error: "Chua chon nguon de scale." }, { status: 400 });

    if (body.action === "increase_budget") {
      const result = await updateMetaBudget({ objectId: sourceId, dailyBudget: body.new_budget || "", accessToken });
      await saveCloneLog({
        userId: session.userId,
        accountId: body.ad_account_id,
        sourceType: "budget",
        sourceId,
        clonedIds: [],
        status: "success",
        request: body,
        response: result
      });
      return NextResponse.json({ data: { action: body.action, result } });
    }

    const sourceType = body.action === "clone_campaign" ? "campaign" : "adset";
    const result = await cloneMetaObject({ sourceId, sourceType, quantity: body.quantity, accessToken });
    const clonedIds = result.map((item) => item.id || item.copied_campaign_id || item.copied_adset_id || "").filter(Boolean);
    await saveCloneLog({
      userId: session.userId,
      accountId: body.ad_account_id,
      sourceType,
      sourceId,
      clonedIds,
      status: "success",
      request: body,
      response: result
    });

    return NextResponse.json({ data: { action: body.action, cloned_ids: clonedIds, result } });
  } catch (error) {
    if (body) {
      await saveCloneLog({
        userId: session.userId,
        accountId: body.ad_account_id,
        sourceType: body.action,
        sourceId: body.source_adset_id || body.source_campaign_id || "",
        clonedIds: [],
        status: "failed",
        request: body,
        response: {},
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      }).catch(() => undefined);
    }

    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status === 500 ? 400 : response.status });
  }
}
