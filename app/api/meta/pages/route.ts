import { NextResponse } from "next/server";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaManagedPages, metaErrorResponse, sanitizeMetaPage } from "@/lib/meta/facebook";

export async function GET() {
  try {
    const accessToken = await requireFacebookProviderToken();
    const pages = await getMetaManagedPages(accessToken);
    return NextResponse.json({ data: pages.map(sanitizeMetaPage) });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
