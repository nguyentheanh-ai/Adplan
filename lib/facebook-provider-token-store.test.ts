import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptStoredFacebookToken, encryptStoredFacebookToken } from "./facebook-provider-token-store";

describe("facebook provider token vault", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a token using the app secret derived vault key", () => {
    vi.stubEnv("META_APP_SECRET", "super-secret-meta-app");

    const encrypted = encryptStoredFacebookToken("EAAB-demo-token");

    expect(encrypted).toMatch(/^v1\./);
    expect(encrypted.includes("EAAB-demo-token")).toBe(false);
    expect(decryptStoredFacebookToken(encrypted)).toBe("EAAB-demo-token");
  });
});
