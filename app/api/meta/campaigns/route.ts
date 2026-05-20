import { NextResponse } from "next/server";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaCampaigns, metaErrorResponse } from "@/lib/meta/facebook";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const accessToken = await requireFacebookProviderToken();
    const campaigns = await getMetaCampaigns(url.searchParams.get("ad_account_id"), accessToken);
    return NextResponse.json({ data: campaigns });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
