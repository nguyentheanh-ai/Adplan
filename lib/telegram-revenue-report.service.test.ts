import { describe, expect, it, vi } from "vitest";
import { DateTime } from "luxon";

vi.mock("@/lib/ad-hourly-cache.service", () => ({
  getAdHourlyFactsForReport: vi.fn()
}));

vi.mock("@/lib/revenue-report-data", () => ({
  getRevenueData: vi.fn()
}));

const { buildRevenueWindowSnapshot, formatTelegramRevenueMessage, getTelegramRevenueWindow } = await import(
  "@/lib/telegram-revenue-report.service"
);

describe("telegram revenue report", () => {
  it("uses 00:00-09:59 Vietnam window for the morning report", () => {
    const window = getTelegramRevenueWindow(DateTime.fromISO("2026-06-08T09:00:00+07:00"));
    expect(window).toMatchObject({ localDate: "2026-06-08", startHour: 0, endHour: 10, label: "00:00-09:59" });
  });

  it("uses 00:00-17:59 Vietnam window for the afternoon day report", () => {
    const window = getTelegramRevenueWindow(DateTime.fromISO("2026-06-08T17:00:00+07:00"));
    expect(window).toMatchObject({ localDate: "2026-06-08", startHour: 0, endHour: 18, label: "00:00-17:59" });
  });

  it("aggregates revenue and spend by the same Vietnam local hours", () => {
    const window = getTelegramRevenueWindow(DateTime.fromISO("2026-06-08T17:00:00+07:00"));
    const snapshot = buildRevenueWindowSnapshot({
      window,
      orders: [
        {
          sourceSite: "theanhmarketing",
          customerName: "A",
          customerEmail: "a@example.com",
          phone: "",
          productName: "FBA",
          productCode: "FBA",
          amount: 799000,
          paymentMethod: "manual-admin",
          paymentStatus: "paid",
          createdAt: "2026-06-08T10:00:00+07:00",
          paidAt: "2026-06-08T12:15:00+07:00",
          orderId: "O1"
        },
        {
          sourceSite: "theanhmarketing",
          customerName: "B",
          customerEmail: "b@example.com",
          phone: "",
          productName: "FBA",
          productCode: "FBA",
          amount: 399000,
          paymentStatus: "pending",
          createdAt: "2026-06-08T16:10:00+07:00",
          paidAt: null,
          orderId: "O2"
        }
      ],
      registrations: [{ sourceSite: "theanhmarketing", productCode: "FBA", createdAt: "2026-06-08T13:00:00+07:00", id: "L1" }],
      adHourlyFacts: [
        {
          clientId: "greezhub",
          adAccountId: "act_1255736315302940",
          localDate: "2026-06-08",
          localHour: 13,
          localStartAt: "2026-06-08T13:00:00+07:00",
          localEndAt: "2026-06-08T13:59:59+07:00",
          metaDate: "2026-06-07",
          metaHour: 23,
          spend: 100000,
          impressions: 0,
          reach: 0,
          clicks: 20,
          ctr: 0,
          cpc: 0,
          leads: 2,
          messages: 0,
          dataStatus: "final",
          rawJson: {}
        }
      ]
    });

    expect(snapshot.revenue).toBe(799000);
    expect(snapshot.pendingOrders).toBe(1);
    expect(snapshot.registrations).toBe(1);
    expect(snapshot.spend).toBe(100000);
    expect(snapshot.spendStatus).toBe("final");
    expect(formatTelegramRevenueMessage(snapshot)).toContain("Doanh thu:");
    expect(formatTelegramRevenueMessage(snapshot)).toContain("Chi ph\u00ed");
  });
});

describe("Report_Biz two-report commands", () => {
  it("parses today, week, month and custom date ranges for Report_Biz commands", async () => {
    const { parseTelegramAdsReportPeriod, parseTelegramReportPeriod } = await import("@/lib/telegram-revenue-report.service");
    const now = DateTime.fromISO("2026-06-15T12:17:00+07:00");

    expect(parseTelegramReportPeriod(["today"], now)).toMatchObject({
      label: "h\u00f4m nay",
      dateRange: { startDate: "2026-06-15", endDate: "2026-06-15" },
      groupBy: "day"
    });
    expect(parseTelegramReportPeriod(["week"], now)).toMatchObject({
      label: "tu\u1ea7n n\u00e0y",
      dateRange: { startDate: "2026-06-15", endDate: "2026-06-15" },
      groupBy: "day"
    });
    expect(parseTelegramReportPeriod(["month"], now)).toMatchObject({
      label: "th\u00e1ng n\u00e0y",
      dateRange: { startDate: "2026-06-01", endDate: "2026-06-15" },
      groupBy: "week"
    });
    expect(parseTelegramAdsReportPeriod(["month"], now)).toMatchObject({
      label: "th\u00e1ng n\u00e0y",
      dateRange: { startDate: "2026-06-01", endDate: "2026-06-14" },
      groupBy: "week"
    });
    expect(parseTelegramReportPeriod(["2026-06-01", "2026-06-15"], now)).toMatchObject({
      label: "01/06/2026-15/06/2026",
      dateRange: { startDate: "2026-06-01", endDate: "2026-06-15" },
      groupBy: "week"
    });
  });

  it("formats the revenue report separately from the ads report", async () => {
    const { buildTelegramAdsReportFromData, buildTelegramRevenueReportFromData, formatTelegramAdsPeriodMessage, formatTelegramRevenuePeriodMessage, parseTelegramReportPeriod } =
      await import("@/lib/telegram-revenue-report.service");
    const period = parseTelegramReportPeriod(["2026-06-01", "2026-06-15"], DateTime.fromISO("2026-06-15T12:17:00+07:00"));
    const orders = [
      {
        sourceSite: "theanhmarketing" as const,
        customerName: "Paid",
        customerEmail: "paid@example.com",
        phone: "0900000001",
        productName: "Facebook Ads Master 2026",
        productCode: "FBA",
        amount: 799000,
        paymentMethod: "sepay",
        paymentStatus: "paid",
        createdAt: "2026-06-14T03:00:00.000Z",
        paidAt: "2026-06-14T03:05:00.000Z",
        sepayTransactionId: "61900001",
        sepayReferenceCode: "FT26160000000001",
        hasSepayPayload: true,
        orderId: "TAMPAID"
      },
      {
        sourceSite: "theanhmarketing" as const,
        customerName: "Pending",
        customerEmail: "pending@example.com",
        phone: "0900000002",
        productName: "Facebook Ads Master 2026",
        productCode: "FBA",
        amount: 399000,
        paymentMethod: "sepay",
        paymentStatus: "pending",
        createdAt: "2026-06-15T03:00:00.000Z",
        paidAt: null,
        orderId: "TAMPENDING"
      }
    ];
    const registrations = [
      { sourceSite: "theanhmarketing" as const, productCode: "FBA", createdAt: "2026-06-14T02:00:00.000Z", id: "lead-1" },
      { sourceSite: "theanhmarketing" as const, productCode: "FBA", createdAt: "2026-06-15T02:00:00.000Z", id: "lead-2" }
    ];
    const adHourlyFacts = [
      {
        clientId: "greezhub",
        adAccountId: "act_1255736315302940",
        localDate: "2026-06-14",
        localHour: 10,
        localStartAt: "2026-06-14T10:00:00+07:00",
        localEndAt: "2026-06-14T10:59:59+07:00",
        metaDate: "2026-06-13",
        metaHour: 20,
        spend: 160901,
        impressions: 1000,
        reach: 700,
        clicks: 40,
        ctr: 4,
        cpc: 4022.525,
        leads: 6,
        messages: 0,
        dataStatus: "final" as const,
        rawJson: {}
      }
    ];

    const revenueMessage = formatTelegramRevenuePeriodMessage(
      buildTelegramRevenueReportFromData({ period, orders, registrations, adHourlyFacts })
    );
    const adsMessage = formatTelegramAdsPeriodMessage(
      buildTelegramAdsReportFromData({ period, orders, registrations, adHourlyFacts })
    );

    expect(revenueMessage).toContain("B\u00e1o c\u00e1o doanh thu");
    expect(revenueMessage).toContain("Doanh thu x\u00e1c minh: 799.000\u0111");
    expect(revenueMessage).toContain("Pending/ch\u01b0a thanh to\u00e1n: 1");
    expect(revenueMessage).toContain("D\u00f2ng ti\u1ec1n ti\u1ec1m n\u0103ng: 1.198.000\u0111");
    expect(revenueMessage).not.toContain("Chi ph\u00ed Ads");

    expect(adsMessage).toContain("B\u00e1o c\u00e1o qu\u1ea3ng c\u00e1o");
    expect(adsMessage).toContain("Chi ph\u00ed Ads: 160.901\u0111");
    expect(adsMessage).toContain("ROAS: 4.97");
    expect(adsMessage).toContain("L\u00e3i/l\u1ed7 t\u1ea1m t\u00ednh: 638.099\u0111");
  });

  it("makes incomplete ad spend impossible to read as final profit", async () => {
    const { buildTelegramAdsReportFromData, formatTelegramAdsPeriodMessage, parseTelegramReportPeriod } =
      await import("@/lib/telegram-revenue-report.service");
    const period = parseTelegramReportPeriod(["2026-06-01", "2026-06-02"], DateTime.fromISO("2026-06-15T12:17:00+07:00"));
    const report = buildTelegramAdsReportFromData({
      period,
      orders: [],
      registrations: [],
      adHourlyFacts: [
        {
          clientId: "greezhub",
          adAccountId: "act_1255736315302940",
          localDate: "2026-06-01",
          localHour: 0,
          localStartAt: "2026-06-01T00:00:00+07:00",
          localEndAt: "2026-06-01T00:59:59+07:00",
          metaDate: "",
          metaHour: 0,
          spend: 0,
          impressions: 0,
          reach: 0,
          clicks: 0,
          ctr: 0,
          cpc: 0,
          leads: 0,
          messages: 0,
          dataStatus: "missing" as const,
          rawJson: {}
        },
        {
          clientId: "greezhub",
          adAccountId: "act_1255736315302940",
          localDate: "2026-06-02",
          localHour: 0,
          localStartAt: "2026-06-02T00:00:00+07:00",
          localEndAt: "2026-06-02T00:59:59+07:00",
          metaDate: "2026-06-01",
          metaHour: 10,
          spend: 100000,
          impressions: 1000,
          reach: 700,
          clicks: 40,
          ctr: 4,
          cpc: 2500,
          leads: 6,
          messages: 0,
          dataStatus: "final" as const,
          rawJson: {}
        }
      ]
    });

    const message = formatTelegramAdsPeriodMessage(report);

    expect(message).toContain("Chi ph\u00ed Ads: 100.000\u0111 (ch\u01b0a \u0111\u1ee7 d\u1eef li\u1ec7u)");
    expect(message).toContain("Thi\u1ebfu d\u1eef li\u1ec7u Ads: 01/06/2026");
    expect(message).toContain("ROAS t\u1ea1m t\u00ednh theo cache hi\u1ec7n c\u00f3:");
    expect(message).toContain("Kh\u00f4ng k\u1ebft lu\u1eadn ROAS/l\u00e3i l\u1ed7 cho \u0111\u1ebfn khi backfill xong.");
  });
});
