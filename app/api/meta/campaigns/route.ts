import { NextResponse } from "next/server";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaCampaigns, listCampaignsByDateRange, metaErrorResponse } from "@/lib/meta/facebook";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const accessToken = await requireFacebookProviderToken();
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const campaigns =
      startDate && endDate
        ? await listCampaignsByDateRange(url.searchParams.get("ad_account_id"), { startDate, endDate }, accessToken)
        : await getMetaCampaigns(url.searchParams.get("ad_account_id"), accessToken);
    return NextResponse.json({ data: campaigns });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
