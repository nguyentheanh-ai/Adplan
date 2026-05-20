import { describe, expect, it } from "vitest";
import { aiConsultantPlanSchema, mapAIPlanMode, mapAIPlanToCampaignInput } from "./ai-consultant-shared";
import type { CampaignBuilderInput } from "@/lib/meta/types";

const baseInput: CampaignBuilderInput = {
  adAccountId: "act_1234",
  productName: "",
  industry: "",
  objective: "Tin nhắn",
  dailyBudget: "",
  startDate: "2026-05-21",
  runContinuously: true,
  fanpage: "",
  location: "Việt Nam",
  targetCustomer: "",
  offer: ""
};

describe("AI consultant mapping", () => {
  it("accepts a Gemini consultant plan and maps it into campaign input", () => {
    const plan = aiConsultantPlanSchema.parse({
      mode: "new_campaign",
      objective: "lead",
      product: "Khóa học AI",
      dailyBudget: 500000,
      location: "Hà Nội",
      ageRange: "25-44",
      gender: "Nữ",
      audienceDescription: "Chủ spa",
      recommendedStructure: "1-3-3",
      missingFields: [],
      canCreatePreview: true
    });

    const mapped = mapAIPlanToCampaignInput(plan, baseInput);

    expect(mapped.objective).toBe("Lead");
    expect(mapped.productName).toBe("Khóa học AI");
    expect(mapped.dailyBudget).toBe("500000");
    expect(mapped.structureMode).toBe("1-3-3");
    expect(mapped.targetCustomer).toBe("Chủ spa");
  });

  it("maps AI modes to app modes", () => {
    expect(mapAIPlanMode("new_campaign")).toBe("new_campaign");
    expect(mapAIPlanMode("scale_campaign")).toBe("scale_existing");
    expect(mapAIPlanMode("ab_test")).toBe("ab_test");
  });
});
