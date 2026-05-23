"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { MaterialIcon } from "@/components/material-icon";
import { normalizeAgentPostDraft, type FacebookDraftInboxItem, type NormalizedAgentPostDraft } from "@/lib/facebook-publisher";
import { AgentKeyManager } from "./agent-key-manager";

type FacebookPage = {
  id: string;
  name: string;
  category?: string;
};

type PublishResult = {
  mode: "feed" | "photo";
  page_id: string;
  post_id: string;
  photo_id?: string;
};

const defaultPageStorageKey = "adplan-facebook-publisher-default-page-id";

const starterDraft: NormalizedAgentPostDraft = {
  title: "Bài đăng mới từ Agent",
  message: "",
  link: "",
  imageUrl: "",
  imageDataUrl: "",
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

export function FacebookPublisherClient() {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [defaultPageId, setDefaultPageId] = useState("");
  const [draft, setDraft] = useState<NormalizedAgentPostDraft>(starterDraft);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [draftInbox, setDraftInbox] = useState<FacebookDraftInboxItem[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [agentJson, setAgentJson] = useState("");
  const [approved, setApproved] = useState(false);
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);

  async function loadDraftInbox() {
    try {
      const payload = await readJson<{ data: FacebookDraftInboxItem[]; storage?: string }>("/api/facebook-publisher/drafts");
      setDraftInbox(payload.data ?? []);
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
    readJson<{ data: FacebookDraftInboxItem[]; storage?: string }>("/api/facebook-publisher/drafts")
      .then((payload) => {
        if (cancelled) return;
        setDraftInbox(payload.data ?? []);
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
  const selectedInboxDrafts = useMemo(
    () => draftInbox.filter((item) => selectedDraftIds.includes(item.id)),
    [draftInbox, selectedDraftIds]
  );
  const imagePreview = draft.imageDataUrl || draft.imageUrl || "";
  const canPublish = Boolean(selectedPageId && draft.message.trim() && approved && !isPublishing);
  const canBatchPublish = Boolean(selectedDraftIds.length && selectedPageId && approved && !isPublishing);

  function updateDraft(patch: Partial<NormalizedAgentPostDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setPublishResult(null);
    setNotice("");
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
    if (item.pageId) setSelectedPageId(item.pageId);
    setPublishResult(null);
    setError("");
    setNotice("Đã nạp draft Agent vào preview. Khách chỉ cần kiểm tra, tick duyệt và bấm đăng.");
  }

  function toggleInboxDraft(itemId: string) {
    setSelectedDraftIds((current) => (current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]));
  }

  function loadExample() {
    const example = {
      title: "Post bán hàng từ Agent",
      caption: "Bạn đang có content nhưng chưa biến nó thành lịch đăng đều?\nAdplan AI giúp nạp draft, duyệt và đăng lên Fanpage từ một màn hình.",
      cta: "Inbox để nhận tư vấn",
      link: "https://www.theanhmarketing.com/",
      image: {
        url: "",
        alt: "Ảnh social post do Agent tạo"
      },
      approved: false
    };
    setAgentJson(JSON.stringify(example, null, 2));
  }

  async function handleImageFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("File upload phải là ảnh.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateDraft({ imageDataUrl: String(reader.result || ""), imageUrl: "" });
    };
    reader.onerror = () => setError("Không đọc được file ảnh.");
    reader.readAsDataURL(file);
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
    setDraftInbox((current) => current.filter((item) => item.id !== draftId));
    setSelectedDraftIds((current) => current.filter((id) => id !== draftId));
    if (activeDraftId === draftId) setActiveDraftId(null);
  }

  async function publishOne(options?: { draftToPublish?: NormalizedAgentPostDraft; pageId?: string; draftId?: string | null }) {
    const draftToPublish = options?.draftToPublish ?? draft;
    const pageId = options?.pageId || selectedPageId;
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
      await markDraftDone(options.draftId, payload.data);
    }

    return payload.data;
  }

  async function publishCurrent() {
    setError("");
    setNotice("");
    setPublishResult(null);
    setIsPublishing(true);

    try {
      const result = await publishOne({ draftId: activeDraftId });
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
      for (const item of selectedInboxDrafts) {
        const pageId = item.pageId || selectedPageId;
        await publishOne({ draftToPublish: { ...item.draft, approved: true }, pageId, draftId: item.id });
        successCount += 1;
      }
      setNotice(`Đã gửi ${successCount} bài sang Meta. Các bài đã đăng/lên lịch được ẩn khỏi hàng chờ.`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Không đăng được danh sách bài đã chọn.");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
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
                    {page.name} {page.category ? `- ${page.category}` : ""}
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={saveDefaultPage}>
                <MaterialIcon name={defaultPageId === selectedPageId ? "star" : "star_border"} />
                {defaultPageId === selectedPageId ? "Page mặc định" : "Đặt mặc định"}
              </Button>
              <Button variant="secondary" onClick={() => window.location.assign("/api/auth/facebook/start")}>
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
              <Button className="mt-4" onClick={() => window.location.assign("/api/auth/facebook/start")}>
                <MaterialIcon name="login" />
                Đăng nhập Facebook
              </Button>
            </div>
          )}
        </Card>

        <AgentKeyManager />

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
                  Đăng {selectedDraftIds.length || ""} bài
                </Button>
              </div>
            </div>
          </CardHeader>

          {draftInbox.length ? (
            <div className="grid gap-3">
              {draftInbox.map((item) => {
                const isSelected = selectedDraftIds.includes(item.id);
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
                        onChange={() => toggleInboxDraft(item.id)}
                        type="checkbox"
                      />
                      <button className="min-w-0 flex-1 text-left" onClick={() => applyInboxDraft(item)} type="button">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-extrabold text-on-surface">{item.draft.title}</p>
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-on-surface-variant">{item.draft.message || "Chưa có caption"}</p>
                          </div>
                          <Badge>{item.status}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-outline">
                          {item.createdAt ? <span>Nạp lúc {new Date(item.createdAt).toLocaleString("vi-VN")}</span> : null}
                          {item.draft.scheduledPublishTime ? <span>Lịch đăng {new Date(item.draft.scheduledPublishTime).toLocaleString("vi-VN")}</span> : null}
                        </div>
                      </button>
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
                <Input
                  placeholder="https://..."
                  value={draft.imageUrl || ""}
                  onChange={(event) => updateDraft({ imageUrl: event.target.value, imageDataUrl: "" })}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-on-surface">Upload ảnh từ Agent</span>
                <Input type="file" accept="image/*" onChange={(event) => handleImageFile(event.target.files?.[0])} />
              </label>
            </div>
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
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={draft.imageAlt || "Ảnh bài đăng"} className="mt-4 aspect-square w-full rounded-lg object-cover" src={imagePreview} />
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
