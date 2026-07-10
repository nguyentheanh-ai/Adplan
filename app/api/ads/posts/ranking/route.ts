import { NextResponse } from "next/server";
import { rankCreativePosts } from "@/lib/ads-posts/scoring";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaAdAccountDetails, getMetaAdAccounts, getMetaAdsWithCreatives, getMetaAccountInsights, metaErrorResponse } from "@/lib/meta/facebook";
import type { AccountInsight, DateRange } from "@/lib/meta/types";
import { buildAccountOverviewRow } from "@/lib/reports/meta-intelligence";
import { normalizeCreativePerformance } from "@/lib/reports/ads-report";

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

    const accounts = await Promise.all(
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
          dataStatus = error instanceof Error ? error.message : "Không lấy được insight tài khoản từ Meta API.";
        }

        return buildAccountOverviewRow({ ...account, ...detail }, rows, dataStatus);
      })
    );

    const selectedAccount =
      accounts.find((account) => selectedId && (account.id === selectedId || account.account_id === selectedId.replace(/^act_/, ""))) ?? null;

    if (!selectedId) {
      const { benchmark, posts } = rankCreativePosts([]);
      return NextResponse.json({ data: { accounts, selectedAccount: null, dateRange, benchmark, posts } });
    }

    let warning: string | undefined;
    const ads = await getMetaAdsWithCreatives(selectedId, dateRange, accessToken).catch((error) => {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      warning = message.includes("permission")
        ? "Tài khoản chưa đủ quyền xem creative/post quảng cáo. Cần ads_read và quyền Page liên quan."
        : "Không tải được creative/post quảng cáo từ Meta API.";
      return [];
    });
    const { benchmark, posts } = rankCreativePosts(normalizeCreativePerformance(ads));

    return NextResponse.json({ data: { accounts, selectedAccount, dateRange, benchmark, posts, warning } });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
