"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialIcon } from "@/components/material-icon";
import { type FacebookDraftInboxItem, type NormalizedAgentPostDraft } from "@/lib/facebook-publisher";
import { buildPublisherAccessState, getSimplePublisherSteps, type PublisherAccessState } from "@/lib/facebook-publisher-ui";

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

const emptyDraftSummary: DraftSummary = {
  published: 0,
  draft: 0,
  hidden: 0,
  scheduled: 0
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

function getDraftImages(draft?: NormalizedAgentPostDraft) {
  if (!draft) return [];
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

function getDraftImageSrc(draft: NormalizedAgentPostDraft) {
  return getDraftImages(draft)[0]?.src || "";
}

function formatDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export function FacebookPublisherClient({ hasFacebookConnection }: { hasFacebookConnection: boolean }) {
  const accessState = buildPublisherAccessState({ hasAppSession: true, hasFacebookConnection });
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [draftInbox, setDraftInbox] = useState<FacebookDraftInboxItem[]>([]);
  const [draftSummary, setDraftSummary] = useState<DraftSummary>(emptyDraftSummary);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isLoadingPages, setIsLoadingPages] = useState(accessState.kind === "ready");
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(accessState.kind === "ready");
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [imageModal, setImageModal] = useState<ImagePreviewModal | null>(null);

  const selectedPage = useMemo(() => pages.find((page) => page.id === selectedPageId), [pages, selectedPageId]);
  const selectedDraftItem = useMemo(
    () => draftInbox.find((item) => item.id === activeDraftId) ?? null,
    [activeDraftId, draftInbox]
  );
  const selectedDraft = selectedDraftItem?.draft;
  const draftImages = useMemo(() => getDraftImages(selectedDraft), [selectedDraft]);
  const selectedPageCanPublish = selectedPage?.has_access_token !== false;
  const canPublish = Boolean(selectedPageId && selectedDraft?.message.trim() && selectedPageCanPublish && !isPublishing);
  const steps = getSimplePublisherSteps();

  async function loadPages() {
    setError("");
    setIsLoadingPages(true);
    try {
      const payload = await readJson<{ data: FacebookPage[] }>("/api/meta/pages");
      const nextPages = payload.data ?? [];
      setPages(nextPages);
      setSelectedPageId((current) => {
        if (current && nextPages.some((page) => page.id === current)) return current;
        return nextPages[0]?.id || "";
      });
    } catch (loadError) {
      setPages([]);
      setSelectedPageId("");
      setError(loadError instanceof Error ? loadError.message : "Không tải được danh sách Fanpage.");
    } finally {
      setIsLoadingPages(false);
    }
  }

  async function loadDraftInbox() {
    setError("");
    setIsLoadingDrafts(true);
    try {
      const payload = await readJson<{ data: FacebookDraftInboxItem[]; summary?: DraftSummary; storage?: string }>("/api/facebook-publisher/drafts");
      const nextDrafts = payload.data ?? [];
      setDraftInbox(nextDrafts);
      setDraftSummary(payload.summary ?? emptyDraftSummary);
      setActiveDraftId((current) => {
        if (current && nextDrafts.some((item) => item.id === current)) return current;
        return nextDrafts[0]?.id ?? null;
      });
      if (payload.storage === "missing_schema") {
        setNotice("Chưa có bảng lưu draft Agent. Hãy chạy migration facebook_post_drafts.");
      }
    } catch (loadError) {
      setDraftInbox([]);
      setActiveDraftId(null);
      setError(loadError instanceof Error ? loadError.message : "Không tải được draft.");
    } finally {
      setIsLoadingDrafts(false);
    }
  }

  useEffect(() => {
    if (accessState.kind !== "ready") return;

    let cancelled = false;

    async function loadInitialData() {
      try {
        const [pagesPayload, draftsPayload] = await Promise.all([
          readJson<{ data: FacebookPage[] }>("/api/meta/pages"),
          readJson<{ data: FacebookDraftInboxItem[]; summary?: DraftSummary; storage?: string }>("/api/facebook-publisher/drafts")
        ]);
        if (cancelled) return;

        const nextPages = pagesPayload.data ?? [];
        const nextDrafts = draftsPayload.data ?? [];
        setPages(nextPages);
        setSelectedPageId(nextPages[0]?.id || "");
        setDraftInbox(nextDrafts);
        setDraftSummary(draftsPayload.summary ?? emptyDraftSummary);
        setActiveDraftId(nextDrafts[0]?.id ?? null);
        if (draftsPayload.storage === "missing_schema") {
          setNotice("Chưa có bảng lưu draft Agent. Hãy chạy migration facebook_post_drafts.");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Không tải được dữ liệu đăng bài.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPages(false);
          setIsLoadingDrafts(false);
        }
      }
    }

    void loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [accessState.kind]);

  function chooseDraft(item: FacebookDraftInboxItem) {
    setActiveDraftId(item.id);
    setPublishResult(null);
    setNotice("");
    setError("");
    if (item.pageId && pages.some((page) => page.id === item.pageId)) {
      setSelectedPageId(item.pageId);
    }
  }

  async function markDraftDone(draftId: string, result: PublishResult) {
    await readJson<{ data: FacebookDraftInboxItem }>("/api/facebook-publisher/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: draftId,
        status: "published",
        publish_result: result
      })
    });
    await loadDraftInbox();
  }

  async function publishCurrent() {
    if (!selectedDraft || !activeDraftId || !selectedPageId) return;
    setError("");
    setNotice("");
    setPublishResult(null);
    setIsPublishing(true);

    try {
      const payload = await readJson<{ data: PublishResult }>("/api/facebook-publisher/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_id: selectedPageId,
          approved: true,
          draft: { ...selectedDraft, approved: true, scheduledPublishTime: undefined }
        })
      });
      setPublishResult(payload.data);
      await markDraftDone(activeDraftId, payload.data);
      setNotice("Đã đăng bài lên Fanpage. Draft đã được đưa khỏi hàng chờ.");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Không đăng được bài.");
    } finally {
      setIsPublishing(false);
    }
  }

  if (accessState.kind === "needs_facebook") {
    return <FacebookRequiredState accessState={accessState} />;
  }

  return (
    <div className="space-y-6">
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

      <section className="rounded-2xl border border-[#dbe7fb] bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
        <div className="grid gap-3 md:grid-cols-4">
          {steps.map((step, index) => {
            const active =
              (index === 0 && !selectedPageId) ||
              (index === 1 && selectedPageId && !selectedDraft) ||
              (index === 2 && selectedPageId && selectedDraft && !publishResult) ||
              (index === 3 && publishResult);
            return (
              <div
                key={step}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                  active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <span className="grid size-8 place-items-center rounded-full bg-white text-sm font-extrabold shadow-sm">{index + 1}</span>
                <span className="text-sm font-extrabold">{step}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-6">
          <Card className="rounded-2xl border-[#dbe7fb] bg-white shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>1. Chọn page</CardTitle>
                <CardDescription>Chọn Fanpage sẽ nhận bài đăng. App dùng token server-side từ lần đăng nhập Facebook hiện tại.</CardDescription>
              </div>
              <Badge>{isLoadingPages ? "Đang tải" : `${pages.length} Page`}</Badge>
            </CardHeader>

            {pages.length ? (
              <div className="grid gap-3">
                <select
                  className="min-h-12 w-full rounded-xl border border-[#dbe7fb] bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  value={selectedPageId}
                  onChange={(event) => {
                    setSelectedPageId(event.target.value);
                    setPublishResult(null);
                  }}
                >
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name} {page.category ? `- ${page.category}` : ""} {page.has_access_token === false ? "(thiếu quyền đăng)" : ""}
                    </option>
                  ))}
                </select>
                {selectedPage?.has_access_token === false ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                    Page này chưa có quyền đăng bài. Hãy kiểm tra quyền Page trong Facebook rồi kết nối lại tài khoản nếu cần.
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyPanel
                icon="flag"
                title={isLoadingPages ? "Đang tải Fanpage..." : "Chưa đọc được Fanpage"}
                description="Nếu tài khoản Facebook đã kết nối nhưng chưa thấy Page, hãy kiểm tra quyền quản trị Page và quyền pages_manage_posts."
                actionLabel="Tải lại Page"
                onAction={() => void loadPages()}
              />
            )}
          </Card>

          <Card className="rounded-2xl border-[#dbe7fb] bg-white shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>2. Chọn bài trong Draft</CardTitle>
                <CardDescription>Danh sách bài đã được Agent nạp vào app. Chọn một bài để xem preview và đăng.</CardDescription>
              </div>
              <Button variant="secondary" onClick={() => void loadDraftInbox()}>
                <MaterialIcon name="refresh" />
                Tải lại
              </Button>
            </CardHeader>

            {draftInbox.length ? (
              <div className="grid max-h-[620px] gap-3 overflow-y-auto pr-2">
                {draftInbox.map((item) => {
                  const active = item.id === activeDraftId;
                  const draftImage = getDraftImageSrc(item.draft);
                  return (
                    <button
                      key={item.id}
                      className={`grid gap-4 rounded-2xl border p-4 text-left transition md:grid-cols-[88px_minmax(0,1fr)] ${
                        active ? "border-blue-500 bg-blue-50 shadow-sm" : "border-[#dbe7fb] bg-white hover:border-blue-300 hover:bg-slate-50"
                      }`}
                      onClick={() => chooseDraft(item)}
                      type="button"
                    >
                      {draftImage ? (
                        <span className="block h-24 overflow-hidden rounded-xl bg-slate-100 md:h-20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img alt={item.draft.imageAlt || item.draft.title} className="h-full w-full object-cover" src={draftImage} />
                        </span>
                      ) : (
                        <span className="grid h-24 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500 md:h-20">
                          Chưa có ảnh
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="line-clamp-1 text-base font-extrabold text-slate-950">{item.draft.title}</span>
                          <Badge>{item.status}</Badge>
                        </span>
                        <span className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.draft.message || "Chưa có caption"}</span>
                        <span className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-400">
                          {item.createdAt ? <span>Nạp lúc {formatDateTime(item.createdAt)}</span> : null}
                          {item.pageId ? <span>Page gợi ý: {item.pageId}</span> : null}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyPanel
                icon="article"
                title={isLoadingDrafts ? "Đang tải Draft..." : "Chưa có bài trong Draft"}
                description="Khi Agent nạp bài vào app, bài sẽ xuất hiện ở đây để anh/chị chọn và đăng."
                actionLabel="Tải lại Draft"
                onAction={() => void loadDraftInbox()}
              />
            )}
          </Card>

          <div className="grid gap-3 rounded-2xl border border-[#dbe7fb] bg-white p-5 text-sm text-slate-600 md:grid-cols-4">
            <Stat label="Draft chờ đăng" value={draftSummary.draft} />
            <Stat label="Đã đăng" value={draftSummary.published} />
            <Stat label="Đang lên lịch" value={draftSummary.scheduled} />
            <Stat label="Đã ẩn" value={draftSummary.hidden} />
          </div>
        </div>

        <aside className="space-y-6">
          <Card className="sticky top-24 rounded-2xl border-[#dbe7fb] bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
            <CardHeader>
              <CardTitle>3. Preview</CardTitle>
              <CardDescription>{selectedPage ? `Fanpage: ${selectedPage.name}` : "Chưa chọn Fanpage"}</CardDescription>
            </CardHeader>

            <div className="rounded-2xl border border-[#dbe7fb] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-full bg-blue-600 text-white">
                  <MaterialIcon filled name="flag" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-950">{selectedPage?.name || "Fanpage"}</p>
                  <p className="text-xs font-semibold text-slate-400">Bản xem trước</p>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-800">{selectedDraft?.message || "Chọn một draft để xem nội dung bài đăng."}</p>
              {selectedDraft?.link ? <p className="mt-3 break-all text-sm font-bold text-blue-600">{selectedDraft.link}</p> : null}

              {draftImages.length ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {draftImages.map((item, index) => (
                    <button
                      key={`${item.src}-${index}`}
                      className={draftImages.length === 1 ? "col-span-2 overflow-hidden rounded-xl" : "overflow-hidden rounded-xl"}
                      onClick={() => setImageModal({ src: item.src, alt: item.alt })}
                      type="button"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt={item.alt} className="aspect-square w-full object-cover" src={item.src} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-4 grid aspect-square place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                  Chưa có ảnh
                </div>
              )}
            </div>

            {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
            {notice ? <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-700">{notice}</div> : null}

            <Button className="mt-5 w-full min-h-12 rounded-xl text-base" disabled={!canPublish} onClick={() => void publishCurrent()}>
              <MaterialIcon name={isPublishing ? "hourglass_top" : "send"} />
              {isPublishing ? "Đang đăng..." : "4. Đăng"}
            </Button>

            {publishResult ? (
              <div className="mt-5 rounded-xl border border-[#dbe7fb] bg-slate-50 p-4 text-sm leading-6">
                <p className="font-extrabold text-slate-950">Đã nhận kết quả từ Meta</p>
                <p className="text-slate-600">Loại bài: {publishResult.mode === "photo" ? "Ảnh" : "Text/link"}</p>
                <p className="break-all text-slate-600">Post ID: {publishResult.post_id}</p>
                <a className="mt-2 inline-flex font-bold text-blue-600 hover:underline" href={postUrlFromId(publishResult.post_id)} target="_blank">
                  Mở bài trên Facebook
                </a>
              </div>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function FacebookRequiredState({ accessState }: { accessState: Extract<PublisherAccessState, { kind: "needs_facebook" }> }) {
  return (
    <Card className="mx-auto max-w-2xl rounded-2xl border-[#dbe7fb] bg-white p-8 text-center shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
        <MaterialIcon className="text-[28px]" name="login" />
      </div>
      <h2 className="mt-5 text-2xl font-extrabold text-slate-950">{accessState.title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{accessState.message}</p>
      <Button className="mt-6 min-h-12 rounded-xl px-6" onClick={() => window.location.assign("/api/auth/facebook/start?force=1")}>
        <span className="grid size-6 place-items-center rounded-md bg-white text-blue-600">f</span>
        Kết nối Facebook
      </Button>
    </Card>
  );
}

function EmptyPanel({
  icon,
  title,
  description,
  actionLabel,
  onAction
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#cbd8ee] bg-slate-50 p-6 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-xl bg-white text-blue-600 shadow-sm">
        <MaterialIcon name={icon} />
      </div>
      <p className="mt-4 font-extrabold text-slate-950">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
      <Button className="mt-5" variant="secondary" onClick={onAction}>
        <MaterialIcon name="refresh" />
        {actionLabel}
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-950">{value}</p>
    </div>
  );
}
