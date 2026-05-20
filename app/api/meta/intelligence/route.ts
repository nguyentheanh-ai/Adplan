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
          dataStatus = error instanceof Error ? error.message : "Không lấy được chi tiết tài khoản từ Meta API.";
        }

        try {
          rows = await getMetaAccountInsights(account.id, dateRange, accessToken);
        } catch (error) {
          dataStatus = error instanceof Error ? error.message : "Không lấy được chi tiêu tài khoản từ Meta API.";
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
          ads: []
        })
      });
    }

    const previousRange = getPreviousDateRange(dateRange);
    const selectedAccount = accountRows.find((account) => account.id === selectedId || account.account_id === selectedId.replace(/^act_/, "")) ?? null;
    const [campaigns, campaignInsights, daily, previousInsights, ads] = await Promise.all([
      getMetaCampaigns(selectedId, accessToken).catch(() => []),
      getMetaCampaignInsights(selectedId, dateRange, accessToken).catch(() => []),
      getMetaDailyInsights(selectedId, dateRange, accessToken).catch(() => []),
      getMetaCampaignInsights(selectedId, previousRange, accessToken).catch(() => []),
      getMetaAdsWithCreatives(selectedId, dateRange, accessToken).catch(() => [])
    ]);

    return NextResponse.json({
      data: buildMetaIntelligenceDashboardData({
        accounts: accountRows,
        selectedAccount,
        dateRange,
        campaigns,
        campaignInsights,
        daily,
        previousInsights,
        ads
      })
    });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
