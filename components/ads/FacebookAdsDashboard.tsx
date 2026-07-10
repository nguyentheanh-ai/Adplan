"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { AdsActionCenter } from "@/components/ads/ActionCenter";
import { BreakdownTable } from "@/components/ads/BreakdownTable";
import { KpiCard } from "@/components/ads/KpiCard";
import { MetricSelector } from "@/components/ads/MetricSelector";
import { PerformanceChart, SpendLeadComboChart, WeeklyComparisonChart } from "@/components/ads/PerformanceChart";
import { buildAdsActionCenter } from "@/lib/ads/insights";
import type { AdsMetricKey, AdsAnalyticsModel, BudgetSlice, BreakdownRow } from "@/lib/ads/metrics";
import { buildAdsAnalytics, formatCompactMoney, formatMetric, formatNumber } from "@/lib/ads/metrics";
import { getCachedJson } from "@/lib/meta/client-cache";
import { applyDefaultAdAccount, getDefaultAdAccountId, setDefaultAdAccountId } from "@/lib/meta/default-account";
import type { MetaIntelligenceDashboardData } from "@/lib/meta/types";

type ApiState = {
  data: MetaIntelligenceDashboardData | null;
  loading: boolean;
  error: string;
};

type DateRange = {
  startDate: string;
  endDate: string;
};

function dateToIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function todayIso(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return dateToIso(date);
}

function quickRange(value: string): DateRange | null {
  const now = new Date();
  if (value === "today") return { startDate: todayIso(0), endDate: todayIso(0) };
  if (value === "7d") return { startDate: todayIso(-6), endDate: todayIso(0) };
  if (value === "30d") return { startDate: todayIso(-29), endDate: todayIso(0) };
  if (value === "month") return { startDate: dateToIso(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: todayIso(0) };
  if (value === "last_month") {
    return {
      startDate: dateToIso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      endDate: dateToIso(new Date(now.getFullYear(), now.getMonth(), 0))
    };
  }
  return null;
}

function LoadingProgress({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#e0e7ff]" role="progressbar" aria-label="Đang tải dữ liệu ads">
      <div className="h-full w-1/2 rounded-full bg-[#4f46e5] [animation:adpilot-progress_1.1s_ease-in-out_infinite]" />
    </div>
  );
}

export function FacebookAdsDashboard() {
  const [state, setState] = useState<ApiState>({ data: null, loading: true, error: "" });
  const [range, setRange] = useState<DateRange>({ startDate: todayIso(-29), endDate: todayIso(0) });
  const [accountId, setAccountId] = useState(() => getDefaultAdAccountId());
  const [metric, setMetric] = useState<AdsMetricKey>("spend");
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [breakdownTab, setBreakdownTab] = useState<"campaign" | "adset" | "ad" | "creative" | "day">("campaign");

  async function load(nextAccountId = accountId || getDefaultAdAccountId(), options: { force?: boolean; range?: DateRange; markLoading?: boolean } = {}) {
    if (options.markLoading !== false) setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const effectiveRange = options.range ?? range;
      const params = new URLSearchParams({ start_date: effectiveRange.startDate, end_date: effectiveRange.endDate });
      if (nextAccountId) params.set("ad_account_id", nextAccountId);
      const payload = await getCachedJson<{ data: MetaIntelligenceDashboardData }>(`/api/meta/intelligence?${params.toString()}`, { force: options.force, ttlMs: 1000 * 60 * 30 });
      const picked = applyDefaultAdAccount(payload.data.accounts, nextAccountId || payload.data.selectedAccount?.id || "");
      setAccountId(picked);
      if (picked) setDefaultAdAccountId(picked);
      setState({ data: payload.data, loading: false, error: "" });
    } catch (error) {
      setState({ data: null, loading: false, error: error instanceof Error ? error.message : "Không tải được dữ liệu Ads." });
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load(accountId || getDefaultAdAccountId(), { markLoading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const model = useMemo(() => buildAdsAnalytics(state.data, compareEnabled), [compareEnabled, state.data]);
  const actions = useMemo(() => buildAdsActionCenter(model), [model]);
  const breakdownRows = useMemo(() => {
    if (breakdownTab === "creative") return model.creatives;
    if (breakdownTab === "adset") return model.adsets;
    if (breakdownTab === "ad") return model.ads;
    if (breakdownTab === "day") {
      return model.daily.map<BreakdownRow>((row) => ({
        id: row.date,
        name: row.label,
        type: "campaign",
        status: "DAY",
        spend: row.spend,
        impressions: row.impressions,
        reach: row.reach,
        clicks: row.clicks,
        ctr: row.ctr,
        cpc: row.cpc,
        cpm: row.cpm,
        leads: row.leads,
        messages: row.messages,
        purchases: row.purchases,
        registrations: row.registrations,
        conversions: row.conversions,
        cpl: row.cpl,
        cpa: row.cpa,
        roas: row.roas,
        note: row.conversions > 0 ? "Ngày có conversion, đối chiếu creative và ngân sách." : "Chưa có conversion trong ngày này.",
        quality: row.conversions > 0 ? "good" : row.spend > 0 ? "bad" : "neutral"
      }));
    }
    return model.campaigns;
  }, [breakdownTab, model]);

  function applyQuick(value: string) {
    const next = quickRange(value);
    if (!next) return;
    setRange(next);
    void load(accountId, { force: true, range: next });
  }

  function changeAccount(nextAccountId: string) {
    setAccountId(nextAccountId);
    setDefaultAdAccountId(nextAccountId);
    void load(nextAccountId, { force: true });
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <HeaderFilters
        accountId={accountId}
        accounts={state.data?.accounts ?? []}
        compareEnabled={compareEnabled}
        loading={state.loading}
        onAccountChange={changeAccount}
        onCompareChange={setCompareEnabled}
        onQuickRange={applyQuick}
        onRefresh={() => void load(accountId, { force: true })}
        range={range}
        setRange={setRange}
      />
      <LoadingProgress active={state.loading} />
      <main className="grid gap-4">
        <div>
          <h1 className="text-[22px] font-black leading-7 text-[#0f172a]">Facebook Ads BI Dashboard</h1>
          <p className="mt-1 text-[12px] text-[#667085]">Phân tích theo ngày, campaign, creative và action center dựa trên dữ liệu Meta live.</p>
        </div>

        {state.error ? <div className="rounded-[8px] border border-red-200 bg-red-50 p-3 text-[12px] font-bold text-red-800">{state.error}</div> : null}
        {state.loading ? <DashboardSkeleton /> : null}
        {!state.loading && !state.data ? <EmptyDashboard /> : null}

        {state.data ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
              {model.kpis.map((kpi) => <KpiCard key={kpi.key} kpi={kpi} />)}
            </section>

            <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
              <div className="grid gap-4">
                <Panel
                  action={<MetricSelector onChange={setMetric} value={metric} />}
                  subtitle="Chọn một metric để đọc tổng kỳ, trung bình ngày và ngày tốt/xấu nhất."
                  title="Performance Overview"
                >
                  <PerformanceChart currency={model.currency} metric={metric} rows={model.daily} />
                </Panel>
                <section className="grid gap-4 xl:grid-cols-2">
                  <Panel subtitle="Không nhồi nhiều metric: chỉ so sánh ngân sách với lead/tin nhắn." title="Spend vs Leads theo ngày">
                    <SpendLeadComboChart currency={model.currency} rows={model.daily} />
                  </Panel>
                  <Panel subtitle="So sánh nhanh hiệu quả theo từng tuần trong range đang chọn." title="So sánh theo tuần">
                    <WeeklyComparisonChart rows={model.weekly} />
                  </Panel>
                </section>
              </div>
              <AdsActionCenter items={actions} />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <Panel subtitle="Campaign có CPL thấp hơn là nhóm nên xem xét scale." title="CPL theo campaign">
                <HorizontalBars color="#7c98a5" currency={model.currency} metric="cpl" rows={model.campaigns.filter((row) => row.cpl > 0).sort((a, b) => a.cpl - b.cpl).slice(0, 8)} />
              </Panel>
              <Panel subtitle="CTR cao thường phản ánh creative/hook tốt hơn." title="CTR theo campaign">
                <HorizontalBars color="#3f6680" currency={model.currency} metric="ctr" rows={[...model.campaigns].sort((a, b) => b.ctr - a.ctr).slice(0, 8)} />
              </Panel>
              <Panel subtitle="Tỷ trọng ngân sách theo trạng thái campaign hiện có." title="Budget distribution">
                <BudgetDistribution rows={model.budgetMix} />
              </Panel>
              <Panel subtitle="Creative/ad đứng đầu theo conversion và CTR." title="Top creative/ad theo kết quả">
                <TopList rows={model.topCreatives.length ? model.topCreatives : model.topCampaigns} currency={model.currency} />
              </Panel>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <Panel subtitle="Nhóm có spend cao nhưng conversion thấp cần kiểm tra." title="Bottom campaigns cần xem lại">
                <TopList rows={model.bottomCampaigns} currency={model.currency} mode="risk" />
              </Panel>
              <Panel subtitle="Tổng hợp nhóm thắng để quyết định tăng ngân sách hoặc nhân bản." title="Top campaigns nên giữ/scale">
                <TopList rows={model.topCampaigns} currency={model.currency} />
              </Panel>
            </section>

            <section className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {[
                  ["campaign", "Theo campaign"],
                  ["adset", "Theo ad set"],
                  ["ad", "Theo ad"],
                  ["creative", "Theo creative"],
                  ["day", "Theo ngày"]
                ].map(([key, label]) => (
                  <button key={key} className={`rounded-[6px] border px-3 py-2 text-[12px] font-bold ${breakdownTab === key ? "border-[#4f46e5] bg-[#eef2ff] text-[#4f46e5]" : "border-[#dce3ee] bg-white text-[#344054]"}`} onClick={() => setBreakdownTab(key as typeof breakdownTab)} type="button">
                    {label}
                  </button>
                ))}
              </div>
              <BreakdownTable currency={model.currency} rows={breakdownRows} title={`Breakdown · ${breakdownTab === "campaign" ? "Campaign" : breakdownTab === "adset" ? "Ad set" : breakdownTab === "ad" ? "Ad" : breakdownTab === "creative" ? "Creative" : "Ngày"}`} />
            </section>

            {state.data.creativeAccessWarning ? <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-[12px] font-bold text-amber-800">{state.data.creativeAccessWarning}</div> : null}
          </>
        ) : null}
      </main>
    </div>
  );
}

function HeaderFilters({
  accounts,
  accountId,
  range,
  setRange,
  loading,
  compareEnabled,
  onCompareChange,
  onAccountChange,
  onQuickRange,
  onRefresh
}: {
  accounts: Array<{ id: string; account_id?: string; name?: string }>;
  accountId: string;
  range: DateRange;
  setRange: (range: DateRange) => void;
  loading: boolean;
  compareEnabled: boolean;
  onCompareChange: (value: boolean) => void;
  onAccountChange: (value: string) => void;
  onQuickRange: (value: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 -mx-6 mb-4 border-b border-[#dce3ee] bg-[#f6f8fb]/95 px-6 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <select className="h-9 min-w-[180px] rounded-[6px] border border-[#dce3ee] bg-white px-3 font-bold text-[#344054]" value={accountId} onChange={(event) => onAccountChange(event.target.value)}>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.name || account.id}</option>)}
          {!accounts.length ? <option value="">Client Switcher</option> : null}
        </select>
        <select className="h-9 rounded-[6px] border border-[#dce3ee] bg-white px-3 font-bold text-[#344054]" defaultValue="" onChange={(event) => onQuickRange(event.target.value)}>
          <option value="" disabled>Chọn nhanh</option>
          <option value="today">Hôm nay</option>
          <option value="7d">7 ngày</option>
          <option value="30d">30 ngày</option>
          <option value="month">Tháng này</option>
          <option value="last_month">Tháng trước</option>
        </select>
        <input className="h-9 rounded-[6px] border border-[#dce3ee] bg-white px-3 font-bold text-[#344054]" type="date" value={range.startDate} onChange={(event) => setRange({ ...range, startDate: event.target.value })} />
        <span className="text-[#98a2b3]">-</span>
        <input className="h-9 rounded-[6px] border border-[#dce3ee] bg-white px-3 font-bold text-[#344054]" type="date" value={range.endDate} onChange={(event) => setRange({ ...range, endDate: event.target.value })} />
        <button className="inline-flex h-9 items-center gap-1 rounded-[6px] border border-[#dce3ee] bg-white px-3 font-bold text-[#344054] disabled:opacity-60" disabled={loading} onClick={onRefresh} type="button">
          <MaterialIcon className="text-[16px]" name="refresh" /> {loading ? "Đang tải" : "Refresh"}
        </button>
        <label className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#dce3ee] bg-white px-3 font-bold text-[#344054]">
          <input checked={compareEnabled} onChange={(event) => onCompareChange(event.target.checked)} type="checkbox" />
          So sánh kỳ trước
        </label>
        <span className="inline-flex h-9 items-center gap-1 rounded-[6px] border border-emerald-200 bg-emerald-50 px-3 font-bold text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" /> Meta Health: Good</span>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[8px] border border-[#dce3ee] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-[14px] font-black uppercase tracking-wide text-[#0f172a]">{title}</h2>
          <p className="mt-1 text-[12px] text-[#667085]">{subtitle}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function HorizontalBars({ rows, metric, currency, color }: { rows: BreakdownRow[]; metric: AdsMetricKey; currency: string; color: string }) {
  if (!rows.length) return <div className="grid min-h-48 place-items-center rounded-[8px] border border-dashed border-[#dce3ee] text-[12px] text-[#667085]">Không có dữ liệu.</div>;
  const max = Math.max(...rows.map((row) => Number(row[metric] ?? 0)), 1);
  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        const value = Number(row[metric] ?? 0);
        return (
          <div key={row.id} className="grid grid-cols-[160px_1fr_86px] items-center gap-3 text-[12px]">
            <div className="truncate text-right text-[#667085]" title={row.name}>{row.name}</div>
            <div className="h-8 rounded-r-[6px] bg-[#f1f5f9]"><div className="h-8 rounded-r-[6px]" style={{ background: color, width: `${(value / max) * 100}%` }} /></div>
            <div className="text-right tabular-nums text-[#344054]">{formatMetric(metric, value, currency)}</div>
          </div>
        );
      })}
    </div>
  );
}

function BudgetDistribution({ rows }: { rows: BudgetSlice[] }) {
  if (!rows.length) return <div className="grid min-h-48 place-items-center rounded-[8px] border border-dashed border-[#dce3ee] text-[12px] text-[#667085]">Không có dữ liệu ngân sách.</div>;
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const palette = ["#4f46e5", "#3f6680", "#b66424", "#7c98a5", "#9aa7b4"];
  const gradient = rows.map((row, index) => {
    const start = rows.slice(0, index).reduce((sum, prev) => sum + (prev.value / Math.max(total, 1)) * 100, 0);
    const end = start + (row.value / Math.max(total, 1)) * 100;
    return `${palette[index % palette.length]} ${start}% ${end}%`;
  }).join(", ");
  return (
    <div className="grid gap-5 md:grid-cols-[190px_1fr] md:items-center">
      <div className="mx-auto size-44 rounded-full p-10" style={{ background: `conic-gradient(${gradient})` }}><div className="grid h-full place-items-center rounded-full bg-white text-center text-[12px] font-black">{formatCompactMoney(total)}</div></div>
      <div className="grid gap-2">
        {rows.map((row, index) => <div key={row.label} className="flex items-center justify-between gap-3 text-[12px]"><span className="inline-flex min-w-0 items-center gap-2"><span className="size-2.5 shrink-0 rounded-full" style={{ background: palette[index % palette.length] }} /><span className="truncate">{row.label}</span></span><b>{formatCompactMoney(row.value)}</b></div>)}
      </div>
    </div>
  );
}

function TopList({ rows, currency, mode = "scale" }: { rows: BreakdownRow[]; currency: string; mode?: "scale" | "risk" }) {
  if (!rows.length) return <div className="grid min-h-48 place-items-center rounded-[8px] border border-dashed border-[#dce3ee] text-[12px] text-[#667085]">Không có dữ liệu.</div>;
  return (
    <div className="grid gap-2">
      {rows.map((row) => (
        <article key={row.id} className={`rounded-[7px] border p-3 ${mode === "risk" ? "border-red-100 bg-red-50/60" : "border-emerald-100 bg-emerald-50/60"}`}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[12px] font-black text-[#0f172a]">{row.name}</h3>
            <span className="whitespace-nowrap text-[11px] font-bold">{formatNumber(row.conversions)} conv.</span>
          </div>
          <p className="mt-1 text-[11px] text-[#667085]">Spend {formatMetric("spend", row.spend, currency)} · CTR {row.ctr.toFixed(2)}% · CPL {row.cpl ? formatMetric("cpl", row.cpl, currency) : "N/A"}</p>
        </article>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-[8px] border border-[#e5eaf0] bg-white" />)}</div>;
}

function EmptyDashboard() {
  return (
    <div className="grid min-h-80 place-items-center rounded-[8px] border border-dashed border-[#dce3ee] bg-white p-8 text-center">
      <div>
        <div className="mx-auto grid size-10 place-items-center rounded-[8px] bg-[#eef2ff] text-[#4f46e5]"><MaterialIcon name="monitoring" /></div>
        <h2 className="mt-3 text-sm font-black">Chưa có dữ liệu Ads</h2>
        <p className="mt-2 max-w-md text-[12px] leading-5 text-[#667085]">Kết nối Meta, chọn tài khoản quảng cáo hoặc mở rộng date range để tải dữ liệu.</p>
      </div>
    </div>
  );
}
