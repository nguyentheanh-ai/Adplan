import { describe, expect, it } from "vitest";
import {
  buildScaleSourceRows,
  createABTestDraft,
  generateAdName,
  generateAdsetName,
  generateCampaignCode,
  generateCampaignDraft,
  generateCampaignName,
  normalizeVietnameseText,
  validateABTestConfig
} from "./campaign-builder";

describe("advanced campaign builder", () => {
  it("generates readable campaign, adset and ad names from Vietnamese input", () => {
    expect(generateCampaignCode("act_12024728344320568", 0)).toBe("056800");
    expect(normalizeVietnameseText("Khóa học AI cho nữ 25-44")).toBe("KhoaHocAIChoNu2544");
    expect(
      generateCampaignName({
        date: "2026-05-20",
        objective: "Tin nhắn",
        productName: "Khóa học AI",
        audienceName: "Nữ 25-44",
        postLabel: "Post 01"
      })
    ).toBe("20_05_TinNhan_KhoaHocAI_Nu2544_Post01");
    expect(generateAdsetName({ campaignCode: "056800", audienceName: "Nữ quan tâm spa", ageRange: "25-44" })).toBe(
      "056800_NuQuanTamSpa_25-44"
    );
    expect(generateAdName({ campaignCode: "056800", postText: "Bạn không thiếu khách hàng" })).toBe("056800_BanKhongThieu");
  });

  it("builds a 1-1-1 campaign tree preview", () => {
    const draft = generateCampaignDraft(
      {
        adAccountId: "act_12024728344320568",
        campaignCode: "056800",
        pageId: "page_1",
        pageName: "Page",
        postId: "post_1",
        postMessage: "Bạn không thiếu khách hàng",
        productName: "Khóa học AI",
        industry: "Giáo dục",
        objective: "Tin nhắn",
        dailyBudget: "500000",
        startDate: "2026-05-20",
        runContinuously: true,
        fanpage: "Page",
        location: "Việt Nam",
        targetCustomer: "Nữ 25-44",
        offer: "Ưu đãi",
        structureMode: "1-1-1"
      },
      []
    );

    expect(draft.campaign.name).toBe("20_05_TinNhan_KhoaHocAI_Nu2544_Post01");
    expect(draft.adsets).toHaveLength(1);
    expect(draft.adsets[0].ads).toHaveLength(1);
  });

  it("builds a 1-3-3 campaign tree preview", () => {
    const draft = generateCampaignDraft(
      {
        adAccountId: "act_12024728344320568",
        campaignCode: "056801",
        pageId: "page_1",
        pageName: "Page",
        productName: "Spa",
        industry: "Làm đẹp",
        objective: "Lead",
        dailyBudget: "900000",
        startDate: "2026-05-20",
        runContinuously: true,
        fanpage: "Page",
        website: "https://example.com",
        location: "Hà Nội",
        targetCustomer: "Nữ quan tâm spa",
        offer: "Đặt lịch",
        structureMode: "1-3-3"
      },
      []
    );

    expect(draft.adsets).toHaveLength(3);
    expect(draft.adsets.flatMap((adset) => adset.ads)).toHaveLength(9);
  });

  it("blocks A/B preview when the tested value is duplicated", () => {
    const draft = createABTestDraft({
      name: "Test bài viết",
      hypothesis: "Chỉ thay đổi bài viết",
      testVariable: "copy",
      schedule: { startDate: "2026-05-21", endDate: "2026-05-28" },
      minimumSpend: "500000",
      variants: ["post_1", "post_1"]
    });

    const result = validateABTestConfig(draft);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Các biến thể không được trùng dữ liệu ở yếu tố đang test.");
  });

  it("normalizes scale source campaigns with budget, spend and result counts", () => {
    const rows = buildScaleSourceRows([
      {
        id: "cmp_1",
        name: "Campaign lead",
        status: "PAUSED",
        objective: "OUTCOME_LEADS",
        created_time: "2026-05-01T00:00:00+0000",
        daily_budget: "500000",
        insight: {
          campaign_id: "cmp_1",
          spend: "250000",
          impressions: "1000",
          actions: [{ action_type: "lead", value: "5" }]
        }
      }
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        campaignId: "cmp_1",
        budget: 500000,
        spend: 250000,
        results: 5,
        impressions: 1000
      })
    ]);
  });
});
