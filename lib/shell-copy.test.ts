import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("AdPilot shell copy", () => {
  it("presents the app as AdPilot, not the old Workspace shell", () => {
    const appShell = read("components/app-shell.tsx");
    const layout = read("app/layout.tsx");
    const loginForm = read("app/login/login-form.tsx");

    for (const source of [appShell, layout, loginForm]) {
      expect(source).toContain("AdPilot");
      expect(source).not.toContain("Greezhub");
      expect(source).not.toContain("The Anh Marketing Workspace");
    }
  });

  it("keeps sidebar navigation to AdPilot top-level destinations", () => {
    const appShell = read("components/app-shell.tsx");

    expect(appShell).toContain("visibleNavItems.map");
    expect(appShell).toContain("!item.adminOnly || isOwner");
    expect(appShell).not.toContain("activeNavGroup.items.map");
    expect(appShell).not.toContain("Workspace");
    expect(appShell).not.toContain("Campaign Builder");
  });

  it("can hide and reopen the desktop sidebar", () => {
    const appShell = read("components/app-shell.tsx");

    expect(appShell).toContain("SIDEBAR_HIDDEN_STORAGE_KEY");
    expect(appShell).toContain("md:-translate-x-full");
    expect(appShell).toContain("md:ml-0");
    expect(appShell).toContain('aria-label="Show sidebar"');
    expect(appShell).toContain('name="menu_open"');
  });

  it("uses the transparent The Anh logo instead of text badges", () => {
    const appShell = read("components/app-shell.tsx");
    const loginForm = read("app/login/login-form.tsx");

    for (const source of [appShell, loginForm]) {
      expect(source).toContain("/brand/ta-mark-transparent.png");
      expect(source).not.toContain(">AP<");
    }
  });
});
