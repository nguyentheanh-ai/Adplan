import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { requireOwnerRole } from "@/lib/admin/permissions";
import { loadRevenueReport, parseRevenueReportQuery } from "@/lib/revenue-report-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireOwnerRole();
    const session = await getAppSession();
    const query = parseRevenueReportQuery(request.url);
    const payload = await loadRevenueReport({ ...query, sessionToken: session?.accessToken });

    return NextResponse.json({ data: payload.report.orders, status: payload.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải đơn hàng.";
    const status = message.includes("đăng nhập") ? 401 : message.includes("quyền") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
