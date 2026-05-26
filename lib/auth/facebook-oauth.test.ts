import { afterEach, describe, expect, it, vi } from "vitest";
import { buildFacebookOAuthUrl, findMissingFacebookScopes, OPTIONAL_FACEBOOK_SCOPES, REQUIRED_FACEBOOK_SCOPES } from "./facebook-oauth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("REQUIRED_FACEBOOK_SCOPES", () => {
  it("requests page publishing permissions for the Facebook publisher", () => {
    expect(REQUIRED_FACEBOOK_SCOPES).toContain("pages_show_list");
    expect(REQUIRED_FACEBOOK_SCOPES).toContain("pages_read_engagement");
    expect(REQUIRED_FACEBOOK_SCOPES).toContain("pages_manage_posts");
  });

  it("requests business_management without making it a hard login blocker", () => {
    vi.stubEnv("META_APP_ID", "app_123");
    vi.stubEnv("META_APP_SECRET", "secret_123");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://adsplan.theanhmarketing.com");

    const oauthUrl = new URL(buildFacebookOAuthUrl("state_123"));
    expect(oauthUrl.searchParams.get("scope")).toContain("business_management");
    expect(OPTIONAL_FACEBOOK_SCOPES).toContain("business_management");
    expect(findMissingFacebookScopes(new Set(REQUIRED_FACEBOOK_SCOPES))).toEqual([]);
  });
});
