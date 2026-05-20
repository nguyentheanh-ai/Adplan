import type {
  AccountOverviewRow,
  AdsReport,
  ComparisonDelta,
  CreativePerformance,
  DateRange,
  IntelligenceInsight,
  MetaIntelligenceDashboardData,
  NormalizedCampaignPerformance,
  ReportSummary
} from "@/lib/meta/types";
import { buildAdsReport, normalizeCampaignInsights, normalizeCreativePerformance, normalizeMetaActions, summarizeCampaigns, toNumber } from "@/lib/reports/ads-report";
import type { AccountInsight, AdAccount, Campaign, CampaignInsight, DailyInsight, MetaAdWithCreative } from "@/lib/meta/types";

function percentDelta(current: number, previous: number) {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

export function getPreviousDateRange(dateRange: DateRange): DateRange {
  const start = new Date(`${dateRange.startDate}T00:00:00`);
  const end = new Date(`${dateRange.endDate}T00:00:00`);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - days + 1);

  return {
    startDate: previousStart.toISOString().slice(0, 10),
    endDate: previousEnd.toISOString().slice(0, 10)
  };
}

export function summarizeAccountInsights(rows: AccountInsight[]) {
  const normalized = normalizeCampaignInsights(rows as CampaignInsight[], []);
  return summarizeCampaigns(normalized);
}

export function buildAccountOverviewRow(account: AdAccount, rows: AccountInsight[] = [], dataStatus?: string): AccountOverviewRow {
  const summary = summarizeAccountInsights(rows);
  const actions = rows.reduce(
    (total, row) => {
      const actionMetrics = normalizeMetaActions(row.actions, row.cost_per_action_type, toNumber(row.spend));
      return {
        leads: total.leads + actionMetrics.leads,
        messages: total.messages + actionMetrics.messages
      };
    },
    { leads: 0, messages: 0 }
  );

  return {
    ...account,
    periodSpend: summary.spend,
    periodLeads: actions.leads,
    periodMessages: actions.messages,
    dataStatus
  };
}

function compareSummaries(current: ReportSummary, previous: ReportSummary): ComparisonDelta {
  return {
    spend: percentDelta(current.spend, previous.spend),
    leads: percentDelta(current.totalResults, previous.totalResults),
    messages: 0,
    cpl: percentDelta(current.costPerResult, previous.costPerResult)
  };
}

function buildCreativeInsights(creatives: CreativePerformance[]) {
  if (!creatives.length) return [];
  const sortedByLead = [...creatives].sort((a, b) => b.leads - a.leads);
  const sortedByMessage = [...creatives].sort((a, b) => b.messages - a.messages);
  const sortedByEngagement = [...creatives].sort((a, b) => b.engagements - a.engagements);
  const sortedByCpl = [...creatives].filter((item) => item.cpl !== null).sort((a, b) => (a.cpl ?? 0) - (b.cpl ?? 0));
  const insights: IntelligenceInsight[] = [];

  const winner =
    sortedByLead[0]?.leads > 0
      ? sortedByLead[0]
      : sortedByMessage[0]?.messages > 0
        ? sortedByMessage[0]
        : sortedByEngagement[0];

  if (winner && (winner.leads > 0 || winner.messages > 0 || winner.engagements > 0)) {
    insights.push({
      type: "winner",
      title: "Creative thắng",
      reason: `"${winner.creativeName}" đang nổi bật với ${winner.leads} lead, ${winner.messages} tin nhắn và ${winner.engagements} tương tác.`
    });
  }

  const poor = creatives.find((item) => item.spend > 0 && item.leads === 0 && item.messages === 0);
  if (poor) {
    insights.push({
      type: "check",
      title: "Creative cần test lại",
      reason: `"${poor.creativeName}" đã chi ${poor.spend.toLocaleString("vi-VN")} nhưng chưa có lead hoặc tin nhắn.`
    });
  }

  if (sortedByCpl[0]) {
    insights.push({
      type: "scale",
      title: "Nên tăng ngân sách",
      reason: `"${sortedByCpl[0].creativeName}" có CPL tốt nhất (${(sortedByCpl[0].cpl ?? 0).toLocaleString("vi-VN")}).`
    });
  }

  return insights;
}

export function buildIntelligenceInsights({
  report,
  creatives,
  comparison,
  accounts
}: {
  report: AdsReport | null;
  creatives: CreativePerformance[];
  comparison: ComparisonDelta;
  accounts: AccountOverviewRow[];
}): IntelligenceInsight[] {
  const insights: IntelligenceInsight[] = [];
  const campaigns = report?.campaigns ?? [];

  if (!report || (!campaigns.length && !creatives.length)) {
    return [{ type: "neutral", title: "Cần thêm dữ liệu", reason: "Cần thêm dữ liệu để phân tích chính xác hơn." }];
  }

  const wasteCampaign = campaigns.find((item) => item.spend > 0 && item.leads === 0 && item.messages === 0);
  if (wasteCampaign) {
    insights.push({
      type: "warning",
      title: "Campaign đốt tiền",
      reason: `"${wasteCampaign.campaignName}" đã chi ${wasteCampaign.spend.toLocaleString("vi-VN")} nhưng chưa có lead hoặc tin nhắn.`
    });
  }

  const lowCtr = campaigns.find((item) => item.ctr > 0 && item.ctr < 1);
  if (lowCtr) {
    insights.push({
      type: "check",
      title: "CTR thấp",
      reason: `"${lowCtr.campaignName}" có CTR ${lowCtr.ctr.toFixed(2)}%, nên kiểm tra hook và creative.`
    });
  }

  const bestCpl = campaigns.filter((item) => item.leads > 0).sort((a, b) => a.spend / a.leads - b.spend / b.leads)[0];
  if (bestCpl) {
    insights.push({
      type: "scale",
      title: "CPL tốt nhất",
      reason: `"${bestCpl.campaignName}" đang có CPL ${(bestCpl.spend / bestCpl.leads).toLocaleString("vi-VN")} với ${bestCpl.leads} lead.`
    });
  }

  const abnormalAccount = accounts.find((account) => account.periodSpend > 0 && account.periodLeads + account.periodMessages === 0);
  if (abnormalAccount) {
    insights.push({
      type: "warning",
      title: "Chi tiêu bất thường",
      reason: `${abnormalAccount.name || abnormalAccount.id} có chi tiêu nhưng chưa có lead/tin nhắn trong kỳ đang xem.`
    });
  }

  if (Math.abs(comparison.spend) > 20 || Math.abs(comparison.leads) > 20 || Math.abs(comparison.cpl) > 20) {
    insights.push({
      type: comparison.cpl > 20 ? "warning" : "neutral",
      title: "So sánh kỳ trước",
      reason: `Chi tiêu ${comparison.spend.toFixed(1)}%, kết quả ${comparison.leads.toFixed(1)}%, chi phí/kết quả ${comparison.cpl.toFixed(1)}%.`
    });
  }

  insights.push(...buildCreativeInsights(creatives));

  return insights.length ? insights : [{ type: "neutral", title: "Cần thêm dữ liệu", reason: "Cần thêm dữ liệu để phân tích chính xác hơn." }];
}

export function buildMetaIntelligenceDashboardData({
  accounts,
  selectedAccount,
  dateRange,
  campaigns,
  campaignInsights,
  daily,
  previousInsights,
  ads,
  creativeAccessWarning
}: {
  accounts: AccountOverviewRow[];
  selectedAccount: AccountOverviewRow | null;
  dateRange: DateRange;
  campaigns: Campaign[];
  campaignInsights: CampaignInsight[];
  daily: DailyInsight[];
  previousInsights: CampaignInsight[];
  ads: MetaAdWithCreative[];
  creativeAccessWarning?: string;
}): MetaIntelligenceDashboardData {
  const report = selectedAccount
    ? buildAdsReport({
        account: selectedAccount,
        campaigns,
        insights: campaignInsights,
        daily,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
    : null;

  const previousSummary = summarizeCampaigns(normalizeCampaignInsights(previousInsights, campaigns));
  const comparison = report
    ? compareSummaries(report.summary, previousSummary)
    : {
        spend: 0,
        leads: 0,
        messages: 0,
        cpl: 0
      };
  const creatives = normalizeCreativePerformance(ads);

  return {
    accounts,
    selectedAccount,
    report,
    creatives,
    creativeAccessWarning,
    comparison,
    intelligence: buildIntelligenceInsights({ report, creatives, comparison, accounts })
  };
}

export function campaignMetricValue(row: NormalizedCampaignPerformance, metric: string) {
  if (metric === "spend") return row.spend;
  if (metric === "messages") return row.messages;
  if (metric === "leads") return row.leads;
  if (metric === "cpc") return row.cpc;
  if (metric === "cpm") return row.cpm;
  if (metric === "cpl") return row.leads > 0 ? row.spend / row.leads : 0;
  if (metric === "ctr") return row.ctr;
  if (metric === "impressions") return row.impressions;
  if (metric === "reach") return row.reach;
  if (metric === "frequency") return row.frequency;
  if (metric === "results") return row.results;
  if (metric === "costPerResult") return row.costPerResult;
  return row.spend;
}
