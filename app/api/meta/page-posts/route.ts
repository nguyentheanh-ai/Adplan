import { NextResponse } from "next/server";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaPagePosts, metaErrorResponse } from "@/lib/meta/facebook";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pageId = url.searchParams.get("page_id");
    if (!pageId) {
      return NextResponse.json({ error: "Thiếu page_id." }, { status: 400 });
    }

    const accessToken = await requireFacebookProviderToken();
    const posts = await getMetaPagePosts({ pageId, accessToken });
    return NextResponse.json({ data: posts });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
