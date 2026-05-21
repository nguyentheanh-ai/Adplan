import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { metaErrorResponse } from "@/lib/meta/facebook";
import { defaultMetaSyncRange, isMissingMetaSyncTable, syncMetaInsightsForUser } from "@/lib/meta/sync-insights";

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      start_date?: string;
      end_date?: string;
      ad_account_ids?: string[];
    };
    const fallbackRange = defaultMetaSyncRange();
    const accessToken = await requireFacebookProviderToken();
    const data = await syncMetaInsightsForUser({
      userId: session.userId,
      accessToken,
      range: {
        startDate: body.start_date || fallbackRange.startDate,
        endDate: body.end_date || fallbackRange.endDate
      },
      adAccountIds: body.ad_account_ids
    });

    return NextResponse.json({ data });
  } catch (error) {
    if (isMissingMetaSyncTable(error as { message?: string; code?: string })) {
      return NextResponse.json(
        {
          error: "Chưa có bảng lưu dữ liệu Meta. Hãy chạy migration 202605210004_create_meta_optimization_tables.sql.",
          storage: "missing_schema"
        },
        { status: 500 }
      );
    }

    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status === 500 ? 400 : response.status });
  }
}
