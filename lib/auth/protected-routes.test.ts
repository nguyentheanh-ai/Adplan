import { describe, expect, it } from "vitest";
import { buildLoginRedirectPath, hasAppSessionCookie, shouldRequireAppLogin } from "./protected-routes";

describe("protected app routes", () => {
  it("requires login for main app pages", () => {
    expect(shouldRequireAppLogin("/")).toBe(true);
    expect(shouldRequireAppLogin("/workspace")).toBe(true);
    expect(shouldRequireAppLogin("/settings")).toBe(true);
    expect(shouldRequireAppLogin("/ads-facebook/reports")).toBe(true);
  });

  it("keeps login, auth callback, api routes and assets public", () => {
    expect(shouldRequireAppLogin("/login")).toBe(false);
    expect(shouldRequireAppLogin("/api/auth/facebook/start")).toBe(false);
    expect(shouldRequireAppLogin("/api/auth/facebook/callback")).toBe(false);
    expect(shouldRequireAppLogin("/api/meta/pages")).toBe(false);
    expect(shouldRequireAppLogin("/favicon.ico")).toBe(false);
  });

  it("uses the app session cookie as the middleware gate", () => {
    expect(hasAppSessionCookie("abc")).toBe(true);
    expect(hasAppSessionCookie(" ")).toBe(false);
    expect(hasAppSessionCookie(null)).toBe(false);
  });

  it("preserves the target page in the login redirect", () => {
    expect(buildLoginRedirectPath("/", "")).toBe("/login");
    expect(buildLoginRedirectPath("/settings", "?tab=account")).toBe("/login?next=%2Fsettings%3Ftab%3Daccount");
  });
});
