"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { campaignMetricValue } from "@/lib/reports/meta-intelligence";
import { formatMoney, formatNumber, formatPercent } from "@/lib/reports/ads-report";
import type {
  AccountOverviewRow,
  CreativePerformance,
  MetaIntelligenceDashboardData,
  NormalizedCampaignPerformance
} from "@/lib/meta/types";

type DatePreset = "today" | "yesterday" | "7d" | "30d" | "month" | "lastMonth" | "custom";
type MetricKey =
  | "spend"
  | "messages"
  | "leads"
  | "cpc"
  | "cpm"
  | "cpl"
  | "ctr"
  | "impressions"
  | "reach"
  | "frequency"
  | "results"
  | "costPerResult";
type ComparisonMode = "day" | "week" | "month" | "custom";
type CreativeSort = "spend" | "cpl" | "messages" | "leads" | "ctr" | "cpm";

const metricOptions: Array<{ value: MetricKey; label: string; hint: string }> = [
  { value: "spend", label: "Tá»•ng chi tiÃªu", hint: "Tá»•ng sá»‘ tiá»n Ä‘Ã£ chi trong ká»³." },
  { value: "messages", label: "Tá»•ng tin nháº¯n", hint: "Sá»‘ cuá»™c trÃ² chuyá»‡n/tin nháº¯n Meta tráº£ vá» trong actions." },
  { value: "leads", label: "Tá»•ng lead", hint: "Lead tá»« form, onsite conversion hoáº·c pixel lead." },
  { value: "cpc", label: "CPC", hint: "Chi phÃ­ trung bÃ¬nh cho má»—i lÆ°á»£t nháº¥p." },
  { value: "cpm", label: "CPM", hint: "Chi phÃ­ cho má»—i 1.000 lÆ°á»£t hiá»ƒn thá»‹." },
  { value: "cpl", label: "CPL", hint: "Chi phÃ­ trung bÃ¬nh cho má»—i lead." },
  { value: "ctr", label: "CTR", hint: "Tá»· lá»‡ nháº¥p trÃªn lÆ°á»£t hiá»ƒn thá»‹." },
  { value: "impressions", label: "Impression", hint: "Tá»•ng lÆ°á»£t hiá»ƒn thá»‹ quáº£ng cÃ¡o." },
  { value: "reach", label: "Reach", hint: "Sá»‘ ngÆ°á»i duy nháº¥t Ä‘Ã£ tháº¥y quáº£ng cÃ¡o." },
  { value: "frequency", label: "Frequency", hint: "Sá»‘ láº§n trung bÃ¬nh má»™t ngÆ°á»i tháº¥y quáº£ng cÃ¡o." },
  { value: "results", label: "Result", hint: "Káº¿t quáº£ Æ°u tiÃªn: lead, tin nháº¯n, purchase hoáº·c click." },
  { value: "costPerResult", label: "Cost per result", hint: "Chi phÃ­ trung bÃ¬nh cho má»—i káº¿t quáº£." }
];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function presetRange(preset: DatePreset) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (preset === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  }
  if (preset === "7d") start.setDate(start.getDate() - 6);
  if (preset === "30d") start.setDate(start.getDate() - 29);
  if (preset === "month") start.setDate(1);
  if (preset === "lastMonth") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setDate(0);
  }

  return { startDate: isoDate(start), endDate: isoDate(end) };
}

function accountStatus(status?: number) {
  if (status === 1) return { label: "Active", className: "bg-tertiary-fixed/40 text-tertiary" };
  if (status === 2) return { label: "Disabled", className: "bg-error-container text-error" };
  if (status === 3) return { label: "Pending", className: "bg-yellow-100 text-yellow-800" };
  if (status === 7 || status === 9 || status === 101) return { label: "Restricted", className: "bg-error-container text-error" };
  return { label: "Unknown", className: "bg-surface-container text-on-surface-variant" };
}

function metricLabel(metric: MetricKey) {
  return metricOptions.find((item) => item.value === metric)?.label ?? metric;
}

function splitCreativeName(rawName: string, creativeId: string, adId: string) {
  const normalized = rawName.trim();
  const suffixMatch = normalized.match(/^(.*?)-([A-Za-z0-9]{10,})$/);
  if (suffixMatch) {
    return {
      title: suffixMatch[1].trim(),
      code: suffixMatch[2]
    };
  }

  const lowerCreativeId = creativeId.toLowerCase();
  const hasCreativeId = lowerCreativeId && !lowerCreativeId.includes("khÃ´ng cÃ³ dá»¯ liá»‡u") && !lowerCreativeId.includes("khong co du lieu");

  return {
    title: normalized,
    code: hasCreativeId ? creativeId : adId
  };
}

function formatMetric(value: number, metric: MetricKey, currency: string) {
  if (["spend", "cpc", "cpm", "cpl", "costPerResult"].includes(metric)) return formatMoney(value, currency);
  if (metric === "ctr") return formatPercent(value);
  if (metric === "frequency") return value.toFixed(2);
  return formatNumber(value);
}

async function readJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "KhÃ´ng thá»ƒ láº¥y dá»¯ liá»‡u.");
  return payload;
}

export function MetaIntelligenceDashboard({ userName, planCount }: { userName: string; planCount: number }) {
  const [data, setData] = useState<MetaIntelligenceDashboardData | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [preset, setPreset] = useState<DatePreset>("7d");
  const [range, setRange] = useState(presetRange("7d"));
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("day");
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("spend");
  const [creativeSort, setCreativeSort] = useState<CreativeSort>("spend");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [selectedCreative, setSelectedCreative] = useState<CreativePerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [technicalError, setTechnicalError] = useState("");

  async function load(nextAccountId = selectedAccountId) {
    setLoading(true);
    setError("");
    setTechnicalError("");

    try {
      const params = new URLSearchParams({
        start_date: range.startDate,
        end_date: range.endDate
      });
      if (nextAccountId) params.set("ad_account_id", nextAccountId);
      const payload = await readJson<{ data: MetaIntelligenceDashboardData }>(`/api/meta/intelligence?${params.toString()}`);
      setData(payload.data);
      setSelectedAccountId(nextAccountId || payload.data.selectedAccount?.id || payload.data.accounts[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "KhÃ´ng thá»ƒ táº£i dashboard.");
      setTechnicalError(err instanceof Error ? err.stack || err.message : "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load("");
    }, 0);
    return () => window.clearTimeout(timer);
    // Chá»‰ load láº§n Ä‘áº§u; cÃ¡c láº§n sau do nÃºt LÃ m má»›i Ä‘á»ƒ trÃ¡nh gá»i API quÃ¡ nhiá»u.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCreative) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedCreative(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [selectedCreative]);

  function updatePreset(nextPreset: DatePreset) {
    setPreset(nextPreset);
    if (nextPreset !== "custom") setRange(presetRange(nextPreset));
  }

  const currency = data?.selectedAccount?.currency || "VND";
  const selectedCampaigns = data?.report?.campaigns ?? [];
  const filteredCreatives = useMemo(() => {
    const rows = (data?.creatives ?? []).filter((creative) => campaignFilter === "all" || creative.campaignName === campaignFilter);
    return [...rows].sort((a, b) => {
      if (creativeSort === "cpl") return (a.cpl ?? Number.MAX_SAFE_INTEGER) - (b.cpl ?? Number.MAX_SAFE_INTEGER);
      if (creativeSort === "cpm") return a.cpm - b.cpm;
      return b[creativeSort] - a[creativeSort];
    });
  }, [data, campaignFilter, creativeSort]);
  const campaignNames = Array.from(new Set((data?.creatives ?? []).map((creative) => creative.campaignName)));

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-bold text-outline">Xin chÃ o, {userName}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-on-surface">Dashboard quáº£ng cÃ¡o</h2>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              Tá»•ng há»£p hiá»‡u suáº¥t Meta Ads, creative vÃ  cáº£nh bÃ¡o tá»‘i Æ°u theo ngÃ´n ngá»¯ dá»… hiá»ƒu.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Field label="TÃ i khoáº£n">
              <select className="dashboard-input" value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
                {data?.accounts.length ? (
                  data.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name || account.id}
                    </option>
                  ))
                ) : (
                  <option>ChÆ°a cÃ³ tÃ i khoáº£n</option>
                )}
              </select>
            </Field>
            <Field label="Thá»i gian">
              <select className="dashboard-input" value={preset} onChange={(event) => updatePreset(event.target.value as DatePreset)}>
                <option value="today">HÃ´m nay</option>
                <option value="yesterday">HÃ´m qua</option>
                <option value="7d">7 ngÃ y</option>
                <option value="30d">30 ngÃ y</option>
                <option value="month">ThÃ¡ng nÃ y</option>
                <option value="lastMonth">ThÃ¡ng trÆ°á»›c</option>
                <option value="custom">TÃ¹y chá»‰nh</option>
              </select>
            </Field>
            <Field label="Tá»« ngÃ y">
              <input
                className="dashboard-input"
                type="date"
                value={range.startDate}
                onChange={(event) => {
                  setPreset("custom");
                  setRange((current) => ({ ...current, startDate: event.target.value }));
                }}
              />
            </Field>
            <Field label="Äáº¿n ngÃ y">
              <input
                className="dashboard-input"
                type="date"
                value={range.endDate}
                onChange={(event) => {
                  setPreset("custom");
                  setRange((current) => ({ ...current, endDate: event.target.value }));
                }}
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => load(selectedAccountId)} disabled={loading}>
              <MaterialIcon name="refresh" />
              {loading ? "Äang táº£i..." : "LÃ m má»›i"}
            </Button>
            <Link href="/reports">
              <Button variant="secondary">Báo cáo Ads</Button>
            </Link>
          </div>
        </div>
      </Card>

      {error ? <ErrorState message={error} detail={technicalError} /> : null}
      {loading ? <DashboardSkeleton /> : null}

      {!loading && data ? (
        <>
          <AccountOverview accounts={data.accounts} currency={currency} planCount={planCount} />
          <PerformanceSection
            campaigns={selectedCampaigns}
            daily={data.report?.daily ?? []}
            currency={currency}
            metric={selectedMetric}
            setMetric={setSelectedMetric}
            comparisonMode={comparisonMode}
            setComparisonMode={setComparisonMode}
          />
          <CampaignPerformanceTable campaigns={selectedCampaigns} currency={currency} />
          <CreativeSection
            creatives={filteredCreatives}
            warning={data.creativeAccessWarning}
            campaignNames={campaignNames}
            campaignFilter={campaignFilter}
            setCampaignFilter={setCampaignFilter}
            sort={creativeSort}
            setSort={setCreativeSort}
            currency={currency}
            onSelect={setSelectedCreative}
          />
          <InsightPanel insights={data.intelligence} comparison={data.comparison} />
          <AccountTable accounts={data.accounts} currency={currency} />
        </>
      ) : null}

      {!loading && data && !data.accounts.length ? (
        <Card className="rounded-3xl p-8 text-center">
          <MaterialIcon className="mx-auto mb-3 text-4xl text-primary" name="account_balance_wallet" />
          <h3 className="text-xl font-extrabold">ChÆ°a tÃ¬m tháº¥y tÃ i khoáº£n quáº£ng cÃ¡o</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
            Facebook chÆ°a tráº£ vá» ad account nÃ o. HÃ£y kiá»ƒm tra quyá»n ads_read hoáº·c quyá»n truy cáº­p tÃ i khoáº£n quáº£ng cÃ¡o.
          </p>
          <Link href="/dashboard/meta" className="mt-5 inline-flex">
            <Button variant="secondary">Kiá»ƒm tra Meta API</Button>
          </Link>
        </Card>
      ) : null}

      {selectedCreative ? (
        <CreativeModal creative={selectedCreative} currency={currency} onClose={() => setSelectedCreative(null)} />
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-extrabold uppercase tracking-wide text-outline">{label}</span>
      {children}
    </label>
  );
}

function AccountOverview({ accounts, currency, planCount }: { accounts: AccountOverviewRow[]; currency: string; planCount: number }) {
  const totalSpend = accounts.reduce((sum, account) => sum + account.periodSpend, 0);
  const restricted = accounts.filter((account) => account.account_status && account.account_status !== 1).length;
  const totalResults = accounts.reduce((sum, account) => sum + account.periodLeads + account.periodMessages, 0);
  const cards = [
    ["Tá»•ng chi tiÃªu", formatMoney(totalSpend, currency), "payments"],
    ["Tá»•ng lead/message", formatNumber(totalResults), "forum"],
    ["Cáº£nh bÃ¡o tÃ i khoáº£n", formatNumber(restricted), "warning"],
    ["Káº¿ hoáº¡ch AI", formatNumber(planCount), "auto_awesome"]
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, icon]) => (
        <Card key={label} className="rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-on-surface-variant">{label}</p>
            <MaterialIcon className="text-primary" name={icon} />
          </div>
          <p className="text-2xl font-extrabold text-on-surface">{value}</p>
        </Card>
      ))}
    </section>
  );
}

function PerformanceSection({
  campaigns,
  daily,
  currency,
  metric,
  setMetric,
  comparisonMode,
  setComparisonMode
}: {
  campaigns: NormalizedCampaignPerformance[];
  daily: Array<Record<string, string | undefined>>;
  currency: string;
  metric: MetricKey;
  setMetric: (metric: MetricKey) => void;
  comparisonMode: ComparisonMode;
  setComparisonMode: (mode: ComparisonMode) => void;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <Card className="rounded-3xl p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-extrabold">Hiá»‡u suáº¥t theo thá»i gian</h3>
            <p className="text-sm text-on-surface-variant">Chá»n chá»‰ sá»‘ Ä‘á»ƒ biá»ƒu Ä‘á»“ chá»‰ hiá»ƒn thá»‹ Ä‘Ãºng chá»‰ sá»‘ Ä‘Ã³.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="dashboard-input max-w-[220px]" value={metric} onChange={(event) => setMetric(event.target.value as MetricKey)}>
              {metricOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              className="dashboard-input max-w-[210px]"
              value={comparisonMode}
              onChange={(event) => setComparisonMode(event.target.value as ComparisonMode)}
            >
              <option value="day">So sÃ¡nh theo ngÃ y</option>
              <option value="week">So sÃ¡nh theo tuáº§n</option>
              <option value="month">So sÃ¡nh theo thÃ¡ng</option>
              <option value="custom">Custom date range</option>
            </select>
          </div>
        </div>
        <MetricHint metric={metric} />
        <LineChart rows={daily} metric={metric} currency={currency} />
      </Card>

      <Card className="rounded-3xl p-6">
        <div className="mb-5">
          <h3 className="text-lg font-extrabold">So sÃ¡nh campaign</h3>
          <p className="text-sm text-on-surface-variant">Bar chart theo {metricLabel(metric).toLowerCase()}.</p>
        </div>
        <BarChart campaigns={campaigns} metric={metric} currency={currency} />
      </Card>
    </section>
  );
}

function MetricHint({ metric }: { metric: MetricKey }) {
  const item = metricOptions.find((option) => option.value === metric);
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-2 text-xs font-semibold text-on-surface-variant">
      <MaterialIcon className="text-[16px]" name="info" />
      {item?.hint}
    </div>
  );
}

function LineChart({ rows, metric, currency }: { rows: Array<Record<string, string | undefined>>; metric: MetricKey; currency: string }) {
  const values = rows.map((row) => {
    if (metric === "spend") return Number(row.spend ?? 0);
    if (metric === "cpc") return Number(row.cpc ?? 0);
    if (metric === "cpm") return Number(row.cpm ?? 0);
    if (metric === "ctr") return Number(row.ctr ?? 0);
    if (metric === "impressions") return Number(row.impressions ?? 0);
    if (metric === "reach") return Number(row.reach ?? 0);
    return 0;
  });

  if (!rows.length || values.every((value) => value === 0)) {
    return <div className="rounded-2xl bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">KhÃ´ng cÃ³ dá»¯ liá»‡u biá»ƒu Ä‘á»“ trong ká»³ nÃ y.</div>;
  }

  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = rows.length === 1 ? 300 : (index / (rows.length - 1)) * 620;
      const y = 220 - (value / max) * 180;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <svg viewBox="0 0 640 240" className="h-64 w-full">
        <line x1="0" x2="640" y1="220" y2="220" stroke="#c2c6d9" />
        <polyline fill="none" points={points} stroke="#004cca" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        {points.split(" ").map((point, index) => {
          const [x, y] = point.split(",");
          return <circle key={`${point}-${index}`} cx={x} cy={y} fill="#fff" r="5" stroke="#004cca" strokeWidth="3" />;
        })}
      </svg>
      <div className="grid gap-2 md:grid-cols-3">
        {rows.slice(-3).map((row) => (
          <div key={row.date_start} className="rounded-2xl bg-surface-container-low p-3 text-xs font-semibold text-on-surface-variant">
            <p className="text-on-surface">{row.date_start}</p>
            <p>{formatMetric(values[rows.indexOf(row)] ?? 0, metric, currency)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ campaigns, metric, currency }: { campaigns: NormalizedCampaignPerformance[]; metric: MetricKey; currency: string }) {
  const rows = campaigns
    .map((campaign) => ({ campaign, value: campaignMetricValue(campaign, metric) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const max = Math.max(...rows.map((row) => row.value), 1);

  if (!rows.length) return <div className="rounded-2xl bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">ChÆ°a cÃ³ campaign Ä‘á»ƒ so sÃ¡nh.</div>;

  return (
    <div className="space-y-4">
      {rows.map(({ campaign, value }) => (
        <div key={campaign.campaignId}>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold">
            <span className="truncate text-on-surface">{campaign.campaignName}</span>
            <span className="text-on-surface-variant">{formatMetric(value, metric, currency)}</span>
          </div>
          <div className="h-3 rounded-full bg-surface-container-low">
            <div className="h-3 rounded-full bg-primary" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CampaignPerformanceTable({ campaigns, currency }: { campaigns: NormalizedCampaignPerformance[]; currency: string }) {
  return (
    <Card className="overflow-hidden rounded-3xl p-0">
      <div className="border-b border-outline-variant/70 px-6 py-5">
        <h3 className="text-lg font-extrabold">Campaign performance</h3>
        <p className="text-sm text-on-surface-variant">Lead/tin nháº¯n báº±ng 0 váº«n Ä‘Æ°á»£c hiá»ƒn thá»‹ rÃµ Ä‘á»ƒ dá»… kiá»ƒm tra.</p>
      </div>
      {campaigns.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                {["Campaign name", "Campaign ID", "Status", "Spend", "Messages", "Leads", "CPC", "CPM", "CPL", "CTR", "Impressions", "Reach", "Frequency", "Cost/result"].map((item) => (
                  <th key={item} className="px-5 py-4 font-extrabold">
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/70">
              {campaigns.map((campaign) => (
                <tr key={campaign.campaignId} className="hover:bg-surface-container-lowest">
                  <td className="max-w-[260px] px-5 py-4 font-bold">{campaign.campaignName}</td>
                  <td className="px-5 py-4 text-xs text-on-surface-variant">{campaign.campaignId}</td>
                  <td className="px-5 py-4">{campaign.status || "KhÃ´ng cÃ³ dá»¯ liá»‡u"}</td>
                  <td className="px-5 py-4">{formatMoney(campaign.spend, currency)}</td>
                  <td className="px-5 py-4">{formatNumber(campaign.messages)}</td>
                  <td className="px-5 py-4">{formatNumber(campaign.leads)}</td>
                  <td className="px-5 py-4">{formatMoney(campaign.cpc, currency)}</td>
                  <td className="px-5 py-4">{formatMoney(campaign.cpm, currency)}</td>
                  <td className="px-5 py-4">{campaign.leads > 0 ? formatMoney(campaign.spend / campaign.leads, currency) : "â€”"}</td>
                  <td className="px-5 py-4">{formatPercent(campaign.ctr)}</td>
                  <td className="px-5 py-4">{formatNumber(campaign.impressions)}</td>
                  <td className="px-5 py-4">{formatNumber(campaign.reach)}</td>
                  <td className="px-5 py-4">{campaign.frequency.toFixed(2)}</td>
                  <td className="px-5 py-4">{formatMoney(campaign.costPerResult, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-on-surface-variant">KhÃ´ng cÃ³ dá»¯ liá»‡u campaign trong ká»³ nÃ y.</div>
      )}
    </Card>
  );
}

function CreativeSection({
  creatives,
  warning,
  campaignNames,
  campaignFilter,
  setCampaignFilter,
  sort,
  setSort,
  currency,
  onSelect
}: {
  creatives: CreativePerformance[];
  warning?: string;
  campaignNames: string[];
  campaignFilter: string;
  setCampaignFilter: (value: string) => void;
  sort: CreativeSort;
  setSort: (value: CreativeSort) => void;
  currency: string;
  onSelect: (creative: CreativePerformance) => void;
}) {
  return (
    <Card className="rounded-3xl p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-extrabold">So sánh creative của campaign</h3>
          <p className="text-sm text-on-surface-variant">Gallery xem nhanh mẫu quảng cáo và bảng hiệu suất creative.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="dashboard-input max-w-[220px]" value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)}>
            <option value="all">Tất cả campaign</option>
            {campaignNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select className="dashboard-input max-w-[220px]" value={sort} onChange={(event) => setSort(event.target.value as CreativeSort)}>
            <option value="spend">Spend cao nhất</option>
            <option value="cpl">CPL thấp nhất</option>
            <option value="messages">Tin nhắn nhiều nhất</option>
            <option value="leads">Lead nhiều nhất</option>
            <option value="ctr">CTR cao nhất</option>
            <option value="cpm">CPM thấp nhất</option>
          </select>
        </div>
      </div>
      {warning ? (
        <div className="mb-5 rounded-2xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-900">
          {warning}
        </div>
      ) : null}

      {creatives.length ? (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {creatives.slice(0, 8).map((creative) => {
              const parsed = splitCreativeName(creative.creativeName, creative.creativeId, creative.adId);
              return (
                <button
                  key={creative.adId}
                  className="overflow-hidden rounded-3xl border border-outline-variant/70 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-soft"
                  onClick={() => onSelect(creative)}
                >
                  <div className="flex aspect-video items-center justify-center bg-surface-container-low">
                    {creative.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={creative.creativeName} className="h-full w-full object-cover" src={creative.thumbnailUrl} />
                    ) : (
                      <MaterialIcon className="text-4xl text-outline" name="image" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 text-sm font-extrabold text-on-surface">{parsed.title}</p>
                    <p className="mt-1 font-mono text-[11px] font-semibold tracking-wide text-outline">Mã: {parsed.code}</p>
                    <p className="mt-2 flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="rounded-full bg-surface-container-low px-2 py-1 font-semibold uppercase tracking-wide text-on-surface">
                        {creative.format}
                      </span>
                      <span>{formatMoney(creative.spend, currency)}</span>
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-bold">
                      <span>Lead {creative.leads}</span>
                      <span>Tin nhắn {creative.messages}</span>
                      <span>CTR {creative.ctr.toFixed(1)}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <CreativeTable creatives={creatives} currency={currency} onSelect={onSelect} />
        </>
      ) : (
        <div className="rounded-2xl bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">
          Không lấy được creative từ Meta API. Có thể token thiếu quyền đọc creative/post hoặc campaign chưa có ads trong kỳ này.
        </div>
      )}
    </Card>
  );
}

function CreativeTable({ creatives, currency, onSelect }: { creatives: CreativePerformance[]; currency: string; onSelect: (creative: CreativePerformance) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-left text-sm">
        <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
          <tr>
            {["Creative", "Campaign", "Ad set", "Format", "Spend", "Impressions", "Reach", "CTR", "CPC", "CPM", "Leads", "Messages", "CPL", "Cost/message"].map((item) => (
              <th key={item} className="px-4 py-3 font-extrabold">
                {item}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/70">
          {creatives.map((creative) => {
            const parsed = splitCreativeName(creative.creativeName, creative.creativeId, creative.adId);
            return (
              <tr key={creative.adId} className="cursor-pointer hover:bg-surface-container-lowest" onClick={() => onSelect(creative)}>
                <td className="px-4 py-3">
                  <p className="font-bold">{parsed.title}</p>
                  <p className="text-[11px] text-outline">{parsed.code}</p>
                </td>
                <td className="px-4 py-3">{creative.campaignName}</td>
                <td className="px-4 py-3">{creative.adsetName}</td>
                <td className="px-4 py-3">{creative.format}</td>
                <td className="px-4 py-3">{formatMoney(creative.spend, currency)}</td>
                <td className="px-4 py-3">{formatNumber(creative.impressions)}</td>
                <td className="px-4 py-3">{formatNumber(creative.reach)}</td>
                <td className="px-4 py-3">{formatPercent(creative.ctr)}</td>
                <td className="px-4 py-3">{formatMoney(creative.cpc, currency)}</td>
                <td className="px-4 py-3">{formatMoney(creative.cpm, currency)}</td>
                <td className="px-4 py-3">{formatNumber(creative.leads)}</td>
                <td className="px-4 py-3">{formatNumber(creative.messages)}</td>
                <td className="px-4 py-3">{creative.cpl !== null ? formatMoney(creative.cpl, currency) : "—"}</td>
                <td className="px-4 py-3">{creative.costPerMessage !== null ? formatMoney(creative.costPerMessage, currency) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
function InsightPanel({ insights, comparison }: { insights: MetaIntelligenceDashboardData["intelligence"]; comparison: MetaIntelligenceDashboardData["comparison"] }) {
  const tone = {
    scale: "bg-tertiary-fixed/35 text-tertiary",
    check: "bg-yellow-100 text-yellow-800",
    winner: "bg-primary-fixed text-primary",
    warning: "bg-error-container text-error",
    neutral: "bg-surface-container-low text-on-surface-variant"
  };

  return (
    <Card className="rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-3">
        <MaterialIcon className="text-primary" filled name="auto_awesome" />
        <div>
          <h3 className="text-lg font-extrabold">AI Insight & cáº£nh bÃ¡o tá»‘i Æ°u</h3>
          <p className="text-sm text-on-surface-variant">
            So vá»›i ká»³ trÆ°á»›c: spend {comparison.spend.toFixed(1)}%, lead/result {comparison.leads.toFixed(1)}%, CPL/result {comparison.cpl.toFixed(1)}%.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {insights.map((insight, index) => (
          <div key={`${insight.title}-${index}`} className="rounded-3xl border border-outline-variant/70 bg-white p-5">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${tone[insight.type]}`}>{insight.title}</span>
            <p className="mt-4 text-sm leading-6 text-on-surface-variant">{insight.reason}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AccountTable({ accounts, currency }: { accounts: AccountOverviewRow[]; currency: string }) {
  return (
    <Card className="overflow-hidden rounded-3xl p-0">
      <div className="border-b border-outline-variant/70 px-6 py-5">
        <h3 className="text-lg font-extrabold">Tá»•ng quan tÃ i khoáº£n quáº£ng cÃ¡o</h3>
        <p className="text-sm text-on-surface-variant">CÃ¡c trÆ°á»ng Meta khÃ´ng tráº£ vá» sáº½ ghi rÃµ â€œKhÃ´ng cÃ³ dá»¯ liá»‡u tá»« Meta APIâ€.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
            <tr>
              {["TÃªn tÃ i khoáº£n", "ID", "TÃ¬nh tráº¡ng", "Limit", "NgÃ y táº¡o", "Tá»•ng chi tiÃªu", "Sá»‘ dÆ°", "Tiá»n tá»‡", "Timezone", "Quyá»n", "Thanh toÃ¡n", "Business"].map((item) => (
                <th key={item} className="px-4 py-3 font-extrabold">
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/70">
            {accounts.map((account) => {
              const status = accountStatus(account.account_status);
              return (
                <tr key={account.id}>
                  <td className="px-4 py-3 font-bold">{account.name || "KhÃ´ng cÃ³ dá»¯ liá»‡u tá»« Meta API"}</td>
                  <td className="px-4 py-3">{account.id}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${status.className}`}>{status.label}</span>
                  </td>
                  <td className="px-4 py-3">{account.spend_cap ? formatMoney(Number(account.spend_cap), account.currency || currency) : "KhÃ´ng cÃ³ dá»¯ liá»‡u tá»« Meta API"}</td>
                  <td className="px-4 py-3">{account.created_time || "KhÃ´ng cÃ³ dá»¯ liá»‡u tá»« Meta API"}</td>
                  <td className="px-4 py-3">{formatMoney(account.periodSpend, account.currency || currency)}</td>
                  <td className="px-4 py-3">{account.balance ? formatMoney(Number(account.balance), account.currency || currency) : "KhÃ´ng cÃ³ dá»¯ liá»‡u tá»« Meta API"}</td>
                  <td className="px-4 py-3">{account.currency || "KhÃ´ng cÃ³ dá»¯ liá»‡u tá»« Meta API"}</td>
                  <td className="px-4 py-3">{account.timezone_name || "KhÃ´ng cÃ³ dá»¯ liá»‡u tá»« Meta API"}</td>
                  <td className="px-4 py-3">{account.user_tasks?.join(", ") || "KhÃ´ng cÃ³ dá»¯ liá»‡u tá»« Meta API"}</td>
                  <td className="px-4 py-3">{account.funding_source_details?.display_string || "KhÃ´ng cÃ³ dá»¯ liá»‡u tá»« Meta API"}</td>
                  <td className="px-4 py-3">{account.business?.name || account.business_name || "KhÃ´ng cÃ³ dá»¯ liá»‡u tá»« Meta API"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CreativeModal({ creative, currency, onClose }: { creative: CreativePerformance; currency: string; onClose: () => void }) {
  const parsed = splitCreativeName(creative.creativeName, creative.creativeId, creative.adId);
  const note =
    creative.leads > 0 || creative.messages > 0
      ? "Creative này đang có tín hiệu chuyển đổi, nên tiếp tục theo dõi và test biến thể tương tự."
      : creative.spend > 0
        ? "Creative đã có chi tiêu nhưng chưa có lead/tin nhắn, nên kiểm tra lại hook, offer hoặc tệp."
        : "Creative chưa đủ dữ liệu để đánh giá chính xác.";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4" onClick={onClose}>
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <button
          aria-label="Đóng chi tiết creative"
          className="absolute right-4 top-4 rounded-xl bg-surface-container-low px-3 py-2 text-sm font-bold text-on-surface"
          onClick={onClose}
          type="button"
        >
          Đóng
        </button>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold">{parsed.title}</h3>
            <p className="mt-1 text-xs font-semibold text-outline">Mã creative: {parsed.code}</p>
            <p className="text-sm text-on-surface-variant">{creative.campaignName} · {creative.adsetName} · {creative.adName}</p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1fr]">
          <div className="overflow-hidden rounded-3xl bg-surface-container-low">
            {creative.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={creative.creativeName} className="w-full object-cover" src={creative.thumbnailUrl} />
            ) : (
              <div className="flex aspect-video items-center justify-center">
                <MaterialIcon className="text-5xl text-outline" name="image" />
              </div>
            )}
          </div>
          <div className="space-y-4">
            <Detail label="Primary text" value={creative.body} />
            <Detail label="Headline" value={creative.headline} />
            <Detail label="Description" value={creative.description} />
            <Detail label="CTA" value={creative.cta} />
            <Detail label="Landing URL" value={creative.landingUrl} />
            <Detail label="Post ID" value={creative.postId} />
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <MiniKpi label="Spend" value={formatMoney(creative.spend, currency)} />
          <MiniKpi label="Lead" value={formatNumber(creative.leads)} />
          <MiniKpi label="Tin nhắn" value={formatNumber(creative.messages)} />
          <MiniKpi label="CTR" value={formatPercent(creative.ctr)} />
        </div>
        <div className="mt-5 rounded-2xl bg-primary-fixed/40 p-4 text-sm font-semibold leading-6 text-on-surface-variant">{note}</div>
      </div>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-container-low p-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-outline">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-on-surface">{value || "KhÃ´ng cÃ³ dá»¯ liá»‡u tá»« Meta API"}</p>
    </div>
  );
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-container-low p-4">
      <p className="text-xs font-bold text-outline">{label}</p>
      <p className="mt-1 text-lg font-extrabold">{value}</p>
    </div>
  );
}

function ErrorState({ message, detail }: { message: string; detail: string }) {
  return (
    <Card className="rounded-3xl border border-error-container bg-error-container/70 p-5">
      <div className="flex items-start gap-3">
        <MaterialIcon className="text-error" name="error" />
        <div>
          <p className="font-extrabold text-error">{message}</p>
          <p className="mt-1 text-sm text-on-surface-variant">HÃ£y kiá»ƒm tra token, quyá»n ads_read/pages_read_engagement hoáº·c quyá»n vá»›i ad account.</p>
          <a
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-soft"
            href="/api/auth/facebook/start?force=1"
          >
            Káº¿t ná»‘i láº¡i Facebook vÃ  cáº¥p quyá»n
          </a>
          {detail ? (
            <details className="mt-2 text-xs text-on-surface-variant">
              <summary className="cursor-pointer font-bold">Xem chi tiáº¿t ká»¹ thuáº­t</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3">{detail}</pre>
            </details>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-3xl bg-white" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="h-96 animate-pulse rounded-3xl bg-white" />
        <div className="h-96 animate-pulse rounded-3xl bg-white" />
      </div>
    </div>
  );
}




