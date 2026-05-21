"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCachedJson, getCachedState, setCachedState } from "@/lib/meta/client-cache";
import { applyDefaultAdAccount, getDefaultAdAccountId, setDefaultAdAccountId } from "@/lib/meta/default-account";
import type { AdAccount } from "@/lib/meta/types";

type Authorization = {
  id?: string;
  ad_account_id: string;
  status: "disabled" | "enabled";
  allowed_actions: string[];
  max_daily_budget_change_percent: number;
  max_daily_budget_change_amount?: number | null;
  require_manual_approval: boolean;
};

type Recommendation = {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  recommendation_type: string;
  priority: "low" | "medium" | "high";
  title: string;
  reason: string;
  expected_impact?: string;
  action_payload?: Record<string, unknown> | null;
  status: string;
  created_at: string;
};

type ActionLog = {
  id: string;
  ad_account_id: string;
  recommendation_id?: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string;
  status: "blocked" | "success" | "failed" | "proposal_only";
  error_message?: string | null;
  created_at: string;
};

type IndustryProfile = {
  id?: string;
  ad_account_id: string;
  industry_key: string;
  business_model?: string | null;
  offer_type?: string | null;
  average_order_value?: number | string | null;
  target_customer?: string | null;
  notes?: string | null;
};

type IndustryLearningRow = {
  id: string;
  industry_key: string;
  objective: string;
  sample_size: number;
  median_ctr?: number | null;
  median_cpc?: number | null;
  median_cpm?: number | null;
  median_cpl?: number | null;
  median_cost_per_message?: number | null;
  updated_at: string;
};

type SyncResult = {
  sync_run_id: string;
  account_count: number;
  campaign_count: number;
  ad_count: number;
  date_range: { startDate: string; endDate: string };
};

const cacheKey = "optimization-center:v1";
const allowedActionOptions = [
  { value: "scale_budget", label: "Tăng ngân sách có giới hạn" },
  { value: "reduce_budget", label: "Giảm ngân sách có giới hạn" },
  { value: "pause_review", label: "Đề xuất tạm dừng để kiểm tra" },
  { value: "duplicate_winner", label: "Nhân bản campaign/creative thắng" },
  { value: "refresh_creative", label: "Tạo yêu cầu làm mới creative" }
];

const industryOptions = [
  { value: "unknown", label: "Chưa xác định" },
  { value: "spa_beauty", label: "Spa / thẩm mỹ" },
  { value: "education_course", label: "Khóa học / đào tạo" },
  { value: "fashion_cosmetics", label: "Thời trang / mỹ phẩm" },
  { value: "restaurant_cafe", label: "Nhà hàng / cafe" },
  { value: "real_estate", label: "Bất động sản" },
  { value: "clinic_health", label: "Phòng khám / sức khỏe" },
  { value: "local_service", label: "Dịch vụ địa phương" },
  { value: "b2b_service", label: "Dịch vụ B2B" },
  { value: "ecommerce", label: "Bán hàng online / ecommerce" }
];

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

async function readJson<T>(url: string, init?: RequestInit & { force?: boolean }) {
  if (!init || !init.method || init.method === "GET") return getCachedJson<T>(url, { force: init?.force });
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Không thể lấy dữ liệu.");
  return payload;
}

function priorityClass(priority: Recommendation["priority"]) {
  if (priority === "high") return "bg-error-container text-error";
  if (priority === "medium") return "bg-amber-50 text-amber-800";
  return "bg-surface-container text-on-surface-variant";
}

function actionStatusClass(status: ActionLog["status"]) {
  if (status === "success") return "bg-emerald-50 text-emerald-700";
  if (status === "blocked" || status === "failed") return "bg-error-container text-error";
  return "bg-amber-50 text-amber-800";
}

function actionStatusLabel(status: ActionLog["status"]) {
  if (status === "success") return "Đã áp dụng";
  if (status === "blocked") return "Đã chặn";
  if (status === "failed") return "Thất bại";
  return "Chỉ ghi nhận";
}

function recommendationActionLabel(actionType: string) {
  return allowedActionOptions.find((item) => item.value === actionType)?.label || actionType;
}

function getPercentValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.abs(number) : 0;
}

function getApplyReadiness(recommendation: Recommendation, authorization: Authorization | null) {
  const checks: Array<{ label: string; ok: boolean; tone?: "good" | "warn" | "bad" }> = [];
  const actionPayload = recommendation.action_payload ?? {};
  const isBudgetAction = recommendation.recommendation_type === "scale_budget" || recommendation.recommendation_type === "reduce_budget";
  const requestedBudgetChange = getPercentValue(actionPayload.budget_change_percent ?? actionPayload.suggested_budget_increase_percent);
  const maxBudgetChange = Number(authorization?.max_daily_budget_change_percent ?? 0);
  const enabled = authorization?.status === "enabled";
  const allowedActions = Array.isArray(authorization?.allowed_actions) ? authorization.allowed_actions : [];
  const actionAllowed = allowedActions.includes(recommendation.recommendation_type);
  const withinBudgetLimit = !isBudgetAction || requestedBudgetChange === 0 || maxBudgetChange === 0 || requestedBudgetChange <= maxBudgetChange;
  const isRealBudgetUpdate = recommendation.recommendation_type === "scale_budget" && typeof actionPayload.new_daily_budget === "string";

  checks.push({ label: recommendation.status === "approved" ? "Đã duyệt khuyến nghị" : "Cần duyệt trước khi áp dụng", ok: recommendation.status === "approved" });
  checks.push({ label: enabled ? "Đã bật ủy quyền cho account" : "Chưa bật ủy quyền account", ok: enabled });
  checks.push({ label: actionAllowed ? "Hành động nằm trong phạm vi ủy quyền" : `Chưa cho phép: ${recommendationActionLabel(recommendation.recommendation_type)}`, ok: actionAllowed });
  if (isBudgetAction) {
    checks.push({
      label: withinBudgetLimit
        ? `Trong giới hạn ngân sách (${requestedBudgetChange || 0}% / ${maxBudgetChange || "không giới hạn"}%)`
        : `Vượt giới hạn ngân sách (${requestedBudgetChange}% > ${maxBudgetChange}%)`,
      ok: withinBudgetLimit
    });
  }
  checks.push({
    label: isRealBudgetUpdate ? "Có thể gọi Meta để cập nhật ngân sách" : "Hành động hiện ở dạng proposal/log, chưa tự chỉnh Meta",
    ok: isRealBudgetUpdate,
    tone: isRealBudgetUpdate ? "good" : "warn"
  });

  return {
    ok: checks.every((item) => item.ok),
    checks,
    canClickApply: recommendation.status === "approved" && enabled
  };
}

function formatDateTime(value: string) {
  if (!value) return "Không rõ thời gian";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatNumber(value?: number | null, suffix = "") {
  if (value === null || value === undefined) return "Chưa có";
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(Number(value) || 0)}${suffix}`;
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return "Chưa có";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function priorityRank(priority: Recommendation["priority"]) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

export function OptimizationCenterClient() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [range, setRange] = useState(defaultRange());
  const [authorization, setAuthorization] = useState<Authorization | null>(null);
  const [industryProfile, setIndustryProfile] = useState<IndustryProfile | null>(null);
  const [industryLearning, setIndustryLearning] = useState<IndustryLearningRow[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [busyLabel, setBusyLabel] = useState("");

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === selectedAccountId || item.account_id === selectedAccountId.replace(/^act_/, "")),
    [accounts, selectedAccountId]
  );
  const enabled = authorization?.status === "enabled";
  const todayPlan = useMemo(() => {
    const activeRecommendations = recommendations
      .filter((item) => item.status === "draft" || item.status === "approved")
      .sort((a, b) => {
        const priorityDelta = priorityRank(b.priority) - priorityRank(a.priority);
        if (priorityDelta) return priorityDelta;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    const topRecommendation = activeRecommendations[0];
    const waitingReview = activeRecommendations.filter((item) => item.status === "draft").length;
    const readyToApply = activeRecommendations.filter((item) => item.status === "approved").length;
    const riskLogs = actionLogs.filter((item) => item.status === "blocked" || item.status === "failed").length;
    const highPriority = activeRecommendations.filter((item) => item.priority === "high").length;

    let nextStep = "Đồng bộ dữ liệu Meta để app có đủ dữ liệu phân tích.";
    if (lastSync && !recommendations.length) nextStep = "Bấm tạo khuyến nghị để app phân tích dữ liệu vừa đồng bộ.";
    if (topRecommendation?.status === "draft") nextStep = `Duyệt hoặc từ chối: ${topRecommendation.title}`;
    if (topRecommendation?.status === "approved" && !enabled) nextStep = "Bật ủy quyền có kiểm soát trước khi áp dụng khuyến nghị đã duyệt.";
    if (topRecommendation?.status === "approved" && enabled) nextStep = `Có thể áp dụng an toàn: ${topRecommendation.title}`;

    return { topRecommendation, waitingReview, readyToApply, riskLogs, highPriority, nextStep };
  }, [actionLogs, enabled, lastSync, recommendations]);

  useEffect(() => {
    const cached = getCachedState<{
      accounts: AdAccount[];
      selectedAccountId: string;
      range: { startDate: string; endDate: string };
      authorization: Authorization | null;
      industryProfile?: IndustryProfile | null;
      industryLearning?: IndustryLearningRow[];
      recommendations: Recommendation[];
      actionLogs?: ActionLog[];
      lastSync: SyncResult | null;
    }>(cacheKey);
    if (cached) {
      queueMicrotask(() => {
        setAccounts(cached.accounts);
        setSelectedAccountId(cached.selectedAccountId);
        setRange(cached.range);
        setAuthorization(cached.authorization);
        setIndustryProfile(cached.industryProfile ?? null);
        setIndustryLearning(cached.industryLearning ?? []);
        setRecommendations(cached.recommendations);
        setActionLogs(cached.actionLogs ?? []);
        setLastSync(cached.lastSync);
      });
      return;
    }
    void loadAccounts();
  // Initial bootstrap is intentionally one-shot; refresh is handled by the buttons.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    setCachedState(cacheKey, { accounts, selectedAccountId, range, authorization, industryProfile, industryLearning, recommendations, actionLogs, lastSync });
  }, [accounts, selectedAccountId, range, authorization, industryProfile, industryLearning, recommendations, actionLogs, lastSync]);

  async function withProgress<T>(label: string, fn: () => Promise<T>) {
    setBusyLabel(label);
    try {
      return await fn();
    } finally {
      setBusyLabel("");
    }
  }

  async function loadAccounts(force = false) {
    await withProgress("Đang tải tài khoản quảng cáo...", async () => {
      const payload = await readJson<{ data: AdAccount[] }>("/api/meta/adaccounts", { force });
      const rows = payload.data ?? [];
      const accountId = applyDefaultAdAccount(rows, getDefaultAdAccountId() || rows[0]?.id);
      setAccounts(rows);
      setSelectedAccountId(accountId);
      if (accountId) {
        await Promise.all([
          loadAuthorization(accountId, true),
          loadIndustryProfile(accountId, true),
          loadIndustryLearning("unknown", true),
          loadRecommendations(accountId, true),
          loadActionLogs(accountId, true)
        ]);
      }
    }).catch((error: Error) => toast.error(error.message));
  }

  async function loadAuthorization(accountId = selectedAccountId, force = false) {
    if (!accountId) return;
    const payload = await readJson<{ data: Authorization | null; storage?: string }>(
      `/api/optimization/authorization?ad_account_id=${encodeURIComponent(accountId)}`,
      { force }
    );
    setAuthorization(
      payload.data ?? {
        ad_account_id: accountId,
        status: "disabled",
        allowed_actions: [],
        max_daily_budget_change_percent: 20,
        max_daily_budget_change_amount: null,
        require_manual_approval: true
      }
    );
  }

  async function loadIndustryProfile(accountId = selectedAccountId, force = false) {
    if (!accountId) return;
    const payload = await readJson<{ data: IndustryProfile | null; storage?: string }>(
      `/api/optimization/industry-profile?ad_account_id=${encodeURIComponent(accountId)}`,
      { force }
    );
    setIndustryProfile(
      payload.data ?? {
        ad_account_id: accountId,
        industry_key: "unknown",
        business_model: "",
        offer_type: "",
        average_order_value: "",
        target_customer: "",
        notes: ""
      }
    );
    await loadIndustryLearning(payload.data?.industry_key ?? "unknown", force);
  }

  async function loadIndustryLearning(industryKey = industryProfile?.industry_key ?? "unknown", force = false) {
    if (!industryKey || industryKey === "unknown") {
      setIndustryLearning([]);
      return;
    }
    const payload = await readJson<{ data: IndustryLearningRow[]; storage?: string }>(
      `/api/optimization/industry-learning?industry_key=${encodeURIComponent(industryKey)}`,
      { force }
    );
    setIndustryLearning(payload.data ?? []);
  }

  async function loadRecommendations(accountId = selectedAccountId, force = false) {
    if (!accountId) return;
    const payload = await readJson<{ data: Recommendation[] }>(
      `/api/optimization/recommendations?ad_account_id=${encodeURIComponent(accountId)}`,
      { force }
    );
    setRecommendations(payload.data ?? []);
  }

  async function loadActionLogs(accountId = selectedAccountId, force = false) {
    if (!accountId) return;
    const payload = await readJson<{ data: ActionLog[]; storage?: string }>(
      `/api/optimization/action-logs?ad_account_id=${encodeURIComponent(accountId)}&limit=30`,
      { force }
    );
    setActionLogs(payload.data ?? []);
  }

  async function onAccountChange(accountId: string) {
    setSelectedAccountId(accountId);
    setDefaultAdAccountId(accountId);
    setIndustryProfile(null);
    setIndustryLearning([]);
    setRecommendations([]);
    setActionLogs([]);
    setLastSync(null);
    await withProgress("Đang đổi tài khoản tối ưu...", async () => {
      await Promise.all([
        loadAuthorization(accountId, true),
        loadIndustryProfile(accountId, true),
        loadIndustryLearning("unknown", true),
        loadRecommendations(accountId, true),
        loadActionLogs(accountId, true)
      ]);
    });
  }

  async function saveAuthorization(next?: Partial<Authorization>) {
    if (!selectedAccountId) return toast.error("Chọn tài khoản quảng cáo trước.");
    const current = {
      ad_account_id: selectedAccountId,
      status: "disabled" as const,
      allowed_actions: [],
      max_daily_budget_change_percent: 20,
      max_daily_budget_change_amount: null,
      require_manual_approval: true,
      ...(authorization ?? {}),
      ...(next ?? {})
    };

    await withProgress("Đang lưu ủy quyền tối ưu...", async () => {
      const payload = await readJson<{ data: Authorization }>("/api/optimization/authorization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current)
      });
      setAuthorization(payload.data);
      toast.success(payload.data.status === "enabled" ? "Đã bật ủy quyền có kiểm soát." : "Đã tắt ủy quyền tự động.");
    }).catch((error: Error) => toast.error(error.message));
  }

  async function saveIndustryProfile() {
    if (!selectedAccountId) return toast.error("Chọn tài khoản quảng cáo trước.");
    const current = {
      ad_account_id: selectedAccountId,
      industry_key: "unknown",
      business_model: "",
      offer_type: "",
      average_order_value: "",
      target_customer: "",
      notes: "",
      ...(industryProfile ?? {})
    };

    await withProgress("Đang lưu hồ sơ ngành hàng...", async () => {
      const payload = await readJson<{ data: IndustryProfile }>("/api/optimization/industry-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current)
      });
      setIndustryProfile(payload.data);
      await loadIndustryLearning(payload.data.industry_key, true);
      toast.success("Đã lưu hồ sơ ngành cho tài khoản quảng cáo.");
    }).catch((error: Error) => toast.error(error.message));
  }

  async function rebuildIndustryLearning() {
    const industryKey = industryProfile?.industry_key;
    if (!industryKey || industryKey === "unknown") return toast.error("Chọn ngành hàng trước khi học benchmark.");
    await withProgress("Đang gom dữ liệu ngành và tính benchmark ẩn danh...", async () => {
      const payload = await readJson<{ data: IndustryLearningRow[]; sample_size?: number }>("/api/optimization/industry-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry_key: industryKey })
      });
      setIndustryLearning(payload.data ?? []);
      toast.success(`Đã cập nhật benchmark ngành từ ${payload.sample_size ?? 0} mẫu campaign.`);
    }).catch((error: Error) => toast.error(error.message));
  }

  async function syncData() {
    if (!selectedAccountId) return toast.error("Chọn tài khoản quảng cáo trước.");
    await withProgress("Đang đồng bộ dữ liệu Meta để học tối ưu...", async () => {
      const payload = await readJson<{ data: SyncResult }>("/api/meta/sync-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad_account_ids: [selectedAccountId],
          start_date: range.startDate,
          end_date: range.endDate
        })
      });
      setLastSync(payload.data);
      toast.success(`Đã lưu ${payload.data.campaign_count} campaign và ${payload.data.ad_count} ads/creative.`);
    }).catch((error: Error) => toast.error(error.message));
  }

  async function generateRecommendations() {
    if (!selectedAccountId) return toast.error("Chọn tài khoản quảng cáo trước.");
    await withProgress("Đang phân tích và tạo khuyến nghị tối ưu...", async () => {
      const payload = await readJson<{ data: Recommendation[] }>("/api/optimization/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad_account_id: selectedAccountId,
          start_date: range.startDate,
          end_date: range.endDate
        })
      });
      setRecommendations(payload.data ?? []);
      toast.success(`Đã tạo ${payload.data?.length ?? 0} khuyến nghị.`);
    }).catch((error: Error) => toast.error(error.message));
  }

  async function updateRecommendationStatus(recommendationId: string, status: "approved" | "rejected" | "draft") {
    await withProgress(status === "approved" ? "Đang duyệt khuyến nghị..." : "Đang cập nhật khuyến nghị...", async () => {
      const payload = await readJson<{ data: Recommendation }>("/api/optimization/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendation_id: recommendationId, status })
      });
      setRecommendations((current) => current.map((item) => (item.id === recommendationId ? payload.data : item)));
      await loadActionLogs(selectedAccountId, true);
      toast.success(status === "approved" ? "Đã duyệt khuyến nghị." : "Đã cập nhật khuyến nghị.");
    }).catch((error: Error) => toast.error(error.message));
  }

  async function applyRecommendation(recommendationId: string) {
    const row = recommendations.find((item) => item.id === recommendationId);
    const ok = window.confirm(
      `Bạn chắc chắn muốn áp dụng khuyến nghị "${row?.title || recommendationId}"?\n\nApp sẽ kiểm tra ủy quyền, giới hạn ngân sách và chỉ thực hiện trong phạm vi được phép.`
    );
    if (!ok) return;

    await withProgress("Đang kiểm tra ủy quyền và áp dụng an toàn...", async () => {
      const payload = await readJson<{ data: Recommendation; result?: { message?: string; status?: string } }>("/api/optimization/recommendations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendation_id: recommendationId })
      });
      setRecommendations((current) => current.map((item) => (item.id === recommendationId ? payload.data : item)));
      await loadActionLogs(selectedAccountId, true);
      toast.success(payload.result?.message || "Đã áp dụng hoặc ghi nhận proposal.");
    }).catch((error: Error) => toast.error(error.message));
  }

  function toggleAction(value: string) {
    const current = authorization?.allowed_actions ?? [];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    setAuthorization((item) => ({
      ...(item ?? {
        ad_account_id: selectedAccountId,
        status: "disabled",
        max_daily_budget_change_percent: 20,
        max_daily_budget_change_amount: null,
        require_manual_approval: true
      }),
      allowed_actions: next
    }));
  }

  function updateIndustryProfile(next: Partial<IndustryProfile>) {
    setIndustryProfile((current) => ({
      ad_account_id: selectedAccountId,
      industry_key: "unknown",
      business_model: "",
      offer_type: "",
      average_order_value: "",
      target_customer: "",
      notes: "",
      ...(current ?? {}),
      ...next
    }));
  }

  return (
    <div className="space-y-6">
      {busyLabel ? (
        <div className="sticky top-16 z-30 rounded-lg border border-primary/20 bg-white p-3 shadow-soft">
          <div className="flex items-center justify-between text-sm font-bold text-primary">
            <span>{busyLabel}</span>
            <MaterialIcon className="animate-spin" name="sync" />
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-fixed">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      ) : null}

      <Card className="rounded-xl p-5">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr_0.7fr_auto_auto] lg:items-end">
          <label className="space-y-2">
            <span className="text-sm font-bold">Tài khoản quảng cáo</span>
            <select className="dashboard-input" value={selectedAccountId} onChange={(event) => void onAccountChange(event.target.value)}>
              {accounts.length ? accounts.map((account) => <option key={account.id} value={account.id}>{account.name || account.id} - {account.id}</option>) : <option value="">Chưa có tài khoản</option>}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Từ ngày</span>
            <Input type="date" value={range.startDate} onChange={(event) => setRange({ ...range, startDate: event.target.value })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Đến ngày</span>
            <Input type="date" value={range.endDate} onChange={(event) => setRange({ ...range, endDate: event.target.value })} />
          </label>
          <Button variant="secondary" onClick={() => void loadAccounts(true)} disabled={Boolean(busyLabel)}>
            <MaterialIcon name="refresh" />
            Làm mới
          </Button>
          <Button onClick={() => void syncData()} disabled={Boolean(busyLabel)}>
            <MaterialIcon name="sync" />
            Đồng bộ dữ liệu
          </Button>
        </div>
      </Card>

      <Card className="rounded-xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-outline">Hồ sơ ngành hàng</p>
            <h3 className="mt-2 text-xl font-extrabold">Dạy Autopilot hiểu doanh nghiệp này bán gì</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Mỗi tài khoản quảng cáo có thể thuộc ngành khác nhau. Lưu ngữ cảnh này giúp app phân tích benchmark, ngân sách và creative winner theo đúng ngành thay vì phán đoán chung chung.
            </p>
          </div>
          <Button onClick={() => void saveIndustryProfile()} disabled={Boolean(busyLabel) || !selectedAccountId}>
            <MaterialIcon name="save" />
            Lưu hồ sơ ngành
          </Button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-bold">Ngành chính</span>
            <select
              className="dashboard-input"
              value={industryProfile?.industry_key ?? "unknown"}
              onChange={(event) => updateIndustryProfile({ industry_key: event.target.value })}
            >
              {industryOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Mô hình bán hàng</span>
            <Input
              placeholder="Ví dụ: inbox tư vấn, bán khóa học, đặt lịch..."
              value={industryProfile?.business_model ?? ""}
              onChange={(event) => updateIndustryProfile({ business_model: event.target.value })}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Giá trị đơn trung bình</span>
            <Input
              type="number"
              min={0}
              placeholder="Ví dụ: 799000"
              value={industryProfile?.average_order_value ?? ""}
              onChange={(event) => updateIndustryProfile({ average_order_value: event.target.value })}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Loại offer</span>
            <Input
              placeholder="Giảm giá, tặng quà, tư vấn miễn phí..."
              value={industryProfile?.offer_type ?? ""}
              onChange={(event) => updateIndustryProfile({ offer_type: event.target.value })}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Khách hàng mục tiêu</span>
            <Input
              placeholder="Ví dụ: nữ 25-44, chủ spa, người mới học AI..."
              value={industryProfile?.target_customer ?? ""}
              onChange={(event) => updateIndustryProfile({ target_customer: event.target.value })}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Ghi chú tối ưu</span>
            <Input
              placeholder="Điểm cần nhớ khi tối ưu account này"
              value={industryProfile?.notes ?? ""}
              onChange={(event) => updateIndustryProfile({ notes: event.target.value })}
            />
          </label>
        </div>

        <div className="mt-6 rounded-xl bg-surface-container-low p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="font-extrabold">Benchmark ngành</h4>
              <p className="mt-1 text-sm text-on-surface-variant">
                Dữ liệu được gom ẩn danh từ các campaign đã đồng bộ thuộc cùng ngành. Khi mẫu còn ít, app chỉ dùng để tham khảo, chưa tự quyết định thay khách.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void loadIndustryLearning(industryProfile?.industry_key ?? "unknown", true)} disabled={Boolean(busyLabel) || !industryProfile?.industry_key || industryProfile.industry_key === "unknown"}>
                <MaterialIcon name="refresh" />
                Tải benchmark
              </Button>
              <Button onClick={() => void rebuildIndustryLearning()} disabled={Boolean(busyLabel) || !industryProfile?.industry_key || industryProfile.industry_key === "unknown"}>
                <MaterialIcon name="psychology" />
                Học từ dữ liệu đã sync
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            {industryLearning.length ? (
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs font-bold uppercase text-outline">
                  <tr>
                    <th className="px-3 py-2">Mục tiêu</th>
                    <th className="px-3 py-2">Mẫu</th>
                    <th className="px-3 py-2">CTR giữa</th>
                    <th className="px-3 py-2">CPC giữa</th>
                    <th className="px-3 py-2">CPM giữa</th>
                    <th className="px-3 py-2">CPL giữa</th>
                    <th className="px-3 py-2">Cost/message</th>
                  </tr>
                </thead>
                <tbody>
                  {industryLearning.map((row) => (
                    <tr key={row.id} className="border-t border-outline-variant">
                      <td className="px-3 py-3 font-bold">{row.objective}</td>
                      <td className="px-3 py-3">{row.sample_size}</td>
                      <td className="px-3 py-3">{formatNumber(row.median_ctr, "%")}</td>
                      <td className="px-3 py-3">{formatMoney(row.median_cpc)}</td>
                      <td className="px-3 py-3">{formatMoney(row.median_cpm)}</td>
                      <td className="px-3 py-3">{formatMoney(row.median_cpl)}</td>
                      <td className="px-3 py-3">{formatMoney(row.median_cost_per_message)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="rounded-lg bg-white p-4 text-sm text-on-surface-variant">
                Chưa có benchmark cho ngành này. Hãy đồng bộ dữ liệu Meta, lưu hồ sơ ngành, rồi bấm “Học từ dữ liệu đã sync”.
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-outline">Ủy quyền tối ưu</p>
              <h3 className="mt-2 text-xl font-extrabold">{enabled ? "Đã bật có kiểm soát" : "Đang tắt"}</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                App chỉ tạo khuyến nghị. Chỉ khi bật ủy quyền, app mới được chuẩn bị hành động theo giới hạn bạn chọn và vẫn ưu tiên duyệt thủ công.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${enabled ? "bg-emerald-50 text-emerald-700" : "bg-surface-container text-on-surface-variant"}`}>
              {enabled ? "ENABLED" : "DISABLED"}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {allowedActionOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3 text-sm font-semibold">
                <input type="checkbox" checked={authorization?.allowed_actions?.includes(option.value) ?? false} onChange={() => toggleAction(option.value)} />
                {option.label}
              </label>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-bold">Giới hạn đổi ngân sách (%)</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={authorization?.max_daily_budget_change_percent ?? 20}
                onChange={(event) => setAuthorization((item) => ({ ...(item as Authorization), max_daily_budget_change_percent: Number(event.target.value) }))}
              />
            </label>
            <label className="flex items-center gap-3 rounded-lg bg-surface-container-low p-4 text-sm font-bold">
              <input
                type="checkbox"
                checked={authorization?.require_manual_approval ?? true}
                onChange={(event) => setAuthorization((item) => ({ ...(item as Authorization), require_manual_approval: event.target.checked }))}
              />
              Luôn cần duyệt thủ công
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void saveAuthorization({ status: "enabled" })} disabled={Boolean(busyLabel) || !selectedAccountId}>
              Bật ủy quyền
            </Button>
            <Button variant="secondary" onClick={() => void saveAuthorization({ status: "disabled" })} disabled={Boolean(busyLabel) || !selectedAccountId}>
              Tắt ủy quyền
            </Button>
          </div>
        </Card>

        <Card className="rounded-xl p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-outline">Bộ não tối ưu</p>
              <h3 className="mt-2 text-xl font-extrabold">Việc nên làm hôm nay</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Dựa trên dữ liệu đã đồng bộ của {selectedAccount?.name || "tài khoản đang chọn"}. Khuyến nghị đang ở trạng thái nháp, chưa tự chỉnh Meta.
              </p>
            </div>
            <Button variant="ai" onClick={() => void generateRecommendations()} disabled={Boolean(busyLabel) || !selectedAccountId}>
              <MaterialIcon filled name="auto_awesome" />
              Tạo khuyến nghị
            </Button>
          </div>

          {lastSync ? (
            <div className="mt-4 grid gap-3 rounded-lg bg-primary-fixed/20 p-4 text-sm sm:grid-cols-3">
              <Info label="Account" value={String(lastSync.account_count)} />
              <Info label="Campaign đã lưu" value={String(lastSync.campaign_count)} />
              <Info label="Creative/Ads đã lưu" value={String(lastSync.ad_count)} />
            </div>
          ) : null}

          <TodayPlanSummary
            enabled={enabled}
            nextStep={todayPlan.nextStep}
            highPriority={todayPlan.highPriority}
            waitingReview={todayPlan.waitingReview}
            readyToApply={todayPlan.readyToApply}
            riskLogs={todayPlan.riskLogs}
            topRecommendation={todayPlan.topRecommendation}
          />

          <div className="mt-5 space-y-3">
            {recommendations.length ? recommendations.map((item) => {
              const readiness = getApplyReadiness(item, authorization);
              return (
                <div key={item.id} className="rounded-lg border border-outline-variant bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${priorityClass(item.priority)}`}>{item.priority.toUpperCase()}</span>
                        <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-bold text-on-surface-variant">{item.recommendation_type}</span>
                        <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-bold text-on-surface-variant">{item.status}</span>
                      </div>
                      <h4 className="mt-3 text-base font-extrabold">{item.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-on-surface-variant">{item.reason}</p>
                      {item.expected_impact ? <p className="mt-2 text-sm font-semibold text-primary">{item.expected_impact}</p> : null}
                      <p className="mt-2 text-xs text-outline">{item.entity_name || item.entity_id}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {item.status === "draft" ? (
                        <>
                          <Button variant="secondary" onClick={() => void updateRecommendationStatus(item.id, "rejected")} disabled={Boolean(busyLabel)}>
                            Từ chối
                          </Button>
                          <Button onClick={() => void updateRecommendationStatus(item.id, "approved")} disabled={Boolean(busyLabel)}>
                            Duyệt
                          </Button>
                        </>
                      ) : null}
                      {item.status === "approved" ? (
                        <Button onClick={() => void applyRecommendation(item.id)} disabled={Boolean(busyLabel) || !readiness.canClickApply} title={readiness.canClickApply ? "Áp dụng trong phạm vi đã ủy quyền." : "Cần hoàn tất các điều kiện an toàn trước khi áp dụng."}>
                          Áp dụng
                        </Button>
                      ) : null}
                      {item.status === "rejected" ? (
                        <Button variant="secondary" onClick={() => void updateRecommendationStatus(item.id, "draft")} disabled={Boolean(busyLabel)}>
                          Mở lại
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <ApplyReadinessPanel readiness={readiness} />
                </div>
              );
            }) : (
              <div className="rounded-lg bg-surface-container-low p-6 text-sm text-on-surface-variant">
                Chưa có khuyến nghị. Hãy bấm `Đồng bộ dữ liệu`, sau đó bấm `Tạo khuyến nghị`.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="rounded-xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-outline">Lịch sử tối ưu</p>
            <h3 className="mt-2 text-xl font-extrabold">Mọi hành động đều được ghi lại</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Khu vực này giúp chủ doanh nghiệp biết app đã chặn, đã ghi nhận hay đã áp dụng tối ưu nào. Không có hành động tự động nào bị ẩn.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadActionLogs(selectedAccountId, true)} disabled={Boolean(busyLabel) || !selectedAccountId}>
            <MaterialIcon name="refresh" />
            Tải lịch sử
          </Button>
        </div>

        <div className="mt-5 overflow-x-auto">
          {actionLogs.length ? (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-container-low text-xs font-bold uppercase text-outline">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Hành động</th>
                  <th className="px-4 py-3">Đối tượng</th>
                  <th className="px-4 py-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {actionLogs.map((item) => (
                  <tr key={item.id} className="border-t border-outline-variant">
                    <td className="px-4 py-3 font-semibold">{formatDateTime(item.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${actionStatusClass(item.status)}`}>
                        {actionStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{item.action_type}</td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      <div className="font-semibold text-on-surface">{item.entity_type}</div>
                      <div className="max-w-[240px] truncate text-xs">{item.entity_id}</div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{item.error_message || "Đã ghi nhận trong phạm vi ủy quyền."}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="rounded-lg bg-surface-container-low p-6 text-sm text-on-surface-variant">
              Chưa có lịch sử tối ưu cho tài khoản này. Khi bạn duyệt và áp dụng khuyến nghị, app sẽ ghi rõ kết quả ở đây.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-outline">{label}</p>
      <p className="mt-1 text-lg font-extrabold">{value}</p>
    </div>
  );
}

function TodayPlanSummary({
  enabled,
  nextStep,
  highPriority,
  waitingReview,
  readyToApply,
  riskLogs,
  topRecommendation
}: {
  enabled: boolean;
  nextStep: string;
  highPriority: number;
  waitingReview: number;
  readyToApply: number;
  riskLogs: number;
  topRecommendation?: Recommendation;
}) {
  return (
    <div className="mt-5 rounded-xl border border-primary/20 bg-primary-fixed/20 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Ưu tiên hôm nay</p>
          <h4 className="mt-1 text-lg font-extrabold">{nextStep}</h4>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            App chỉ tự chỉnh khi khuyến nghị đã được duyệt và tài khoản đã bật ủy quyền. Nếu chưa đủ điều kiện, hành động sẽ bị chặn và ghi vào lịch sử.
          </p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${enabled ? "bg-emerald-50 text-emerald-700" : "bg-white text-on-surface-variant"}`}>
          {enabled ? "Đã bật ủy quyền" : "Chưa bật ủy quyền"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Info label="Ưu tiên cao" value={String(highPriority)} />
        <Info label="Chờ duyệt" value={String(waitingReview)} />
        <Info label="Sẵn sàng áp dụng" value={String(readyToApply)} />
        <Info label="Bị chặn/lỗi" value={String(riskLogs)} />
      </div>

      {topRecommendation ? (
        <div className="mt-4 rounded-lg bg-white p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${priorityClass(topRecommendation.priority)}`}>{topRecommendation.priority.toUpperCase()}</span>
            <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-bold text-on-surface-variant">{topRecommendation.status}</span>
          </div>
          <p className="mt-3 font-extrabold">{topRecommendation.title}</p>
          <p className="mt-1 leading-6 text-on-surface-variant">{topRecommendation.reason}</p>
        </div>
      ) : null}
    </div>
  );
}

function ApplyReadinessPanel({
  readiness
}: {
  readiness: ReturnType<typeof getApplyReadiness>;
}) {
  return (
    <div className="mt-4 rounded-lg bg-surface-container-low p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-outline">Kiểm tra trước khi áp dụng</p>
        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${readiness.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
          {readiness.ok ? "Đủ điều kiện" : "Cần kiểm tra"}
        </span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {readiness.checks.map((check) => {
          const toneClass = check.ok
            ? "text-emerald-700"
            : check.tone === "warn"
              ? "text-amber-700"
              : "text-error";
          return (
            <div key={check.label} className="flex gap-2 text-sm">
              <MaterialIcon className={toneClass} name={check.ok ? "check_circle" : check.tone === "warn" ? "info" : "warning"} />
              <span className="text-on-surface-variant">{check.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
