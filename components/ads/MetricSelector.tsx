"use client";

import type { AdsMetricKey } from "@/lib/ads/metrics";
import { metricLabel } from "@/lib/ads/metrics";

const metrics: AdsMetricKey[] = ["spend", "clicks", "ctr", "cpc", "cpm", "leads", "messages", "purchases", "registrations", "cpl", "cpa", "roas"];

export function MetricSelector({ value, onChange }: { value: AdsMetricKey; onChange: (value: AdsMetricKey) => void }) {
  return (
    <select className="h-9 rounded-[6px] border border-[#dce3ee] bg-white px-3 text-[12px] font-bold text-[#344054]" value={value} onChange={(event) => onChange(event.target.value as AdsMetricKey)}>
      {metrics.map((metric) => <option key={metric} value={metric}>{metricLabel(metric)}</option>)}
    </select>
  );
}
