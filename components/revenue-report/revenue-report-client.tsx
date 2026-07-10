"use client";

import { useMemo, useState, type ReactNode } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMoney, formatNumber, formatPercent } from "@/lib/reports/ads-report";
import {
  getRevenueVerificationStatus,
  revenueReportDayStartHour,
  revenueReportTimeZone,
  type RevenuePaymentStatusFilter,
  type RevenueProductCodeFilter,
  type RevenueReport,
  type RevenueSourceSite,
  type AdSpendDataStatus
} from "@/lib/revenue-report";

type DatePreset = "today" | "7d" | "30d" | "this_month" | "last_month" | "custom";
type GroupBy = "day" | "week" | "month";
type DetailView = "none" | "daily" | "products" | "campaigns" | "orders";

type ApiStatus = {
  revenue: { ok: boolean; message?: string; source: string };
  meta: { ok: boolean; accountId: string; accountName: string; message?: string };
  adSpend?: { ok: boolean; message?: string; source: string; dataStatus: AdSpendDataStatus };
};

type ProductSummary = {
  productCode: string;
  productName: string;
  adSpend: number;
  spendDataStatus: AdSpendDataStatus;
  registrations: number;
  orders: number;
  revenue: number;
  profit: number;
  roas: number | null;
  unverifiedPaidOrders: number;
  unverifiedPaidRevenue: number;
};

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function presetRange(preset: DatePreset) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (preset === "7d") start.setDate(start.getDate() - 6);
  if (preset === "30d") start.setDate(start.getDate() - 29);
  if (preset === "this_month") start.setDate(1);
  if (preset === "last_month") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setDate(0);
  }

  return { startDate: isoDate(start), endDate: isoDate(end) };
}

function formatRatio(value: number | null) {
  return value === null ? "N/A" : `${value.toFixed(2)}x`;
}

function formatBusinessDate(value: string | null | undefined) {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10) || "-";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: revenueReportTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatBusinessDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: revenueReportTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function verificationLabel(status: ReturnType<typeof getRevenueVerificationStatus>) {
  if (status === "sepay_verified") return "SePay xác minh";
  if (status === "manual_verified") return "Admin xác minh";
  if (status === "pending_sepay") return "Paid thiếu SePay";
  return "Chưa paid";
}

function verificationClass(status: ReturnType<typeof getRevenueVerificationStatus>) {
  if (status === "sepay_verified" || status === "manual_verified") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "pending_sepay") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-outline-variant bg-surface-container-low text-on-surface-variant";
}

function spendStatusLabel(status: AdSpendDataStatus) {
  if (status === "final") return "Du lieu day du";
  if (status === "partial") return "Dang cap nhat";
  return "Chua co du lieu chi phi";
}

function spendStatusClass(status: AdSpendDataStatus) {
  if (status === "final") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "partial") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function spendKpiValue(value: number, status: AdSpendDataStatus, currency: string) {
  if (status === "missing") return "Chua co du lieu";
  return formatMoney(value, currency);
}

function mergeSpendStatus(statuses: AdSpendDataStatus[]): AdSpendDataStatus {
  if (!statuses.length || statuses.every((status) => status === "missing")) return "missing";
  if (statuses.every((status) => status === "final")) return "final";
  return "partial";
}

export function RevenueReportClient() {
  const [preset, setPreset] = useState<DatePreset>("7d");
  const [range, setRange] = useState(presetRange("7d"));
  const [sourceSite, setSourceSite] = useState<RevenueSourceSite>("all");
  const [paymentStatus, setPaymentStatus] = useState<RevenuePaymentStatusFilter>("all");
  const [productCode, setProductCode] = useState<RevenueProductCodeFilter>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [activeDetail, setActiveDetail] = useState<DetailView>("none");
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updatePreset(value: DatePreset) {
    setPreset(value);
    if (value !== "custom") setRange(presetRange(value));
  }

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        start_date: range.startDate,
        end_date: range.endDate,
        source_site: sourceSite,
        payment_status: paymentStatus,
        product_code: productCode,
        group_by: groupBy
      });
      const response = await fetch(`/api/admin/revenue-report/summary?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không thể tải báo cáo doanh thu.");
      setReport(payload.data);
      setStatus(payload.status);
      setActiveDetail("none");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải báo cáo doanh thu.");
    } finally {
      setLoading(false);
    }
  }

  function exportDaily() {
    if (!report) return;
    downloadCsv(`revenue-daily-${report.dateRange.startDate}-${report.dateRange.endDate}.csv`, [
      [
        "local_date",
        "ad_spend",
        "spend_data_status",
        "report_timezone",
        "meta_day_reset_hour_vn",
        "registrations",
        "verified_orders",
        "verified_revenue",
        "unverified_paid_orders",
        "unverified_paid_revenue",
        "profit",
        "roas",
        "source_site",
        "product_code"
      ],
      ...report.daily.map((row) => [
        row.date,
        row.adSpend,
        row.spendDataStatus,
        row.reportTimezone,
        row.metaDayResetHourVN,
        row.registrations,
        row.orders,
        row.revenue,
        row.unverifiedPaidOrders,
        row.unverifiedPaidRevenue,
        row.profit,
        row.roas ?? "",
        row.sourceSite,
        report.filters.productCode
      ])
    ]);
  }

  function exportOrders() {
    if (!report) return;
    downloadCsv(`revenue-orders-${report.dateRange.startDate}-${report.dateRange.endDate}.csv`, [
      ["order_id", "source_site", "product_code", "product_name", "amount", "payment_status", "payment_method", "sepay_transaction_id", "sepay_reference_code", "revenue_verification", "created_at_vn", "paid_at_vn"],
      ...report.orders.map((order) => [
        order.orderId,
        order.sourceSite,
        order.productCode ?? "",
        order.productName,
        order.amount,
        order.paymentStatus,
        order.paymentMethod ?? "",
        order.sepayTransactionId ?? "",
        order.sepayReferenceCode ?? "",
        getRevenueVerificationStatus(order),
        formatBusinessDateTime(order.createdAt),
        formatBusinessDateTime(order.paidAt)
      ])
    ]);
  }

  const currency = "VND";
  const hasData = Boolean(report && (report.orders.length || report.registrations.length || report.adInsights.length));
  const maxTrendValue = useMemo(() => {
    if (!report?.daily.length) return 1;
    return Math.max(...report.daily.flatMap((row) => [row.adSpend, row.revenue, Math.max(row.profit, 0), row.unverifiedPaidRevenue]), 1);
  }, [report]);

  const productSummary = useMemo<ProductSummary[]>(() => {
    if (!report) return [];
    const map = new Map<string, ProductSummary>();
    for (const row of report.productRows) {
      const current =
        map.get(row.productCode) ??
        ({
          productCode: row.productCode,
          productName: row.productName,
          adSpend: 0,
          spendDataStatus: "missing",
          registrations: 0,
          orders: 0,
          revenue: 0,
          profit: 0,
          roas: null,
          unverifiedPaidOrders: 0,
          unverifiedPaidRevenue: 0
        } satisfies ProductSummary);
      current.adSpend += row.adSpend;
      current.spendDataStatus = mergeSpendStatus([current.spendDataStatus, row.spendDataStatus]);
      current.registrations += row.registrations;
      current.orders += row.orders;
      current.revenue += row.revenue;
      current.unverifiedPaidOrders += row.unverifiedPaidOrders;
      current.unverifiedPaidRevenue += row.unverifiedPaidRevenue;
      map.set(row.productCode, current);
    }
    return Array.from(map.values())
      .map((row) => ({
        ...row,
        profit: row.revenue - row.adSpend,
        roas: row.adSpend > 0 ? row.revenue / row.adSpend : null
      }))
      .sort((a, b) => b.revenue - a.revenue || b.adSpend - a.adSpend);
  }, [report]);

  return (
    <div className="space-y-5">
      <Card className="rounded-lg p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
            <FilterSelect label="Khoảng thời gian" value={preset} onChange={(value) => updatePreset(value as DatePreset)}>
              <option value="today">Hôm nay</option>
              <option value="7d">7 ngày</option>
              <option value="30d">30 ngày</option>
              <option value="this_month">Tháng này</option>
              <option value="last_month">Tháng trước</option>
              <option value="custom">Tùy chỉnh</option>
            </FilterSelect>
            <DateInput label="Từ ngày" value={range.startDate} onChange={(value) => { setPreset("custom"); setRange((current) => ({ ...current, startDate: value })); }} />
            <DateInput label="Đến ngày" value={range.endDate} onChange={(value) => { setPreset("custom"); setRange((current) => ({ ...current, endDate: value })); }} />
            <FilterSelect label="Nguồn" value={sourceSite} onChange={(value) => setSourceSite(value as RevenueSourceSite)}>
              <option value="all">Tất cả</option>
              <option value="adsplan">adsplan</option>
              <option value="theanhmarketing">theanhmarketing</option>
            </FilterSelect>
            <FilterSelect label="Trạng thái" value={paymentStatus} onChange={(value) => setPaymentStatus(value as RevenuePaymentStatusFilter)}>
              <option value="all">Tất cả</option>
              <option value="success">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </FilterSelect>
            <FilterSelect label="Sản phẩm" value={productCode} onChange={(value) => setProductCode(value as RevenueProductCodeFilter)}>
              <option value="all">Tất cả</option>
              <option value="FBA">FBA</option>
              <option value="AIM">AIM</option>
              <option value="unmapped">Chưa gắn mã</option>
            </FilterSelect>
            <FilterSelect label="Nhóm" value={groupBy} onChange={(value) => setGroupBy(value as GroupBy)}>
              <option value="day">Ngày</option>
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
            </FilterSelect>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button onClick={loadReport} disabled={loading}>
              <MaterialIcon name="refresh" />
              {loading ? "Đang tải" : "Tải báo cáo"}
            </Button>
            <Button variant="secondary" onClick={exportDaily} disabled={!report?.daily.length}>
              <MaterialIcon name="download" />
              CSV ngày
            </Button>
            <Button variant="secondary" onClick={exportOrders} disabled={!report?.orders.length}>
              <MaterialIcon name="download" />
              CSV đơn
            </Button>
          </div>
        </div>
        <div className="mt-3 rounded-md border border-outline-variant/70 bg-surface-container-low px-3 py-2 text-xs font-semibold text-on-surface-variant">
          Quy ước: campaign đặt theo Ngày/Tháng - Mã - Biến thể. FBA = Facebook Ads, AIM = AI Master X10 hiệu suất. Doanh thu chính chỉ tính order paid có bằng chứng SePay hoặc admin xác minh.
        </div>
      </Card>

      {status?.meta ? <StatusBanner ok={status.meta.ok} message={status.meta.ok ? `Meta Ads: ${status.meta.accountName} (${status.meta.accountId})` : status.meta.message || "Chưa cấu hình Meta Ads token"} /> : null}
      {status?.revenue && !status.revenue.ok ? <StatusBanner ok={false} message={status.revenue.message || "Chưa có cấu hình doanh thu."} /> : null}
      {status?.adSpend && status.adSpend.dataStatus !== "final" ? (
        <StatusBanner ok={false} message={status.adSpend.message || (status.adSpend.dataStatus === "partial" ? "Chi phi quang cao dang cap nhat." : "Chua co du lieu chi phi quang cao theo gio Viet Nam.")} />
      ) : null}
      {error ? <StatusBanner ok={false} message={error} /> : null}
      {loading ? <SkeletonGrid /> : null}

      {report ? (
        <>
          <StatusBanner ok message="Doanh thu tinh theo ngay Viet Nam. Chi phi quang cao da duoc quy doi theo gio Viet Nam tu du lieu Meta." />
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Doanh thu SePay xác minh" value={formatMoney(report.summary.revenue, currency)} sub={`${formatNumber(report.summary.successfulOrders)} đơn đã xác minh`} icon="verified" tone="primary" />
            <Kpi
              badge={spendStatusLabel(report.summary.spendDataStatus)}
              label="Chi phí quảng cáo"
              value={spendKpiValue(report.summary.adSpend, report.summary.spendDataStatus, currency)}
              sub={report.summary.spendDataStatus === "missing" ? "Không kết luận 0đ khi chưa fetch dữ liệu" : `${formatNumber(report.summary.clicks)} click, ${formatNumber(report.summary.reach)} reach`}
              icon="payments"
              tone={report.summary.spendDataStatus === "final" ? "neutral" : "warning"}
            />
            <Kpi label="Lợi nhuận tạm tính" value={formatMoney(report.summary.profit, currency)} sub="Revenue xác minh trừ ads spend" icon="trending_up" tone={report.summary.profit >= 0 ? "success" : "warning"} />
            <Kpi label="ROAS xác minh" value={formatRatio(report.summary.roas)} sub="Tính theo doanh thu đã đối soát" icon="monitoring" />
            <Kpi label="Paid chờ đối soát" value={formatMoney(report.summary.unverifiedPaidRevenue, currency)} sub={`${formatNumber(report.summary.unverifiedPaidOrders)} đơn paid thiếu SePay`} icon="hourglass_top" tone={report.summary.unverifiedPaidOrders > 0 ? "warning" : "neutral"} />
            <Kpi label="Khách đăng ký" value={formatNumber(report.summary.registrations)} sub={`CPL ${report.summary.cpl === null ? "N/A" : formatMoney(report.summary.cpl, currency)}`} icon="group" />
            <Kpi label="CPA / AOV" value={`${report.summary.cpa === null ? "N/A" : formatMoney(report.summary.cpa, currency)} / ${formatMoney(report.summary.averageOrderValue, currency)}`} sub="Theo đơn đã xác minh" icon="target" />
            <Kpi label="Tỷ lệ đăng ký sang paid" value={report.summary.registrationToPaymentRate === null ? "N/A" : formatPercent(report.summary.registrationToPaymentRate)} sub="Paid đã xác minh trên đăng ký" icon="conversion_path" />
          </section>

          {report.summary.unverifiedPaidOrders > 0 ? (
            <StatusBanner
              ok={false}
              message={`Có ${formatNumber(report.summary.unverifiedPaidOrders)} đơn paid trị giá ${formatMoney(report.summary.unverifiedPaidRevenue, currency)} đang thiếu transaction/reference SePay. Các đơn này đang hiển thị ở chi tiết đơn nhưng chưa cộng vào doanh thu chính.`}
            />
          ) : null}

          <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-lg p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-on-surface">So sánh theo sản phẩm</h2>
                  <p className="text-sm text-on-surface-variant">Doanh thu xác minh, chi phí, lợi nhuận và phần chờ đối soát.</p>
                </div>
                <DetailButton active={activeDetail === "products"} onClick={() => setActiveDetail(activeDetail === "products" ? "none" : "products")}>
                  Chi tiết sản phẩm
                </DetailButton>
              </div>
              <ProductComparison rows={productSummary} max={Math.max(...productSummary.flatMap((row) => [row.revenue, row.adSpend, row.unverifiedPaidRevenue]), 1)} />
            </Card>
            <Card className="rounded-lg p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-on-surface">Xu hướng doanh thu và chi phí</h2>
                  <p className="text-sm text-on-surface-variant">Trend theo ngày, revenue chỉ gồm phần đã xác minh.</p>
                </div>
                <DetailButton active={activeDetail === "daily"} onClick={() => setActiveDetail(activeDetail === "daily" ? "none" : "daily")}>
                  Chi tiết ngày
                </DetailButton>
              </div>
              <DailyBars report={report} max={maxTrendValue} />
            </Card>
          </section>

          <section className="flex flex-wrap gap-2">
            <DetailButton active={activeDetail === "campaigns"} onClick={() => setActiveDetail(activeDetail === "campaigns" ? "none" : "campaigns")}>
              Campaign Meta
            </DetailButton>
            <DetailButton active={activeDetail === "orders"} onClick={() => setActiveDetail(activeDetail === "orders" ? "none" : "orders")}>
              Đơn hàng
            </DetailButton>
            {activeDetail !== "none" ? (
              <Button variant="secondary" onClick={() => setActiveDetail("none")}>
                <MaterialIcon name="close" />
                Đóng chi tiết
              </Button>
            ) : null}
          </section>

          {activeDetail === "daily" ? <DailyDetailTable report={report} currency={currency} /> : null}
          {activeDetail === "products" ? <ProductDetailTable report={report} currency={currency} /> : null}
          {activeDetail === "campaigns" ? <CampaignDetailTable report={report} currency={currency} /> : null}
          {activeDetail === "orders" ? <OrdersDetailTable report={report} currency={currency} /> : null}

          {!hasData ? <StatusBanner ok={false} message="Chưa có dữ liệu doanh thu hoặc Meta trong khoảng thời gian này." /> : null}
        </>
      ) : !loading ? (
        <Card className="rounded-lg p-8 text-center">
          <MaterialIcon className="mx-auto mb-3 text-4xl text-primary" name="analytics" />
          <h2 className="text-xl font-extrabold">Chọn bộ lọc và tải báo cáo</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">Báo cáo chỉ tải dữ liệu thật từ Meta, orders/leads và bằng chứng SePay server-side.</p>
        </Card>
      ) : null}
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold text-on-surface-variant">{label}</span>
      <select className="dashboard-input h-10 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold text-on-surface-variant">{label}</span>
      <input className="dashboard-input h-10 text-sm" type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function StatusBanner({ ok, message }: { ok: boolean; message: string }) {
  return (
    <div className={`rounded-lg border p-4 text-sm font-semibold ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      {message}
    </div>
  );
}

function SkeletonGrid() {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-lg bg-white" />)}</div>;
}

function Kpi({ label, value, sub, icon, tone = "neutral", badge }: { label: string; value: string; sub: string; icon: string; tone?: "neutral" | "primary" | "success" | "warning"; badge?: string }) {
  const iconClass = tone === "primary" ? "text-primary" : tone === "success" ? "text-emerald-600" : tone === "warning" ? "text-amber-600" : "text-on-surface-variant";
  return (
    <Card className="rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-on-surface-variant">{label}</p>
        <div className="flex items-center gap-2">
          {badge ? <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${spendStatusClass(badge === "Du lieu day du" ? "final" : badge === "Dang cap nhat" ? "partial" : "missing")}`}>{badge}</span> : null}
          <MaterialIcon className={iconClass} name={icon} />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-on-surface">{value}</p>
      <p className="mt-1 text-xs font-medium text-on-surface-variant">{sub}</p>
    </Card>
  );
}

function DetailButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button variant={active ? "primary" : "secondary"} onClick={onClick}>
      <MaterialIcon name={active ? "visibility" : "visibility_off"} />
      {children}
    </Button>
  );
}

function ProductComparison({ rows, max }: { rows: ProductSummary[]; max: number }) {
  if (!rows.length) return <div className="rounded-md bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">Chưa có dữ liệu sản phẩm trong khoảng thời gian này.</div>;

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.productCode} className="rounded-lg border border-outline-variant/70 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-black text-primary">{row.productCode}</span>
                <h3 className="font-extrabold text-on-surface">{row.productName}</h3>
              </div>
              <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                {formatNumber(row.orders)} đơn xác minh, {formatNumber(row.registrations)} đăng ký, ROAS {formatRatio(row.roas)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-on-surface">{formatMoney(row.profit, "VND")}</p>
              <p className="text-xs font-semibold text-on-surface-variant">Profit</p>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <MetricBar label="Revenue" value={row.revenue} max={max} color="bg-primary" />
            <MetricBar label="Spend" value={row.adSpend} max={max} color="bg-slate-400" />
            <MetricBar label="Chờ đối soát" value={row.unverifiedPaidRevenue} max={max} color="bg-amber-400" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyBars({ report, max }: { report: RevenueReport; max: number }) {
  if (!report.daily.length) return <div className="rounded-md bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">Chưa có dữ liệu theo ngày.</div>;

  return (
    <div className="space-y-3">
      {report.daily.map((row) => (
        <div key={row.date} className="grid gap-2 text-sm md:grid-cols-[96px_1fr_1fr_1fr] md:items-center">
          <span className="font-bold text-on-surface">{row.date}</span>
          <MetricBar label="Spend" value={row.adSpend} max={max} color="bg-slate-400" />
          <MetricBar label="Revenue" value={row.revenue} max={max} color="bg-primary" />
          <MetricBar label="Pending" value={row.unverifiedPaidRevenue} max={max} color="bg-amber-400" />
        </div>
      ))}
    </div>
  );
}

function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-on-surface-variant">
        <span>{label}</span>
        <span>{formatMoney(value, "VND")}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-container">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value <= 0 ? 0 : Math.max(2, Math.min(100, (value / max) * 100))}%` }} />
      </div>
    </div>
  );
}

function DailyDetailTable({ report, currency }: { report: RevenueReport; currency: string }) {
  return (
    <DataTable title="Chi tiết theo ngày" minWidth="1060px">
      <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
        <tr>{["Ngày", "Spend", "Spend status", "Registrations", "Đơn xác minh", "Revenue xác minh", "Paid chờ SePay", "Giá trị chờ", "Profit", "ROAS"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-outline-variant/70">
        {report.daily.map((row) => (
          <tr key={row.date}>
            <td className="px-4 py-3 font-bold">{row.date}</td>
            <td className="px-4 py-3">{formatMoney(row.adSpend, currency)}</td>
            <td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-xs font-bold ${spendStatusClass(row.spendDataStatus)}`}>{spendStatusLabel(row.spendDataStatus)}</span></td>
            <td className="px-4 py-3">{formatNumber(row.registrations)}</td>
            <td className="px-4 py-3">{formatNumber(row.orders)}</td>
            <td className="px-4 py-3">{formatMoney(row.revenue, currency)}</td>
            <td className="px-4 py-3">{formatNumber(row.unverifiedPaidOrders)}</td>
            <td className="px-4 py-3">{formatMoney(row.unverifiedPaidRevenue, currency)}</td>
            <td className="px-4 py-3">{formatMoney(row.profit, currency)}</td>
            <td className="px-4 py-3">{formatRatio(row.roas)}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function ProductDetailTable({ report, currency }: { report: RevenueReport; currency: string }) {
  return (
    <DataTable title="Chi tiết theo sản phẩm" minWidth="1120px">
      <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
        <tr>{["Kỳ", "Mã", "Sản phẩm", "Spend", "Revenue xác minh", "Profit", "ROAS", "Orders", "Registrations", "Paid chờ", "Giá trị chờ"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-outline-variant/70">
        {report.productRows.map((row) => (
          <tr key={`${row.bucket}-${row.productCode}`}>
            <td className="px-4 py-3 font-bold">{row.bucket}</td>
            <td className="px-4 py-3">{row.productCode}</td>
            <td className="px-4 py-3">{row.productName}</td>
            <td className="px-4 py-3">{formatMoney(row.adSpend, currency)}</td>
            <td className="px-4 py-3">{formatMoney(row.revenue, currency)}</td>
            <td className="px-4 py-3">{formatMoney(row.profit, currency)}</td>
            <td className="px-4 py-3">{formatRatio(row.roas)}</td>
            <td className="px-4 py-3">{formatNumber(row.orders)}</td>
            <td className="px-4 py-3">{formatNumber(row.registrations)}</td>
            <td className="px-4 py-3">{formatNumber(row.unverifiedPaidOrders)}</td>
            <td className="px-4 py-3">{formatMoney(row.unverifiedPaidRevenue, currency)}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function CampaignDetailTable({ report, currency }: { report: RevenueReport; currency: string }) {
  return (
    <DataTable title="Campaign Meta theo quy ước" minWidth="980px">
      <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
        <tr>{["Ngày", "Campaign", "Mã", "Sản phẩm", "Biến thể", "Spend", "Clicks"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-outline-variant/70">
        {report.adInsights.map((row, index) => (
          <tr key={`${row.date}-${row.campaignId || index}`}>
            <td className="px-4 py-3 font-bold">{row.campaignDate || row.date}</td>
            <td className="px-4 py-3">{row.campaignName || "-"}</td>
            <td className="px-4 py-3">{row.productCode || "-"}</td>
            <td className="px-4 py-3">{row.productName || "Chưa gắn mã"}</td>
            <td className="px-4 py-3">{row.campaignVariant || "-"}</td>
            <td className="px-4 py-3">{formatMoney(row.spend, currency)}</td>
            <td className="px-4 py-3">{formatNumber(row.clicks)}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function OrdersDetailTable({ report, currency }: { report: RevenueReport; currency: string }) {
  return (
    <DataTable title="Đơn hàng và đối soát SePay" minWidth="1260px">
      <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
        <tr>{["Order", "Nguồn", "Mã", "Sản phẩm", "Số tiền", "Status", "Xác minh", "SePay ID", "Reference", "Ngày tạo", "Ngày paid"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-outline-variant/70">
        {report.orders.map((order) => {
          const verification = getRevenueVerificationStatus(order);
          return (
            <tr key={order.orderId}>
              <td className="px-4 py-3 font-bold">{order.orderId}</td>
              <td className="px-4 py-3">{order.sourceSite}</td>
              <td className="px-4 py-3">{order.productCode || "-"}</td>
              <td className="px-4 py-3">{order.productName}</td>
              <td className="px-4 py-3">{formatMoney(order.amount, currency)}</td>
              <td className="px-4 py-3">{order.paymentStatus}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${verificationClass(verification)}`}>{verificationLabel(verification)}</span>
              </td>
              <td className="px-4 py-3">{order.sepayTransactionId || "-"}</td>
              <td className="px-4 py-3">{order.sepayReferenceCode || "-"}</td>
              <td className="px-4 py-3">{formatBusinessDate(order.createdAt)}</td>
              <td className="px-4 py-3">{formatBusinessDate(order.paidAt)}</td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}

function DataTable({ title, minWidth, children }: { title: string; minWidth: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-lg p-0">
      <div className="border-b border-outline-variant/70 px-5 py-4">
        <h2 className="text-lg font-extrabold text-on-surface">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </Card>
  );
}
