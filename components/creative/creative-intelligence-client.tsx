"use client";

import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCachedJson, getCachedState, setCachedState } from "@/lib/meta/client-cache";
import { applyDefaultAdAccount, getDefaultAdAccountId, setDefaultAdAccountId } from "@/lib/meta/default-account";
import type { AdAccount, AdSet, CreativePerformance, MetaAd, MetaIntelligenceDashboardData } from "@/lib/meta/types";
import { formatMoney, formatNumber, formatPercent } from "@/lib/reports/ads-report";
import type { AdsContentPackage } from "@/lib/ai-content-ads-shared";

type DatePreset = "7d" | "30d" | "month" | "custom";
type SortKey = "spend" | "lead" | "message" | "engagement" | "ctr";
type ContentGoal = "message" | "lead" | "traffic" | "engagement" | "sales";
type ContentLibraryItem = {
  id: string;
  title: string;
  product: string;
  industry?: string | null;
  goal?: string | null;
  content_json: AdsContentPackage;
  created_at: string;
};
type CloneStep = {
  key: string;
  label: string;
  status: "pass" | "warning" | "fail";
  message: string;
  details?: Record<string, unknown>;
};
type CloneDiagnostics = {
  ok: boolean;
  steps: CloneStep[];
};
type CloneResult = {
  ok: boolean;
  method?: "copies" | "reuse_creative" | "recreate_creative";
  diagnostics: CloneDiagnostics;
  copiedAdId?: string;
  copiedAd?: MetaAd;
  metaError?: Record<string, unknown>;
  fallbackError?: Record<string, unknown>;
  calledEndpoints: string[];
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

const CREATIVE_CACHE_KEY = "creative:intelligence";

async function readJson<T>(url: string, options?: { force?: boolean }) {
  return getCachedJson<T>(url, options);
}

async function postJson<T>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(json.error || "Không thể gọi API.");
  return json;
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
  const [contentForm, setContentForm] = useState({
    product: "",
    industry: "",
    targetCustomer: "",
    offer: "",
    salesPolicy: "",
    objections: "",
    tone: "thẳng, dễ hiểu, có lực bán hàng",
    goal: "message" as ContentGoal
  });
  const [contentPackage, setContentPackage] = useState<(AdsContentPackage & { raw?: string }) | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState("");
  const [contentLibrary, setContentLibrary] = useState<ContentLibraryItem[]>([]);
  const [contentSaving, setContentSaving] = useState(false);
  const [cloneCreative, setCloneCreative] = useState<CreativePerformance | null>(null);
  const [targetAdsets, setTargetAdsets] = useState<AdSet[]>([]);
  const [targetAdSetId, setTargetAdSetId] = useState("");
  const [cloneDiagnostics, setCloneDiagnostics] = useState<CloneDiagnostics | null>(null);
  const [cloneResult, setCloneResult] = useState<CloneResult | null>(null);
  const [cloneLoading, setCloneLoading] = useState<"diagnostics" | "clone" | "adsets" | "">("");
  const [cloneError, setCloneError] = useState("");

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
    const cached = getCachedState<{
      accounts: AdAccount[];
      selectedAccountId: string;
      preset: DatePreset;
      range: { startDate: string; endDate: string };
      payload: MetaIntelligenceDashboardData | null;
    }>(CREATIVE_CACHE_KEY);
    if (cached) {
      queueMicrotask(() => {
              setAccounts(cached.accounts);
              setSelectedAccountId(cached.selectedAccountId);
              setPreset(cached.preset);
              setRange(cached.range);
              setPayload(cached.payload);
      });
      return;
    }

    readJson<{ data: AdAccount[] }>("/api/meta/adaccounts")
      .then((res) => {
        const rows = res.data ?? [];
        setAccounts(rows);
        const picked = applyDefaultAdAccount(rows, getDefaultAdAccountId() || rows[0]?.id);
        setSelectedAccountId(picked);
      })
      .catch((err: Error) => setError(err.message));
    void loadContentLibrary();
  }, []);

  async function loadData(nextAccountId?: string) {
    setLoading(true);
    setError("");
    try {
      const accountId = nextAccountId || selectedAccountId || getDefaultAdAccountId();
      if (!accountId) throw new Error("Chưa có tài khoản quảng cáo.");
      const query = new URLSearchParams({ ad_account_id: accountId, start_date: range.startDate, end_date: range.endDate });
      const response = await readJson<{ data: MetaIntelligenceDashboardData }>(`/api/meta/intelligence?${query.toString()}`, { force: true });
      setPayload(response.data);
      setSelectedAccountId(accountId);
      setDefaultAdAccountId(accountId);
      setCachedState(CREATIVE_CACHE_KEY, { accounts, selectedAccountId: accountId, preset, range, payload: response.data });
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

  async function openCloneModal(creative: CreativePerformance) {
    setCloneCreative(creative);
    setTargetAdSetId("");
    setCloneDiagnostics(null);
    setCloneResult(null);
    setCloneError("");
    setCloneLoading("adsets");
    try {
      const accountId = selectedAccountId || getDefaultAdAccountId();
      if (!accountId) throw new Error("Chưa chọn tài khoản quảng cáo.");
      const response = await readJson<{ data: AdSet[] }>(`/api/meta/adsets?ad_account_id=${encodeURIComponent(accountId)}`, { force: true });
      setTargetAdsets(response.data ?? []);
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : "Không thể tải danh sách nhóm quảng cáo đích.");
    } finally {
      setCloneLoading("");
    }
  }

  function clonePayload() {
    const accountId = selectedAccountId || getDefaultAdAccountId();
    if (!accountId) throw new Error("Chưa chọn tài khoản quảng cáo.");
    if (!cloneCreative?.adId) throw new Error("Creative này không có ad_id thật để nhân bản.");
    return {
      ad_account_id: accountId,
      source_ad_id: cloneCreative.adId,
      target_adset_id: targetAdSetId || null
    };
  }

  async function runCloneDiagnostics() {
    setCloneLoading("diagnostics");
    setCloneError("");
    setCloneResult(null);
    try {
      const response = await postJson<{ data: CloneDiagnostics }>("/api/meta/ads-clone/diagnostics", clonePayload());
      setCloneDiagnostics(response.data);
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : "Không thể kiểm tra trước khi nhân bản.");
    } finally {
      setCloneLoading("");
    }
  }

  async function runCloneAd() {
    setCloneLoading("clone");
    setCloneError("");
    try {
      const response = await postJson<{ data: CloneResult }>("/api/meta/ads-clone", clonePayload());
      setCloneResult(response.data);
      setCloneDiagnostics(response.data.diagnostics);
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : "Không thể nhân bản quảng cáo.");
    } finally {
      setCloneLoading("");
    }
  }

  async function generateContentPackage() {
    setContentLoading(true);
    setContentError("");
    try {
      const response = await fetch("/api/ai/content-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contentForm, ad_account_id: selectedAccountId || getDefaultAdAccountId() || undefined })
      });
      const json = (await response.json().catch(() => ({}))) as { data?: AdsContentPackage & { raw?: string }; error?: string };
      if (!response.ok || !json.data) throw new Error(json.error || "Không thể tạo content quảng cáo.");
      setContentPackage(json.data);
      void loadContentLibrary(true);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "Không thể tạo content quảng cáo.");
    } finally {
      setContentLoading(false);
    }
  }

  async function copyContent(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function loadContentLibrary(force = false) {
    try {
      const response = await readJson<{ data: ContentLibraryItem[]; storage?: string }>("/api/ai/content-library", { force });
      setContentLibrary(response.data ?? []);
    } catch {
      // Library is optional; generator should keep working even before migration is applied.
    }
  }

  async function saveContentPackage() {
    if (!contentPackage) return;
    setContentSaving(true);
    setContentError("");
    try {
      const response = await fetch("/api/ai/content-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: contentForm,
          content: contentPackage,
          title: `${contentForm.product || "Content ads"} - ${new Date().toLocaleDateString("vi-VN")}`
        })
      });
      const json = (await response.json().catch(() => ({}))) as { data?: ContentLibraryItem; error?: string };
      if (!response.ok || !json.data) throw new Error(json.error || "Không thể lưu content.");
      setContentLibrary((items) => [json.data as ContentLibraryItem, ...items]);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "Không thể lưu content.");
    } finally {
      setContentSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-lg p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-outline">Creator Ads AI</p>
            <h3 className="mt-2 text-xl font-extrabold">Viết content quảng cáo để test</h3>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              Nhập sản phẩm, chính sách bán hàng và khuyến mãi. AI sẽ tạo hook, nội dung chính, headline, CTA và brief hình/video. Phần này chỉ tạo nội dung để review/copy, chưa tự đăng bài.
            </p>
          </div>
          <Button onClick={() => void generateContentPackage()} disabled={contentLoading || !contentForm.product.trim()}>
            <MaterialIcon filled name="auto_awesome" />
            {contentLoading ? "Đang viết..." : "Tạo content ads"}
          </Button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-bold">Sản phẩm/dịch vụ</span>
            <input className="dashboard-input" value={contentForm.product} onChange={(event) => setContentForm((item) => ({ ...item, product: event.target.value }))} placeholder="Ví dụ: khóa học AI cho chủ shop" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Ngành</span>
            <input className="dashboard-input" value={contentForm.industry} onChange={(event) => setContentForm((item) => ({ ...item, industry: event.target.value }))} placeholder="Spa, khóa học, ecommerce..." />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Mục tiêu</span>
            <select className="dashboard-input" value={contentForm.goal} onChange={(event) => setContentForm((item) => ({ ...item, goal: event.target.value as ContentGoal }))}>
              <option value="message">Tin nhắn</option>
              <option value="lead">Lead</option>
              <option value="traffic">Traffic</option>
              <option value="engagement">Tương tác</option>
              <option value="sales">Sales</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Khách hàng mục tiêu</span>
            <input className="dashboard-input" value={contentForm.targetCustomer} onChange={(event) => setContentForm((item) => ({ ...item, targetCustomer: event.target.value }))} placeholder="Nữ 25-44, chủ shop..." />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Offer/khuyến mãi</span>
            <input className="dashboard-input" value={contentForm.offer} onChange={(event) => setContentForm((item) => ({ ...item, offer: event.target.value }))} placeholder="Giảm giá, tặng quà..." />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Chính sách bán hàng</span>
            <input className="dashboard-input" value={contentForm.salesPolicy} onChange={(event) => setContentForm((item) => ({ ...item, salesPolicy: event.target.value }))} placeholder="Bảo hành, trả góp, tư vấn..." />
          </label>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold">Lý do khách phân vân</span>
            <textarea className="dashboard-input min-h-24" value={contentForm.objections} onChange={(event) => setContentForm((item) => ({ ...item, objections: event.target.value }))} placeholder="Đắt, sợ không hiệu quả, chưa tin..." />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Giọng văn</span>
            <textarea className="dashboard-input min-h-24" value={contentForm.tone} onChange={(event) => setContentForm((item) => ({ ...item, tone: event.target.value }))} />
          </label>
        </div>

        {contentError ? <div className="mt-4 rounded-lg border border-error-container bg-error-container/70 p-4 text-sm font-bold text-error">{contentError}</div> : null}

        {contentPackage ? (
          <>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => void saveContentPackage()} disabled={contentSaving}>
                <MaterialIcon name="bookmark_add" />
                {contentSaving ? "Đang lưu..." : "Lưu vào thư viện"}
              </Button>
            </div>
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <ContentBlock title="Tóm tắt chiến lược" items={[contentPackage.summary]} />
              <ContentBlock title="Góc quảng cáo" items={contentPackage.angles} />
              <ContentBlock title="Hook mở đầu" items={contentPackage.hooks} />
              <ContentBlock title="Headline" items={contentPackage.headlines} />
              <ContentBlock title="Nội dung chính" items={contentPackage.primaryTexts} onCopy={copyContent} large />
              <ContentBlock title="Brief hình/video" items={contentPackage.creativeBriefs} />
              <ContentBlock title="CTA" items={contentPackage.ctas} />
              <ContentBlock title="Kế hoạch test" items={[contentPackage.recommendedTestPlan]} />
            </div>
          </>
        ) : null}

        <div className="mt-6 rounded-lg bg-surface-container-low p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="font-extrabold">Thư viện content đã lưu</h4>
              <p className="mt-1 text-sm text-on-surface-variant">Dùng để lấy lại hook/nội dung thắng cho lần tạo campaign sau.</p>
            </div>
            <Button variant="secondary" onClick={() => void loadContentLibrary(true)}>
              <MaterialIcon name="refresh" />
              Tải lại
            </Button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {contentLibrary.length ? contentLibrary.map((item) => (
              <button
                key={item.id}
                className="rounded-lg bg-white p-4 text-left transition hover:shadow-soft"
                type="button"
                onClick={() => setContentPackage(item.content_json)}
              >
                <p className="font-extrabold">{item.title}</p>
                <p className="mt-1 text-xs font-semibold text-outline">{item.industry || "Chưa ghi ngành"} · {item.goal || "content"}</p>
                <p className="mt-3 line-clamp-3 text-sm text-on-surface-variant">{item.content_json.summary}</p>
              </button>
            )) : (
              <div className="rounded-lg bg-white p-4 text-sm text-on-surface-variant">Chưa có content đã lưu.</div>
            )}
          </div>
        </div>
      </Card>

      <Card className="rounded-lg p-5">
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
        <Card className="rounded-lg border border-error-container bg-error-container/70 p-5">
          <p className="font-bold text-error">{error}</p>
        </Card>
      ) : null}

      {payload?.creativeAccessWarning ? (
        <Card className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm font-semibold text-yellow-900">{payload.creativeAccessWarning}</Card>
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

          <Card className="rounded-lg p-6">
            <h3 className="text-lg font-extrabold">Phễu hiệu suất creative</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Theo dõi từ creative có chi tiêu đến creative có kết quả.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <FunnelCell label="Creative có chi tiêu" value={stats.withSpend} total={Math.max(stats.total, 1)} />
              <FunnelCell label="Creative có tương tác" value={stats.withEngagement} total={Math.max(stats.total, 1)} />
              <FunnelCell label="Creative có lead/tin nhắn" value={stats.withResult} total={Math.max(stats.total, 1)} />
            </div>
          </Card>

          <Card className="overflow-hidden rounded-lg p-0">
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
                    {["Creative", "Campaign", "Nhóm quảng cáo", "Spend", "Lead", "Tin nhắn", "Tương tác", "CTR", "CPM", "CPC", "Thao tác"].map((head) => (
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
                        <td className="px-4 py-3">
                          <Button className="h-9 px-3 text-xs" variant="secondary" onClick={() => void openCloneModal(creative)}>
                            <MaterialIcon name="content_copy" />
                            Nhân bản
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
      {cloneCreative ? (
        <CloneAdModal
          adsets={targetAdsets}
          cloneCreative={cloneCreative}
          diagnostics={cloneDiagnostics}
          error={cloneError}
          loading={cloneLoading}
          onClose={() => {
            setCloneCreative(null);
            setCloneDiagnostics(null);
            setCloneResult(null);
            setCloneError("");
          }}
          onDiagnostics={() => void runCloneDiagnostics()}
          onClone={() => void runCloneAd()}
          result={cloneResult}
          targetAdSetId={targetAdSetId}
          setTargetAdSetId={setTargetAdSetId}
        />
      ) : null}
    </div>
  );
}

function CloneAdModal({
  adsets,
  cloneCreative,
  diagnostics,
  error,
  loading,
  onClose,
  onDiagnostics,
  onClone,
  result,
  targetAdSetId,
  setTargetAdSetId
}: {
  adsets: AdSet[];
  cloneCreative: CreativePerformance;
  diagnostics: CloneDiagnostics | null;
  error: string;
  loading: "diagnostics" | "clone" | "adsets" | "";
  onClose: () => void;
  onDiagnostics: () => void;
  onClone: () => void;
  result: CloneResult | null;
  targetAdSetId: string;
  setTargetAdSetId: (value: string) => void;
}) {
  const canClone = Boolean(diagnostics?.ok) && loading !== "clone";
  const directError = result?.metaError || result?.fallbackError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-outline-variant bg-white px-6 py-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-outline">Nhân bản quảng cáo Meta Ads</p>
            <h3 className="mt-1 text-2xl font-extrabold">{cloneCreative.adName || cloneCreative.creativeName}</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              App chỉ dùng ad_id thật và mặc định tạo bản copy ở trạng thái tạm dừng.
            </p>
          </div>
          <button className="rounded-full p-2 hover:bg-surface-container-low" type="button" onClick={onClose} aria-label="Đóng">
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="grid gap-5 p-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-lg border border-outline-variant p-4">
              <h4 className="font-extrabold">Quảng cáo nguồn</h4>
              <dl className="mt-3 space-y-2 text-sm">
                <InfoRow label="Ad ID" value={cloneCreative.adId} mono />
                <InfoRow label="Creative ID" value={cloneCreative.creativeId || "Không có dữ liệu"} mono />
                <InfoRow label="Campaign" value={cloneCreative.campaignName} />
                <InfoRow label="Nhóm quảng cáo" value={cloneCreative.adsetName} />
              </dl>
            </div>

            <div className="rounded-lg border border-outline-variant p-4">
              <label className="space-y-2">
                <span className="text-sm font-extrabold">Nhóm quảng cáo đích</span>
                <select
                  className="dashboard-input"
                  value={targetAdSetId}
                  onChange={(event) => setTargetAdSetId(event.target.value)}
                  disabled={loading === "adsets"}
                >
                  <option value="">Giữ nguyên nhóm quảng cáo gốc</option>
                  {adsets.map((adset) => (
                    <option key={adset.id} value={adset.id}>
                      {adset.name} ({adset.id})
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-4 flex items-center gap-2 rounded-lg bg-surface-container-low p-3 text-sm font-semibold">
                <input checked readOnly type="checkbox" />
                Tạo bản copy ở trạng thái tạm dừng
              </label>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" disabled={Boolean(loading)} onClick={onDiagnostics}>
                  <MaterialIcon name="fact_check" />
                  {loading === "diagnostics" ? "Đang kiểm tra..." : "Kiểm tra trước khi nhân bản"}
                </Button>
                <Button disabled={!canClone || Boolean(loading)} onClick={onClone}>
                  <MaterialIcon name="content_copy" />
                  {loading === "clone" ? "Đang nhân bản..." : "Nhân bản"}
                </Button>
              </div>
            </div>

            {error ? <div className="rounded-lg border border-error-container bg-error-container/70 p-4 text-sm font-bold text-error">{error}</div> : null}
            {result?.ok ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                <p className="font-extrabold">Nhân bản thành công</p>
                <p className="mt-1">Ad mới: <span className="font-mono">{result.copiedAdId}</span></p>
                <p>Trạng thái: <span className="font-bold">{result.copiedAd?.status || "PAUSED"}</span></p>
                <p>Phương thức: <span className="font-bold">{result.method === "copies" ? "Meta /copies" : "Fallback tạo ad PAUSED"}</span></p>
              </div>
            ) : null}
            {directError ? (
              <div className="rounded-lg bg-surface-container-low p-4 text-xs">
                <p className="font-extrabold">Chi tiết lỗi Meta</p>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3">
                  {JSON.stringify(directError, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-outline-variant p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold">Checklist trước khi clone</h4>
                <p className="mt-1 text-sm text-on-surface-variant">Fail ở bước nào thì xử lý đúng bước đó, không đoán mò.</p>
              </div>
              {loading ? <span className="h-2 w-28 overflow-hidden rounded-full bg-surface-container-low"><span className="block h-full w-1/2 animate-pulse rounded-full bg-primary" /></span> : null}
            </div>
            <div className="mt-4 space-y-2">
              {(diagnostics?.steps ?? defaultCloneSteps()).map((step) => (
                <CloneStepRow key={step.key} step={step} />
              ))}
            </div>
            {!diagnostics ? (
              <div className="mt-4 rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
                Bấm “Kiểm tra trước khi nhân bản” để app kiểm tra token, quyền tài khoản, ad gốc, creative và adset đích trước khi gọi Meta.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function defaultCloneSteps(): CloneStep[] {
  return [
    ["token_valid", "Token hợp lệ"],
    ["ads_management", "Token có ads_management"],
    ["ad_account_visible", "Token nhìn thấy ad account"],
    ["user_ad_account_permission", "User có quyền quản lý"],
    ["ad_account_status", "Ad account không bị hạn chế"],
    ["source_ad", "Đọc được ad gốc"],
    ["creative", "Đọc được creative gốc"],
    ["target_adset", "Đọc được adset đích"],
    ["clone_result", "Clone endpoint hoặc fallback"]
  ].map(([key, label]) => ({ key, label, status: "warning", message: "Chưa kiểm tra." as const }));
}

function CloneStepRow({ step }: { step: CloneStep }) {
  const icon = step.status === "pass" ? "check_circle" : step.status === "warning" ? "warning" : "error";
  const color = step.status === "pass" ? "text-green-700" : step.status === "warning" ? "text-amber-700" : "text-error";
  return (
    <details className="rounded-lg bg-surface-container-low p-3">
      <summary className="flex cursor-pointer list-none items-start gap-3">
        <MaterialIcon className={color} name={icon} />
        <span>
          <span className="block font-extrabold">{step.label}</span>
          <span className="block text-sm text-on-surface-variant">{step.message}</span>
        </span>
      </summary>
      {step.details ? (
        <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-xs">
          {JSON.stringify(step.details, null, 2)}
        </pre>
      ) : null}
    </details>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <dt className="font-bold text-on-surface-variant">{label}</dt>
      <dd className={mono ? "break-all font-mono text-xs" : "font-semibold"}>{value}</dd>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-lg p-5">
      <p className="text-sm font-bold text-on-surface-variant">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </Card>
  );
}

function FunnelCell({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-md bg-surface-container-low p-4">
      <p className="text-sm font-bold text-on-surface-variant">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{formatNumber(value)}</p>
      <div className="mt-3 h-2 rounded-full bg-white">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <p className="mt-2 text-xs font-semibold text-outline">{percent}% trên tổng creative</p>
    </div>
  );
}

function ContentBlock({
  title,
  items,
  large,
  onCopy
}: {
  title: string;
  items: string[];
  large?: boolean;
  onCopy?: (text: string) => Promise<void>;
}) {
  return (
    <div className={`rounded-lg bg-surface-container-low p-4 ${large ? "xl:col-span-2" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-extrabold">{title}</h4>
        {onCopy && items.length ? (
          <Button className="h-9 px-3 text-xs" variant="secondary" onClick={() => void onCopy(items.join("\n\n"))}>
            <MaterialIcon name="content_copy" />
            Copy
          </Button>
        ) : null}
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="rounded-md bg-white p-3 text-sm leading-6 text-on-surface-variant">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

