"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { getCachedJson } from "@/lib/meta/client-cache";
import {
  applyDefaultAdAccount,
  applyDefaultPage,
  getDefaultAdAccountId,
  getDefaultPageId,
  setDefaultAdAccountId,
  setDefaultPageId
} from "@/lib/meta/default-account";
import type { DailyInsight, MetaIntelligenceDashboardData, NormalizedCampaignPerformance } from "@/lib/meta/types";

type View = "overview" | "campaigns" | "campaign-detail" | "posts" | "composer" | "reports" | "settings";
type ApiState<T> = { data: T | null; loading: boolean; error: string };
type AdAccountSummary = { id: string; account_id?: string; name?: string; currency?: string; account_status?: number };
type PageSummary = { id: string; name: string; category?: string; has_access_token?: boolean };
type CommunityUserSummary = {
  total: number;
  paidUsers: number;
  pendingUsers: number;
  leadOnlyUsers: number;
  paidRevenue: number;
  products: string[];
};
type CommunityUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: "order" | "lead" | "order+lead";
  status: "paid" | "pending" | "lead";
  paidOrderCount: number;
  pendingOrderCount: number;
  leadCount: number;
  paidRevenue: number;
  products: string[];
  lastSeenAt: string;
};
type CommunityUsersPayload = {
  users: CommunityUserRow[];
  summary: CommunityUserSummary;
  status: { ok: boolean; message?: string; source: string };
};
type CampaignTreeData = {
  campaign?: { id: string; name: string; status?: string; objective?: string; daily_budget?: string };
  adsets?: Array<{ id: string; name: string; status?: string }>;
  ads_by_adset?: Record<string, Array<{ id: string; name?: string; status?: string }>>;
};
type ChartMetric = "spend" | "messages" | "purchases" | "registrations" | "clicks" | "impressions" | "reach" | "cpc" | "ctr";
type ChartStyle = "line" | "bar" | "area";

const PAGE_SIZE = 12;

function todayIso(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return dateToIso(date);
}

function dateToIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function quickDateRange(value: string) {
  const now = new Date();
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  if (value === "today") return { startDate: dateToIso(today), endDate: dateToIso(today) };
  if (value === "yesterday") return { startDate: dateToIso(yesterday), endDate: dateToIso(yesterday) };
  if (value === "last_7d") return { startDate: dateToIso(sevenDaysAgo), endDate: dateToIso(today) };
  if (value === "this_month") return { startDate: dateToIso(monthStart), endDate: dateToIso(today) };
  if (value === "last_month") return { startDate: dateToIso(lastMonthStart), endDate: dateToIso(lastMonthEnd) };
  return null;
}

function money(value: number, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0, style: "currency", currency }).format(value || 0);
}

function number(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value || 0);
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email || "-";
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone || "-";
  return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
}

function percent(value: number) {
  return `${(value || 0).toFixed(2)}%`;
}

const messageActionTypes = new Set([
  "onsite_conversion.messaging_conversation_started_7d",
  "messaging_conversation_started_7d",
  "onsite_conversion.messaging_first_reply",
  "onsite_conversion.total_messaging_connection"
]);

const purchaseActionTypes = new Set([
  "purchase",
  "omni_purchase",
  "onsite_conversion.purchase",
  "offsite_conversion.fb_pixel_purchase"
]);

const registrationActionTypes = new Set([
  "complete_registration",
  "omni_complete_registration",
  "onsite_conversion.complete_registration",
  "offsite_conversion.fb_pixel_complete_registration"
]);

const chartMetricLabels: Record<ChartMetric, string> = {
  spend: "So sánh chi tiêu theo ngày",
  messages: "So sánh tin nhắn theo ngày",
  purchases: "So sánh lượt mua theo ngày",
  registrations: "So sánh lượt hoàn tất đăng ký theo ngày",
  clicks: "So sánh lượt click theo ngày",
  impressions: "So sánh hiển thị theo ngày",
  reach: "So sánh tiếp cận theo ngày",
  cpc: "So sánh CPC theo ngày",
  ctr: "So sánh CTR theo ngày"
};

function dailyActionTotal(row: DailyInsight, actionTypes: Set<string>) {
  return (row.actions ?? []).reduce((sum, action) => {
    if (!actionTypes.has(action.action_type)) return sum;
    return sum + Number(action.value ?? 0);
  }, 0);
}

function dailyMetricValue(row: DailyInsight, metric: ChartMetric) {
  if (metric === "spend") return Number(row.spend ?? 0);
  if (metric === "messages") return dailyActionTotal(row, messageActionTypes);
  if (metric === "purchases") return dailyActionTotal(row, purchaseActionTypes);
  if (metric === "registrations") return dailyActionTotal(row, registrationActionTypes);
  if (metric === "clicks") return Number(row.clicks ?? 0);
  if (metric === "impressions") return Number(row.impressions ?? 0);
  if (metric === "reach") return Number(row.reach ?? 0);
  if (metric === "cpc") return Number(row.cpc ?? 0);
  return Number(row.ctr ?? 0);
}

function formatMetricValue(value: number, metric: ChartMetric, currency: string) {
  if (metric === "spend" || metric === "cpc") return money(value, currency);
  if (metric === "ctr") return percent(value);
  return number(value);
}

function compactMoney(value: number) {
  const abs = Math.abs(value || 0);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(".", ",")} tỷ đ`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")} tr đ`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}k đ`;
  return `${number(value)} đ`;
}

function dayLabel(date?: string) {
  if (!date) return "--";
  const [, month, day] = date.split("-");
  return month && day ? `${day}/${month}` : date;
}

function shortName(value: string, length = 34) {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1)}…`;
}

function groupCampaignKind(campaign: NormalizedCampaignPerformance) {
  const source = `${campaign.objective || ""} ${campaign.campaignName || ""}`.toLowerCase();
  if (source.includes("message") || source.includes("tin nhắn") || campaign.messages > 0) return "Tin nhắn";
  if (source.includes("purchase") || source.includes("sales") || campaign.purchases > 0) return "Mua hàng";
  if (source.includes("lead") || source.includes("registration") || campaign.leads > 0) return "Đăng ký/Lead";
  if (source.includes("engagement") || source.includes("tương tác")) return "Tương tác";
  if (source.includes("follow") || source.includes("like")) return "Follow/Page";
  return campaign.objective || "Campaign khác";
}

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || payload?.message || "Cannot load AdPilot data.");
  return payload as T;
}

function readCachedJson<T>(url: string, options: { force?: boolean } = {}) {
  return getCachedJson<T>(url, { force: options.force, ttlMs: 1000 * 60 * 30 });
}

function useIntelligence() {
  const [state, setState] = useState<ApiState<MetaIntelligenceDashboardData>>({ data: null, loading: true, error: "" });
  const [range, setRange] = useState({ startDate: todayIso(-30), endDate: todayIso(0) });
  const [accountId, setAccountId] = useState(() => getDefaultAdAccountId());

  async function load(nextAccountId = accountId || getDefaultAdAccountId(), options: { force?: boolean; markLoading?: boolean; range?: { startDate: string; endDate: string } } = {}) {
    if (options.markLoading !== false) setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const effectiveRange = options.range ?? range;
      const params = new URLSearchParams({ start_date: effectiveRange.startDate, end_date: effectiveRange.endDate });
      if (nextAccountId) params.set("ad_account_id", nextAccountId);
      const payload = await readCachedJson<{ data: MetaIntelligenceDashboardData }>(`/api/meta/intelligence?${params.toString()}`, { force: options.force });
      const picked = applyDefaultAdAccount(payload.data.accounts, nextAccountId || payload.data.selectedAccount?.id || "");
      setAccountId(picked);
      setState({ data: payload.data, loading: false, error: "" });
    } catch (error) {
      setState({ data: null, loading: false, error: error instanceof Error ? error.message : "Cannot load AdPilot data." });
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load(accountId || getDefaultAdAccountId(), { markLoading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, range, setRange, accountId, reload: load };
}

export function AdPilotConsole({ view, campaignId }: { view: View; campaignId?: string }) {
  const intelligence = useIntelligence();

  if (view === "settings") return <ConnectionsView />;
  if (view === "posts" || view === "composer") return <DeprecatedPostWorkflowView />;
  if (view === "reports") return <ReportsView intelligence={intelligence} />;
  if (view === "campaign-detail") return <CampaignDetailView campaignId={campaignId} intelligence={intelligence} />;
  if (view === "campaigns") return <CampaignsView intelligence={intelligence} />;
  return <OverviewView intelligence={intelligence} />;
}

function DeprecatedPostWorkflowView() {
  return (
    <div>
      <PageHeader title="Post Ranking" subtitle="Organic scheduling and publishing workflows were removed. Use the paid post ranking screen instead." />
      <Panel className="p-5">
        <p className="text-[13px] text-[#475467]">AdPilot now keeps this area focused on paid post intelligence: score, compare and analyze ads creatives without creating or publishing Page posts.</p>
        <Link className="mt-4 inline-flex rounded-[6px] bg-primary px-4 py-2 text-[12px] font-semibold text-white" href="/ads-facebook/posts">Open post ranking</Link>
      </Panel>
    </div>
  );
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-[20px] font-semibold leading-7 text-[#111827]">{title}</h1>
        <p className="mt-1 text-[12px] text-[#6b7280]">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-[8px] border border-[#dbe1ee] bg-white ${className}`}>{children}</section>;
}

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-[8px] border border-red-200 bg-red-50 p-3 text-[12px] font-semibold text-red-800">
      <div className="flex items-start gap-2">
        <MaterialIcon className="mt-0.5 text-[16px]" name="warning" />
        <span>{message}</span>
      </div>
    </div>
  );
}

function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <Panel className="grid min-h-60 place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid size-10 place-items-center rounded-[8px] bg-[#eef2ff] text-primary">
          <MaterialIcon name="info" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-[#111827]">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-[12px] leading-5 text-[#6b7280]">{message}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </Panel>
  );
}

function LoadingProgress({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#e0e7ff]" role="progressbar" aria-label="Đang tải dữ liệu Meta">
      <div className="h-full w-1/2 rounded-full bg-primary [animation:adpilot-progress_1.1s_ease-in-out_infinite]" />
    </div>
  );
}

function MetaControls({ intelligence }: { intelligence: ReturnType<typeof useIntelligence> }) {
  const account = intelligence.data?.selectedAccount;
  function applyQuickRange(value: string) {
    const next = quickDateRange(value);
    if (!next) return;
    intelligence.setRange(next);
    void intelligence.reload(intelligence.accountId, { force: true, range: next });
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
      <div className="inline-flex min-h-8 items-center gap-2 rounded-[6px] border border-[#dbe1ee] bg-white px-3 text-[#374151]">
        <MaterialIcon className="text-[14px] text-primary" name="hub" />
        {account?.name || "Client Switcher"}
      </div>
      <select className="h-8 rounded-[6px] border border-[#dbe1ee] bg-white px-2 text-[12px] font-semibold text-[#374151]" defaultValue="" onChange={(event) => applyQuickRange(event.target.value)}>
        <option value="" disabled>Chọn nhanh</option>
        <option value="today">Hôm nay</option>
        <option value="yesterday">Hôm qua</option>
        <option value="last_7d">7 ngày trước</option>
        <option value="this_month">Tháng này</option>
        <option value="last_month">Tháng trước</option>
      </select>
      <input className="h-8 rounded-[6px] border border-[#dbe1ee] bg-white px-2 text-[12px]" type="date" value={intelligence.range.startDate} onChange={(event) => intelligence.setRange((current) => ({ ...current, startDate: event.target.value }))} />
      <span className="text-[#9ca3af]">-</span>
      <input className="h-8 rounded-[6px] border border-[#dbe1ee] bg-white px-2 text-[12px]" type="date" value={intelligence.range.endDate} onChange={(event) => intelligence.setRange((current) => ({ ...current, endDate: event.target.value }))} />
      <span className="inline-flex min-h-8 items-center gap-1 rounded-[6px] border border-emerald-200 bg-emerald-50 px-2 font-semibold text-emerald-700">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Meta Health: Good
      </span>
      <button className="inline-flex min-h-8 items-center gap-1 rounded-[6px] border border-[#dbe1ee] bg-white px-3 font-semibold text-[#374151] disabled:opacity-60" disabled={intelligence.loading} onClick={() => void intelligence.reload(intelligence.accountId, { force: true })} type="button">
        <MaterialIcon className="text-[14px]" name="refresh" />
        {intelligence.loading ? "Đang tải" : "Refresh"}
      </button>
    </div>
  );
}

function MetricTile({ label, value, delta, tone = "neutral" }: { label: string; value: string; delta?: string; tone?: "neutral" | "good" | "bad" }) {
  const toneClass = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-[#6b7280]";
  return (
    <Panel className="min-h-[74px] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="text-[18px] font-semibold leading-none tabular-nums text-[#111827]">{value}</div>
        {delta ? <div className={`text-[11px] font-semibold ${toneClass}`}>{delta}</div> : null}
      </div>
      <div className="mt-2 h-5 rounded-sm bg-[linear-gradient(120deg,#ddd6fe,#4f46e5)] opacity-70" />
    </Panel>
  );
}

function OverviewView({ intelligence }: { intelligence: ReturnType<typeof useIntelligence> }) {
  const [chartMetric, setChartMetric] = useState<ChartMetric>("spend");
  const [chartStyle, setChartStyle] = useState<ChartStyle>("line");
  const data = intelligence.data;
  const summary = data?.report?.summary;
  const currency = data?.selectedAccount?.currency || "VND";
  const campaigns = data?.report?.campaigns ?? [];
  const daily = data?.report?.daily ?? [];

  return (
    <div>
      <MetaControls intelligence={intelligence} />
      <LoadingProgress active={intelligence.loading} />
      <PageHeader title="Overview Dashboard" subtitle="Performance snapshot, conversion tracking and operational events." />
      <ErrorBanner message={intelligence.error} />
      {intelligence.loading ? <SkeletonGrid /> : null}
      {!intelligence.loading && !data ? <EmptyState title="No Meta data loaded" message="Connect Facebook or choose the working account in Settings." action={<ReconnectButton />} /> : null}
      {data ? (
        <div className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            <MetricTile label="Spend" value={money(summary?.spend ?? 0, currency)} delta="+8.4%" tone="good" />
            <MetricTile label="Impressions" value={number(summary?.impressions ?? 0)} delta="-5.1%" tone="neutral" />
            <MetricTile label="Clicks" value={number(summary?.clicks ?? 0)} delta="+2.1%" tone="bad" />
            <MetricTile label="CTR" value={percent(summary?.averageCtr ?? 0)} delta="stable" />
            <MetricTile label="CPC" value={money(summary?.averageCpc ?? 0, currency)} delta="-0.3" tone="good" />
            <MetricTile label="Conversions" value={number(summary?.totalResults ?? 0)} delta="+0.6" tone="good" />
          </div>
          <div className="grid gap-3 xl:grid-cols-[1fr_320px]">
            <Panel className="p-4">
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#111827]">Performance Overview</h2>
                  <p className="text-[11px] text-[#6b7280]">{chartMetricLabels[chartMetric]}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select className="h-8 rounded-[6px] border border-[#dbe1ee] bg-white px-2 text-[12px] font-semibold text-[#374151]" value={chartMetric} onChange={(event) => setChartMetric(event.target.value as ChartMetric)}>
                    {Object.entries(chartMetricLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <select className="h-8 rounded-[6px] border border-[#dbe1ee] bg-white px-2 text-[12px] font-semibold text-[#374151]" value={chartStyle} onChange={(event) => setChartStyle(event.target.value as ChartStyle)}>
                    <option value="line">Line chart</option>
                    <option value="bar">Bar chart</option>
                    <option value="area">Area chart</option>
                  </select>
                </div>
              </div>
              <ComparisonChart currency={currency} metric={chartMetric} rows={daily} style={chartStyle} />
            </Panel>
            <ActionCenter insights={data.intelligence ?? []} />
          </div>
          <OperationalLog campaigns={campaigns} />
        </div>
      ) : null}
    </div>
  );
}

function ComparisonChart({ rows, metric, style, currency }: { rows: DailyInsight[]; metric: ChartMetric; style: ChartStyle; currency: string }) {
  const chartRows = rows.map((row) => ({
    date: row.date_start || row.date_stop,
    label: (row.date_start || row.date_stop || "").slice(5) || "--",
    value: dailyMetricValue(row, metric)
  }));

  if (!chartRows.length) {
    return (
      <div className="grid min-h-[270px] place-items-center rounded-[6px] border border-[#eef2f7] bg-[#fbfcff] p-6 text-center">
        <div>
          <div className="mx-auto grid size-9 place-items-center rounded-[8px] bg-[#eef2ff] text-primary">
            <MaterialIcon className="text-[18px]" name="monitoring" />
          </div>
          <p className="mt-3 text-sm font-semibold text-[#111827]">Chưa có dữ liệu theo ngày</p>
          <p className="mt-1 text-[12px] text-[#6b7280]">Chọn tài khoản quảng cáo hoặc bấm Refresh để tải insight từ Meta.</p>
        </div>
      </div>
    );
  }

  const max = Math.max(...chartRows.map((row) => row.value), 1);
  const total = chartRows.reduce((sum, row) => sum + row.value, 0);
  const average = total / Math.max(chartRows.length, 1);
  const peak = chartRows.reduce((best, row) => (row.value > best.value ? row : best), chartRows[0]);
  const points = chartRows.map((row, index) => {
    const x = (index / Math.max(1, chartRows.length - 1)) * 100;
    const y = 100 - (row.value / max) * 76 - 10;
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = `0,100 ${points} 100,100`;
  const latestRows = chartRows.slice(-10);

  return (
    <div className="rounded-[6px] border border-[#eef2f7] bg-[#fbfcff] p-3">
      <div className="mb-3 grid gap-2 text-[11px] sm:grid-cols-3">
        <div className="rounded-[6px] border border-[#e5e7eb] bg-white p-2">
          <div className="font-semibold uppercase text-[#6b7280]">Tổng</div>
          <div className="mt-1 text-[14px] font-semibold tabular-nums text-[#111827]">{formatMetricValue(total, metric, currency)}</div>
        </div>
        <div className="rounded-[6px] border border-[#e5e7eb] bg-white p-2">
          <div className="font-semibold uppercase text-[#6b7280]">Trung bình/ngày</div>
          <div className="mt-1 text-[14px] font-semibold tabular-nums text-[#111827]">{formatMetricValue(average, metric, currency)}</div>
        </div>
        <div className="rounded-[6px] border border-[#e5e7eb] bg-white p-2">
          <div className="font-semibold uppercase text-[#6b7280]">Ngày cao nhất</div>
          <div className="mt-1 text-[14px] font-semibold tabular-nums text-[#111827]">{peak.label} · {formatMetricValue(peak.value, metric, currency)}</div>
        </div>
      </div>
      <div className="h-[250px] rounded-[6px] border border-[#eef2f7] bg-white p-3">
        {style === "bar" ? (
          <div className="flex h-full items-end gap-1 overflow-hidden">
            {chartRows.map((row) => (
              <div key={row.date} className="flex h-full min-w-5 flex-1 flex-col justify-end gap-2">
                <div className="group relative flex flex-1 items-end">
                  <div className="w-full rounded-t-[4px] bg-primary/80 transition-colors group-hover:bg-primary" style={{ height: `${(row.value / max) * 100}%` }} />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-[#111827] px-2 py-1 text-[10px] font-semibold text-white group-hover:block">
                    {formatMetricValue(row.value, metric, currency)}
                  </div>
                </div>
                <div className="truncate text-center text-[10px] text-[#6b7280]">{row.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
            {[20, 40, 60, 80].map((y) => <line key={y} stroke="#e5e7eb" strokeWidth="1" vectorEffect="non-scaling-stroke" x1="0" x2="100" y1={y} y2={y} />)}
            {style === "area" ? <polygon fill="#e0e7ff" opacity="0.75" points={areaPoints} /> : null}
            <polyline fill="none" points={points} stroke="#4f46e5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-[11px]">
          <thead className="text-[#6b7280]">
            <tr>
              <th className="border-b border-[#e5e7eb] px-2 py-2 font-semibold">Ngày</th>
              <th className="border-b border-[#e5e7eb] px-2 py-2 font-semibold">Chỉ số</th>
              <th className="border-b border-[#e5e7eb] px-2 py-2 font-semibold">So với TB</th>
            </tr>
          </thead>
          <tbody>
            {latestRows.map((row) => {
              const diff = row.value - average;
              const diffLabel = average > 0 ? `${diff >= 0 ? "+" : ""}${percent((diff / average) * 100)}` : "N/A";
              return (
                <tr key={row.date} className="border-b border-[#f1f5f9] last:border-b-0">
                  <td className="px-2 py-2 font-semibold text-[#374151]">{row.date}</td>
                  <td className="px-2 py-2 tabular-nums text-[#111827]">{formatMetricValue(row.value, metric, currency)}</td>
                  <td className={`px-2 py-2 font-semibold tabular-nums ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>{diffLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsView({ intelligence }: { intelligence: ReturnType<typeof useIntelligence> }) {
  const data = intelligence.data;
  const summary = data?.report?.summary;
  const currency = data?.selectedAccount?.currency || "VND";
  const campaigns = data?.report?.campaigns ?? [];
  const daily = data?.report?.daily ?? [];
  const campaignMessages = campaigns.reduce((sum, campaign) => sum + campaign.messages, 0);
  const campaignPurchases = campaigns.reduce((sum, campaign) => sum + campaign.purchases, 0);
  const dailyMessages = daily.reduce((sum, row) => sum + dailyMetricValue(row, "messages"), 0);
  const dailyPurchases = daily.reduce((sum, row) => sum + dailyMetricValue(row, "purchases"), 0);
  const registrations = daily.reduce((sum, row) => sum + dailyMetricValue(row, "registrations"), 0);
  const messages = dailyMessages || campaignMessages;
  const purchases = dailyPurchases || campaignPurchases;
  const salesCampaigns = campaigns.filter((campaign) => campaign.messages > 0 || campaign.purchases > 0 || campaign.leads > 0 || /sales|purchase|message|lead/i.test(`${campaign.objective} ${campaign.campaignName}`));
  const salesSpend = (salesCampaigns.length ? salesCampaigns : campaigns).reduce((sum, campaign) => sum + campaign.spend, 0);
  const cplMessage = messages > 0 ? salesSpend / messages : 0;
  const bestCampaign = [...campaigns].sort((a, b) => b.messages - a.messages)[0];
  const bestDay = [...daily].sort((a, b) => dailyMetricValue(b, "messages") - dailyMetricValue(a, "messages"))[0];

  return (
    <div>
      <MetaControls intelligence={intelligence} />
      <LoadingProgress active={intelligence.loading} />
      <PageHeader
        title="Performance Ads Report"
        subtitle="Báo cáo đã chuẩn hóa theo dữ liệu Meta live: chi tiêu, tin nhắn, lượt mua, đăng ký, CPL và hiệu suất theo ngày/campaign."
        actions={<span className="rounded-full border border-[#d6e4ef] bg-[#e8f0f7] px-3 py-2 text-[12px] font-bold text-[#2f617a]">Dữ liệu live · {dayLabel(intelligence.range.startDate)} - {dayLabel(intelligence.range.endDate)}</span>}
      />
      <ErrorBanner message={intelligence.error} />
      {intelligence.loading ? <SkeletonGrid /> : null}
      {!intelligence.loading && !data ? <EmptyState title="Chưa có dữ liệu báo cáo" message="Kết nối Meta hoặc chọn tài khoản quảng cáo trong Settings để tải báo cáo." action={<ReconnectButton />} /> : null}
      {data ? (
        <div className="grid gap-4">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <ReportKpi label="Tổng chi tiêu" value={compactMoney(summary?.spend ?? 0)} hint="Tổng spend từ Meta trong kỳ" />
            <ReportKpi label="Chi tạo tin nhắn" value={compactMoney(salesSpend)} hint="Campaign có message/lead/purchase" />
            <ReportKpi label="Tin nhắn" value={number(messages)} hint="Tổng action tin nhắn" />
            <ReportKpi label="Lượt mua Meta" value={number(purchases)} hint="Purchase action từ Meta" />
            <ReportKpi label="Hoàn tất đăng ký" value={number(registrations)} hint="Complete registration" />
            <ReportKpi label="CPL tin nhắn" value={cplMessage ? compactMoney(cplMessage) : "N/A"} hint="Chi tạo tin nhắn / tin nhắn" />
          </section>

          <section className="grid gap-3 xl:grid-cols-4">
            <ReportNote title="Đối chiếu tổng" body={`${money(summary?.spend ?? 0, currency)} từ report Meta hiện tại.`} tone="good" />
            <ReportNote title="Không dùng dữ liệu giả" body="Chỉ số không có trong Meta sẽ để 0/N/A, không tự bịa doanh thu, ROAS hoặc AOV." />
            <ReportNote title="Campaign tạo tin nhắn tốt nhất" body={bestCampaign ? `${bestCampaign.campaignName} · ${number(bestCampaign.messages)} tin nhắn.` : "Chưa có campaign có tin nhắn."} />
            <ReportNote title="Ngày mạnh nhất" body={bestDay ? `${dayLabel(bestDay.date_start)} · ${number(dailyMetricValue(bestDay, "messages"))} tin nhắn.` : "Chưa có daily action tin nhắn."} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <ReportPanel title="Diễn biến chi tiêu & tin nhắn theo ngày" subtitle="Đường xanh là tổng chi tiêu. Đường cam là tin nhắn theo ngày.">
              <ReportDailyTrend rows={daily} currency={currency} />
            </ReportPanel>
            <ReportPanel title="So sánh theo tuần" subtitle="So sánh ngân sách và tin nhắn để thấy tuần nào tạo lead hiệu quả hơn.">
              <ReportWeeklyBars rows={buildWeeklyReport(daily)} currency={currency} />
            </ReportPanel>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <ReportPanel title="Chi tiêu theo campaign" subtitle="Nhóm campaign có spend lớn nhất trong kỳ.">
              <ReportHorizontalBars rows={campaigns.slice(0, 8).map((campaign) => ({ label: campaign.campaignName, value: campaign.spend, display: compactMoney(campaign.spend) }))} color="#3f6680" />
            </ReportPanel>
            <ReportPanel title="Tin nhắn theo campaign" subtitle="So sánh volume tin nhắn của từng campaign.">
              <ReportHorizontalBars rows={[...campaigns].sort((a, b) => b.messages - a.messages).slice(0, 8).map((campaign) => ({ label: campaign.campaignName, value: campaign.messages, display: number(campaign.messages) }))} color="#b66424" />
            </ReportPanel>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <ReportPanel title="Cơ cấu ngân sách theo nhóm campaign" subtitle="Tự nhóm theo objective/tên campaign để đọc ngân sách nhanh.">
              <ReportBudgetMix campaigns={campaigns} currency={currency} />
            </ReportPanel>
            <ReportPanel title="CPL tin nhắn theo campaign" subtitle="Chỉ so sánh campaign có phát sinh tin nhắn. Càng thấp càng tốt.">
              <ReportHorizontalBars rows={campaigns.filter((campaign) => campaign.messages > 0).map((campaign) => ({ label: campaign.campaignName, value: campaign.spend / campaign.messages, display: compactMoney(campaign.spend / campaign.messages) })).sort((a, b) => a.value - b.value).slice(0, 8)} color="#7c98a5" />
            </ReportPanel>
          </section>

          <ReportDailyTable rows={daily} currency={currency} />
          <ReportCampaignTable campaigns={campaigns} currency={currency} />
        </div>
      ) : null}
    </div>
  );
}

function ReportKpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <section className="min-h-[126px] rounded-[16px] border border-[#e1e7ef] bg-white p-5 shadow-[0_14px_30px_rgba(17,24,39,0.06)]">
      <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[#7b8495]">{label}</div>
      <div className="mt-3 text-[28px] font-black leading-none tracking-tight text-[#0f172a]">{value}</div>
      <p className="mt-3 text-[12px] leading-5 text-[#697386]">{hint}</p>
    </section>
  );
}

function ReportNote({ title, body, tone = "neutral" }: { title: string; body: string; tone?: "neutral" | "good" }) {
  return (
    <section className="rounded-[16px] border border-[#e1e7ef] bg-white p-4 text-[13px] leading-5 text-[#455468] shadow-[0_10px_24px_rgba(17,24,39,0.05)]">
      <b className="mb-1 block text-[14px] text-[#111827]">{title}</b>
      <span className={tone === "good" ? "font-bold text-emerald-700" : ""}>{body}</span>
    </section>
  );
}

function ReportPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-[16px] border border-[#e1e7ef] bg-white p-5 shadow-[0_14px_30px_rgba(17,24,39,0.06)]">
      <h2 className="text-[15px] font-black uppercase tracking-wide text-[#0f172a]">{title}</h2>
      <p className="mt-2 text-[12px] leading-5 text-[#6b7280]">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ReportDailyTrend({ rows, currency }: { rows: DailyInsight[]; currency: string }) {
  const data = rows.map((row) => ({ label: dayLabel(row.date_start), spend: Number(row.spend ?? 0), messages: dailyMetricValue(row, "messages") }));
  if (!data.length) return <ReportEmpty message="Không có dữ liệu daily insight trong kỳ này." />;
  const spendMax = Math.max(...data.map((row) => row.spend), 1);
  const messageMax = Math.max(...data.map((row) => row.messages), 1);
  const spendPoints = data.map((row, index) => `${(index / Math.max(1, data.length - 1)) * 100},${100 - (row.spend / spendMax) * 78 - 8}`).join(" ");
  const messagePoints = data.map((row, index) => `${(index / Math.max(1, data.length - 1)) * 100},${100 - (row.messages / messageMax) * 78 - 8}`).join(" ");
  return (
    <div>
      <div className="mb-3 flex justify-center gap-4 text-[12px] text-[#667085]">
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-[#3f6680]" /> Tổng chi tiêu</span>
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-[#b66424]" /> Tin nhắn</span>
      </div>
      <div className="h-[330px] rounded-[10px] border border-[#e5eaf0] bg-[#fbfdff] p-3">
        <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
          {[20, 40, 60, 80].map((y) => <line key={y} stroke="#e6edf4" strokeWidth="1" vectorEffect="non-scaling-stroke" x1="0" x2="100" y1={y} y2={y} />)}
          <polygon fill="rgba(47,97,122,0.12)" points={`0,100 ${spendPoints} 100,100`} />
          <polyline fill="none" points={spendPoints} stroke="#3f6680" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" vectorEffect="non-scaling-stroke" />
          <polyline fill="none" points={messagePoints} stroke="#b66424" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-[#667085]">
        <span>{data[0]?.label}</span>
        <span>{money(spendMax, currency)} · {number(messageMax)} tin nhắn</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

type WeeklyReportRow = { label: string; spend: number; messages: number };

function buildWeeklyReport(rows: DailyInsight[]): WeeklyReportRow[] {
  const groups: WeeklyReportRow[] = [];
  for (let index = 0; index < rows.length; index += 7) {
    const slice = rows.slice(index, index + 7);
    if (!slice.length) continue;
    groups.push({
      label: `${dayLabel(slice[0]?.date_start)}-${dayLabel(slice[slice.length - 1]?.date_start)}`,
      spend: slice.reduce((sum, row) => sum + Number(row.spend ?? 0), 0),
      messages: slice.reduce((sum, row) => sum + dailyMetricValue(row, "messages"), 0)
    });
  }
  return groups;
}

function ReportWeeklyBars({ rows, currency }: { rows: WeeklyReportRow[]; currency: string }) {
  if (!rows.length) return <ReportEmpty message="Không có dữ liệu tuần trong kỳ này." />;
  const spendMax = Math.max(...rows.map((row) => row.spend), 1);
  const messageMax = Math.max(...rows.map((row) => row.messages), 1);
  return (
    <div>
      <div className="mb-3 flex justify-center gap-4 text-[12px] text-[#667085]"><span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-[#3f6680]" /> Chi tiêu</span><span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-[#b66424]" /> Tin nhắn</span></div>
      <div className="flex h-[310px] items-end gap-4 border-b border-[#dfe6ee] px-3">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-1 flex-col items-center justify-end gap-2">
            <div className="flex h-[260px] items-end gap-1.5">
              <div className="w-7 rounded-t-[6px] bg-[#3f6680]" title={compactMoney(row.spend)} style={{ height: `${(row.spend / spendMax) * 100}%` }} />
              <div className="w-7 rounded-t-[6px] bg-[#b66424]" title={`${number(row.messages)} tin nhắn`} style={{ height: `${(row.messages / messageMax) * 100}%` }} />
            </div>
            <div className="text-center text-[11px] text-[#667085]">{row.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-center text-[10px] text-[#667085]">Đỉnh chi tiêu tuần: {money(spendMax, currency)} · Đỉnh tin nhắn tuần: {number(messageMax)}</div>
    </div>
  );
}

function ReportHorizontalBars({ rows, color }: { rows: Array<{ label: string; value: number; display: string }>; color: string }) {
  if (!rows.length) return <ReportEmpty message="Không có dữ liệu cho biểu đồ này." />;
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[180px_1fr_70px] items-center gap-3 text-[12px]">
          <div className="truncate text-right text-[#667085]" title={row.label}>{shortName(row.label, 28)}</div>
          <div className="h-9 rounded-r-[6px] bg-[#f1f5f9]"><div className="h-9 rounded-r-[6px]" style={{ width: `${(row.value / max) * 100}%`, background: color }} /></div>
          <div className="text-right tabular-nums text-[#334155]">{row.display}</div>
        </div>
      ))}
    </div>
  );
}

function ReportBudgetMix({ campaigns, currency }: { campaigns: NormalizedCampaignPerformance[]; currency: string }) {
  const grouped = campaigns.reduce<Record<string, number>>((acc, campaign) => {
    const key = groupCampaignKind(campaign);
    acc[key] = (acc[key] ?? 0) + campaign.spend;
    return acc;
  }, {});
  const rows = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return <ReportEmpty message="Không có dữ liệu ngân sách campaign." />;
  const total = rows.reduce((sum, [, value]) => sum + value, 0);
  const palette = ["#b66424", "#3f6680", "#7c98a5", "#9aa7b4", "#d3a15f", "#5f7f95"];
  const gradient = rows.map(([, value], index) => {
    const start = rows.slice(0, index).reduce((sum, [, previous]) => sum + (previous / Math.max(total, 1)) * 100, 0);
    const end = start + (value / Math.max(total, 1)) * 100;
    return `${palette[index % palette.length]} ${start}% ${end}%`;
  }).join(", ");
  return (
    <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-center">
      <div className="mx-auto size-52 rounded-full" style={{ background: `conic-gradient(${gradient})` }}><div className="m-auto mt-12 grid size-28 place-items-center rounded-full bg-white text-center text-[12px] font-bold text-[#334155]">{money(total, currency)}</div></div>
      <div className="grid gap-2">
        {rows.map(([label, value], index) => <div key={label} className="flex items-center justify-between gap-3 text-[12px]"><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: palette[index % palette.length] }} />{label}</span><b>{compactMoney(value)}</b></div>)}
      </div>
    </div>
  );
}

function ReportDailyTable({ rows, currency }: { rows: DailyInsight[]; currency: string }) {
  return (
    <section className="overflow-hidden rounded-[16px] border border-[#e1e7ef] bg-white p-5 shadow-[0_14px_30px_rgba(17,24,39,0.06)]">
      <h2 className="text-[15px] font-black uppercase tracking-wide">Bảng 1 · Tổng hợp theo ngày</h2>
      <p className="mt-2 text-[12px] text-[#6b7280]">Dùng cho line chart và báo cáo ngày.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-[12px]">
          <thead className="bg-[#f7f9fc] text-[11px] uppercase tracking-wide text-[#6b7280]">
            <tr>{["Ngày", "Tổng chi tiêu", "Tin nhắn", "Lượt mua", "Hoàn tất đăng ký", "Click", "CPL tin nhắn"].map((head) => <th key={head} className="px-3 py-3 font-black">{head}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const messages = dailyMetricValue(row, "messages");
              const spend = Number(row.spend ?? 0);
              return (
                <tr key={row.date_start} className="border-b border-[#edf1f5] last:border-b-0">
                  <td className="px-3 py-3 font-bold">{dayLabel(row.date_start)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(spend, currency)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{number(messages)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{number(dailyMetricValue(row, "purchases"))}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{number(dailyMetricValue(row, "registrations"))}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{number(Number(row.clicks ?? 0))}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{messages > 0 ? money(spend / messages, currency) : "-"}</td>
                </tr>
              );
            })}
            {!rows.length ? <tr><td className="px-3 py-8 text-center text-[#6b7280]" colSpan={7}>Không có dữ liệu ngày.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReportCampaignTable({ campaigns, currency }: { campaigns: NormalizedCampaignPerformance[]; currency: string }) {
  return (
    <section className="overflow-hidden rounded-[16px] border border-[#e1e7ef] bg-white p-5 shadow-[0_14px_30px_rgba(17,24,39,0.06)]">
      <h2 className="text-[15px] font-black uppercase tracking-wide">Bảng 2 · Tổng hợp theo campaign</h2>
      <p className="mt-2 text-[12px] text-[#6b7280]">Thay cho bảng sản phẩm khi Meta chỉ trả dữ liệu campaign.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[940px] text-left text-[12px]">
          <thead className="bg-[#f7f9fc] text-[11px] uppercase tracking-wide text-[#6b7280]">
            <tr>{["Campaign", "Nhóm", "Chi tiêu", "Tin nhắn", "Lượt mua", "Lead", "CPL tin nhắn", "CPA mua"].map((head) => <th key={head} className="px-3 py-3 font-black">{head}</th>)}</tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.campaignId} className="border-b border-[#edf1f5] last:border-b-0">
                <td className="max-w-[320px] px-3 py-3 font-bold text-[#0f172a]">{campaign.campaignName}</td>
                <td className="px-3 py-3">{groupCampaignKind(campaign)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{money(campaign.spend, currency)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{number(campaign.messages)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{number(campaign.purchases)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{number(campaign.leads)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{campaign.messages > 0 ? money(campaign.spend / campaign.messages, currency) : "-"}</td>
                <td className="px-3 py-3 text-right tabular-nums">{campaign.purchases > 0 ? money(campaign.spend / campaign.purchases, currency) : "-"}</td>
              </tr>
            ))}
            {!campaigns.length ? <tr><td className="px-3 py-8 text-center text-[#6b7280]" colSpan={8}>Không có dữ liệu campaign.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReportEmpty({ message }: { message: string }) {
  return <div className="grid min-h-40 place-items-center rounded-[10px] border border-dashed border-[#d6e4ef] bg-[#fbfdff] p-6 text-center text-[12px] text-[#6b7280]">{message}</div>;
}

function ActionCenter({ insights }: { insights: Array<{ title: string; reason: string; type: string }> }) {
  const rows = insights.length ? insights.slice(0, 4) : [
    { title: "API Sync Failure", reason: "Older report rows need a new refresh.", type: "warning" },
    { title: "Token Expired", reason: "Reconnect Facebook if Page metrics stop loading.", type: "warning" },
    { title: "Low ROAS Alert", reason: "Review campaigns below target.", type: "check" }
  ];
  return (
    <Panel className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#111827]">Action Center</h2>
        <span className="rounded-[4px] bg-red-600 px-2 py-0.5 text-[9px] font-bold uppercase text-white">Urgent</span>
      </div>
      <div className="grid gap-2">
        {rows.map((item, index) => (
          <div key={`${item.title}-${index}`} className={`rounded-[6px] border-l-4 p-3 ${index === 0 ? "border-red-600 bg-red-50" : index === 1 ? "border-amber-600 bg-amber-50" : "border-emerald-600 bg-emerald-50"}`}>
            <p className="text-[12px] font-semibold text-[#111827]">{item.title}</p>
            <p className="mt-1 text-[11px] leading-4 text-[#6b7280]">{item.reason}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function OperationalLog({ campaigns }: { campaigns: NormalizedCampaignPerformance[] }) {
  const rows = campaigns.slice(0, 4);
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3">
        <h2 className="text-sm font-semibold">Operational Audit Log</h2>
        <Link className="text-[11px] font-semibold text-primary" href="/ads-facebook/campaigns">View full log</Link>
      </div>
      <table className="w-full min-w-[760px] text-left text-[12px]">
        <thead className="bg-[#f8fafc] text-[10px] uppercase tracking-wide text-[#6b7280]">
          <tr>
            {["Operator", "Event", "Entity", "Time", "Status"].map((head) => <th key={head} className="px-4 py-2 font-semibold">{head}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eef2f7]">
          {(rows.length ? rows : []).map((campaign, index) => (
            <tr key={campaign.campaignId}>
              <td className="px-4 py-3 font-semibold">AdPilot Bot</td>
              <td className="px-4 py-3">Loaded campaign metrics</td>
              <td className="px-4 py-3 text-primary">{campaign.campaignName}</td>
              <td className="px-4 py-3 text-[#6b7280]">{index + 1}m ago</td>
              <td className="px-4 py-3"><StatusPill status={campaign.status || "SYNCED"} /></td>
            </tr>
          ))}
          {!rows.length ? <tr><td className="px-4 py-6 text-[#6b7280]" colSpan={5}>No operational events loaded yet.</td></tr> : null}
        </tbody>
      </table>
    </Panel>
  );
}

function CampaignsView({ intelligence }: { intelligence: ReturnType<typeof useIntelligence> }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const campaigns = useMemo(() => intelligence.data?.report?.campaigns ?? [], [intelligence.data]);
  const currency = intelligence.data?.selectedAccount?.currency || "VND";
  const rows = campaigns.filter((campaign) => {
    const q = query.trim().toLowerCase();
    if (status !== "ALL" && (campaign.status || "UNKNOWN") !== status) return false;
    return !q || campaign.campaignName.toLowerCase().includes(q);
  }).slice(0, PAGE_SIZE);

  return (
    <div>
      <MetaControls intelligence={intelligence} />
      <PageHeader title="Campaigns" subtitle="Monitor delivery, budget, objective and sync state." actions={<button className="rounded-[6px] bg-primary px-4 py-2 text-[12px] font-semibold text-white" type="button">+ New Campaign</button>} />
      <ErrorBanner message={intelligence.error} />
      <Panel className="mb-2 p-3">
        <div className="grid gap-2 md:grid-cols-[1fr_180px_160px_auto]">
          <input className="h-9 rounded-[6px] border border-[#dbe1ee] px-3 text-[12px]" placeholder="Search campaigns..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="h-9 rounded-[6px] border border-[#dbe1ee] px-3 text-[12px]" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">Status: All Active</option>
            {Array.from(new Set(campaigns.map((item) => item.status || "UNKNOWN"))).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="h-9 rounded-[6px] border border-[#dbe1ee] px-3 text-[12px]">
            <option>Objective: All</option>
          </select>
          <button className="h-9 rounded-[6px] border border-[#dbe1ee] bg-white px-3 text-[12px] font-semibold" type="button">More</button>
        </div>
      </Panel>
      <div className="mb-2 rounded-[6px] bg-red-600 px-3 py-2 text-[12px] font-semibold text-white">
        Missing ads_v2 read permission. Some campaigns may be restricted.
      </div>
      {intelligence.loading ? <SkeletonGrid /> : <CampaignTable campaigns={rows} currency={currency} />}
    </div>
  );
}

function CampaignDetailView({ campaignId, intelligence }: { campaignId?: string; intelligence: ReturnType<typeof useIntelligence> }) {
  const [tree, setTree] = useState<ApiState<CampaignTreeData>>({ data: null, loading: false, error: "" });
  const accountId = intelligence.accountId || intelligence.data?.selectedAccount?.id || "";
  const campaign = intelligence.data?.report?.campaigns.find((item) => item.campaignId === campaignId);
  const currency = intelligence.data?.selectedAccount?.currency || "VND";
  const adsets = tree.data?.adsets ?? [];

  useEffect(() => {
    if (!campaignId || !accountId) return;
    queueMicrotask(() => setTree({ data: null, loading: true, error: "" }));
    readJson<{ data: CampaignTreeData }>(`/api/meta/campaign-tree?ad_account_id=${encodeURIComponent(accountId)}&campaign_id=${encodeURIComponent(campaignId)}`)
      .then((payload) => setTree({ data: payload.data, loading: false, error: "" }))
      .catch((error) => setTree({ data: null, loading: false, error: error instanceof Error ? error.message : "Cannot load campaign detail." }));
  }, [accountId, campaignId]);

  return (
    <div>
      <MetaControls intelligence={intelligence} />
      <PageHeader
        title={campaign?.campaignName || tree.data?.campaign?.name || "Campaign"}
        subtitle={`${campaign?.status || "Active"} - ${campaignId || "No campaign id"}`}
        actions={<><button className="rounded-[6px] border border-[#dbe1ee] bg-white px-3 py-2 text-[12px] font-semibold" type="button">Pause</button><button className="rounded-[6px] bg-primary px-3 py-2 text-[12px] font-semibold text-white" type="button">Edit</button></>}
      />
      <ErrorBanner message={intelligence.error || tree.error} />
      {campaign ? (
        <>
          <div className="mb-3 rounded-[8px] border border-[#c7d2fe] bg-[#eef2ff] px-4 py-3">
            <div className="grid gap-3 text-[11px] md:grid-cols-4">
              <MiniStat label="Objective" value={campaign.objective || "No data"} />
              <MiniStat label="Daily budget" value={money(campaign.spend / 30, currency)} />
              <MiniStat label="Last synced" value="14 mins ago" />
              <MiniStat label="Schedule" value="Jan 1 - Today" />
            </div>
          </div>
          <div className="mb-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            <MetricTile label="Impressions" value={number(campaign.impressions)} delta="+12%" tone="good" />
            <MetricTile label="Total spend" value={money(campaign.spend, currency)} />
            <MetricTile label="Avg. CPM" value={money(campaign.cpm, currency)} delta="-3.1%" tone="bad" />
            <MetricTile label="CTR" value={percent(campaign.ctr)} />
            <MetricTile label="LP views" value={number(campaign.clicks)} delta="+8.7%" tone="good" />
            <MetricTile label="Results" value={number(campaign.results)} />
          </div>
          <Tabs labels={["Overview", `Ad Sets (${adsets.length})`, "Ads", "Insights", "Log"]} />
          <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_320px]">
            <Panel className="p-4">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Performance over time</h2><span className="rounded-[4px] border border-[#dbe1ee] px-2 py-1 text-[10px]">Impressions vs. Spend</span></div>
              <BarChart rows={[campaign.impressions, campaign.reach, campaign.clicks, campaign.results, campaign.leads, campaign.messages]} />
            </Panel>
            <div className="grid gap-3">
              <Panel className="p-4">
                <h2 className="mb-3 text-sm font-semibold">Operational insights</h2>
                <InsightBox title="Efficiency delay" text={`CTR is ${percent(campaign.ctr)}. Review creative and placement mix.`} tone="amber" />
                <InsightBox title="Fatigue warning" text={`Frequency is ${campaign.frequency.toFixed(2)}. Refresh copy if it rises.`} tone="red" />
              </Panel>
              <Panel className="p-4">
                <h2 className="mb-3 text-sm font-semibold">Placement mix</h2>
                <HorizontalMetricBar label="Feed" value={campaign.impressions} max={Math.max(campaign.impressions, campaign.reach, 1)} display="64%" />
                <div className="mt-3"><HorizontalMetricBar label="Stories" value={campaign.reach} max={Math.max(campaign.impressions, campaign.reach, 1)} display="28%" /></div>
              </Panel>
            </div>
          </div>
          <Panel className="mt-3 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3"><h2 className="text-sm font-semibold">Top performing ad sets</h2><button className="text-[11px] font-semibold text-primary" type="button">Export CSV</button></div>
            <table className="w-full text-left text-[12px]">
              <tbody>
                {adsets.slice(0, 5).map((adset) => <tr key={adset.id} className="border-b border-[#eef2f7]"><td className="px-4 py-3 font-semibold">{adset.name}</td><td className="px-4 py-3"><StatusPill status={adset.status || "RUNNING"} /></td><td className="px-4 py-3 text-right">{adset.id}</td></tr>)}
                {!adsets.length ? <tr><td className="px-4 py-6 text-[#6b7280]">No ad set data loaded.</td></tr> : null}
              </tbody>
            </table>
          </Panel>
        </>
      ) : <EmptyState title="Campaign not loaded" message="Choose a campaign from the campaign table after Meta data loads." />}
    </div>
  );
}

function ConnectionsView() {
  const [accounts, setAccounts] = useState<ApiState<AdAccountSummary[]>>({ data: null, loading: true, error: "" });
  const [pages, setPages] = useState<ApiState<PageSummary[]>>({ data: null, loading: true, error: "" });
  const [communityUsers, setCommunityUsers] = useState<ApiState<CommunityUsersPayload>>({ data: null, loading: true, error: "" });
  const [selectedAccountId, setSelectedAccountId] = useState(() => getDefaultAdAccountId());
  const [selectedPageId, setSelectedPageId] = useState(() => getDefaultPageId());
  const [notice, setNotice] = useState("");

  async function loadConnections(options: { force?: boolean } = {}) {
    setNotice("");
    setAccounts((current) => ({ ...current, loading: true, error: "" }));
    setPages((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [accountPayload, pagePayload] = await Promise.all([
        readCachedJson<{ data: AdAccountSummary[] }>("/api/meta/adaccounts", { force: options.force }),
        readCachedJson<{ data: PageSummary[] }>("/api/meta/pages", { force: options.force })
      ]);
      const pickedAccount = applyDefaultAdAccount(accountPayload.data, selectedAccountId);
      const pickedPage = applyDefaultPage(pagePayload.data, selectedPageId);
      setSelectedAccountId(pickedAccount);
      setSelectedPageId(pickedPage);
      setAccounts({ data: accountPayload.data, loading: false, error: "" });
      setPages({ data: pagePayload.data, loading: false, error: "" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cannot load connections.";
      setAccounts((current) => ({ data: current.data ?? [], loading: false, error: message }));
      setPages((current) => ({ data: current.data ?? [], loading: false, error: message }));
    }
  }

  async function loadCommunityUsers() {
    setCommunityUsers((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await fetch("/api/admin/community-users", { cache: "no-store" });
      if (response.status === 403) {
        setCommunityUsers({ data: null, loading: false, error: "" });
        return;
      }
      const payload = (await response.json().catch(() => ({}))) as { data?: CommunityUsersPayload; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "Cannot load community users.");
      setCommunityUsers({ data: payload.data, loading: false, error: "" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cannot load community users.";
      setCommunityUsers({ data: null, loading: false, error: message });
    }
  }

  useEffect(() => {
    queueMicrotask(() => void loadConnections());
    queueMicrotask(() => void loadCommunityUsers());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveSelection() {
    setDefaultAdAccountId(selectedAccountId);
    setDefaultPageId(selectedPageId);
    setNotice("Selection saved. AdPilot will reuse this account and Page without reloading lists on every screen.");
  }

  return (
    <div>
      <MetaHealthHeader />
      <PageHeader title="Connections & Meta API" subtitle="Manage your Meta Business integrations, granted permissions and linked advertising assets." />
      <ErrorBanner message={accounts.error || pages.error} />
      {notice ? <div className="mb-3 rounded-[8px] border border-emerald-200 bg-emerald-50 p-3 text-[12px] font-semibold text-emerald-800">{notice}</div> : null}
      <Panel className="mb-3 p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-[8px] bg-[#ecfeff] text-primary"><MaterialIcon name="hub" /></div><div><h2 className="text-sm font-semibold">Meta Business Suite</h2><p className="text-[12px] text-[#6b7280]">Global Ad Account integration</p></div></div>
          <div className="grid gap-2"><button className="rounded-[6px] bg-primary px-4 py-2 text-[12px] font-semibold text-white" disabled={accounts.loading || pages.loading} onClick={() => void loadConnections({ force: true })} type="button">Reconnect & Refresh</button><a className="rounded-[6px] border border-[#dbe1ee] bg-white px-4 py-2 text-center text-[12px] font-semibold" href="/api/auth/facebook/start?force=1">Meta Dev Console</a></div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2"><MiniStat label="Account status" value="Connected" /><MiniStat label="Last data sync" value="Today" /></div>
      </Panel>
      <div className="grid gap-3 xl:grid-cols-[360px_1fr]">
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">API permissions</h2><span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">Granted</span></div>
          {["ads_management", "read_insights", "pages_manage_ads", "business_management"].map((permission) => <PermissionRow key={permission} label={permission} />)}
        </Panel>
        <div className="grid gap-3">
          <Panel className="p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Connected ad accounts</h2><button className="text-[11px] font-semibold text-primary" type="button">Add new account</button></div>
            <select className="mb-3 h-10 w-full rounded-[6px] border border-[#dbe1ee] px-3 text-[12px]" disabled={accounts.loading} value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>{(accounts.data ?? []).map((account) => <option key={account.id} value={account.id}>{account.name || account.id}</option>)}{!accounts.data?.length ? <option>No ad account loaded</option> : null}</select>
            <button className="rounded-[6px] bg-primary px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60" disabled={accounts.loading || pages.loading || (!selectedAccountId && !selectedPageId)} onClick={saveSelection} type="button">Save selection</button>
          </Panel>
          <Panel className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Facebook Pages</h2>
            <select className="h-10 w-full rounded-[6px] border border-[#dbe1ee] px-3 text-[12px]" disabled={pages.loading} value={selectedPageId} onChange={(event) => setSelectedPageId(event.target.value)}>{(pages.data ?? []).map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}{!pages.data?.length ? <option>No Page loaded</option> : null}</select>
            <div className="mt-3 grid gap-2">{(pages.data ?? []).slice(0, 4).map((page) => <div key={page.id} className="flex items-center justify-between rounded-[6px] border border-[#eef2f7] px-3 py-2 text-[12px]"><span>{page.name}</span><StatusPill status={page.has_access_token === false ? "MISSING_TOKEN" : "Active"} /></div>)}</div>
          </Panel>
        </div>
      </div>
      <CommunityUsersPanel state={communityUsers} onRefresh={() => void loadCommunityUsers()} />
      <div className="mt-3 rounded-[8px] border border-red-200 bg-red-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="text-sm font-semibold text-red-800">Danger Zone</h2><p className="mt-1 text-[12px] text-red-700">Disconnecting Meta will pause automated campaign data loading.</p></div><button className="rounded-[6px] border border-red-300 bg-white px-4 py-2 text-[12px] font-semibold text-red-700" type="button">Disconnect Meta Account</button></div>
      </div>
    </div>
  );
}

function CommunityUsersPanel({ state, onRefresh }: { state: ApiState<CommunityUsersPayload>; onRefresh: () => void }) {
  const summary = state.data?.summary;
  const rows = state.data?.users.slice(0, 8) ?? [];
  const canShow = Boolean(state.data) || state.loading || state.error;

  if (!canShow) return null;

  return (
    <Panel className="mt-3 overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-[#eef2f7] px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold">TheAnhMarketing community users</h2>
          <p className="mt-1 text-[12px] text-[#6b7280]">Read-only từ orders/leads website, không trộn vào Facebook permission users.</p>
        </div>
        <button className="rounded-[6px] border border-[#dbe1ee] bg-white px-3 py-2 text-[12px] font-semibold disabled:opacity-60" disabled={state.loading} onClick={onRefresh} type="button">
          {state.loading ? "Loading..." : "Refresh users"}
        </button>
      </div>

      {state.error ? <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800">{state.error}</div> : null}
      {state.data?.status.ok === false ? <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800">{state.data.status.message}</div> : null}

      <div className="grid gap-3 p-4 md:grid-cols-4">
        <MiniStat label="Website users" value={state.loading ? "..." : number(summary?.total ?? 0)} />
        <MiniStat label="Paid users" value={state.loading ? "..." : number(summary?.paidUsers ?? 0)} />
        <MiniStat label="Pending users" value={state.loading ? "..." : number(summary?.pendingUsers ?? 0)} />
        <MiniStat label="Lead only" value={state.loading ? "..." : number(summary?.leadOnlyUsers ?? 0)} />
      </div>

      <div className="overflow-x-auto border-t border-[#eef2f7]">
        <table className="w-full min-w-[760px] text-left text-[12px]">
          <thead className="bg-[#f8fafc] text-[10px] uppercase tracking-wide text-[#6b7280]">
            <tr>{["User", "Status", "Products", "Orders", "Revenue", "Last seen"].map((head) => <th key={head} className="px-4 py-2 font-semibold">{head}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[#eef2f7]">
            {rows.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-[#111827]">{user.name || "Chua co ten"}</p>
                  <p className="mt-1 text-[11px] text-[#6b7280]">{user.email ? maskEmail(user.email) : maskPhone(user.phone)}</p>
                </td>
                <td className="px-4 py-3"><StatusPill status={user.status} /></td>
                <td className="max-w-[240px] px-4 py-3 text-[#374151]">{user.products.slice(0, 2).join(", ") || "-"}</td>
                <td className="px-4 py-3 tabular-nums">{user.paidOrderCount} paid / {user.pendingOrderCount} pending / {user.leadCount} leads</td>
                <td className="px-4 py-3 tabular-nums">{money(user.paidRevenue, "VND")}</td>
                <td className="px-4 py-3 tabular-nums">{user.lastSeenAt ? user.lastSeenAt.slice(0, 10) : "-"}</td>
              </tr>
            ))}
            {!state.loading && rows.length === 0 ? <tr><td className="px-4 py-8 text-[#6b7280]" colSpan={6}>No website users loaded.</td></tr> : null}
            {state.loading ? <tr><td className="px-4 py-8 text-[#6b7280]" colSpan={6}>Loading community users...</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function MetaHealthHeader() {
  return <div className="mb-3 inline-flex min-h-8 items-center gap-1 rounded-[6px] border border-emerald-200 bg-emerald-50 px-2 text-[12px] font-semibold text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" /> Meta Health: Good</div>;
}

function PermissionRow({ label }: { label: string }) {
  return <div className="mb-2 flex items-center justify-between rounded-[6px] border border-[#e5e7eb] bg-white px-3 py-3 text-[12px]"><span className="font-semibold text-[#111827]">{label}</span><MaterialIcon className="text-[16px] text-emerald-600" name="check_circle" /></div>;
}

function CampaignTable({ campaigns, currency }: { campaigns: NormalizedCampaignPerformance[]; currency: string }) {
  return (
    <Panel className="overflow-hidden">
      <table className="w-full min-w-[980px] text-left text-[12px]">
        <thead className="bg-[#f8fafc] text-[10px] uppercase tracking-wide text-[#6b7280]">
          <tr>{["Campaign name", "Status", "Delivery", "Objective", "Budget", "Spend", "CTR", "CPC", "Conv.", "ROAS", "Sync"].map((head) => <th key={head} className="px-3 py-2 font-semibold">{head}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#eef2f7]">
          {campaigns.map((campaign) => (
            <tr key={campaign.campaignId} className="hover:bg-[#f8fafc]">
              <td className="max-w-[300px] px-3 py-3 font-semibold text-primary"><Link href={`/ads-facebook/campaigns/${campaign.campaignId}`}>{campaign.campaignName}</Link><p className="mt-1 text-[10px] font-normal text-[#6b7280]">{campaign.campaignId}</p></td>
              <td className="px-3 py-3"><StatusPill status={campaign.status || "UNKNOWN"} /></td>
              <td className="px-3 py-3">Live</td>
              <td className="px-3 py-3">{campaign.objective || "-"}</td>
              <td className="px-3 py-3">{money(campaign.spend / 30, currency)}</td>
              <td className="px-3 py-3 tabular-nums">{money(campaign.spend, currency)}</td>
              <td className="px-3 py-3 tabular-nums">{percent(campaign.ctr)}</td>
              <td className="px-3 py-3 tabular-nums">{money(campaign.cpc, currency)}</td>
              <td className="px-3 py-3 tabular-nums">{number(campaign.results)}</td>
              <td className="px-3 py-3 tabular-nums">{campaign.roas ? campaign.roas.toFixed(2) : "-"}</td>
              <td className="px-3 py-3 text-emerald-700">Synced</td>
            </tr>
          ))}
          {!campaigns.length ? <tr><td className="px-4 py-8 text-[#6b7280]" colSpan={11}>No campaigns loaded for this account and date range.</td></tr> : null}
        </tbody>
      </table>
    </Panel>
  );
}

function Tabs({ labels }: { labels: string[] }) {
  return <div className="flex border-b border-[#dbe1ee] bg-white">{labels.map((label, index) => <button key={label} className={`px-4 py-3 text-[11px] font-semibold ${index === 0 ? "border-b-2 border-primary text-primary" : "text-[#6b7280]"}`} type="button">{label}</button>)}</div>;
}

function InsightBox({ title, text, tone }: { title: string; text: string; tone: "amber" | "red" }) {
  return <div className={`mb-3 rounded-[6px] border-l-4 p-3 ${tone === "red" ? "border-red-600 bg-red-50" : "border-amber-500 bg-amber-50"}`}><p className="text-[12px] font-semibold text-[#111827]">{title}</p><p className="mt-1 text-[11px] leading-4 text-[#6b7280]">{text}</p></div>;
}

function BarChart({ rows }: { rows: number[] }) {
  const max = Math.max(...rows, 1);
  return <div className="flex h-56 items-end gap-3 rounded-[6px] bg-[#fbfcff] p-4">{rows.map((row, index) => <div key={index} className={`flex-1 rounded-t-[4px] ${index === 3 ? "bg-primary" : "bg-[#c7d2fe]"}`} style={{ height: `${Math.max(10, (row / max) * 190)}px` }} />)}</div>;
}

function HorizontalMetricBar({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  const width = max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 0;
  return <div><div className="mb-1 flex items-center justify-between text-[11px]"><span className="font-semibold text-[#374151]">{label}</span><span>{display}</span></div><div className="h-2 rounded-full bg-[#eef2ff]"><div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} /></div></div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="flex min-h-11 items-center justify-between gap-3 rounded-[6px] border border-[#e5e7eb] bg-[#f8fafc] px-3"><span className="text-[11px] text-[#6b7280]">{label}</span><span className="text-[12px] font-semibold tabular-nums text-[#111827]">{value}</span></div>;
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const tone = normalized.includes("ACTIVE") || normalized.includes("READY") || normalized.includes("RUNNING") || normalized.includes("SYNCED")
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : normalized.includes("PAUSED") || normalized.includes("DRAFT") || normalized.includes("QUEUED")
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-50 text-slate-700 border-slate-200";
  return <span className={`inline-flex rounded-[4px] border px-2 py-0.5 text-[10px] font-bold uppercase ${tone}`}>{status}</span>;
}

function SkeletonGrid() {
  return <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-[8px] bg-[#eef2f7]" />)}</div>;
}

function ReconnectButton() {
  return <a className="inline-flex rounded-[6px] bg-primary px-4 py-2 text-[12px] font-semibold text-white" href="/api/auth/facebook/start?force=1">Reconnect Facebook</a>;
}
