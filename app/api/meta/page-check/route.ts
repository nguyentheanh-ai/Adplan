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

    return NextResponse.json({
      data: {
        ok: true,
        page: sanitizeMetaPage(matched),
        message: "Tài khoản Facebook hiện tại có quyền với Fanpage này."
      }
    });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
