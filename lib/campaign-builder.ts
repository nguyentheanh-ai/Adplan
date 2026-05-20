import type {
  AudienceSuggestion,
  ABTestDraft,
  ABTestVariantDraft,
  CampaignBuilderInput,
  CampaignPlannerDraft,
  CampaignDraft,
  ScaleCampaignInput,
  CampaignValidationItem,
  CreativeAsset
} from "@/lib/meta/types";

const objectiveMap: Record<
  CampaignBuilderInput["objective"],
  { meta: string; optimization: string; cta: string; billingEvent: string; requiresPost: boolean; requiresLanding: boolean }
> = {
  "Tin nhắn": {
    meta: "OUTCOME_ENGAGEMENT",
    optimization: "CONVERSATIONS",
    cta: "Gửi tin nhắn",
    billingEvent: "IMPRESSIONS",
    requiresPost: true,
    requiresLanding: false
  },
  "Tương tác": {
    meta: "OUTCOME_ENGAGEMENT",
    optimization: "POST_ENGAGEMENT",
    cta: "Tìm hiểu thêm",
    billingEvent: "IMPRESSIONS",
    requiresPost: true,
    requiresLanding: false
  },
  Lead: {
    meta: "OUTCOME_LEADS",
    optimization: "LEADS",
    cta: "Đăng ký",
    billingEvent: "IMPRESSIONS",
    requiresPost: false,
    requiresLanding: false
  },
  "Chuyển đổi": {
    meta: "OUTCOME_SALES",
    optimization: "OFFSITE_CONVERSIONS",
    cta: "Mua ngay",
    billingEvent: "IMPRESSIONS",
    requiresPost: false,
    requiresLanding: true
  },
  Traffic: {
    meta: "OUTCOME_TRAFFIC",
    optimization: "LINK_CLICKS",
    cta: "Tìm hiểu thêm",
    billingEvent: "IMPRESSIONS",
    requiresPost: false,
    requiresLanding: true
  },
  Sales: {
    meta: "OUTCOME_SALES",
    optimization: "OFFSITE_CONVERSIONS",
    cta: "Mua ngay",
    billingEvent: "IMPRESSIONS",
    requiresPost: false,
    requiresLanding: true
  }
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
    source: "internal" as const
  }));
}

function pickMedia(input: CampaignBuilderInput): CreativeAsset {
  const firstMedia = input.mediaFiles?.[0];
  if (firstMedia) {
    return {
      id: `media-${compactDate(input.startDate)}-${Math.random().toString(36).slice(2, 8)}`,
      type: firstMedia.match(/\.(mp4|mov|avi|webm)$/i) ? "video" : "image",
      name: firstMedia,
      url: firstMedia
    };
  }

  return {
    id: "media-placeholder",
    type: "placeholder",
    name: input.mediaNote || "Chọn media sau"
  };
}

export function buildCampaignValidation(input: CampaignBuilderInput): CampaignValidationItem[] {
  const objective = objectiveMap[input.objective];
  return [
    { key: "adAccountId", label: "Tài khoản quảng cáo", ok: Boolean(input.adAccountId) },
    { key: "productName", label: "Sản phẩm / dịch vụ", ok: Boolean(input.productName.trim()) },
    { key: "industry", label: "Ngành hàng", ok: Boolean(input.industry.trim()) },
    { key: "budget", label: "Ngân sách mỗi ngày", ok: Boolean(input.dailyBudget.trim()) },
    { key: "fanpage", label: "Fanpage", ok: Boolean(input.pageId && input.fanpage.trim()) },
    {
      key: "post",
      label: "Bài viết Page (cho Tin nhắn/Tương tác)",
      ok: !objective.requiresPost || Boolean(input.postId),
      note: objective.requiresPost ? undefined : "Không bắt buộc với mục tiêu này"
    },
    {
      key: "landing",
      label: "Landing page / website (cho Chuyển đổi/Traffic/Sales)",
      ok: !objective.requiresLanding || Boolean(input.website?.trim()),
      note: objective.requiresLanding ? undefined : "Không bắt buộc với mục tiêu này"
    },
    {
      key: "media",
      label: "Media quảng cáo",
      ok: Boolean(input.mediaFiles?.length || input.mediaNote?.trim()),
      note: "Nếu thiếu vẫn có thể bổ sung trực tiếp trong Ads Manager"
    }
  ];
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
  const pageLabel = input.fanpage || input.pageName || "Chưa chọn fanpage";

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
      billingEvent: objective.billingEvent
    },
    ads: {
      name: `Image/Video - ${slugLabel(input.offer || input.productName, "Hook chính")} - ${date}`,
      fanpage: pageLabel,
      media: pickMedia(input),
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

export function generateScalePreview(input: ScaleCampaignInput): CampaignPlannerDraft {
  const quantity = Math.max(1, Math.min(Number(input.quantity || 1), 20));
  const actionLabel =
    input.action === "clone_campaign"
      ? "Nhan ban chien dich"
      : input.action === "clone_adset"
        ? "Nhan ban nhom quang cao"
        : "Nang ngan sach";

  const warnings = [
    input.action === "increase_budget"
      ? "Thay doi ngan sach can duoc kiem tra truoc khi ap dung len Meta."
      : "Campaign clone se duoc tao o trang thai PAUSED."
  ];

  if (!input.sourceCampaignId && input.action !== "clone_adset") {
    warnings.push("Chua chon campaign nguon.");
  }
  if (!input.sourceAdsetId && input.action === "clone_adset") {
    warnings.push("Chua chon nhom quang cao nguon.");
  }

  return {
    mode: "scale_existing",
    accountId: input.adAccountId,
    title: `${actionLabel} x${quantity}`,
    scale: { ...input, quantity },
    warnings,
    metaPayload: {
      action: input.action,
      source_campaign_id: input.sourceCampaignId,
      source_adset_id: input.sourceAdsetId,
      quantity,
      new_budget: input.newBudget,
      status: "PAUSED"
    }
  };
}

export function validateABTestConfig(draft: ABTestDraft) {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push("Can dat ten bai test A/B.");
  if (!draft.hypothesis.trim()) errors.push("Can co gia thuyet test.");
  if (!draft.schedule.startDate || !draft.schedule.endDate) errors.push("Can chon lich chay test.");
  if (draft.variants.length < 2) errors.push("Can it nhat 2 bien the de test A/B.");

  const totalSplit = Object.values(draft.budgetSplit).reduce((sum, value) => sum + Number(value || 0), 0);
  if (draft.variants.length >= 2 && Math.abs(totalSplit - 100) > 0.01) {
    errors.push("Tong phan bo ngan sach phai bang 100%.");
  }

  return { ok: errors.length === 0, errors };
}

export function createABTestDraft(input: {
  name: string;
  hypothesis: string;
  testVariable: ABTestDraft["testVariable"];
  schedule: ABTestDraft["schedule"];
  minimumSpend: string;
  variants: string[];
}): ABTestDraft {
  const names = input.variants.map((item) => item.trim()).filter(Boolean);
  const split = names.length ? Math.floor((100 / names.length) * 100) / 100 : 0;
  const budgetSplit = names.reduce<Record<string, number>>((acc, name, index) => {
    acc[name] = index === names.length - 1 ? Math.round((100 - split * (names.length - 1)) * 100) / 100 : split;
    return acc;
  }, {});

  const variants: ABTestVariantDraft[] = names.map((name, index) => ({
    id: `variant-${index + 1}`,
    name,
    variable: input.testVariable,
    payload: {
      label: name,
      status: "PAUSED"
    }
  }));

  return {
    name: input.name,
    hypothesis: input.hypothesis,
    testVariable: input.testVariable,
    budgetSplit,
    schedule: input.schedule,
    winnerRule: {
      metric: input.testVariable === "creative" ? "ctr" : "results",
      minimumSpend: input.minimumSpend
    },
    variants
  };
}
