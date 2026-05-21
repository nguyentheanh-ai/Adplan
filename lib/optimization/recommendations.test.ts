import { describe, expect, it } from "vitest";
import { buildOptimizationRecommendations } from "./recommendations";
import type { CreativePerformance, NormalizedCampaignPerformance } from "@/lib/meta/types";

function campaign(overrides: Partial<NormalizedCampaignPerformance>): NormalizedCampaignPerformance {
  return {
    campaignId: "c1",
    campaignName: "Campaign 1",
    spend: 0,
    impressions: 0,
    reach: 0,
    frequency: 0,
    cpm: 0,
    ctr: 0,
    cpc: 0,
    clicks: 0,
    leads: 0,
    messages: 0,
    engagements: 0,
    purchases: 0,
    results: 0,
    costPerResult: 0,
    roas: null,
    conversionValue: 0,
    ...overrides
  };
}

function creative(overrides: Partial<CreativePerformance>): CreativePerformance {
  return {
    adId: "a1",
    adName: "Ad 1",
    campaignName: "Campaign 1",
    adsetName: "Adset 1",
    creativeId: "cr1",
    creativeName: "Creative 1",
    body: "",
    headline: "",
    description: "",
    cta: "",
    landingUrl: "",
    postId: "",
    postUrl: "",
    audienceAgeRange: "",
    audienceGender: "",
    audienceLocations: "",
    audienceInterests: "",
    audienceBehaviors: "",
    format: "image",
    spend: 0,
    impressions: 0,
    reach: 0,
    frequency: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
    leads: 0,
    messages: 0,
    engagements: 0,
    cpl: null,
    costPerMessage: null,
    ...overrides
  };
}

describe("optimization recommendations", () => {
  it("recommends scaling winner and reviewing waste", () => {
    const rows = buildOptimizationRecommendations({
      campaigns: [
        campaign({ campaignId: "winner", campaignName: "Winner", spend: 500000, results: 20, costPerResult: 25000, ctr: 2 }),
        campaign({ campaignId: "average", campaignName: "Average", spend: 600000, results: 10, costPerResult: 60000, ctr: 1.5 }),
        campaign({ campaignId: "waste", campaignName: "Waste", spend: 300000, results: 0, ctr: 0.5 })
      ],
      creatives: []
    });

    expect(rows.some((item) => item.recommendationType === "scale_budget" && item.entityId === "winner")).toBe(true);
    expect(rows.some((item) => item.recommendationType === "pause_review" && item.entityId === "waste")).toBe(true);
  });

  it("flags winning and poor creatives", () => {
    const rows = buildOptimizationRecommendations({
      campaigns: [],
      creatives: [
        creative({ creativeId: "good", creativeName: "Good", spend: 200000, messages: 15 }),
        creative({ creativeId: "bad", creativeName: "Bad", spend: 100000 })
      ]
    });

    expect(rows.some((item) => item.recommendationType === "duplicate_winner" && item.entityId === "good")).toBe(true);
    expect(rows.some((item) => item.recommendationType === "pause_review" && item.entityId === "bad")).toBe(true);
  });

  it("attaches account industry context to recommendation evidence", () => {
    const rows = buildOptimizationRecommendations({
      campaigns: [
        campaign({ campaignId: "winner", campaignName: "Winner", spend: 500000, results: 20, costPerResult: 25000, ctr: 2 }),
        campaign({ campaignId: "average", campaignName: "Average", spend: 600000, results: 10, costPerResult: 60000, ctr: 1.5 })
      ],
      creatives: [],
      context: {
        industryKey: "education_course",
        businessModel: "bán khóa học qua inbox",
        offerType: "giảm giá khai giảng",
        targetCustomer: "người mới học AI"
      }
    });

    expect(rows[0]?.reason).toContain("education_course");
    expect(rows[0]?.evidence.account_context).toMatchObject({ industryKey: "education_course" });
  });

  it("uses industry benchmark in campaign recommendation evidence", () => {
    const rows = buildOptimizationRecommendations({
      campaigns: [
        campaign({
          campaignId: "winner",
          campaignName: "Winner",
          objective: "OUTCOME_MESSAGES",
          spend: 500000,
          results: 20,
          costPerResult: 25000,
          ctr: 3.6,
          cpc: 2500,
          cpm: 90000
        }),
        campaign({ campaignId: "average", campaignName: "Average", objective: "OUTCOME_MESSAGES", spend: 600000, results: 10, costPerResult: 60000, ctr: 1.5 })
      ],
      creatives: [],
      context: {
        industryKey: "education_course",
        benchmarks: [
          {
            objective: "OUTCOME_MESSAGES",
            sampleSize: 8,
            medianCtr: 2,
            medianCpc: 5000,
            medianCpm: 120000
          }
        ]
      }
    });

    const winner = rows.find((item) => item.entityId === "winner");
    expect(winner?.reason).toContain("CTR cao hơn mặt bằng ngành");
    expect(winner?.evidence.industry_benchmark).toMatchObject({ objective: "OUTCOME_MESSAGES" });
  });
});
