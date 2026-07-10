"use client";

import type { AdsMetricKey, DailyMetricRow, WeeklyRow } from "@/lib/ads/metrics";
import { formatMetric, metricLabel, metricValue } from "@/lib/ads/metrics";

export function PerformanceChart({ rows, metric, currency }: { rows: DailyMetricRow[]; metric: AdsMetricKey; currency: string }) {
  const values = rows.map((row) => metricValue(row, metric));
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = total / Math.max(values.length, 1);
  const lowerIsBetter = metric === "cpc" || metric === "cpm" || metric === "cpl" || metric === "cpa";
  const peak = rows.reduce((best, row) => {
    const current = metricValue(row, metric);
    const bestValue = metricValue(best, metric);
    return lowerIsBetter ? (current > 0 && current < bestValue ? row : best) : current > bestValue ? row : best;
  }, rows.find((row) => metricValue(row, metric) > 0) ?? rows[0]);
  const points = rows.map((row, index) => {
    const x = (index / Math.max(1, rows.length - 1)) * 100;
    const y = 100 - (metricValue(row, metric) / max) * 76 - 10;
    return `${x},${y}`;
  }).join(" ");

  if (!rows.length) {
    return <div className="grid min-h-72 place-items-center rounded-[8px] border border-dashed border-[#dce3ee] bg-[#fbfdff] text-[12px] text-[#667085]">Không có dữ liệu theo ngày trong kỳ này.</div>;
  }

  return (
    <div>
      <div className="mb-3 grid gap-2 md:grid-cols-3">
        <SummaryBox label="Tổng trong kỳ" value={formatMetric(metric, total, currency)} />
        <SummaryBox label="Trung bình/ngày" value={formatMetric(metric, average, currency)} />
        <SummaryBox label={lowerIsBetter ? "Ngày thấp nhất" : "Ngày cao nhất"} value={`${peak?.label ?? "--"} · ${formatMetric(metric, metricValue(peak, metric), currency)}`} />
      </div>
      <div className="h-[310px] rounded-[8px] border border-[#e8edf5] bg-[#fbfdff] p-3">
        <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
          {[20, 40, 60, 80].map((y) => <line key={y} stroke="#e5eaf0" strokeWidth="1" vectorEffect="non-scaling-stroke" x1="0" x2="100" y1={y} y2={y} />)}
          <polygon fill="rgba(79,70,229,0.10)" points={`0,100 ${points} 100,100`} />
          <polyline fill="none" points={points} stroke="#4f46e5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-[#667085]">
        <span>{rows[0]?.label}</span>
        <span>{metricLabel(metric)}</span>
        <span>{rows[rows.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function SpendLeadComboChart({ rows, currency }: { rows: DailyMetricRow[]; currency: string }) {
  if (!rows.length) return <div className="grid min-h-64 place-items-center rounded-[8px] border border-dashed border-[#dce3ee] text-[12px] text-[#667085]">Không có dữ liệu ngày.</div>;
  const spendMax = Math.max(...rows.map((row) => row.spend), 1);
  const leadMax = Math.max(...rows.map((row) => row.messages + row.leads), 1);
  const spendPoints = rows.map((row, index) => `${(index / Math.max(1, rows.length - 1)) * 100},${100 - (row.spend / spendMax) * 76 - 10}`).join(" ");
  const leadPoints = rows.map((row, index) => `${(index / Math.max(1, rows.length - 1)) * 100},${100 - ((row.messages + row.leads) / leadMax) * 76 - 10}`).join(" ");
  return (
    <div>
      <div className="mb-3 flex justify-center gap-4 text-[11px] text-[#667085]"><span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-[#3f6680]" /> Spend</span><span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-[#b66424]" /> Leads/Tin nhắn</span></div>
      <div className="h-[280px] rounded-[8px] border border-[#e8edf5] bg-[#fbfdff] p-3">
        <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
          {[20, 40, 60, 80].map((y) => <line key={y} stroke="#e5eaf0" strokeWidth="1" vectorEffect="non-scaling-stroke" x1="0" x2="100" y1={y} y2={y} />)}
          <polyline fill="none" points={spendPoints} stroke="#3f6680" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
          <polyline fill="none" points={leadPoints} stroke="#b66424" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-2 text-center text-[10px] text-[#667085]">Đỉnh spend {formatMetric("spend", spendMax, currency)} · Đỉnh lead {leadMax}</div>
    </div>
  );
}

export function WeeklyComparisonChart({ rows }: { rows: WeeklyRow[] }) {
  if (!rows.length) return <div className="grid min-h-56 place-items-center rounded-[8px] border border-dashed border-[#dce3ee] text-[12px] text-[#667085]">Không có dữ liệu tuần.</div>;
  const spendMax = Math.max(...rows.map((row) => row.spend), 1);
  const leadMax = Math.max(...rows.map((row) => row.messages + row.leads), 1);
  return (
    <div className="flex h-[260px] items-end gap-4 border-b border-[#dce3ee] px-2">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-[220px] items-end gap-1.5">
            <div className="w-7 rounded-t-[5px] bg-[#3f6680]" style={{ height: `${(row.spend / spendMax) * 100}%` }} />
            <div className="w-7 rounded-t-[5px] bg-[#b66424]" style={{ height: `${((row.messages + row.leads) / leadMax) * 100}%` }} />
          </div>
          <div className="text-center text-[10px] text-[#667085]">{row.label}</div>
        </div>
      ))}
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[7px] border border-[#e5eaf0] bg-white p-3">
      <div className="text-[10px] font-black uppercase text-[#667085]">{label}</div>
      <div className="mt-1 text-[15px] font-black text-[#0f172a]">{value}</div>
    </div>
  );
}
