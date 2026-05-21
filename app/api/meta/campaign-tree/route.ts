import { NextResponse } from "next/server";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaAds, getMetaAdsets, getMetaCampaigns, metaErrorResponse } from "@/lib/meta/facebook";
import type { AdSet } from "@/lib/meta/types";

type TreeError = {
  layer: "campaign" | "adsets" | "ads";
  object_id?: string;
  object_name?: string;
  message: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const adAccountId = url.searchParams.get("ad_account_id");
  const campaignId = url.searchParams.get("campaign_id");

  if (!adAccountId || !campaignId) {
    return NextResponse.json({ error: "Thiếu tài khoản quảng cáo hoặc campaign nguồn." }, { status: 400 });
  }

  try {
    const accessToken = await requireFacebookProviderToken();
    const errors: TreeError[] = [];
    const campaigns = await getMetaCampaigns(adAccountId, accessToken);
    const campaign = campaigns.find((item) => item.id === campaignId);

    if (!campaign) {
      return NextResponse.json(
        {
          error: "Không đọc được campaign nguồn. Có thể token thiếu quyền với tài khoản quảng cáo này hoặc campaign không còn tồn tại.",
          data: null
        },
        { status: 404 }
      );
    }

    let adsets: AdSet[] = [];
    try {
      adsets = await getMetaAdsets(adAccountId, accessToken, campaignId);
    } catch (error) {
      const response = metaErrorResponse(error);
      errors.push({ layer: "adsets", message: response.body.error || "Không đọc được nhóm quảng cáo." });
    }

    const adsByAdset: Record<string, Awaited<ReturnType<typeof getMetaAds>>> = {};
    for (const adset of adsets) {
      try {
        adsByAdset[adset.id] = await getMetaAds(adAccountId, accessToken, adset.id);
      } catch (error) {
        const response = metaErrorResponse(error);
        errors.push({
          layer: "ads",
          object_id: adset.id,
          object_name: adset.name,
          message: response.body.error || "Không đọc được quảng cáo trong nhóm này."
        });
        adsByAdset[adset.id] = [];
      }
    }

    return NextResponse.json({
      data: {
        campaign,
        adsets,
        ads_by_adset: adsByAdset,
        errors
      }
    });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
