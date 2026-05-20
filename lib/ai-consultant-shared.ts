import { z } from "zod";
import type { CampaignBuilderInput, CampaignBuilderMode } from "@/lib/meta/types";

export const aiConsultantPlanSchema = z.object({
  mode: z.enum(["new_campaign", "scale_campaign", "ab_test"]).default("new_campaign"),
  objective: z.string().default("Tin nhắn"),
  product: z.string().default(""),
  dailyBudget: z.coerce.number().default(0),
  location: z.string().default("Việt Nam"),
  ageRange: z.string().default("25-44"),
  gender: z.string().default("Tất cả"),
  pageId: z.string().default(""),
  postId: z.string().default(""),
  audienceDescription: z.string().default(""),
  recommendedStructure: z.enum(["1-1-1", "1-3-3", "custom"]).default("1-1-1"),
  reason: z.string().default(""),
  campaignDraft: z.record(z.string(), z.unknown()).default({}),
  missingFields: z.array(z.string()).default([]),
  canCreatePreview: z.boolean().default(false)
});

export type AIConsultantPlan = z.infer<typeof aiConsultantPlanSchema>;

export type AIConsultantResponse = {
  advice: string;
  plan: AIConsultantPlan;
  raw: string;
};

export const consultantResponseSchema = z.object({
  advice: z.string().default(""),
  plan: aiConsultantPlanSchema
});

function normalizeObjective(value: string): CampaignBuilderInput["objective"] {
  const lower = value.toLowerCase();
  if (lower.includes("lead")) return "Lead";
  if (lower.includes("traffic") || lower.includes("truy cập")) return "Traffic";
  if (lower.includes("sale") || lower.includes("chuyển đổi") || lower.includes("conversion")) return "Sales";
  if (lower.includes("tương tác") || lower.includes("engagement")) return "Tương tác";
  return "Tin nhắn";
}

export function mapAIPlanToCampaignInput(plan: AIConsultantPlan, current: CampaignBuilderInput): CampaignBuilderInput {
  return {
    ...current,
    productName: plan.product || current.productName,
    objective: normalizeObjective(plan.objective),
    dailyBudget: plan.dailyBudget ? String(plan.dailyBudget) : current.dailyBudget,
    location: plan.location || current.location,
    ageRange: plan.ageRange || current.ageRange,
    gender: plan.gender || current.gender,
    pageId: plan.pageId || current.pageId,
    postId: plan.postId || current.postId,
    targetCustomer: plan.audienceDescription || current.targetCustomer,
    structureMode: plan.recommendedStructure || current.structureMode
  };
}

export function mapAIPlanMode(mode: AIConsultantPlan["mode"]): CampaignBuilderMode {
  if (mode === "scale_campaign") return "scale_existing";
  if (mode === "ab_test") return "ab_test";
  return "new_campaign";
}
