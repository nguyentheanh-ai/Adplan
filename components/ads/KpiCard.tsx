"use client";

import type { KpiViewModel } from "@/lib/ads/metrics";

function Sparkline({ values, tone }: { values: number[]; tone: KpiViewModel["quality"] }) {
  const max = Math.max(...values, 1);
  const points = values.length
    ? values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 100},${28 - (value / max) * 22}`).join(" ")
    : "0,24 100,24";
  const color = tone === "good" ? "#059669" : tone === "bad" ? "#dc2626" : "#4f46e5";

  return (
    <svg aria-hidden className="h-8 w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 30">
      <polyline fill="none" points={points} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function KpiCard({ kpi }: { kpi: KpiViewModel }) {
  const deltaTone = kpi.quality === "good" ? "text-emerald-600" : kpi.quality === "bad" ? "text-red-600" : "text-[#6b7280]";
  const deltaLabel = kpi.delta === null || kpi.delta === undefined ? "N/A" : `${kpi.delta >= 0 ? "+" : ""}${kpi.delta.toFixed(1)}%`;

  return (
    <section className="min-h-[132px] rounded-[8px] border border-[#dce3ee] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.08em] text-[#667085]">{kpi.label}</div>
          <div className="mt-2 text-[22px] font-black leading-none tracking-tight text-[#0f172a]">{kpi.value}</div>
        </div>
        <div className={`rounded-full bg-[#f8fafc] px-2 py-1 text-[10px] font-bold ${deltaTone}`}>{deltaLabel}</div>
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-[#6b7280]">{kpi.hint}</p>
      <div className="mt-2 rounded-[4px] bg-[#f8fafc] px-1">
        <Sparkline tone={kpi.quality} values={kpi.sparkline} />
      </div>
    </section>
  );
}
