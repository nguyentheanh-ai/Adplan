import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { syncAdHourlyFacts } from "@/lib/ad-spend-sync.service";
import {
  buildTelegramAdsPeriodMessage,
  buildTelegramRevenuePeriodMessage,
  sendTelegramRevenueReport
} from "@/lib/telegram-revenue-report.service";
import { revenueReportTimeZone } from "@/lib/revenue-report";

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
    const today = DateTime.now().setZone(revenueReportTimeZone).toISODate();
    if (today) {
      try {
        await syncAdHourlyFacts({
          clientId: "greezhub",
          adAccountId: "act_1255736315302940",
          dateRange: { startDate: today, endDate: today }
        });
      } catch (error) {
        console.warn("Telegram revenue report spend sync failed", error);
      }
    }

    const [revenueMessage, adsMessage] = await Promise.all([
      buildTelegramRevenuePeriodMessage(["today"]),
      buildTelegramAdsPeriodMessage(["today"])
    ]);
    const message = `${revenueMessage}\n\n${adsMessage}`;
    await sendTelegramRevenueReport(message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Khong gui duoc Telegram revenue report." }, { status: 500 });
  }
}
