import { NextResponse } from "next/server";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { metaErrorResponse, searchFacebookInterests } from "@/lib/meta/facebook";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const adAccountId = url.searchParams.get("ad_account_id");
    const query = url.searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({ error: "Thiếu từ khóa tìm kiếm." }, { status: 400 });
    }

    const accessToken = await requireFacebookProviderToken();
    const data = await searchFacebookInterests({ query, adAccountId, accessToken });

    return NextResponse.json({ data });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
