import { describe, expect, it, vi, beforeEach } from "vitest";

const syncAdHourlyFacts = vi.fn();
const buildTelegramRevenuePeriodMessage = vi.fn();
const buildTelegramAdsPeriodMessage = vi.fn();
const sendTelegramRevenueReport = vi.fn();

vi.mock("@/lib/ad-spend-sync.service", () => ({
  syncAdHourlyFacts
}));

vi.mock("@/lib/telegram-revenue-report.service", () => ({
  buildCurrentTelegramRevenueMessage: vi.fn(async () => "legacy report"),
  buildTelegramRevenuePeriodMessage,
  buildTelegramAdsPeriodMessage,
  sendTelegramRevenueReport
}));

const { GET } = await import("./route");

describe("Report_Biz scheduled Telegram report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "secret";
    syncAdHourlyFacts.mockResolvedValue({ count: 24 });
    buildTelegramRevenuePeriodMessage.mockResolvedValue("revenue report");
    buildTelegramAdsPeriodMessage.mockResolvedValue("ads report");
  });

  it("sends the two Report_Biz sections in one scheduled Telegram message", async () => {
    const response = await GET(
      new Request("https://adplan.theanhmarketing.com/api/cron/revenue-telegram-report", {
        headers: { authorization: "Bearer secret" }
      })
    );
    const body = await response.json();

    expect(body).toEqual({ ok: true });
    expect(buildTelegramRevenuePeriodMessage).toHaveBeenCalledWith(["today"]);
    expect(buildTelegramAdsPeriodMessage).toHaveBeenCalledWith(["today"]);
    expect(sendTelegramRevenueReport).toHaveBeenCalledWith("revenue report\n\nads report");
  });
});
