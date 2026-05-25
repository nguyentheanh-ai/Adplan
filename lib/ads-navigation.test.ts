import { describe, expect, it } from "vitest";
import { adsFeatureLinks } from "./ads-navigation";

describe("ads feature launcher", () => {
  it("keeps every Adplan feature reachable from the Ads hub", () => {
    expect(adsFeatureLinks.map((item) => item.href)).toEqual([
      "/ads",
      "/ads/reports",
      "/ads/optimization",
      "/ads/campaign-builder",
      "/ads/audiences",
      "/ads/creative",
      "/ads/history",
      "/ads/facebook-publisher"
    ]);
  });
});
