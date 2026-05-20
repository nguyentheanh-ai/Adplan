"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { buildInternalAudienceSuggestions, generateCampaignDraft } from "@/lib/campaign-builder";
import type { AdAccount, AudienceSuggestion, CampaignBuilderInput, CampaignDraft } from "@/lib/meta/types";

const defaultInput: CampaignBuilderInput = {
  productName: "",
  industry: "",
  objective: "Tin nhắn",
  dailyBudget: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  runContinuously: true,
  fanpage: "",
  website: "",
  location: "Việt Nam",
  targetCustomer: "",
  offer: "",
  notes: "",
  mediaNote: "Chọn media sau"
};

async function readJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Không thể lấy dữ liệu.");
  return payload;
}

export function CampaignBuilderClient() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [form, setForm] = useState<CampaignBuilderInput>(defaultInput);
  const [interests, setInterests] = useState<AudienceSuggestion[]>([]);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  const [interestNotice, setInterestNotice] = useState("");
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);

  useEffect(() => {
    readJson<{ data: AdAccount[] }>("/api/meta/adaccounts")
      .then((payload) => {
        setAccounts(payload.data ?? []);
        setSelectedAccountId(payload.data?.[0]?.id ?? "");
      })
      .catch((err: Error) => setInterestNotice(err.message));
  }, []);

  const selectedInterests = useMemo(
    () => interests.filter((interest) => selectedInterestIds.includes(interest.id)),
    [interests, selectedInterestIds]
  );

  function updateField<K extends keyof CampaignBuilderInput>(field: K, value: CampaignBuilderInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function searchInterests() {
    const query = [form.industry, form.productName, form.targetCustomer].filter(Boolean).join(" ");
    if (!query.trim()) {
      toast.error("Nhập ngành hàng, sản phẩm hoặc mô tả khách hàng trước.");
      return;
    }

    setSearching(true);
    setInterestNotice("");

    try {
      const params = new URLSearchParams({ q: query, ad_account_id: selectedAccountId });
      const payload = await readJson<{ data: AudienceSuggestion[] }>(`/api/meta/targeting-search?${params.toString()}`);
      const facebookInterests = payload.data ?? [];
      if (!facebookInterests.length) {
        throw new Error("Facebook chưa trả về interest phù hợp.");
      }
      setInterests(facebookInterests);
      setSelectedInterestIds(facebookInterests.slice(0, 3).map((item) => item.id));
      setInterestNotice("Interest đã được lấy từ Facebook Targeting Search.");
    } catch (err) {
      const fallback = buildInternalAudienceSuggestions(form);
      setInterests(fallback);
      setSelectedInterestIds(fallback.slice(0, 3).map((item) => item.id));
      setInterestNotice(
        `${err instanceof Error ? err.message : "Không gọi được Facebook Targeting Search."} Gợi ý nội bộ, chưa xác minh từ Facebook.`
      );
    } finally {
      setSearching(false);
    }
  }

  function generateDraft() {
    if (!form.productName.trim() || !form.industry.trim() || !form.dailyBudget.trim()) {
      toast.error("Vui lòng nhập tên sản phẩm, ngành hàng và ngân sách.");
      return;
    }
    const nextDraft = generateCampaignDraft(form, selectedInterests);
    setDraft(nextDraft);
  }

  function saveDraft() {
    const nextDraft = draft ?? generateCampaignDraft(form, selectedInterests);
    localStorage.setItem("adplanner_campaign_draft", JSON.stringify({ form, draft: nextDraft, savedAt: new Date().toISOString() }));
    setDraft(nextDraft);
    toast.success("Đã lưu bản nháp trên trình duyệt.");
  }

  function exportJson() {
    const nextDraft = draft ?? generateCampaignDraft(form, selectedInterests);
    const blob = new Blob([JSON.stringify(nextDraft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `campaign-draft-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyConfig() {
    const nextDraft = draft ?? generateCampaignDraft(form, selectedInterests);
    await navigator.clipboard.writeText(JSON.stringify(nextDraft, null, 2));
    toast.success("Đã copy cấu hình campaign.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <Card className="rounded-3xl p-6">
          <div className="mb-5">
            <h3 className="text-lg font-extrabold">Thông tin campaign</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Các trường này sẽ được dùng để tạo preview cấu hình Meta Ads.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tên sản phẩm/dịch vụ">
              <Input value={form.productName} onChange={(event) => updateField("productName", event.target.value)} placeholder="Ví dụ: Khóa học AI Marketing" />
            </Field>
            <Field label="Ngành hàng">
              <Input value={form.industry} onChange={(event) => updateField("industry", event.target.value)} placeholder="Giáo dục, spa, bất động sản..." />
            </Field>
            <Field label="Mục tiêu quảng cáo">
              <select
                className="h-11 w-full rounded-lg bg-slate-100 px-4 text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-primary"
                value={form.objective}
                onChange={(event) => updateField("objective", event.target.value as CampaignBuilderInput["objective"])}
              >
                <option>Tin nhắn</option>
                <option>Lead</option>
                <option>Traffic</option>
                <option>Engagement</option>
                <option>Sales</option>
              </select>
            </Field>
            <Field label="Ngân sách mỗi ngày">
              <Input value={form.dailyBudget} onChange={(event) => updateField("dailyBudget", event.target.value)} placeholder="Ví dụ: 500.000đ" />
            </Field>
            <Field label="Ngày bắt đầu">
              <Input type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} />
            </Field>
            <Field label="Ngày kết thúc">
              <Input
                type="date"
                value={form.endDate}
                disabled={form.runContinuously}
                onChange={(event) => updateField("endDate", event.target.value)}
              />
            </Field>
            <label className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4 text-sm font-bold md:col-span-2">
              <input
                type="checkbox"
                checked={form.runContinuously}
                onChange={(event) => updateField("runContinuously", event.target.checked)}
              />
              Chạy liên tục, chưa đặt ngày kết thúc
            </label>
            <Field label="Fanpage">
              <Input value={form.fanpage} onChange={(event) => updateField("fanpage", event.target.value)} placeholder="Tên fanpage sẽ chạy ads" />
            </Field>
            <Field label="Website/Landing page">
              <Input value={form.website} onChange={(event) => updateField("website", event.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Khu vực chạy">
              <Input value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="TP.HCM, Hà Nội, toàn quốc..." />
            </Field>
            <Field label="Media">
              <Input value={form.mediaNote} onChange={(event) => updateField("mediaNote", event.target.value)} placeholder="Chọn media sau" />
            </Field>
            <Field label="Mô tả khách hàng mục tiêu" className="md:col-span-2">
              <Textarea value={form.targetCustomer} onChange={(event) => updateField("targetCustomer", event.target.value)} placeholder="Ai là người mua chính, độ tuổi, nhu cầu, bối cảnh..." />
            </Field>
            <Field label="Offer/ưu đãi" className="md:col-span-2">
              <Textarea value={form.offer} onChange={(event) => updateField("offer", event.target.value)} placeholder="Ưu đãi, cam kết, lợi ích nổi bật..." />
            </Field>
            <Field label="Ghi chú thêm" className="md:col-span-2">
              <Textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Lưu ý về sản phẩm, điều kiện, bằng chứng, ràng buộc..." />
            </Field>
          </div>
        </Card>

        <Card className="rounded-3xl p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-extrabold">Tệp sở thích/hành vi</h3>
              <p className="mt-1 text-sm text-on-surface-variant">Ưu tiên tìm từ Facebook Targeting Search. Nếu lỗi sẽ dùng gợi ý nội bộ.</p>
            </div>
            <Button onClick={searchInterests} disabled={searching || !selectedAccountId}>
              <MaterialIcon name="search" />
              {searching ? "Đang tìm..." : "Tìm từ Facebook"}
            </Button>
          </div>

          <Field label="Tài khoản quảng cáo">
            <select
              className="h-11 w-full rounded-lg bg-slate-100 px-4 text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-primary"
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name || account.id} - {account.id}
                </option>
              ))}
            </select>
          </Field>

          {interestNotice ? <p className="mt-4 rounded-2xl bg-surface-container-low p-4 text-sm leading-6 text-on-surface-variant">{interestNotice}</p> : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {interests.map((interest) => (
              <label key={interest.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-outline-variant/70 bg-white p-4">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={selectedInterestIds.includes(interest.id)}
                  onChange={(event) =>
                    setSelectedInterestIds((current) =>
                      event.target.checked ? [...current, interest.id] : current.filter((id) => id !== interest.id)
                    )
                  }
                />
                <span>
                  <span className="block font-bold text-on-surface">{interest.name}</span>
                  <span className="text-xs text-on-surface-variant">
                    {interest.source === "facebook" ? `Facebook ID: ${interest.id}` : "Gợi ý nội bộ, chưa xác minh từ Facebook"}
                    {interest.audience_size ? ` · Quy mô: ${interest.audience_size.toLocaleString("vi-VN")}` : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button variant="ai" onClick={generateDraft}>
            <MaterialIcon filled name="auto_awesome" />
            Tạo bản nháp campaign
          </Button>
          <Button variant="secondary" onClick={saveDraft}>
            <MaterialIcon name="save" />
            Lưu bản nháp
          </Button>
          <Button variant="secondary" onClick={exportJson}>
            <MaterialIcon name="data_object" />
            Xuất JSON
          </Button>
          <Button variant="secondary" onClick={copyConfig}>
            <MaterialIcon name="content_copy" />
            Copy cấu hình
          </Button>
          <Button disabled>
            <MaterialIcon name="rocket_launch" />
            Launch lên Meta - Sắp ra mắt
          </Button>
        </div>
      </div>

      <CampaignPreview draft={draft} fallbackDraft={generateCampaignDraft(form, selectedInterests)} />
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className="text-sm font-bold text-on-surface">{label}</span>
      {children}
    </label>
  );
}

function CampaignPreview({ draft, fallbackDraft }: { draft: CampaignDraft | null; fallbackDraft: CampaignDraft }) {
  const data = draft ?? fallbackDraft;

  return (
    <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
      <Card className="rounded-3xl border border-primary/10 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
            <MaterialIcon filled name="preview" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold">Preview cấu hình</h3>
            <p className="text-sm text-on-surface-variant">Chỉ là bản nháp. Không tự launch campaign thật.</p>
          </div>
        </div>
        <PreviewSection title="1. Campaign" rows={data.campaign} />
        <PreviewSection
          title="2. Ad Set"
          rows={{
            name: data.adSet.name,
            ageRange: data.adSet.ageRange,
            gender: data.adSet.gender,
            location: data.adSet.location,
            interests: data.adSet.interests.map((item) => item.name).join(", "),
            behaviors: data.adSet.behaviors.join(", "),
            placement: data.adSet.placement,
            optimizationGoal: data.adSet.optimizationGoal,
            billingEvent: data.adSet.billingEvent
          }}
        />
        <PreviewSection title="3. Ads" rows={data.ads} />
        <PreviewSection title="4. Cấu trúc naming" rows={data.naming} />
      </Card>
    </div>
  );
}

function PreviewSection({ title, rows }: { title: string; rows: Record<string, unknown> }) {
  return (
    <div className="border-t border-outline-variant/70 py-5 first:border-t-0 first:pt-0">
      <h4 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-primary">{title}</h4>
      <div className="space-y-2">
        {Object.entries(rows).map(([key, value]) => (
          <div key={key} className="rounded-2xl bg-surface-container-low p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-outline">{key}</p>
            <p className="mt-1 break-words text-sm font-semibold leading-6 text-on-surface">
              {typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value || "Chưa có")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
