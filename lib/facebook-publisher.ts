import { z } from "zod";

const imageSchema = z
  .object({
    url: z.string().trim().optional().nullable(),
    dataUrl: z.string().trim().optional().nullable(),
    alt: z.string().trim().optional().nullable()
  })
  .optional()
  .nullable();

const mediaItemSchema = z.object({
  url: z.string().trim().optional().nullable(),
  dataUrl: z.string().trim().optional().nullable(),
  alt: z.string().trim().optional().nullable()
});

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
    media: z.array(mediaItemSchema).optional().nullable(),
    mediaUrls: z.array(z.string().trim()).optional().nullable(),
    approved: z.boolean().optional().nullable(),
    scheduledPublishTime: z.string().trim().optional().nullable()
  })
  .passthrough();

export type NormalizedAgentPostMedia = {
  url?: string;
  dataUrl?: string;
  alt?: string;
};

export type NormalizedAgentPostDraft = {
  title: string;
  message: string;
  link?: string;
  imageUrl?: string;
  imageDataUrl?: string;
  imageAlt?: string;
  media: NormalizedAgentPostMedia[];
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
    }
  | {
      mode: "multi_photo";
      pageId: string;
      message: string;
      media: NormalizedAgentPostMedia[];
      scheduledPublishTime?: string;
    };

export type FacebookDraftInboxItem = {
  id: string;
  pageId?: string;
  status: string;
  draft: NormalizedAgentPostDraft;
  createdAt?: string;
  updatedAt?: string;
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
  const media = normalizeMediaItems(raw.media, raw.mediaUrls, { imageUrl, imageDataUrl, imageAlt });

  return {
    title,
    message,
    link: raw.link || undefined,
    imageUrl,
    imageDataUrl,
    imageAlt,
    media,
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

  for (const item of draft.media) {
    if (item.url && !isHttpUrl(item.url)) {
      throw new Error("Link ảnh phải bắt đầu bằng http:// hoặc https://.");
    }

    if (item.dataUrl && !item.dataUrl.startsWith("data:image/")) {
      throw new Error("File ảnh upload phải là data URL dạng image.");
    }
  }

  if (draft.media.length > 1) {
    return {
      mode: "multi_photo",
      pageId,
      message: [draft.message, draft.link].filter(Boolean).join("\n\n"),
      media: draft.media,
      scheduledPublishTime: draft.scheduledPublishTime
    };
  }

  if (draft.media.length === 1) {
    const image = draft.media[0];
    return {
      mode: "photo",
      pageId,
      caption: [draft.message, draft.link].filter(Boolean).join("\n\n"),
      imageUrl: image.url,
      imageDataUrl: image.dataUrl,
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

function normalizeMediaItems(
  media?: Array<{ url?: string | null; dataUrl?: string | null; alt?: string | null }> | null,
  mediaUrls?: string[] | null,
  legacy?: { imageUrl?: string; imageDataUrl?: string; imageAlt?: string }
) {
  const items: NormalizedAgentPostMedia[] = [];

  for (const item of media ?? []) {
    const normalized = {
      url: item.url || undefined,
      dataUrl: item.dataUrl || undefined,
      alt: item.alt || undefined
    };
    if (normalized.url || normalized.dataUrl) items.push(normalized);
  }

  for (const url of mediaUrls ?? []) {
    if (url) items.push({ url });
  }

  if (!items.length && (legacy?.imageUrl || legacy?.imageDataUrl)) {
    items.push({
      url: legacy.imageUrl,
      dataUrl: legacy.imageDataUrl,
      alt: legacy.imageAlt
    });
  }

  return items;
}

export function normalizeFacebookDraftRow(row: {
  id: string;
  page_id?: string | null;
  status?: string | null;
  draft_json?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
}): FacebookDraftInboxItem {
  return {
    id: row.id,
    pageId: row.page_id || undefined,
    status: row.status || "draft",
    draft: normalizeAgentPostDraft(row.draft_json || {}),
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined
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
