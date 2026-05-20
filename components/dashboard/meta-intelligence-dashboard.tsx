"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
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
  { value: "spend", label: "Tổng chi tiêu", hint: "Tổng số tiền đã chi trong kỳ." },
  { value: "messages", label: "Tổng tin nhắn", hint: "Số cuộc trò chuyện/tin nhắn Meta trả về trong actions." },
  { value: "leads", label: "Tổng lead", hint: "Lead từ form, onsite conversion hoặc pixel lead." },
  { value: "cpc", label: "CPC", hint: "Chi phí trung bình cho mỗi lượt nhấp." },
  { value: "cpm", label: "CPM", hint: "Chi phí cho mỗi 1.000 lượt hiển thị." },
  { value: "cpl", label: "CPL", hint: "Chi phí trung bình cho mỗi lead." },
  { value: "ctr", label: "CTR", hint: "Tỷ lệ nhấp trên lượt hiển thị." },
  { value: "impressions", label: "Impression", hint: "Tổng lượt hiển thị quảng cáo." },
  { value: "reach", label: "Reach", hint: "Số người duy nhất đã thấy quảng cáo." },
  { value: "frequency", label: "Frequency", hint: "Số lần trung bình một người thấy quảng cáo." },
  { value: "results", label: "Result", hint: "Kết quả ưu tiên: lead, tin nhắn, purchase hoặc click." },
  { value: "costPerResult", label: "Cost per result", hint: "Chi phí trung bình cho mỗi kết quả." }
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

function formatMetric(value: number, metric: MetricKey, currency: string) {
  if (["spend", "cpc", "cpm", "cpl", "costPerResult"].includes(metric)) return formatMoney(value, currency);
  if (metric === "ctr") return formatPercent(value);
  if (metric === "frequency") return value.toFixed(2);
  return formatNumber(value);
}

async function readJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Không thể lấy dữ liệu.");
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
      setError(err instanceof Error ? err.message : "Không thể tải dashboard.");
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
    // Chỉ load lần đầu; các lần sau do nút Làm mới để tránh gọi API quá nhiều.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <p className="text-sm font-bold text-outline">Xin chào, {userName}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-on-surface">Dashboard quảng cáo</h2>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              Tổng hợp hiệu suất Meta Ads, creative và cảnh báo tối ưu theo ngôn ngữ dễ hiểu.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Tài khoản">
              <select className="dashboard-input" value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
                {data?.accounts.length ? (
                  data.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name || account.id}
                    </option>
                  ))
                ) : (
                  <option>Chưa có tài khoản</option>
                )}
              </select>
            </Field>
            <Field label="Thời gian">
              <select className="dashboard-input" value={preset} onChange={(event) => updatePreset(event.target.value as DatePreset)}>
                <option value="today">Hôm nay</option>
                <option value="yesterday">Hôm qua</option>
                <option value="7d">7 ngày</option>
                <option value="30d">30 ngày</option>
                <option value="month">Tháng này</option>
                <option value="lastMonth">Tháng trước</option>
                <option value="custom">Tùy chỉnh</option>
              </select>
            </Field>
            <Field label="Từ ngày">
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
            <Field label="Đến ngày">
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
              {loading ? "Đang tải..." : "Làm mới"}
            </Button>
            <Button variant="secondary" disabled={!data} onClick={() => exportCsv(data, currency)}>
              CSV
            </Button>
            <Button variant="secondary" disabled={!data} onClick={() => exportExcel(data, currency)}>
              Excel
            </Button>
            <Button variant="secondary" disabled={!data} onClick={() => exportPdf(data, currency)}>
              PDF
            </Button>
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
          <h3 className="text-xl font-extrabold">Chưa tìm thấy tài khoản quảng cáo</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
            Facebook chưa trả về ad account nào. Hãy kiểm tra quyền ads_read hoặc quyền truy cập tài khoản quảng cáo.
          </p>
          <Link href="/dashboard/meta" className="mt-5 inline-flex">
            <Button variant="secondary">Kiểm tra Meta API</Button>
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
  const active = accounts.filter((account) => account.account_status === 1).length;
  const restricted = accounts.filter((account) => account.account_status && account.account_status !== 1).length;
  const totalResults = accounts.reduce((sum, account) => sum + account.periodLeads + account.periodMessages, 0);
  const cards = [
    ["Tổng tài khoản", formatNumber(accounts.length), "account_balance_wallet"],
    ["Tài khoản hoạt động", formatNumber(active), "verified"],
    ["Tổng chi tiêu", formatMoney(totalSpend, currency), "payments"],
    ["Tổng lead/message", formatNumber(totalResults), "forum"],
    ["Cảnh báo tài khoản", formatNumber(restricted), "warning"],
    ["Kế hoạch AI", formatNumber(planCount), "auto_awesome"]
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
            <h3 className="text-lg font-extrabold">Hiệu suất theo thời gian</h3>
            <p className="text-sm text-on-surface-variant">Chọn chỉ số để biểu đồ chỉ hiển thị đúng chỉ số đó.</p>
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
              <option value="day">So sánh theo ngày</option>
              <option value="week">So sánh theo tuần</option>
              <option value="month">So sánh theo tháng</option>
              <option value="custom">Custom date range</option>
            </select>
          </div>
        </div>
        <MetricHint metric={metric} />
        <LineChart rows={daily} metric={metric} currency={currency} />
      </Card>

      <Card className="rounded-3xl p-6">
        <div className="mb-5">
          <h3 className="text-lg font-extrabold">So sánh campaign</h3>
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
    return <div className="rounded-2xl bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">Không có dữ liệu biểu đồ trong kỳ này.</div>;
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

  if (!rows.length) return <div className="rounded-2xl bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">Chưa có campaign để so sánh.</div>;

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
        <p className="text-sm text-on-surface-variant">Lead/tin nhắn bằng 0 vẫn được hiển thị rõ để dễ kiểm tra.</p>
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
                  <td className="px-5 py-4">{campaign.status || "Không có dữ liệu"}</td>
                  <td className="px-5 py-4">{formatMoney(campaign.spend, currency)}</td>
                  <td className="px-5 py-4">{formatNumber(campaign.messages)}</td>
                  <td className="px-5 py-4">{formatNumber(campaign.leads)}</td>
                  <td className="px-5 py-4">{formatMoney(campaign.cpc, currency)}</td>
                  <td className="px-5 py-4">{formatMoney(campaign.cpm, currency)}</td>
                  <td className="px-5 py-4">{campaign.leads > 0 ? formatMoney(campaign.spend / campaign.leads, currency) : "—"}</td>
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
        <div className="p-8 text-center text-sm text-on-surface-variant">Không có dữ liệu campaign trong kỳ này.</div>
      )}
    </Card>
  );
}

function CreativeSection({
  creatives,
  campaignNames,
  campaignFilter,
  setCampaignFilter,
  sort,
  setSort,
  currency,
  onSelect
}: {
  creatives: CreativePerformance[];
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

      {creatives.length ? (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {creatives.slice(0, 8).map((creative) => (
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
                  <p className="line-clamp-2 text-sm font-extrabold text-on-surface">{creative.creativeName}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{creative.format} · {formatMoney(creative.spend, currency)}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-bold">
                    <span>Lead {creative.leads}</span>
                    <span>Msg {creative.messages}</span>
                    <span>CTR {creative.ctr.toFixed(1)}%</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <CreativeTable creatives={creatives} currency={currency} onSelect={onSelect} />
        </>
      ) : (
        <div className="rounded-2xl bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">
          Chưa lấy được creative từ Meta API. Có thể token thiếu quyền đọc creative/post hoặc campaign chưa có ads trong kỳ này.
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
          {creatives.map((creative) => (
            <tr key={creative.adId} className="cursor-pointer hover:bg-surface-container-lowest" onClick={() => onSelect(creative)}>
              <td className="px-4 py-3 font-bold">{creative.creativeName}</td>
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
          ))}
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
          <h3 className="text-lg font-extrabold">AI Insight & cảnh báo tối ưu</h3>
          <p className="text-sm text-on-surface-variant">
            So với kỳ trước: spend {comparison.spend.toFixed(1)}%, lead/result {comparison.leads.toFixed(1)}%, CPL/result {comparison.cpl.toFixed(1)}%.
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
        <h3 className="text-lg font-extrabold">Tổng quan tài khoản quảng cáo</h3>
        <p className="text-sm text-on-surface-variant">Các trường Meta không trả về sẽ ghi rõ “Không có dữ liệu từ Meta API”.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
            <tr>
              {["Tên tài khoản", "ID", "Tình trạng", "Limit", "Ngày tạo", "Tổng chi tiêu", "Số dư", "Tiền tệ", "Timezone", "Quyền", "Thanh toán", "Business"].map((item) => (
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
                  <td className="px-4 py-3 font-bold">{account.name || "Không có dữ liệu từ Meta API"}</td>
                  <td className="px-4 py-3">{account.id}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${status.className}`}>{status.label}</span>
                  </td>
                  <td className="px-4 py-3">{account.spend_cap ? formatMoney(Number(account.spend_cap), account.currency || currency) : "Không có dữ liệu từ Meta API"}</td>
                  <td className="px-4 py-3">{account.created_time || "Không có dữ liệu từ Meta API"}</td>
                  <td className="px-4 py-3">{formatMoney(account.periodSpend, account.currency || currency)}</td>
                  <td className="px-4 py-3">{account.balance ? formatMoney(Number(account.balance), account.currency || currency) : "Không có dữ liệu từ Meta API"}</td>
                  <td className="px-4 py-3">{account.currency || "Không có dữ liệu từ Meta API"}</td>
                  <td className="px-4 py-3">{account.timezone_name || "Không có dữ liệu từ Meta API"}</td>
                  <td className="px-4 py-3">{account.user_tasks?.join(", ") || "Không có dữ liệu từ Meta API"}</td>
                  <td className="px-4 py-3">{account.funding_source_details?.display_string || "Không có dữ liệu từ Meta API"}</td>
                  <td className="px-4 py-3">{account.business?.name || account.business_name || "Không có dữ liệu từ Meta API"}</td>
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
  const note =
    creative.leads > 0 || creative.messages > 0
      ? "Creative này đang có tín hiệu chuyển đổi, nên tiếp tục theo dõi và test biến thể tương tự."
      : creative.spend > 0
        ? "Creative đã có chi tiêu nhưng chưa có lead/tin nhắn, nên kiểm tra lại hook, offer hoặc tệp."
        : "Creative chưa đủ dữ liệu để đánh giá chính xác.";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold">{creative.creativeName}</h3>
            <p className="text-sm text-on-surface-variant">{creative.campaignName} · {creative.adsetName} · {creative.adName}</p>
          </div>
          <button className="rounded-full bg-surface-container-low p-2" onClick={onClose}>
            <MaterialIcon name="close" />
          </button>
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
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-on-surface">{value || "Không có dữ liệu từ Meta API"}</p>
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
          <p className="mt-1 text-sm text-on-surface-variant">Hãy kiểm tra token, quyền ads_read/pages_read_engagement hoặc quyền với ad account.</p>
          {detail ? (
            <details className="mt-2 text-xs text-on-surface-variant">
              <summary className="cursor-pointer font-bold">Xem chi tiết kỹ thuật</summary>
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

function exportRows(data: MetaIntelligenceDashboardData | null) {
  if (!data) return [];
  return [
    ["Tài khoản", data.selectedAccount?.name ?? "", data.selectedAccount?.id ?? ""],
    ["Thời gian xuất", new Date().toLocaleString("vi-VN")],
    [],
    ["Campaign", "ID", "Spend", "Messages", "Leads", "CPC", "CPM", "CPL", "CTR", "Impressions", "Reach", "Frequency", "Cost/result"],
    ...(data.report?.campaigns ?? []).map((campaign) => [
      campaign.campaignName,
      campaign.campaignId,
      campaign.spend,
      campaign.messages,
      campaign.leads,
      campaign.cpc,
      campaign.cpm,
      campaign.leads > 0 ? campaign.spend / campaign.leads : "",
      campaign.ctr,
      campaign.impressions,
      campaign.reach,
      campaign.frequency,
      campaign.costPerResult
    ]),
    [],
    ["Creative", "Campaign", "Ad set", "Spend", "Messages", "Leads", "CTR", "CPC", "CPM", "CPL"],
    ...data.creatives.map((creative) => [
      creative.creativeName,
      creative.campaignName,
      creative.adsetName,
      creative.spend,
      creative.messages,
      creative.leads,
      creative.ctr,
      creative.cpc,
      creative.cpm,
      creative.cpl ?? ""
    ]),
    [],
    ["AI Insight"],
    ...data.intelligence.map((insight) => [insight.title, insight.reason])
  ];
}

function dateRangeSlug(data: MetaIntelligenceDashboardData | null) {
  const range = data?.report?.dateRange;
  return range ? `${range.startDate}-${range.endDate}` : new Date().toISOString().slice(0, 10);
}

async function exportExcel(data: MetaIntelligenceDashboardData | null, _currency: string) {
  if (!data) return;
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.aoa_to_sheet(exportRows(data));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ads Report");
  XLSX.writeFile(workbook, `ads-report-${data.selectedAccount?.id ?? "account"}-${dateRangeSlug(data)}.xlsx`);
}

function exportCsv(data: MetaIntelligenceDashboardData | null, _currency: string) {
  if (!data) return;
  const rows = exportRows(data);
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ads-report-${data.selectedAccount?.id ?? "account"}-${dateRangeSlug(data)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportPdf(data: MetaIntelligenceDashboardData | null, currency: string) {
  if (!data) return;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const account = data.selectedAccount;
  let y = 14;
  doc.setFontSize(14);
  doc.text("Meta Ads Intelligence Report", 14, y);
  y += 8;
  doc.setFontSize(9);
  doc.text(`Tai khoan: ${account?.name ?? ""} (${account?.id ?? ""})`, 14, y);
  y += 6;
  doc.text(`Thoi gian xuat: ${new Date().toLocaleString("vi-VN")}`, 14, y);
  y += 8;
  doc.text(`Tong chi tieu: ${formatMoney(data.report?.summary.spend ?? 0, currency)}`, 14, y);
  y += 6;
  doc.text(`Lead/Message: ${formatNumber((data.report?.summary.totalResults ?? 0))}`, 14, y);
  y += 8;

  doc.setFontSize(11);
  doc.text("AI Insight", 14, y);
  y += 6;
  doc.setFontSize(8);
  data.intelligence.slice(0, 8).forEach((insight) => {
    const lines = doc.splitTextToSize(`${insight.title}: ${insight.reason}`, 180);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 2;
    if (y > 280) {
      doc.addPage();
      y = 14;
    }
  });

  doc.save(`ads-report-${account?.id ?? "account"}-${dateRangeSlug(data)}.pdf`);
  toast.success("Đã xuất PDF.");
}
