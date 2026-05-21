import { describe, expect, it } from "vitest";
import { REQUIRED_FACEBOOK_SCOPES } from "./facebook-scopes";

describe("REQUIRED_FACEBOOK_SCOPES", () => {
  it("requests page publishing permissions for the Facebook publisher", () => {
    expect(REQUIRED_FACEBOOK_SCOPES).toContain("pages_show_list");
    expect(REQUIRED_FACEBOOK_SCOPES).toContain("pages_read_engagement");
    expect(REQUIRED_FACEBOOK_SCOPES).toContain("pages_manage_posts");
  });
});
