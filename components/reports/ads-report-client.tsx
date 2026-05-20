"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCachedJson, getCachedState, setCachedState } from "@/lib/meta/client-cache";
import { applyDefaultAdAccount, getDefaultAdAccountId, setDefaultAdAccountId } from "@/lib/meta/default-account";
import type { AdAccount, AdsReport, BreakdownRow, BreakdownType, DailyInsight } from "@/lib/meta/types";
import { exportReportToCSV, formatMoney, formatNumber, formatPercent } from "@/lib/reports/ads-report";

type DatePreset = "today" | "yesterday" | "7d" | "30d" | "month" | "custom";
type SortKey = "spend" | "ctr" | "cpc";
type ChartMetric = "spend" | "ctr" | "cpc";
type ChartType = "line" | "bar";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPresetRange(preset: DatePreset) {
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
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

const REPORT_CACHE_KEY = "reports:ads";

async function readJson<T>(url: string, options?: { force?: boolean }) {
  return getCachedJson<T>(url, options);
}

function metricValue(row: DailyInsight, metric: ChartMetric) {
  if (metric === "ctr") return Number(row.ctr ?? 0);
  if (metric === "cpc") return Number(row.cpc ?? 0);
  return Number(row.spend ?? 0);
}

function metricLabel(metric: ChartMetric) {
  if (metric === "ctr") return "CTR";
  if (metric === "cpc") return "CPC";
  return "Chi tiêu";
}

function formatMetricValue(value: number, metric: ChartMetric, currency: string) {
  if (metric === "ctr") return formatPercent(value);
  return formatMoney(value, currency);
}

export function AdsReportClient() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [preset, setPreset] = useState<DatePreset>("7d");
  const [range, setRange] = useState(getPresetRange("7d"));
  const [report, setReport] = useState<AdsReport | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownType>("age");
  const [breakdownRows, setBreakdownRows] = useState<BreakdownRow[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [campaignKeyword, setCampaignKeyword] = useState("");
  const [campaignStatus, setCampaignStatus] = useState("ALL");
  const [campaignObjective, setCampaignObjective] = useState("ALL");
  const [primaryMetric, setPrimaryMetric] = useState<ChartMetric>("spend");
  const [compareMetric, setCompareMetric] = useState<ChartMetric>("ctr");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [loading, setLoading] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [error, setError] = useState("");
  const [technicalError, setTechnicalError] = useState("");

  useEffect(() => {
    const cached = getCachedState<{
      accounts: AdAccount[];
      selectedAccountId: string;
      preset: DatePreset;
      range: { startDate: string; endDate: string };
      report: AdsReport | null;
      breakdownRows: BreakdownRow[];
      breakdown: BreakdownType;
    }>(REPORT_CACHE_KEY);
    if (cached) {
      queueMicrotask(() => {
              setAccounts(cached.accounts);
              setSelectedAccountId(cached.selectedAccountId);
              setPreset(cached.preset);
              setRange(cached.range);
              setReport(cached.report);
              setBreakdownRows(cached.breakdownRows);
              setBreakdown(cached.breakdown);
      });
      return;
    }

    readJson<{ data: AdAccount[] }>("/api/meta/adaccounts")
      .then((payload) => {
        const rows = payload.data ?? [];
        setAccounts(rows);
        const preferred = applyDefaultAdAccount(rows, getDefaultAdAccountId() || rows[0]?.id);
        setSelectedAccountId(preferred);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  function updatePreset(value: DatePreset) {
    setPreset(value);
    if (value !== "custom") setRange(getPresetRange(value));
  }

  async function loadReport() {
    if (!selectedAccountId) {
      setError("Chưa chọn tài khoản quảng cáo.");
      return;
    }
    setLoading(true);
    setError("");
    setTechnicalError("");
    setBreakdownRows([]);

    try {
      const query = new URLSearchParams({
        ad_account_id: selectedAccountId,
        start_date: range.startDate,
        end_date: range.endDate
      });
      const payload = await readJson<{ data: AdsReport }>(`/api/meta/report?${query.toString()}`, { force: true });
      setReport(payload.data);
      setCachedState(REPORT_CACHE_KEY, {
        accounts,
        selectedAccountId,
        preset,
        range,
        report: payload.data,
        breakdownRows: [],
        breakdown
      });
      if (!payload.data.campaigns.length) setError("Không có dữ liệu trong khoảng thời gian này.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lấy báo cáo.");
      setTechnicalError(err instanceof Error ? err.stack || err.message : "");
    } finally {
      setLoading(false);
    }
  }

  async function loadBreakdown(nextBreakdown = breakdown) {
    if (!selectedAccountId) return;
    setBreakdown(nextBreakdown);
    setBreakdownLoading(true);
    setBreakdownRows([]);
    try {
      const query = new URLSearchParams({
        ad_account_id: selectedAccountId,
        start_date: range.startDate,
        end_date: range.endDate,
        breakdown: nextBreakdown
      });
      const payload = await readJson<{ data: BreakdownRow[] }>(`/api/meta/breakdown?${query.toString()}`, { force: true });
      setBreakdownRows(payload.data ?? []);
      setCachedState(REPORT_CACHE_KEY, {
        accounts,
        selectedAccountId,
        preset,
        range,
        report,
        breakdownRows: payload.data ?? [],
        breakdown: nextBreakdown
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Breakdown chưa khả dụng.");
    } finally {
      setBreakdownLoading(false);
    }
  }

  function downloadCsv() {
    if (!report) return;
    const csv = exportReportToCSV(report);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const accountId = report.account?.id ?? selectedAccountId;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ads-report-${accountId}-${report.dateRange.startDate}-${report.dateRange.endDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const selectedAccount = accounts.find((item) => item.id === selectedAccountId);
  const currency = selectedAccount?.currency || "VND";
  const sortedCampaigns = useMemo(() => {
    const keyword = campaignKeyword.trim().toLowerCase();
    return [...(report?.campaigns ?? [])]
      .filter((campaign) => {
        if (campaignStatus !== "ALL" && (campaign.status || "UNKNOWN") !== campaignStatus) return false;
        if (campaignObjective !== "ALL" && (campaign.objective || "UNKNOWN") !== campaignObjective) return false;
        if (!keyword) return true;
        return campaign.campaignName.toLowerCase().includes(keyword) || campaign.campaignId.toLowerCase().includes(keyword);
      })
      .sort((a, b) => b[sortKey] - a[sortKey]);
  }, [campaignKeyword, campaignObjective, campaignStatus, report, sortKey]);

  return (
    <div className="space-y-6">
      <Card className="rounded-lg p-5">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-end">
          <label className="space-y-2">
            <span className="text-sm font-bold text-on-surface">Tài khoản quảng cáo</span>
            <select
              className="h-12 w-full rounded-md border border-outline-variant bg-white px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
              value={selectedAccountId}
              onChange={(event) => {
                setSelectedAccountId(event.target.value);
                setDefaultAdAccountId(event.target.value);
              }}
            >
              {accounts.length
                ? accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name || account.id} - {account.id}
                    </option>
                  ))
                : <option>Chưa có tài khoản quảng cáo</option>}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-2 sm:col-span-1">
              <span className="text-sm font-bold text-on-surface">Khoảng thời gian</span>
              <select
                className="h-12 w-full rounded-md border border-outline-variant bg-white px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                value={preset}
                onChange={(event) => updatePreset(event.target.value as DatePreset)}
              >
                <option value="today">Hôm nay</option>
                <option value="yesterday">Hôm qua</option>
                <option value="7d">7 ngày qua</option>
                <option value="30d">30 ngày qua</option>
                <option value="month">Tháng này</option>
                <option value="custom">Tùy chỉnh</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-on-surface">Ngày bắt đầu</span>
              <input
                className="h-12 w-full rounded-md border border-outline-variant bg-white px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                type="date"
                value={range.startDate}
                onChange={(event) => {
                  setPreset("custom");
                  setRange((current) => ({ ...current, startDate: event.target.value }));
                }}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-on-surface">Ngày kết thúc</span>
              <input
                className="h-12 w-full rounded-md border border-outline-variant bg-white px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                type="date"
                value={range.endDate}
                onChange={(event) => {
                  setPreset("custom");
                  setRange((current) => ({ ...current, endDate: event.target.value }));
                }}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={loadReport} disabled={loading || !selectedAccountId}>
              <MaterialIcon name="refresh" />
              {loading ? "Đang lấy..." : "Lấy báo cáo"}
            </Button>
            <Button variant="secondary" onClick={downloadCsv} disabled={!report}>
              <MaterialIcon name="download" />
              Xuất CSV
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="rounded-lg border border-error-container bg-error-container/60 p-5">
          <div className="flex items-start gap-3">
            <MaterialIcon className="text-error" name="error" />
            <div>
              <p className="font-bold text-error">{error}</p>
              {technicalError ? (
                <details className="mt-2 text-xs text-on-surface-variant">
                  <summary className="cursor-pointer font-bold">Xem chi tiết kỹ thuật</summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3">{technicalError}</pre>
                </details>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      {loading ? <ReportSkeleton /> : null}

      {report ? (
        <>
          <KpiGrid report={report} currency={currency} />

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="rounded-lg p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-lg font-extrabold">Biểu đồ theo ngày</h3>
                  <p className="text-sm text-on-surface-variant">Chọn chỉ số và kiểu biểu đồ để xem theo từng ngày.</p>
                </div>
                <div className="flex gap-2">
                  <select className="dashboard-input" value={primaryMetric} onChange={(event) => setPrimaryMetric(event.target.value as ChartMetric)}>
                    <option value="spend">Chi tiêu</option>
                    <option value="ctr">CTR</option>
                    <option value="cpc">CPC</option>
                  </select>
                  <select className="dashboard-input" value={chartType} onChange={(event) => setChartType(event.target.value as ChartType)}>
                    <option value="line">Đường</option>
                    <option value="bar">Cột</option>
                  </select>
                </div>
              </div>
              <DailyMetricChart rows={report.daily} metric={primaryMetric} chartType={chartType} currency={currency} />
            </Card>

            <Card className="rounded-lg p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-lg font-extrabold">Biểu đồ đối sánh cùng kỳ</h3>
                  <p className="text-sm text-on-surface-variant">Đối sánh thêm một chỉ số khác trong cùng khoảng thời gian.</p>
                </div>
                <select className="dashboard-input" value={compareMetric} onChange={(event) => setCompareMetric(event.target.value as ChartMetric)}>
                  <option value="spend">Chi tiêu</option>
                  <option value="ctr">CTR</option>
                  <option value="cpc">CPC</option>
                </select>
              </div>
              <DailyMetricChart rows={report.daily} metric={compareMetric} chartType="bar" currency={currency} compact />
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="hidden overflow-hidden rounded-lg p-0">
              <div className="flex flex-col gap-3 border-b border-outline-variant/70 px-6 py-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-extrabold">Campaign Performance</h3>
                  <p className="text-sm text-on-surface-variant">Sắp xếp nhanh theo chi tiêu, CTR hoặc CPC.</p>
                </div>
                <select
                  className="h-11 rounded-md border border-outline-variant bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary"
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                >
                  <option value="spend">Sort theo chi tiêu</option>
                  <option value="ctr">Sort theo CTR</option>
                  <option value="cpc">Sort theo CPC</option>
                </select>
              </div>
              <CampaignTable rows={sortedCampaigns} currency={currency} />
            </Card>

            <Card className="rounded-lg p-6">
              <div className="mb-5 flex items-center gap-2">
                <MaterialIcon className="text-primary" filled name="auto_awesome" />
                <h3 className="text-lg font-extrabold">Nhận định AI</h3>
              </div>
              <div className="space-y-3">
                {report.insights.map((item) => (
                  <div key={item} className="rounded-md bg-surface-container-low p-4 text-sm leading-6 text-on-surface-variant">
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden rounded-lg p-0">
            <div className="border-b border-outline-variant/70 px-6 py-5">
              <h3 className="text-lg font-extrabold">Campaign Performance</h3>
              <p className="text-sm text-on-surface-variant">Bảng báo cáo đầy đủ chỉ số, đặt dưới biểu đồ để có đủ chiều ngang.</p>
            </div>
            <div className="grid gap-2 border-b border-outline-variant/70 px-6 py-4 md:grid-cols-4">
              <input
                className="dashboard-input"
                placeholder="Tìm campaign hoặc ID..."
                value={campaignKeyword}
                onChange={(event) => setCampaignKeyword(event.target.value)}
              />
              <select className="dashboard-input" value={campaignStatus} onChange={(event) => setCampaignStatus(event.target.value)}>
                <option value="ALL">Tất cả trạng thái</option>
                {Array.from(new Set((report?.campaigns ?? []).map((campaign) => campaign.status || "UNKNOWN"))).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select className="dashboard-input" value={campaignObjective} onChange={(event) => setCampaignObjective(event.target.value)}>
                <option value="ALL">Tất cả objective</option>
                {Array.from(new Set((report?.campaigns ?? []).map((campaign) => campaign.objective || "UNKNOWN"))).map((objective) => (
                  <option key={objective} value={objective}>
                    {objective}
                  </option>
                ))}
              </select>
              <select className="dashboard-input" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                <option value="spend">Sắp xếp theo chi tiêu</option>
                <option value="ctr">Sắp xếp theo CTR</option>
                <option value="cpc">Sắp xếp theo CPC</option>
              </select>
            </div>
            <CampaignTable rows={sortedCampaigns} currency={currency} />
          </Card>

          <Card className="rounded-lg p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-extrabold">Breakdown</h3>
                <p className="text-sm text-on-surface-variant">Xem nhanh theo tuổi, giới tính hoặc placement nếu Meta hỗ trợ.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["age", "gender", "placement"] as BreakdownType[]).map((item) => (
                  <Button key={item} variant={breakdown === item ? "primary" : "secondary"} onClick={() => void loadBreakdown(item)} disabled={breakdownLoading}>
                    {item === "age" ? "Age" : item === "gender" ? "Gender" : "Placement"}
                  </Button>
                ))}
              </div>
            </div>
            <BreakdownTable rows={breakdownRows} loading={breakdownLoading} breakdown={breakdown} currency={currency} />
          </Card>
        </>
      ) : !loading ? (
        <Card className="rounded-lg p-8 text-center">
          <MaterialIcon className="mx-auto mb-3 text-4xl text-primary" name="monitoring" />
          <h3 className="text-xl font-extrabold">Chọn tài khoản và lấy báo cáo</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
            Báo cáo sẽ hiển thị KPI, biểu đồ theo ngày, bảng campaign, breakdown và nhận định tự động.
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function KpiGrid({ report, currency }: { report: AdsReport; currency: string }) {
  const items = [
    ["Tổng chi tiêu", formatMoney(report.summary.spend, currency), "payments"],
    ["Tổng lượt hiển thị", formatNumber(report.summary.impressions), "visibility"],
    ["CTR trung bình", formatPercent(report.summary.averageCtr), "ads_click"],
    ["CPC trung bình", formatMoney(report.summary.averageCpc, currency), "mouse"],
    ["CPM trung bình", formatMoney(report.summary.averageCpm, currency), "speed"],
    ["Tổng kết quả", formatNumber(report.summary.totalResults), "flag"],
    ["Chi phí mỗi kết quả", formatMoney(report.summary.costPerResult, currency), "target"],
    ["ROAS", report.summary.roas ? `${report.summary.roas.toFixed(2)}x` : "Chưa có", "trending_up"]
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value, icon]) => (
        <Card key={label} className="rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-on-surface-variant">{label}</p>
            <MaterialIcon className="text-primary" name={icon} />
          </div>
          <p className="text-2xl font-extrabold text-on-surface">{value}</p>
        </Card>
      ))}
    </div>
  );
}

function DailyMetricChart({
  rows,
  metric,
  chartType,
  currency,
  compact = false
}: {
  rows: DailyInsight[];
  metric: ChartMetric;
  chartType: ChartType;
  currency: string;
  compact?: boolean;
}) {
  if (!rows.length) {
    return <div className="rounded-md bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">Chưa có dữ liệu theo ngày.</div>;
  }
  const values = rows.map((row) => metricValue(row, metric));
  const max = Math.max(...values, 1);

  return (
    <div>
      <svg viewBox="0 0 620 240" className={compact ? "h-52 w-full overflow-visible" : "h-64 w-full overflow-visible"}>
        <line x1="0" x2="620" y1="220" y2="220" stroke="#c2c6d9" strokeWidth="1" />
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
              return <circle key={`dot-${index}`} cx={x} cy={y} fill="#ffffff" r="5" stroke="#004cca" strokeWidth="3" />;
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
        {rows.slice(-3).map((row) => (
          <div key={`${metric}-${row.date_start}`} className="rounded-md bg-surface-container-low p-4 text-sm">
            <p className="font-bold text-on-surface">{row.date_start}</p>
            <p className="mt-1 text-on-surface-variant">
              {metricLabel(metric)}: {formatMetricValue(metricValue(row, metric), metric, currency)}
            </p>
            <p className="text-on-surface-variant">CTR: {formatPercent(Number(row.ctr ?? 0))}</p>
            <p className="text-on-surface-variant">CPC: {formatMoney(Number(row.cpc ?? 0), currency)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignTable({ rows, currency }: { rows: AdsReport["campaigns"]; currency: string }) {
  if (!rows.length) {
    return <div className="p-8 text-center text-sm text-on-surface-variant">Không có campaign nào trong khoảng thời gian này.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
          <tr>
            {["Campaign", "Status", "Objective", "Spend", "Impressions", "Reach", "CTR", "CPC", "CPM", "Results", "Cost/result", "ROAS"].map(
              (head) => (
                <th key={head} className="px-5 py-4 font-extrabold">
                  {head}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/70">
          {rows.map((row) => (
            <tr key={row.campaignId} className="hover:bg-surface-container-lowest">
              <td className="max-w-[260px] px-5 py-4 font-bold text-on-surface">{row.campaignName}</td>
              <td className="px-5 py-4">{row.status || "Chưa rõ"}</td>
              <td className="px-5 py-4">{row.objective || "Chưa rõ"}</td>
              <td className="px-5 py-4">{formatMoney(row.spend, currency)}</td>
              <td className="px-5 py-4">{formatNumber(row.impressions)}</td>
              <td className="px-5 py-4">{formatNumber(row.reach)}</td>
              <td className="px-5 py-4">{formatPercent(row.ctr)}</td>
              <td className="px-5 py-4">{formatMoney(row.cpc, currency)}</td>
              <td className="px-5 py-4">{formatMoney(row.cpm, currency)}</td>
              <td className="px-5 py-4">{formatNumber(row.results)}</td>
              <td className="px-5 py-4">{formatMoney(row.costPerResult, currency)}</td>
              <td className="px-5 py-4">{row.roas ? `${row.roas.toFixed(2)}x` : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BreakdownTable({
  rows,
  loading,
  breakdown,
  currency
}: {
  rows: BreakdownRow[];
  loading: boolean;
  breakdown: BreakdownType;
  currency: string;
}) {
  if (loading) return <div className="rounded-md bg-surface-container-low p-6 text-sm font-bold text-on-surface-variant">Đang lấy breakdown...</div>;
  if (!rows.length) return <div className="rounded-md bg-surface-container-low p-6 text-sm text-on-surface-variant">Chưa có dữ liệu breakdown hoặc breakdown này chưa được Meta hỗ trợ.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
          <tr>
            <th className="px-4 py-3">{breakdown === "placement" ? "Placement" : breakdown}</th>
            <th className="px-4 py-3">Campaign</th>
            <th className="px-4 py-3">Chi tiêu</th>
            <th className="px-4 py-3">Lượt hiển thị</th>
            <th className="px-4 py-3">CTR</th>
            <th className="px-4 py-3">CPC</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/70">
          {rows.map((row, index) => (
            <tr key={`${row.campaign_id}-${index}`}>
              <td className="px-4 py-3 font-bold">{row.age || row.gender || row.publisher_platform || row.platform_position || "Khác"}</td>
              <td className="px-4 py-3">{row.campaign_name || "Campaign"}</td>
              <td className="px-4 py-3">{formatMoney(Number(row.spend ?? 0), currency)}</td>
              <td className="px-4 py-3">{formatNumber(Number(row.impressions ?? 0))}</td>
              <td className="px-4 py-3">{formatPercent(Number(row.ctr ?? 0))}</td>
              <td className="px-4 py-3">{formatMoney(Number(row.cpc ?? 0), currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-lg bg-white" />
      ))}
    </div>
  );
}

