"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { buildCampaignValidation, buildInternalAudienceSuggestions, generateCampaignDraft } from "@/lib/campaign-builder";
import { getCachedJson, getCachedState, setCachedState } from "@/lib/meta/client-cache";
import { applyDefaultAdAccount, getDefaultAdAccountId, setDefaultAdAccountId } from "@/lib/meta/default-account";
import type {
  AdAccount,
  AudienceSuggestion,
  CampaignBuilderInput,
  CampaignDraft,
  CampaignTemplate,
  FacebookPage,
  FacebookPagePost,
  SavedAudience
} from "@/lib/meta/types";

const defaultInput: CampaignBuilderInput = {
  adAccountId: "",
  pageId: "",
  pageName: "",
  postId: "",
  postMessage: "",
  productName: "",
  industry: "",
  objective: "Tin nhắn",
  dailyBudget: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  runContinuously: true,
  fanpage: "",
  website: "",
  location: "Việt Nam",
  targetCustomer: "",
  offer: "",
  notes: "",
  mediaNote: "Chọn media sau",
  mediaFiles: []
};

const CAMPAIGN_BUILDER_CACHE_KEY = "campaign-builder:state";

async function readJson<T>(url: string, init?: RequestInit & { force?: boolean }) {
  if (!init || !init.method || init.method === "GET") {
    return getCachedJson<T>(url, { force: init?.force });
  }
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Không thể lấy dữ liệu.");
  return payload;
}

function localTemplateKey(accountId: string) {
  return `adplanner_campaign_templates_${accountId || "global"}`;
}

function readLocalTemplates(accountId: string) {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(localTemplateKey(accountId)) || "[]") as CampaignTemplate[];
  } catch {
    return [];
  }
}

function saveLocalTemplate(accountId: string, template: CampaignTemplate) {
  if (typeof window === "undefined") return;
  const current = readLocalTemplates(accountId).filter((item) => item.id !== template.id);
  window.localStorage.setItem(localTemplateKey(accountId), JSON.stringify([template, ...current].slice(0, 50)));
}

function localAudienceKey(accountId: string) {
  return `adplanner_saved_audiences_${accountId || "global"}`;
}

function readLocalAudiences(accountId: string) {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(localAudienceKey(accountId)) || "[]") as SavedAudience[];
  } catch {
    return [];
  }
}

export function CampaignBuilderClient() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [posts, setPosts] = useState<FacebookPagePost[]>([]);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [savedAudiences, setSavedAudiences] = useState<SavedAudience[]>([]);
  const [selectedSavedAudienceId, setSelectedSavedAudienceId] = useState("");
  const [form, setForm] = useState<CampaignBuilderInput>(defaultInput);
  const [interests, setInterests] = useState<AudienceSuggestion[]>([]);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  const [interestNotice, setInterestNotice] = useState("");
  const [fanpageUrl, setFanpageUrl] = useState("");
  const [pageCheckNotice, setPageCheckNotice] = useState("");
  const [searching, setSearching] = useState(false);
  const [checkingPage, setCheckingPage] = useState(false);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const needsPost = form.objective === "Tin nhắn" || form.objective === "Tương tác";
  const needsLanding = form.objective === "Chuyển đổi" || form.objective === "Traffic" || form.objective === "Sales";

  useEffect(() => {
    const cached = getCachedState<{
      accounts: AdAccount[];
      selectedAccountId: string;
      pages: FacebookPage[];
      posts: FacebookPagePost[];
      templates: CampaignTemplate[];
      savedAudiences: SavedAudience[];
      form: CampaignBuilderInput;
      interests: AudienceSuggestion[];
      selectedInterestIds: string[];
      draft: CampaignDraft | null;
    }>(CAMPAIGN_BUILDER_CACHE_KEY);
    if (cached) {
      queueMicrotask(() => {
              setAccounts(cached.accounts);
              setSelectedAccountId(cached.selectedAccountId);
              setPages(cached.pages);
              setPosts(cached.posts);
              setTemplates(cached.templates);
              setSavedAudiences(cached.savedAudiences);
              setForm(cached.form);
              setInterests(cached.interests);
              setSelectedInterestIds(cached.selectedInterestIds);
              setDraft(cached.draft);
      });
      return;
    }

    readJson<{ data: AdAccount[] }>("/api/meta/adaccounts")
      .then(async (payload) => {
        const rows = payload.data ?? [];
        setAccounts(rows);
        const accountId = applyDefaultAdAccount(rows, getDefaultAdAccountId() || rows[0]?.id);
        setSelectedAccountId(accountId);
        setForm((prev) => ({ ...prev, adAccountId: accountId }));
        if (accountId) {
          await Promise.all([loadPages(), loadTemplates(accountId), loadSavedAudiences(accountId)]);
        }
      })
      .catch((err: Error) => setInterestNotice(err.message));
  }, []);

  useEffect(() => {
    if (!selectedAccountId && !form.productName && !draft) return;
    setCachedState(CAMPAIGN_BUILDER_CACHE_KEY, {
      accounts,
      selectedAccountId,
      pages,
      posts,
      templates,
      savedAudiences,
      form,
      interests,
      selectedInterestIds,
      draft
    });
  }, [accounts, selectedAccountId, pages, posts, templates, savedAudiences, form, interests, selectedInterestIds, draft]);

  useEffect(() => {
    if (!form.pageId || !needsPost) return;
    const timer = window.setTimeout(() => {
      void loadPosts(form.pageId!);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [form.pageId, needsPost]);

  const selectedInterests = useMemo(
    () => interests.filter((interest) => selectedInterestIds.includes(interest.id)),
    [interests, selectedInterestIds]
  );

  const validation = useMemo(() => buildCampaignValidation({ ...form, adAccountId: selectedAccountId }), [form, selectedAccountId]);
  const missingCount = validation.filter((item) => !item.ok).length;

  function updateField<K extends keyof CampaignBuilderInput>(field: K, value: CampaignBuilderInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function loadTemplates(accountId: string) {
    try {
      const payload = await readJson<{ data: CampaignTemplate[]; storage?: string }>(`/api/campaign-templates?account_id=${encodeURIComponent(accountId)}`);
      const localTemplates = readLocalTemplates(accountId);
      setTemplates([...(payload.data ?? []), ...localTemplates]);
    } catch {
      setTemplates(readLocalTemplates(accountId));
    }
  }

  async function loadSavedAudiences(accountId: string) {
    try {
      const payload = await readJson<{ data: SavedAudience[]; storage?: string }>(`/api/saved-audiences?account_id=${encodeURIComponent(accountId)}`);
      setSavedAudiences([...(payload.data ?? []), ...readLocalAudiences(accountId)]);
    } catch {
      setSavedAudiences(readLocalAudiences(accountId));
    }
  }

  async function loadPages() {
    setLoadingPages(true);
    try {
      const payload = await readJson<{ data: FacebookPage[] }>("/api/meta/pages");
      setPages(payload.data ?? []);
    } catch (err) {
      setPages([]);
      setInterestNotice(err instanceof Error ? err.message : "Không thể tải danh sách fanpage.");
    } finally {
      setLoadingPages(false);
    }
  }

  async function checkFanpagePermission() {
    if (!fanpageUrl.trim()) {
      toast.error("Nhập link fanpage trước.");
      return;
    }

    setCheckingPage(true);
    setPageCheckNotice("");
    try {
      const payload = await readJson<{
        data: { ok: boolean; message: string; page?: FacebookPage };
      }>(`/api/meta/page-check?url=${encodeURIComponent(fanpageUrl.trim())}`);

      setPageCheckNotice(payload.data.message);
      if (payload.data.ok && payload.data.page) {
        const page = payload.data.page;
        setPages((current) => (current.some((item) => item.id === page.id) ? current : [...current, page]));
        setForm((current) => ({
          ...current,
          pageId: page.id,
          pageName: page.name,
          fanpage: page.name,
          postId: "",
          postMessage: ""
        }));
        setPosts([]);
        toast.success("Đã xác nhận quyền Fanpage.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể kiểm tra quyền Fanpage.";
      setPageCheckNotice(message);
      toast.error(message);
    } finally {
      setCheckingPage(false);
    }
  }

  async function loadPosts(pageId: string) {
    setLoadingPosts(true);
    try {
      const payload = await readJson<{ data: FacebookPagePost[] }>(`/api/meta/page-posts?page_id=${encodeURIComponent(pageId)}`);
      setPosts(payload.data ?? []);
      if (!(payload.data ?? []).length) {
        setInterestNotice("Fanpage chưa có bài viết phù hợp hoặc thiếu quyền pages_read_engagement/pages_show_list.");
      }
    } catch (err) {
      setPosts([]);
      setInterestNotice(err instanceof Error ? err.message : "Không thể tải bài viết từ fanpage.");
    } finally {
      setLoadingPosts(false);
    }
  }

  async function onAccountChange(nextAccountId: string) {
    setSelectedAccountId(nextAccountId);
    setDefaultAdAccountId(nextAccountId);
    setForm((prev) => ({ ...prev, adAccountId: nextAccountId }));
    await Promise.all([loadTemplates(nextAccountId), loadSavedAudiences(nextAccountId)]);
  }

  async function searchInterests() {
    const query = [form.industry, form.productName, form.targetCustomer].filter(Boolean).join(" ");
    if (!query.trim()) {
      toast.error("Nhập ngành hàng, sản phẩm hoặc mô tả khách hàng trước.");
      return;
    }

    setSearching(true);
    setInterestNotice("");
    try {
      const params = new URLSearchParams({ q: query, ad_account_id: selectedAccountId });
      const payload = await readJson<{ data: AudienceSuggestion[] }>(`/api/meta/targeting-search?${params.toString()}`);
      const facebookInterests = payload.data ?? [];
      if (!facebookInterests.length) {
        throw new Error("Facebook chưa trả về interest phù hợp.");
      }
      setInterests(facebookInterests);
      setSelectedInterestIds(facebookInterests.slice(0, 5).map((item) => item.id));
      setInterestNotice("Interest đã được lấy từ Facebook Targeting Search.");
    } catch (err) {
      const fallback = buildInternalAudienceSuggestions(form);
      setInterests(fallback);
      setSelectedInterestIds(fallback.slice(0, 4).map((item) => item.id));
      setInterestNotice(`${err instanceof Error ? err.message : "Không gọi được Facebook Targeting Search."} Gợi ý nội bộ, chưa xác minh từ Facebook.`);
    } finally {
      setSearching(false);
    }
  }

  function applySavedAudience(savedId: string) {
    setSelectedSavedAudienceId(savedId);
    const row = savedAudiences.find((item) => item.id === savedId);
    if (!row) return;
    setForm((current) => ({
      ...current,
      location: row.payload.locations || current.location,
      targetCustomer: [row.payload.ageRange, row.payload.gender, row.payload.behaviors].filter(Boolean).join(" · ")
    }));

    if (row.payload.interests) {
      const hints = row.payload.interests
        .split(",")
        .map((item, index) => ({
          id: `saved-${index + 1}`,
          name: item.trim(),
          source: "internal" as const
        }))
        .filter((item) => item.name);
      setInterests(hints);
      setSelectedInterestIds(hints.map((item) => item.id));
    }
  }

  function onPageChange(pageId: string) {
    const page = pages.find((item) => item.id === pageId);
    setForm((current) => ({
      ...current,
      pageId,
      pageName: page?.name || "",
      fanpage: page?.name || "",
      postId: "",
      postMessage: ""
    }));
    setPosts([]);
  }

  function onPostChange(postId: string) {
    const post = posts.find((item) => item.id === postId);
    setForm((current) => ({
      ...current,
      postId,
      postMessage: post?.message || ""
    }));
  }

  function generateDraft() {
    if (!form.productName.trim() || !form.industry.trim() || !form.dailyBudget.trim()) {
      toast.error("Vui lòng nhập tên sản phẩm, ngành hàng và ngân sách.");
      return;
    }
    const nextDraft = generateCampaignDraft({ ...form, adAccountId: selectedAccountId }, selectedInterests);
    setDraft(nextDraft);
  }

  async function saveTemplate() {
    const templateName = window.prompt(
      "Tên mẫu chiến dịch (để dùng lại):",
      `${form.objective} - ${form.productName || "Mẫu mới"}`
    );
    if (!templateName) return;

    try {
      await readJson("/api/campaign-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          account_id: selectedAccountId || null,
          objective: form.objective,
          payload: { ...form, adAccountId: selectedAccountId }
        })
      }).then((payload) => {
        const result = payload as { data?: CampaignTemplate; storage?: string };
        if (result.storage === "local" && result.data) {
          saveLocalTemplate(selectedAccountId, result.data);
          toast.success("Đã lưu lại chiến dịch trên trình duyệt. Khi DB được cập nhật, app sẽ lưu lên Supabase.");
          return;
        }
        toast.success("Đã lưu lại chiến dịch.");
      });
      if (selectedAccountId) await loadTemplates(selectedAccountId);
    } catch (err) {
      const localTemplate: CampaignTemplate = {
        id: `local-${Date.now()}`,
        user_id: "local",
        account_id: selectedAccountId || null,
        name: templateName,
        objective: form.objective,
        payload: { ...form, adAccountId: selectedAccountId },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      saveLocalTemplate(selectedAccountId, localTemplate);
      setTemplates((current) => [localTemplate, ...current]);
      toast.success("Đã lưu lại chiến dịch trên trình duyệt.");
    }
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setForm(template.payload);
    setDraft(null);
    toast.success("Đã nạp mẫu chiến dịch.");
  }

  function exportJson() {
    const nextDraft = draft ?? generateCampaignDraft({ ...form, adAccountId: selectedAccountId }, selectedInterests);
    const blob = new Blob([JSON.stringify(nextDraft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `campaign-draft-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyConfig() {
    const nextDraft = draft ?? generateCampaignDraft({ ...form, adAccountId: selectedAccountId }, selectedInterests);
    await navigator.clipboard.writeText(JSON.stringify(nextDraft, null, 2));
    toast.success("Đã copy cấu hình campaign.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <Card className="rounded-lg p-6">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <Field label="Tài khoản quảng cáo">
              <select className="dashboard-input" value={selectedAccountId} onChange={(event) => void onAccountChange(event.target.value)}>
                {accounts.length
                  ? accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name || account.id} - {account.id}
                      </option>
                    ))
                  : <option value="">Chưa có tài khoản</option>}
              </select>
            </Field>
            <Field label="Mẫu chiến dịch đã lưu">
              <select className="dashboard-input" defaultValue="" onChange={(event) => applyTemplate(event.target.value)}>
                <option value="">Chọn mẫu để nạp</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tệp khách hàng đã lưu">
              <select className="dashboard-input" value={selectedSavedAudienceId} onChange={(event) => applySavedAudience(event.target.value)}>
                <option value="">Chọn tệp đã lưu</option>
                {savedAudiences.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} · {item.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        <Card className="rounded-lg p-6">
          <div className="mb-5">
            <h3 className="text-lg font-extrabold">Thông tin campaign</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Nhập dữ liệu để tạo preview campaign trước khi launch thật trên Meta.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tên sản phẩm/dịch vụ">
              <Input value={form.productName} onChange={(event) => updateField("productName", event.target.value)} placeholder="Ví dụ: Khóa học AI Marketing" />
            </Field>
            <Field label="Ngành hàng">
              <Input value={form.industry} onChange={(event) => updateField("industry", event.target.value)} placeholder="Giáo dục, spa, bất động sản..." />
            </Field>
            <Field label="Mục tiêu quảng cáo">
              <select
                className="dashboard-input"
                value={form.objective}
                onChange={(event) => {
                  const nextObjective = event.target.value as CampaignBuilderInput["objective"];
                  updateField("objective", nextObjective);
                  if (nextObjective !== "Tin nhắn" && nextObjective !== "Tương tác") {
                    setPosts([]);
                    setForm((current) => ({ ...current, postId: "", postMessage: "" }));
                  }
                }}
              >
                <option>Tin nhắn</option>
                <option>Tương tác</option>
                <option>Lead</option>
                <option>Chuyển đổi</option>
                <option>Traffic</option>
                <option>Sales</option>
              </select>
            </Field>
            <Field label="Ngân sách mỗi ngày">
              <Input value={form.dailyBudget} onChange={(event) => updateField("dailyBudget", event.target.value)} placeholder="Ví dụ: 500.000đ" />
            </Field>
            <Field label="Ngày bắt đầu">
              <Input type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} />
            </Field>
            <Field label="Ngày kết thúc">
              <Input type="date" value={form.endDate} disabled={form.runContinuously} onChange={(event) => updateField("endDate", event.target.value)} />
            </Field>
            <label className="flex items-center gap-3 rounded-md bg-surface-container-low p-4 text-sm font-bold md:col-span-2">
              <input type="checkbox" checked={form.runContinuously} onChange={(event) => updateField("runContinuously", event.target.checked)} />
              Chạy liên tục, chưa đặt ngày kết thúc
            </label>

            <Field label="Fanpage (chọn từ tài khoản)">
              <select className="dashboard-input" value={form.pageId || ""} onChange={(event) => onPageChange(event.target.value)}>
                <option value="">{loadingPages ? "Đang tải fanpage..." : "Chọn fanpage"}</option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Kiểm tra quyền bằng link Fanpage">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input value={fanpageUrl} onChange={(event) => setFanpageUrl(event.target.value)} placeholder="https://facebook.com/tenfanpage" />
                <Button onClick={() => void checkFanpagePermission()} disabled={checkingPage}>
                  {checkingPage ? "Đang kiểm tra..." : "Kiểm tra"}
                </Button>
              </div>
              {pageCheckNotice ? <p className="text-xs font-semibold text-on-surface-variant">{pageCheckNotice}</p> : null}
            </Field>

            <Field label={needsPost ? "Bài viết có sẵn trên page" : "Bài viết có sẵn (không bắt buộc)"}>
              <select className="dashboard-input" value={form.postId || ""} onChange={(event) => onPostChange(event.target.value)} disabled={!form.pageId || !needsPost}>
                <option value="">
                  {!needsPost ? "Không bắt buộc với mục tiêu này" : loadingPosts ? "Đang tải bài viết..." : "Chọn bài viết"}
                </option>
                {posts.map((post) => (
                  <option key={post.id} value={post.id}>
                    {(post.message || "Bài viết không có text").slice(0, 70)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Website/Landing page">
              <Input value={form.website} onChange={(event) => updateField("website", event.target.value)} placeholder={needsLanding ? "Bắt buộc cho chuyển đổi/traffic/sales" : "https://..."} />
            </Field>
            <Field label="Khu vực chạy">
              <Input value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="TP.HCM, Hà Nội, toàn quốc..." />
            </Field>
            <Field label="Media (đường dẫn hoặc ghi chú)" className="md:col-span-2">
              <Textarea value={form.mediaNote} onChange={(event) => updateField("mediaNote", event.target.value)} placeholder="Ví dụ: video testimonial, ảnh ưu đãi..." />
            </Field>
            <Field label="Thêm hình ảnh/video" className="md:col-span-2">
              <input
                className="dashboard-input"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []).map((file) => file.name);
                  updateField("mediaFiles", files);
                }}
              />
            </Field>
            <Field label="Mô tả khách hàng mục tiêu" className="md:col-span-2">
              <Textarea value={form.targetCustomer} onChange={(event) => updateField("targetCustomer", event.target.value)} placeholder="Ai là người mua chính, độ tuổi, nhu cầu, bối cảnh..." />
            </Field>
            <Field label="Offer/ưu đãi" className="md:col-span-2">
              <Textarea value={form.offer} onChange={(event) => updateField("offer", event.target.value)} placeholder="Ưu đãi, cam kết, lợi ích nổi bật..." />
            </Field>
            <Field label="Ghi chú thêm" className="md:col-span-2">
              <Textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Lưu ý về sản phẩm, điều kiện, bằng chứng, ràng buộc..." />
            </Field>
          </div>
        </Card>

        <Card className="rounded-lg p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-extrabold">Tệp sở thích/hành vi</h3>
              <p className="mt-1 text-sm text-on-surface-variant">Ưu tiên tìm từ Facebook Targeting Search. Nếu lỗi sẽ dùng gợi ý nội bộ.</p>
            </div>
            <Button onClick={() => void searchInterests()} disabled={searching || !selectedAccountId}>
              <MaterialIcon name="search" />
              {searching ? "Đang tìm..." : "Tìm từ Facebook"}
            </Button>
          </div>

          {interestNotice ? <p className="mb-4 rounded-md bg-surface-container-low p-4 text-sm leading-6 text-on-surface-variant">{interestNotice}</p> : null}
          <div className="grid gap-3 md:grid-cols-2">
            {interests.map((interest) => (
              <label key={interest.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-outline-variant/70 bg-white p-4">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={selectedInterestIds.includes(interest.id)}
                  onChange={(event) =>
                    setSelectedInterestIds((current) => (event.target.checked ? [...current, interest.id] : current.filter((id) => id !== interest.id)))
                  }
                />
                <span>
                  <span className="block font-bold text-on-surface">{interest.name}</span>
                  <span className="text-xs text-on-surface-variant">
                    {interest.source === "facebook" ? `Facebook ID: ${interest.id}` : "Gợi ý nội bộ, chưa xác minh từ Facebook"}
                    {interest.audience_size ? ` · Quy mô: ${interest.audience_size.toLocaleString("vi-VN")}` : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Card className="rounded-lg p-6">
          <h3 className="text-lg font-extrabold">Checklist trước khi tạo preview</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Còn thiếu {missingCount} mục. Vẫn có thể tạo bản nháp, phần thiếu sẽ bổ sung ở Ads Manager Facebook.
          </p>
          <div className="mt-4 space-y-2">
            {validation.map((item) => (
              <div key={item.key} className="flex items-start gap-3 rounded-md bg-surface-container-low p-3">
                <MaterialIcon className={item.ok ? "text-emerald-600" : "text-amber-600"} name={item.ok ? "check_circle" : "warning"} />
                <div>
                  <p className="font-bold">{item.label}</p>
                  {item.note ? <p className="text-xs text-on-surface-variant">{item.note}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button variant="ai" onClick={generateDraft}>
            <MaterialIcon filled name="auto_awesome" />
            Tạo bản nháp campaign
          </Button>
          <Button variant="secondary" onClick={() => void saveTemplate()}>
            <MaterialIcon name="save" />
            Lưu lại chiến dịch
          </Button>
          <Button variant="secondary" onClick={exportJson}>
            <MaterialIcon name="data_object" />
            Xuất JSON
          </Button>
          <Button variant="secondary" onClick={() => void copyConfig()}>
            <MaterialIcon name="content_copy" />
            Copy cấu hình
          </Button>
          <Button disabled>
            <MaterialIcon name="rocket_launch" />
            Launch lên Meta - Sắp ra mắt
          </Button>
        </div>
      </div>

      <CampaignPreview draft={draft} fallbackDraft={generateCampaignDraft({ ...form, adAccountId: selectedAccountId }, selectedInterests)} />
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className="text-sm font-bold text-on-surface">{label}</span>
      {children}
    </label>
  );
}

function CampaignPreview({ draft, fallbackDraft }: { draft: CampaignDraft | null; fallbackDraft: CampaignDraft }) {
  const data = draft ?? fallbackDraft;
  return (
    <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
      <Card className="rounded-lg border border-primary/10 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-fixed text-primary">
            <MaterialIcon filled name="preview" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold">Preview cấu hình</h3>
            <p className="text-sm text-on-surface-variant">Chỉ là bản nháp. Không tự launch campaign thật.</p>
          </div>
        </div>
        <PreviewSection title="1. Campaign" rows={data.campaign} />
        <PreviewSection
          title="2. Ad Set"
          rows={{
            name: data.adSet.name,
            ageRange: data.adSet.ageRange,
            gender: data.adSet.gender,
            location: data.adSet.location,
            interests: data.adSet.interests.map((item) => item.name).join(", "),
            behaviors: data.adSet.behaviors.join(", "),
            placement: data.adSet.placement,
            optimizationGoal: data.adSet.optimizationGoal,
            billingEvent: data.adSet.billingEvent
          }}
        />
        <PreviewSection title="3. Ads" rows={data.ads} />
        <PreviewSection title="4. Cấu trúc naming" rows={data.naming} />
      </Card>
    </div>
  );
}

function PreviewSection({ title, rows }: { title: string; rows: Record<string, unknown> }) {
  return (
    <div className="border-t border-outline-variant/70 py-5 first:border-t-0 first:pt-0">
      <h4 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-primary">{title}</h4>
      <div className="space-y-2">
        {Object.entries(rows).map(([key, value]) => (
          <div key={key} className="rounded-md bg-surface-container-low p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-outline">{key}</p>
            <p className="mt-1 break-words text-sm font-semibold leading-6 text-on-surface">
              {typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value || "Chưa có")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

