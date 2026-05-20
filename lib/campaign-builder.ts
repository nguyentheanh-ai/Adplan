import type {
  AudienceSuggestion,
  ABTestDraft,
  ABTestVariantDraft,
  CampaignBuilderInput,
  CampaignPlannerDraft,
  CampaignDraft,
  ScaleCampaignInput,
  CampaignValidationItem,
  CreativeAsset,
  Campaign
} from "@/lib/meta/types";
import { normalizeMetaActions } from "./reports/ads-report";

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

function dateParts(value: string) {
  const [year, month, day] = (value || new Date().toISOString().slice(0, 10)).split("-");
  return { day: day || "01", month: month || "01", year: year || "2026" };
}

function capitalizeWord(value: string) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function normalizeVietnameseText(text: unknown, fallback = "KhongRo", maxLength = 42) {
  const raw = String(text ?? "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .trim();

  const compact = raw
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.split("-").map(capitalizeWord).join(""))
    .join("");

  return (compact || fallback).slice(0, maxLength);
}

function normalizeWithDash(text: unknown, fallback = "KhongRo", maxLength = 42) {
  const raw = String(text ?? "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .trim();

  const compact = raw
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.split("-").map(capitalizeWord).join("-"))
    .join("");

  return (compact || fallback).slice(0, maxLength);
}

export function generateCampaignCode(adAccountId?: string | null, sequence = 0) {
  const digits = String(adAccountId || "").replace(/\D/g, "");
  const suffix = (digits.slice(-4) || "0000").padStart(4, "0");
  const sequenceText = String(Math.max(0, Number(sequence) || 0)).padStart(2, "0").slice(-2);
  return `${suffix}${sequenceText}`;
}

function objectiveName(objective: CampaignBuilderInput["objective"]) {
  const map: Record<CampaignBuilderInput["objective"], string> = {
    "Tin nhắn": "TinNhan",
    "Tương tác": "TuongTac",
    Lead: "Lead",
    "Chuyển đổi": "ChuyenDoi",
    Traffic: "Traffic",
    Sales: "Sales"
  };
  return map[objective] || normalizeVietnameseText(objective, "MucTieu");
}

function postLabelFrom(input: Pick<CampaignBuilderInput, "postId" | "postMessage" | "offer" | "productName">) {
  if (input.postId) {
    const digits = input.postId.replace(/\D/g, "").slice(-2);
    return digits ? `Post${digits.padStart(2, "0")}` : "Post01";
  }
  return normalizeVietnameseText(input.postMessage || input.offer || input.productName, "Post01", 18);
}

export function generateCampaignName(data: {
  date: string;
  objective: CampaignBuilderInput["objective"];
  productName?: string;
  audienceName?: string;
  postLabel?: string;
}) {
  const parts = dateParts(data.date);
  return [
    parts.day,
    parts.month,
    objectiveName(data.objective),
    normalizeVietnameseText(data.productName, "SanPham", 24),
    normalizeVietnameseText(data.audienceName, "TepKhach", 24),
    normalizeVietnameseText(data.postLabel, "Post01", 18)
  ].join("_");
}

export function generateAdsetName(data: { campaignCode: string; audienceName?: string; ageRange?: string }) {
  return [
    normalizeVietnameseText(data.campaignCode, "000000", 8),
    normalizeVietnameseText(data.audienceName, "TepKhach", 28),
    normalizeWithDash(data.ageRange, "25-44", 8)
  ].join("_");
}

export function generateAdName(data: { campaignCode: string; postText?: string; fallback?: string }) {
  const words = String(data.postText || data.fallback || "Quang cao")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ");
  return [normalizeVietnameseText(data.campaignCode, "000000", 8), normalizeVietnameseText(words, "QuangCao", 24)].join("_");
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type ScaleSourceRow = {
  campaignId: string;
  name: string;
  status: string;
  objective: string;
  budget: number;
  budgetType: "daily" | "lifetime" | "none";
  spend: number;
  impressions: number;
  results: number;
  leads: number;
  messages: number;
  createdTime: string;
};

export function buildScaleSourceRows(campaigns: Campaign[]): ScaleSourceRow[] {
  return campaigns.map((campaign) => {
    const insight = campaign.insight ?? null;
    const spend = toNumber(insight?.spend);
    const actions = normalizeMetaActions(insight?.actions, insight?.cost_per_action_type, spend);
    const dailyBudget = toNumber(campaign.daily_budget);
    const lifetimeBudget = toNumber(campaign.lifetime_budget);

    return {
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status || "UNKNOWN",
      objective: campaign.objective || "UNKNOWN",
      budget: dailyBudget || lifetimeBudget,
      budgetType: dailyBudget ? "daily" : lifetimeBudget ? "lifetime" : "none",
      spend,
      impressions: toNumber(insight?.impressions),
      results: actions.results,
      leads: actions.leads,
      messages: actions.messages,
      createdTime: campaign.created_time || ""
    };
  });
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
  const campaignCode = input.campaignCode || generateCampaignCode(input.adAccountId, 0);
  const postLabel = postLabelFrom(input);
  const structureMode = input.structureMode || "1-1-1";
  const adsetCount = structureMode === "1-3-3" ? 3 : structureMode === "custom" ? Math.max(1, Math.min(input.adsetCount || 1, 10)) : 1;
  const adsPerAdset = structureMode === "1-3-3" ? 3 : structureMode === "custom" ? Math.max(1, Math.min(input.adsPerAdset || 1, 10)) : 1;
  const ageRange = input.ageRange || "25-44";
  const gender = input.gender || "Tất cả";
  const selectedInterests = interests.length ? interests : buildInternalAudienceSuggestions(input);
  const schedule = input.runContinuously
    ? `Từ ${input.startDate || "ngày bắt đầu"} và chạy liên tục`
    : `${input.startDate || "ngày bắt đầu"} đến ${input.endDate || "ngày kết thúc"}`;
  const pageLabel = input.fanpage || input.pageName || "Chưa chọn fanpage";
  const campaignName = generateCampaignName({
    date: input.startDate,
    objective: input.objective,
    productName: input.productName,
    audienceName: input.targetCustomer || input.industry,
    postLabel
  });
  const buildAd = (adIndex: number) => ({
    name: `${generateAdName({ campaignCode, postText: input.postMessage || input.offer || input.productName })}${adsPerAdset > 1 ? `_Ad${String(adIndex + 1).padStart(2, "0")}` : ""}`,
    fanpage: pageLabel,
    media: pickMedia(input),
    primaryText: `${input.offer ? `${input.offer}\n\n` : ""}${product} dành cho ${audience}. ${input.notes || "Tập trung vào lợi ích rõ ràng, bằng chứng tin cậy và lời kêu gọi hành động cụ thể."}`,
    headline: input.offer || `${product} cho ${audience}`,
    description: input.website ? "Nhấn để xem chi tiết ưu đãi." : "Nhắn tin để được tư vấn nhanh.",
    cta: objective.cta,
    url: input.website || undefined
  });
  const adsets = Array.from({ length: adsetCount }, (_, adsetIndex) => ({
    name: `${generateAdsetName({ campaignCode, audienceName: input.targetCustomer || input.industry, ageRange })}${adsetCount > 1 ? `_Nhom${adsetIndex + 1}` : ""}`,
    ageRange,
    gender,
    location,
    interests: selectedInterests,
    behaviors: ["Tương tác với quảng cáo", "Quan tâm sản phẩm/dịch vụ liên quan"],
    placement: "Advantage+ placements",
    optimizationGoal: objective.optimization,
    billingEvent: objective.billingEvent,
    ads: Array.from({ length: adsPerAdset }, (_, adIndex) => buildAd(adIndex))
  }));

  return {
    campaign: {
      code: campaignCode,
      name: campaignName,
      objective: objective.meta,
      budget: input.dailyBudget ? `${input.dailyBudget}/ngày` : "Chưa nhập ngân sách",
      schedule,
      status: "PAUSED"
    },
    adSet: adsets[0],
    ads: adsets[0].ads[0],
    adsets,
    naming: {
      campaignNameFormat: "Ngày_Tháng_Mục tiêu_Sản phẩm_Tệp_Post",
      adsetNameFormat: "Mã chiến dịch_Tệp_Độ tuổi",
      adNameFormat: "Mã chiến dịch_3 chữ đầu nội dung"
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
  if (!draft.name.trim()) errors.push("Cần đặt tên bài test A/B.");
  if (!draft.hypothesis.trim()) errors.push("Cần mô tả ngắn bạn muốn test gì.");
  if (!draft.schedule.startDate || !draft.schedule.endDate) errors.push("Cần chọn lịch chạy test.");
  if (draft.variants.length < 2) errors.push("Cần ít nhất 2 biến thể để test A/B.");
  const variantValues = draft.variants.map((variant) => String(variant.payload.value || variant.name).trim()).filter(Boolean);
  if (variantValues.length >= 2 && new Set(variantValues).size !== variantValues.length) {
    errors.push("Các biến thể không được trùng dữ liệu ở yếu tố đang test.");
  }

  const totalSplit = Object.values(draft.budgetSplit).reduce((sum, value) => sum + Number(value || 0), 0);
  if (draft.variants.length >= 2 && Math.abs(totalSplit - 100) > 0.01) {
    errors.push("Tổng phân bổ ngân sách phải bằng 100%.");
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
      value: name,
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
