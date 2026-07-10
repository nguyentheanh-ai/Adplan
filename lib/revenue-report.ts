import type { DailyInsight } from "@/lib/meta/types";

export type RevenueSourceSite = "all" | "adsplan" | "theanhmarketing";
export type RevenuePaymentStatusFilter = "all" | "success" | "pending" | "failed";
export type RevenueProductCodeFilter = "all" | "FBA" | "AIM" | "unmapped";
export type RevenueReportGroupBy = "day" | "week" | "month";
export type NormalizedPaymentStatus = "success" | "pending" | "failed";
export type RevenueVerificationStatus = "sepay_verified" | "manual_verified" | "pending_sepay" | "not_paid";
export type AdSpendDataStatus = "final" | "partial" | "missing";

export type RevenueReportDateRange = {
  startDate: string;
  endDate: string;
};

export type RevenueReportFilters = {
  sourceSite: RevenueSourceSite;
  paymentStatus: RevenuePaymentStatusFilter;
  productCode: RevenueProductCodeFilter;
  groupBy: RevenueReportGroupBy;
};

export type RevenueReportOrder = {
  sourceSite: Exclude<RevenueSourceSite, "all">;
  customerName: string;
  customerEmail: string;
  phone: string;
  productName: string;
  productCode?: string | null;
  amount: number;
  paymentMethod?: string | null;
  paymentStatus: string;
  createdAt: string;
  paidAt: string | null;
  sepayTransactionId?: string | null;
  sepayReferenceCode?: string | null;
  hasSepayPayload?: boolean;
  orderId: string;
};

export type RevenueReportRegistration = {
  sourceSite: Exclude<RevenueSourceSite, "all">;
  productCode?: string | null;
  createdAt: string;
  id: string;
};

export type RevenueReportDailyAdInsight = {
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  campaignId?: string | null;
  campaignName?: string | null;
  campaignDate?: string | null;
  productCode?: string | null;
  productName?: string | null;
  campaignVariant?: string | null;
  cpc?: number;
  cpm?: number;
  ctr?: number;
  actions?: DailyInsight["actions"];
  costPerActionType?: DailyInsight["cost_per_action_type"];
};

export type RevenueReportAdHourlyFact = {
  clientId: string;
  adAccountId: string;
  localDate: string;
  localHour: number;
  localStartAt: string;
  localEndAt: string;
  metaDate: string;
  metaHour: number;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  leads: number;
  messages: number;
  source?: string | null;
  dataStatus: AdSpendDataStatus;
  rawJson: Record<string, unknown>;
  productCode?: string | null;
};

export type CampaignConvention = {
  campaignDate: string | null;
  productCode: string | null;
  productName: string | null;
  variant: string | null;
};

export const revenueProductNames: Record<Exclude<RevenueProductCodeFilter, "all" | "unmapped">, string> = {
  FBA: "Facebook Ads",
  AIM: "AI Master X10 hieu suat"
};

export type RevenueReportDailyRow = {
  date: string;
  adSpend: number;
  spendDataStatus: AdSpendDataStatus;
  reportTimezone: typeof revenueReportTimeZone;
  metaDayResetHourVN: typeof revenueReportDayStartHour;
  registrations: number;
  orders: number;
  revenue: number;
  profit: number;
  roas: number | null;
  sourceSite: RevenueSourceSite;
  unverifiedPaidOrders: number;
  unverifiedPaidRevenue: number;
};

export type RevenueReportProductRow = {
  bucket: string;
  productCode: string;
  productName: string;
  adSpend: number;
  spendDataStatus: AdSpendDataStatus;
  registrations: number;
  orders: number;
  revenue: number;
  profit: number;
  roas: number | null;
  unverifiedPaidOrders: number;
  unverifiedPaidRevenue: number;
};

export type RevenueReportSummary = {
  adSpend: number;
  spendDataStatus: AdSpendDataStatus;
  revenue: number;
  profit: number;
  roas: number | null;
  registrations: number;
  successfulOrders: number;
  unverifiedPaidOrders: number;
  unverifiedPaidRevenue: number;
  averageOrderValue: number;
  cpa: number | null;
  cpl: number | null;
  registrationToPaymentRate: number | null;
  clicks: number;
  impressions: number;
  reach: number;
};

export type RevenueReport = {
  dateRange: RevenueReportDateRange;
  filters: RevenueReportFilters;
  reportingTimeZone: typeof revenueReportTimeZone;
  reportingDayStartHour: typeof revenueReportDayStartHour;
  summary: RevenueReportSummary;
  daily: RevenueReportDailyRow[];
  productRows: RevenueReportProductRow[];
  orders: RevenueReportOrder[];
  registrations: RevenueReportRegistration[];
  adInsights: RevenueReportDailyAdInsight[];
  adHourlyFacts: RevenueReportAdHourlyFact[];
};

export const revenueReportTimeZone = "Asia/Ho_Chi_Minh";
export const revenueReportDayStartHour = 14;

export function toNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function normalizePaymentStatus(status: string | null | undefined): NormalizedPaymentStatus {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "paid") return "success";
  if (["failed", "cancelled", "canceled", "refunded", "expired"].includes(normalized)) return "failed";
  return "pending";
}

export function resolveRevenueReportAdAccountId({
  revenueReportAdAccountId,
  metaAdAccountId
}: {
  revenueReportAdAccountId?: string | null;
  metaAdAccountId?: string | null;
} = {}) {
  const raw = String(revenueReportAdAccountId || "").trim() || "act_1255736315302940";
  return raw.startsWith("act_") ? raw : `act_${raw}`;
}

export function resolveRevenueReportMetaAccessToken({
  sessionToken,
  revenueReportMetaAccessToken,
  metaAccessToken
}: {
  sessionToken?: string | null;
  revenueReportMetaAccessToken?: string | null;
  metaAccessToken?: string | null;
} = {}) {
  return String(sessionToken || "").trim() || String(revenueReportMetaAccessToken || "").trim() || String(metaAccessToken || "").trim() || null;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function validDayMonth(day: number, month: number) {
  return day >= 1 && day <= 31 && month >= 1 && month <= 12;
}

function campaignDateFromParts(first: number, second: number, year: number) {
  let day = first;
  let month = second;

  // The user's convention is day/month. Some older Meta campaigns are named
  // 05/24 for May 24, so recover that case when the second part cannot be a month.
  if (second > 12 && first <= 12) {
    day = second;
    month = first;
  }

  if (!validDayMonth(day, month)) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseCampaignConvention(campaignName: string | null | undefined, fallbackYear = new Date().getFullYear()): CampaignConvention {
  const raw = String(campaignName || "").trim();
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\s*-\s*([A-Za-z]{2,12})(?:\s*-\s*(.+))?$/);
  if (!match) {
    return { campaignDate: null, productCode: null, productName: null, variant: null };
  }

  const productCode = match[3].toUpperCase();
  return {
    campaignDate: campaignDateFromParts(Number(match[1]), Number(match[2]), fallbackYear),
    productCode,
    productName: revenueProductNames[productCode as keyof typeof revenueProductNames] ?? productCode,
    variant: match[4]?.trim() || null
  };
}

export function revenueReportDateKey(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: revenueReportTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isoWeekKey(value: string) {
  const date = parseDate(value);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function bucketKey(value: string | null | undefined, groupBy: RevenueReportGroupBy) {
  const key = revenueReportDateKey(value);
  if (!key) return "";
  if (groupBy === "month") return key.slice(0, 7);
  if (groupBy === "week") return isoWeekKey(key);
  return key;
}

export function listDateKeys(range: RevenueReportDateRange) {
  const dates: string[] = [];
  let cursor = parseDate(range.startDate);
  const end = parseDate(range.endDate);

  while (cursor <= end) {
    dates.push(isoDate(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function isInDateRange(value: string | null | undefined, range: RevenueReportDateRange) {
  const key = revenueReportDateKey(value);
  return key >= range.startDate && key <= range.endDate;
}

function orderReportDate(order: RevenueReportOrder) {
  return normalizePaymentStatus(order.paymentStatus) === "success" ? order.paidAt || order.createdAt : order.createdAt;
}

function matchesSource(sourceSite: RevenueSourceSite, filter: RevenueSourceSite) {
  return filter === "all" || sourceSite === filter;
}

function matchesPaymentStatus(status: string, filter: RevenuePaymentStatusFilter) {
  if (filter === "all") return true;
  return normalizePaymentStatus(status) === filter;
}

function matchesProductCode(productCode: string | null | undefined, filter: RevenueProductCodeFilter) {
  if (filter === "all") return true;
  if (filter === "unmapped") return !productCode;
  return productCode === filter;
}

function successfulOrders(orders: RevenueReportOrder[]) {
  return orders.filter((order) => normalizePaymentStatus(order.paymentStatus) === "success" && isRevenueVerified(order));
}

function unverifiedPaidOrders(orders: RevenueReportOrder[]) {
  return orders.filter((order) => normalizePaymentStatus(order.paymentStatus) === "success" && !isRevenueVerified(order));
}

function hasSepayEvidence(order: RevenueReportOrder) {
  return Boolean(order.sepayTransactionId || order.sepayReferenceCode || order.hasSepayPayload);
}

export function getRevenueVerificationStatus(order: RevenueReportOrder): RevenueVerificationStatus {
  if (normalizePaymentStatus(order.paymentStatus) !== "success") return "not_paid";
  const method = String(order.paymentMethod || "").trim().toLowerCase();
  if (method === "manual-admin") return "manual_verified";
  return hasSepayEvidence(order) ? "sepay_verified" : "pending_sepay";
}

function isRevenueVerified(order: RevenueReportOrder) {
  const status = getRevenueVerificationStatus(order);
  return status === "sepay_verified" || status === "manual_verified";
}

function normalizedProductCode(value: string | null | undefined) {
  return value || "unmapped";
}

function productNameForCode(code: string) {
  if (code === "unmapped") return "Chua gan ma";
  return revenueProductNames[code as keyof typeof revenueProductNames] ?? code;
}

function mergeSpendDataStatus(statuses: AdSpendDataStatus[]): AdSpendDataStatus {
  if (!statuses.length) return "missing";
  if (statuses.every((status) => status === "final")) return "final";
  if (statuses.every((status) => status === "missing")) return "missing";
  return "partial";
}

function adFactMatchesProduct(fact: RevenueReportAdHourlyFact, filter: RevenueProductCodeFilter) {
  return matchesProductCode(fact.productCode, filter) || !fact.productCode;
}

function adSpendForDate({
  date,
  adInsights,
  adHourlyFacts,
  productCode
}: {
  date: string;
  adInsights: RevenueReportDailyAdInsight[];
  adHourlyFacts: RevenueReportAdHourlyFact[];
  productCode: RevenueProductCodeFilter;
}) {
  if (adHourlyFacts.length > 0) {
    const rows = adHourlyFacts.filter((fact) => fact.localDate === date && adFactMatchesProduct(fact, productCode));
    return {
      spend: rows.reduce((sum, row) => sum + row.spend, 0),
      impressions: rows.reduce((sum, row) => sum + row.impressions, 0),
      reach: rows.reduce((sum, row) => sum + row.reach, 0),
      clicks: rows.reduce((sum, row) => sum + row.clicks, 0),
      status: mergeSpendDataStatus(rows.map((row) => row.dataStatus))
    };
  }

  const rows = adInsights.filter((row) => row.date === date && matchesProductCode(row.productCode, productCode));
  return {
    spend: rows.reduce((sum, row) => sum + row.spend, 0),
    impressions: rows.reduce((sum, row) => sum + row.impressions, 0),
    reach: rows.reduce((sum, row) => sum + row.reach, 0),
    clicks: rows.reduce((sum, row) => sum + row.clicks, 0),
    status: rows.length ? ("final" as const) : ("missing" as const)
  };
}

function buildProductRows({
  orders,
  registrations,
  adInsights,
  adHourlyFacts = [],
  groupBy
}: {
  orders: RevenueReportOrder[];
  registrations: RevenueReportRegistration[];
  adInsights: RevenueReportDailyAdInsight[];
  adHourlyFacts?: RevenueReportAdHourlyFact[];
  groupBy: RevenueReportGroupBy;
}) {
  const rows = new Map<string, RevenueReportProductRow>();

  function getRow(bucket: string, productCodeInput: string | null | undefined) {
    const productCode = normalizedProductCode(productCodeInput);
    const key = `${bucket}|${productCode}`;
    const current =
      rows.get(key) ??
      ({
        bucket,
        productCode,
        productName: productNameForCode(productCode),
        adSpend: 0,
        spendDataStatus: "missing",
        registrations: 0,
        orders: 0,
        revenue: 0,
        profit: 0,
        roas: null,
        unverifiedPaidOrders: 0,
        unverifiedPaidRevenue: 0
      } satisfies RevenueReportProductRow);
    rows.set(key, current);
    return current;
  }

  for (const row of adInsights) {
    if (adHourlyFacts.length > 0) break;
    const bucket = bucketKey(row.date, groupBy);
    if (!bucket) continue;
    const current = getRow(bucket, row.productCode);
    current.adSpend += row.spend;
    current.spendDataStatus = "final";
  }

  for (const fact of adHourlyFacts) {
    const bucket = bucketKey(fact.localDate, groupBy);
    if (!bucket) continue;
    const current = getRow(bucket, fact.productCode);
    const previousStatus = current.adSpend === 0 && current.spendDataStatus === "missing" ? null : current.spendDataStatus;
    current.adSpend += fact.spend;
    current.spendDataStatus = previousStatus ? mergeSpendDataStatus([previousStatus, fact.dataStatus]) : fact.dataStatus;
  }

  for (const registration of registrations) {
    const bucket = bucketKey(registration.createdAt, groupBy);
    if (!bucket) continue;
    getRow(bucket, registration.productCode).registrations += 1;
  }

  for (const order of successfulOrders(orders)) {
    const bucket = bucketKey(orderReportDate(order), groupBy);
    if (!bucket) continue;
    const row = getRow(bucket, order.productCode);
    row.orders += 1;
    row.revenue += order.amount;
  }

  for (const order of unverifiedPaidOrders(orders)) {
    const bucket = bucketKey(orderReportDate(order), groupBy);
    if (!bucket) continue;
    const row = getRow(bucket, order.productCode);
    row.unverifiedPaidOrders += 1;
    row.unverifiedPaidRevenue += order.amount;
  }

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      profit: row.revenue - row.adSpend,
      roas: row.adSpend > 0 ? row.revenue / row.adSpend : null
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket) || a.productCode.localeCompare(b.productCode));
}

export function buildRevenueReport({
  orders,
  registrations,
  adInsights,
  adHourlyFacts = [],
  dateRange,
  filters
}: {
  orders: RevenueReportOrder[];
  registrations: RevenueReportRegistration[];
  adInsights: RevenueReportDailyAdInsight[];
  adHourlyFacts?: RevenueReportAdHourlyFact[];
  dateRange: RevenueReportDateRange;
  filters: RevenueReportFilters;
}): RevenueReport {
  const filteredOrders = orders.filter(
    (order) =>
      matchesSource(order.sourceSite, filters.sourceSite) &&
      matchesPaymentStatus(order.paymentStatus, filters.paymentStatus) &&
      matchesProductCode(order.productCode, filters.productCode) &&
      isInDateRange(orderReportDate(order), dateRange)
  );
  const filteredRegistrations = registrations.filter(
    (registration) =>
      matchesSource(registration.sourceSite, filters.sourceSite) &&
      matchesProductCode(registration.productCode, filters.productCode) &&
      isInDateRange(registration.createdAt, dateRange)
  );
  const filteredAdInsights = adInsights.filter((row) => isInDateRange(row.date, dateRange) && matchesProductCode(row.productCode, filters.productCode));
  const filteredAdHourlyFacts = adHourlyFacts.filter(
    (row) => row.localDate >= dateRange.startDate && row.localDate <= dateRange.endDate && adFactMatchesProduct(row, filters.productCode)
  );
  const paidOrders = successfulOrders(filteredOrders);
  const pendingVerificationOrders = unverifiedPaidOrders(filteredOrders);

  const adSpend =
    filteredAdHourlyFacts.length > 0
      ? filteredAdHourlyFacts.reduce((sum, row) => sum + row.spend, 0)
      : filteredAdInsights.reduce((sum, row) => sum + row.spend, 0);
  const spendDataStatus =
    filteredAdHourlyFacts.length > 0 ? mergeSpendDataStatus(filteredAdHourlyFacts.map((row) => row.dataStatus)) : filteredAdInsights.length > 0 ? "final" : "missing";
  const revenue = paidOrders.reduce((sum, order) => sum + order.amount, 0);
  const registrationsCount = filteredRegistrations.length;
  const successfulOrderCount = paidOrders.length;
  const unverifiedPaidOrderCount = pendingVerificationOrders.length;
  const unverifiedPaidRevenue = pendingVerificationOrders.reduce((sum, order) => sum + order.amount, 0);
  const clicks =
    filteredAdHourlyFacts.length > 0
      ? filteredAdHourlyFacts.reduce((sum, row) => sum + row.clicks, 0)
      : filteredAdInsights.reduce((sum, row) => sum + row.clicks, 0);
  const impressions =
    filteredAdHourlyFacts.length > 0
      ? filteredAdHourlyFacts.reduce((sum, row) => sum + row.impressions, 0)
      : filteredAdInsights.reduce((sum, row) => sum + row.impressions, 0);
  const reach =
    filteredAdHourlyFacts.length > 0
      ? filteredAdHourlyFacts.reduce((sum, row) => sum + row.reach, 0)
      : filteredAdInsights.reduce((sum, row) => sum + row.reach, 0);

  const daily = listDateKeys(dateRange).map<RevenueReportDailyRow>((date) => {
    const dayAd = adSpendForDate({ date, adInsights: filteredAdInsights, adHourlyFacts: filteredAdHourlyFacts, productCode: filters.productCode });
    const dayOrders = paidOrders.filter((order) => revenueReportDateKey(orderReportDate(order)) === date);
    const dayRevenue = dayOrders.reduce((sum, order) => sum + order.amount, 0);
    const dayUnverifiedPaidOrders = pendingVerificationOrders.filter((order) => revenueReportDateKey(orderReportDate(order)) === date);
    const dayUnverifiedPaidRevenue = dayUnverifiedPaidOrders.reduce((sum, order) => sum + order.amount, 0);

    return {
      date,
      adSpend: dayAd.spend,
      spendDataStatus: dayAd.status,
      reportTimezone: revenueReportTimeZone,
      metaDayResetHourVN: revenueReportDayStartHour,
      registrations: filteredRegistrations.filter((registration) => revenueReportDateKey(registration.createdAt) === date).length,
      orders: dayOrders.length,
      revenue: dayRevenue,
      profit: dayRevenue - dayAd.spend,
      roas: dayAd.spend > 0 ? dayRevenue / dayAd.spend : null,
      sourceSite: filters.sourceSite,
      unverifiedPaidOrders: dayUnverifiedPaidOrders.length,
      unverifiedPaidRevenue: dayUnverifiedPaidRevenue
    };
  });

  return {
    dateRange,
    filters,
    reportingTimeZone: revenueReportTimeZone,
    reportingDayStartHour: revenueReportDayStartHour,
    summary: {
      adSpend,
      spendDataStatus,
      revenue,
      profit: revenue - adSpend,
      roas: adSpend > 0 ? revenue / adSpend : null,
      registrations: registrationsCount,
      successfulOrders: successfulOrderCount,
      unverifiedPaidOrders: unverifiedPaidOrderCount,
      unverifiedPaidRevenue,
      averageOrderValue: successfulOrderCount > 0 ? revenue / successfulOrderCount : 0,
      cpa: successfulOrderCount > 0 ? adSpend / successfulOrderCount : null,
      cpl: registrationsCount > 0 ? adSpend / registrationsCount : null,
      registrationToPaymentRate: registrationsCount > 0 ? (successfulOrderCount / registrationsCount) * 100 : null,
      clicks,
      impressions,
      reach
    },
    daily,
    productRows: buildProductRows({
      orders: filteredOrders,
      registrations: filteredRegistrations,
      adInsights: filteredAdInsights,
      adHourlyFacts: filteredAdHourlyFacts,
      groupBy: filters.groupBy
    }),
    orders: filteredOrders,
    registrations: filteredRegistrations,
    adInsights: filteredAdInsights,
    adHourlyFacts: filteredAdHourlyFacts
  };
}
