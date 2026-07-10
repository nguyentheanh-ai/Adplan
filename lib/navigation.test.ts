import { describe, expect, it } from "vitest";
import { dashboardNavItem, getActiveNavGroupKey, isNavItemActive, navGroups, primaryNavItems } from "./navigation";

describe("AdPilot navigation", () => {
  it("keeps the sidebar focused on AdPilot destinations", () => {
    expect(primaryNavItems.map((item) => item.label)).toEqual(["Overview", "Ads", "Campaigns", "Post Ranking", "Reports", "Revenue Report", "Settings"]);
    expect(primaryNavItems.map((item) => item.href)).toEqual([
      "/",
      "/ads-facebook",
      "/ads-facebook/campaigns",
      "/ads-facebook/posts",
      "/ads-facebook/reports",
      "/admin/revenue-report",
      "/settings"
    ]);
    expect(primaryNavItems.find((item) => item.href === "/admin/revenue-report")?.adminOnly).toBe(true);
  });

  it("uses a single AdPilot nav group", () => {
    expect(navGroups.map((group) => group.key)).toEqual(["adpilot"]);
    expect(navGroups[0]?.items).toEqual(primaryNavItems);
  });

  it("matches overview and nested AdPilot routes", () => {
    expect(dashboardNavItem.href).toBe("/");
    expect(isNavItemActive("/", dashboardNavItem)).toBe(true);
    expect(isNavItemActive("/ads-facebook", dashboardNavItem)).toBe(false);
    expect(isNavItemActive("/ads-facebook", primaryNavItems[1])).toBe(true);
    expect(getActiveNavGroupKey("/ads-facebook/campaigns/123")).toBe("adpilot");
    expect(getActiveNavGroupKey("/workspace")).toBe(null);
  });
});
