import type { AudienceSuggestion, CampaignBuilderInput, CampaignDraft } from "@/lib/meta/types";

const objectiveMap: Record<CampaignBuilderInput["objective"], { meta: string; optimization: string; cta: string }> = {
  "Tin nhắn": { meta: "OUTCOME_ENGAGEMENT", optimization: "CONVERSATIONS", cta: "Gửi tin nhắn" },
  Lead: { meta: "OUTCOME_LEADS", optimization: "LEADS", cta: "Đăng ký" },
  Traffic: { meta: "OUTCOME_TRAFFIC", optimization: "LINK_CLICKS", cta: "Tìm hiểu thêm" },
  Engagement: { meta: "OUTCOME_ENGAGEMENT", optimization: "POST_ENGAGEMENT", cta: "Tìm hiểu thêm" },
  Sales: { meta: "OUTCOME_SALES", optimization: "OFFSITE_CONVERSIONS", cta: "Mua ngay" }
};

function compactDate(value: string) {
  return value ? value.replaceAll("-", "") : new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function slugLabel(value: string, fallback: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 42) || fallback;
}

export function buildInternalAudienceSuggestions(input: CampaignBuilderInput): AudienceSuggestion[] {
  const seeds = [
    input.industry,
    input.productName,
    input.targetCustomer,
    input.offer,
    "Mua sắm trực tuyến",
    "Kinh doanh địa phương"
  ]
    .join(" ")
    .split(/[,\n.]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);

  const unique = Array.from(new Set(seeds.length ? seeds : ["Khách hàng tiềm năng", "Người quan tâm sản phẩm tương tự"]));

  return unique.map((name, index) => ({
    id: `internal-${index + 1}`,
    name,
    source: "internal"
  }));
}

export function generateCampaignDraft(input: CampaignBuilderInput, interests: AudienceSuggestion[] = []): CampaignDraft {
  const objective = objectiveMap[input.objective];
  const product = slugLabel(input.productName, "Sản phẩm");
  const audience = slugLabel(input.targetCustomer || input.industry, "Tệp khách hàng");
  const location = slugLabel(input.location, "Việt Nam");
  const date = compactDate(input.startDate);
  const selectedInterests = interests.length ? interests : buildInternalAudienceSuggestions(input);
  const schedule = input.runContinuously
    ? `Từ ${input.startDate || "ngày bắt đầu"} và chạy liên tục`
    : `${input.startDate || "ngày bắt đầu"} đến ${input.endDate || "ngày kết thúc"}`;

  return {
    campaign: {
      name: `[${objective.meta}] - ${product} - ${date}`,
      objective: objective.meta,
      budget: input.dailyBudget ? `${input.dailyBudget}/ngày` : "Chưa nhập ngân sách",
      schedule,
      status: "PAUSED"
    },
    adSet: {
      name: `${audience} - 25-44 - ${location}`,
      ageRange: "25-44",
      gender: "Tất cả",
      location,
      interests: selectedInterests,
      behaviors: ["Tương tác với quảng cáo", "Quan tâm sản phẩm/dịch vụ liên quan"],
      placement: "Advantage+ placements",
      optimizationGoal: objective.optimization,
      billingEvent: "IMPRESSIONS"
    },
    ads: {
      name: `Image/Video - ${slugLabel(input.offer || input.productName, "Hook chính")} - ${date}`,
      fanpage: input.fanpage || "Chưa chọn fanpage",
      media: {
        id: "media-placeholder",
        type: "placeholder",
        name: input.mediaNote || "Chọn media sau"
      },
      primaryText: `${input.offer ? `${input.offer}\n\n` : ""}${product} dành cho ${audience}. ${input.notes || "Tập trung vào lợi ích rõ ràng, bằng chứng tin cậy và lời kêu gọi hành động cụ thể."}`,
      headline: input.offer || `${product} cho ${audience}`,
      description: input.website ? "Nhấn để xem chi tiết ưu đãi." : "Nhắn tin để được tư vấn nhanh.",
      cta: objective.cta,
      url: input.website || undefined
    },
    naming: {
      campaignNameFormat: "[Objective] - [Product] - [Date]",
      adsetNameFormat: "[Audience] - [Age] - [Location]",
      adNameFormat: "[CreativeType] - [Hook] - [Date]"
    }
  };
}
