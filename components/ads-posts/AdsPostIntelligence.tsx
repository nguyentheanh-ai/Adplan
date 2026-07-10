"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AdsPostAnalysis, AdsPostImprovement, AdsPostRankingResponse, RankedAdsPost } from "@/lib/ads-posts/types";

const labelMap: Record<RankedAdsPost["rankLabel"], { text: string; className: string }> = {
  winner: { text: "Winner", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  promising: { text: "Tiềm năng", className: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  average: { text: "Trung bình", className: "bg-slate-50 text-slate-700 ring-slate-200" },
  weak: { text: "Yếu", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  risky: { text: "Rủi ro", className: "bg-red-50 text-red-700 ring-red-200" }
};

const quickRanges = [
  { label: "Hôm nay", days: 0 },
  { label: "Hôm qua", days: -1 },
  { label: "7 ngày", days: 7 },
  { label: "30 ngày", days: 30 }
];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

function formatNumber(value: number, suffix = "") {
  return `${Math.round(value).toLocaleString("vi-VN")}${suffix}`;
}

function formatMoney(value: number | null | undefined) {
  if (!value) return "0 đ";
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}

function textPreview(value: string, fallback: string) {
  if (!value || value.includes("Không có dữ liệu")) return fallback;
  return value;
}

export function AdsPostIntelligence() {
  const [range, setRange] = useState(defaultRange);
  const [accountId, setAccountId] = useState("");
  const [data, setData] = useState<AdsPostRankingResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [campaign, setCampaign] = useState("all");
  const [label, setLabel] = useState("all");
  const [format, setFormat] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [refreshKey, setRefreshKey] = useState(0);
  const [analysis, setAnalysis] = useState<AdsPostAnalysis | null>(null);
  const [improvements, setImprovements] = useState<AdsPostImprovement[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ start_date: range.startDate, end_date: range.endDate });
    if (accountId) query.set("ad_account_id", accountId);

    queueMicrotask(() => {
      setLoading(true);
      setError("");
    });
    fetch(`/api/ads/posts/ranking?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Không tải được ranking post quảng cáo.");
        return payload as AdsPostRankingResponse;
      })
      .then((payload) => {
        setData(payload.data);
        if (!accountId && payload.data.selectedAccount?.id) setAccountId(payload.data.selectedAccount.id);
      })
      .catch((fetchError) => {
        if ((fetchError as Error).name !== "AbortError") setError(fetchError instanceof Error ? fetchError.message : "Không tải được dữ liệu.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [accountId, range.endDate, range.startDate, refreshKey]);

  const campaigns = useMemo(() => Array.from(new Set((data?.posts ?? []).map((post) => post.campaignName))).sort(), [data?.posts]);
  const formats = useMemo(() => Array.from(new Set((data?.posts ?? []).map((post) => post.format))).sort(), [data?.posts]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.posts ?? [])
      .filter((post) => (campaign === "all" ? true : post.campaignName === campaign))
      .filter((post) => (label === "all" ? true : post.rankLabel === label))
      .filter((post) => (format === "all" ? true : post.format === format))
      .filter((post) => {
        if (!term) return true;
        return `${post.adName} ${post.creativeName} ${post.campaignName} ${post.body} ${post.headline}`.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        if (sortBy === "spend") return b.spend - a.spend;
        if (sortBy === "ctr") return b.ctr - a.ctr;
        if (sortBy === "conversions") return b.conversionCount - a.conversionCount;
        if (sortBy === "cpa") return (a.conversionCost ?? Number.MAX_SAFE_INTEGER) - (b.conversionCost ?? Number.MAX_SAFE_INTEGER);
        return b.score.total - a.score.total;
      });
  }, [campaign, data?.posts, format, label, search, sortBy]);

  const stats = useMemo(() => {
    const rows = filtered;
    return {
      total: rows.length,
      winners: rows.filter((row) => row.rankLabel === "winner").length,
      risky: rows.filter((row) => row.rankLabel === "risky").length,
      spend: rows.reduce((sum, row) => sum + row.spend, 0),
      conversions: rows.reduce((sum, row) => sum + row.conversionCount, 0)
    };
  }, [filtered]);

  function applyQuickRange(days: number) {
    const today = new Date();
    if (days === 0) {
      const value = isoDate(today);
      setRange({ startDate: value, endDate: value });
      return;
    }
    if (days === -1) {
      today.setDate(today.getDate() - 1);
      const value = isoDate(today);
      setRange({ startDate: value, endDate: value });
      return;
    }
    const start = new Date();
    start.setDate(today.getDate() - days);
    setRange({ startDate: isoDate(start), endDate: isoDate(today) });
  }

  async function openAnalysis(post: RankedAdsPost) {
    const query = new URLSearchParams({ start_date: range.startDate, end_date: range.endDate });
    if (accountId) query.set("ad_account_id", accountId);
    setDrawerLoading(true);
    setImprovements([]);
    try {
      const response = await fetch(`/api/ads/posts/${encodeURIComponent(post.adId)}/analysis?${query.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không phân tích được post.");
      setAnalysis(payload.data as AdsPostAnalysis);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Không phân tích được post.");
    } finally {
      setDrawerLoading(false);
    }
  }

  async function generateImprovementVersions() {
    if (!analysis) return;
    const query = new URLSearchParams({ start_date: range.startDate, end_date: range.endDate });
    if (accountId) query.set("ad_account_id", accountId);
    setDrawerLoading(true);
    try {
      const response = await fetch(`/api/ads/posts/${encodeURIComponent(analysis.post.adId)}/generate-improvements?${query.toString()}`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không tạo được phiên bản cải thiện.");
      setImprovements(payload.data.versions as AdsPostImprovement[]);
    } catch (improveError) {
      setError(improveError instanceof Error ? improveError.message : "Không tạo được phiên bản cải thiện.");
    } finally {
      setDrawerLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-5 text-[#0f172a] md:px-6">
      {loading ? <div className="fixed left-0 right-0 top-0 z-50 h-1 overflow-hidden bg-indigo-100"><div className="h-full w-2/3 animate-pulse bg-indigo-600" /></div> : null}
      <div className="mx-auto flex max-w-[1480px] flex-col gap-4">
        <header className="flex flex-col gap-3 border-b border-[#dbe1ee] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-indigo-700">Ads Post Intelligence</p>
            <h1 className="mt-1 text-[24px] font-black">Xếp hạng post quảng cáo</h1>
            <p className="mt-1 max-w-3xl text-[13px] text-[#667085]">Chấm điểm creative/post đang chạy ads theo chi phí, CTR, tin nhắn, lead, độ ổn định và rủi ro fatigue.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {quickRanges.map((item) => (
              <button key={item.label} className="h-9 rounded-[6px] border border-[#dbe1ee] bg-white px-3 text-[12px] font-bold hover:border-indigo-300" type="button" onClick={() => applyQuickRange(item.days)}>
                {item.label}
              </button>
            ))}
            <button className="h-9 rounded-[6px] bg-indigo-600 px-3 text-[12px] font-bold text-white disabled:opacity-60" disabled={loading} type="button" onClick={() => setRefreshKey((value) => value + 1)}>
              Refresh
            </button>
          </div>
        </header>

        <section className="grid gap-3 rounded-[8px] border border-[#dbe1ee] bg-white p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
          <label className="text-[11px] font-bold uppercase text-[#667085]">
            Tài khoản
            <select className="mt-1 h-10 w-full rounded-[6px] border border-[#dbe1ee] bg-white px-3 text-[13px] font-semibold normal-case text-[#0f172a]" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              {(data?.accounts ?? []).map((account) => (
                <option key={account.id} value={account.id}>{account.name || account.id}</option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-bold uppercase text-[#667085]">
            Từ ngày
            <input className="mt-1 h-10 w-full rounded-[6px] border border-[#dbe1ee] px-3 text-[13px] font-semibold normal-case text-[#0f172a]" type="date" value={range.startDate} onChange={(event) => setRange((current) => ({ ...current, startDate: event.target.value }))} />
          </label>
          <label className="text-[11px] font-bold uppercase text-[#667085]">
            Đến ngày
            <input className="mt-1 h-10 w-full rounded-[6px] border border-[#dbe1ee] px-3 text-[13px] font-semibold normal-case text-[#0f172a]" type="date" value={range.endDate} onChange={(event) => setRange((current) => ({ ...current, endDate: event.target.value }))} />
          </label>
          <label className="text-[11px] font-bold uppercase text-[#667085]">
            Xếp hạng
            <select className="mt-1 h-10 w-full rounded-[6px] border border-[#dbe1ee] bg-white px-3 text-[13px] font-semibold normal-case text-[#0f172a]" value={label} onChange={(event) => setLabel(event.target.value)}>
              <option value="all">Tất cả</option>
              <option value="winner">Winner</option>
              <option value="promising">Tiềm năng</option>
              <option value="average">Trung bình</option>
              <option value="weak">Yếu</option>
              <option value="risky">Rủi ro</option>
            </select>
          </label>
          <label className="text-[11px] font-bold uppercase text-[#667085]">
            Sắp xếp
            <select className="mt-1 h-10 w-full rounded-[6px] border border-[#dbe1ee] bg-white px-3 text-[13px] font-semibold normal-case text-[#0f172a]" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="score">Điểm tốt nhất</option>
              <option value="conversions">Tin nhắn + lead</option>
              <option value="cpa">CPA thấp nhất</option>
              <option value="ctr">CTR cao nhất</option>
              <option value="spend">Chi tiêu cao nhất</option>
            </select>
          </label>
        </section>

        {error ? <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">{error}</div> : null}
        {data?.warning ? <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">{data.warning}</div> : null}

        <section className="grid gap-3 md:grid-cols-5">
          <Stat label="Post ads" value={formatNumber(stats.total)} />
          <Stat label="Winner" value={formatNumber(stats.winners)} />
          <Stat label="Rủi ro" value={formatNumber(stats.risky)} />
          <Stat label="Chi tiêu" value={formatMoney(stats.spend)} />
          <Stat label="Tin nhắn + lead" value={formatNumber(stats.conversions)} />
        </section>

        <section className="grid gap-3 rounded-[8px] border border-[#dbe1ee] bg-white p-3 lg:grid-cols-[1fr_220px_180px_180px]">
          <input className="h-10 rounded-[6px] border border-[#dbe1ee] px-3 text-[13px] font-semibold" placeholder="Tìm theo tên ads, campaign, nội dung..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="h-10 rounded-[6px] border border-[#dbe1ee] bg-white px-3 text-[13px] font-semibold" value={campaign} onChange={(event) => setCampaign(event.target.value)}>
            <option value="all">Tất cả campaign</option>
            {campaigns.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="h-10 rounded-[6px] border border-[#dbe1ee] bg-white px-3 text-[13px] font-semibold" value={format} onChange={(event) => setFormat(event.target.value)}>
            <option value="all">Tất cả format</option>
            {formats.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button className="h-10 rounded-[6px] border border-[#dbe1ee] bg-white text-[13px] font-bold" type="button" onClick={() => { setSearch(""); setCampaign("all"); setLabel("all"); setFormat("all"); }}>
            Xóa filter
          </button>
        </section>

        <div className="overflow-hidden rounded-[8px] border border-[#dbe1ee] bg-white">
          <div className="max-h-[680px] overflow-auto">
            <table className="min-w-[1280px] w-full border-collapse text-left text-[12px]">
              <thead className="sticky top-0 z-10 bg-[#f8fafc] text-[11px] uppercase text-[#667085]">
                <tr>
                  <th className="w-16 px-3 py-3">Rank</th>
                  <th className="w-[340px] px-3 py-3">Post / Creative</th>
                  <th className="px-3 py-3">Campaign</th>
                  <th className="px-3 py-3 text-right">Score</th>
                  <th className="px-3 py-3 text-right">Chi tiêu</th>
                  <th className="px-3 py-3 text-right">CTR</th>
                  <th className="px-3 py-3 text-right">CPC</th>
                  <th className="px-3 py-3 text-right">Tin nhắn</th>
                  <th className="px-3 py-3 text-right">Lead</th>
                  <th className="px-3 py-3 text-right">CPA</th>
                  <th className="px-3 py-3 text-right">Freq</th>
                  <th className="px-3 py-3">Gợi ý</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7ebf3]">
                {loading ? <SkeletonRows /> : null}
                {!loading && filtered.length === 0 ? (
                  <tr><td className="px-3 py-12 text-center text-[13px] font-semibold text-[#667085]" colSpan={13}>Chưa có post quảng cáo phù hợp với filter.</td></tr>
                ) : null}
                {!loading && filtered.map((post) => (
                  <tr key={post.adId} className="align-top hover:bg-[#f8fafc]">
                    <td className="px-3 py-3 text-[15px] font-black">#{post.rank}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[6px] border border-[#dbe1ee] bg-[#eef2ff]">
                          {post.thumbnailUrl ? (
                            // Meta returns dynamic CDN URLs, so Next Image cannot be safely domain-whitelisted here.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt="" className="h-full w-full object-cover" src={post.thumbnailUrl} />
                          ) : <div className="grid h-full place-items-center text-[10px] font-bold text-indigo-600">ADS</div>}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-black ring-1 ${labelMap[post.rankLabel].className}`}>{labelMap[post.rankLabel].text}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">{post.format}</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-[13px] font-black">{textPreview(post.headline, post.creativeName)}</p>
                          <p className="mt-1 line-clamp-2 text-[12px] text-[#667085]">{textPreview(post.body, "Meta chưa trả nội dung post.")}</p>
                          {post.postUrl && !post.postUrl.includes("Kh") ? <a className="mt-1 inline-block text-[11px] font-bold text-indigo-700" href={post.postUrl} rel="noreferrer" target="_blank">Mở post gốc</a> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="max-w-[260px] font-bold">{post.campaignName}</p>
                      <p className="mt-1 text-[#667085]">{post.adsetName}</p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="font-black">{post.score.total}</div>
                      <div className="mt-1 h-2 rounded bg-indigo-100"><div className="h-2 rounded bg-indigo-600" style={{ width: `${post.score.total}%` }} /></div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold">{formatMoney(post.spend)}</td>
                    <td className="px-3 py-3 text-right font-bold">{post.ctr.toFixed(2)}%</td>
                    <td className="px-3 py-3 text-right font-bold">{formatMoney(post.cpc)}</td>
                    <td className="px-3 py-3 text-right font-bold">{formatNumber(post.messages)}</td>
                    <td className="px-3 py-3 text-right font-bold">{formatNumber(post.leads)}</td>
                    <td className="px-3 py-3 text-right font-bold">{formatMoney(post.conversionCost)}</td>
                    <td className="px-3 py-3 text-right font-bold">{post.frequency.toFixed(2)}</td>
                    <td className="px-3 py-3"><p className="max-w-[260px] text-[12px] text-[#475467]">{post.recommendations[0]}</p></td>
                    <td className="px-3 py-3 text-right">
                      <button className="rounded-[6px] border border-[#dbe1ee] bg-white px-3 py-2 text-[12px] font-bold hover:border-indigo-300" type="button" onClick={() => void openAnalysis(post)}>
                        Phân tích
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {analysis ? (
        <aside className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[520px] flex-col border-l border-[#dbe1ee] bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-[#dbe1ee] p-4">
            <div>
              <p className="text-[11px] font-bold uppercase text-indigo-700">Post analysis</p>
              <h2 className="mt-1 text-[18px] font-black">{textPreview(analysis.post.headline, analysis.post.creativeName)}</h2>
            </div>
            <button className="rounded-[6px] border border-[#dbe1ee] px-3 py-2 text-[12px] font-bold" type="button" onClick={() => setAnalysis(null)}>Đóng</button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {drawerLoading ? <div className="h-1 overflow-hidden rounded bg-indigo-100"><div className="h-full w-2/3 animate-pulse bg-indigo-600" /></div> : null}
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Score" value={`${analysis.post.score.total}/100`} compact />
              <Stat label="CPA" value={formatMoney(analysis.post.conversionCost)} compact />
              <Stat label="CTR" value={`${analysis.post.ctr.toFixed(2)}%`} compact />
            </div>
            <Panel title="Chẩn đoán">
              {analysis.diagnosis.map((item) => <p key={item} className="text-[13px] text-[#475467]">{item}</p>)}
            </Panel>
            <Panel title="Điểm mạnh">
              {analysis.strengths.map((item) => <p key={item} className="text-[13px] text-emerald-700">{item}</p>)}
            </Panel>
            <Panel title="Điểm yếu">
              {analysis.weaknesses.map((item) => <p key={item} className="text-[13px] text-amber-700">{item}</p>)}
            </Panel>
            <Panel title="Creative notes">
              <p className="text-[13px]"><b>Hook:</b> {analysis.creativeNotes.hook}</p>
              <p className="text-[13px]"><b>Headline:</b> {analysis.creativeNotes.headline}</p>
              <p className="text-[13px]"><b>CTA:</b> {analysis.creativeNotes.cta}</p>
            </Panel>
            <button className="w-full rounded-[6px] bg-indigo-600 px-4 py-3 text-[13px] font-black text-white disabled:opacity-60" disabled={drawerLoading} type="button" onClick={() => void generateImprovementVersions()}>
              Tạo 3 phiên bản cải thiện
            </button>
            {improvements.map((item) => (
              <Panel key={item.title} title={item.title}>
                <p className="whitespace-pre-line text-[13px] text-[#0f172a]">{item.primaryText}</p>
                <p className="text-[13px]"><b>Headline:</b> {item.headline}</p>
                <p className="text-[13px]"><b>CTA:</b> {item.cta}</p>
                <p className="text-[12px] text-[#667085]">{item.rationale}</p>
              </Panel>
            ))}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function Stat({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-[8px] border border-[#dbe1ee] bg-white ${compact ? "p-3" : "p-4"}`}>
      <p className="text-[11px] font-bold uppercase text-[#667085]">{label}</p>
      <p className={`${compact ? "text-[18px]" : "text-[24px]"} mt-1 font-black`}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-2 rounded-[8px] border border-[#dbe1ee] p-3"><h3 className="text-[13px] font-black">{title}</h3>{children}</section>;
}

function SkeletonRows() {
  return Array.from({ length: 6 }).map((_, index) => (
    <tr key={index}>
      <td className="px-3 py-4" colSpan={13}><div className="h-10 animate-pulse rounded bg-slate-100" /></td>
    </tr>
  ));
}
