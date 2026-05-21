import type { CreativePerformance, NormalizedCampaignPerformance } from "@/lib/meta/types";

export type OptimizationRecommendationDraft = {
  entityType: "campaign" | "adset" | "ad" | "creative" | "account";
  entityId: string;
  entityName: string;
  recommendationType: "scale_budget" | "reduce_budget" | "pause_review" | "refresh_creative" | "duplicate_winner" | "collect_more_data";
  priority: "low" | "medium" | "high";
  title: string;
  reason: string;
  expectedImpact: string;
  actionPayload: Record<string, unknown>;
  evidence: Record<string, unknown>;
};

export type OptimizationRecommendationContext = {
  industryKey?: string | null;
  businessModel?: string | null;
  offerType?: string | null;
  averageOrderValue?: number | null;
  targetCustomer?: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);
}

function contextSummary(context?: OptimizationRecommendationContext) {
  if (!context || !context.industryKey || context.industryKey === "unknown") return "";
  const parts = [
    `ngành ${context.industryKey}`,
    context.businessModel ? `mô hình ${context.businessModel}` : "",
    context.offerType ? `offer ${context.offerType}` : "",
    context.targetCustomer ? `tệp ${context.targetCustomer}` : ""
  ].filter(Boolean);
  return parts.length ? `Ngữ cảnh đã lưu: ${parts.join(", ")}.` : "";
}

function attachContext(
  recommendations: OptimizationRecommendationDraft[],
  context?: OptimizationRecommendationContext
): OptimizationRecommendationDraft[] {
  const summary = contextSummary(context);
  if (!summary) return recommendations;

  return recommendations.map((item) => ({
    ...item,
    reason: `${item.reason} ${summary}`,
    evidence: {
      ...item.evidence,
      account_context: context
    }
  }));
}

export function buildCampaignOptimizationRecommendations(
  campaigns: NormalizedCampaignPerformance[]
): OptimizationRecommendationDraft[] {
  if (!campaigns.length) {
    return [
      {
        entityType: "account",
        entityId: "account",
        entityName: "Tài khoản quảng cáo",
        recommendationType: "collect_more_data",
        priority: "low",
        title: "Cần thêm dữ liệu",
        reason: "Chưa có campaign đủ dữ liệu trong khoảng thời gian này.",
        expectedImpact: "App sẽ phân tích chính xác hơn sau khi có thêm chi tiêu/kết quả.",
        actionPayload: {},
        evidence: { campaign_count: 0 }
      }
    ];
  }

  const recommendations: OptimizationRecommendationDraft[] = [];
  const campaignsWithResult = campaigns.filter((item) => item.results > 0 && item.spend > 0);
  const averageCostPerResult =
    campaignsWithResult.reduce((sum, item) => sum + item.spend, 0) /
    Math.max(1, campaignsWithResult.reduce((sum, item) => sum + item.results, 0));
  const best = [...campaignsWithResult].sort((a, b) => a.costPerResult - b.costPerResult)[0];

  if (best && best.costPerResult > 0 && (averageCostPerResult === 0 || best.costPerResult <= averageCostPerResult * 0.8)) {
    recommendations.push({
      entityType: "campaign",
      entityId: best.campaignId,
      entityName: best.campaignName,
      recommendationType: "scale_budget",
      priority: "high",
      title: "Nên tăng ngân sách campaign thắng",
      reason: `"${best.campaignName}" đang có chi phí/kết quả ${money(best.costPerResult)}, tốt hơn mặt bằng hiện tại.`,
      expectedImpact: "Tăng ngân sách từng bước 10-20% giúp mở rộng kết quả mà vẫn hạn chế sốc thuật toán.",
      actionPayload: { suggested_budget_increase_percent: 15, status_after_apply: "PAUSED_REVIEW_REQUIRED" },
      evidence: best
    });
  }

  for (const campaign of campaigns) {
    if (campaign.spend > 0 && campaign.results === 0) {
      recommendations.push({
        entityType: "campaign",
        entityId: campaign.campaignId,
        entityName: campaign.campaignName,
        recommendationType: "pause_review",
        priority: "high",
        title: "Campaign đang chi nhưng chưa ra kết quả",
        reason: `"${campaign.campaignName}" đã chi ${money(campaign.spend)} nhưng chưa có lead/tin nhắn/purchase/link click được ghi nhận.`,
        expectedImpact: "Kiểm tra offer, tệp khách hàng và creative trước khi tiếp tục tăng chi.",
        actionPayload: { suggested_action: "review_or_pause", require_manual_approval: true },
        evidence: campaign
      });
    }

    if (campaign.ctr > 0 && campaign.ctr < 1 && campaign.spend > 0) {
      recommendations.push({
        entityType: "campaign",
        entityId: campaign.campaignId,
        entityName: campaign.campaignName,
        recommendationType: "refresh_creative",
        priority: "medium",
        title: "CTR thấp, cần đổi hook/creative",
        reason: `"${campaign.campaignName}" có CTR ${campaign.ctr.toFixed(2)}%, dấu hiệu mẫu quảng cáo chưa đủ hút.`,
        expectedImpact: "Viết lại 3 hook đầu, đổi thumbnail/video mở đầu để tăng tỷ lệ nhấp.",
        actionPayload: { suggested_action: "create_new_creative_variants", variant_count: 3 },
        evidence: campaign
      });
    }

    if (campaign.frequency > 3 && campaign.spend > 0) {
      recommendations.push({
        entityType: "campaign",
        entityId: campaign.campaignId,
        entityName: campaign.campaignName,
        recommendationType: "refresh_creative",
        priority: "medium",
        title: "Có dấu hiệu lặp quảng cáo",
        reason: `"${campaign.campaignName}" có frequency ${campaign.frequency.toFixed(2)}, khách có thể đã thấy quảng cáo nhiều lần.`,
        expectedImpact: "Thêm creative mới hoặc mở rộng tệp để giảm mỏi quảng cáo.",
        actionPayload: { suggested_action: "refresh_creative_or_expand_audience" },
        evidence: campaign
      });
    }
  }

  return recommendations.slice(0, 20);
}

export function buildCreativeOptimizationRecommendations(creatives: CreativePerformance[]): OptimizationRecommendationDraft[] {
  const recommendations: OptimizationRecommendationDraft[] = [];
  const winners = [...creatives]
    .filter((item) => item.spend > 0 && (item.leads > 0 || item.messages > 0 || item.engagements > 0))
    .sort((a, b) => b.leads + b.messages + b.engagements - (a.leads + a.messages + a.engagements))
    .slice(0, 3);

  for (const creative of winners) {
    recommendations.push({
      entityType: "creative",
      entityId: creative.creativeId || creative.adId,
      entityName: creative.creativeName,
      recommendationType: "duplicate_winner",
      priority: "medium",
      title: "Creative đang thắng, nên nhân bản concept",
      reason: `"${creative.creativeName}" đang tạo ${creative.leads} lead, ${creative.messages} tin nhắn và ${creative.engagements} tương tác.`,
      expectedImpact: "Tạo thêm 3 biến thể cùng concept giúp test rộng mà không phải nghĩ lại từ đầu.",
      actionPayload: { suggested_action: "create_variants_from_winner", variant_count: 3, source_post_url: creative.postUrl },
      evidence: creative
    });
  }

  const spendNoResult = creatives.filter((item) => item.spend > 0 && item.leads === 0 && item.messages === 0 && item.engagements === 0);
  for (const creative of spendNoResult.slice(0, 5)) {
    recommendations.push({
      entityType: "creative",
      entityId: creative.creativeId || creative.adId,
      entityName: creative.creativeName,
      recommendationType: "pause_review",
      priority: "high",
      title: "Creative tiêu tiền nhưng chưa có tín hiệu",
      reason: `"${creative.creativeName}" đã chi ${money(creative.spend)} nhưng chưa có lead/tin nhắn/tương tác.`,
      expectedImpact: "Tạm dừng hoặc thay hook/media để tránh đốt ngân sách.",
      actionPayload: { suggested_action: "review_or_pause_creative", require_manual_approval: true },
      evidence: creative
    });
  }

  return recommendations;
}

export function buildOptimizationRecommendations({
  campaigns,
  creatives,
  context
}: {
  campaigns: NormalizedCampaignPerformance[];
  creatives: CreativePerformance[];
  context?: OptimizationRecommendationContext;
}) {
  return attachContext(
    [...buildCampaignOptimizationRecommendations(campaigns), ...buildCreativeOptimizationRecommendations(creatives)].slice(0, 30),
    context
  );
}
