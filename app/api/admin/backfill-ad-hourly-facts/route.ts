import { NextResponse } from "next/server";
import { requireOwnerRole } from "@/lib/admin/permissions";
import { getAppSession } from "@/lib/auth/session";
import { syncAdHourlyFacts } from "@/lib/ad-spend-sync.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireOwnerRole();
    const session = await getAppSession();
    const body = await request.json().catch(() => ({}));
    const clientId = String(body.clientId || "").trim();
    const adAccountId = String(body.adAccountId || "act_1255736315302940").trim();
    const fromDate = String(body.fromDate || "").trim();
    const toDate = String(body.toDate || "").trim();

    if (!clientId || !adAccountId || !fromDate || !toDate) {
      return NextResponse.json({ error: "Thieu clientId, adAccountId, fromDate hoac toDate." }, { status: 400 });
    }

    const result = await syncAdHourlyFacts({
      clientId,
      adAccountId,
      dateRange: { startDate: fromDate, endDate: toDate },
      sessionToken: session?.accessToken
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Khong backfill duoc ad hourly facts.";
    const status = message.includes("quyen") ? 403 : message.includes("dang nhap") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
