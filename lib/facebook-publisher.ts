import { z } from "zod";

const imageSchema = z
  .object({
    url: z.string().trim().optional().nullable(),
    dataUrl: z.string().trim().optional().nullable(),
    alt: z.string().trim().optional().nullable()
  })
  .optional()
  .nullable();

const rawAgentDraftSchema = z
  .object({
    title: z.string().trim().optional().nullable(),
    caption: z.string().trim().optional().nullable(),
    message: z.string().trim().optional().nullable(),
    body: z.string().trim().optional().nullable(),
    cta: z.string().trim().optional().nullable(),
    link: z.string().trim().optional().nullable(),
    imageUrl: z.string().trim().optional().nullable(),
    imageDataUrl: z.string().trim().optional().nullable(),
    imageAlt: z.string().trim().optional().nullable(),
    image: imageSchema,
    approved: z.boolean().optional().nullable(),
    scheduledPublishTime: z.string().trim().optional().nullable()
  })
  .passthrough();

export type NormalizedAgentPostDraft = {
  title: string;
  message: string;
  link?: string;
  imageUrl?: string;
  imageDataUrl?: string;
  imageAlt?: string;
  approved: boolean;
  scheduledPublishTime?: string;
};

export type FacebookPublishPayload =
  | {
      mode: "feed";
      pageId: string;
      message: string;
      link?: string;
      scheduledPublishTime?: string;
    }
  | {
      mode: "photo";
      pageId: string;
      caption: string;
      imageUrl?: string;
      imageDataUrl?: string;
      scheduledPublishTime?: string;
    };

export function normalizeAgentPostDraft(input: unknown): NormalizedAgentPostDraft {
  const raw = rawAgentDraftSchema.parse(input);
  const title = raw.title || "Bài đăng Facebook từ Agent";
  const baseMessage = raw.message || raw.caption || raw.body || "";
  const cta = raw.cta ? `\n\nCTA: ${raw.cta}` : "";
  const message = `${baseMessage}${cta}`.trim();
  const imageUrl = raw.imageUrl || raw.image?.url || undefined;
  const imageDataUrl = raw.imageDataUrl || raw.image?.dataUrl || undefined;
  const imageAlt = raw.imageAlt || raw.image?.alt || undefined;

  return {
    title,
    message,
    link: raw.link || undefined,
    imageUrl,
    imageDataUrl,
    imageAlt,
    approved: raw.approved === true,
    scheduledPublishTime: raw.scheduledPublishTime || undefined
  };
}

export function buildFacebookPublishPayload(
  draftInput: unknown,
  options: { approved: boolean; pageId: string }
): FacebookPublishPayload {
  const draft = normalizeAgentPostDraft(draftInput);
  const pageId = options.pageId.trim();

  if (!options.approved) {
    throw new Error("Khách chưa duyệt nội dung nên chưa thể đăng Facebook.");
  }

  if (!pageId) {
    throw new Error("Thiếu Fanpage cần đăng.");
  }

  if (!draft.message) {
    throw new Error("Thiếu nội dung bài đăng.");
  }

  if (draft.link && !isHttpUrl(draft.link)) {
    throw new Error("Link bài đăng phải bắt đầu bằng http:// hoặc https://.");
  }

  if (draft.imageUrl && !isHttpUrl(draft.imageUrl)) {
    throw new Error("Link ảnh phải bắt đầu bằng http:// hoặc https://.");
  }

  if (draft.imageDataUrl && !draft.imageDataUrl.startsWith("data:image/")) {
    throw new Error("File ảnh upload phải là data URL dạng image.");
  }

  if (draft.imageUrl || draft.imageDataUrl) {
    return {
      mode: "photo",
      pageId,
      caption: [draft.message, draft.link].filter(Boolean).join("\n\n"),
      imageUrl: draft.imageUrl,
      imageDataUrl: draft.imageDataUrl,
      scheduledPublishTime: draft.scheduledPublishTime
    };
  }

  return {
    mode: "feed",
    pageId,
    message: draft.message,
    link: draft.link,
    scheduledPublishTime: draft.scheduledPublishTime
  };
}

export function dataUrlToFilePart(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("File ảnh upload không đúng định dạng data URL.");
  }

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  const extension = mimeType.split("/")[1]?.replace("+xml", "") || "png";

  return {
    blob: new Blob([buffer], { type: mimeType }),
    fileName: `agent-post-image.${extension}`
  };
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
