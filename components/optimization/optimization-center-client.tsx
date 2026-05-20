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
  status: string;
  created_at: string;
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

export function OptimizationCenterClient() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [range, setRange] = useState(defaultRange());
  const [authorization, setAuthorization] = useState<Authorization | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [busyLabel, setBusyLabel] = useState("");

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === selectedAccountId || item.account_id === selectedAccountId.replace(/^act_/, "")),
    [accounts, selectedAccountId]
  );
  const enabled = authorization?.status === "enabled";

  useEffect(() => {
    const cached = getCachedState<{
      accounts: AdAccount[];
      selectedAccountId: string;
      range: { startDate: string; endDate: string };
      authorization: Authorization | null;
      recommendations: Recommendation[];
      lastSync: SyncResult | null;
    }>(cacheKey);
    if (cached) {
      queueMicrotask(() => {
        setAccounts(cached.accounts);
        setSelectedAccountId(cached.selectedAccountId);
        setRange(cached.range);
        setAuthorization(cached.authorization);
        setRecommendations(cached.recommendations);
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
    setCachedState(cacheKey, { accounts, selectedAccountId, range, authorization, recommendations, lastSync });
  }, [accounts, selectedAccountId, range, authorization, recommendations, lastSync]);

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
        await Promise.all([loadAuthorization(accountId, true), loadRecommendations(accountId, true)]);
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

  async function loadRecommendations(accountId = selectedAccountId, force = false) {
    if (!accountId) return;
    const payload = await readJson<{ data: Recommendation[] }>(
      `/api/optimization/recommendations?ad_account_id=${encodeURIComponent(accountId)}`,
      { force }
    );
    setRecommendations(payload.data ?? []);
  }

  async function onAccountChange(accountId: string) {
    setSelectedAccountId(accountId);
    setDefaultAdAccountId(accountId);
    setRecommendations([]);
    setLastSync(null);
    await withProgress("Đang đổi tài khoản tối ưu...", async () => {
      await Promise.all([loadAuthorization(accountId, true), loadRecommendations(accountId, true)]);
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

          <div className="mt-5 space-y-3">
            {recommendations.length ? recommendations.map((item) => (
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
                  <Button disabled title={enabled ? "Bước tiếp theo sẽ thêm confirm và API apply an toàn." : "Cần bật ủy quyền trước khi áp dụng."}>
                    Áp dụng sau khi duyệt
                  </Button>
                </div>
              </div>
            )) : (
              <div className="rounded-lg bg-surface-container-low p-6 text-sm text-on-surface-variant">
                Chưa có khuyến nghị. Hãy bấm `Đồng bộ dữ liệu`, sau đó bấm `Tạo khuyến nghị`.
              </div>
            )}
          </div>
        </Card>
      </div>
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
