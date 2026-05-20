import { NextResponse } from "next/server";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaManagedPageAccessToken, getMetaPagePosts, metaErrorResponse } from "@/lib/meta/facebook";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pageId = url.searchParams.get("page_id");
    if (!pageId) {
      return NextResponse.json({ error: "Thiếu page_id." }, { status: 400 });
    }

    const accessToken = await requireFacebookProviderToken();
    const pageAccessToken = await getMetaManagedPageAccessToken(pageId, accessToken);
    if (!pageAccessToken) {
      return NextResponse.json(
        { error: "Bạn chưa có quyền quản trị Page này hoặc Facebook chưa cấp quyền pages_show_list/pages_read_engagement." },
        { status: 403 }
      );
    }

    const posts = await getMetaPagePosts({ pageId, accessToken: pageAccessToken });
    return NextResponse.json({ data: posts });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
