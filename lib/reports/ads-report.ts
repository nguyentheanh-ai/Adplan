import type {
  AdAccount,
  AdsReport,
  Campaign,
  CampaignInsight,
  DailyInsight,
  MetaAdWithCreative,
  NormalizedCampaignPerformance,
  NormalizedActions,
  CreativePerformance,
  ReportSummary
} from "@/lib/meta/types";

export function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function findActionValue(actions: CampaignInsight["actions"], names: string[]) {
  return toNumber(actions?.find((item) => names.includes(item.action_type))?.value);
}

function findCostValue(costs: CampaignInsight["cost_per_action_type"], names: string[]) {
  return toNumber(costs?.find((item) => names.includes(item.action_type))?.value);
}

const leadActionTypes = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"];
const messageActionTypes = [
  "onsite_conversion.messaging_conversation_started_7d",
  "messaging_conversation_started_7d",
  "onsite_conversion.messaging_first_reply",
  "onsite_conversion.total_messaging_connection",
  "post_engagement"
];
const purchaseActionTypes = ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"];
const clickActionTypes = ["link_click", "landing_page_view"];

export function normalizeMetaActions(
  actions: CampaignInsight["actions"],
  costs: CampaignInsight["cost_per_action_type"],
  spend = 0
): NormalizedActions {
  const leads = findActionValue(actions, leadActionTypes);
  const messages = findActionValue(actions, messageActionTypes);
  const purchases = findActionValue(actions, purchaseActionTypes);
  const linkClicks = findActionValue(actions, clickActionTypes);
  const results = leads || messages || purchases || linkClicks;
  const costPerLead = findCostValue(costs, leadActionTypes) || (leads > 0 ? spend / leads : 0);
  const costPerMessage = findCostValue(costs, messageActionTypes) || (messages > 0 ? spend / messages : 0);

  return { leads, messages, purchases, linkClicks, results, costPerLead, costPerMessage };
}

export function calculateDerivedMetrics({
  spend,
  clicks,
  impressions,
  leads,
  messages,
  results
}: {
  spend: number;
  clicks: number;
  impressions: number;
  leads: number;
  messages: number;
  results: number;
}) {
  return {
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpl: leads > 0 ? spend / leads : null,
    costPerMessage: messages > 0 ? spend / messages : null,
    costPerResult: results > 0 ? spend / results : 0
  };
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
    const spend = toNumber(row.spend);
    const actionMetrics = normalizeMetaActions(row.actions, row.cost_per_action_type, spend);
    const derived = calculateDerivedMetrics({
      spend,
      clicks: toNumber(row.clicks),
      impressions: toNumber(row.impressions),
      leads: actionMetrics.leads,
      messages: actionMetrics.messages,
      results: actionMetrics.results
    });
    const costPerResult =
      findCostValue(row.cost_per_action_type, [
        ...leadActionTypes,
        ...messageActionTypes,
        ...purchaseActionTypes,
        ...clickActionTypes
      ]) || derived.costPerResult;

    return {
      campaignId: row.campaign_id || campaign?.id || `campaign-${index}`,
      campaignName: row.campaign_name || campaign?.name || "Campaign không tên",
      status: campaign?.status,
      objective: row.objective || campaign?.objective,
      spend,
      impressions: toNumber(row.impressions),
      reach: toNumber(row.reach),
      frequency: toNumber(row.frequency),
      cpm: toNumber(row.cpm) || derived.cpm,
      ctr: toNumber(row.ctr) || derived.ctr,
      cpc: toNumber(row.cpc) || derived.cpc,
      clicks: toNumber(row.clicks),
      leads: actionMetrics.leads,
      messages: actionMetrics.messages,
      purchases: actionMetrics.purchases,
      results: actionMetrics.results,
      costPerResult,
      roas: findRoas(row),
      conversionValue: findConversionValue(row)
    };
  });
}

function getCreativeFormat(ad: MetaAdWithCreative): CreativePerformance["format"] {
  const creative = ad.creative;
  if (!creative) return "unknown";
  if (creative.asset_feed_spec) return "dynamic";
  if (creative.object_story_spec?.link_data?.child_attachments?.length) return "carousel";
  if (creative.video_id || creative.object_story_spec?.video_data) return "video";
  if (creative.thumbnail_url || creative.image_url || creative.object_story_spec?.link_data) return "image";
  return "unknown";
}

function getCreativeLandingUrl(ad: MetaAdWithCreative) {
  const creative = ad.creative;
  return (
    creative?.object_story_spec?.link_data?.call_to_action?.value?.link ||
    creative?.object_story_spec?.video_data?.call_to_action?.value?.link ||
    creative?.object_story_spec?.link_data?.link ||
    ""
  );
}

export function normalizeCreativePerformance(ads: MetaAdWithCreative[]): CreativePerformance[] {
  return ads.map((ad) => {
    const insight = ad.insights?.data?.[0] ?? {};
    const spend = toNumber(insight.spend);
    const actions = normalizeMetaActions(insight.actions, insight.cost_per_action_type, spend);
    const derived = calculateDerivedMetrics({
      spend,
      clicks: toNumber(insight.clicks),
      impressions: toNumber(insight.impressions),
      leads: actions.leads,
      messages: actions.messages,
      results: actions.results
    });
    const creative = ad.creative;
    const linkData = creative?.object_story_spec?.link_data;
    const videoData = creative?.object_story_spec?.video_data;

    return {
      adId: ad.id,
      adName: ad.name || "Ad không tên",
      adStatus: ad.status,
      campaignId: ad.campaign_id || ad.campaign?.id,
      campaignName: ad.campaign?.name || "Campaign không tên",
      adsetId: ad.adset_id || ad.adset?.id,
      adsetName: ad.adset?.name || "Ad set không tên",
      creativeId: creative?.id || "Không có dữ liệu",
      creativeName: creative?.name || ad.name || "Creative không tên",
      thumbnailUrl: creative?.thumbnail_url || creative?.image_url || linkData?.child_attachments?.[0]?.picture,
      body: creative?.body || linkData?.message || videoData?.message || "Không có dữ liệu từ Meta API",
      headline: creative?.title || linkData?.name || videoData?.title || "Không có dữ liệu từ Meta API",
      description: creative?.description || linkData?.description || "Không có dữ liệu từ Meta API",
      cta: creative?.call_to_action_type || linkData?.call_to_action?.type || videoData?.call_to_action?.type || "Không có dữ liệu từ Meta API",
      landingUrl: getCreativeLandingUrl(ad) || "Không có dữ liệu từ Meta API",
      postId: creative?.effective_object_story_id || "Không có dữ liệu từ Meta API",
      format: getCreativeFormat(ad),
      spend,
      impressions: toNumber(insight.impressions),
      reach: toNumber(insight.reach),
      frequency: toNumber(insight.frequency),
      ctr: toNumber(insight.ctr) || derived.ctr,
      cpc: toNumber(insight.cpc) || derived.cpc,
      cpm: toNumber(insight.cpm) || derived.cpm,
      leads: actions.leads,
      messages: actions.messages,
      cpl: actions.leads > 0 ? spend / actions.leads : null,
      costPerMessage: actions.messages > 0 ? spend / actions.messages : null
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
