"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { mapAIPlanMode, mapAIPlanToCampaignInput, type AIConsultantResponse } from "@/lib/ai-consultant-shared";
import type { AdsContentInput, AdsContentPackage } from "@/lib/ai-content-ads-shared";
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
  mediaFiles: [],
  structureMode: "1-1-1",
  adsetCount: 1,
  adsPerAdset: 1,
  ageRange: "25-44",
  gender: "Tất cả"
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

type SimpleABTestType = "copy" | "creative" | "audience" | "placement";
type SimpleABVariant = {
  id: string;
  label: string;
  value: string;
};

type ContentLibraryItem = {
  id: string;
  title: string;
  product: string;
  industry: string | null;
  target_customer: string | null;
  goal: AdsContentInput["goal"];
  input_json?: Partial<AdsContentInput> | null;
  content_json: AdsContentPackage;
  created_at?: string;
};

const abTestOptions: Array<{ key: SimpleABTestType; title: string; description: string }> = [
  { key: "copy", title: "Test bài viết/content", description: "Cùng tệp, cùng ngân sách, chỉ đổi bài viết." },
  { key: "creative", title: "Test hình ảnh/video", description: "Cùng nội dung, cùng tệp, chỉ đổi media." },
  { key: "audience", title: "Test tệp khách hàng", description: "Cùng bài viết, cùng ngân sách, chỉ đổi tệp." },
  { key: "placement", title: "Test vị trí hiển thị", description: "Cùng bài viết, cùng tệp, chỉ đổi vị trí hiển thị." }
];

const contentGoalToObjective: Record<AdsContentInput["goal"], CampaignBuilderInput["objective"]> = {
  message: "Tin nhắn",
  lead: "Lead",
  traffic: "Traffic",
  engagement: "Tương tác",
  sales: "Sales"
};

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

function firstContentValue(values?: string[] | null) {
  return values?.find((value) => value.trim())?.trim() || "";
}

function contentPackageToNotes(content: AdsContentPackage) {
  const primaryText = firstContentValue(content.primaryTexts);
  const headline = firstContentValue(content.headlines);
  const description = firstContentValue(content.descriptions);
  const cta = firstContentValue(content.ctas);
  const angle = firstContentValue(content.angles);
  const hook = firstContentValue(content.hooks);
  return [
    angle ? `Góc bán hàng: ${angle}` : "",
    hook ? `Hook: ${hook}` : "",
    primaryText ? `Primary text: ${primaryText}` : "",
    headline ? `Headline: ${headline}` : "",
    description ? `Description: ${description}` : "",
    cta ? `CTA: ${cta}` : "",
    content.recommendedTestPlan ? `Kế hoạch test: ${content.recommendedTestPlan}` : ""
  ].filter(Boolean).join("\n\n");
}

function contentPackageToMediaNote(content: AdsContentPackage) {
  return firstContentValue(content.creativeBriefs) || "Chọn media sau";
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
  const [contentLibrary, setContentLibrary] = useState<ContentLibraryItem[]>([]);
  const [selectedContentId, setSelectedContentId] = useState("");
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
  const [abTestType, setAbTestType] = useState<SimpleABTestType>("copy");
  const [abBudgetPerVariant, setAbBudgetPerVariant] = useState("500000");
  const [abLocation, setAbLocation] = useState("Việt Nam");
  const [abAgeRange, setAbAgeRange] = useState("25-44");
  const [abGender, setAbGender] = useState("Tất cả");
  const [abObjective, setAbObjective] = useState<CampaignBuilderInput["objective"]>("Tin nhắn");
  const [abVariantsSimple, setAbVariantsSimple] = useState<SimpleABVariant[]>([
    { id: "A", label: "Biến thể A", value: "" },
    { id: "B", label: "Biến thể B", value: "" }
  ]);
  const [aiMessage, setAiMessage] = useState("");
  const [aiResult, setAiResult] = useState<AIConsultantResponse | null>(null);

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
      contentLibrary: ContentLibraryItem[];
      selectedContentId: string;
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
        setContentLibrary(cached.contentLibrary ?? []);
        setSelectedContentId(cached.selectedContentId ?? "");
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
      contentLibrary,
      selectedContentId,
      form,
      interests,
      selectedInterestIds,
      draft
    });
  }, [mode, step, accounts, selectedAccountId, campaigns, adsets, pages, posts, templates, savedAudiences, contentLibrary, selectedContentId, form, interests, selectedInterestIds, draft]);

  async function loadInitialData() {
    await withProgress("Đang tải tài khoản quảng cáo...", async () => {
      const payload = await readJson<{ data: AdAccount[] }>("/api/meta/adaccounts");
      const rows = payload.data ?? [];
      const accountId = applyDefaultAdAccount(rows, getDefaultAdAccountId() || rows[0]?.id);
      setAccounts(rows);
      setSelectedAccountId(accountId);
      setForm((current) => ({ ...current, adAccountId: accountId }));
      await loadContentLibrary(false);
      if (accountId) await Promise.all([loadTemplates(accountId), loadSavedAudiences(accountId), loadCampaigns(accountId, false), loadPages(false)]);
    }).catch((error: Error) => setNotice(error.message));
  }

  async function loadContentLibrary(force = true) {
    try {
      const payload = await readJson<{ data: ContentLibraryItem[]; storage?: string }>("/api/ai/content-library", { force });
      setContentLibrary(payload.data ?? []);
      if (payload.storage === "missing_schema") setNotice("Chưa có bảng ads_content_library. Hãy chạy migration 202605210007 để dùng thư viện content.");
    } catch (error) {
      setContentLibrary([]);
      const message = error instanceof Error ? error.message : "Không tải được thư viện content đã lưu.";
      setNotice(message);
    }
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

  async function askAIConsultant() {
    const message = aiMessage.trim();
    if (message.length < 3) return toast.error("Nhập vài dòng về sản phẩm, mục tiêu hoặc vấn đề bạn đang gặp.");

    await withProgress("AI đang tư vấn cấu trúc quảng cáo...", async () => {
      const payload = await readJson<{ data: AIConsultantResponse }>("/api/ai/consultant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: { ...form, adAccountId: selectedAccountId }
        })
      });
      setAiResult(payload.data);
      toast.success("AI đã tạo đề xuất. Kiểm tra rồi bấm chấp thuận nếu phù hợp.");
    }).catch((error: Error) => toast.error(error.message));
  }

  async function acceptAIPlan() {
    if (!aiResult) return toast.error("Chưa có đề xuất từ AI.");
    const nextMode = mapAIPlanMode(aiResult.plan.mode);
    const nextForm = mapAIPlanToCampaignInput(aiResult.plan, form);
    setMode(nextMode);
    setForm(nextForm);
    setDraft(null);
    setStep(2);

    if (nextMode !== "new_campaign") {
      toast.success("Đã đưa đề xuất AI vào form. Hãy kiểm tra rồi tạo preview.");
      return;
    }

    if (!aiResult.plan.canCreatePreview) {
      toast.warning(`AI còn thiếu: ${aiResult.plan.missingFields.join(", ") || "một vài thông tin cần kiểm tra"}.`);
      return;
    }

    await withProgress("Đang tạo preview từ đề xuất AI...", async () => {
      const code = await ensureCampaignCode();
      const campaignDraft = generateCampaignDraft({ ...nextForm, adAccountId: selectedAccountId, campaignCode: code }, selectedInterests);
      setDraft({
        mode: "new_campaign",
        accountId: selectedAccountId,
        title: campaignDraft.campaign.name,
        campaignDraft,
        warnings: aiResult.plan.missingFields,
        metaPayload: {
          campaign: campaignDraft.campaign,
          adsets: campaignDraft.adsets,
          ai_reason: aiResult.plan.reason,
          status: "PAUSED"
        }
      });
      setStep(3);
      toast.success("Đã tạo preview từ đề xuất AI. Chưa launch lên Meta.");
    }).catch((error: Error) => toast.error(error.message));
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

  function applyContentLibraryItem(contentId: string) {
    setSelectedContentId(contentId);
    const item = contentLibrary.find((content) => content.id === contentId);
    if (!item) return;

    const input = item.input_json ?? {};
    const content = item.content_json;
    const primaryText = firstContentValue(content.primaryTexts);
    const notes = contentPackageToNotes(content);
    const mediaNote = contentPackageToMediaNote(content);

    setForm((current) => ({
      ...current,
      productName: current.productName || item.product || input.product || "",
      industry: current.industry || item.industry || input.industry || "",
      targetCustomer: current.targetCustomer || item.target_customer || input.targetCustomer || "",
      objective: contentGoalToObjective[item.goal] || current.objective,
      offer: current.offer || input.offer || firstContentValue(content.headlines),
      notes: notes || current.notes,
      postMessage: current.postMessage || primaryText,
      mediaNote: mediaNote || current.mediaNote
    }));
    setDraft(null);
    toast.success("Đã đưa content đã lưu vào form tạo campaign.");
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

  async function ensureCampaignCode() {
    if (form.campaignCode) return form.campaignCode;
    if (!selectedAccountId) throw new Error("Chọn tài khoản quảng cáo trước.");
    const payload = await readJson<{ code: string; sequence: number; storage?: string }>("/api/campaign-sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: selectedAccountId })
    });
    setForm((current) => ({ ...current, campaignCode: payload.code }));
    return payload.code;
  }

  async function createPreview() {
    if (mode === "scale_existing") {
      if (!sourceCampaignId) return toast.error("Bạn cần chọn campaign nguồn trước khi nhân bản.");
      if (scaleAction === "clone_adset" && !sourceAdsetId) return toast.error("Bạn cần chọn nhóm quảng cáo nguồn.");
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
      toast.success("Đã tạo preview scale.");
      return;
    }

    if (mode === "ab_test") {
      const variantValues = abVariantsSimple.map((item) => item.value.trim()).filter(Boolean);
      const abDraft = createABTestDraft({
        name: abTestOptions.find((item) => item.key === abTestType)?.title || "A/B Test",
        hypothesis: "A/B test chỉ có ý nghĩa khi mỗi lần bạn chỉ thay đổi 1 yếu tố.",
        testVariable: abTestType,
        schedule: scaleRange,
        minimumSpend: abBudgetPerVariant,
        variants: variantValues
      });
      const validationResult = validateABTestConfig(abDraft);
      if (!validationResult.ok) {
        validationResult.errors.forEach((message) => toast.error(message));
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
      setDraft({
        mode: "ab_test",
        accountId: selectedAccountId,
        title: abDraft.name,
        abTest: abDraft,
        warnings: validationResult.errors,
        metaPayload: {
          ab_test: abDraft,
          type: abTestType,
          common: { account_id: selectedAccountId, page_id: form.pageId, objective: abObjective, budget_per_variant: abBudgetPerVariant, location: abLocation, age_range: abAgeRange, gender: abGender },
          status: "DRAFT_ONLY"
        }
      });
      setStep(3);
      toast.success("Đã tạo preview A/B test.");
      return;
    }

    await withProgress("Đang tạo mã và preview campaign...", async () => {
      const validationRows = buildCampaignValidation({ ...form, adAccountId: selectedAccountId });
      const blockers = validationRows.filter((item) => !item.ok);
      if (blockers.length) {
        throw new Error(`Cần bổ sung: ${blockers.map((item) => item.label).join(", ")}.`);
      }
      const code = await ensureCampaignCode();
      const campaignDraft = generateCampaignDraft({ ...form, adAccountId: selectedAccountId, campaignCode: code }, selectedInterests);
      setDraft({
        mode: "new_campaign",
        accountId: selectedAccountId,
        title: campaignDraft.campaign.name,
        campaignDraft,
        warnings: buildCampaignValidation({ ...form, adAccountId: selectedAccountId, campaignCode: code }).filter((item) => !item.ok).map((item) => `${item.label}: ${item.note || "Chưa đủ dữ liệu"}`),
        metaPayload: {
          campaign: campaignDraft.campaign,
          adsets: campaignDraft.adsets,
          status: "PAUSED"
        }
      });
      setStep(3);
      toast.success("Đã tạo preview Campaign > Adset > Ads.");
    }).catch((error: Error) => toast.error(error.message));
  }

  async function saveDraft() {
    const currentDraft = draft;
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
    if (!selectedAccountId) return toast.error("Chọn tài khoản quảng cáo trước.");
    if (!sourceCampaignId) return toast.error("Bạn cần chọn campaign nguồn trước.");
    if (scaleAction === "clone_adset" && !sourceAdsetId) return toast.error("Bạn cần chọn nhóm quảng cáo nguồn.");
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

  async function launchNewCampaign() {
    if (mode !== "new_campaign") return;
    if (!selectedAccountId) return toast.error("Chọn tài khoản quảng cáo trước.");
    if (!draft?.campaignDraft) return toast.error("Tạo preview trước khi launch lên Meta.");
    if (!form.postId) {
      return toast.error("Launch thật hiện cần chọn một bài viết có sẵn trên Fanpage. Bạn vẫn có thể lưu preview rồi bổ sung trong Ads Manager.");
    }

    await withProgress("Meta đang tạo Campaign → Nhóm quảng cáo → Quảng cáo ở trạng thái PAUSED...", async () => {
      const response = await readJson<{
        data: {
          status: "success" | "partial_success";
          campaign: { id: string; name: string; status: "PAUSED" };
          adsets: Array<{ id: string; name: string; ads: Array<{ id?: string; name: string; error?: string }> }>;
          failed_ads: Array<{ name: string; error?: string }>;
          note: string;
        };
      }>("/api/meta/launch-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad_account_id: selectedAccountId,
          page_id: form.pageId || null,
          post_id: form.postId || null,
          campaign_draft: draft.campaignDraft
        })
      });

      const createdAds = response.data.adsets.reduce((sum, adset) => sum + adset.ads.filter((ad) => ad.id).length, 0);
      if (response.data.status === "partial_success") {
        toast.warning(`Đã tạo campaign PAUSED, nhưng ${response.data.failed_ads.length} quảng cáo lỗi. Kiểm tra chi tiết trong preview/log.`);
      } else {
        toast.success(`Đã tạo campaign PAUSED: ${response.data.campaign.id}. Tổng ads đã tạo: ${createdAds}.`);
      }
      await loadCampaigns(selectedAccountId, true);
    }).catch((error: Error) => toast.error(error.message));
  }

  function scalePrimaryLabel() {
    if (scaleAction === "clone_campaign") return "Nhân bản chiến dịch";
    if (scaleAction === "clone_adset") return "Nhân bản nhóm quảng cáo";
    return "Cập nhật ngân sách";
  }

  async function saveABTest() {
    const rows = abVariantsSimple.map((item) => item.value.trim()).filter(Boolean);
    if (rows.length < 2) return toast.error("Cần ít nhất 2 biến thể khác nhau.");
    if (new Set(rows).size !== rows.length) return toast.error("Các biến thể không được trùng dữ liệu ở yếu tố đang test.");
    await withProgress("Đang lưu A/B test...", async () => {
      const payload = await readJson<{ storage?: string }>("/api/campaign-ab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: selectedAccountId,
          name: abTestOptions.find((item) => item.key === abTestType)?.title || "A/B Test",
          hypothesis: "A/B test chỉ có ý nghĩa khi mỗi lần bạn chỉ thay đổi 1 yếu tố.",
          test_variable: abTestType,
          start_date: scaleRange.startDate,
          end_date: scaleRange.endDate,
          minimum_spend: abBudgetPerVariant,
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
    if (!draft) return toast.error("Tạo preview trước khi xuất JSON.");
    const current = draft;
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `campaign-preview-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyConfig() {
    if (!draft) return toast.error("Tạo preview trước khi copy cấu hình.");
    await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
    toast.success("Đã copy cấu hình.");
  }

  function getChecklist() {
    if (mode === "scale_existing") {
      return [
        { key: "account", label: "Tài khoản quảng cáo", ok: Boolean(selectedAccountId) },
        { key: "action", label: "Hành động scale", ok: Boolean(scaleAction) },
        { key: "range", label: "Khoảng thời gian", ok: Boolean(scaleRange.startDate && scaleRange.endDate) },
        { key: "campaign", label: "Campaign nguồn", ok: Boolean(sourceCampaignId), note: sourceCampaignId ? undefined : "Bạn cần chọn campaign từ bảng." },
        { key: "adset", label: "Adset nguồn", ok: scaleAction !== "clone_adset" || Boolean(sourceAdsetId), note: scaleAction === "clone_adset" ? "Bắt buộc khi nhân bản nhóm quảng cáo." : "Không bắt buộc." },
        { key: "quantity", label: "Số lượng nhân bản", ok: scaleAction === "increase_budget" || cloneQuantity > 0 },
        { key: "budget", label: "Ngân sách mới", ok: scaleAction !== "increase_budget" || Boolean(newBudget.trim()), note: scaleAction === "increase_budget" ? "Bắt buộc khi tăng ngân sách." : "Có thể bổ sung nếu muốn đổi ngân sách." }
      ];
    }

    if (mode === "ab_test") {
      const values = abVariantsSimple.map((item) => item.value.trim()).filter(Boolean);
      return [
        { key: "type", label: "Loại test", ok: Boolean(abTestType) },
        { key: "common", label: "Thông tin chung", ok: Boolean(selectedAccountId && form.pageId && abObjective && abBudgetPerVariant && scaleRange.startDate && scaleRange.endDate) },
        { key: "variants", label: "Có ít nhất 2 biến thể", ok: values.length >= 2 },
        { key: "unique", label: "Biến thể không trùng dữ liệu", ok: values.length >= 2 && new Set(values).size === values.length },
        { key: "preview", label: "Preview đã tạo", ok: draft?.mode === "ab_test" }
      ];
    }

    return [
      ...validation,
      { key: "audience", label: "Tệp khách hàng", ok: Boolean(form.targetCustomer.trim() || selectedInterestIds.length || selectedSavedAudienceId), note: "Có thể dùng tệp đã lưu hoặc mô tả tệp mới." },
      { key: "preview", label: "Preview đã tạo", ok: draft?.mode === "new_campaign" }
    ];
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

      <AIConsultantCard
        message={aiMessage}
        setMessage={setAiMessage}
        result={aiResult}
        onAsk={() => void askAIConsultant()}
        onAccept={() => void acceptAIPlan()}
        busy={Boolean(busyLabel)}
      />

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
              onLaunchScale={() => void launchScale()}
              primaryActionLabel={scalePrimaryLabel()}
              busy={Boolean(busyLabel)}
            />
          ) : null}

          {mode === "new_campaign" ? (
            <NewCampaignPanel
              form={form}
              pages={pages}
              posts={posts}
              savedAudiences={savedAudiences}
              selectedSavedAudienceId={selectedSavedAudienceId}
              contentLibrary={contentLibrary}
              selectedContentId={selectedContentId}
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
              applyContentLibraryItem={applyContentLibraryItem}
              refreshContentLibrary={() => void loadContentLibrary(true)}
              searchInterests={() => void searchInterests()}
              checkFanpagePermission={() => void checkFanpagePermission()}
              setSelectedInterestIds={setSelectedInterestIds}
            />
          ) : null}

          {mode === "ab_test" ? (
            <ABTestPanel
              testType={abTestType}
              setTestType={setAbTestType}
              pages={pages}
              pageId={form.pageId || ""}
              onPageChange={onPageChange}
              objective={abObjective}
              setObjective={setAbObjective}
              budgetPerVariant={abBudgetPerVariant}
              setBudgetPerVariant={setAbBudgetPerVariant}
              location={abLocation}
              setLocation={setAbLocation}
              ageRange={abAgeRange}
              setAgeRange={setAbAgeRange}
              gender={abGender}
              setGender={setAbGender}
              scaleRange={scaleRange}
              setScaleRange={setScaleRange}
              variants={abVariantsSimple}
              setVariants={setAbVariantsSimple}
            />
          ) : null}

          <Card className="rounded-lg p-5">
            <div className="flex flex-wrap gap-3">
              <Button variant="ai" onClick={() => void createPreview()}>
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
                <Button onClick={() => void launchNewCampaign()} disabled={Boolean(busyLabel) || !draft?.campaignDraft} title={!draft?.campaignDraft ? "Tạo preview trước khi launch." : "Tất cả campaign/adset/ad sẽ được tạo ở trạng thái PAUSED."}>
                  <MaterialIcon name="rocket_launch" />
                  Launch lên Meta PAUSED
                </Button>
              ) : null}
              {mode === "ab_test" ? <Button disabled>Chỉ lưu bản nháp</Button> : null}
            </div>
          </Card>
        </div>

        <PreviewPanel draft={draft} fallback={null} validation={getChecklist()} mode={mode} />
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

function AIConsultantCard({
  message,
  setMessage,
  result,
  onAsk,
  onAccept,
  busy
}: {
  message: string;
  setMessage: (value: string) => void;
  result: AIConsultantResponse | null;
  onAsk: () => void;
  onAccept: () => void;
  busy: boolean;
}) {
  return (
    <Card className="rounded-lg p-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <div className="flex items-center gap-2">
            <MaterialIcon className="text-primary" filled name="auto_awesome" />
            <h3 className="text-lg font-extrabold">AI tư vấn tạo quảng cáo</h3>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            Viết đơn giản như đang nói với nhân viên marketing: bạn bán gì, muốn có tin nhắn/lead/sale, ngân sách khoảng bao nhiêu.
          </p>
          <Textarea
            className="mt-4"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ví dụ: Tôi bán khóa học AI cho chủ doanh nghiệp, muốn có lead/inbox, ngân sách 500k/ngày, khách ở Hà Nội..."
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="ai" onClick={onAsk} disabled={busy}>
              <MaterialIcon name="contact_support" />
              Hỏi AI tư vấn
            </Button>
            <Button variant="secondary" onClick={onAccept} disabled={busy || !result}>
              Chấp thuận & tạo preview
            </Button>
          </div>
        </div>
        <div className="rounded-lg bg-surface-container-low p-4">
          {!result ? (
            <div className="text-sm text-on-surface-variant">
              AI sẽ trả về đề xuất dễ hiểu, cấu trúc campaign nên dùng và những thông tin còn thiếu. Nếu chưa cấu hình Gemini key, app sẽ báo rõ thay vì đứng im.
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold uppercase text-outline">Đề xuất</p>
                <p className="mt-1 text-sm font-semibold">{result.advice}</p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <InfoPill label="Chế độ" value={result.plan.mode === "scale_campaign" ? "Scale camp cũ" : result.plan.mode === "ab_test" ? "Testing A/B" : "Tạo camp mới"} />
                <InfoPill label="Mục tiêu" value={result.plan.objective || "Chưa rõ"} />
                <InfoPill label="Ngân sách" value={result.plan.dailyBudget ? formatVnd(result.plan.dailyBudget) : "Chưa rõ"} />
                <InfoPill label="Cấu trúc" value={result.plan.recommendedStructure} />
              </div>
              {result.plan.reason ? <p className="rounded-md bg-white p-3 text-sm text-on-surface-variant">{result.plan.reason}</p> : null}
              {result.plan.missingFields.length ? (
                <div className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                  Còn thiếu: {result.plan.missingFields.join(", ")}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-3">
      <p className="text-[11px] font-bold uppercase text-outline">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
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
  onLaunchScale: () => void;
  primaryActionLabel: string;
  busy: boolean;
}) {
  const sourceRows = buildScaleSourceRows(props.campaigns);
  const [campaignQuery, setCampaignQuery] = useState("");
  const [rowStart, setRowStart] = useState(0);
  const filteredRows = useMemo(() => {
    const query = campaignQuery.trim().toLowerCase();
    if (!query) return sourceRows;
    return sourceRows.filter((campaign) =>
      `${campaign.name} ${campaign.campaignId} ${campaign.objective} ${campaign.status}`.toLowerCase().includes(query)
    );
  }, [campaignQuery, sourceRows]);
  const visibleCount = 8;
  const maxStart = Math.max(0, filteredRows.length - visibleCount);
  const safeStart = Math.min(rowStart, maxStart);
  const visibleRows = filteredRows.slice(safeStart, safeStart + visibleCount);

  return (
    <Card className="rounded-lg p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-extrabold">Scale camp cũ</h3>
          <p className="text-sm text-on-surface-variant">Chọn campaign/adset nguồn, preview rồi mới nhân bản hoặc tăng ngân sách.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={props.onLoadCampaigns} disabled={props.busy}><MaterialIcon name="refresh" /> Lấy campaign</Button>
          <Button onClick={props.onLaunchScale} disabled={props.busy || !props.sourceCampaignId}>
            <MaterialIcon name="content_copy" />
            {props.primaryActionLabel}
          </Button>
        </div>
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
        <div className="md:col-span-3 rounded-md bg-surface-container-low p-4 text-sm text-on-surface-variant">
          {props.sourceCampaignId ? "Đã chọn campaign nguồn. Nếu cần đổi, chọn radio ở bảng bên dưới." : "Bấm Lấy campaign rồi chọn một dòng trong bảng bên dưới."}
        </div>
        <Field label="Nhóm quảng cáo nguồn" className="md:col-span-2">
          <select className="dashboard-input" value={props.sourceAdsetId} onChange={(event) => props.setSourceAdsetId(event.target.value)} disabled={props.scaleAction === "clone_campaign"}>
            <option value="">{props.scaleAction === "clone_campaign" ? "Không cần chọn adset" : "Chọn adset"}</option>
            {props.adsets.map((adset) => <option key={adset.id} value={adset.id}>{adset.name} · {adset.status || "UNKNOWN"}</option>)}
          </select>
        </Field>
        <Field label="Số lượng nhân bản">
          <Input type="number" min={1} max={20} value={props.cloneQuantity} onChange={(event) => props.setCloneQuantity(Number(event.target.value))} disabled={props.scaleAction === "increase_budget"} />
        </Field>
        <Field label="Ngân sách mới">
          <Input value={props.newBudget} onChange={(event) => props.setNewBudget(event.target.value)} placeholder="VD: 500000" />
        </Field>
      </div>
      <div className="mt-5 grid gap-3 rounded-lg bg-surface-container-low p-4 md:grid-cols-[1fr_1.2fr] md:items-end">
        <Field label="Tìm campaign">
          <Input
            value={campaignQuery}
            onChange={(event) => {
              setCampaignQuery(event.target.value);
              setRowStart(0);
            }}
            placeholder="Nhập tên hoặc ID chiến dịch..."
          />
        </Field>
        <Field label={`Thanh trượt danh sách (${filteredRows.length} campaign)`}>
          <input
            className="w-full accent-primary"
            disabled={filteredRows.length <= visibleCount}
            max={maxStart}
            min={0}
            onChange={(event) => setRowStart(Number(event.target.value))}
            type="range"
            value={safeStart}
          />
          <p className="text-xs text-on-surface-variant">
            Đang xem dòng {filteredRows.length ? safeStart + 1 : 0}-{Math.min(safeStart + visibleCount, filteredRows.length)}. Kéo thanh này để lướt nhanh thay vì cuộn dài.
          </p>
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
              <th className="px-4 py-3">Chọn</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((campaign) => (
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
                <td className="px-4 py-3 text-center">
                  <input
                    aria-label={`Chọn ${campaign.name}`}
                    type="radio"
                    name="sourceCampaign"
                    checked={campaign.campaignId === props.sourceCampaignId}
                    onChange={() => props.setSourceCampaignId(campaign.campaignId)}
                  />
                </td>
              </tr>
            ))}
            {!props.campaigns.length ? <tr><td className="px-4 py-6 text-center text-on-surface-variant" colSpan={9}>Chưa có dữ liệu campaign. Bấm “Lấy campaign”.</td></tr> : null}
            {props.campaigns.length && !filteredRows.length ? <tr><td className="px-4 py-6 text-center text-on-surface-variant" colSpan={9}>Không tìm thấy campaign theo từ khóa này.</td></tr> : null}
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
  contentLibrary: ContentLibraryItem[];
  selectedContentId: string;
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
  applyContentLibraryItem: (value: string) => void;
  refreshContentLibrary: () => void;
  searchInterests: () => void;
  checkFanpagePermission: () => void;
  setSelectedInterestIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  return (
    <div className="space-y-6">
      <Card className="rounded-lg p-6">
        <h3 className="text-lg font-extrabold">Tạo camp mới</h3>
        <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container-low p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <Field label="Content quảng cáo đã lưu">
              <select className="dashboard-input" value={props.selectedContentId} onChange={(event) => props.applyContentLibraryItem(event.target.value)}>
                <option value="">Chọn content từ Creative để đổ vào form</option>
                {props.contentLibrary.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title || item.product} · {item.product}
                  </option>
                ))}
              </select>
            </Field>
            <Button variant="secondary" onClick={props.refreshContentLibrary}>
              <MaterialIcon name="refresh" />
              Tải lại content
            </Button>
          </div>
          <p className="mt-2 text-sm text-on-surface-variant">
            {props.contentLibrary.length
              ? "Chọn một gói content đã lưu để tự điền sản phẩm, mục tiêu, offer, nội dung mẫu và brief media."
              : "Chưa có content đã lưu. Vào trang Creative để tạo content bằng Creator Ads AI rồi lưu vào thư viện."}
          </p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Tên sản phẩm/dịch vụ"><Input value={props.form.productName} onChange={(event) => props.updateField("productName", event.target.value)} /></Field>
          <Field label="Ngành hàng"><Input value={props.form.industry} onChange={(event) => props.updateField("industry", event.target.value)} /></Field>
          <Field label="Mục tiêu">
            <select className="dashboard-input" value={props.form.objective} onChange={(event) => props.updateField("objective", event.target.value as CampaignBuilderInput["objective"])}>
              <option>Tin nhắn</option><option>Tương tác</option><option>Lead</option><option>Chuyển đổi</option><option>Traffic</option><option>Sales</option>
            </select>
          </Field>
          <Field label="Mô hình tạo camp">
            <select className="dashboard-input" value={props.form.structureMode || "1-1-1"} onChange={(event) => props.updateField("structureMode", event.target.value as CampaignBuilderInput["structureMode"])}>
              <option value="1-1-1">1 Campaign - 1 Nhóm - 1 Quảng cáo</option>
              <option value="1-3-3">1 Campaign - 3 Nhóm - 9 Quảng cáo</option>
              <option value="custom">Tùy chỉnh</option>
            </select>
          </Field>
          {props.form.structureMode === "custom" ? (
            <>
              <Field label="Số nhóm quảng cáo"><Input type="number" min={1} max={10} value={props.form.adsetCount || 1} onChange={(event) => props.updateField("adsetCount", Number(event.target.value))} /></Field>
              <Field label="Số quảng cáo mỗi nhóm"><Input type="number" min={1} max={10} value={props.form.adsPerAdset || 1} onChange={(event) => props.updateField("adsPerAdset", Number(event.target.value))} /></Field>
            </>
          ) : null}
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
          <Field label="Độ tuổi"><Input value={props.form.ageRange || "25-44"} onChange={(event) => props.updateField("ageRange", event.target.value)} /></Field>
          <Field label="Giới tính">
            <select className="dashboard-input" value={props.form.gender || "Tất cả"} onChange={(event) => props.updateField("gender", event.target.value)}>
              <option>Tất cả</option>
              <option>Nam</option>
              <option>Nữ</option>
            </select>
          </Field>
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
  testType: SimpleABTestType;
  setTestType: (value: SimpleABTestType) => void;
  pages: FacebookPage[];
  pageId: string;
  onPageChange: (value: string) => void;
  objective: CampaignBuilderInput["objective"];
  setObjective: (value: CampaignBuilderInput["objective"]) => void;
  budgetPerVariant: string;
  setBudgetPerVariant: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  ageRange: string;
  setAgeRange: (value: string) => void;
  gender: string;
  setGender: (value: string) => void;
  scaleRange: { startDate: string; endDate: string };
  setScaleRange: (value: { startDate: string; endDate: string }) => void;
  variants: SimpleABVariant[];
  setVariants: React.Dispatch<React.SetStateAction<SimpleABVariant[]>>;
}) {
  const valueLabel =
    props.testType === "copy"
      ? "Bài viết/Post"
      : props.testType === "creative"
        ? "Media"
        : props.testType === "audience"
          ? "Tệp khách hàng"
          : "Vị trí hiển thị";

  return (
    <div className="space-y-6">
      <Card className="rounded-lg p-6">
        <h3 className="text-lg font-extrabold">Bước 1: Bạn muốn test gì?</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {abTestOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => props.setTestType(option.key)}
              className={`rounded-lg border p-4 text-left ${props.testType === option.key ? "border-primary bg-primary text-white" : "border-outline-variant bg-white"}`}
            >
              <p className="font-extrabold">{option.title}</p>
              <p className={`mt-1 text-sm ${props.testType === option.key ? "text-white/80" : "text-on-surface-variant"}`}>{option.description}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="rounded-lg p-6">
        <h3 className="text-lg font-extrabold">Bước 2: Thông tin chung</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Fanpage">
            <select className="dashboard-input" value={props.pageId} onChange={(event) => props.onPageChange(event.target.value)}>
              <option value="">Chọn fanpage</option>
              {props.pages.map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}
            </select>
          </Field>
          <Field label="Mục tiêu">
            <select className="dashboard-input" value={props.objective} onChange={(event) => props.setObjective(event.target.value as CampaignBuilderInput["objective"])}>
              <option>Tin nhắn</option><option>Tương tác</option><option>Lead</option><option>Traffic</option><option>Sales</option>
            </select>
          </Field>
          <Field label="Ngân sách mỗi biến thể"><Input value={props.budgetPerVariant} onChange={(event) => props.setBudgetPerVariant(event.target.value)} /></Field>
          <Field label="Khu vực"><Input value={props.location} onChange={(event) => props.setLocation(event.target.value)} /></Field>
          <Field label="Từ ngày"><Input type="date" value={props.scaleRange.startDate} onChange={(event) => props.setScaleRange({ ...props.scaleRange, startDate: event.target.value })} /></Field>
          <Field label="Đến ngày"><Input type="date" value={props.scaleRange.endDate} onChange={(event) => props.setScaleRange({ ...props.scaleRange, endDate: event.target.value })} /></Field>
          <Field label="Độ tuổi"><Input value={props.ageRange} onChange={(event) => props.setAgeRange(event.target.value)} /></Field>
          <Field label="Giới tính">
            <select className="dashboard-input" value={props.gender} onChange={(event) => props.setGender(event.target.value)}>
              <option>Tất cả</option><option>Nam</option><option>Nữ</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card className="rounded-lg p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold">Bước 3: Tạo biến thể</h3>
            <p className="text-sm text-on-surface-variant">Mỗi biến thể chỉ thay đổi 1 yếu tố: {valueLabel}.</p>
          </div>
          <Button variant="secondary" onClick={() => props.setVariants((current) => [...current, { id: String.fromCharCode(65 + current.length), label: `Biến thể ${String.fromCharCode(65 + current.length)}`, value: "" }])}>
            + Thêm biến thể
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {props.variants.map((variant, index) => (
            <Field key={variant.id} label={`${variant.label} - ${valueLabel}`}>
              <Input
                value={variant.value}
                placeholder={props.testType === "copy" ? "Nhập/chọn post khác nhau" : `Nhập ${valueLabel.toLowerCase()} khác nhau`}
                onChange={(event) => props.setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))}
              />
            </Field>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PreviewPanel({ draft, fallback, validation, mode }: { draft: CampaignPlannerDraft | null; fallback: CampaignPlannerDraft | null; validation: Array<{ key: string; label: string; ok: boolean; note?: string }>; mode: CampaignBuilderMode }) {
  const data = draft ?? fallback;
  const emptyMessage =
    mode === "scale_existing"
      ? "Bạn cần lấy campaign và chọn campaign nguồn trước khi nhân bản."
      : mode === "ab_test"
        ? "Chọn loại test, nhập 2 biến thể khác nhau rồi bấm Tạo preview."
        : "Nhập thông tin cơ bản rồi bấm Tạo preview để xem cây Campaign > Nhóm quảng cáo > Quảng cáo.";
  return (
    <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
      <Card className="rounded-lg p-6">
        <h3 className="text-lg font-extrabold">Preview & Launch</h3>
        <p className="mt-1 text-sm text-on-surface-variant">Preview chỉ để kiểm tra. Không tự tạo campaign ACTIVE.</p>
        {!data ? <div className="mt-5 rounded-md bg-surface-container-low p-5 text-sm text-on-surface-variant">{emptyMessage}</div> : null}
        {data ? (
          <div className="mt-5 space-y-4">
            <PreviewSection title="Tổng quan" rows={{ mode: data.mode, accountId: data.accountId, title: data.title }} />
            {data.campaignDraft ? <CampaignTreePreview draft={data.campaignDraft} /> : null}
            {data.scale ? <PreviewSection title="Scale camp cũ" rows={data.metaPayload} /> : null}
            {data.abTest ? <ABPreview draft={data.abTest} /> : null}
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

function CampaignTreePreview({ draft }: { draft: CampaignDraft }) {
  return (
    <div className="rounded-lg border border-outline-variant p-4">
      <p className="mb-3 text-sm font-extrabold text-primary">Cấu trúc sẽ tạo</p>
      <div className="rounded-md bg-surface-container-low p-3">
        <p className="font-extrabold">Campaign: {draft.campaign.name}</p>
        <p className="text-xs text-on-surface-variant">Mã: {draft.campaign.code} · {draft.campaign.objective} · {draft.campaign.status}</p>
      </div>
      <div className="mt-3 space-y-3 pl-4">
        {(draft.adsets ?? [{ ...draft.adSet, ads: [draft.ads] }]).map((adset, index) => (
          <div key={`${adset.name}-${index}`} className="border-l-2 border-primary/30 pl-4">
            <div className="rounded-md bg-white p-3 ring-1 ring-outline-variant">
              <p className="font-bold">Adset {index + 1}: {adset.name}</p>
              <p className="text-xs text-on-surface-variant">{adset.ageRange} · {adset.gender} · {adset.location}</p>
            </div>
            <div className="mt-2 space-y-2 pl-4">
              {adset.ads.map((ad, adIndex) => (
                <div key={`${ad.name}-${adIndex}`} className="rounded-md bg-surface-container-low p-3">
                  <p className="font-semibold">Ad {adIndex + 1}: {ad.name}</p>
                  <p className="text-xs text-on-surface-variant">{ad.headline} · {ad.cta}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ABPreview({ draft }: { draft: ABTestDraft }) {
  return (
    <div className="rounded-lg border border-outline-variant p-4">
      <p className="mb-3 text-sm font-extrabold text-primary">A/B Test: {draft.name}</p>
      <div className="space-y-2">
        {draft.variants.map((variant, index) => (
          <div key={variant.id} className="rounded-md bg-surface-container-low p-3">
            <p className="font-bold">Biến thể {String.fromCharCode(65 + index)}</p>
            <p className="text-sm text-on-surface-variant">{String(variant.payload.value || variant.name)}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">A/B test chỉ có ý nghĩa khi mỗi lần bạn chỉ thay đổi 1 yếu tố.</p>
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
