import { NextResponse } from "next/server";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaAdsets, metaErrorResponse } from "@/lib/meta/facebook";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const accessToken = await requireFacebookProviderToken();
    const adsets = await getMetaAdsets(url.searchParams.get("ad_account_id"), accessToken, url.searchParams.get("campaign_id"));
    return NextResponse.json({ data: adsets });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
