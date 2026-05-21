import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth/session";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { cloneAdsForAdsetWithDiagnostics } from "@/lib/meta/scale-clone";
import {
  createAdsetFromSourceOnMeta,
  createCampaignOnMeta,
  getMetaAdsets,
  getMetaCampaigns,
  metaErrorResponse,
  updateMetaBudget
} from "@/lib/meta/facebook";
import type { AdSet } from "@/lib/meta/types";
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

function getMetaAppConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Thiếu META_APP_ID hoặc META_APP_SECRET để kiểm tra token và nhân bản quảng cáo.");
  }
  return { appId, appSecret };
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

  let sourceAdsets: AdSet[];
  try {
    sourceAdsets = await getMetaAdsets(adAccountId, accessToken, sourceCampaignId);
  } catch (error) {
    const response = metaErrorResponse(error);
    throw new Error(`Không đọc được nhóm quảng cáo của campaign nguồn: ${response.body.error || "thiếu quyền đọc adset."}`);
  }
  if (!sourceAdsets.length) {
    throw new Error("Campaign nguồn không có nhóm quảng cáo hoặc token thiếu quyền đọc adset.");
  }

  const results: Array<{
    id: string;
    copied_campaign_id: string;
    adsets: Array<{ id: string; source_adset_id: string; ads: Array<{ id?: string; source_ad_id: string; error?: string }> }>;
    warnings: string[];
  }> = [];
  for (let index = 0; index < quantity; index += 1) {
    const warnings: string[] = [];
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
      const ads = await cloneAdsForAdset({
        adAccountId,
        sourceAdset,
        targetAdsetId: adset.id,
        copyIndex: index,
        accessToken
      });
      ads.filter((item) => item.error).forEach((item) => warnings.push(`Ads ${item.source_ad_id}: ${item.error}`));
      adsets.push({ id: adset.id, source_adset_id: sourceAdset.id, ads });
    }
    results.push({ id: campaign.id, copied_campaign_id: campaign.id, adsets, warnings });
  }

  return results;
}

async function cloneAdsForAdset({
  adAccountId,
  sourceAdset,
  targetAdsetId,
  copyIndex: _copyIndex,
  accessToken
}: {
  adAccountId: string;
  sourceAdset: AdSet;
  targetAdsetId: string;
  copyIndex: number;
  accessToken: string;
}) {
  const { appId, appSecret } = getMetaAppConfig();
  return cloneAdsForAdsetWithDiagnostics({
    adAccountId,
    sourceAdsetId: sourceAdset.id,
    targetAdsetId,
    accessToken,
    appId,
    appSecret
  });
}

async function cloneAdsetWithAds({
  adAccountId,
  sourceAdsetId,
  quantity,
  newBudget,
  accessToken
}: {
  adAccountId: string;
  sourceAdsetId: string;
  quantity: number;
  newBudget?: string;
  accessToken: string;
}) {
  let adsets: AdSet[];
  try {
    adsets = await getMetaAdsets(adAccountId, accessToken);
  } catch (error) {
    const response = metaErrorResponse(error);
    throw new Error(`Không đọc được danh sách nhóm quảng cáo: ${response.body.error || "thiếu quyền đọc adset."}`);
  }
  const sourceAdset = adsets.find((adset) => adset.id === sourceAdsetId);
  if (!sourceAdset) {
    throw new Error("Không tìm thấy nhóm quảng cáo nguồn hoặc token không có quyền đọc adset này.");
  }
  if (!sourceAdset.campaign_id) {
    throw new Error("Không đọc được campaign_id của nhóm quảng cáo nguồn nên chưa thể nhân bản.");
  }

  const results: Array<{
    id: string;
    copied_adset_id: string;
    ads: Array<{ id?: string; source_ad_id: string; error?: string }>;
    warnings: string[];
  }> = [];
  for (let index = 0; index < quantity; index += 1) {
    const adset = await createAdsetFromSourceOnMeta({
      adAccountId,
      campaignId: sourceAdset.campaign_id,
      sourceAdset,
      name: `${sourceAdset.name} - Bản sao ${index + 1}`,
      dailyBudget: newBudget,
      accessToken
    });
    const ads = await cloneAdsForAdset({
      adAccountId,
      sourceAdset,
      targetAdsetId: adset.id,
      copyIndex: index,
      accessToken
    });
    results.push({
      id: adset.id,
      copied_adset_id: adset.id,
      ads,
      warnings: ads.filter((item) => item.error).map((item) => `Ads ${item.source_ad_id}: ${item.error}`)
    });
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
      : await cloneAdsetWithAds({
          adAccountId: body.ad_account_id,
          sourceAdsetId: sourceId,
          quantity: body.quantity,
          newBudget: body.new_budget,
          accessToken
        });
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

