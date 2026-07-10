"use client";

import type { AdsActionItem } from "@/lib/ads/insights";

const toneClass: Record<AdsActionItem["severity"], string> = {
  scale: "border-emerald-500 bg-emerald-50",
  warning: "border-red-500 bg-red-50",
  check: "border-amber-500 bg-amber-50",
  hold: "border-indigo-500 bg-indigo-50"
};

export function AdsActionCenter({ items }: { items: AdsActionItem[] }) {
  return (
    <aside className="rounded-[8px] border border-[#dce3ee] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-black text-[#0f172a]">Action Center</h2>
        <span className="rounded-full bg-[#eef2ff] px-2 py-1 text-[10px] font-black text-[#4f46e5]">{items.length} việc</span>
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <article key={`${item.title}-${item.metric}`} className={`rounded-[7px] border-l-4 p-3 ${toneClass[item.severity]}`}>
            <h3 className="text-[12px] font-black text-[#0f172a]">{item.title}</h3>
            <p className="mt-1 text-[11px] leading-4 text-[#475467]">{item.reason}</p>
            <p className="mt-2 text-[11px] font-bold text-[#344054]">{item.metric}</p>
            <p className="mt-2 rounded-[5px] bg-white/80 px-2 py-1.5 text-[11px] font-semibold text-[#0f172a]">{item.action}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
