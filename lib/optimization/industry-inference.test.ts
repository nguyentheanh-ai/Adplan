import { describe, expect, it } from "vitest";
import { inferIndustryProfileFromSnapshots } from "./industry-inference";

describe("industry profile inference", () => {
  it("infers education business from campaign and creative snapshots", () => {
    const profile = inferIndustryProfileFromSnapshots(
      [{ campaign_name: "Khóa học video AI", objective: "OUTCOME_ENGAGEMENT", spend: 1000000 }],
      [{ body: "Đăng ký khóa học AI miễn phí buổi đầu", audience_age_range: "25-44", audience_gender: "Nữ", audience_locations: "Vietnam" }]
    );
    expect(profile.industry_key).toBe("education_course");
    expect(profile.offer_type).toContain("miễn phí");
    expect(profile.target_customer).toContain("25-44");
  });

  it("keeps unknown when there is not enough signal", () => {
    const profile = inferIndustryProfileFromSnapshots([], []);
    expect(profile.industry_key).toBe("unknown");
    expect(profile.notes).toContain("0 campaign");
  });
});
