import { describe, expect, it } from "vitest";
import { buildPublisherAccessState, getSimplePublisherSteps } from "@/lib/facebook-publisher-ui";

describe("publisher access state", () => {
  it("asks for Facebook only when the app session is not Facebook-connected", () => {
    expect(buildPublisherAccessState({ hasAppSession: false, hasFacebookConnection: false }).kind).toBe("signed_out");
    expect(buildPublisherAccessState({ hasAppSession: true, hasFacebookConnection: false })).toEqual({
      kind: "needs_facebook",
      title: "Cần kết nối Facebook",
      message: "Bạn đã đăng nhập vào app, nhưng cần kết nối Facebook để đọc Fanpage và đăng bài."
    });
    expect(buildPublisherAccessState({ hasAppSession: true, hasFacebookConnection: true }).kind).toBe("ready");
  });
});

describe("simple publisher steps", () => {
  it("keeps the customer flow to page, draft, preview and publish", () => {
    expect(getSimplePublisherSteps()).toEqual(["Chọn page", "Chọn bài trong Draft", "Preview", "Đăng"]);
  });
});
