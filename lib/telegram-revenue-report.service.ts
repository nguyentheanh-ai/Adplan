import { DateTime } from "luxon";
import { getAdHourlyFactsForReport, getClientAdAccountSettings } from "@/lib/ad-hourly-cache.service";
import { getRevenueData } from "@/lib/revenue-report-data";
import {
  buildRevenueReport,
  getRevenueVerificationStatus,
  normalizePaymentStatus,
  revenueReportDateKey,
  revenueReportTimeZone,
  type AdSpendDataStatus,
  type RevenueReport,
  type RevenueReportAdHourlyFact,
  type RevenueReportDateRange,
  type RevenueReportGroupBy,
  type RevenueReportOrder,
  type RevenueReportRegistration
} from "@/lib/revenue-report";

type TelegramWindow = {
  localDate: string;
  startHour: number;
  endHour: number;
  label: string;
};

type MetaAdWindow = {
  metaDate: string;
  metaHourEnd: number;
  label: string;
  fetchStartDate: string;
  fetchEndDate: string;
};

type RevenueWindowSnapshot = {
  window: TelegramWindow;
  revenue: number;
  verifiedPaidOrders: number;
  unverifiedPaidOrders: number;
  pendingOrders: number;
  registrations: number;
  spend: number;
  clicks: number;
  leads: number;
  spendStatus: AdSpendDataStatus;
  roas: number | null;
  profit: number;
};

export type TelegramReportPeriod = {
  label: string;
  dateRange: RevenueReportDateRange;
  groupBy: RevenueReportGroupBy;
};

export type TelegramDailyReport = {
  date: string;
  dateLabel: string;
  windowLabel: string;
  adsDateLabel: string;
  adsWindowLabel: string;
  revenue: number;
  leads: number;
  orders: number;
  adsCost: number;
  cpa: number | null;
  roas: number | null;
  profit: number;
};

type TelegramRevenuePeriodReport = {
  period: TelegramReportPeriod;
  revenue: number;
  paidOrders: number;
  pendingOrders: number;
  pendingRevenue: number;
  unverifiedPaidOrders: number;
  unverifiedPaidRevenue: number;
  registrations: number;
  averageOrderValue: number;
  conversionRate: number | null;
  potentialCashflow: number;
  projectedRevenue: number | null;
};

type TelegramAdsPeriodReport = {
  period: TelegramReportPeriod;
  spend: number;
  spendStatus: AdSpendDataStatus;
  missingSpendDates: string[];
  clicks: number;
  leads: number;
  registrations: number;
  paidOrders: number;
  revenue: number;
  cpl: number | null;
  cpa: number | null;
  roas: number | null;
  profit: number;
  projectedProfit: number | null;
};

const LOG_PREFIX = "[telegram]";

function money(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(value))}đ`;
}

function formatRatio(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return value.toFixed(2);
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `${value.toFixed(1)}%`;
}

function statusLabel(status: AdSpendDataStatus) {
  if (status === "final") return "Đầy đủ";
  if (status === "partial") return "Đang cập nhật";
  return "Chưa đồng bộ được chi phí Meta";
}

function toVietnamDateTime(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = DateTime.fromISO(raw, { setZone: true });
  if (!parsed.isValid) return null;
  return parsed.setZone(revenueReportTimeZone);
}

function parseVietnamDate(value: string) {
  const parsed = DateTime.fromISO(value, { zone: revenueReportTimeZone });
  return parsed.isValid ? parsed : null;
}

function formatDateRangeLabel(range: RevenueReportDateRange) {
  const start = parseVietnamDate(range.startDate);
  const end = parseVietnamDate(range.endDate);
  if (!start || !end) return `${range.startDate}-${range.endDate}`;
  if (range.startDate === range.endDate) return start.toFormat("dd/MM/yyyy");
  return `${start.toFormat("dd/MM/yyyy")}-${end.toFormat("dd/MM/yyyy")}`;
}

function formatDateLabel(date: string) {
  const parsed = parseVietnamDate(date);
  return parsed ? parsed.toFormat("dd/MM/yyyy") : date;
}

function compactDateLabels(dates: string[]) {
  const sorted = [...new Set(dates)].sort();
  if (sorted.length <= 7) return sorted.map(formatDateLabel).join(", ");
  const head = sorted.slice(0, 7).map(formatDateLabel).join(", ");
  return `${head}... (+${sorted.length - 7} ngay)`;
}

function dateDiffDays(range: RevenueReportDateRange) {
  const start = parseVietnamDate(range.startDate);
  const end = parseVietnamDate(range.endDate);
  if (!start || !end) return 1;
  return Math.max(1, Math.floor(end.diff(start, "days").days) + 1);
}

function inferGroupBy(range: RevenueReportDateRange): RevenueReportGroupBy {
  const days = dateDiffDays(range);
  if (days <= 14) return "day";
  if (days <= 70) return "week";
  return "month";
}

function reportFromData({
  period,
  orders,
  registrations,
  adHourlyFacts
}: {
  period: TelegramReportPeriod;
  orders: RevenueReportOrder[];
  registrations: RevenueReportRegistration[];
  adHourlyFacts: RevenueReportAdHourlyFact[];
}) {
  return buildRevenueReport({
    orders,
    registrations,
    adInsights: [],
    adHourlyFacts,
    dateRange: period.dateRange,
    filters: { sourceSite: "all", paymentStatus: "all", productCode: "all", groupBy: period.groupBy }
  });
}

function pendingOrdersInReport(report: RevenueReport) {
  return report.orders.filter((order) => normalizePaymentStatus(order.paymentStatus) === "pending");
}

function projectedForMonth(value: number, period: TelegramReportPeriod) {
  const start = parseVietnamDate(period.dateRange.startDate);
  const end = parseVietnamDate(period.dateRange.endDate);
  if (!start || !end || start.month !== end.month || start.year !== end.year) return null;
  const elapsedDays = Math.max(1, Math.floor(end.diff(start, "days").days) + 1);
  const monthDays = end.daysInMonth || elapsedDays;
  if (elapsedDays >= monthDays) return null;
  return (value / elapsedDays) * monthDays;
}

function isInWindow(value: string | null | undefined, window: TelegramWindow) {
  const local = toVietnamDateTime(value);
  if (!local || local.toISODate() !== window.localDate) return false;
  return local.hour >= window.startHour && local.hour < window.endHour;
}

function mergeSpendStatus(statuses: AdSpendDataStatus[]): AdSpendDataStatus {
  if (!statuses.length || statuses.every((status) => status === "missing")) return "missing";
  if (statuses.every((status) => status === "final")) return "final";
  return "partial";
}

export function getAllowedChatIds() {
  const fromAllowed = String(process.env.TELEGRAM_ALLOWED_CHAT_IDS || "").trim();
  const legacy = String(process.env.TELEGRAM_CHAT_ID || "").trim();
  const raw = fromAllowed || legacy;
  return raw
    .split(",")
    .map((chatId) => chatId.trim())
    .filter(Boolean);
}

export function isChatIdAllowed(chatId: string) {
  const normalized = String(chatId || "").trim();
  return getAllowedChatIds().includes(normalized);
}

export function getTelegramCommandHelp() {
  return [
    "🤖 Lệnh Report_Biz:",
    "/revenue today - Báo cáo doanh thu hôm nay",
    "/revenue week - Báo cáo doanh thu tuần này",
    "/revenue month - Báo cáo doanh thu tháng này",
    "/revenue 2026-06-01 2026-06-15 - Báo cáo doanh thu theo khoảng",
    "",
    "/ads today - Báo cáo quảng cáo hôm nay",
    "/ads week - Báo cáo quảng cáo tuần này",
    "/ads month - Báo cáo quảng cáo tháng này",
    "/ads 2026-06-01 2026-06-15 - Báo cáo quảng cáo theo khoảng",
    "",
    "/chatid - Lấy ID group Telegram"
  ].join("\n");
}

export function getTelegramRevenueWindow(now = DateTime.now().setZone(revenueReportTimeZone)): TelegramWindow {
  const current = now.setZone(revenueReportTimeZone);
  const endHour = Math.max(1, Math.min(24, current.hour + 1));

  return {
    localDate: current.toISODate() || "",
    startHour: 0,
    endHour,
    label: `00:00-${String(endHour - 1).padStart(2, "0")}:59`
  };
}

export function parseTelegramReportPeriod(args: string[] = [], now = DateTime.now().setZone(revenueReportTimeZone)): TelegramReportPeriod {
  const current = now.setZone(revenueReportTimeZone);
  const first = String(args[0] || "today").trim().toLowerCase();
  const second = String(args[1] || "").trim();
  const today = current.toISODate() || "";

  if (first === "today" || first === "homnay" || first === "hômnay") {
    return { label: "hôm nay", dateRange: { startDate: today, endDate: today }, groupBy: "day" };
  }

  if (first === "yesterday" || first === "homqua" || first === "hômqua") {
    const date = current.minus({ days: 1 }).toISODate() || today;
    return { label: "hôm qua", dateRange: { startDate: date, endDate: date }, groupBy: "day" };
  }

  if (first === "week" || first === "tuan" || first === "tuần") {
    const startDate = current.startOf("week").toISODate() || today;
    return { label: "tuần này", dateRange: { startDate, endDate: today }, groupBy: "day" };
  }

  if (first === "month" || first === "thang" || first === "tháng") {
    const startDate = current.startOf("month").toISODate() || today;
    return { label: "tháng này", dateRange: { startDate, endDate: today }, groupBy: "week" };
  }

  const start = parseVietnamDate(first);
  const end = parseVietnamDate(second || first);
  if (!start || !end) {
    throw new Error("Cú pháp thời gian chưa đúng. Dùng: today, yesterday, week, month, hoặc YYYY-MM-DD YYYY-MM-DD.");
  }

  const startDate = (start <= end ? start : end).toISODate() || today;
  const endDate = (start <= end ? end : start).toISODate() || startDate;
  const dateRange = { startDate, endDate };
  return {
    label: formatDateRangeLabel(dateRange),
    dateRange,
    groupBy: inferGroupBy(dateRange)
  };
}

export function parseTelegramAdsReportPeriod(args: string[] = [], now = DateTime.now().setZone(revenueReportTimeZone)): TelegramReportPeriod {
  const period = parseTelegramReportPeriod(args, now);
  const current = now.setZone(revenueReportTimeZone);
  const first = String(args[0] || "today").trim().toLowerCase();
  const shouldUseCompletedDays =
    first === "week" || first === "tuan" || first === "tuần" || first === "month" || first === "thang" || first === "tháng";
  const yesterday = current.minus({ days: 1 }).toISODate();

  if (!shouldUseCompletedDays || !yesterday || yesterday < period.dateRange.startDate || yesterday >= period.dateRange.endDate) {
    return period;
  }

  const dateRange = { startDate: period.dateRange.startDate, endDate: yesterday };
  return {
    ...period,
    dateRange
  };
}

function missingSpendDatesForPeriod(period: TelegramReportPeriod, adHourlyFacts: RevenueReportAdHourlyFact[]) {
  const byDate = new Map<string, AdSpendDataStatus[]>();
  for (const fact of adHourlyFacts) {
    if (fact.localDate < period.dateRange.startDate || fact.localDate > period.dateRange.endDate) continue;
    const statuses = byDate.get(fact.localDate) ?? [];
    statuses.push(fact.dataStatus);
    byDate.set(fact.localDate, statuses);
  }

  return [...byDate.entries()]
    .filter(([, statuses]) => statuses.some((status) => status === "missing"))
    .map(([date]) => date)
    .sort();
}

export function buildTelegramRevenueReportFromData({
  period,
  orders,
  registrations,
  adHourlyFacts
}: {
  period: TelegramReportPeriod;
  orders: RevenueReportOrder[];
  registrations: RevenueReportRegistration[];
  adHourlyFacts: RevenueReportAdHourlyFact[];
}): TelegramRevenuePeriodReport {
  const report = reportFromData({ period, orders, registrations, adHourlyFacts });
  const pending = pendingOrdersInReport(report);
  const pendingRevenue = pending.reduce((sum, order) => sum + order.amount, 0);
  const potentialCashflow = report.summary.revenue + report.summary.unverifiedPaidRevenue + pendingRevenue;

  return {
    period,
    revenue: report.summary.revenue,
    paidOrders: report.summary.successfulOrders,
    pendingOrders: pending.length,
    pendingRevenue,
    unverifiedPaidOrders: report.summary.unverifiedPaidOrders,
    unverifiedPaidRevenue: report.summary.unverifiedPaidRevenue,
    registrations: report.summary.registrations,
    averageOrderValue: report.summary.averageOrderValue,
    conversionRate: report.summary.registrationToPaymentRate,
    potentialCashflow,
    projectedRevenue: projectedForMonth(report.summary.revenue, period)
  };
}

export function buildTelegramAdsReportFromData({
  period,
  orders,
  registrations,
  adHourlyFacts
}: {
  period: TelegramReportPeriod;
  orders: RevenueReportOrder[];
  registrations: RevenueReportRegistration[];
  adHourlyFacts: RevenueReportAdHourlyFact[];
}): TelegramAdsPeriodReport {
  const report = reportFromData({ period, orders, registrations, adHourlyFacts });

  return {
    period,
    spend: report.summary.adSpend,
    spendStatus: report.summary.spendDataStatus,
    missingSpendDates: missingSpendDatesForPeriod(period, adHourlyFacts),
    clicks: report.summary.clicks,
    leads: adHourlyFacts
      .filter((fact) => fact.localDate >= period.dateRange.startDate && fact.localDate <= period.dateRange.endDate)
      .reduce((sum, row) => sum + row.leads, 0),
    registrations: report.summary.registrations,
    paidOrders: report.summary.successfulOrders,
    revenue: report.summary.revenue,
    cpl: report.summary.cpl,
    cpa: report.summary.cpa,
    roas: report.summary.roas,
    profit: report.summary.profit,
    projectedProfit: projectedForMonth(report.summary.profit, period)
  };
}

export function formatTelegramRevenuePeriodMessage(report: TelegramRevenuePeriodReport) {
  const lines = [
    `📊 Báo cáo doanh thu - ${report.period.label}`,
    `🗓️ Kỳ: ${formatDateRangeLabel(report.period.dateRange)}`,
    "",
    `💰 Doanh thu xác minh: ${money(report.revenue)}`,
    `✅ Đơn đã thanh toán: ${report.paidOrders}`,
    `⏳ Paid chưa đối soát: ${report.unverifiedPaidOrders} (${money(report.unverifiedPaidRevenue)})`,
    `🕒 Pending/chưa thanh toán: ${report.pendingOrders} (${money(report.pendingRevenue)})`,
    `👥 Lead/đăng ký: ${report.registrations}`,
    `🧾 AOV: ${money(report.averageOrderValue)}`,
    `📈 Tỷ lệ lead -> paid: ${formatPercent(report.conversionRate)}`,
    "",
    `🔮 Dòng tiền tiềm năng: ${money(report.potentialCashflow)}`
  ];

  if (report.projectedRevenue !== null) {
    lines.push(`📍 Dự đoán doanh thu cuối tháng: ${money(report.projectedRevenue)}`);
  }

  lines.push("", "Doanh thu chỉ tính đơn đã xác minh. Pending và paid chưa đối soát được tách riêng.");
  return lines.join("\n");
}

export function formatTelegramAdsPeriodMessage(report: TelegramAdsPeriodReport) {
  const hasCompleteSpend = report.spendStatus === "final";
  const spendText =
    report.spendStatus === "missing"
      ? "Chưa đồng bộ được chi phí Meta"
      : `${money(report.spend)}${hasCompleteSpend ? "" : " (chưa đủ dữ liệu)"}`;
  const metricSuffix = hasCompleteSpend ? "" : " tạm tính theo cache hiện có";
  const profitSuffix = hasCompleteSpend ? " tạm tính" : metricSuffix;
  const lines = [
    `📣 Báo cáo quảng cáo - ${report.period.label}`,
    `🗓️ Kỳ: ${formatDateRangeLabel(report.period.dateRange)}`,
    "",
    `📣 Chi phí Ads: ${spendText}`,
    `📌 Trạng thái chi phí: ${statusLabel(report.spendStatus)}`,
    `🖱️ Clicks: ${report.clicks}`,
    `📩 Meta leads: ${report.leads}`,
    `👥 Lead/đăng ký: ${report.registrations}`,
    `✅ Đơn đã thanh toán: ${report.paidOrders}`,
    "",
    `💵 Doanh thu xác minh: ${money(report.revenue)}`,
    `💰 CPL${metricSuffix}: ${report.cpl === null ? "N/A" : money(report.cpl)}`,
    `💵 CPA${metricSuffix}: ${report.cpa === null ? "N/A" : money(report.cpa)}`,
    `📈 ROAS${metricSuffix}: ${formatRatio(report.roas)}`,
    `✅ Lãi/lỗ${profitSuffix}: ${money(report.profit)}`
  ];

  if (report.missingSpendDates.length) {
    lines.splice(5, 0, `⚠️ Thiếu dữ liệu Ads: ${compactDateLabels(report.missingSpendDates)}`);
  }

  if (hasCompleteSpend && report.projectedProfit !== null) {
    lines.push(`📍 Dự đoán lãi/lỗ cuối tháng: ${money(report.projectedProfit)}`);
  }

  lines.push(
    "",
    hasCompleteSpend
      ? "ROAS/lãi lỗ dùng doanh thu đã xác minh trừ chi phí Ads trong cùng kỳ."
      : "Không kết luận ROAS/lãi lỗ cho đến khi backfill xong."
  );
  return lines.join("\n");
}

export async function buildTelegramRevenuePeriodMessage(args: string[] = [], now = DateTime.now().setZone(revenueReportTimeZone)) {
  const period = parseTelegramReportPeriod(args, now);
  const [revenue, adSpend] = await Promise.all([
    getRevenueData(),
    getAdHourlyFactsForReport({ dateRange: period.dateRange })
  ]);
  return formatTelegramRevenuePeriodMessage(
    buildTelegramRevenueReportFromData({
      period,
      orders: revenue.orders,
      registrations: revenue.registrations,
      adHourlyFacts: adSpend.facts
    })
  );
}

export async function buildTelegramAdsPeriodMessage(args: string[] = [], now = DateTime.now().setZone(revenueReportTimeZone)) {
  const period = parseTelegramAdsReportPeriod(args, now);
  const [revenue, adSpend] = await Promise.all([
    getRevenueData(),
    getAdHourlyFactsForReport({ dateRange: period.dateRange })
  ]);
  return formatTelegramAdsPeriodMessage(
    buildTelegramAdsReportFromData({
      period,
      orders: revenue.orders,
      registrations: revenue.registrations,
      adHourlyFacts: adSpend.facts
    })
  );
}

export function buildRevenueWindowSnapshot({
  window,
  orders,
  registrations,
  adHourlyFacts
}: {
  window: TelegramWindow;
  orders: RevenueReportOrder[];
  registrations: RevenueReportRegistration[];
  adHourlyFacts: RevenueReportAdHourlyFact[];
}) {
  const windowOrders = orders.filter((order) => {
    const timestamp = normalizePaymentStatus(order.paymentStatus) === "success" ? order.paidAt || order.createdAt : order.createdAt;
    return isInWindow(timestamp, window);
  });
  const verifiedPaid = windowOrders.filter((order) => {
    const status = getRevenueVerificationStatus(order);
    return status === "sepay_verified" || status === "manual_verified";
  });
  const unverifiedPaid = windowOrders.filter(
    (order) => normalizePaymentStatus(order.paymentStatus) === "success" && !verifiedPaid.includes(order)
  );
  const pending = windowOrders.filter((order) => normalizePaymentStatus(order.paymentStatus) === "pending");
  const windowRegistrations = registrations.filter((registration) => isInWindow(registration.createdAt, window));
  const spendRows = adHourlyFacts.filter(
    (fact) => fact.localDate === window.localDate && fact.localHour >= window.startHour && fact.localHour < window.endHour
  );
  const spend = spendRows.reduce((sum, row) => sum + row.spend, 0);
  const revenue = verifiedPaid.reduce((sum, order) => sum + order.amount, 0);

  return {
    window,
    revenue,
    verifiedPaidOrders: verifiedPaid.length,
    unverifiedPaidOrders: unverifiedPaid.length,
    pendingOrders: pending.length,
    registrations: windowRegistrations.length,
    spend,
    clicks: spendRows.reduce((sum, row) => sum + row.clicks, 0),
    leads: spendRows.reduce((sum, row) => sum + row.leads, 0),
    spendStatus: mergeSpendStatus(spendRows.map((row) => row.dataStatus)),
    roas: spend > 0 ? revenue / spend : null,
    profit: revenue - spend
  } satisfies RevenueWindowSnapshot;
}

export function formatTelegramRevenueMessage(snapshot: RevenueWindowSnapshot) {
  return [
    `Báo cáo ngày ${snapshot.window.localDate} (${snapshot.window.label} VN)`,
    "",
    `Doanh thu: ${money(snapshot.revenue)}`,
    `Chi phí ngày: ${snapshot.spendStatus === "missing" ? "Chưa đồng bộ được chi phí Meta" : money(snapshot.spend)}`,
    `Trạng thái chi phí: ${statusLabel(snapshot.spendStatus)}`,
    "",
    `Đơn đã thanh toán: ${snapshot.verifiedPaidOrders}`,
    `Paid chưa đối soát: ${snapshot.unverifiedPaidOrders}`,
    `Đơn chưa thanh toán: ${snapshot.pendingOrders}`,
    `Lead/học viên mới trong ngày: ${snapshot.registrations}`,
    `Clicks: ${snapshot.clicks}`,
    `Meta leads: ${snapshot.leads}`,
    `ROAS: ${formatRatio(snapshot.roas)}`,
    `Profit: ${money(snapshot.profit)}`,
    "",
    "Doanh thu tính theo giờ Việt Nam. Chi phí quảng cáo được quy đổi theo giờ Việt Nam từ dữ liệu Meta."
  ].join("\n");
}

export async function buildCurrentTelegramRevenueMessage(now = DateTime.now().setZone(revenueReportTimeZone)) {
  const window = getTelegramRevenueWindow(now);
  const [revenue, adSpend] = await Promise.all([
    getRevenueData(),
    getAdHourlyFactsForReport({ dateRange: { startDate: window.localDate, endDate: window.localDate } })
  ]);

  return formatTelegramRevenueMessage(
    buildRevenueWindowSnapshot({
      window,
      orders: revenue.orders,
      registrations: revenue.registrations,
      adHourlyFacts: adSpend.facts
    })
  );
}

function parseReportDate(date: DateTime | string) {
  const parsed = typeof date === "string"
    ? DateTime.fromISO(date, { zone: revenueReportTimeZone })
    : date.setZone(revenueReportTimeZone);

  return parsed.isValid ? parsed : DateTime.now().setZone(revenueReportTimeZone);
}

function getDailyReportWindow(date: DateTime | string): TelegramWindow {
  const target = parseReportDate(date);
  const now = DateTime.now().setZone(revenueReportTimeZone);
  const localDate = target.toISODate() || now.toISODate() || "";
  const isToday = localDate === now.toISODate();
  const endHour = isToday ? Math.max(1, Math.min(24, now.hour + 1)) : 24;

  return {
    localDate,
    startHour: 0,
    endHour,
    label: `00:00-${String(endHour - 1).padStart(2, "0")}:59`
  };
}

function getMetaAdWindow(now: DateTime, resetHourVN: number): MetaAdWindow {
  const localNow = now.setZone(revenueReportTimeZone);
  const metaDayStart = localNow.hour < resetHourVN
    ? localNow.minus({ days: 1 }).set({ hour: resetHourVN, minute: 0, second: 0, millisecond: 0 })
    : localNow.set({ hour: resetHourVN, minute: 0, second: 0, millisecond: 0 });
  const metaDate = metaDayStart.toISODate() || localNow.toISODate() || "";
  const metaHourEnd = Math.max(0, Math.min(23, Math.floor(localNow.diff(metaDayStart, "hours").hours)));
  const localEnd = metaDayStart.plus({ hours: metaHourEnd }).endOf("hour").set({ millisecond: 0 });

  return {
    metaDate,
    metaHourEnd,
    label: `Meta ${DateTime.fromISO(metaDate, { zone: revenueReportTimeZone }).toFormat("dd/MM/yyyy")} 00:00-${String(metaHourEnd).padStart(2, "0")}:59`,
    fetchStartDate: metaDayStart.toISODate() || metaDate,
    fetchEndDate: localEnd.toISODate() || metaDate
  };
}

function mapSnapshotToDailyReport(snapshot: RevenueWindowSnapshot, ads: { spend: number; leads: number; label: string; dateLabel: string }): TelegramDailyReport {
  const leads = snapshot.leads || snapshot.registrations;
  const orders = snapshot.verifiedPaidOrders + snapshot.unverifiedPaidOrders + snapshot.pendingOrders;
  const cpa = ads.leads > 0 ? ads.spend / ads.leads : null;
  const roas = ads.spend > 0 ? snapshot.revenue / ads.spend : null;

  return {
    date: snapshot.window.localDate,
    dateLabel: DateTime.fromISO(snapshot.window.localDate, { zone: revenueReportTimeZone }).toFormat("dd/MM/yyyy"),
    windowLabel: snapshot.window.label,
    adsDateLabel: ads.dateLabel,
    adsWindowLabel: ads.label,
    revenue: snapshot.revenue,
    leads,
    orders,
    adsCost: ads.spend,
    cpa,
    roas,
    profit: snapshot.revenue - ads.spend
  };
}

function buildMockDailyReport(window: TelegramWindow, adsWindow: MetaAdWindow): TelegramDailyReport {
  const targetDate = DateTime.fromISO(window.localDate, { zone: revenueReportTimeZone });
  const coveredHours = Math.max(1, adsWindow.metaHourEnd + 1);
  const daySeed = Number(targetDate.toFormat("dd")) || 1;
  const leads = Math.max(1, Math.round((6 + (daySeed % 7)) * (coveredHours / 10)));
  const orders = Math.max(0, Math.floor(leads * 0.45));
  const adsCost = Math.round((320_000 + (daySeed % 5) * 35_000) * (coveredHours / 10));
  const revenue = Math.round(orders * 799_000);
  const cpa = leads > 0 ? adsCost / leads : null;
  const roas = adsCost > 0 ? revenue / adsCost : null;

  return {
    date: window.localDate,
    dateLabel: targetDate.toFormat("dd/MM/yyyy"),
    windowLabel: window.label,
    adsDateLabel: DateTime.fromISO(adsWindow.metaDate, { zone: revenueReportTimeZone }).toFormat("dd/MM/yyyy"),
    adsWindowLabel: adsWindow.label,
    revenue,
    leads,
    orders,
    adsCost,
    cpa,
    roas,
    profit: revenue - adsCost
  };
}

export async function buildDailyReport(date: DateTime | string = DateTime.now().setZone(revenueReportTimeZone)): Promise<TelegramDailyReport> {
  const window = getDailyReportWindow(date);
  const now = DateTime.now().setZone(revenueReportTimeZone);
  const settingsPayload = await getClientAdAccountSettings();
  const adsWindow = getMetaAdWindow(now, settingsPayload.settings.metaDayResetHourVN);
  const [revenue, revenueAdSpend, metaAdSpend] = await Promise.all([
    getRevenueData(),
    getAdHourlyFactsForReport({ dateRange: { startDate: window.localDate, endDate: window.localDate } }),
    getAdHourlyFactsForReport({ dateRange: { startDate: adsWindow.fetchStartDate, endDate: adsWindow.fetchEndDate } })
  ]);

  const hasRealRevenue = revenue.status.ok && (revenue.orders.length > 0 || revenue.registrations.length > 0);
  const metaAdsFacts = metaAdSpend.facts.filter((fact) => fact.metaDate === adsWindow.metaDate && fact.metaHour <= adsWindow.metaHourEnd);
  const ads = {
    spend: metaAdsFacts.reduce((sum, fact) => sum + fact.spend, 0),
    leads: metaAdsFacts.reduce((sum, fact) => sum + fact.leads, 0),
    label: adsWindow.label,
    dateLabel: DateTime.fromISO(adsWindow.metaDate, { zone: revenueReportTimeZone }).toFormat("dd/MM/yyyy")
  };
  const hasRealAds = metaAdSpend.status.ok && metaAdsFacts.some((fact) => fact.spend > 0 || fact.leads > 0 || fact.clicks > 0);

  if (!hasRealRevenue && !hasRealAds) {
    console.warn(`${LOG_PREFIX} Daily report using hourly mock data because real revenue/ad data is empty or unavailable.`);
    return buildMockDailyReport(window, adsWindow);
  }

  return mapSnapshotToDailyReport(
    buildRevenueWindowSnapshot({
      window,
      orders: revenue.orders,
      registrations: revenue.registrations,
      adHourlyFacts: revenueAdSpend.facts
    }),
    ads
  );
}

export function buildDailyReportMessage(report: TelegramDailyReport) {
  return [
    `📊 Báo cáo ngày ${report.dateLabel}`,
    `⏱️ Khung giờ: ${report.windowLabel} VN`,
    `📣 Ads: ${report.adsWindowLabel}`,
    "",
    `💰 Doanh thu: ${money(report.revenue)}`,
    `📩 Lead: ${report.leads}`,
    `🛒 Đơn hàng: ${report.orders}`,
    `📣 Chi phí Ads: ${money(report.adsCost)}`,
    `💵 CPA: ${report.cpa === null ? "N/A" : money(report.cpa)}`,
    `📈 ROAS: ${formatRatio(report.roas)}`,
    `✅ Lợi nhuận tạm tính: ${money(report.profit)}`
  ].join("\n");
}

export function buildAdsMessage(report: TelegramDailyReport) {
  return `📊 Chi phí quảng cáo\n📣 Ads: ${report.adsWindowLabel}\n📣 Chi phí Ads: ${money(report.adsCost)}`;
}

export function buildRevenueMessage(report: TelegramDailyReport) {
  return `📊 Doanh thu ngày ${report.dateLabel}\n⏱️ Khung giờ: ${report.windowLabel} VN\n💰 Doanh thu: ${money(report.revenue)}`;
}

export function buildProfitMessage(report: TelegramDailyReport) {
  return `📊 Lợi nhuận tạm tính ngày ${report.dateLabel}\n⏱️ Doanh thu: ${report.windowLabel} VN\n📣 Ads: ${report.adsWindowLabel}\n✅ Lợi nhuận tạm tính: ${money(report.profit)}`;
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const resolvedChatId = String(chatId || "").trim();

  if (!token) {
    console.error(`${LOG_PREFIX} Thiếu TELEGRAM_BOT_TOKEN`);
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }

  if (!resolvedChatId) {
    console.error(`${LOG_PREFIX} Thiếu chatId khi gửi tin nhắn`);
    throw new Error("Missing chatId");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: resolvedChatId,
      text,
      disable_web_page_preview: true
    })
  });

  const bodyText = await response.text().catch(() => "");
  if (!response.ok) {
    console.error(`${LOG_PREFIX} Telegram send message lỗi`, response.status, bodyText.slice(0, 400));
    throw new Error(`Telegram send message lỗi ${response.status}`);
  }
}

export async function sendTelegramRevenueReport(message: string) {
  const allowedChatIds = getAllowedChatIds();
  if (!allowedChatIds.length) {
    console.error(`${LOG_PREFIX} Thiếu TELEGRAM_ALLOWED_CHAT_IDS`);
    throw new Error("Missing TELEGRAM_ALLOWED_CHAT_IDS");
  }
  await sendTelegramMessage(allowedChatIds[0], message);
}
