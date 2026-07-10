import { existsSync, readFileSync } from "node:fs";
import nextConfig from "../next.config";
import { describe, expect, it } from "vitest";

const adpilotRoutes = [
  "app/page.tsx",
  "app/ads-facebook/page.tsx",
  "app/ads-facebook/campaigns/page.tsx",
  "app/ads-facebook/campaigns/[campaignId]/page.tsx",
  "app/ads-facebook/posts/page.tsx",
  "app/ads-facebook/posts/composer/page.tsx",
  "app/ads-facebook/reports/page.tsx",
  "app/settings/page.tsx"
];

const removedPostPublishingRoutes = [
  "app/api/social/pages/route.ts",
  "app/api/social/posts/route.ts",
  "app/api/social/posts/[id]/route.ts",
  "app/api/social/posts/bulk-schedule/route.ts",
  "app/api/social/posts/generate-ai/route.ts",
  "app/api/social/posts/publish-due/route.ts",
  "app/api/cron/facebook-auto-publisher/route.ts"
];

describe("AdPilot route structure", () => {
  it("ships the canonical AdPilot pages", () => {
    for (const routeFile of adpilotRoutes) {
      expect(existsSync(routeFile), routeFile).toBe(true);
    }
  });

  it("renders AdPilot from the root page", () => {
    const homePage = readFileSync("app/page.tsx", "utf8");
    expect(homePage).toContain("AdPilotConsole");
    expect(homePage).toContain('view="overview"');
    expect(homePage).not.toContain('href: "/workspace"');
  });

  it("redirects removed Adplan feature routes to AdPilot surfaces", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "/ads/reports", destination: "/ads-facebook/reports", permanent: false }),
        expect.objectContaining({ source: "/ads-facebook/campaign-builder", destination: "/ads-facebook/campaigns", permanent: false }),
        expect.objectContaining({ source: "/facebook-publisher", destination: "/ads-facebook/posts", permanent: false }),
        expect.objectContaining({ source: "/workspace/:path*", destination: "/", permanent: false })
      ])
    );
  });

  it("does not expose removed social scheduling routes", () => {
    for (const routeFile of removedPostPublishingRoutes) {
      expect(existsSync(routeFile), routeFile).toBe(false);
    }
  });
});
