import { describe, expect, it, vi, beforeEach } from "vitest";

const sendTelegramMessage = vi.fn();
const buildTelegramRevenuePeriodMessage = vi.fn();
const buildTelegramAdsPeriodMessage = vi.fn();

vi.mock("@/lib/telegram-revenue-report.service", () => ({
  buildAdsMessage: vi.fn(() => "legacy ads"),
  buildDailyReport: vi.fn(async () => ({ date: "2026-06-15" })),
  buildDailyReportMessage: vi.fn(() => "legacy report"),
  buildProfitMessage: vi.fn(() => "legacy profit"),
  buildRevenueMessage: vi.fn(() => "legacy revenue"),
  buildTelegramRevenuePeriodMessage,
  buildTelegramAdsPeriodMessage,
  getAllowedChatIds: vi.fn(() => ["123"]),
  getTelegramCommandHelp: vi.fn(() => "/revenue today\n/ads today"),
  isChatIdAllowed: vi.fn((chatId: string) => chatId === "123"),
  sendTelegramMessage
}));

const { POST } = await import("./route");

function telegramRequest(text: string) {
  return new Request("https://adplan.theanhmarketing.com/api/telegram/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": "secret"
    },
    body: JSON.stringify({ message: { text, chat: { id: 123 } } })
  });
}

describe("Report_Biz Telegram webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_WEBHOOK_SECRET = "secret";
    buildTelegramRevenuePeriodMessage.mockResolvedValue("revenue period message");
    buildTelegramAdsPeriodMessage.mockResolvedValue("ads period message");
  });

  it("routes /revenue to the revenue report builder", async () => {
    const response = await POST(telegramRequest("/revenue month"));
    const body = await response.json();

    expect(body).toMatchObject({ ok: true, command: "revenue" });
    expect(buildTelegramRevenuePeriodMessage).toHaveBeenCalledWith(["month"]);
    expect(sendTelegramMessage).toHaveBeenCalledWith("123", "revenue period message");
  });

  it("routes /ads to the ads report builder", async () => {
    const response = await POST(telegramRequest("/ads 2026-06-01 2026-06-15"));
    const body = await response.json();

    expect(body).toMatchObject({ ok: true, command: "ads" });
    expect(buildTelegramAdsPeriodMessage).toHaveBeenCalledWith(["2026-06-01", "2026-06-15"]);
    expect(sendTelegramMessage).toHaveBeenCalledWith("123", "ads period message");
  });
});
