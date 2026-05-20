import { NextResponse } from "next/server";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaAds, metaErrorResponse } from "@/lib/meta/facebook";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const accessToken = await requireFacebookProviderToken();
    const ads = await getMetaAds(url.searchParams.get("ad_account_id"), accessToken, url.searchParams.get("adset_id"));
    return NextResponse.json({ data: ads });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
