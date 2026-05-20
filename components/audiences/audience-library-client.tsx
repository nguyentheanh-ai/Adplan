"use client";

import { useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMoney, formatNumber } from "@/lib/reports/ads-report";
import type { AdAccount, CreativePerformance, MetaIntelligenceDashboardData } from "@/lib/meta/types";

type DatePreset = "7d" | "30d" | "month" | "custom";

type AudienceRow = {
  key: string;
  code: string;
  name: string;
  campaignCount: number;
  creativeCount: number;
  leads: number;
  messages: number;
  spend: number;
  topCampaign: string;
};

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

function buildAudienceRows(creatives: CreativePerformance[]) {
  const map = new Map<string, Omit<AudienceRow, "code"> & { campaignSet: Set<string>; topCampaignCounter: Map<string, number> }>();

  creatives.forEach((creative) => {
    const key = creative.adsetId || creative.adsetName || "adset-khac";
    const existing = map.get(key);
    if (existing) {
      existing.creativeCount += 1;
      existing.leads += creative.leads;
      existing.messages += creative.messages;
      existing.spend += creative.spend;
      existing.campaignSet.add(creative.campaignName);
      existing.topCampaignCounter.set(creative.campaignName, (existing.topCampaignCounter.get(creative.campaignName) || 0) + 1);
      return;
    }

    map.set(key, {
      key,
      name: creative.adsetName || "Nhóm quảng cáo chưa rõ",
      campaignCount: 0,
      creativeCount: 1,
      leads: creative.leads,
      messages: creative.messages,
      spend: creative.spend,
      topCampaign: "",
      campaignSet: new Set([creative.campaignName]),
      topCampaignCounter: new Map([[creative.campaignName, 1]])
    });
  });

  const rows = Array.from(map.values())
    .map((row) => {
      const topCampaign = Array.from(row.topCampaignCounter.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
      return {
        key: row.key,
        name: row.name,
        campaignCount: row.campaignSet.size,
        creativeCount: row.creativeCount,
        leads: row.leads,
        messages: row.messages,
        spend: row.spend,
        topCampaign
      };
    })
    .sort((a, b) => b.spend - a.spend)
    .map((row, index) => ({
      ...row,
      code: `TPK-${String(index + 1).padStart(3, "0")}`
    }));

  return rows;
}

export function AudienceLibraryClient() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [range, setRange] = useState(presetRange("30d"));
  const [payload, setPayload] = useState<MetaIntelligenceDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState("");

  const currency = payload?.selectedAccount?.currency || "VND";
  const audienceRows = useMemo(() => buildAudienceRows(payload?.creatives ?? []), [payload]);

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
    setDetail("");

    try {
      const accountId = nextAccountId || selectedAccountId || (await loadAccounts());
      if (!accountId) throw new Error("Chưa có tài khoản quảng cáo để tải tệp khách hàng.");
      const query = new URLSearchParams({
        ad_account_id: accountId,
        start_date: range.startDate,
        end_date: range.endDate
      });
      const response = await readJson<{ data: MetaIntelligenceDashboardData }>(`/api/meta/intelligence?${query.toString()}`);
      setPayload(response.data);
      setSelectedAccountId(accountId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải tệp khách hàng.");
      setDetail(err instanceof Error ? err.stack || err.message : "");
    } finally {
      setLoading(false);
    }
  }

  function updatePreset(next: DatePreset) {
    setPreset(next);
    if (next !== "custom") setRange(presetRange(next));
  }

  const totalLeads = audienceRows.reduce((sum, row) => sum + row.leads, 0);
  const totalMessages = audienceRows.reduce((sum, row) => sum + row.messages, 0);
  const totalSpend = audienceRows.reduce((sum, row) => sum + row.spend, 0);

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
          <div className="flex gap-2">
            <Button disabled={loading} onClick={() => void loadAccounts()} variant="secondary">
              <MaterialIcon name="account_balance_wallet" />
              Nạp tài khoản
            </Button>
            <Button disabled={loading} onClick={() => loadData()}>
              <MaterialIcon name="refresh" />
              {loading ? "Đang tải..." : "Lấy tệp khách hàng"}
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="rounded-3xl border border-error-container bg-error-container/70 p-5">
          <p className="font-bold text-error">{error}</p>
          {detail ? (
            <details className="mt-2 text-xs text-on-surface-variant">
              <summary className="cursor-pointer font-bold">Xem chi tiết kỹ thuật</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3">{detail}</pre>
            </details>
          ) : null}
        </Card>
      ) : null}

      {payload?.creativeAccessWarning ? (
        <Card className="rounded-3xl border border-yellow-300 bg-yellow-50 p-4 text-sm font-semibold text-yellow-900">
          {payload.creativeAccessWarning}
        </Card>
      ) : null}

      {!loading && audienceRows.length ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-3xl p-5">
              <p className="text-sm font-bold text-on-surface-variant">Tổng tệp ở Nhóm quảng cáo</p>
              <p className="mt-2 text-3xl font-extrabold">{formatNumber(audienceRows.length)}</p>
            </Card>
            <Card className="rounded-3xl p-5">
              <p className="text-sm font-bold text-on-surface-variant">Tổng lead</p>
              <p className="mt-2 text-3xl font-extrabold">{formatNumber(totalLeads)}</p>
            </Card>
            <Card className="rounded-3xl p-5">
              <p className="text-sm font-bold text-on-surface-variant">Tổng tin nhắn</p>
              <p className="mt-2 text-3xl font-extrabold">{formatNumber(totalMessages)}</p>
            </Card>
            <Card className="rounded-3xl p-5">
              <p className="text-sm font-bold text-on-surface-variant">Tổng chi tiêu</p>
              <p className="mt-2 text-3xl font-extrabold">{formatMoney(totalSpend, currency)}</p>
            </Card>
          </section>

          <Card className="overflow-hidden rounded-3xl p-0">
            <div className="border-b border-outline-variant/70 px-6 py-5">
              <h3 className="text-lg font-extrabold">Tệp khách hàng ở Nhóm quảng cáo</h3>
              <p className="text-sm text-on-surface-variant">Dữ liệu lấy từ lịch sử nhóm quảng cáo/creative đã chạy, gắn mã tệp để theo dõi.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    {["Mã tệp", "Tên tệp khách hàng", "Nguồn", "Campaign", "Số creative", "Lead", "Tin nhắn", "Chi tiêu", "Campaign chính"].map((head) => (
                      <th key={head} className="px-4 py-3 font-extrabold">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/70">
                  {audienceRows.map((row) => (
                    <tr key={row.key}>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary-fixed px-3 py-1 font-mono text-xs font-extrabold text-primary">{row.code}</span>
                      </td>
                      <td className="px-4 py-3 font-bold">{row.name}</td>
                      <td className="px-4 py-3">Nhóm quảng cáo</td>
                      <td className="px-4 py-3">{formatNumber(row.campaignCount)}</td>
                      <td className="px-4 py-3">{formatNumber(row.creativeCount)}</td>
                      <td className="px-4 py-3">{formatNumber(row.leads)}</td>
                      <td className="px-4 py-3">{formatNumber(row.messages)}</td>
                      <td className="px-4 py-3">{formatMoney(row.spend, currency)}</td>
                      <td className="px-4 py-3">{row.topCampaign}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}

      {!loading && payload && !audienceRows.length ? (
        <Card className="rounded-3xl p-8 text-center">
          <MaterialIcon className="mx-auto mb-3 text-4xl text-primary" name="groups" />
          <h3 className="text-xl font-extrabold">Chưa có dữ liệu tệp từ nhóm quảng cáo</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-on-surface-variant">
            Tài khoản này chưa có ad set/creative trong khoảng thời gian đã chọn hoặc token thiếu quyền đọc dữ liệu.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
