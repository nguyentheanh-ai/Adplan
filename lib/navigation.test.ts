import { describe, expect, it } from "vitest";
import { dashboardNavItem, getActiveNavGroupKey, isNavItemActive, navGroups, primaryNavItems } from "./navigation";

describe("navigation groups", () => {
  it("keeps the product sidebar focused on app-level destinations", () => {
    expect(primaryNavItems.map((item) => item.label)).toEqual(["Trang chủ", "Workspace", "Ads Facebook", "Cài đặt"]);
  });

  it("defines only ads facebook and workspace groups for the super shell", () => {
    expect(navGroups.map((group) => group.key)).toEqual(["ads", "workspace"]);
    expect(navGroups.map((group) => group.label)).toEqual(["Ads Facebook", "Workspace"]);
  });

  it("exposes the real Workspace features from the old app except Ads Tool", () => {
    const workspaceItems = navGroups.find((group) => group.key === "workspace")?.items ?? [];

    expect(workspaceItems.map((item) => item.href)).toEqual([
      "/workspace",
      "/workspace/content",
      "/workspace/documents",
      "/workspace/notes",
      "/workspace/ideas",
      "/workspace/prompts",
      "/workspace/operations",
      "/workspace/content-plan",
      "/workspace/calendar",
      "/workspace/tools/clock",
      "/workspace/analytics",
      "/workspace/tasks"
    ]);
    expect(workspaceItems.map((item) => item.label)).toEqual([
      "Tổng quan",
      "Không gian nội dung",
      "Tài liệu",
      "Notes",
      "Ideas",
      "Prompts",
      "Không gian vận hành",
      "Plan Content",
      "Calendar",
      "Clock",
      "Analytics",
      "Tasks"
    ]);
    expect(workspaceItems.map((item) => item.href)).not.toContain("/workspace/tools/ads-name");
  });

  it("exposes the real Ads Facebook features", () => {
    const adsItems = navGroups.find((group) => group.key === "ads")?.items ?? [];

    expect(adsItems.map((item) => item.href)).toEqual([
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

describe("navigation matching", () => {
  it("treats the homepage as the standalone shared dashboard", () => {
    const homeItem = navGroups.find((group) => group.key === "workspace")?.items[0];
    expect(homeItem).toBeDefined();
    expect(dashboardNavItem.href).toBe("/");
    expect(isNavItemActive("/", dashboardNavItem)).toBe(true);
    expect(isNavItemActive("/", homeItem!)).toBe(false);
    expect(isNavItemActive("/workspace", homeItem!)).toBe(true);
    expect(getActiveNavGroupKey("/")).toBe(null);
  });

  it("resolves the active nav group from workspace and ads routes", () => {
    expect(getActiveNavGroupKey("/workspace/documents")).toBe("workspace");
    expect(getActiveNavGroupKey("/ads-facebook/publisher")).toBe("ads");
    expect(getActiveNavGroupKey("/ads/facebook-publisher")).toBe("ads");
    expect(getActiveNavGroupKey("/facebook-publisher")).toBe("ads");
    expect(getActiveNavGroupKey("/dashboard")).toBe("ads");
    expect(getActiveNavGroupKey("/settings")).toBe("workspace");
  });
});
