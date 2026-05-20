import { NextResponse } from "next/server";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaAdAccounts, metaErrorResponse } from "@/lib/meta/facebook";

export async function GET() {
  try {
    const accessToken = await requireFacebookProviderToken();
    const accounts = await getMetaAdAccounts(accessToken);
    return NextResponse.json({ data: accounts });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
