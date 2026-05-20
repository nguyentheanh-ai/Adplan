import { NextResponse } from "next/server";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import {
  getMetaAdAccounts,
  getMetaCampaignInsights,
  getMetaCampaigns,
  getMetaDailyInsights,
  metaErrorResponse
} from "@/lib/meta/facebook";
import { buildAdsReport } from "@/lib/reports/ads-report";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const adAccountId = url.searchParams.get("ad_account_id");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Thiếu khoảng thời gian báo cáo." }, { status: 400 });
    }

    const accessToken = await requireFacebookProviderToken();
    const [accounts, campaigns, campaignInsights, dailyInsights] = await Promise.all([
      getMetaAdAccounts(accessToken),
      getMetaCampaigns(adAccountId, accessToken),
      getMetaCampaignInsights(adAccountId, { startDate, endDate }, accessToken),
      getMetaDailyInsights(adAccountId, { startDate, endDate }, accessToken)
    ]);
    const account = accounts.find((item) => item.id === adAccountId || item.account_id === adAccountId?.replace(/^act_/, "")) ?? null;

    return NextResponse.json({
      data: buildAdsReport({
        account,
        campaigns,
        insights: campaignInsights,
        daily: dailyInsights,
        startDate,
        endDate
      })
    });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
