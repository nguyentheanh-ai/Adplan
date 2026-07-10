"use client";

import { useMemo, useState } from "react";
import type { BreakdownRow } from "@/lib/ads/metrics";
import { formatMetric, formatNumber } from "@/lib/ads/metrics";

type SortKey = keyof Pick<BreakdownRow, "spend" | "impressions" | "clicks" | "ctr" | "cpc" | "cpm" | "conversions" | "cpl" | "cpa">;

const columns: Array<{ key: SortKey; label: string }> = [
  { key: "spend", label: "Spend" },
  { key: "impressions", label: "Impressions" },
  { key: "clicks", label: "Clicks" },
  { key: "ctr", label: "CTR" },
  { key: "cpc", label: "CPC" },
  { key: "cpm", label: "CPM" },
  { key: "conversions", label: "Leads/Conv." },
  { key: "cpl", label: "CPL" },
  { key: "cpa", label: "CPA" }
];

export function BreakdownTable({ rows, currency, title }: { rows: BreakdownRow[]; currency: string; title: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const result = Number(a[sortKey] ?? 0) - Number(b[sortKey] ?? 0);
      return direction === "asc" ? result : -result;
    });
  }, [direction, rows, sortKey]);

  function setSort(next: SortKey) {
    if (next === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(next);
    setDirection("desc");
  }

  return (
    <section className="overflow-hidden rounded-[8px] border border-[#dce3ee] bg-white">
      <div className="border-b border-[#e8edf5] px-4 py-3">
        <h3 className="text-[13px] font-black uppercase tracking-wide text-[#0f172a]">{title}</h3>
      </div>
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[1180px] text-left text-[12px]">
          <thead className="sticky top-0 z-10 bg-[#f7f9fc] text-[10px] uppercase tracking-wide text-[#667085]">
            <tr>
              <th className="px-3 py-3 font-black">Tên</th>
              <th className="px-3 py-3 font-black">Status</th>
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-3 text-right font-black">
                  <button className="font-black" onClick={() => setSort(column.key)} type="button">
                    {column.label}{sortKey === column.key ? (direction === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
              <th className="px-3 py-3 font-black">Nhận xét</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id} className={`border-b border-[#edf1f5] last:border-b-0 ${row.quality === "good" ? "bg-emerald-50/40" : row.quality === "bad" ? "bg-red-50/40" : "bg-white"}`}>
                <td className="max-w-[300px] px-3 py-3 font-bold text-[#0f172a]">{row.name}</td>
                <td className="px-3 py-3"><span className="rounded-full border border-[#dce3ee] bg-white px-2 py-1 text-[10px] font-bold">{row.status || "-"}</span></td>
                <td className="px-3 py-3 text-right tabular-nums">{formatMetric("spend", row.spend, currency)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatNumber(row.impressions)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatNumber(row.clicks)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatMetric("ctr", row.ctr, currency)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatMetric("cpc", row.cpc, currency)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatMetric("cpm", row.cpm, currency)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatNumber(row.conversions)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{row.cpl ? formatMetric("cpl", row.cpl, currency) : "-"}</td>
                <td className="px-3 py-3 text-right tabular-nums">{row.cpa ? formatMetric("cpa", row.cpa, currency) : "-"}</td>
                <td className="max-w-[300px] px-3 py-3 text-[#475467]">{row.note}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td className="px-3 py-8 text-center text-[#667085]" colSpan={12}>Không có dữ liệu cho bảng này.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
