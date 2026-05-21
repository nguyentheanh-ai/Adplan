import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth/session";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import {
  cloneMetaObject,
  createAdsetFromSourceOnMeta,
  createCampaignOnMeta,
  getMetaAdsets,
  getMetaCampaigns,
  metaErrorResponse,
  updateMetaBudget
} from "@/lib/meta/facebook";
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

async function cloneCampaignWithAdsets({
  adAccountId,
  sourceCampaignId,
  quantity,
  newBudget,
  accessToken
}: {
  adAccountId: string;
  sourceCampaignId: string;
  quantity: number;
  newBudget?: string;
  accessToken: string;
}) {
  const campaigns = await getMetaCampaigns(adAccountId, accessToken);
  const sourceCampaign = campaigns.find((campaign) => campaign.id === sourceCampaignId);
  if (!sourceCampaign) {
    throw new Error("Không tìm thấy campaign nguồn hoặc token không có quyền đọc campaign này.");
  }

  const sourceAdsets = await getMetaAdsets(adAccountId, accessToken, sourceCampaignId);
  if (!sourceAdsets.length) {
    throw new Error("Campaign nguồn không có nhóm quảng cáo hoặc token thiếu quyền đọc adset.");
  }

  const results: Array<{ id: string; copied_campaign_id: string; adsets: Array<{ id: string; source_adset_id: string }> }> = [];
  for (let index = 0; index < quantity; index += 1) {
    const campaign = await createCampaignOnMeta({
      adAccountId,
      name: `${sourceCampaign.name} - Bản sao ${index + 1}`,
      objective: sourceCampaign.objective || "OUTCOME_ENGAGEMENT",
      accessToken
    });
    const adsets = [];
    for (const sourceAdset of sourceAdsets) {
      const adset = await createAdsetFromSourceOnMeta({
        adAccountId,
        campaignId: campaign.id,
        sourceAdset,
        name: `${sourceAdset.name} - Bản sao ${index + 1}`,
        dailyBudget: newBudget,
        accessToken
      });
      adsets.push({ id: adset.id, source_adset_id: sourceAdset.id });
    }
    results.push({ id: campaign.id, copied_campaign_id: campaign.id, adsets });
  }

  return results;
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
    const result = body.action === "clone_campaign"
      ? await cloneCampaignWithAdsets({
          adAccountId: body.ad_account_id,
          sourceCampaignId: sourceId,
          quantity: body.quantity,
          newBudget: body.new_budget,
          accessToken
        })
      : await cloneMetaObject({ sourceId, sourceType, quantity: body.quantity, accessToken });
    const clonedIds = result
      .map((item) => {
        const row = item as Record<string, unknown>;
        return String(row.id || row.copied_campaign_id || row.copied_adset_id || "");
      })
      .filter(Boolean);
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
