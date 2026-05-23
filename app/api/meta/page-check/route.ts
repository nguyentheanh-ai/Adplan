import { NextResponse } from "next/server";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaManagedPages, metaErrorResponse, sanitizeMetaPage } from "@/lib/meta/facebook";

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?facebook\.com\//, "")
    .replace(/^pages\//, "")
    .replace(/\/$/, "")
    .split("?")[0];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pageUrl = url.searchParams.get("url") || "";
    if (!pageUrl.trim()) {
      return NextResponse.json({ error: "Thiếu link fanpage." }, { status: 400 });
    }

    const accessToken = await requireFacebookProviderToken();
    const pages = await getMetaManagedPages(accessToken);
    const target = normalize(pageUrl);
    const matched = pages.find((page) => {
      const normalizedName = normalize(page.name.replace(/\s+/g, ""));
      return page.id === target || target.includes(page.id) || target.includes(normalizedName);
    });

    if (!matched) {
      return NextResponse.json({
        data: {
          ok: false,
          message: "Không tìm thấy Page này trong danh sách Fanpage bạn quản trị. Hãy kiểm tra quyền Page hoặc đăng nhập đúng tài khoản Facebook."
        }
      });
    }

    const hasPageAccessToken = Boolean(matched.access_token);

    return NextResponse.json({
      data: {
        ok: hasPageAccessToken,
        page: sanitizeMetaPage(matched),
        message: hasPageAccessToken
          ? "Tài khoản Facebook hiện tại có quyền đăng với Fanpage này."
          : "Tài khoản Facebook thấy được Fanpage này, nhưng Facebook chưa trả Page Access Token. Hãy kết nối lại Facebook, cấp pages_manage_posts và kiểm tra quyền quản trị/content task trên Page."
      }
    });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
