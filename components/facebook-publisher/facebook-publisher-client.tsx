"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { MaterialIcon } from "@/components/material-icon";
import { normalizeAgentPostDraft, type FacebookDraftInboxItem, type NormalizedAgentPostDraft } from "@/lib/facebook-publisher";

type FacebookPage = {
  id: string;
  name: string;
  category?: string;
  has_access_token?: boolean;
};

type PublishResult = {
  mode: "feed" | "photo";
  page_id: string;
  post_id: string;
  photo_id?: string;
};

type DraftSummary = {
  published: number;
  draft: number;
  hidden: number;
  scheduled: number;
};

type ImagePreviewModal = {
  src: string;
  alt: string;
};

const defaultPageStorageKey = "adplan-facebook-publisher-default-page-id";
const defaultDailyScheduleTimes = ["09:00", "14:00", "20:00"];
const emptyDraftSummary: DraftSummary = {
  published: 0,
  draft: 0,
  hidden: 0,
  scheduled: 0
};

const starterDraft: NormalizedAgentPostDraft = {
  title: "Bài đăng mới từ Agent",
  message: "",
  link: "",
  imageUrl: "",
  imageDataUrl: "",
  media: [],
  approved: false
};

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || "Không thể gọi API.");
  return payload as T;
}

function postUrlFromId(postId: string) {
  if (!postId) return "";
  return `https://www.facebook.com/${postId}`;
}

function toDateTimeLocalValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function getDraftImageSrc(draft: NormalizedAgentPostDraft) {
  return getDraftImages(draft)[0]?.src || "";
}

function getDraftImages(draft: NormalizedAgentPostDraft) {
  const media = draft.media?.length
    ? draft.media
    : draft.imageDataUrl || draft.imageUrl
      ? [{ dataUrl: draft.imageDataUrl, url: draft.imageUrl, alt: draft.imageAlt }]
      : [];

  return media
    .map((item, index) => ({
      src: item.dataUrl || item.url || "",
      alt: item.alt || draft.imageAlt || `${draft.title} ${index + 1}`
    }))
    .filter((item) => item.src);
}

function sortDraftsByCreatedAt(items: FacebookDraftInboxItem[]) {
  return [...items].sort((first, second) => {
    const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0;
    const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : 0;
    return firstTime - secondTime;
  });
}

function buildScheduledPublishTime(slot: string, dayOffset: number, shouldStartTomorrow: boolean) {
  const [hourRaw, minuteRaw] = slot.split(":");
  const date = new Date();
  date.setDate(date.getDate() + dayOffset + (shouldStartTomorrow ? 1 : 0));
  date.setHours(Number(hourRaw), Number(minuteRaw), 0, 0);
  return date.toISOString();
}

export function FacebookPublisherClient() {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [defaultPageId, setDefaultPageId] = useState("");
  const [draft, setDraft] = useState<NormalizedAgentPostDraft>(starterDraft);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [draftInbox, setDraftInbox] = useState<FacebookDraftInboxItem[]>([]);
  const [draftSummary, setDraftSummary] = useState<DraftSummary>(emptyDraftSummary);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [dailyPostCount, setDailyPostCount] = useState(3);
  const [dailyScheduleTimes, setDailyScheduleTimes] = useState(defaultDailyScheduleTimes);
  const [agentJson, setAgentJson] = useState("");
  const [approved, setApproved] = useState(false);
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [imageModal, setImageModal] = useState<ImagePreviewModal | null>(null);

  async function loadDraftInbox() {
    try {
      const payload = await readJson<{ data: FacebookDraftInboxItem[]; summary?: DraftSummary; storage?: string }>("/api/facebook-publisher/drafts");
      setDraftInbox(payload.data ?? []);
      setDraftSummary(payload.summary ?? emptyDraftSummary);
      setSelectedDraftIds((current) => current.filter((id) => (payload.data ?? []).some((item) => item.id === id)));
      if (payload.storage === "missing_schema") {
        setNotice("Chưa có bảng lưu draft Agent. Hãy chạy migration facebook_post_drafts để Agent tự nạp bài.");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được draft từ Agent.");
    }
  }

  useEffect(() => {
    const storedDefault = window.localStorage.getItem(defaultPageStorageKey) || "";

    let cancelled = false;
    readJson<{ data: FacebookPage[] }>("/api/meta/pages")
      .then((payload) => {
        if (cancelled) return;
        const nextPages = payload.data ?? [];
        const nextDefault = nextPages.some((page) => page.id === storedDefault) ? storedDefault : "";
        setPages(nextPages);
        setDefaultPageId(nextDefault);
        setSelectedPageId(nextDefault || nextPages[0]?.id || "");
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Không tải được danh sách Fanpage.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPages(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    readJson<{ data: FacebookDraftInboxItem[]; summary?: DraftSummary; storage?: string }>("/api/facebook-publisher/drafts")
      .then((payload) => {
        if (cancelled) return;
        setDraftInbox(payload.data ?? []);
        setDraftSummary(payload.summary ?? emptyDraftSummary);
        if (payload.storage === "missing_schema") {
          setNotice("Chưa có bảng lưu draft Agent. Hãy chạy migration facebook_post_drafts để Agent tự nạp bài.");
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Không tải được draft từ Agent.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPage = useMemo(() => pages.find((page) => page.id === selectedPageId), [pages, selectedPageId]);
  const selectedPageCanPublish = selectedPage?.has_access_token !== false;
  const selectedInboxDrafts = useMemo(
    () => draftInbox.filter((item) => selectedDraftIds.includes(item.id)),
    [draftInbox, selectedDraftIds]
  );
  const draftImages = getDraftImages(draft);
  const canPublish = Boolean(selectedPageId && selectedPageCanPublish && draft.message.trim() && approved && !isPublishing);
  const canBatchPublish = Boolean(selectedDraftIds.length && selectedPageId && selectedPageCanPublish && approved && !isPublishing);

  function updateDraft(patch: Partial<NormalizedAgentPostDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setPublishResult(null);
    setNotice("");
  }

  function getQueueDraft(item: FacebookDraftInboxItem) {
    return activeDraftId === item.id ? draft : item.draft;
  }

  function saveDefaultPage() {
    if (!selectedPageId) return;
    window.localStorage.setItem(defaultPageStorageKey, selectedPageId);
    setDefaultPageId(selectedPageId);
    setNotice("Đã lưu Fanpage mặc định cho lần đăng sau.");
  }

  function importAgentJson() {
    setError("");
    setNotice("");
    try {
      const parsed = JSON.parse(agentJson);
      const normalized = normalizeAgentPostDraft(parsed);
      setDraft({ ...starterDraft, ...normalized });
      setActiveDraftId(null);
      setApproved(normalized.approved);
      setNotice("Đã nạp draft từ Agent. Anh/chị kiểm tra preview trước khi đăng.");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "JSON từ Agent không hợp lệ.");
    }
  }

  function applyInboxDraft(item: FacebookDraftInboxItem) {
    setDraft({ ...starterDraft, ...item.draft });
    setActiveDraftId(item.id);
    setApproved(item.draft.approved);
    if (item.pageId && pages.some((page) => page.id === item.pageId)) {
      setSelectedPageId(item.pageId);
    }
    setPublishResult(null);
    setError("");
    setNotice("Đã nạp draft Agent vào preview. Khách chỉ cần kiểm tra, tick duyệt và bấm đăng.");
  }

  function toggleInboxDraft(item: FacebookDraftInboxItem) {
    setSelectedDraftIds((current) => {
      if (current.includes(item.id)) return current.filter((id) => id !== item.id);
      return [...current, item.id];
    });

    if (!selectedDraftIds.includes(item.id)) {
      applyInboxDraft(item);
    }
  }

  function updateDailyPostCount(value: string) {
    const nextCount = Math.max(1, Math.min(10, Number(value) || 1));
    setDailyPostCount(nextCount);
    setDailyScheduleTimes((current) =>
      Array.from({ length: nextCount }, (_, index) => current[index] || defaultDailyScheduleTimes[index] || "09:00")
    );
  }

  function updateDailyScheduleTime(index: number, value: string) {
    setDailyScheduleTimes((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function loadExample() {
    const example = {
      title: "Post bán hàng từ Agent",
      caption: "Bạn đang có content nhưng chưa biến nó thành lịch đăng đều?\nAdplan AI giúp nạp draft, duyệt và đăng lên Fanpage từ một màn hình.",
      cta: "Inbox để nhận tư vấn",
      link: "https://www.theanhmarketing.com/",
      media: [
        {
          url: "",
          alt: "Ảnh social post do Agent tạo"
        }
      ],
      approved: false
    };
    setAgentJson(JSON.stringify(example, null, 2));
  }

  async function readImageFile(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Không đọc được file ảnh."));
      reader.readAsDataURL(file);
    });
  }

  async function handleImageFiles(files?: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    if (!selectedFiles.length) return;
    if (selectedFiles.some((file) => !file.type.startsWith("image/"))) {
      setError("File upload phải là ảnh.");
      return;
    }

    try {
      const uploadedMedia = await Promise.all(
        selectedFiles.map(async (file) => ({
          dataUrl: await readImageFile(file),
          alt: file.name
        }))
      );
      updateDraft({
        imageDataUrl: uploadedMedia[0]?.dataUrl || "",
        imageUrl: "",
        imageAlt: uploadedMedia[0]?.alt || "",
        media: uploadedMedia
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không đọc được file ảnh.");
    }
  }

  function updateDraftMediaUrls(value: string) {
    const urls = value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    updateDraft({
      imageUrl: urls[0] || "",
      imageDataUrl: "",
      media: urls.map((url) => ({ url }))
    });
  }

  async function markDraftDone(draftId: string, result: PublishResult, status: "published" | "scheduled" = "published") {
    await readJson<{ data: FacebookDraftInboxItem }>("/api/facebook-publisher/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: draftId,
        status,
        publish_result: result
      })
    });
    setDraftInbox((current) => current.filter((item) => item.id !== draftId));
    setSelectedDraftIds((current) => current.filter((id) => id !== draftId));
    if (activeDraftId === draftId) setActiveDraftId(null);
    await loadDraftInbox();
  }

  async function hideDraft(draftId: string) {
    await readJson<{ data: FacebookDraftInboxItem }>("/api/facebook-publisher/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: draftId,
        status: "hidden",
        publish_result: { hidden_at: new Date().toISOString() }
      })
    });
    setDraftInbox((current) => current.filter((item) => item.id !== draftId));
    setSelectedDraftIds((current) => current.filter((id) => id !== draftId));
    if (activeDraftId === draftId) {
      setActiveDraftId(null);
      setDraft(starterDraft);
      setApproved(false);
    }
    await loadDraftInbox();
  }

  async function publishOne(options?: {
    draftToPublish?: NormalizedAgentPostDraft;
    pageId?: string;
    draftId?: string | null;
    completionStatus?: "published" | "scheduled";
  }) {
    const draftToPublish = options?.draftToPublish ?? draft;
    const pageId = options?.pageId || selectedPageId;
    if (!pageId) {
      throw new Error("Chọn Fanpage cần đăng trước khi gửi bài.");
    }
    const payload = await readJson<{ data: PublishResult }>("/api/facebook-publisher/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_id: pageId,
        approved: true,
        draft: draftToPublish
      })
    });

    if (options?.draftId) {
      await markDraftDone(options.draftId, payload.data, options.completionStatus);
    }

    return payload.data;
  }

  async function publishCurrent() {
    setError("");
    setNotice("");
    setPublishResult(null);
    setIsPublishing(true);

    try {
      const result = await publishOne({
        draftId: activeDraftId,
        completionStatus: draft.scheduledPublishTime ? "scheduled" : "published"
      });
      setPublishResult(result);
      setNotice(draft.scheduledPublishTime ? "Đã lên lịch đăng tự động trên Meta. Draft đã được ẩn khỏi hàng chờ." : "Đã gửi bài sang Meta. Draft đã được ẩn khỏi hàng chờ.");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Không đăng được bài.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function publishSelectedDrafts() {
    setError("");
    setNotice("");
    setPublishResult(null);
    setIsPublishing(true);

    try {
      let successCount = 0;
      for (const item of sortDraftsByCreatedAt(selectedInboxDrafts)) {
        const draftToPublish = getQueueDraft(item);
        await publishOne({
          draftToPublish: { ...draftToPublish, scheduledPublishTime: undefined, approved: true },
          pageId: selectedPageId,
          draftId: item.id,
          completionStatus: "published"
        });
        successCount += 1;
      }
      setNotice(`Đã đăng ngay ${successCount} bài theo thứ tự bài nạp vào trước đăng trước.`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Không đăng được danh sách bài đã chọn.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function scheduleSelectedDrafts() {
    const slots = dailyScheduleTimes.slice(0, dailyPostCount);
    if (!selectedInboxDrafts.length) {
      setError("Tick chọn bài nháp cần lên lịch trước.");
      return;
    }
    if (slots.some((slot) => !slot)) {
      setError("Điền đủ khung giờ đăng trước khi lên lịch.");
      return;
    }

    setError("");
    setNotice("");
    setPublishResult(null);
    setIsPublishing(true);

    try {
      const orderedDrafts = sortDraftsByCreatedAt(selectedInboxDrafts);
      const [firstHour, firstMinute] = slots[0].split(":").map(Number);
      const firstSlotToday = new Date();
      firstSlotToday.setHours(firstHour, firstMinute, 0, 0);
      const shouldStartTomorrow = firstSlotToday.getTime() <= Date.now() + 15 * 60_000;
      let successCount = 0;

      for (let index = 0; index < orderedDrafts.length; index += 1) {
        const item = orderedDrafts[index];
        const draftToPublish = getQueueDraft(item);
        const slot = slots[index % slots.length];
        const dayOffset = Math.floor(index / slots.length);
        const scheduledPublishTime = buildScheduledPublishTime(slot, dayOffset, shouldStartTomorrow);

        await publishOne({
          draftToPublish: { ...draftToPublish, scheduledPublishTime, approved: true },
          pageId: selectedPageId,
          draftId: item.id,
          completionStatus: "scheduled"
        });
        successCount += 1;
      }

      setNotice(`Đã lên lịch ${successCount} bài: ${slots.length} bài/ngày, lặp lại theo các khung giờ đã chọn.`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Không lên lịch được danh sách bài đã chọn.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function deleteInboxDraft(item: FacebookDraftInboxItem) {
    setError("");
    setNotice("");
    try {
      await hideDraft(item.id);
      setNotice("Đã xóa bài khỏi hàng chờ.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không xóa được bài.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      {imageModal ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setImageModal(null)}
          role="dialog"
        >
          <div className="relative max-h-[92vh] w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <button
              aria-label="Đóng ảnh phóng to"
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white"
              onClick={() => setImageModal(null)}
              type="button"
            >
              <MaterialIcon name="close" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={imageModal.alt} className="max-h-[92vh] w-full rounded-lg bg-white object-contain" src={imageModal.src} />
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Chọn Fanpage đăng bài</CardTitle>
                <CardDescription>Chọn Page trước tiên để Agent, draft và lịch đăng luôn đi đúng kênh. Token chỉ dùng server-side.</CardDescription>
              </div>
              <Badge>{isLoadingPages ? "Đang tải Page" : `${pages.length} Page`}</Badge>
            </div>
          </CardHeader>

          {pages.length ? (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
              <select
                className="dashboard-input"
                value={selectedPageId}
                onChange={(event) => setSelectedPageId(event.target.value)}
              >
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name} {page.category ? `- ${page.category}` : ""} {page.has_access_token === false ? "(thiếu quyền đăng)" : ""}
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={saveDefaultPage}>
                <MaterialIcon name={defaultPageId === selectedPageId ? "star" : "star_border"} />
                {defaultPageId === selectedPageId ? "Page mặc định" : "Đặt mặc định"}
              </Button>
              <Button variant="secondary" onClick={() => window.location.assign("/api/auth/facebook/start?force=1")}>
                <MaterialIcon name="sync" />
                Kết nối lại
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-5">
              <p className="text-sm font-bold text-on-surface">Chưa đọc được Fanpage.</p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Hãy đăng nhập lại Facebook và cấp quyền pages_show_list, pages_read_engagement, pages_manage_posts.
              </p>
              <Button className="mt-4" onClick={() => window.location.assign("/api/auth/facebook/start?force=1")}>
                <MaterialIcon name="login" />
                Đăng nhập Facebook
              </Button>
            </div>
          )}
          {selectedPage && selectedPage.has_access_token === false ? (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p className="font-bold">Facebook thấy Page này nhưng chưa trả Page Access Token.</p>
              <p className="mt-1">
                Cách xử lý: bấm Kết nối lại, chọn đúng Page ở màn Facebook, bật quyền tạo/quản lý bài viết. Nếu vẫn chưa được,
                kiểm tra tài khoản Facebook có Full control hoặc content task trên Page trong Business Manager.
              </p>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Báo cáo đăng bài</CardTitle>
                <CardDescription>Theo dõi nhanh trạng thái bài viết trong hệ thống.</CardDescription>
              </div>
              <Button variant="secondary" onClick={loadDraftInbox}>
                <MaterialIcon name="refresh" />
                Cập nhật
              </Button>
            </div>
          </CardHeader>
          <div className="grid gap-3 p-6 pt-0 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-outline-variant bg-white p-4">
              <p className="text-sm font-bold text-on-surface-variant">Bài đã đăng</p>
              <p className="mt-2 text-3xl font-extrabold text-on-surface">{draftSummary.published}</p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-white p-4">
              <p className="text-sm font-bold text-on-surface-variant">Bài Draft</p>
              <p className="mt-2 text-3xl font-extrabold text-on-surface">{draftSummary.draft}</p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-white p-4">
              <p className="text-sm font-bold text-on-surface-variant">Bài đã xóa</p>
              <p className="mt-2 text-3xl font-extrabold text-on-surface">{draftSummary.hidden}</p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-white p-4">
              <p className="text-sm font-bold text-on-surface-variant">Bài đang lên lịch</p>
              <p className="mt-2 text-3xl font-extrabold text-on-surface">{draftSummary.scheduled}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Draft Agent chờ duyệt</CardTitle>
                <CardDescription>Chọn một bài để sửa, hoặc tick nhiều bài để đăng/lên lịch hàng loạt.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={loadDraftInbox}>
                  <MaterialIcon name="refresh" />
                  Tải lại
                </Button>
                <Button disabled={!canBatchPublish} onClick={publishSelectedDrafts}>
                  <MaterialIcon name="send" />
                  Đăng bài
                </Button>
                <Button disabled={!canBatchPublish} onClick={scheduleSelectedDrafts}>
                  <MaterialIcon name="schedule_send" />
                  Lên lịch
                </Button>
              </div>
            </div>
          </CardHeader>

          <div className="grid gap-4 rounded-lg border border-outline-variant bg-surface-container-low p-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <label className="space-y-2">
              <span className="text-sm font-bold text-on-surface">Số lượng bài đăng/ngày</span>
              <Input min={1} max={10} type="number" value={dailyPostCount} onChange={(event) => updateDailyPostCount(event.target.value)} />
            </label>
            <div className="space-y-2">
              <p className="text-sm font-bold text-on-surface">Khung giờ đăng hằng ngày</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {dailyScheduleTimes.slice(0, dailyPostCount).map((time, index) => (
                  <label key={index} className="flex items-center gap-2 rounded-lg border border-outline-variant bg-white p-2 text-sm font-semibold text-on-surface">
                    <span className="shrink-0 text-on-surface-variant">Bài {index + 1}</span>
                    <Input
                      aria-label={`Khung giờ đăng bài ${index + 1}`}
                      type="time"
                      value={time}
                      onChange={(event) => updateDailyScheduleTime(index, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {draftInbox.length ? (
            <div className="grid max-h-[560px] gap-3 overflow-y-auto overscroll-contain pr-2">
              {draftInbox.map((item) => {
                const isSelected = selectedDraftIds.includes(item.id);
                const draftPageIsDifferent = Boolean(item.pageId && item.pageId !== selectedPageId);
                const draftImage = getDraftImageSrc(item.draft);
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-outline-variant bg-white p-4 transition hover:border-primary hover:bg-primary-fixed/10"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        aria-label={`Chọn ${item.draft.title}`}
                        className="mt-1"
                        checked={isSelected}
                        onChange={() => toggleInboxDraft(item)}
                        type="checkbox"
                      />
                      {draftImage ? (
                        <button
                          aria-label={`Phóng to ảnh của ${item.draft.title}`}
                          className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low"
                          onClick={() => setImageModal({ src: draftImage, alt: item.draft.imageAlt || item.draft.title })}
                          type="button"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img alt={item.draft.imageAlt || item.draft.title} className="h-full w-full object-cover transition group-hover:scale-105" src={draftImage} />
                          <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100">
                            <MaterialIcon className="text-[18px]" name="open_in_full" />
                          </span>
                        </button>
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low px-2 text-center text-[11px] font-bold leading-4 text-on-surface-variant">
                          Chưa có ảnh
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                          <button className="min-w-0 text-left" onClick={() => applyInboxDraft(item)} type="button">
                            <div className="flex flex-wrap items-start gap-3">
                              <p className="font-extrabold text-on-surface">{item.draft.title}</p>
                              <Badge>{item.status}</Badge>
                              {draftPageIsDifferent ? <Badge>Sẽ đăng theo Page đang chọn</Badge> : null}
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-on-surface-variant">{item.draft.message || "Chưa có caption"}</p>
                          </button>
                          <div className="flex justify-end">
                            <Button variant="danger" disabled={isPublishing} onClick={() => void deleteInboxDraft(item)}>
                              <MaterialIcon name="delete" />
                              Xóa
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-outline">
                          {item.createdAt ? <span>Nạp lúc {new Date(item.createdAt).toLocaleString("vi-VN")}</span> : null}
                          {item.draft.scheduledPublishTime ? <span>Lịch đăng {new Date(item.draft.scheduledPublishTime).toLocaleString("vi-VN")}</span> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-5 text-sm leading-6 text-on-surface-variant">
              Chưa có draft nào từ Agent. Agent có thể gọi <span className="font-mono font-bold">POST /api/facebook-publisher/drafts</span> để tự nạp bài vào hàng chờ này.
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Nạp draft từ Agent</CardTitle>
                <CardDescription>Dán JSON do Agent tạo hoặc nhập trực tiếp caption và ảnh bên dưới.</CardDescription>
              </div>
              <Button variant="ghost" onClick={loadExample}>
                Dùng mẫu
              </Button>
            </div>
          </CardHeader>

          <Textarea
            className="min-h-[220px] font-mono text-xs"
            placeholder='{"caption":"Nội dung bài đăng...", "link":"https://...", "scheduledPublishTime":"2026-06-01T03:00:00.000Z"}'
            value={agentJson}
            onChange={(event) => setAgentJson(event.target.value)}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={importAgentJson}>
              <MaterialIcon name="upload_file" />
              Nạp từ JSON
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setAgentJson("");
                setDraft(starterDraft);
                setActiveDraftId(null);
                setApproved(false);
                setPublishResult(null);
              }}
            >
              Làm mới
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chỉnh nội dung trước khi đăng</CardTitle>
            <CardDescription>Khách có thể sửa caption, link, ảnh và lịch đăng ngay trên web trước khi bấm đăng.</CardDescription>
          </CardHeader>

          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-bold text-on-surface">Tiêu đề nội bộ</span>
              <Input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-on-surface">Caption</span>
              <Textarea value={draft.message} onChange={(event) => updateDraft({ message: event.target.value })} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold text-on-surface">Link đính kèm</span>
                <Input placeholder="https://..." value={draft.link || ""} onChange={(event) => updateDraft({ link: event.target.value })} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-on-surface">Lên lịch đăng tự động</span>
                <Input
                  type="datetime-local"
                  value={toDateTimeLocalValue(draft.scheduledPublishTime)}
                  onChange={(event) => updateDraft({ scheduledPublishTime: fromDateTimeLocalValue(event.target.value) })}
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold text-on-surface">Link ảnh public</span>
                <Textarea
                  className="min-h-[112px]"
                  placeholder={"https://...\nhttps://..."}
                  value={draft.media?.length ? draft.media.map((item) => item.url || "").filter(Boolean).join("\n") : draft.imageUrl || ""}
                  onChange={(event) => updateDraftMediaUrls(event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-on-surface">Upload ảnh từ Agent</span>
                <Input type="file" multiple accept="image/*" onChange={(event) => void handleImageFiles(event.target.files)} />
              </label>
            </div>
            {draftImages.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {draftImages.map((item, index) => (
                  <button
                    key={`${item.src}-${index}`}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low"
                    onClick={() => setImageModal({ src: item.src, alt: item.alt })}
                    type="button"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={item.alt} className="h-full w-full object-cover transition group-hover:scale-105" src={item.src} />
                    <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-xs font-bold text-white">Ảnh {index + 1}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <aside className="space-y-6">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Preview trước đăng</CardTitle>
            <CardDescription>{selectedPage ? `Fanpage: ${selectedPage.name}` : "Chưa chọn Fanpage"}</CardDescription>
          </CardHeader>

          <div className="rounded-lg border border-outline-variant bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white">
                <MaterialIcon filled name="flag" />
              </div>
              <div>
                <p className="font-extrabold text-on-surface">{selectedPage?.name || "Fanpage"}</p>
                <p className="text-xs text-on-surface-variant">
                  {draft.scheduledPublishTime ? `Lên lịch ${new Date(draft.scheduledPublishTime).toLocaleString("vi-VN")}` : "Bản xem trước từ Adplan AI"}
                </p>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-on-surface">{draft.message || "Caption sẽ hiển thị ở đây."}</p>
            {draft.link ? <p className="mt-3 break-all text-sm font-bold text-primary">{draft.link}</p> : null}
            {draftImages.length ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {draftImages.map((item, index) => (
                  <button
                    key={`${item.src}-${index}`}
                    className={draftImages.length === 1 ? "col-span-2 overflow-hidden rounded-lg" : "overflow-hidden rounded-lg"}
                    onClick={() => setImageModal({ src: item.src, alt: item.alt })}
                    type="button"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={item.alt} className="aspect-square w-full object-cover" src={item.src} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex aspect-square items-center justify-center rounded-lg bg-surface-container-low text-sm font-bold text-on-surface-variant">
                Chưa có ảnh
              </div>
            )}
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-lg bg-surface-container-low p-4 text-sm leading-6 text-on-surface">
            <input className="mt-1" type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
            <span>Tôi đã kiểm tra nội dung, link, hình ảnh, lịch đăng và đồng ý đăng bài lên Fanpage đã chọn.</span>
          </label>

          {selectedDraftIds.length ? (
            <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm font-semibold text-on-surface-variant">
              Đang chọn {selectedDraftIds.length} bài trong hàng chờ. Nút đăng nhiều bài nằm ở khối Draft Agent.
            </div>
          ) : null}

          {error ? <div className="mt-4 rounded-lg border border-error/30 bg-error/10 p-4 text-sm font-semibold text-error">{error}</div> : null}
          {notice ? <div className="mt-4 rounded-lg border border-primary/20 bg-primary-fixed/20 p-4 text-sm font-semibold text-primary">{notice}</div> : null}

          <Button className="mt-5 w-full" disabled={!canPublish} onClick={publishCurrent}>
            <MaterialIcon name={isPublishing ? "hourglass_top" : draft.scheduledPublishTime ? "schedule_send" : "send"} />
            {isPublishing ? "Đang xử lý..." : draft.scheduledPublishTime ? "Lên lịch đăng" : "Đăng lên Fanpage"}
          </Button>

          {publishResult ? (
            <div className="mt-5 rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm leading-6">
              <p className="font-extrabold text-on-surface">Meta đã trả kết quả</p>
              <p className="text-on-surface-variant">Loại bài: {publishResult.mode === "photo" ? "Ảnh" : "Text/link"}</p>
              <p className="break-all text-on-surface-variant">Post ID: {publishResult.post_id}</p>
              <a className="mt-2 inline-flex font-bold text-primary hover:underline" href={postUrlFromId(publishResult.post_id)} target="_blank">
                Mở bài trên Facebook
              </a>
            </div>
          ) : null}
        </Card>
      </aside>
    </div>
  );
}
