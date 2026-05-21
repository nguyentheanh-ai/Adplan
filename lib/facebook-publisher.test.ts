import { describe, expect, it } from "vitest";
import { buildFacebookPublishPayload, normalizeAgentPostDraft } from "./facebook-publisher";

describe("normalizeAgentPostDraft", () => {
  it("normalizes an agent JSON draft with content and image metadata", () => {
    const draft = normalizeAgentPostDraft({
      title: "Spa trị mụn - ưu đãi tháng 6",
      caption: "Da sạch mụn cần đúng phác đồ.\nInbox để nhận tư vấn.",
      cta: "Nhắn tin ngay",
      image: {
        url: "https://example.com/post.png",
        alt: "Ảnh social post spa"
      },
      link: "https://theanhmarketing.com/spa"
    });

    expect(draft.title).toBe("Spa trị mụn - ưu đãi tháng 6");
    expect(draft.message).toContain("Da sạch mụn");
    expect(draft.message).toContain("CTA: Nhắn tin ngay");
    expect(draft.imageUrl).toBe("https://example.com/post.png");
    expect(draft.imageAlt).toBe("Ảnh social post spa");
    expect(draft.link).toBe("https://theanhmarketing.com/spa");
  });

  it("accepts the kit post-draft template field names", () => {
    const draft = normalizeAgentPostDraft({
      approved: true,
      message: "Caption đã duyệt",
      imageUrl: "https://example.com/creative.jpg",
      scheduledPublishTime: "2026-06-01T03:00:00.000Z"
    });

    expect(draft.approved).toBe(true);
    expect(draft.message).toBe("Caption đã duyệt");
    expect(draft.imageUrl).toBe("https://example.com/creative.jpg");
    expect(draft.scheduledPublishTime).toBe("2026-06-01T03:00:00.000Z");
  });
});

describe("buildFacebookPublishPayload", () => {
  it("builds a photo payload when the draft has an image", () => {
    const payload = buildFacebookPublishPayload(
      {
        message: "Caption",
        link: "https://example.com",
        imageUrl: "https://example.com/post.png"
      },
      { approved: true, pageId: "123" }
    );

    expect(payload.mode).toBe("photo");
    if (payload.mode !== "photo") throw new Error("Expected photo payload");
    expect(payload.pageId).toBe("123");
    expect(payload.caption).toContain("Caption");
    expect(payload.caption).toContain("https://example.com");
    expect(payload.imageUrl).toBe("https://example.com/post.png");
  });

  it("builds a feed payload when there is no image", () => {
    const payload = buildFacebookPublishPayload(
      {
        message: "Caption",
        link: "https://example.com"
      },
      { approved: true, pageId: "123" }
    );

    expect(payload.mode).toBe("feed");
    if (payload.mode !== "feed") throw new Error("Expected feed payload");
    expect(payload.message).toBe("Caption");
    expect(payload.link).toBe("https://example.com");
  });

  it("blocks publish when the customer has not approved the draft", () => {
    expect(() =>
      buildFacebookPublishPayload(
        {
          message: "Caption"
        },
        { approved: false, pageId: "123" }
      )
    ).toThrow("Khách chưa duyệt");
  });
});
