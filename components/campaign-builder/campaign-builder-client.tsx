"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import {
  buildCampaignValidation,
  buildInternalAudienceSuggestions,
  buildScaleSourceRows,
  createABTestDraft,
  generateCampaignDraft,
  generateScalePreview,
  validateABTestConfig
} from "@/lib/campaign-builder";
import { getCachedJson, getCachedState, setCachedState } from "@/lib/meta/client-cache";
import { applyDefaultAdAccount, getDefaultAdAccountId, setDefaultAdAccountId } from "@/lib/meta/default-account";
import type {
  ABTestDraft,
  AdAccount,
  AdSet,
  AudienceSuggestion,
  Campaign,
  CampaignBuilderInput,
  CampaignBuilderMode,
  CampaignDraft,
  CampaignPlannerDraft,
  CampaignTemplate,
  FacebookPage,
  FacebookPagePost,
  SavedAudience,
  ScaleAction,
  ScaleCampaignInput
} from "@/lib/meta/types";

const cacheKey = "campaign-builder:v2";

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

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

function formatVnd(value: number) {
  if (!value) return "0 đ";
  return vndFormatter.format(value);
}

async function readJson<T>(url: string, init?: RequestInit & { force?: boolean }) {
  if (!init || !init.method || init.method === "GET") return getCachedJson<T>(url, { force: init?.force });
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
  const [mode, setMode] = useState<CampaignBuilderMode>("new_campaign");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busyLabel, setBusyLabel] = useState("");
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adsets, setAdsets] = useState<AdSet[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [posts, setPosts] = useState<FacebookPagePost[]>([]);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [savedAudiences, setSavedAudiences] = useState<SavedAudience[]>([]);
  const [selectedSavedAudienceId, setSelectedSavedAudienceId] = useState("");
  const [form, setForm] = useState<CampaignBuilderInput>(defaultInput);
  const [interests, setInterests] = useState<AudienceSuggestion[]>([]);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [fanpageUrl, setFanpageUrl] = useState("");
  const [draft, setDraft] = useState<CampaignPlannerDraft | null>(null);
  const [scaleAction, setScaleAction] = useState<ScaleAction>("clone_adset");
  const [scaleRange, setScaleRange] = useState(defaultDateRange());
  const [sourceCampaignId, setSourceCampaignId] = useState("");
  const [sourceAdsetId, setSourceAdsetId] = useState("");
  const [cloneQuantity, setCloneQuantity] = useState(1);
  const [newBudget, setNewBudget] = useState("");
  const [abName, setAbName] = useState("A/B Test Creative");
  const [abHypothesis, setAbHypothesis] = useState("");
  const [abVariable, setAbVariable] = useState<ABTestDraft["testVariable"]>("creative");
  const [abVariants, setAbVariants] = useState("Creative A\nCreative B");
  const [abMinimumSpend, setAbMinimumSpend] = useState("500000");

  const needsPost = form.objective === "Tin nhắn" || form.objective === "Tương tác";
  const selectedInterests = useMemo(() => interests.filter((interest) => selectedInterestIds.includes(interest.id)), [interests, selectedInterestIds]);
  const validation = useMemo(() => buildCampaignValidation({ ...form, adAccountId: selectedAccountId }), [form, selectedAccountId]);
  const selectedCampaign = campaigns.find((item) => item.id === sourceCampaignId);
  const selectedAdset = adsets.find((item) => item.id === sourceAdsetId);

  async function withProgress<T>(label: string, fn: () => Promise<T>) {
    setBusyLabel(label);
    try {
      return await fn();
    } finally {
      setBusyLabel("");
    }
  }

  useEffect(() => {
    const cached = getCachedState<{
      mode: CampaignBuilderMode;
      step: 1 | 2 | 3;
      accounts: AdAccount[];
      selectedAccountId: string;
      campaigns: Campaign[];
      adsets: AdSet[];
      pages: FacebookPage[];
      posts: FacebookPagePost[];
      templates: CampaignTemplate[];
      savedAudiences: SavedAudience[];
      form: CampaignBuilderInput;
      interests: AudienceSuggestion[];
      selectedInterestIds: string[];
      draft: CampaignPlannerDraft | null;
    }>(cacheKey);
    if (cached) {
      queueMicrotask(() => {
        setMode(cached.mode);
        setStep(cached.step);
        setAccounts(cached.accounts);
        setSelectedAccountId(cached.selectedAccountId);
        setCampaigns(cached.campaigns);
        setAdsets(cached.adsets);
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

    void loadInitialData();
  // Initial bootstrap is intentionally one-shot; subsequent refresh is handled by the button.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedAccountId && !form.productName && !draft) return;
    setCachedState(cacheKey, {
      mode,
      step,
      accounts,
      selectedAccountId,
      campaigns,
      adsets,
      pages,
      posts,
      templates,
      savedAudiences,
      form,
      interests,
      selectedInterestIds,
      draft
    });
  }, [mode, step, accounts, selectedAccountId, campaigns, adsets, pages, posts, templates, savedAudiences, form, interests, selectedInterestIds, draft]);

  async function loadInitialData() {
    await withProgress("Đang tải tài khoản quảng cáo...", async () => {
      const payload = await readJson<{ data: AdAccount[] }>("/api/meta/adaccounts");
      const rows = payload.data ?? [];
      const accountId = applyDefaultAdAccount(rows, getDefaultAdAccountId() || rows[0]?.id);
      setAccounts(rows);
      setSelectedAccountId(accountId);
      setForm((current) => ({ ...current, adAccountId: accountId }));
      if (accountId) await Promise.all([loadTemplates(accountId), loadSavedAudiences(accountId), loadCampaigns(accountId, false), loadPages(false)]);
    }).catch((error: Error) => setNotice(error.message));
  }

  async function loadTemplates(accountId: string) {
    try {
      const payload = await readJson<{ data: CampaignTemplate[]; storage?: string }>(`/api/campaign-templates?account_id=${encodeURIComponent(accountId)}`);
      setTemplates([...(payload.data ?? []), ...readLocalTemplates(accountId)]);
    } catch {
      setTemplates(readLocalTemplates(accountId));
    }
  }

  async function loadSavedAudiences(accountId: string) {
    try {
      const payload = await readJson<{ data: SavedAudience[] }>(`/api/saved-audiences?account_id=${encodeURIComponent(accountId)}`);
      setSavedAudiences([...(payload.data ?? []), ...readLocalAudiences(accountId)]);
    } catch {
      setSavedAudiences(readLocalAudiences(accountId));
    }
  }

  async function loadPages(force = true) {
    return withProgress("Đang tải Fanpage...", async () => {
      const payload = await readJson<{ data: FacebookPage[] }>("/api/meta/pages", { force });
      setPages(payload.data ?? []);
    }).catch((error: Error) => setNotice(error.message));
  }

  async function loadCampaigns(accountId = selectedAccountId, force = true) {
    if (!accountId) return;
    await withProgress("Đang lấy campaign cũ...", async () => {
      const query = new URLSearchParams({
        ad_account_id: accountId,
        start_date: scaleRange.startDate,
        end_date: scaleRange.endDate
      });
      const payload = await readJson<{ data: Campaign[] }>(`/api/meta/campaigns?${query.toString()}`, { force });
      setCampaigns(payload.data ?? []);
    }).catch((error: Error) => setNotice(error.message));
  }

  async function loadAdsets(campaignId = sourceCampaignId) {
    if (!selectedAccountId || !campaignId) return;
    await withProgress("Đang lấy nhóm quảng cáo...", async () => {
      const query = new URLSearchParams({ ad_account_id: selectedAccountId, campaign_id: campaignId });
      const payload = await readJson<{ data: AdSet[] }>(`/api/meta/adsets?${query.toString()}`, { force: true });
      setAdsets(payload.data ?? []);
    }).catch((error: Error) => setNotice(error.message));
  }

  async function loadPosts(pageId: string) {
    await withProgress("Đang tải bài viết Page...", async () => {
      const payload = await readJson<{ data: FacebookPagePost[] }>(`/api/meta/page-posts?page_id=${encodeURIComponent(pageId)}`, { force: true });
      setPosts(payload.data ?? []);
      if (!(payload.data ?? []).length) setNotice("Fanpage chưa có bài viết phù hợp hoặc thiếu quyền đọc bài viết Page.");
    }).catch((error: Error) => setNotice(error.message));
  }

  async function onAccountChange(accountId: string) {
    setSelectedAccountId(accountId);
    setDefaultAdAccountId(accountId);
    setForm((current) => ({ ...current, adAccountId: accountId }));
    setCampaigns([]);
    setAdsets([]);
    await withProgress("Đang đổi tài khoản...", async () => {
      await Promise.all([loadTemplates(accountId), loadSavedAudiences(accountId), loadCampaigns(accountId, true)]);
    });
  }

  function updateField<K extends keyof CampaignBuilderInput>(field: K, value: CampaignBuilderInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function switchMode(nextMode: CampaignBuilderMode) {
    setBusyLabel("Đang chuyển chế độ...");
    setMode(nextMode);
    setStep(2);
    setDraft(null);
    window.setTimeout(() => setBusyLabel(""), 250);
  }

  async function checkFanpagePermission() {
    if (!fanpageUrl.trim()) return toast.error("Nhập link fanpage trước.");
    await withProgress("Đang kiểm tra quyền Fanpage...", async () => {
      const payload = await readJson<{ data: { ok: boolean; message: string; page?: FacebookPage } }>(
        `/api/meta/page-check?url=${encodeURIComponent(fanpageUrl.trim())}`,
        { force: true }
      );
      setNotice(payload.data.message);
      if (payload.data.ok && payload.data.page) {
        const page = payload.data.page;
        setPages((current) => (current.some((item) => item.id === page.id) ? current : [...current, page]));
        setForm((current) => ({ ...current, pageId: page.id, pageName: page.name, fanpage: page.name, postId: "", postMessage: "" }));
        toast.success("Đã xác nhận quyền Fanpage.");
      }
    }).catch((error: Error) => {
      setNotice(error.message);
      toast.error(error.message);
    });
  }

  async function searchInterests() {
    const query = [form.industry, form.productName, form.targetCustomer].filter(Boolean).join(" ");
    if (!query.trim()) return toast.error("Nhập ngành hàng, sản phẩm hoặc mô tả khách hàng trước.");

    await withProgress("Đang tìm sở thích từ Facebook...", async () => {
      const params = new URLSearchParams({ q: query, ad_account_id: selectedAccountId });
      const payload = await readJson<{ data: AudienceSuggestion[] }>(`/api/meta/targeting-search?${params.toString()}`, { force: true });
      const rows = payload.data ?? [];
      if (!rows.length) throw new Error("Facebook chưa trả về interest phù hợp.");
      setInterests(rows);
      setSelectedInterestIds(rows.slice(0, 5).map((item) => item.id));
      setNotice("Interest đã được lấy từ Facebook Targeting Search.");
    }).catch((error: Error) => {
      const fallback = buildInternalAudienceSuggestions(form);
      setInterests(fallback);
      setSelectedInterestIds(fallback.slice(0, 4).map((item) => item.id));
      setNotice(`${error.message} Gợi ý nội bộ, chưa xác minh từ Facebook.`);
    });
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
      const rows = row.payload.interests
        .split(",")
        .map((name, index) => ({ id: `saved-${index + 1}`, name: name.trim(), source: "internal" as const }))
        .filter((item) => item.name);
      setInterests(rows);
      setSelectedInterestIds(rows.map((item) => item.id));
    }
  }

  function onPageChange(pageId: string) {
    const page = pages.find((item) => item.id === pageId);
    setForm((current) => ({ ...current, pageId, pageName: page?.name || "", fanpage: page?.name || "", postId: "", postMessage: "" }));
    setPosts([]);
    if (pageId && needsPost) void loadPosts(pageId);
  }

  function onPostChange(postId: string) {
    const post = posts.find((item) => item.id === postId);
    setForm((current) => ({ ...current, postId, postMessage: post?.message || "" }));
  }

  function buildNewCampaignPlannerDraft(): CampaignPlannerDraft {
    const campaignDraft = generateCampaignDraft({ ...form, adAccountId: selectedAccountId }, selectedInterests);
    return {
      mode: "new_campaign" as const,
      accountId: selectedAccountId,
      title: campaignDraft.campaign.name,
      campaignDraft,
      warnings: validation.filter((item) => !item.ok).map((item) => `${item.label}: ${item.note || "Chưa đủ dữ liệu"}`),
      metaPayload: {
        campaign: campaignDraft.campaign,
        adset: campaignDraft.adSet,
        ads: campaignDraft.ads,
        status: "PAUSED"
      }
    };
  }

  function createPreview() {
    if (mode === "scale_existing") {
      const scaleInput: ScaleCampaignInput = {
        adAccountId: selectedAccountId,
        action: scaleAction,
        dateRange: scaleRange,
        sourceCampaignId,
        sourceAdsetId,
        quantity: cloneQuantity,
        newBudget
      };
      setDraft(generateScalePreview(scaleInput));
      setStep(3);
      return;
    }

    if (mode === "ab_test") {
      const abDraft = createABTestDraft({
        name: abName,
        hypothesis: abHypothesis,
        testVariable: abVariable,
        schedule: scaleRange,
        minimumSpend: abMinimumSpend,
        variants: abVariants.split("\n")
      });
      const validationResult = validateABTestConfig(abDraft);
      setDraft({
        mode: "ab_test",
        accountId: selectedAccountId,
        title: abDraft.name,
        abTest: abDraft,
        warnings: validationResult.errors,
        metaPayload: { ab_test: abDraft, status: "DRAFT_ONLY" }
      });
      setStep(3);
      return;
    }

    setDraft(buildNewCampaignPlannerDraft());
    setStep(3);
  }

  async function saveDraft() {
    const currentDraft = draft ?? (mode === "new_campaign" ? buildNewCampaignPlannerDraft() : null);
    if (!currentDraft) return toast.error("Tạo preview trước khi lưu bản nháp.");

    await withProgress("Đang lưu bản nháp...", async () => {
      const payload = await readJson<{ data: unknown; storage?: string }>("/api/campaign-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: selectedAccountId,
          page_id: form.pageId || null,
          mode: currentDraft.mode,
          name: currentDraft.title,
          input_json: { form, scale: currentDraft.scale, abTest: currentDraft.abTest },
          preview_json: currentDraft,
          meta_payload_json: currentDraft.metaPayload
        })
      });
      toast.success(payload.storage === "local" ? "Đã lưu bản nháp trên trình duyệt." : "Đã lưu bản nháp.");
    }).catch((error: Error) => toast.error(error.message));
  }

  async function saveTemplate() {
    const templateName = window.prompt("Tên mẫu chiến dịch:", `${form.objective} - ${form.productName || "Mẫu mới"}`);
    if (!templateName) return;

    await withProgress("Đang lưu mẫu chiến dịch...", async () => {
      const payload = await readJson<{ data?: CampaignTemplate; storage?: string }>("/api/campaign-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          account_id: selectedAccountId || null,
          objective: form.objective,
          payload: { ...form, adAccountId: selectedAccountId }
        })
      });
      if (payload.storage === "local" && payload.data) saveLocalTemplate(selectedAccountId, payload.data);
      await loadTemplates(selectedAccountId);
      toast.success("Đã lưu lại chiến dịch.");
    }).catch((error: Error) => toast.error(error.message));
  }

  async function launchScale() {
    if (!draft?.scale) return toast.error("Tạo preview scale trước.");
    await withProgress("Đang gửi yêu cầu scale sang Meta...", async () => {
      const response = await readJson<{ data: { cloned_ids?: string[] } }>("/api/meta/scale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad_account_id: selectedAccountId,
          action: scaleAction,
          source_campaign_id: sourceCampaignId || undefined,
          source_adset_id: sourceAdsetId || undefined,
          quantity: cloneQuantity,
          new_budget: newBudget || undefined
        })
      });
      toast.success(`Meta đã xử lý. ID mới: ${(response.data.cloned_ids ?? []).join(", ") || "đã cập nhật"}`);
      await loadCampaigns(selectedAccountId, true);
    }).catch((error: Error) => toast.error(error.message));
  }

  async function launchPausedCampaign() {
    const currentDraft = draft?.campaignDraft ?? buildNewCampaignPlannerDraft().campaignDraft;
    if (!selectedAccountId) return toast.error("Chọn tài khoản quảng cáo trước.");
    if (!currentDraft) return toast.error("Tạo preview campaign trước.");

    await withProgress("Đang tạo campaign PAUSED trên Meta...", async () => {
      const payload = await readJson<{ id: string; name: string; status: string }>("/api/meta/create-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad_account_id: selectedAccountId,
          name: currentDraft.campaign.name,
          objective: currentDraft.campaign.objective
        })
      });
      toast.success(`Đã tạo campaign PAUSED: ${payload.name || payload.id}. Adset/ads vẫn cần kiểm tra trong Ads Manager.`);
      await loadCampaigns(selectedAccountId, true);
    }).catch((error: Error) => toast.error(error.message));
  }

  async function saveABTest() {
    const rows = abVariants.split("\n").map((item) => item.trim()).filter(Boolean);
    await withProgress("Đang lưu A/B test...", async () => {
      const payload = await readJson<{ storage?: string }>("/api/campaign-ab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: selectedAccountId,
          name: abName,
          hypothesis: abHypothesis,
          test_variable: abVariable,
          start_date: scaleRange.startDate,
          end_date: scaleRange.endDate,
          minimum_spend: abMinimumSpend,
          variants: rows
        })
      });
      toast.success(payload.storage === "local" ? "Đã lưu A/B test trên trình duyệt." : "Đã lưu A/B test.");
    }).catch((error: Error) => toast.error(error.message));
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setForm(template.payload);
    setDraft(null);
    toast.success("Đã nạp mẫu chiến dịch.");
  }

  function exportJson() {
    const current = draft ?? buildNewCampaignPlannerDraft();
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `campaign-preview-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyConfig() {
    await navigator.clipboard.writeText(JSON.stringify(draft ?? buildNewCampaignPlannerDraft(), null, 2));
    toast.success("Đã copy cấu hình.");
  }

  return (
    <div className="space-y-6">
      <MiniProgress label={busyLabel} />

      <Card className="rounded-lg p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <Field label="Tài khoản quảng cáo">
            <select className="dashboard-input" value={selectedAccountId} onChange={(event) => void onAccountChange(event.target.value)}>
              {accounts.length ? accounts.map((account) => <option key={account.id} value={account.id}>{account.name || account.id} - {account.id}</option>) : <option value="">Chưa có tài khoản</option>}
            </select>
          </Field>
          <Field label="Mẫu chiến dịch đã lưu">
            <select className="dashboard-input" defaultValue="" onChange={(event) => applyTemplate(event.target.value)}>
              <option value="">Chọn mẫu để nạp</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </Field>
          <Button variant="secondary" onClick={() => void loadInitialData()} disabled={Boolean(busyLabel)}>
            <MaterialIcon name="refresh" />
            Làm mới dữ liệu
          </Button>
        </div>
      </Card>

      <Card className="rounded-lg p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <ModeCard active={mode === "scale_existing"} title="Scale camp cũ" description="Nhân bản campaign/adset hoặc tăng ngân sách." onClick={() => switchMode("scale_existing")} />
          <ModeCard active={mode === "new_campaign"} title="Tạo camp mới" description="Tạo preview campaign, ad set và ads từ AI." onClick={() => switchMode("new_campaign")} />
          <ModeCard active={mode === "ab_test"} title="Testing A/B" description="Thiết kế bài test theo biến thể giống Facebook A/B." onClick={() => switchMode("ab_test")} />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          {mode === "scale_existing" ? (
            <ScalePanel
              campaigns={campaigns}
              adsets={adsets}
              scaleAction={scaleAction}
              setScaleAction={setScaleAction}
              scaleRange={scaleRange}
              setScaleRange={setScaleRange}
              sourceCampaignId={sourceCampaignId}
              setSourceCampaignId={(id) => {
                setSourceCampaignId(id);
                setSourceAdsetId("");
                void loadAdsets(id);
              }}
              sourceAdsetId={sourceAdsetId}
              setSourceAdsetId={setSourceAdsetId}
              cloneQuantity={cloneQuantity}
              setCloneQuantity={setCloneQuantity}
              newBudget={newBudget}
              setNewBudget={setNewBudget}
              selectedCampaign={selectedCampaign}
              selectedAdset={selectedAdset}
              onLoadCampaigns={() => void loadCampaigns(selectedAccountId, true)}
              onUseCampaign={(id) => {
                setSourceCampaignId(id);
                setSourceAdsetId("");
                void loadAdsets(id);
                setDraft(generateScalePreview({
                  adAccountId: selectedAccountId,
                  action: scaleAction,
                  dateRange: scaleRange,
                  sourceCampaignId: id,
                  sourceAdsetId: "",
                  quantity: cloneQuantity,
                  newBudget
                }));
                setStep(3);
              }}
            />
          ) : null}

          {mode === "new_campaign" ? (
            <NewCampaignPanel
              form={form}
              pages={pages}
              posts={posts}
              savedAudiences={savedAudiences}
              selectedSavedAudienceId={selectedSavedAudienceId}
              interests={interests}
              selectedInterestIds={selectedInterestIds}
              needsPost={needsPost}
              notice={notice}
              fanpageUrl={fanpageUrl}
              setFanpageUrl={setFanpageUrl}
              updateField={updateField}
              onPageChange={onPageChange}
              onPostChange={onPostChange}
              applySavedAudience={applySavedAudience}
              searchInterests={() => void searchInterests()}
              checkFanpagePermission={() => void checkFanpagePermission()}
              setSelectedInterestIds={setSelectedInterestIds}
            />
          ) : null}

          {mode === "ab_test" ? (
            <ABTestPanel
              abName={abName}
              setAbName={setAbName}
              abHypothesis={abHypothesis}
              setAbHypothesis={setAbHypothesis}
              abVariable={abVariable}
              setAbVariable={setAbVariable}
              abVariants={abVariants}
              setAbVariants={setAbVariants}
              abMinimumSpend={abMinimumSpend}
              setAbMinimumSpend={setAbMinimumSpend}
              scaleRange={scaleRange}
              setScaleRange={setScaleRange}
            />
          ) : null}

          <Card className="rounded-lg p-5">
            <div className="flex flex-wrap gap-3">
              <Button variant="ai" onClick={createPreview}>
                <MaterialIcon filled name="auto_awesome" />
                Tạo preview
              </Button>
              <Button variant="secondary" onClick={() => void saveDraft()}>
                <MaterialIcon name="save" />
                Lưu bản nháp
              </Button>
              {mode === "new_campaign" ? (
                <Button variant="secondary" onClick={() => void saveTemplate()}>
                  <MaterialIcon name="save" />
                  Lưu lại chiến dịch
                </Button>
              ) : null}
              {mode === "scale_existing" ? (
                <Button onClick={() => void launchScale()} disabled={!draft?.scale}>
                  <MaterialIcon name="rocket_launch" />
                  Nhân bản / cập nhật PAUSED
                </Button>
              ) : null}
              {mode === "ab_test" ? (
                <Button onClick={() => void saveABTest()}>
                  <MaterialIcon name="send" />
                  Tạo A/B Test
                </Button>
              ) : null}
              <Button variant="secondary" onClick={exportJson}>
                Xuất JSON
              </Button>
              <Button variant="secondary" onClick={() => void copyConfig()}>
                Copy cấu hình
              </Button>
              {mode === "new_campaign" ? (
                <Button onClick={() => void launchPausedCampaign()}>
                  <MaterialIcon name="rocket_launch" />
                  Tạo campaign PAUSED
                </Button>
              ) : null}
              {mode === "ab_test" ? <Button disabled>Launch A/B lên Meta - Sắp ra mắt</Button> : null}
            </div>
          </Card>
        </div>

        <PreviewPanel draft={draft} fallback={mode === "new_campaign" ? buildNewCampaignPlannerDraft() : null} validation={validation} step={step} />
      </div>
    </div>
  );
}

function MiniProgress({ label }: { label: string }) {
  if (!label) return null;
  return (
    <div className="sticky top-16 z-30 overflow-hidden rounded-md border border-primary/20 bg-white p-3 shadow-soft">
      <div className="flex items-center justify-between text-sm font-bold text-primary">
        <span>{label}</span>
        <MaterialIcon className="animate-spin" name="sync" />
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-fixed">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`space-y-2 ${className}`}><span className="text-sm font-bold text-on-surface">{label}</span>{children}</label>;
}

function ModeCard({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg border p-4 text-left transition ${active ? "border-primary bg-primary text-white shadow-soft" : "border-outline-variant bg-white hover:border-primary/50"}`}>
      <p className="text-base font-extrabold">{title}</p>
      <p className={`mt-1 text-sm leading-6 ${active ? "text-white/80" : "text-on-surface-variant"}`}>{description}</p>
    </button>
  );
}

function ScalePanel(props: {
  campaigns: Campaign[];
  adsets: AdSet[];
  scaleAction: ScaleAction;
  setScaleAction: (value: ScaleAction) => void;
  scaleRange: { startDate: string; endDate: string };
  setScaleRange: (value: { startDate: string; endDate: string }) => void;
  sourceCampaignId: string;
  setSourceCampaignId: (value: string) => void;
  sourceAdsetId: string;
  setSourceAdsetId: (value: string) => void;
  cloneQuantity: number;
  setCloneQuantity: (value: number) => void;
  newBudget: string;
  setNewBudget: (value: string) => void;
  selectedCampaign?: Campaign;
  selectedAdset?: AdSet;
  onLoadCampaigns: () => void;
  onUseCampaign: (campaignId: string) => void;
}) {
  const sourceRows = buildScaleSourceRows(props.campaigns);

  return (
    <Card className="rounded-lg p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-extrabold">Scale camp cũ</h3>
          <p className="text-sm text-on-surface-variant">Chọn campaign/adset nguồn, preview rồi mới nhân bản hoặc tăng ngân sách.</p>
        </div>
        <Button variant="secondary" onClick={props.onLoadCampaigns}><MaterialIcon name="refresh" /> Lấy campaign</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Hành động">
          <select className="dashboard-input" value={props.scaleAction} onChange={(event) => props.setScaleAction(event.target.value as ScaleAction)}>
            <option value="clone_adset">Nhân bản nhóm quảng cáo</option>
            <option value="clone_campaign">Nhân bản chiến dịch</option>
            <option value="increase_budget">Nâng ngân sách</option>
          </select>
        </Field>
        <Field label="Từ ngày"><Input type="date" value={props.scaleRange.startDate} onChange={(event) => props.setScaleRange({ ...props.scaleRange, startDate: event.target.value })} /></Field>
        <Field label="Đến ngày"><Input type="date" value={props.scaleRange.endDate} onChange={(event) => props.setScaleRange({ ...props.scaleRange, endDate: event.target.value })} /></Field>
        <Field label="Campaign nguồn" className="md:col-span-2">
          <select className="dashboard-input" value={props.sourceCampaignId} onChange={(event) => props.setSourceCampaignId(event.target.value)}>
            <option value="">Chọn campaign</option>
            {props.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.status || "UNKNOWN"} · {campaign.objective || "UNKNOWN"}</option>)}
          </select>
        </Field>
        <Field label="Số lượng nhân bản">
          <Input type="number" min={1} max={20} value={props.cloneQuantity} onChange={(event) => props.setCloneQuantity(Number(event.target.value))} disabled={props.scaleAction === "increase_budget"} />
        </Field>
        <Field label="Nhóm quảng cáo nguồn" className="md:col-span-2">
          <select className="dashboard-input" value={props.sourceAdsetId} onChange={(event) => props.setSourceAdsetId(event.target.value)} disabled={props.scaleAction === "clone_campaign"}>
            <option value="">{props.scaleAction === "clone_campaign" ? "Không cần chọn adset" : "Chọn adset"}</option>
            {props.adsets.map((adset) => <option key={adset.id} value={adset.id}>{adset.name} · {adset.status || "UNKNOWN"}</option>)}
          </select>
        </Field>
        <Field label="Ngân sách mới">
          <Input value={props.newBudget} onChange={(event) => props.setNewBudget(event.target.value)} placeholder="VD: 500000" />
        </Field>
      </div>
      <div className="mt-5 overflow-x-auto rounded-lg border border-outline-variant">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-container-low text-xs uppercase text-outline">
            <tr>
              <th className="px-4 py-3 text-left">Tên chiến dịch</th>
              <th className="px-4 py-3">Objective</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ngân sách</th>
              <th className="px-4 py-3 text-right">Chi tiêu</th>
              <th className="px-4 py-3 text-right">Kết quả</th>
              <th className="px-4 py-3 text-right">Hiển thị</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sourceRows.map((campaign) => (
              <tr key={campaign.campaignId} className={campaign.campaignId === props.sourceCampaignId ? "bg-primary-fixed/30" : "border-t border-outline-variant"}>
                <td className="min-w-64 px-4 py-3">
                  <span className="block font-bold">{campaign.name}</span>
                  <span className="text-xs text-on-surface-variant">{campaign.campaignId}</span>
                </td>
                <td className="px-4 py-3">{campaign.objective}</td>
                <td className="px-4 py-3">{campaign.status}</td>
                <td className="px-4 py-3 text-right">{campaign.budget ? formatVnd(campaign.budget) : "Không có dữ liệu"}</td>
                <td className="px-4 py-3 text-right">{formatVnd(campaign.spend)}</td>
                <td className="px-4 py-3 text-right">{campaign.results}</td>
                <td className="px-4 py-3 text-right">{campaign.impressions.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-3">{campaign.createdTime || "Không có dữ liệu"}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="secondary" onClick={() => props.onUseCampaign(campaign.campaignId)}>Nhân bản</Button>
                </td>
              </tr>
            ))}
            {!props.campaigns.length ? <tr><td className="px-4 py-6 text-center text-on-surface-variant" colSpan={9}>Chưa có dữ liệu campaign. Bấm “Lấy campaign”.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function NewCampaignPanel(props: {
  form: CampaignBuilderInput;
  pages: FacebookPage[];
  posts: FacebookPagePost[];
  savedAudiences: SavedAudience[];
  selectedSavedAudienceId: string;
  interests: AudienceSuggestion[];
  selectedInterestIds: string[];
  needsPost: boolean;
  notice: string;
  fanpageUrl: string;
  setFanpageUrl: (value: string) => void;
  updateField: <K extends keyof CampaignBuilderInput>(field: K, value: CampaignBuilderInput[K]) => void;
  onPageChange: (value: string) => void;
  onPostChange: (value: string) => void;
  applySavedAudience: (value: string) => void;
  searchInterests: () => void;
  checkFanpagePermission: () => void;
  setSelectedInterestIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  return (
    <div className="space-y-6">
      <Card className="rounded-lg p-6">
        <h3 className="text-lg font-extrabold">Tạo camp mới</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Tên sản phẩm/dịch vụ"><Input value={props.form.productName} onChange={(event) => props.updateField("productName", event.target.value)} /></Field>
          <Field label="Ngành hàng"><Input value={props.form.industry} onChange={(event) => props.updateField("industry", event.target.value)} /></Field>
          <Field label="Mục tiêu">
            <select className="dashboard-input" value={props.form.objective} onChange={(event) => props.updateField("objective", event.target.value as CampaignBuilderInput["objective"])}>
              <option>Tin nhắn</option><option>Tương tác</option><option>Lead</option><option>Chuyển đổi</option><option>Traffic</option><option>Sales</option>
            </select>
          </Field>
          <Field label="Ngân sách mỗi ngày"><Input value={props.form.dailyBudget} onChange={(event) => props.updateField("dailyBudget", event.target.value)} /></Field>
          <Field label="Ngày bắt đầu"><Input type="date" value={props.form.startDate} onChange={(event) => props.updateField("startDate", event.target.value)} /></Field>
          <Field label="Ngày kết thúc"><Input type="date" value={props.form.endDate} disabled={props.form.runContinuously} onChange={(event) => props.updateField("endDate", event.target.value)} /></Field>
          <label className="flex items-center gap-3 rounded-md bg-surface-container-low p-4 text-sm font-bold md:col-span-2"><input type="checkbox" checked={props.form.runContinuously} onChange={(event) => props.updateField("runContinuously", event.target.checked)} /> Chạy liên tục</label>
          <Field label="Tệp khách hàng đã lưu">
            <select className="dashboard-input" value={props.selectedSavedAudienceId} onChange={(event) => props.applySavedAudience(event.target.value)}>
              <option value="">Chọn tệp đã lưu</option>
              {props.savedAudiences.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
            </select>
          </Field>
          <Field label="Khu vực chạy"><Input value={props.form.location} onChange={(event) => props.updateField("location", event.target.value)} /></Field>
          <Field label="Fanpage">
            <select className="dashboard-input" value={props.form.pageId || ""} onChange={(event) => props.onPageChange(event.target.value)}>
              <option value="">Chọn fanpage từ tài khoản</option>
              {props.pages.map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}
            </select>
          </Field>
          <Field label="Kiểm tra quyền bằng link Fanpage">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Input value={props.fanpageUrl} onChange={(event) => props.setFanpageUrl(event.target.value)} placeholder="https://facebook.com/page" /><Button onClick={props.checkFanpagePermission}>Kiểm tra</Button></div>
          </Field>
          <Field label="Bài viết có sẵn" className="md:col-span-2">
            <select className="dashboard-input" value={props.form.postId || ""} disabled={!props.needsPost || !props.form.pageId} onChange={(event) => props.onPostChange(event.target.value)}>
              <option value="">{props.needsPost ? "Chọn bài viết trên Page" : "Không bắt buộc với mục tiêu này"}</option>
              {props.posts.map((post) => <option key={post.id} value={post.id}>{(post.message || "Bài viết không có text").slice(0, 100)}</option>)}
            </select>
          </Field>
          <Field label="Website/Landing page"><Input value={props.form.website} onChange={(event) => props.updateField("website", event.target.value)} /></Field>
          <Field label="Media"><Input type="file" multiple accept="image/*,video/*" onChange={(event) => props.updateField("mediaFiles", Array.from(event.target.files ?? []).map((file) => file.name))} /></Field>
          <Field label="Ghi chú media" className="md:col-span-2"><Textarea value={props.form.mediaNote} onChange={(event) => props.updateField("mediaNote", event.target.value)} /></Field>
          <Field label="Khách hàng mục tiêu" className="md:col-span-2"><Textarea value={props.form.targetCustomer} onChange={(event) => props.updateField("targetCustomer", event.target.value)} /></Field>
          <Field label="Offer/ưu đãi" className="md:col-span-2"><Textarea value={props.form.offer} onChange={(event) => props.updateField("offer", event.target.value)} /></Field>
          <Field label="Ghi chú thêm" className="md:col-span-2"><Textarea value={props.form.notes} onChange={(event) => props.updateField("notes", event.target.value)} /></Field>
        </div>
      </Card>
      <Card className="rounded-lg p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h3 className="text-lg font-extrabold">Sở thích / hành vi</h3><p className="text-sm text-on-surface-variant">{props.notice || "Tìm từ Facebook hoặc dùng tệp khách hàng đã lưu."}</p></div>
          <Button onClick={props.searchInterests}><MaterialIcon name="search" /> Tìm từ Facebook</Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {props.interests.map((interest) => (
            <label key={interest.id} className="flex gap-3 rounded-md border border-outline-variant p-3">
              <input type="checkbox" checked={props.selectedInterestIds.includes(interest.id)} onChange={(event) => props.setSelectedInterestIds((current) => event.target.checked ? [...current, interest.id] : current.filter((id) => id !== interest.id))} />
              <span><span className="block font-bold">{interest.name}</span><span className="text-xs text-on-surface-variant">{interest.source === "facebook" ? `Facebook ID: ${interest.id}` : "Gợi ý nội bộ, chưa xác minh từ Facebook"}</span></span>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ABTestPanel(props: {
  abName: string; setAbName: (value: string) => void;
  abHypothesis: string; setAbHypothesis: (value: string) => void;
  abVariable: ABTestDraft["testVariable"]; setAbVariable: (value: ABTestDraft["testVariable"]) => void;
  abVariants: string; setAbVariants: (value: string) => void;
  abMinimumSpend: string; setAbMinimumSpend: (value: string) => void;
  scaleRange: { startDate: string; endDate: string }; setScaleRange: (value: { startDate: string; endDate: string }) => void;
}) {
  return (
    <Card className="rounded-lg p-6">
      <h3 className="text-lg font-extrabold">Testing A/B</h3>
      <p className="mt-1 text-sm text-on-surface-variant">Tạo cấu hình test trước. Khi launch thật, mọi biến thể vẫn phải PAUSED để kiểm tra.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Tên test"><Input value={props.abName} onChange={(event) => props.setAbName(event.target.value)} /></Field>
        <Field label="Biến test">
          <select className="dashboard-input" value={props.abVariable} onChange={(event) => props.setAbVariable(event.target.value as ABTestDraft["testVariable"])}>
            <option value="creative">Creative</option><option value="audience">Tệp khách hàng</option><option value="placement">Placement</option><option value="copy">Nội dung</option>
          </select>
        </Field>
        <Field label="Từ ngày"><Input type="date" value={props.scaleRange.startDate} onChange={(event) => props.setScaleRange({ ...props.scaleRange, startDate: event.target.value })} /></Field>
        <Field label="Đến ngày"><Input type="date" value={props.scaleRange.endDate} onChange={(event) => props.setScaleRange({ ...props.scaleRange, endDate: event.target.value })} /></Field>
        <Field label="Ngân sách tối thiểu/biến thể"><Input value={props.abMinimumSpend} onChange={(event) => props.setAbMinimumSpend(event.target.value)} /></Field>
        <Field label="Giả thuyết test"><Textarea value={props.abHypothesis} onChange={(event) => props.setAbHypothesis(event.target.value)} /></Field>
        <Field label="Các biến thể, mỗi dòng một biến thể" className="md:col-span-2"><Textarea rows={5} value={props.abVariants} onChange={(event) => props.setAbVariants(event.target.value)} /></Field>
      </div>
    </Card>
  );
}

function PreviewPanel({ draft, fallback, validation, step }: { draft: CampaignPlannerDraft | null; fallback: CampaignPlannerDraft | null; validation: Array<{ key: string; label: string; ok: boolean; note?: string }>; step: number }) {
  const data = draft ?? fallback;
  return (
    <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
      <Card className="rounded-lg p-6">
        <h3 className="text-lg font-extrabold">Preview & Launch</h3>
        <p className="mt-1 text-sm text-on-surface-variant">Bước hiện tại: {step}/3. Preview không tự tạo campaign ACTIVE.</p>
        {!data ? <div className="mt-5 rounded-md bg-surface-container-low p-5 text-sm text-on-surface-variant">Chọn chế độ và bấm “Tạo preview”.</div> : null}
        {data ? (
          <div className="mt-5 space-y-4">
            <PreviewSection title="Tổng quan" rows={{ mode: data.mode, accountId: data.accountId, title: data.title }} />
            {data.campaignDraft ? <PreviewSection title="Campaign mới" rows={data.campaignDraft.campaign} /> : null}
            {data.campaignDraft ? <PreviewSection title="Ad Set" rows={{ ...data.campaignDraft.adSet, interests: data.campaignDraft.adSet.interests.map((item) => item.name).join(", ") }} /> : null}
            {data.campaignDraft ? <PreviewSection title="Ads" rows={data.campaignDraft.ads} /> : null}
            {data.scale ? <PreviewSection title="Scale camp cũ" rows={data.metaPayload} /> : null}
            {data.abTest ? <PreviewSection title="A/B test" rows={data.abTest as unknown as Record<string, unknown>} /> : null}
            {data.warnings.length ? <PreviewSection title="Cần kiểm tra" rows={Object.fromEntries(data.warnings.map((item, index) => [`warning_${index + 1}`, item]))} /> : null}
          </div>
        ) : null}
      </Card>
      <Card className="rounded-lg p-6">
        <h3 className="text-lg font-extrabold">Checklist</h3>
        <div className="mt-4 space-y-2">
          {validation.map((item) => <div key={item.key} className="flex gap-3 rounded-md bg-surface-container-low p-3"><MaterialIcon className={item.ok ? "text-emerald-600" : "text-amber-600"} name={item.ok ? "check_circle" : "warning"} /><span><span className="block font-bold">{item.label}</span>{item.note ? <span className="text-xs text-on-surface-variant">{item.note}</span> : null}</span></div>)}
        </div>
      </Card>
    </div>
  );
}

function PreviewSection({ title, rows }: { title: string; rows: Record<string, unknown> }) {
  return (
    <div className="rounded-lg border border-outline-variant p-4">
      <p className="mb-3 text-sm font-extrabold text-primary">{title}</p>
      <div className="space-y-2">
        {Object.entries(rows).map(([key, value]) => (
          <div key={key} className="rounded-md bg-surface-container-low p-3">
            <p className="text-[11px] font-bold uppercase text-outline">{key}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold">{typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value || "Chưa có")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
