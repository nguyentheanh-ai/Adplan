"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { applyDefaultAdAccount, getDefaultAdAccountId, setDefaultAdAccountId } from "@/lib/meta/default-account";
import type { AdAccount, CreativePerformance, MetaIntelligenceDashboardData, SavedAudience } from "@/lib/meta/types";
import { formatMoney, formatNumber } from "@/lib/reports/ads-report";

type DatePreset = "7d" | "30d" | "month" | "custom";

type AudienceRow = {
  key: string;
  code: string;
  name: string;
  campaignCount: number;
  creativeCount: number;
  leads: number;
  messages: number;
  engagements: number;
  spend: number;
  topCampaign: string;
  ageRange: string;
  gender: string;
  locations: string;
  interests: string;
  behaviors: string;
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

async function readJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
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
      existing.engagements += creative.engagements;
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
      engagements: creative.engagements,
      spend: creative.spend,
      topCampaign: "",
      ageRange: creative.audienceAgeRange,
      gender: creative.audienceGender,
      locations: creative.audienceLocations,
      interests: creative.audienceInterests,
      behaviors: creative.audienceBehaviors,
      campaignSet: new Set([creative.campaignName]),
      topCampaignCounter: new Map([[creative.campaignName, 1]])
    });
  });

  return Array.from(map.values())
    .map((row) => {
      const topCampaign = Array.from(row.topCampaignCounter.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
      return {
        key: row.key,
        name: row.name,
        campaignCount: row.campaignSet.size,
        creativeCount: row.creativeCount,
        leads: row.leads,
        messages: row.messages,
        engagements: row.engagements,
        spend: row.spend,
        topCampaign,
        ageRange: row.ageRange,
        gender: row.gender,
        locations: row.locations,
        interests: row.interests,
        behaviors: row.behaviors
      };
    })
    .sort((a, b) => b.spend - a.spend)
    .map((row, index) => ({ ...row, code: `TPK-${String(index + 1).padStart(3, "0")}` }));
}

export function AudienceLibraryClient() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [range, setRange] = useState(presetRange("30d"));
  const [payload, setPayload] = useState<MetaIntelligenceDashboardData | null>(null);
  const [savedAudiences, setSavedAudiences] = useState<SavedAudience[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState("");
  const [keyword, setKeyword] = useState("");

  const currency = payload?.selectedAccount?.currency || "VND";
  const audienceRows = useMemo(() => buildAudienceRows(payload?.creatives ?? []), [payload]);
  const filteredRows = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return audienceRows;
    return audienceRows.filter((row) => {
      return [row.name, row.code, row.topCampaign, row.locations, row.interests].join(" ").toLowerCase().includes(needle);
    });
  }, [audienceRows, keyword]);

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function loadAccounts() {
    const accountPayload = await readJson<{ data: AdAccount[] }>("/api/meta/adaccounts");
    const nextAccounts = accountPayload.data ?? [];
    setAccounts(nextAccounts);
    const selected = applyDefaultAdAccount(nextAccounts, getDefaultAdAccountId() || nextAccounts[0]?.id);
    setSelectedAccountId(selected);
    return selected;
  }

  async function loadSavedAudiences(accountId: string) {
    try {
      const res = await readJson<{ data: SavedAudience[] }>(`/api/saved-audiences?account_id=${encodeURIComponent(accountId)}`);
      setSavedAudiences(res.data ?? []);
    } catch {
      setSavedAudiences([]);
    }
  }

  async function loadData(nextAccountId?: string) {
    setLoading(true);
    setError("");
    setDetail("");
    try {
      const accountId = nextAccountId || selectedAccountId || (await loadAccounts());
      if (!accountId) throw new Error("Chưa có tài khoản quảng cáo để tải tệp khách hàng.");
      const query = new URLSearchParams({ ad_account_id: accountId, start_date: range.startDate, end_date: range.endDate });
      const response = await readJson<{ data: MetaIntelligenceDashboardData }>(`/api/meta/intelligence?${query.toString()}`);
      setPayload(response.data);
      setSelectedAccountId(accountId);
      setDefaultAdAccountId(accountId);
      await loadSavedAudiences(accountId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải tệp khách hàng.");
      setDetail(err instanceof Error ? err.stack || err.message : "");
    } finally {
      setLoading(false);
    }
  }

  async function saveAudience(row: AudienceRow) {
    if (!selectedAccountId) return;
    try {
      await readJson("/api/saved-audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: null,
          code: row.code,
          name: row.name,
          payload: {
            ageRange: row.ageRange,
            gender: row.gender,
            locations: row.locations,
            interests: row.interests,
            behaviors: row.behaviors
          }
        })
      });
      toast.success("Đã lưu tệp khách hàng. Bạn có thể dùng lại khi tạo campaign.");
      await loadSavedAudiences(selectedAccountId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu tệp.");
    }
  }

  function updatePreset(next: DatePreset) {
    setPreset(next);
    if (next !== "custom") setRange(presetRange(next));
  }

  const totalLeads = filteredRows.reduce((sum, row) => sum + row.leads, 0);
  const totalMessages = filteredRows.reduce((sum, row) => sum + row.messages, 0);
  const totalEngagements = filteredRows.reduce((sum, row) => sum + row.engagements, 0);
  const totalSpend = filteredRows.reduce((sum, row) => sum + row.spend, 0);

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
          <div className="flex gap-2">
            <Button disabled={loading} onClick={() => void loadAccounts()} variant="secondary">
              <MaterialIcon name="account_balance_wallet" />
              Nạp tài khoản
            </Button>
            <Button disabled={loading} onClick={() => void loadData()}>
              <MaterialIcon name="refresh" />
              {loading ? "Đang tải..." : "Lấy tệp khách hàng"}
            </Button>
          </div>
        </div>
      </Card>

      {!!savedAudiences.length && (
        <Card className="rounded-3xl p-5">
          <h3 className="text-lg font-extrabold">Tệp đã lưu (dùng lại giữa các tài khoản)</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {savedAudiences.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-2xl bg-surface-container-low p-3">
                <p className="font-bold">{item.code} · {item.name}</p>
                <p className="text-xs text-on-surface-variant">{item.payload.locations || "Không có khu vực"} · {item.payload.ageRange || "Không có độ tuổi"}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

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

      {!loading && filteredRows.length ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Tổng tệp ở nhóm quảng cáo" value={formatNumber(filteredRows.length)} />
            <StatCard label="Tổng lead" value={formatNumber(totalLeads)} />
            <StatCard label="Tổng tin nhắn" value={formatNumber(totalMessages)} />
            <StatCard label="Tổng tương tác" value={formatNumber(totalEngagements)} />
            <StatCard label="Tổng chi tiêu" value={formatMoney(totalSpend, currency)} />
          </section>

          <Card className="overflow-hidden rounded-3xl p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/70 px-6 py-5">
              <div>
                <h3 className="text-lg font-extrabold">Tệp khách hàng ở Nhóm quảng cáo</h3>
                <p className="text-sm text-on-surface-variant">Lấy sở thích, độ tuổi, hành vi, vị trí địa lý từ dữ liệu ad set/creative.</p>
              </div>
              <input className="dashboard-input" placeholder="Lọc theo tên tệp, mã, campaign..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    {["Mã tệp", "Tên tệp", "Nguồn", "Tuổi", "Giới tính", "Vị trí địa lý", "Sở thích", "Hành vi", "Campaign", "Creative", "Lead", "Tin nhắn", "Tương tác", "Chi tiêu", "Lưu"].map(
                      (head) => (
                        <th key={head} className="px-4 py-3 font-extrabold">{head}</th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/70">
                  {filteredRows.map((row) => (
                    <tr key={row.key}>
                      <td className="px-4 py-3"><span className="rounded-full bg-primary-fixed px-3 py-1 font-mono text-xs font-extrabold text-primary">{row.code}</span></td>
                      <td className="px-4 py-3 font-bold">{row.name}</td>
                      <td className="px-4 py-3">Nhóm quảng cáo</td>
                      <td className="px-4 py-3">{row.ageRange}</td>
                      <td className="px-4 py-3">{row.gender}</td>
                      <td className="px-4 py-3">{row.locations}</td>
                      <td className="px-4 py-3">{row.interests}</td>
                      <td className="px-4 py-3">{row.behaviors}</td>
                      <td className="px-4 py-3">{formatNumber(row.campaignCount)}</td>
                      <td className="px-4 py-3">{formatNumber(row.creativeCount)}</td>
                      <td className="px-4 py-3">{formatNumber(row.leads)}</td>
                      <td className="px-4 py-3">{formatNumber(row.messages)}</td>
                      <td className="px-4 py-3">{formatNumber(row.engagements)}</td>
                      <td className="px-4 py-3">{formatMoney(row.spend, currency)}</td>
                      <td className="px-4 py-3">
                        <Button className="min-h-9 px-3 py-1 text-xs" variant="secondary" onClick={() => void saveAudience(row)}>
                          Lưu tệp
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}

      {!loading && payload && !filteredRows.length ? (
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-3xl p-5">
      <p className="text-sm font-bold text-on-surface-variant">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </Card>
  );
}
