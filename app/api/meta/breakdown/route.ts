import { NextResponse } from "next/server";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaBreakdownInsights, metaErrorResponse } from "@/lib/meta/facebook";
import type { BreakdownType } from "@/lib/meta/types";

const supportedBreakdowns: BreakdownType[] = ["age", "gender", "placement"];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const adAccountId = url.searchParams.get("ad_account_id");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const breakdown = url.searchParams.get("breakdown") as BreakdownType | null;

    if (!startDate || !endDate || !breakdown || !supportedBreakdowns.includes(breakdown)) {
      return NextResponse.json({ error: "Thiếu thông tin breakdown hoặc khoảng thời gian." }, { status: 400 });
    }

    const accessToken = await requireFacebookProviderToken();
    const data = await getMetaBreakdownInsights({
      adAccountId,
      dateRange: { startDate, endDate },
      breakdown,
      accessToken
    });

    return NextResponse.json({ data });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
