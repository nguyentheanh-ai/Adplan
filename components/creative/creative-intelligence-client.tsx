"use client";

import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMoney, formatNumber, formatPercent } from "@/lib/reports/ads-report";
import type { AdAccount, CreativePerformance, MetaIntelligenceDashboardData } from "@/lib/meta/types";

type DatePreset = "7d" | "30d" | "month" | "custom";

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
  if (suffixMatch) {
    return { title: suffixMatch[1].trim(), code: suffixMatch[2] };
  }
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

  const currency = payload?.selectedAccount?.currency || "VND";
  const creatives = useMemo(() => payload?.creatives ?? [], [payload]);

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

  const topLeads = useMemo(() => [...creatives].sort((a, b) => b.leads - a.leads).slice(0, 5), [creatives]);
  const topMessages = useMemo(() => [...creatives].sort((a, b) => b.messages - a.messages).slice(0, 5), [creatives]);
  const topEngagement = useMemo(() => [...creatives].sort((a, b) => b.engagements - a.engagements).slice(0, 5), [creatives]);

  useEffect(() => {
    readJson<{ data: AdAccount[] }>("/api/meta/adaccounts")
      .then((payload) => {
        setAccounts(payload.data ?? []);
        setSelectedAccountId(payload.data?.[0]?.id ?? "");
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  async function loadAccounts() {
    const accountPayload = await readJson<{ data: AdAccount[] }>("/api/meta/adaccounts");
    const nextAccounts = accountPayload.data ?? [];
    setAccounts(nextAccounts);
    const first = nextAccounts[0]?.id || "";
    if (!selectedAccountId) setSelectedAccountId(first);
    return selectedAccountId || first;
  }

  async function loadData(nextAccountId?: string) {
    setLoading(true);
    setError("");
    try {
      const accountId = nextAccountId || selectedAccountId || (await loadAccounts());
      if (!accountId) throw new Error("Chưa có tài khoản quảng cáo.");
      const query = new URLSearchParams({
        ad_account_id: accountId,
        start_date: range.startDate,
        end_date: range.endDate
      });
      const response = await readJson<{ data: MetaIntelligenceDashboardData }>(`/api/meta/intelligence?${query.toString()}`);
      setPayload(response.data);
      setSelectedAccountId(accountId);
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
            <select className="dashboard-input" value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
              {accounts.length ? (
                accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name || account.id}
                  </option>
                ))
              ) : (
                <option value="">Chưa có tài khoản</option>
              )}
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
            <Button disabled={loading} onClick={() => loadData()}>
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
        <Card className="rounded-3xl border border-yellow-300 bg-yellow-50 p-4 text-sm font-semibold text-yellow-900">
          {payload.creativeAccessWarning}
        </Card>
      ) : null}

      {!loading && payload ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-3xl p-5">
              <p className="text-sm font-bold text-on-surface-variant">Tổng số creative</p>
              <p className="mt-2 text-3xl font-extrabold">{formatNumber(stats.total)}</p>
            </Card>
            <Card className="rounded-3xl p-5">
              <p className="text-sm font-bold text-on-surface-variant">Tổng lead</p>
              <p className="mt-2 text-3xl font-extrabold">{formatNumber(stats.totalLeads)}</p>
            </Card>
            <Card className="rounded-3xl p-5">
              <p className="text-sm font-bold text-on-surface-variant">Tổng tin nhắn</p>
              <p className="mt-2 text-3xl font-extrabold">{formatNumber(stats.totalMessages)}</p>
            </Card>
            <Card className="rounded-3xl p-5">
              <p className="text-sm font-bold text-on-surface-variant">Tổng tương tác</p>
              <p className="mt-2 text-3xl font-extrabold">{formatNumber(stats.totalEngagements)}</p>
            </Card>
            <Card className="rounded-3xl p-5">
              <p className="text-sm font-bold text-on-surface-variant">Tổng chi tiêu creative</p>
              <p className="mt-2 text-3xl font-extrabold">{formatMoney(stats.totalSpend, currency)}</p>
            </Card>
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

          <section className="grid gap-6 xl:grid-cols-3">
            <TopCreativeCard title="Top creative theo Lead" rows={topLeads} mode="lead" currency={currency} />
            <TopCreativeCard title="Top creative theo Tin nhắn" rows={topMessages} mode="message" currency={currency} />
            <TopCreativeCard title="Top creative theo Tương tác" rows={topEngagement} mode="engagement" currency={currency} />
          </section>

          <Card className="overflow-hidden rounded-3xl p-0">
            <div className="border-b border-outline-variant/70 px-6 py-5">
              <h3 className="text-lg font-extrabold">Danh sách creative</h3>
              <p className="text-sm text-on-surface-variant">Tên creative đã tách mã để theo dõi nhanh khi tối ưu.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] text-left text-sm">
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
                  {creatives.map((creative) => {
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

      {!loading && payload && !creatives.length ? (
        <Card className="rounded-3xl p-8 text-center">
          <MaterialIcon className="mx-auto mb-3 text-4xl text-primary" name="palette" />
          <h3 className="text-xl font-extrabold">Chưa có creative trong kỳ đã chọn</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-on-surface-variant">
            Có thể tài khoản chưa chạy ads trong giai đoạn này hoặc token thiếu quyền đọc post/creative.
          </p>
        </Card>
      ) : null}
    </div>
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

function TopCreativeCard({
  title,
  rows,
  mode,
  currency
}: {
  title: string;
  rows: CreativePerformance[];
  mode: "lead" | "message" | "engagement";
  currency: string;
}) {
  return (
    <Card className="rounded-3xl p-5">
      <h3 className="text-base font-extrabold">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((row) => {
            const parsed = splitCreativeName(row.creativeName, row.creativeId, row.adId);
            const metricValue =
              mode === "lead"
                ? `${formatNumber(row.leads)} lead`
                : mode === "message"
                  ? `${formatNumber(row.messages)} tin nhắn`
                  : `${formatNumber(row.engagements)} tương tác`;
            return (
              <div key={`${mode}-${row.adId}`} className="rounded-2xl bg-surface-container-low p-3">
                <p className="line-clamp-2 text-sm font-bold text-on-surface">{parsed.title}</p>
                <p className="mt-1 text-[11px] font-mono text-outline">{parsed.code}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-on-surface-variant">
                  <span>{metricValue}</span>
                  <span>{formatMoney(row.spend, currency)}</span>
                </div>
                {row.postUrl ? (
                  <a className="mt-2 inline-flex text-xs font-bold text-primary hover:underline" href={row.postUrl} rel="noreferrer" target="_blank">
                    Mở bài post
                  </a>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">Chưa có dữ liệu.</div>
        )}
      </div>
    </Card>
  );
}
