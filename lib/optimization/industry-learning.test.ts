import { describe, expect, it } from "vitest";
import { buildIndustryLearningProfiles, median } from "./industry-learning";

describe("industry learning", () => {
  it("calculates median without zero noise", () => {
    expect(median([0, 1, 3, 5])).toBe(3);
    expect(median([0, 0])).toBeNull();
  });

  it("builds benchmark profiles by objective", () => {
    const rows = buildIndustryLearningProfiles("education_course", [
      { objective: "OUTCOME_MESSAGES", ctr: 2, cpc: 3000, cpm: 120000, costPerResult: 25000, leads: 0, messages: 10 },
      { objective: "OUTCOME_MESSAGES", ctr: 4, cpc: 5000, cpm: 180000, costPerResult: 35000, leads: 0, messages: 8 },
      { objective: "OUTCOME_LEADS", ctr: 1.5, cpc: 4000, cpm: 140000, costPerResult: 50000, leads: 4, messages: 0 }
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.find((item) => item.objective === "OUTCOME_MESSAGES")?.medianCtr).toBe(3);
    expect(rows.find((item) => item.objective === "OUTCOME_LEADS")?.medianCpl).toBe(50000);
  });
});
