import { NextResponse } from "next/server";
import { buildAdsPostAnalysis } from "@/lib/ads-posts/analysis";
import { rankCreativePosts } from "@/lib/ads-posts/scoring";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { getMetaAdAccounts, getMetaAdsWithCreatives, metaErrorResponse } from "@/lib/meta/facebook";
import type { DateRange } from "@/lib/meta/types";
import { normalizeCreativePerformance } from "@/lib/reports/ads-report";

function pickDateRange(url: URL): DateRange {
  const endDate = url.searchParams.get("end_date") || new Date().toISOString().slice(0, 10);
  const startDate = url.searchParams.get("start_date") || endDate;
  return { startDate, endDate };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const accessToken = await requireFacebookProviderToken();
    const dateRange = pickDateRange(url);
    const baseAccounts = await getMetaAdAccounts(accessToken);
    const selectedId = url.searchParams.get("ad_account_id") || baseAccounts[0]?.id;

    if (!selectedId) return NextResponse.json({ error: "Chưa có tài khoản quảng cáo." }, { status: 404 });

    const ads = await getMetaAdsWithCreatives(selectedId, dateRange, accessToken);
    const { benchmark, posts } = rankCreativePosts(normalizeCreativePerformance(ads));
    const post = posts.find((item) => item.adId === decodeURIComponent(id) || item.postId === decodeURIComponent(id));

    if (!post) return NextResponse.json({ error: "Không tìm thấy post quảng cáo trong khoảng ngày đang xem." }, { status: 404 });

    return NextResponse.json({ data: buildAdsPostAnalysis(post, benchmark) });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
