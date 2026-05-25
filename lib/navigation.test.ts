import { describe, expect, it } from "vitest";
import { getActiveNavGroupKey, isNavItemActive, navGroups } from "./navigation";

describe("navigation groups", () => {
  it("defines only ads facebook and workspace groups for the super shell", () => {
    expect(navGroups.map((group) => group.key)).toEqual(["ads", "workspace"]);
    expect(navGroups.map((group) => group.label)).toEqual(["Ads Facebook", "Workspace"]);
  });

  it("keeps the shell at two top-level destinations only", () => {
    const workspaceItems = navGroups.find((group) => group.key === "workspace")?.items ?? [];
    const adsItems = navGroups.find((group) => group.key === "ads")?.items ?? [];

    expect(workspaceItems.map((item) => item.href)).toEqual(["/workspace"]);
    expect(adsItems.map((item) => item.href)).toEqual(["/ads"]);
  });
});

describe("navigation matching", () => {
  it("treats the homepage as the shared workspace-side dashboard without adding a third nav item", () => {
    const homeItem = navGroups.find((group) => group.key === "workspace")?.items[0];
    expect(homeItem).toBeDefined();
    expect(isNavItemActive("/", homeItem!)).toBe(false);
    expect(isNavItemActive("/workspace", homeItem!)).toBe(true);
    expect(getActiveNavGroupKey("/")).toBe("workspace");
  });

  it("resolves the active nav group from workspace and ads routes", () => {
    expect(getActiveNavGroupKey("/workspace/documents")).toBe("workspace");
    expect(getActiveNavGroupKey("/ads/facebook-publisher")).toBe("ads");
    expect(getActiveNavGroupKey("/facebook-publisher")).toBe("ads");
    expect(getActiveNavGroupKey("/dashboard")).toBe("ads");
    expect(getActiveNavGroupKey("/settings")).toBe("workspace");
  });
});
