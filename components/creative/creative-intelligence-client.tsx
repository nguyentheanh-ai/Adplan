"use client";

import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { applyDefaultAdAccount, getDefaultAdAccountId, setDefaultAdAccountId } from "@/lib/meta/default-account";
import type { AdAccount, CreativePerformance, MetaIntelligenceDashboardData } from "@/lib/meta/types";
import { formatMoney, formatNumber, formatPercent } from "@/lib/reports/ads-report";

type DatePreset = "7d" | "30d" | "month" | "custom";
type SortKey = "spend" | "lead" | "message" | "engagement" | "ctr";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function presetRange(preset: DatePreset) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  if (preset === "7d") start.setDate(start.getDate() - 6);
  if (preset === "30d") start.setDate(start.getDate() - 29);
  if (preset === "month") start.setDate(1);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

async function readJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Không thể lấy dữ liệu.");
  return payload;
}

function splitCreativeName(rawName: string, creativeId: string, adId: string) {
  const normalized = rawName.trim();
  const suffixMatch = normalized.match(/^(.*?)-([A-Za-z0-9]{10,})$/);
  if (suffixMatch) return { title: suffixMatch[1].trim(), code: suffixMatch[2] };
  return { title: normalized, code: creativeId || adId };
}

export function CreativeIntelligenceClient() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [range, setRange] = useState(presetRange("30d"));
  const [payload, setPayload] = useState<MetaIntelligenceDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [campaignFilter, setCampaignFilter] = useState("ALL");

  const currency = payload?.selectedAccount?.currency || "VND";
  const creatives = useMemo(() => payload?.creatives ?? [], [payload?.creatives]);

  const sortedFilteredCreatives = useMemo(() => {
    const rows = creatives.filter((item) => (campaignFilter === "ALL" ? true : item.campaignName === campaignFilter));
    const score = (item: CreativePerformance) => {
      if (sortKey === "lead") return item.leads;
      if (sortKey === "message") return item.messages;
      if (sortKey === "engagement") return item.engagements;
      if (sortKey === "ctr") return item.ctr;
      return item.spend;
    };
    return [...rows].sort((a, b) => score(b) - score(a));
  }, [creatives, campaignFilter, sortKey]);

  const stats = useMemo(() => {
    const withSpend = creatives.filter((item) => item.spend > 0);
    const withEngagement = creatives.filter((item) => item.engagements > 0 || item.messages > 0 || item.leads > 0);
    const withResult = creatives.filter((item) => item.messages > 0 || item.leads > 0);
    const totalLeads = creatives.reduce((sum, item) => sum + item.leads, 0);
    const totalMessages = creatives.reduce((sum, item) => sum + item.messages, 0);
    const totalEngagements = creatives.reduce((sum, item) => sum + item.engagements, 0);
    const totalSpend = creatives.reduce((sum, item) => sum + item.spend, 0);
    return {
      total: creatives.length,
      withSpend: withSpend.length,
      withEngagement: withEngagement.length,
      withResult: withResult.length,
      totalLeads,
      totalMessages,
      totalEngagements,
      totalSpend
    };
  }, [creatives]);

  useEffect(() => {
    readJson<{ data: AdAccount[] }>("/api/meta/adaccounts")
      .then((res) => {
        const rows = res.data ?? [];
        setAccounts(rows);
        const picked = applyDefaultAdAccount(rows, getDefaultAdAccountId() || rows[0]?.id);
        setSelectedAccountId(picked);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  async function loadData(nextAccountId?: string) {
    setLoading(true);
    setError("");
    try {
      const accountId = nextAccountId || selectedAccountId || getDefaultAdAccountId();
      if (!accountId) throw new Error("Chưa có tài khoản quảng cáo.");
      const query = new URLSearchParams({ ad_account_id: accountId, start_date: range.startDate, end_date: range.endDate });
      const response = await readJson<{ data: MetaIntelligenceDashboardData }>(`/api/meta/intelligence?${query.toString()}`);
      setPayload(response.data);
      setSelectedAccountId(accountId);
      setDefaultAdAccountId(accountId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu creative.");
    } finally {
      setLoading(false);
    }
  }

  function updatePreset(next: DatePreset) {
    setPreset(next);
    if (next !== "custom") setRange(presetRange(next));
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label className="space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-outline">Tài khoản quảng cáo</span>
            <select
              className="dashboard-input"
              value={selectedAccountId}
              onChange={(event) => {
                setSelectedAccountId(event.target.value);
                setDefaultAdAccountId(event.target.value);
              }}
            >
              {accounts.length
                ? accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name || account.id}
                    </option>
                  ))
                : <option value="">Chưa có tài khoản</option>}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wide text-outline">Khoảng thời gian</span>
              <select className="dashboard-input" value={preset} onChange={(event) => updatePreset(event.target.value as DatePreset)}>
                <option value="7d">7 ngày qua</option>
                <option value="30d">30 ngày qua</option>
                <option value="month">Tháng này</option>
                <option value="custom">Tùy chỉnh</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wide text-outline">Từ ngày</span>
              <input
                className="dashboard-input"
                type="date"
                value={range.startDate}
                onChange={(event) => {
                  setPreset("custom");
                  setRange((current) => ({ ...current, startDate: event.target.value }));
                }}
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wide text-outline">Đến ngày</span>
              <input
                className="dashboard-input"
                type="date"
                value={range.endDate}
                onChange={(event) => {
                  setPreset("custom");
                  setRange((current) => ({ ...current, endDate: event.target.value }));
                }}
              />
            </label>
          </div>
          <div>
            <Button disabled={loading} onClick={() => void loadData()}>
              <MaterialIcon name="refresh" />
              {loading ? "Đang tải..." : "Lấy báo cáo creative"}
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="rounded-3xl border border-error-container bg-error-container/70 p-5">
          <p className="font-bold text-error">{error}</p>
        </Card>
      ) : null}

      {payload?.creativeAccessWarning ? (
        <Card className="rounded-3xl border border-yellow-300 bg-yellow-50 p-4 text-sm font-semibold text-yellow-900">{payload.creativeAccessWarning}</Card>
      ) : null}

      {!loading && payload ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Tổng số creative" value={formatNumber(stats.total)} />
            <StatCard label="Tổng lead" value={formatNumber(stats.totalLeads)} />
            <StatCard label="Tổng tin nhắn" value={formatNumber(stats.totalMessages)} />
            <StatCard label="Tổng tương tác" value={formatNumber(stats.totalEngagements)} />
            <StatCard label="Tổng chi tiêu creative" value={formatMoney(stats.totalSpend, currency)} />
          </section>

          <Card className="rounded-3xl p-6">
            <h3 className="text-lg font-extrabold">Phễu hiệu suất creative</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Theo dõi từ creative có chi tiêu đến creative có kết quả.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <FunnelCell label="Creative có chi tiêu" value={stats.withSpend} total={Math.max(stats.total, 1)} />
              <FunnelCell label="Creative có tương tác" value={stats.withEngagement} total={Math.max(stats.total, 1)} />
              <FunnelCell label="Creative có lead/tin nhắn" value={stats.withResult} total={Math.max(stats.total, 1)} />
            </div>
          </Card>

          <Card className="overflow-hidden rounded-3xl p-0">
            <div className="border-b border-outline-variant/70 px-6 py-5">
              <h3 className="text-lg font-extrabold">Bảng creative</h3>
              <p className="text-sm text-on-surface-variant">Bạn có thể lọc campaign và sắp xếp theo nhiều định dạng hiệu suất.</p>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-outline-variant/70 px-6 py-4">
              <select className="dashboard-input" value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)}>
                <option value="ALL">Tất cả campaign</option>
                {Array.from(new Set(creatives.map((item) => item.campaignName))).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <select className="dashboard-input" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                <option value="spend">Sắp xếp theo chi tiêu</option>
                <option value="lead">Sắp xếp theo lead</option>
                <option value="message">Sắp xếp theo tin nhắn</option>
                <option value="engagement">Sắp xếp theo tương tác</option>
                <option value="ctr">Sắp xếp theo CTR</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    {["Creative", "Campaign", "Nhóm quảng cáo", "Spend", "Lead", "Tin nhắn", "Tương tác", "CTR", "CPM", "CPC"].map((head) => (
                      <th key={head} className="px-4 py-3 font-extrabold">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/70">
                  {sortedFilteredCreatives.map((creative) => {
                    const parsed = splitCreativeName(creative.creativeName, creative.creativeId, creative.adId);
                    return (
                      <tr key={creative.adId}>
                        <td className="px-4 py-3">
                          <p className="font-bold">{parsed.title}</p>
                          <p className="font-mono text-[11px] text-outline">{parsed.code}</p>
                          {creative.postUrl ? (
                            <a className="mt-1 inline-flex text-xs font-bold text-primary hover:underline" href={creative.postUrl} rel="noreferrer" target="_blank">
                              Link bài post
                            </a>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{creative.campaignName}</td>
                        <td className="px-4 py-3">{creative.adsetName}</td>
                        <td className="px-4 py-3">{formatMoney(creative.spend, currency)}</td>
                        <td className="px-4 py-3">{formatNumber(creative.leads)}</td>
                        <td className="px-4 py-3">{formatNumber(creative.messages)}</td>
                        <td className="px-4 py-3">{formatNumber(creative.engagements)}</td>
                        <td className="px-4 py-3">{formatPercent(creative.ctr)}</td>
                        <td className="px-4 py-3">{formatMoney(creative.cpm, currency)}</td>
                        <td className="px-4 py-3">{formatMoney(creative.cpc, currency)}</td>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-3xl p-5">
      <p className="text-sm font-bold text-on-surface-variant">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </Card>
  );
}

function FunnelCell({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-2xl bg-surface-container-low p-4">
      <p className="text-sm font-bold text-on-surface-variant">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{formatNumber(value)}</p>
      <div className="mt-3 h-2 rounded-full bg-white">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <p className="mt-2 text-xs font-semibold text-outline">{percent}% trên tổng creative</p>
    </div>
  );
}
