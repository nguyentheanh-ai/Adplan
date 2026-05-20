"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { applyDefaultAdAccount, getDefaultAdAccountId, setDefaultAdAccountId } from "@/lib/meta/default-account";
import type { MetaIntelligenceDashboardData, NormalizedCampaignPerformance } from "@/lib/meta/types";
import { formatMoney, formatNumber, formatPercent } from "@/lib/reports/ads-report";
import { campaignMetricValue } from "@/lib/reports/meta-intelligence";

type DatePreset = "today" | "yesterday" | "7d" | "30d" | "month" | "lastMonth" | "custom";
type MetricKey = "spend" | "ctr" | "cpc";
type ChartType = "line" | "bar";

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

function splitCreativeName(rawName: string, creativeId: string, adId: string) {
  const normalized = rawName.trim();
  const suffixMatch = normalized.match(/^(.*?)-([A-Za-z0-9]{10,})$/);
  if (suffixMatch) return { title: suffixMatch[1].trim(), code: suffixMatch[2] };
  return { title: normalized, code: creativeId || adId };
}

async function readJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Không thể lấy dữ liệu.");
  return payload;
}

function metricLabel(metric: MetricKey) {
  if (metric === "ctr") return "CTR";
  if (metric === "cpc") return "CPC";
  return "Chi tiêu";
}

function formatMetricValue(metric: MetricKey, value: number, currency: string) {
  if (metric === "ctr") return formatPercent(value);
  return formatMoney(value, currency);
}

export function MetaIntelligenceDashboard({ userName, planCount }: { userName: string; planCount: number }) {
  const [data, setData] = useState<MetaIntelligenceDashboardData | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [preset, setPreset] = useState<DatePreset>("7d");
  const [range, setRange] = useState(presetRange("7d"));
  const [metric, setMetric] = useState<MetricKey>("spend");
  const [compareMetric, setCompareMetric] = useState<MetricKey>("ctr");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [technicalError, setTechnicalError] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("ALL");
  const [keyword, setKeyword] = useState("");

  async function load(nextAccountId = selectedAccountId) {
    setLoading(true);
    setError("");
    setTechnicalError("");
    try {
      const params = new URLSearchParams({ start_date: range.startDate, end_date: range.endDate });
      if (nextAccountId) params.set("ad_account_id", nextAccountId);
      const payload = await readJson<{ data: MetaIntelligenceDashboardData }>(`/api/meta/intelligence?${params.toString()}`);
      setData(payload.data);
      const picked = applyDefaultAdAccount(payload.data.accounts, nextAccountId || payload.data.selectedAccount?.id || payload.data.accounts[0]?.id);
      setSelectedAccountId(picked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dashboard.");
      setTechnicalError(err instanceof Error ? err.stack || err.message : "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialRange = presetRange("7d");
    const params = new URLSearchParams({ start_date: initialRange.startDate, end_date: initialRange.endDate });
    const defaultId = getDefaultAdAccountId();
    if (defaultId) params.set("ad_account_id", defaultId);
    readJson<{ data: MetaIntelligenceDashboardData }>(`/api/meta/intelligence?${params.toString()}`)
      .then((payload) => {
        setData(payload.data);
        const picked = applyDefaultAdAccount(payload.data.accounts, defaultId || payload.data.selectedAccount?.id || payload.data.accounts[0]?.id);
        setSelectedAccountId(picked);
      })
      .catch((err: Error) => {
        setError(err.message);
        setTechnicalError(err.stack || err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  function updatePreset(nextPreset: DatePreset) {
    setPreset(nextPreset);
    if (nextPreset !== "custom") setRange(presetRange(nextPreset));
  }

  const currency = data?.selectedAccount?.currency || "VND";
  const campaigns = useMemo(() => data?.report?.campaigns ?? [], [data?.report?.campaigns]);
  const dailyRows = data?.report?.daily ?? [];
  const creatives = useMemo(() => [...(data?.creatives ?? [])].sort((a, b) => b.spend - a.spend).slice(0, 8), [data]);

  const filteredCampaigns = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return campaigns.filter((item) => {
      if (campaignStatusFilter !== "ALL" && (item.status || "UNKNOWN") !== campaignStatusFilter) return false;
      if (!normalizedKeyword) return true;
      return (item.campaignName || "").toLowerCase().includes(normalizedKeyword);
    });
  }, [campaigns, campaignStatusFilter, keyword]);

  const kpi = {
    spend: data?.report?.summary.spend ?? 0,
    results: data?.report?.summary.totalResults ?? 0,
    alerts: data?.accounts.filter((item) => item.account_status && item.account_status !== 1).length ?? 0
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-bold text-outline">Xin chào, {userName}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-on-surface">Dashboard quảng cáo</h2>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">Tổng hợp hiệu suất Meta Ads, creative và cảnh báo tối ưu theo cách dễ hiểu.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Tài khoản">
              <select
                className="dashboard-input"
                value={selectedAccountId}
                onChange={(event) => {
                  setSelectedAccountId(event.target.value);
                  setDefaultAdAccountId(event.target.value);
                }}
              >
                {data?.accounts.length
                  ? data.accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name || account.id}
                      </option>
                    ))
                  : <option>Chưa có tài khoản</option>}
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
            <Button onClick={() => void load(selectedAccountId)} disabled={loading}>
              <MaterialIcon name="refresh" />
              {loading ? "Đang tải..." : "Làm mới"}
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
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Tổng chi tiêu" value={formatMoney(kpi.spend, currency)} icon="payments" />
            <StatCard label="Tổng lead/message" value={formatNumber(kpi.results)} icon="forum" />
            <StatCard label="Cảnh báo tài khoản" value={formatNumber(kpi.alerts)} icon="warning" />
            <StatCard label="Kế hoạch AI" value={formatNumber(planCount)} icon="auto_awesome" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="rounded-3xl p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-lg font-extrabold">Biểu đồ theo ngày</h3>
                  <p className="text-sm text-on-surface-variant">Chọn chỉ số và kiểu biểu đồ: chi phí, CTR hoặc CPC.</p>
                </div>
                <div className="flex gap-2">
                  <select className="dashboard-input" value={metric} onChange={(event) => setMetric(event.target.value as MetricKey)}>
                    <option value="spend">Chi phí quảng cáo</option>
                    <option value="ctr">CTR</option>
                    <option value="cpc">CPC</option>
                  </select>
                  <select className="dashboard-input" value={chartType} onChange={(event) => setChartType(event.target.value as ChartType)}>
                    <option value="line">Đường</option>
                    <option value="bar">Cột</option>
                  </select>
                </div>
              </div>
              <DailyChart rows={dailyRows} metric={metric} chartType={chartType} currency={currency} />
            </Card>

            <Card className="rounded-3xl p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-lg font-extrabold">Đối sánh cùng kỳ</h3>
                  <p className="text-sm text-on-surface-variant">Biểu đồ đối sánh thêm một chỉ số khác trong cùng khoảng thời gian.</p>
                </div>
                <select className="dashboard-input" value={compareMetric} onChange={(event) => setCompareMetric(event.target.value as MetricKey)}>
                  <option value="spend">Chi phí quảng cáo</option>
                  <option value="ctr">CTR</option>
                  <option value="cpc">CPC</option>
                </select>
              </div>
              <DailyChart rows={dailyRows} metric={compareMetric} chartType="bar" currency={currency} compact />
            </Card>
          </section>

          <Card className="overflow-hidden rounded-3xl p-0">
            <div className="flex flex-col gap-3 border-b border-outline-variant/70 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-extrabold">Campaign performance</h3>
                <p className="text-sm text-on-surface-variant">Có bộ lọc trạng thái và từ khóa để xem nhanh theo nhu cầu.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  className="dashboard-input"
                  placeholder="Tìm theo tên campaign..."
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
                <select className="dashboard-input" value={campaignStatusFilter} onChange={(event) => setCampaignStatusFilter(event.target.value)}>
                  <option value="ALL">Tất cả trạng thái</option>
                  {Array.from(new Set(campaigns.map((item) => item.status || "UNKNOWN"))).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <CampaignTable campaigns={filteredCampaigns} currency={currency} />
          </Card>

          {data.creativeAccessWarning ? (
            <Card className="rounded-3xl border border-yellow-300 bg-yellow-50 p-4 text-sm font-semibold text-yellow-900">{data.creativeAccessWarning}</Card>
          ) : null}

          <Card className="overflow-hidden rounded-3xl p-0">
            <div className="border-b border-outline-variant/70 px-6 py-5">
              <h3 className="text-lg font-extrabold">Creative nổi bật</h3>
              <p className="text-sm text-on-surface-variant">Tách rõ tên và mã creative, có link bài post nếu Meta trả về.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    {["Creative", "Campaign", "Ad set", "Chi tiêu", "Lead", "Tin nhắn", "CTR", "Bài post"].map((head) => (
                      <th key={head} className="px-4 py-3 font-extrabold">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/70">
                  {creatives.map((creative) => {
                    const parsed = splitCreativeName(creative.creativeName, creative.creativeId, creative.adId);
                    return (
                      <tr key={creative.adId}>
                        <td className="px-4 py-3">
                          <p className="font-bold">{parsed.title}</p>
                          <p className="font-mono text-[11px] text-outline">{parsed.code}</p>
                        </td>
                        <td className="px-4 py-3">{creative.campaignName}</td>
                        <td className="px-4 py-3">{creative.adsetName}</td>
                        <td className="px-4 py-3">{formatMoney(creative.spend, currency)}</td>
                        <td className="px-4 py-3">{formatNumber(creative.leads)}</td>
                        <td className="px-4 py-3">{formatNumber(creative.messages)}</td>
                        <td className="px-4 py-3">{formatPercent(creative.ctr)}</td>
                        <td className="px-4 py-3">
                          {creative.postUrl ? (
                            <a className="font-bold text-primary hover:underline" href={creative.postUrl} rel="noreferrer" target="_blank">
                              Mở bài post
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
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

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <Card className="rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-on-surface-variant">{label}</p>
        <MaterialIcon className="text-primary" name={icon} />
      </div>
      <p className="text-2xl font-extrabold text-on-surface">{value}</p>
    </Card>
  );
}

function DailyChart({
  rows,
  metric,
  chartType,
  currency,
  compact = false
}: {
  rows: Array<Record<string, string | undefined>>;
  metric: MetricKey;
  chartType: ChartType;
  currency: string;
  compact?: boolean;
}) {
  const values = rows.map((row) => {
    if (metric === "ctr") return Number(row.ctr ?? 0);
    if (metric === "cpc") return Number(row.cpc ?? 0);
    return Number(row.spend ?? 0);
  });

  if (!rows.length || values.every((value) => value === 0)) {
    return <div className="rounded-2xl bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">Không có dữ liệu biểu đồ trong kỳ này.</div>;
  }

  const max = Math.max(...values, 1);
  return (
    <div>
      <svg viewBox="0 0 620 240" className={compact ? "h-52 w-full overflow-visible" : "h-64 w-full overflow-visible"}>
        <line x1="0" x2="620" y1="220" y2="220" stroke="#c2c6d9" />
        {chartType === "line" ? (
          <>
            <polyline
              fill="none"
              points={values
                .map((value, index) => {
                  const x = rows.length === 1 ? 300 : (index / (rows.length - 1)) * 600;
                  const y = 220 - (value / max) * 180;
                  return `${x},${y}`;
                })
                .join(" ")}
              stroke="#004cca"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
            {values.map((value, index) => {
              const x = rows.length === 1 ? 300 : (index / (rows.length - 1)) * 600;
              const y = 220 - (value / max) * 180;
              return <circle key={`dot-${index}`} cx={x} cy={y} fill="#fff" r="5" stroke="#004cca" strokeWidth="3" />;
            })}
          </>
        ) : (
          values.map((value, index) => {
            const barWidth = Math.max(12, 580 / rows.length);
            const x = 20 + index * (600 / rows.length);
            const barHeight = (value / max) * 180;
            const y = 220 - barHeight;
            return <rect key={`bar-${index}`} x={x} y={y} width={barWidth} height={barHeight} rx={6} fill="#3f56c8" />;
          })
        )}
      </svg>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {rows.slice(-3).map((row) => {
          const value = metric === "ctr" ? Number(row.ctr ?? 0) : metric === "cpc" ? Number(row.cpc ?? 0) : Number(row.spend ?? 0);
          return (
            <div key={`${metric}-${row.date_start}`} className="rounded-2xl bg-surface-container-low p-4 text-sm">
              <p className="font-bold text-on-surface">{row.date_start}</p>
              <p className="mt-1 text-on-surface-variant">
                {metricLabel(metric)}: {formatMetricValue(metric, value, currency)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CampaignTable({ campaigns, currency }: { campaigns: NormalizedCampaignPerformance[]; currency: string }) {
  if (!campaigns.length) return <div className="p-8 text-center text-sm text-on-surface-variant">Không có dữ liệu campaign trong kỳ này.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
          <tr>
            {["Campaign", "Status", "Objective", "Spend", "CTR", "CPC", "Kết quả", "Cost/result"].map((head) => (
              <th key={head} className="px-5 py-4 font-extrabold">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/70">
          {campaigns.map((campaign) => (
            <tr key={campaign.campaignId}>
              <td className="max-w-[280px] px-5 py-4 font-bold">{campaign.campaignName}</td>
              <td className="px-5 py-4">{campaign.status || "Không có dữ liệu"}</td>
              <td className="px-5 py-4">{campaign.objective || "Không có dữ liệu"}</td>
              <td className="px-5 py-4">{formatMoney(campaignMetricValue(campaign, "spend"), currency)}</td>
              <td className="px-5 py-4">{formatPercent(campaignMetricValue(campaign, "ctr"))}</td>
              <td className="px-5 py-4">{formatMoney(campaignMetricValue(campaign, "cpc"), currency)}</td>
              <td className="px-5 py-4">{formatNumber(campaign.results)}</td>
              <td className="px-5 py-4">{formatMoney(campaign.costPerResult, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
          <a className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-soft" href="/api/auth/facebook/start?force=1">
            Kết nối lại Facebook và cấp quyền
          </a>
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-3xl bg-white" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="h-96 animate-pulse rounded-3xl bg-white" />
        <div className="h-96 animate-pulse rounded-3xl bg-white" />
      </div>
    </div>
  );
}
