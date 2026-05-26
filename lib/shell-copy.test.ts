import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("shell customer-facing copy", () => {
  it("does not show merge/debug wording in the shared dashboard", () => {
    const homePage = read("app/page.tsx");
    const appShell = read("components/app-shell.tsx");

    for (const source of [homePage, appShell]) {
      expect(source).not.toContain("2 web");
      expect(source).not.toContain("module giả");
      expect(source).not.toContain("backend vẫn");
      expect(source).not.toContain("đã copy");
      expect(source).not.toContain("app.theanhmarketing.com");
      expect(source).not.toContain("Shell chỉ");
    }
  });

  it("presents the homepage as the new app entry, not an ads dashboard", () => {
    const homePage = read("app/page.tsx");

    expect(homePage).toContain("Chào mừng bạn trở lại");
    expect(homePage).toContain('href: "/workspace"');
    expect(homePage).toContain('href: "/ads-facebook"');
    expect(homePage).toContain("Vào Workspace");
    expect(homePage).toContain("Vào Quản lý Facebook");
    expect(homePage).not.toContain("adsStats");
    expect(homePage).not.toContain("workspaceStats");
    expect(homePage).not.toContain("AI plan");
    expect(homePage).not.toContain("Lead / Message");
    expect(homePage).not.toContain("Tình hình Ads");
  });

  it("keeps the Ads dashboard as a separate page surface", () => {
    const adsPage = read("app/ads/page.tsx");

    expect(adsPage).toContain("MetaIntelligenceDashboard");
    expect(adsPage).toContain("AdsFeatureLauncher");
    expect(adsPage).toContain("createAdminClient");
    expect(adsPage).not.toContain("AdsDashboardHome");
  });

  it("does not show upgrade promo clutter in the shared sidebar", () => {
    const appShell = read("components/app-shell.tsx");

    expect(appShell).not.toContain("Nâng cấp");
    expect(appShell).not.toContain("workflow AI");
    expect(appShell).not.toContain("gói Pro");
    expect(appShell).not.toContain("rocket_launch");
  });

  it("keeps the shared sidebar to top-level app areas only", () => {
    const appShell = read("components/app-shell.tsx");

    expect(appShell).toContain("primaryNavItems.map");
    expect(appShell).not.toContain("activeNavGroup.items.map");
    expect(appShell).not.toContain("getActiveNavGroupKey");
    expect(appShell).not.toContain("navGroups");
  });

  it("uses The Anh Marketing branding in the shared shell", () => {
    const appShell = read("components/app-shell.tsx");
    const layout = read("app/layout.tsx");
    const loginForm = read("app/login/login-form.tsx");

    expect(appShell).toContain("/brand/ta-mark.svg");
    expect(appShell).toContain("The Anh Marketing");
    expect(layout).toContain("The Anh Marketing Workspace");
    expect(loginForm).toContain("The Anh Marketing Workspace");
  });

  it("can hide the desktop sidebar completely and reopen it with an icon", () => {
    const appShell = read("components/app-shell.tsx");

    expect(appShell).toContain("SIDEBAR_HIDDEN_STORAGE_KEY");
    expect(appShell).toContain("md:-translate-x-full");
    expect(appShell).toContain("md:ml-0");
    expect(appShell).toContain("md:w-full");
    expect(appShell).toContain('aria-label="Hiện thanh bên"');
    expect(appShell).toContain('name="menu_open"');
  });
});
