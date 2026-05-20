import type {
  AdAccount,
  AdsReport,
  Campaign,
  CampaignInsight,
  DailyInsight,
  NormalizedCampaignPerformance,
  ReportSummary
} from "@/lib/meta/types";

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function findActionValue(actions: CampaignInsight["actions"], names: string[]) {
  return toNumber(actions?.find((item) => names.includes(item.action_type))?.value);
}

function findCostValue(costs: CampaignInsight["cost_per_action_type"], names: string[]) {
  return toNumber(costs?.find((item) => names.includes(item.action_type))?.value);
}

function findRoas(row: CampaignInsight) {
  const roas = row.purchase_roas?.[0]?.value ?? row.website_purchase_roas?.[0]?.value;
  const value = toNumber(roas);
  return value > 0 ? value : null;
}

function findConversionValue(row: CampaignInsight) {
  return findActionValue(row.action_values, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
}

export function normalizeCampaignInsights(rows: CampaignInsight[], campaigns: Campaign[] = []) {
  const statusById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));

  return rows.map<NormalizedCampaignPerformance>((row, index) => {
    const campaign = row.campaign_id ? statusById.get(row.campaign_id) : undefined;
    const leads = findActionValue(row.actions, ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"]);
    const messages = findActionValue(row.actions, ["onsite_conversion.messaging_conversation_started_7d", "messaging_conversation_started_7d"]);
    const purchases = findActionValue(row.actions, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
    const fallbackResults = leads || messages || purchases || findActionValue(row.actions, ["link_click", "landing_page_view"]);
    const spend = toNumber(row.spend);
    const costPerResult =
      findCostValue(row.cost_per_action_type, [
        "lead",
        "onsite_conversion.messaging_conversation_started_7d",
        "messaging_conversation_started_7d",
        "purchase",
        "omni_purchase",
        "link_click"
      ]) || (fallbackResults > 0 ? spend / fallbackResults : 0);

    return {
      campaignId: row.campaign_id || campaign?.id || `campaign-${index}`,
      campaignName: row.campaign_name || campaign?.name || "Campaign không tên",
      status: campaign?.status,
      objective: row.objective || campaign?.objective,
      spend,
      impressions: toNumber(row.impressions),
      reach: toNumber(row.reach),
      frequency: toNumber(row.frequency),
      cpm: toNumber(row.cpm),
      ctr: toNumber(row.ctr),
      cpc: toNumber(row.cpc),
      clicks: toNumber(row.clicks),
      leads,
      messages,
      purchases,
      results: fallbackResults,
      costPerResult,
      roas: findRoas(row),
      conversionValue: findConversionValue(row)
    };
  });
}

export function summarizeCampaigns(rows: NormalizedCampaignPerformance[]): ReportSummary {
  const spend = rows.reduce((sum, row) => sum + row.spend, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const reach = rows.reduce((sum, row) => sum + row.reach, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const totalResults = rows.reduce((sum, row) => sum + row.results, 0);
  const conversionValue = rows.reduce((sum, row) => sum + row.conversionValue, 0);

  return {
    spend,
    impressions,
    reach,
    clicks,
    averageCtr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    averageCpc: clicks > 0 ? spend / clicks : 0,
    averageCpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    totalResults,
    costPerResult: totalResults > 0 ? spend / totalResults : 0,
    roas: spend > 0 && conversionValue > 0 ? conversionValue / spend : null,
    conversionValue
  };
}

export function buildRuleBasedInsights(summary: ReportSummary, campaigns: NormalizedCampaignPerformance[]) {
  if (!campaigns.length) return ["Chưa có dữ liệu campaign trong khoảng thời gian này."];

  const sortedBySpend = [...campaigns].sort((a, b) => b.spend - a.spend);
  const sortedByCtr = [...campaigns].sort((a, b) => b.ctr - a.ctr);
  const sortedByCpc = [...campaigns].filter((item) => item.cpc > 0).sort((a, b) => a.cpc - b.cpc);
  const insights: string[] = [];

  if (sortedBySpend[0]?.spend > 0) {
    insights.push(`Campaign chi tiêu cao nhất là "${sortedBySpend[0].campaignName}" với ${formatMoney(sortedBySpend[0].spend)}.`);
  }

  if (sortedByCtr[0]?.ctr > 0) {
    insights.push(`CTR tốt nhất hiện thuộc về "${sortedByCtr[0].campaignName}" (${formatPercent(sortedByCtr[0].ctr)}).`);
  }

  if (sortedByCpc[0]) {
    insights.push(`CPC thấp nhất là "${sortedByCpc[0].campaignName}" (${formatMoney(sortedByCpc[0].cpc)} mỗi nhấp).`);
  }

  const highCost = campaigns.find((item) => summary.costPerResult > 0 && item.costPerResult > summary.costPerResult * 1.4);
  if (highCost) {
    insights.push(`"${highCost.campaignName}" có chi phí mỗi kết quả cao hơn mặt bằng chung, nên kiểm tra lại offer, tệp và creative.`);
  }

  if (campaigns.some((item) => item.frequency > 3)) {
    insights.push("Một số campaign có frequency trên 3, có dấu hiệu lặp quảng cáo. Nên chuẩn bị creative mới hoặc mở rộng tệp.");
  }

  if (summary.averageCtr > 0 && summary.averageCtr < 1) {
    insights.push("CTR trung bình dưới 1%, nên kiểm tra hook, hình ảnh/video và thông điệp đầu quảng cáo.");
  }

  if (summary.averageCpm > 100000) {
    insights.push("CPM đang cao, nên kiểm tra độ rộng tệp, placement và mức cạnh tranh của ngành trong giai đoạn này.");
  }

  return insights;
}

export function buildAdsReport({
  account,
  campaigns,
  insights,
  daily,
  startDate,
  endDate
}: {
  account: AdAccount | null;
  campaigns: Campaign[];
  insights: CampaignInsight[];
  daily: DailyInsight[];
  startDate: string;
  endDate: string;
}): AdsReport {
  const normalized = normalizeCampaignInsights(insights, campaigns);
  const summary = summarizeCampaigns(normalized);

  return {
    account,
    dateRange: { startDate, endDate },
    summary,
    campaigns: normalized,
    daily,
    insights: buildRuleBasedInsights(summary, normalized)
  };
}

export function formatMoney(value: number, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2
  }).format(value || 0);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(value || 0));
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value || 0)}%`;
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportReportToCSV(report: AdsReport) {
  const accountId = report.account?.id ?? "unknown";
  const rows = [
    ["Báo cáo Ads"],
    ["Tài khoản", report.account?.name ?? "", accountId],
    ["Khoảng thời gian", report.dateRange.startDate, report.dateRange.endDate],
    [],
    ["Tổng chi tiêu", report.summary.spend],
    ["Tổng lượt hiển thị", report.summary.impressions],
    ["Reach", report.summary.reach],
    ["CTR trung bình", report.summary.averageCtr],
    ["CPC trung bình", report.summary.averageCpc],
    ["CPM trung bình", report.summary.averageCpm],
    ["Tổng kết quả", report.summary.totalResults],
    ["Chi phí mỗi kết quả", report.summary.costPerResult],
    ["ROAS", report.summary.roas ?? ""],
    ["Conversion value", report.summary.conversionValue],
    [],
    [
      "Campaign name",
      "Status",
      "Objective",
      "Spend",
      "Impressions",
      "Reach",
      "CTR",
      "CPC",
      "CPM",
      "Results",
      "Cost/result",
      "ROAS"
    ],
    ...report.campaigns.map((campaign) => [
      campaign.campaignName,
      campaign.status ?? "",
      campaign.objective ?? "",
      campaign.spend,
      campaign.impressions,
      campaign.reach,
      campaign.ctr,
      campaign.cpc,
      campaign.cpm,
      campaign.results,
      campaign.costPerResult,
      campaign.roas ?? ""
    ])
  ];

  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}
