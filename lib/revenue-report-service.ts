import "server-only";
import {
  buildRevenueReport,
  type RevenuePaymentStatusFilter,
  type RevenueProductCodeFilter,
  type RevenueReportGroupBy,
  type RevenueReportDateRange,
  type RevenueSourceSite
} from "@/lib/revenue-report";
import { getAdHourlyFactsForReport } from "@/lib/ad-hourly-cache.service";
import { getRevenueData } from "@/lib/revenue-report-data";
import { getRevenueMetaInsights } from "@/lib/revenue-report-meta";
import { DateTime } from "luxon";

export type RevenueReportQuery = {
  dateRange: RevenueReportDateRange;
  sourceSite: RevenueSourceSite;
  paymentStatus: RevenuePaymentStatusFilter;
  productCode: RevenueProductCodeFilter;
  groupBy: RevenueReportGroupBy;
  sessionToken?: string | null;
};

export function parseRevenueReportQuery(url: string): RevenueReportQuery {
  const searchParams = new URL(url).searchParams;
  const today = DateTime.now().setZone("Asia/Ho_Chi_Minh").toISODate() ?? new Date().toISOString().slice(0, 10);
  const startDate = searchParams.get("start_date") || today;
  const endDate = searchParams.get("end_date") || startDate;
  const sourceSite = (searchParams.get("source_site") || "all") as RevenueSourceSite;
  const paymentStatus = (searchParams.get("payment_status") || "all") as RevenuePaymentStatusFilter;
  const rawProductCode = searchParams.get("product_code") || "all";
  const productCode = (rawProductCode === "unmapped" ? rawProductCode : rawProductCode.toUpperCase()) as RevenueProductCodeFilter;
  const groupBy = (searchParams.get("group_by") || "day") as RevenueReportGroupBy;

  return {
    dateRange: { startDate, endDate },
    sourceSite: ["all", "adsplan", "theanhmarketing"].includes(sourceSite) ? sourceSite : "all",
    paymentStatus: ["all", "success", "pending", "failed"].includes(paymentStatus) ? paymentStatus : "all",
    productCode: ["all", "FBA", "AIM", "unmapped"].includes(productCode) ? productCode : "all",
    groupBy: ["day", "week", "month"].includes(groupBy) ? groupBy : "day"
  };
}

export async function loadRevenueReport(query: RevenueReportQuery) {
  const [revenue, meta, adSpend] = await Promise.all([
    getRevenueData(),
    getRevenueMetaInsights({ dateRange: query.dateRange, sessionToken: query.sessionToken }),
    getAdHourlyFactsForReport({ dateRange: query.dateRange })
  ]);

  const report = buildRevenueReport({
    orders: revenue.orders,
    registrations: revenue.registrations,
    adInsights: meta.insights,
    adHourlyFacts: adSpend.facts,
    dateRange: query.dateRange,
    filters: {
      sourceSite: query.sourceSite,
      paymentStatus: query.paymentStatus,
      productCode: query.productCode,
      groupBy: query.groupBy
    }
  });

  return {
    report,
    status: {
      revenue: revenue.status,
      meta: meta.status,
      adSpend: adSpend.status,
      adAccountSettings: adSpend.settings
    }
  };
}
