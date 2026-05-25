import { describe, expect, it } from "vitest";
import { createDevPreviewSession, isDevPreviewAuthEnabled } from "./dev-preview";

describe("dev preview auth", () => {
  it("is enabled only in development unless explicitly disabled", () => {
    expect(isDevPreviewAuthEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(isDevPreviewAuthEnabled({ NODE_ENV: "development", ADPLAN_DISABLE_PREVIEW_AUTH: "1" })).toBe(false);
    expect(isDevPreviewAuthEnabled({ NODE_ENV: "production" })).toBe(false);
  });

  it("creates a non-secret local preview session for UI smoke tests", () => {
    const session = createDevPreviewSession(1_000);

    expect(session).toMatchObject({
      userId: "dev-preview-user",
      facebookId: "dev-preview-facebook",
      name: "Preview User",
      accessToken: "dev-preview-token",
      grantedScopes: []
    });
    expect(session.expiresAt).toBeGreaterThan(1_000);
  });
});
