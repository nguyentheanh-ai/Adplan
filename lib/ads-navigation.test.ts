import { describe, expect, it } from "vitest";
import { adsFeatureLinks } from "./ads-navigation";

describe("AdPilot feature links", () => {
  it("keeps only the AdPilot feature surfaces reachable", () => {
    expect(adsFeatureLinks.map((item) => item.href)).toEqual([
      "/",
      "/ads-facebook/campaigns",
      "/ads-facebook/posts",
      "/settings"
    ]);
  });
});
