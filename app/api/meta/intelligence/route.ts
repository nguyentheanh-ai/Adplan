import { NextResponse } from "next/server";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import {
  getMetaAccountInsights,
  getMetaAdAccountDetails,
  getMetaAdAccounts,
  getMetaAdsWithCreatives,
  getMetaCampaignInsights,
  getMetaCampaigns,
  getMetaDailyInsights,
  metaErrorResponse
} from "@/lib/meta/facebook";
import { buildAccountOverviewRow, buildMetaIntelligenceDashboardData, getPreviousDateRange } from "@/lib/reports/meta-intelligence";
import type { AccountInsight, DateRange } from "@/lib/meta/types";

function pickDateRange(url: URL): DateRange {
  const endDate = url.searchParams.get("end_date") || new Date().toISOString().slice(0, 10);
  const startDate = url.searchParams.get("start_date") || endDate;
  return { startDate, endDate };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const accessToken = await requireFacebookProviderToken();
    const dateRange = pickDateRange(url);
    const adAccountId = url.searchParams.get("ad_account_id");
    const baseAccounts = await getMetaAdAccounts(accessToken);
    const selectedId = adAccountId || baseAccounts[0]?.id;

    const accountRows = await Promise.all(
      baseAccounts.map(async (account) => {
        let detail = account;
        let rows: AccountInsight[] = [];
        let dataStatus: string | undefined;

        try {
          detail = await getMetaAdAccountDetails(account.id, accessToken);
        } catch (error) {
          dataStatus = error instanceof Error ? error.message : "KhÃ´ng láº¥y Ä‘Æ°á»£c chi tiáº¿t tÃ i khoáº£n tá»« Meta API.";
        }

        try {
          rows = await getMetaAccountInsights(account.id, dateRange, accessToken);
        } catch (error) {
          dataStatus = error instanceof Error ? error.message : "KhÃ´ng láº¥y Ä‘Æ°á»£c chi tiÃªu tÃ i khoáº£n tá»« Meta API.";
        }

        return buildAccountOverviewRow({ ...account, ...detail }, rows, dataStatus);
      })
    );

    if (!selectedId) {
      return NextResponse.json({
        data: buildMetaIntelligenceDashboardData({
          accounts: accountRows,
          selectedAccount: null,
          dateRange,
          campaigns: [],
          campaignInsights: [],
          daily: [],
          previousInsights: [],
          ads: [],
          creativeAccessWarning: undefined
        })
      });
    }

    const previousRange = getPreviousDateRange(dateRange);
    const selectedAccount = accountRows.find((account) => account.id === selectedId || account.account_id === selectedId.replace(/^act_/, "")) ?? null;
    let creativeAccessWarning: string | undefined;
    const [campaigns, campaignInsights, daily, previousInsights] = await Promise.all([
      getMetaCampaigns(selectedId, accessToken).catch(() => []),
      getMetaCampaignInsights(selectedId, dateRange, accessToken).catch(() => []),
      getMetaDailyInsights(selectedId, dateRange, accessToken).catch(() => []),
      getMetaCampaignInsights(selectedId, previousRange, accessToken).catch(() => [])
    ]);
    const ads = await getMetaAdsWithCreatives(selectedId, dateRange, accessToken).catch((error) => {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("pages_read_engagement") || message.includes("permission") || message.includes("page")) {
        creativeAccessWarning =
          "TÃ i khoáº£n nÃ y chÆ°a cÃ³ quyá»n xem post/creative cá»§a Page. Cáº§n quyá»n quáº£n trá»‹ Page hoáº·c pages_read_engagement Ä‘á»ƒ xem Ä‘áº§y Ä‘á»§ ná»™i dung post.";
      } else {
        creativeAccessWarning = "KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u post/creative tá»« Meta API á»Ÿ tÃ i khoáº£n nÃ y.";
      }
      return [];
    });

    return NextResponse.json({
      data: buildMetaIntelligenceDashboardData({
        accounts: accountRows,
        selectedAccount,
        dateRange,
        campaigns,
        campaignInsights,
        daily,
        previousInsights,
        ads,
        creativeAccessWarning
      })
    });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

