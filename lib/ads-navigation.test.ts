import { describe, expect, it } from "vitest";
import { adsFeatureLinks } from "./ads-navigation";

describe("ads feature launcher", () => {
  it("keeps every Adplan feature reachable from the Ads hub", () => {
    expect(adsFeatureLinks.map((item) => item.href)).toEqual([
      "/ads-facebook",
      "/ads-facebook/reports",
      "/ads-facebook/optimization",
      "/ads-facebook/campaign-builder",
      "/ads-facebook/audiences",
      "/ads-facebook/creative",
      "/ads-facebook/history",
      "/ads-facebook/publisher"
    ]);
  });
});
