import { NextResponse } from "next/server";
import { recentHourlyRefreshRange, syncAdHourlyFacts } from "@/lib/ad-spend-sync.service";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAdHourlyFacts({
      clientId: "greezhub",
      adAccountId: "act_1255736315302940",
      dateRange: recentHourlyRefreshRange()
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Khong sync duoc ad hourly facts." }, { status: 500 });
  }
}
