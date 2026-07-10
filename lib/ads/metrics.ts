import type { CreativePerformance, DailyInsight, MetaIntelligenceDashboardData, NormalizedCampaignPerformance } from "@/lib/meta/types";

export type AdsMetricKey = "spend" | "impressions" | "reach" | "clicks" | "ctr" | "cpc" | "cpm" | "messages" | "leads" | "purchases" | "registrations" | "cpl" | "cpa" | "roas";
export type TrendDirection = "up" | "down" | "flat";
export type MetricQuality = "good" | "bad" | "neutral";

export type KpiViewModel = {
  key: AdsMetricKey;
  label: string;
  value: string;
  rawValue: number;
  delta?: number | null;
  quality: MetricQuality;
  sparkline: number[];
  hint: string;
};

export type DailyMetricRow = {
  date: string;
  label: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  messages: number;
  leads: number;
  purchases: number;
  registrations: number;
  conversions: number;
  cpl: number;
  cpa: number;
  roas: number;
};

export type BreakdownRow = {
  id: string;
  name: string;
  type: "campaign" | "adset" | "ad" | "creative";
  status?: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  leads: number;
  messages: number;
  purchases: number;
  registrations: number;
  conversions: number;
  cpl: number;
  cpa: number;
  roas: number | null;
  note: string;
  quality: MetricQuality;
};

export type BudgetSlice = {
  label: string;
  value: number;
};

export type WeeklyRow = {
  label: string;
  spend: number;
  messages: number;
  leads: number;
  conversions: number;
  cpl: number;
};

export type AdsAnalyticsModel = {
  currency: string;
  kpis: KpiViewModel[];
  daily: DailyMetricRow[];
  campaigns: BreakdownRow[];
  adsets: BreakdownRow[];
  ads: BreakdownRow[];
  creatives: BreakdownRow[];
  weekly: WeeklyRow[];
  budgetMix: BudgetSlice[];
  topCampaigns: BreakdownRow[];
  bottomCampaigns: BreakdownRow[];
  topCreatives: BreakdownRow[];
};

const messageActions = new Set([
  "onsite_conversion.messaging_conversation_started_7d",
  "messaging_conversation_started_7d",
  "onsite_conversion.messaging_first_reply",
  "onsite_conversion.total_messaging_connection"
]);

const purchaseActions = new Set(["purchase", "omni_purchase", "onsite_conversion.purchase", "offsite_conversion.fb_pixel_purchase"]);
const leadActions = new Set(["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"]);
const registrationActions = new Set(["complete_registration", "omni_complete_registration", "onsite_conversion.complete_registration", "offsite_conversion.fb_pixel_complete_registration"]);

export function toMetricNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDateLabel(date?: string) {
  if (!date) return "--";
  const [, month, day] = date.split("-");
  return month && day ? `${day}/${month}` : date;
}

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits }).format(value || 0);
}

export function formatMoney(value: number, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", { currency, maximumFractionDigits: 0, style: "currency" }).format(value || 0);
}

export function formatCompactMoney(value: number) {
  const abs = Math.abs(value || 0);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(".", ",")} tỷ đ`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")} tr đ`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}k đ`;
  return `${formatNumber(value)} đ`;
}

export function formatPercent(value: number) {
  return `${(value || 0).toFixed(2)}%`;
}

export function metricLabel(metric: AdsMetricKey) {
  const labels: Record<AdsMetricKey, string> = {
    spend: "Spend",
    impressions: "Impressions",
    reach: "Reach",
    clicks: "Clicks",
    ctr: "CTR",
    cpc: "CPC",
    cpm: "CPM",
    messages: "Tin nhắn",
    leads: "Leads",
    purchases: "Lượt mua",
    registrations: "Hoàn tất đăng ký",
    cpl: "CPL",
    cpa: "CPA",
    roas: "ROAS"
  };
  return labels[metric];
}

export function formatMetric(metric: AdsMetricKey, value: number, currency = "VND") {
  if (metric === "spend" || metric === "cpc" || metric === "cpm" || metric === "cpl" || metric === "cpa") return formatMoney(value, currency);
  if (metric === "ctr") return formatPercent(value);
  if (metric === "roas") return value > 0 ? value.toFixed(2) : "N/A";
  return formatNumber(value);
}

export function metricValue(row: DailyMetricRow | BreakdownRow, metric: AdsMetricKey) {
  return row[metric] ?? 0;
}

function actionTotal(row: Pick<DailyInsight, "actions">, types: Set<string>) {
  return (row.actions ?? []).reduce((sum, action) => {
    if (!types.has(action.action_type)) return sum;
    return sum + toMetricNumber(action.value);
  }, 0);
}

function metricDelta(current: number, previous: number) {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function qualityForDelta(metric: AdsMetricKey, delta?: number | null): MetricQuality {
  if (delta === null || delta === undefined || Math.abs(delta) < 0.01) return "neutral";
  const lowerIsBetter = new Set<AdsMetricKey>(["cpc", "cpm", "cpl", "cpa"]);
  const higherIsBetter = new Set<AdsMetricKey>(["clicks", "ctr", "messages", "leads", "purchases", "registrations", "roas", "impressions", "reach"]);
  if (lowerIsBetter.has(metric)) return delta < 0 ? "good" : "bad";
  if (higherIsBetter.has(metric)) return delta > 0 ? "good" : "bad";
  return "neutral";
}

function rowQuality(row: BreakdownRow): MetricQuality {
  if (row.conversions > 0 && row.cpl > 0 && row.ctr >= 1) return "good";
  if (row.spend > 0 && row.conversions === 0) return "bad";
  if (row.ctr > 0 && row.ctr < 0.8) return "bad";
  return "neutral";
}

function rowNote(row: Omit<BreakdownRow, "note" | "quality">) {
  if (row.spend > 0 && row.conversions === 0) return "Chi tiêu nhưng chưa có conversion, cần kiểm tra creative/audience.";
  if (row.cpl > 0 && row.ctr >= 1) return "Có conversion và CTR ổn, có thể giữ hoặc scale có kiểm soát.";
  if (row.ctr > 0 && row.ctr < 0.8) return "CTR thấp, nên kiểm tra hook, ảnh và placement.";
  if (row.cpc > 0 && row.cpc > 10_000) return "CPC cao, cần xem lại target hoặc creative.";
  return "Đang ổn định, tiếp tục theo dõi thêm dữ liệu.";
}

function dailyRows(rows: DailyInsight[]): DailyMetricRow[] {
  return rows.map((row) => {
    const spend = toMetricNumber(row.spend);
    const messages = actionTotal(row, messageActions);
    const leads = actionTotal(row, leadActions);
    const purchases = actionTotal(row, purchaseActions);
    const registrations = actionTotal(row, registrationActions);
    const conversions = messages + leads + purchases + registrations;
    return {
      date: row.date_start,
      label: formatDateLabel(row.date_start),
      spend,
      impressions: toMetricNumber(row.impressions),
      reach: toMetricNumber(row.reach),
      clicks: toMetricNumber(row.clicks),
      ctr: toMetricNumber(row.ctr),
      cpc: toMetricNumber(row.cpc),
      cpm: toMetricNumber(row.cpm),
      messages,
      leads,
      purchases,
      registrations,
      conversions,
      cpl: messages + leads > 0 ? spend / (messages + leads) : 0,
      cpa: purchases + registrations > 0 ? spend / (purchases + registrations) : 0,
      roas: 0
    };
  });
}

function campaignRows(rows: NormalizedCampaignPerformance[]): BreakdownRow[] {
  return rows.map((campaign) => {
    const conversions = campaign.messages + campaign.leads + campaign.purchases;
    const base = {
      id: campaign.campaignId,
      name: campaign.campaignName,
      type: "campaign" as const,
      status: campaign.status,
      spend: campaign.spend,
      impressions: campaign.impressions,
      reach: campaign.reach,
      clicks: campaign.clicks,
      ctr: campaign.ctr,
      cpc: campaign.cpc,
      cpm: campaign.cpm,
      leads: campaign.leads,
      messages: campaign.messages,
      purchases: campaign.purchases,
      registrations: 0,
      conversions,
      cpl: campaign.leads + campaign.messages > 0 ? campaign.spend / (campaign.leads + campaign.messages) : 0,
      cpa: campaign.purchases > 0 ? campaign.spend / campaign.purchases : 0,
      roas: campaign.roas
    };
    return { ...base, note: rowNote(base), quality: rowQuality({ ...base, note: "", quality: "neutral" }) };
  });
}

function creativeRows(rows: CreativePerformance[]): BreakdownRow[] {
  return rows.map((creative) => {
    const conversions = creative.leads + creative.messages;
    const base = {
      id: creative.creativeId || creative.adId,
      name: creative.creativeName || creative.adName || creative.adId,
      type: "creative" as const,
      status: creative.adStatus,
      spend: creative.spend,
      impressions: creative.impressions,
      reach: creative.reach,
      clicks: creative.engagements,
      ctr: creative.ctr,
      cpc: creative.cpc,
      cpm: creative.cpm,
      leads: creative.leads,
      messages: creative.messages,
      purchases: 0,
      registrations: 0,
      conversions,
      cpl: creative.cpl ?? 0,
      cpa: 0,
      roas: null
    };
    return { ...base, note: rowNote(base), quality: rowQuality({ ...base, note: "", quality: "neutral" }) };
  });
}

function adRows(rows: CreativePerformance[]): BreakdownRow[] {
  return rows.map((creative) => {
    const conversions = creative.leads + creative.messages;
    const base = {
      id: creative.adId,
      name: creative.adName || creative.adId,
      type: "adset" as const,
      status: creative.adStatus,
      spend: creative.spend,
      impressions: creative.impressions,
      reach: creative.reach,
      clicks: creative.engagements,
      ctr: creative.ctr,
      cpc: creative.cpc,
      cpm: creative.cpm,
      leads: creative.leads,
      messages: creative.messages,
      purchases: 0,
      registrations: 0,
      conversions,
      cpl: creative.cpl ?? 0,
      cpa: 0,
      roas: null
    };
    return { ...base, note: rowNote(base), quality: rowQuality({ ...base, note: "", quality: "neutral" }) };
  });
}

function adsetRows(rows: CreativePerformance[]): BreakdownRow[] {
  const grouped = rows.reduce<Record<string, CreativePerformance[]>>((acc, row) => {
    const key = row.adsetId || row.adsetName || "unknown-adset";
    acc[key] = [...(acc[key] ?? []), row];
    return acc;
  }, {});

  return Object.entries(grouped).map(([id, items]) => {
    const spend = items.reduce((sum, row) => sum + row.spend, 0);
    const impressions = items.reduce((sum, row) => sum + row.impressions, 0);
    const engagements = items.reduce((sum, row) => sum + row.engagements, 0);
    const reach = items.reduce((sum, row) => sum + row.reach, 0);
    const leads = items.reduce((sum, row) => sum + row.leads, 0);
    const messages = items.reduce((sum, row) => sum + row.messages, 0);
    const conversions = leads + messages;
    const base = {
      id,
      name: items[0]?.adsetName || id,
      type: "ad" as const,
      status: items[0]?.adStatus,
      spend,
      impressions,
      reach,
      clicks: engagements,
      ctr: impressions > 0 ? (engagements / impressions) * 100 : 0,
      cpc: engagements > 0 ? spend / engagements : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      leads,
      messages,
      purchases: 0,
      registrations: 0,
      conversions,
      cpl: conversions > 0 ? spend / conversions : 0,
      cpa: 0,
      roas: null
    };
    return { ...base, note: rowNote(base), quality: rowQuality({ ...base, note: "", quality: "neutral" }) };
  });
}

function weeklyRows(rows: DailyMetricRow[]): WeeklyRow[] {
  const output: WeeklyRow[] = [];
  for (let index = 0; index < rows.length; index += 7) {
    const slice = rows.slice(index, index + 7);
    if (!slice.length) continue;
    const spend = slice.reduce((sum, row) => sum + row.spend, 0);
    const messages = slice.reduce((sum, row) => sum + row.messages, 0);
    const leads = slice.reduce((sum, row) => sum + row.leads, 0);
    const conversions = slice.reduce((sum, row) => sum + row.conversions, 0);
    output.push({
      label: `${slice[0]?.label}-${slice[slice.length - 1]?.label}`,
      spend,
      messages,
      leads,
      conversions,
      cpl: messages + leads > 0 ? spend / (messages + leads) : 0
    });
  }
  return output;
}

function budgetMix(rows: BreakdownRow[]): BudgetSlice[] {
  const grouped = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.status || "UNKNOWN";
    acc[key] = (acc[key] ?? 0) + row.spend;
    return acc;
  }, {});
  return Object.entries(grouped).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function kpi({ key, rawValue, delta, sparkline, hint, currency }: { key: AdsMetricKey; rawValue: number; delta?: number | null; sparkline: number[]; hint: string; currency: string }): KpiViewModel {
  return {
    key,
    label: metricLabel(key),
    value: formatMetric(key, rawValue, currency),
    rawValue,
    delta,
    quality: qualityForDelta(key, delta),
    sparkline,
    hint
  };
}

export function buildAdsAnalytics(data: MetaIntelligenceDashboardData | null, compareEnabled: boolean): AdsAnalyticsModel {
  const currency = data?.selectedAccount?.currency || "VND";
  const report = data?.report;
  const summary = report?.summary;
  const daily = dailyRows(report?.daily ?? []);
  const campaigns = campaignRows(report?.campaigns ?? []);
  const adsets = adsetRows(data?.creatives ?? []);
  const ads = adRows(data?.creatives ?? []);
  const creatives = creativeRows(data?.creatives ?? []);
  const comparison = compareEnabled ? data?.comparison : null;
  const totalMessages = daily.reduce((sum, row) => sum + row.messages, 0) || campaigns.reduce((sum, row) => sum + row.messages, 0);
  const totalLeads = daily.reduce((sum, row) => sum + row.leads, 0) || campaigns.reduce((sum, row) => sum + row.leads, 0);
  const totalPurchases = daily.reduce((sum, row) => sum + row.purchases, 0) || campaigns.reduce((sum, row) => sum + row.purchases, 0);
  const totalRegistrations = daily.reduce((sum, row) => sum + row.registrations, 0);
  const spend = summary?.spend ?? 0;
  const cpl = totalMessages + totalLeads > 0 ? spend / (totalMessages + totalLeads) : summary?.costPerResult ?? 0;
  const cpa = totalPurchases + totalRegistrations > 0 ? spend / (totalPurchases + totalRegistrations) : 0;

  const kpis = [
    kpi({ key: "spend", rawValue: spend, delta: comparison?.spend, sparkline: daily.map((row) => row.spend), hint: "Tổng ngân sách đã chi trong kỳ", currency }),
    kpi({ key: "impressions", rawValue: summary?.impressions ?? 0, sparkline: daily.map((row) => row.impressions), hint: "Số lần quảng cáo được hiển thị", currency }),
    kpi({ key: "reach", rawValue: summary?.reach ?? 0, sparkline: daily.map((row) => row.reach), hint: "Số người tiếp cận nếu Meta trả dữ liệu", currency }),
    kpi({ key: "clicks", rawValue: summary?.clicks ?? 0, sparkline: daily.map((row) => row.clicks), hint: "Tổng click trong kỳ", currency }),
    kpi({ key: "ctr", rawValue: summary?.averageCtr ?? 0, sparkline: daily.map((row) => row.ctr), hint: "Click-through rate trung bình", currency }),
    kpi({ key: "cpc", rawValue: summary?.averageCpc ?? 0, sparkline: daily.map((row) => row.cpc), hint: "Chi phí trung bình mỗi click", currency }),
    kpi({ key: "cpm", rawValue: summary?.averageCpm ?? 0, sparkline: daily.map((row) => row.cpm), hint: "Chi phí mỗi 1.000 impressions", currency }),
    kpi({ key: "messages", rawValue: totalMessages, delta: comparison?.messages, sparkline: daily.map((row) => row.messages), hint: "Action tin nhắn từ Meta", currency }),
    kpi({ key: "leads", rawValue: totalLeads, delta: comparison?.leads, sparkline: daily.map((row) => row.leads), hint: "Lead action từ Meta", currency }),
    kpi({ key: "purchases", rawValue: totalPurchases, sparkline: daily.map((row) => row.purchases), hint: "Purchase action từ Meta", currency }),
    kpi({ key: "registrations", rawValue: totalRegistrations, sparkline: daily.map((row) => row.registrations), hint: "Complete registration action", currency }),
    kpi({ key: "cpl", rawValue: cpl, delta: comparison?.cpl, sparkline: daily.map((row) => row.cpl), hint: "Spend / lead hoặc tin nhắn", currency }),
    kpi({ key: "cpa", rawValue: cpa, sparkline: daily.map((row) => row.cpa), hint: "Spend / purchase hoặc registration", currency }),
    kpi({ key: "roas", rawValue: summary?.roas ?? 0, sparkline: [], hint: "Chỉ hiện khi Meta trả conversion value", currency })
  ];

  return {
    currency,
    kpis,
    daily,
    campaigns,
    adsets,
    ads,
    creatives,
    weekly: weeklyRows(daily),
    budgetMix: budgetMix(campaigns),
    topCampaigns: [...campaigns].sort((a, b) => b.conversions - a.conversions).slice(0, 6),
    bottomCampaigns: [...campaigns].filter((row) => row.spend > 0).sort((a, b) => b.spend - a.spend || a.conversions - b.conversions).slice(0, 6),
    topCreatives: [...creatives].sort((a, b) => b.conversions - a.conversions || b.ctr - a.ctr).slice(0, 6)
  };
}
