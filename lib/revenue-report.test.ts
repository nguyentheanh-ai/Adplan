import { describe, expect, it } from "vitest";
import {
  buildRevenueReport,
  normalizePaymentStatus,
  parseCampaignConvention,
  revenueReportDateKey,
  resolveRevenueReportAdAccountId,
  resolveRevenueReportMetaAccessToken,
  type RevenueReportAdHourlyFact,
  type RevenueReportOrder,
  type RevenueReportRegistration,
  type RevenueReportDailyAdInsight
} from "./revenue-report";

const orders: RevenueReportOrder[] = [
  {
    sourceSite: "theanhmarketing",
    customerName: "Paid Student",
    customerEmail: "paid@example.com",
    phone: "0900000001",
    productName: "Facebook Ads Master 2026",
    productCode: "FBA",
    amount: 399000,
    paymentMethod: "sepay",
    paymentStatus: "paid",
    createdAt: "2026-06-01T08:00:00.000Z",
    paidAt: "2026-06-01T08:30:00.000Z",
    sepayTransactionId: "61713313",
    sepayReferenceCode: "FT26154182548773",
    hasSepayPayload: true,
    orderId: "TAMPAID01"
  },
  {
    sourceSite: "theanhmarketing",
    customerName: "Pending Student",
    customerEmail: "pending@example.com",
    phone: "0900000002",
    productName: "AI Master X10",
    productCode: "AIM",
    amount: 1299000,
    paymentMethod: "sepay",
    paymentStatus: "pending",
    createdAt: "2026-06-02T08:00:00.000Z",
    paidAt: null,
    sepayTransactionId: null,
    sepayReferenceCode: null,
    hasSepayPayload: false,
    orderId: "TAMPENDING01"
  },
  {
    sourceSite: "adsplan",
    customerName: "Completed Customer",
    customerEmail: "completed@example.com",
    phone: "0900000003",
    productName: "Greezhub service",
    productCode: null,
    amount: 2000000,
    paymentMethod: "sepay",
    paymentStatus: "completed",
    createdAt: "2026-06-02T10:00:00.000Z",
    paidAt: "2026-06-02T10:05:00.000Z",
    sepayTransactionId: null,
    sepayReferenceCode: null,
    hasSepayPayload: false,
    orderId: "ADSPLAN01"
  }
];

const registrations: RevenueReportRegistration[] = [
  { sourceSite: "theanhmarketing", productCode: "FBA", createdAt: "2026-06-01T07:00:00.000Z", id: "lead-1" },
  { sourceSite: "theanhmarketing", productCode: "AIM", createdAt: "2026-06-02T07:00:00.000Z", id: "lead-2" },
  { sourceSite: "adsplan", productCode: null, createdAt: "2026-06-02T07:30:00.000Z", id: "lead-3" }
];

const ads: RevenueReportDailyAdInsight[] = [
  { date: "2026-06-01", spend: 100000, impressions: 1000, reach: 800, clicks: 50, productCode: "FBA" },
  { date: "2026-06-02", spend: 300000, impressions: 3000, reach: 2400, clicks: 150, productCode: null }
];

describe("revenue report aggregation", () => {
  it("counts successful revenue only and derives profit, ROAS, AOV, CPA and conversion rate", () => {
    const report = buildRevenueReport({
      orders,
      registrations,
      adInsights: ads,
      dateRange: { startDate: "2026-06-01", endDate: "2026-06-02" },
      filters: { sourceSite: "all", paymentStatus: "all", productCode: "all", groupBy: "day" }
    });

    expect(report.summary.adSpend).toBe(400000);
    expect(report.summary.revenue).toBe(399000);
    expect(report.summary.profit).toBe(-1000);
    expect(report.summary.roas).toBeCloseTo(0.9975, 4);
    expect(report.summary.registrations).toBe(3);
    expect(report.summary.successfulOrders).toBe(1);
    expect(report.summary.averageOrderValue).toBe(399000);
    expect(report.summary.cpa).toBe(400000);
    expect(report.summary.cpl).toBeCloseTo(133333.3333, 4);
    expect(report.summary.registrationToPaymentRate).toBeCloseTo(33.3333, 3);
  });

  it("only recognizes paid revenue after Sepay evidence is present", () => {
    const report = buildRevenueReport({
      orders: [
        ...orders,
        {
          sourceSite: "theanhmarketing",
          customerName: "Paid Without Sepay",
          customerEmail: "pending-sepay@example.com",
          phone: "0900000004",
          productName: "Facebook Ads Master 2026",
          productCode: "FBA",
          amount: 799000,
          paymentMethod: "sepay",
          paymentStatus: "paid",
          createdAt: "2026-06-01T09:00:00.000Z",
          paidAt: "2026-06-01T09:30:00.000Z",
          sepayTransactionId: null,
          sepayReferenceCode: null,
          hasSepayPayload: false,
          orderId: "TAMNOSEPAY01"
        } as RevenueReportOrder
      ],
      registrations,
      adInsights: ads,
      dateRange: { startDate: "2026-06-01", endDate: "2026-06-02" },
      filters: { sourceSite: "all", paymentStatus: "all", productCode: "all", groupBy: "day" }
    });

    expect(report.summary.revenue).toBe(399000);
    expect(report.summary.successfulOrders).toBe(1);
    expect(report.summary.unverifiedPaidOrders).toBe(1);
    expect(report.summary.unverifiedPaidRevenue).toBe(799000);
    expect(report.daily[0]).toMatchObject({
      orders: 1,
      revenue: 399000,
      unverifiedPaidOrders: 1,
      unverifiedPaidRevenue: 799000
    });
    expect(report.productRows.find((row) => row.bucket === "2026-06-01" && row.productCode === "FBA")).toMatchObject({
      revenue: 399000,
      orders: 1,
      unverifiedPaidOrders: 1,
      unverifiedPaidRevenue: 799000
    });
  });

  it("buckets paid orders by Vietnam calendar day, not by Meta reset hour", () => {
    const report = buildRevenueReport({
      orders: [
        {
          sourceSite: "theanhmarketing",
          customerName: "Afternoon Buyer",
          customerEmail: "afternoon@example.com",
          phone: "0900000006",
          productName: "Facebook Ads Master 2026",
          productCode: "FBA",
          amount: 799000,
          paymentMethod: "sepay",
          paymentStatus: "paid",
          createdAt: "2026-06-04T06:59:00.000Z",
          paidAt: "2026-06-04T06:59:59.000Z",
          sepayTransactionId: "61820228",
          sepayReferenceCode: "FT26155848530097",
          hasSepayPayload: true,
          orderId: "TAMBEFORE1400"
        },
        {
          sourceSite: "theanhmarketing",
          customerName: "New Ads Day Buyer",
          customerEmail: "new-day@example.com",
          phone: "0900000007",
          productName: "Facebook Ads Master 2026",
          productCode: "FBA",
          amount: 399000,
          paymentMethod: "sepay",
          paymentStatus: "paid",
          createdAt: "2026-06-04T07:00:00.000Z",
          paidAt: "2026-06-04T07:00:00.000Z",
          sepayTransactionId: "61820229",
          sepayReferenceCode: "FT26155848530098",
          hasSepayPayload: true,
          orderId: "TAMAFTER1400"
        }
      ],
      registrations: [],
      adInsights: [{ date: "2026-06-04", spend: 96156, impressions: 1000, reach: 588, clicks: 17, productCode: "FBA" }],
      dateRange: { startDate: "2026-06-04", endDate: "2026-06-04" },
      filters: { sourceSite: "all", paymentStatus: "success", productCode: "FBA", groupBy: "day" }
    });

    expect(revenueReportDateKey("2026-06-04T06:59:59.000Z")).toBe("2026-06-04");
    expect(revenueReportDateKey("2026-06-04T07:00:00.000Z")).toBe("2026-06-04");
    expect(report.summary.revenue).toBe(1198000);
    expect(report.summary.successfulOrders).toBe(2);
    expect(report.daily[0]).toMatchObject({
      date: "2026-06-04",
      orders: 2,
      revenue: 1198000
    });
  });

  it("builds daily rows with spend, registrations, orders, revenue, profit and ROAS", () => {
    const report = buildRevenueReport({
      orders,
      registrations,
      adInsights: ads,
      dateRange: { startDate: "2026-06-01", endDate: "2026-06-02" },
      filters: { sourceSite: "all", paymentStatus: "all", productCode: "all", groupBy: "day" }
    });

    expect(report.daily).toEqual([
      {
        date: "2026-06-01",
        adSpend: 100000,
        spendDataStatus: "final",
        reportTimezone: "Asia/Ho_Chi_Minh",
        metaDayResetHourVN: 14,
        registrations: 1,
        orders: 1,
        revenue: 399000,
        profit: 299000,
        roas: 3.99,
        sourceSite: "all",
        unverifiedPaidOrders: 0,
        unverifiedPaidRevenue: 0
      },
      {
        date: "2026-06-02",
        adSpend: 300000,
        spendDataStatus: "final",
        reportTimezone: "Asia/Ho_Chi_Minh",
        metaDayResetHourVN: 14,
        registrations: 2,
        orders: 0,
        revenue: 0,
        profit: -300000,
        roas: 0,
        sourceSite: "all",
        unverifiedPaidOrders: 0,
        unverifiedPaidRevenue: 0
      }
    ]);
  });

  it("uses Vietnam-local hourly ad facts for spend and marks partial data explicitly", () => {
    const hourlyFacts: RevenueReportAdHourlyFact[] = [
      {
        clientId: "greezhub",
        adAccountId: "act_1255736315302940",
        localDate: "2026-06-08",
        localHour: 0,
        localStartAt: "2026-06-08T00:00:00+07:00",
        localEndAt: "2026-06-08T00:59:59+07:00",
        metaDate: "2026-06-07",
        metaHour: 10,
        spend: 100000,
        impressions: 1000,
        reach: 900,
        clicks: 50,
        ctr: 5,
        cpc: 2000,
        leads: 2,
        messages: 1,
        dataStatus: "final",
        rawJson: {}
      },
      {
        clientId: "greezhub",
        adAccountId: "act_1255736315302940",
        localDate: "2026-06-08",
        localHour: 1,
        localStartAt: "2026-06-08T01:00:00+07:00",
        localEndAt: "2026-06-08T01:59:59+07:00",
        metaDate: "2026-06-07",
        metaHour: 11,
        spend: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        leads: 0,
        messages: 0,
        dataStatus: "missing",
        rawJson: {}
      }
    ];

    const report = buildRevenueReport({
      orders: [
        {
          sourceSite: "theanhmarketing",
          customerName: "Morning Buyer",
          customerEmail: "morning@example.com",
          phone: "0900000008",
          productName: "Facebook Ads Master 2026",
          productCode: "FBA",
          amount: 399000,
          paymentMethod: "sepay",
          paymentStatus: "paid",
          createdAt: "2026-06-08T01:00:00.000Z",
          paidAt: "2026-06-08T01:30:00.000Z",
          sepayTransactionId: "61900001",
          sepayReferenceCode: "FT26160000000001",
          hasSepayPayload: true,
          orderId: "TAM0806MORNING"
        }
      ],
      registrations: [{ sourceSite: "theanhmarketing", productCode: "FBA", createdAt: "2026-06-08T00:30:00.000Z", id: "lead-0806" }],
      adInsights: [{ date: "2026-06-08", spend: 999999, impressions: 1, reach: 1, clicks: 1, productCode: "FBA" }],
      adHourlyFacts: hourlyFacts,
      dateRange: { startDate: "2026-06-08", endDate: "2026-06-08" },
      filters: { sourceSite: "all", paymentStatus: "all", productCode: "FBA", groupBy: "day" }
    });

    expect(report.summary.adSpend).toBe(100000);
    expect(report.summary.spendDataStatus).toBe("partial");
    expect(report.daily[0]).toMatchObject({
      date: "2026-06-08",
      adSpend: 100000,
      spendDataStatus: "partial",
      reportTimezone: "Asia/Ho_Chi_Minh",
      metaDayResetHourVN: 14
    });
    expect(report.summary.roas).toBeCloseTo(3.99, 2);
    expect(report.summary.cpl).toBe(100000);
  });

  it("filters by source site and keeps pending orders out of paid revenue", () => {
    const report = buildRevenueReport({
      orders,
      registrations,
      adInsights: ads,
      dateRange: { startDate: "2026-06-01", endDate: "2026-06-02" },
      filters: { sourceSite: "theanhmarketing", paymentStatus: "success", productCode: "all", groupBy: "day" }
    });

    expect(report.summary.revenue).toBe(399000);
    expect(report.summary.successfulOrders).toBe(1);
    expect(report.orders.map((order) => order.orderId)).toEqual(["TAMPAID01"]);
  });

  it("normalizes payment statuses into reporting buckets", () => {
    expect(normalizePaymentStatus("paid")).toBe("success");
    expect(normalizePaymentStatus("success")).toBe("pending");
    expect(normalizePaymentStatus("completed")).toBe("pending");
    expect(normalizePaymentStatus("cancelled")).toBe("failed");
    expect(normalizePaymentStatus("refunded")).toBe("failed");
    expect(normalizePaymentStatus("waiting")).toBe("pending");
  });

  it("parses the campaign naming convention into date and product code", () => {
    expect(parseCampaignConvention("03/06 - AIM - Vuong", 2026)).toMatchObject({
      campaignDate: "2026-06-03",
      productCode: "AIM",
      productName: "AI Master X10 hieu suat",
      variant: "Vuong"
    });

    expect(parseCampaignConvention("05/24 - FBA - Old", 2026)).toMatchObject({
      campaignDate: "2026-05-24",
      productCode: "FBA",
      productName: "Facebook Ads",
      variant: "Old"
    });
  });

  it("filters spend and paid revenue by campaign product code", () => {
    const report = buildRevenueReport({
      orders,
      registrations,
      adInsights: ads,
      dateRange: { startDate: "2026-06-01", endDate: "2026-06-02" },
      filters: { sourceSite: "all", paymentStatus: "all", productCode: "FBA", groupBy: "day" }
    });

    expect(report.summary.adSpend).toBe(100000);
    expect(report.summary.revenue).toBe(399000);
    expect(report.summary.successfulOrders).toBe(1);
    expect(report.orders.map((order) => order.orderId)).toEqual(["TAMPAID01"]);
  });

  it("builds product rows by day, week and month using paid revenue only", () => {
    const daily = buildRevenueReport({
      orders,
      registrations,
      adInsights: ads,
      dateRange: { startDate: "2026-06-01", endDate: "2026-06-02" },
      filters: { sourceSite: "all", paymentStatus: "all", productCode: "all", groupBy: "day" }
    });
    expect(daily.productRows.find((row) => row.bucket === "2026-06-01" && row.productCode === "FBA")).toMatchObject({
      adSpend: 100000,
      revenue: 399000,
      orders: 1,
      profit: 299000
    });
    expect(daily.productRows.find((row) => row.bucket === "2026-06-02" && row.productCode === "AIM")).toMatchObject({
      adSpend: 0,
      revenue: 0,
      orders: 0
    });

    const weekly = buildRevenueReport({
      orders,
      registrations,
      adInsights: ads,
      dateRange: { startDate: "2026-06-01", endDate: "2026-06-02" },
      filters: { sourceSite: "all", paymentStatus: "all", productCode: "all", groupBy: "week" }
    });
    expect(weekly.productRows.some((row) => row.bucket === "2026-W23" && row.productCode === "FBA")).toBe(true);

    const monthly = buildRevenueReport({
      orders,
      registrations,
      adInsights: ads,
      dateRange: { startDate: "2026-06-01", endDate: "2026-06-02" },
      filters: { sourceSite: "all", paymentStatus: "all", productCode: "all", groupBy: "month" }
    });
    expect(monthly.productRows.some((row) => row.bucket === "2026-06" && row.productCode === "FBA")).toBe(true);
  });

  it("uses the dedicated revenue report ad account before the generic sandbox account", () => {
    expect(resolveRevenueReportAdAccountId({ revenueReportAdAccountId: "1255736315302940", metaAdAccountId: "act_1295473488844957" })).toBe(
      "act_1255736315302940"
    );
    expect(resolveRevenueReportAdAccountId({ metaAdAccountId: "act_1295473488844957" })).toBe("act_1255736315302940");
  });

  it("uses the owner session Meta token before generic env tokens", () => {
    expect(
      resolveRevenueReportMetaAccessToken({
        sessionToken: "session-token",
        revenueReportMetaAccessToken: "revenue-env-token",
        metaAccessToken: "generic-env-token"
      })
    ).toBe("session-token");
    expect(resolveRevenueReportMetaAccessToken({ revenueReportMetaAccessToken: "revenue-env-token", metaAccessToken: "generic-env-token" })).toBe(
      "revenue-env-token"
    );
  });
});
