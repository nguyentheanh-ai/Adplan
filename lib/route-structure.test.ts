import { existsSync, readFileSync } from "node:fs";
import nextConfig from "../next.config";
import { describe, expect, it } from "vitest";

const adsFacebookRoutes = [
  "app/ads-facebook/page.tsx",
  "app/ads-facebook/reports/page.tsx",
  "app/ads-facebook/optimization/page.tsx",
  "app/ads-facebook/campaign-builder/page.tsx",
  "app/ads-facebook/audiences/page.tsx",
  "app/ads-facebook/creative/page.tsx",
  "app/ads-facebook/history/page.tsx",
  "app/ads-facebook/publisher/page.tsx"
];

describe("route structure", () => {
  it("ships canonical Ads Facebook App Router pages", () => {
    for (const routeFile of adsFacebookRoutes) {
      expect(existsSync(routeFile), routeFile).toBe(true);
    }
  });

  it("uses canonical Ads Facebook links in the shared dashboard", () => {
    const homePage = readFileSync("app/page.tsx", "utf8");

    expect(homePage).toContain('href: "/ads-facebook"');
    expect(homePage).not.toContain('href: "/ads"');
  });

  it("redirects legacy Ads routes to canonical Ads Facebook routes", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "/ads", destination: "/ads-facebook", permanent: false }),
        expect.objectContaining({ source: "/ads/reports", destination: "/ads-facebook/reports", permanent: false }),
        expect.objectContaining({ source: "/facebook-publisher", destination: "/ads-facebook/publisher", permanent: false })
      ])
    );
  });
});
