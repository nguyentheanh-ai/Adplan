import { describe, expect, it } from "vitest";
import { buildAdsContentPrompt } from "./ai-content-ads";
import { adsContentInputSchema, adsContentPackageSchema } from "./ai-content-ads-shared";

describe("AI ads content", () => {
  it("validates input and builds prompt without secrets", () => {
    const input = adsContentInputSchema.parse({
      product: "Khóa học AI cho chủ shop",
      industry: "education_course",
      targetCustomer: "chủ shop nhỏ",
      offer: "giảm 40%",
      goal: "message"
    });

    const prompt = buildAdsContentPrompt(input);
    expect(prompt).toContain("Khóa học AI");
    expect(prompt).toContain("creator ads");
    expect(prompt).not.toContain("GEMINI_API_KEY");
  });

  it("validates generated content package shape", () => {
    const parsed = adsContentPackageSchema.parse({
      summary: "Test content theo 3 góc.",
      angles: ["Nỗi đau", "Kết quả mong muốn"],
      hooks: ["Bạn đang mất quá nhiều thời gian?"],
      primaryTexts: ["Nội dung quảng cáo mẫu"],
      headlines: ["Học AI dễ hiểu"],
      descriptions: ["Dành cho chủ shop"],
      ctas: ["Nhắn tin để nhận tư vấn"],
      creativeBriefs: ["Quay màn hình trước/sau"],
      complianceNotes: [],
      recommendedTestPlan: "Test 3 hook với cùng tệp."
    });

    expect(parsed.primaryTexts).toHaveLength(1);
  });
});
