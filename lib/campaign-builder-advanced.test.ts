import { describe, expect, it } from "vitest";
import { createABTestDraft, generateScalePreview, validateABTestConfig } from "./campaign-builder";

describe("advanced campaign builder", () => {
  it("builds a safe paused scale preview for campaign cloning", () => {
    const preview = generateScalePreview({
      adAccountId: "act_123",
      action: "clone_campaign",
      dateRange: { startDate: "2026-05-01", endDate: "2026-05-20" },
      sourceCampaignId: "cmp_1",
      quantity: 3,
      newBudget: "500000"
    });

    expect(preview.mode).toBe("scale_existing");
    expect(preview.warnings).toContain("Campaign clone se duoc tao o trang thai PAUSED.");
    expect(preview.metaPayload.status).toBe("PAUSED");
    expect(preview.scale?.quantity).toBe(3);
  });

  it("validates A/B tests need at least two variants", () => {
    const result = validateABTestConfig({
      name: "Test hook",
      hypothesis: "Hook ro hon se tang CTR",
      testVariable: "creative",
      budgetSplit: { A: 100 },
      schedule: { startDate: "2026-05-21", endDate: "2026-05-28" },
      winnerRule: { metric: "ctr", minimumSpend: "300000" },
      variants: [{ id: "A", name: "Variant A", variable: "creative", payload: {} }]
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Can it nhat 2 bien the de test A/B.");
  });

  it("creates an A/B test draft with equal budget split", () => {
    const draft = createABTestDraft({
      name: "Test creative khoa hoc",
      hypothesis: "Video testimonial se co CPL tot hon anh tinh",
      testVariable: "creative",
      schedule: { startDate: "2026-05-21", endDate: "2026-05-28" },
      minimumSpend: "500000",
      variants: ["Video testimonial", "Anh uu dai"]
    });

    expect(draft.variants).toHaveLength(2);
    expect(draft.budgetSplit).toEqual({ "Video testimonial": 50, "Anh uu dai": 50 });
    expect(validateABTestConfig(draft).ok).toBe(true);
  });
});
