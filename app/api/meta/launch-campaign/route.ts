import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth/session";
import {
  createAdOnMeta,
  createAdsetOnMeta,
  createCampaignOnMeta,
  createPostAdCreativeOnMeta,
  metaErrorResponse
} from "@/lib/meta/facebook";

const adSchema = z.object({
  name: z.string().trim().min(1),
  headline: z.string().optional(),
  primaryText: z.string().optional()
});

const adsetSchema = z.object({
  name: z.string().trim().min(1),
  ageRange: z.string().optional(),
  gender: z.string().optional(),
  ads: z.array(adSchema).min(1)
});

const launchSchema = z.object({
  ad_account_id: z.string().trim().min(3),
  page_id: z.string().trim().optional().nullable(),
  post_id: z.string().trim().optional().nullable(),
  campaign_draft: z.object({
    campaign: z.object({
      name: z.string().trim().min(1),
      objective: z.string().trim().min(1),
      budget: z.string().optional()
    }),
    adsets: z.array(adsetSchema).min(1)
  })
});

function extractDailyBudget(value?: string) {
  const numeric = String(value || "").replace(/[^\d]/g, "");
  return Number(numeric || 0);
}

function splitBudget(totalBudget: number, adsetCount: number) {
  if (!totalBudget) return "";
  return String(Math.max(1000, Math.floor(totalBudget / Math.max(1, adsetCount))));
}

function normalizeObjectStoryId(pageId?: string | null, postId?: string | null) {
  if (!postId) return "";
  if (postId.includes("_")) return postId;
  if (!pageId) return postId;
  return `${pageId}_${postId}`;
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  try {
    const body = launchSchema.parse(await request.json());
    const objectStoryId = normalizeObjectStoryId(body.page_id, body.post_id);
    if (!objectStoryId) {
      return NextResponse.json(
        {
          error:
            "Launch thật hiện cần một bài viết có sẵn trên Fanpage. Hãy chọn bài viết trước, hoặc lưu preview rồi bổ sung media trong Ads Manager."
        },
        { status: 400 }
      );
    }

    const campaign = await createCampaignOnMeta({
      adAccountId: body.ad_account_id,
      name: body.campaign_draft.campaign.name,
      objective: body.campaign_draft.campaign.objective,
      accessToken: session.accessToken
    });

    const totalBudget = extractDailyBudget(body.campaign_draft.campaign.budget);
    const adsetBudget = splitBudget(totalBudget, body.campaign_draft.adsets.length);
    const adsetResults: Array<{
      id: string;
      name: string;
      ads: Array<{ id?: string; name: string; creative_id?: string; error?: string }>;
    }> = [];

    for (const [adsetIndex, adsetDraft] of body.campaign_draft.adsets.entries()) {
      const adset = await createAdsetOnMeta({
        adAccountId: body.ad_account_id,
        campaignId: campaign.id,
        name: adsetDraft.name,
        dailyBudget: adsetBudget,
        ageRange: adsetDraft.ageRange,
        gender: adsetDraft.gender,
        accessToken: session.accessToken
      });

      const adResults: Array<{ id?: string; name: string; creative_id?: string; error?: string }> = [];
      for (const [adIndex, adDraft] of adsetDraft.ads.entries()) {
        try {
          const creative = await createPostAdCreativeOnMeta({
            adAccountId: body.ad_account_id,
            name: `${adDraft.name} - Creative`,
            objectStoryId,
            accessToken: session.accessToken
          });
          const ad = await createAdOnMeta({
            adAccountId: body.ad_account_id,
            adsetId: adset.id,
            name: adDraft.name,
            creativeId: creative.id,
            accessToken: session.accessToken
          });
          adResults.push({ id: ad.id, name: adDraft.name, creative_id: creative.id });
        } catch (error) {
          adResults.push({
            name: adDraft.name || `Ad ${adIndex + 1}`,
            error: error instanceof Error ? error.message : "Không tạo được quảng cáo này."
          });
        }
      }

      adsetResults.push({ id: adset.id, name: adsetDraft.name || `Nhóm ${adsetIndex + 1}`, ads: adResults });
    }

    const failedAds = adsetResults.flatMap((item) => item.ads.filter((ad) => ad.error));
    return NextResponse.json({
      data: {
        status: failedAds.length ? "partial_success" : "success",
        campaign: { id: campaign.id, name: body.campaign_draft.campaign.name, status: "PAUSED" },
        adsets: adsetResults,
        failed_ads: failedAds,
        note: failedAds.length
          ? "Campaign và nhóm quảng cáo đã tạo ở trạng thái PAUSED, nhưng có quảng cáo chưa tạo được."
          : "Đã tạo Campaign, Nhóm quảng cáo và Quảng cáo ở trạng thái PAUSED."
      }
    });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status === 500 ? 400 : response.status });
  }
}
