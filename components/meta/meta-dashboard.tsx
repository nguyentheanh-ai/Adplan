"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/material-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { applyDefaultAdAccount, getDefaultAdAccountId, setDefaultAdAccountId } from "@/lib/meta/default-account";
import { cn } from "@/lib/utils";

type MetaAdAccount = {
  id: string;
  account_id?: string;
  name?: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
};

type MetaCampaign = {
  id: string;
  name: string;
  status?: string;
  objective?: string;
  created_time?: string;
};

type ApiResult<T> = {
  data?: T;
  error?: string;
};

async function readJson<T>(response: Response) {
  const payload = (await response.json()) as ApiResult<T>;
  if (!response.ok) throw new Error(payload.error ?? "Meta API trả về lỗi.");
  return payload.data as T;
}

function statusLabel(status?: number) {
  if (status === 1) return "Đang hoạt động";
  if (status === 2) return "Vô hiệu hóa";
  if (status === 3) return "Chưa thanh toán";
  return status ? `Mã ${status}` : "Chưa rõ";
}

export function MetaDashboard({ compact = false }: { compact?: boolean }) {
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [selectedAdAccountId, setSelectedAdAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCampaignsForAccount = useCallback(async (adAccountId: string) => {
    setLoading(true);
    setError(null);
    try {
      const campaignData = await fetch(`/api/meta/campaigns?ad_account_id=${encodeURIComponent(adAccountId)}`).then((response) =>
        readJson<MetaCampaign[]>(response)
      );
      setCampaigns(campaignData ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tải campaigns.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMeta = useCallback(
    async (preferredAdAccountId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const accountData = await fetch("/api/meta/adaccounts").then((response) => readJson<MetaAdAccount[]>(response));
        const nextAccounts = accountData ?? [];
        setAccounts(nextAccounts);

        const nextSelected = applyDefaultAdAccount(nextAccounts, preferredAdAccountId || getDefaultAdAccountId() || nextAccounts[0]?.id);
        setSelectedAdAccountId(nextSelected);

        if (nextSelected) {
          const campaignData = await fetch(`/api/meta/campaigns?ad_account_id=${encodeURIComponent(nextSelected)}`).then((response) =>
            readJson<MetaCampaign[]>(response)
          );
          setCampaigns(campaignData ?? []);
        } else {
          setCampaigns([]);
        }

        toast.success("Kết nối Meta hoạt động");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Không thể kiểm tra Meta.";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  function chooseAccount(adAccountId: string) {
    setSelectedAdAccountId(adAccountId);
    setDefaultAdAccountId(adAccountId);
    void loadCampaignsForAccount(adAccountId);
  }

  async function createCampaign(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const objective = String(formData.get("objective") || "OUTCOME_TRAFFIC");
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/meta/create-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad_account_id: selectedAdAccountId, name, objective })
      });
      await readJson<{ id: string }>(response);
      toast.success("Đã tạo campaign PAUSED");
      await loadCampaignsForAccount(selectedAdAccountId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tạo campaign.";
      setError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMeta();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMeta]);

  if (compact) {
    return (
      <Card className="mt-8 overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-6">
          <div>
            <h3 className="text-[20px] font-semibold">Campaign từ Meta</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Đọc trực tiếp từ tài khoản quảng cáo đang chọn.</p>
          </div>
          <Button disabled={loading} onClick={() => void loadMeta(selectedAdAccountId)} variant="secondary">
            <MaterialIcon className={loading ? "animate-spin" : ""} name={loading ? "sync" : "refresh"} />
            Làm mới
          </Button>
        </div>
        <div className="border-b border-outline-variant px-6 py-4">
          <AccountSelector accounts={accounts} compact onSelect={chooseAccount} selectedAdAccountId={selectedAdAccountId} />
        </div>
        <CampaignTable campaigns={campaigns.slice(0, 5)} />
        {error ? <p className="px-6 pb-5 text-sm font-semibold text-error">{error}</p> : null}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/10 bg-white p-5 custom-shadow md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-bold text-primary">Meta Marketing API</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Sau khi đăng nhập Facebook, app quét các tài khoản quảng cáo của chính Facebook đó. Token chỉ chạy ở server.
          </p>
        </div>
        <Button disabled={loading} onClick={() => void loadMeta(selectedAdAccountId)} variant="ai">
          <MaterialIcon className={loading ? "animate-spin" : ""} name={loading ? "sync" : "hub"} />
          Test kết nối Meta
        </Button>
      </div>

      {error ? <div className="rounded-xl border border-error/20 bg-error-container/30 p-4 text-sm font-semibold text-error">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-2xl p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
            <MaterialIcon name="account_balance_wallet" />
            Tài khoản quảng cáo
          </h3>
          <p className="mb-4 text-sm leading-6 text-on-surface-variant">
            Chọn tài khoản để xem campaign và tạo campaign PAUSED. ID quảng cáo được hiển thị để kiểm tra.
          </p>
          {accounts.length ? (
            <AccountSelector accounts={accounts} onSelect={chooseAccount} selectedAdAccountId={selectedAdAccountId} />
          ) : (
            <EmptyMetaText text={loading ? "Đang kiểm tra tài khoản quảng cáo..." : "Chưa tải được tài khoản quảng cáo."} />
          )}
        </Card>

        <Card className="rounded-2xl p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
            <MaterialIcon name="add_circle" />
            Tạo campaign PAUSED
          </h3>
          <form action={createCampaign} className="space-y-4">
            <label className="block text-sm font-bold text-on-surface">
              Tên campaign
              <input className="form-input mt-2" name="name" placeholder="AI Ads Planner - Traffic campaign" required />
            </label>
            <label className="block text-sm font-bold text-on-surface">
              Objective
              <select className="form-input mt-2" name="objective" defaultValue="OUTCOME_TRAFFIC">
                <option value="OUTCOME_TRAFFIC">OUTCOME_TRAFFIC</option>
              </select>
            </label>
            <div className="rounded-xl bg-surface-container-low p-4 text-sm leading-6 text-on-surface-variant">
              Tài khoản đang chọn: <strong>{selectedAdAccountId || "Chưa chọn"}</strong>.
              <br />
              Campaign luôn tạo với <strong>status: PAUSED</strong>, <strong>buying_type: AUCTION</strong> và <strong>special_ad_categories: []</strong>.
            </div>
            <Button disabled={creating || !selectedAdAccountId} type="submit" variant="primary">
              <MaterialIcon className={creating ? "animate-spin" : ""} name={creating ? "sync" : "verified"} />
              Tạo campaign PAUSED
            </Button>
          </form>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl p-0">
        <div className="border-b border-outline-variant px-6 py-6">
          <h3 className="text-[20px] font-semibold">Danh sách campaigns</h3>
          <p className="mt-1 text-sm text-on-surface-variant">Fields: id, name, status, objective, created_time.</p>
        </div>
        <CampaignTable campaigns={campaigns} />
      </Card>
    </div>
  );
}

function AccountSelector({
  accounts,
  selectedAdAccountId,
  onSelect,
  compact = false
}: {
  accounts: MetaAdAccount[];
  selectedAdAccountId: string;
  onSelect: (adAccountId: string) => void;
  compact?: boolean;
}) {
  const selected = accounts.find((account) => account.id === selectedAdAccountId);
  return (
    <div className="space-y-4">
      <label className="block text-sm font-bold text-on-surface">
        Tài khoản quảng cáo
        <select className="form-input mt-2" onChange={(event) => onSelect(event.target.value)} value={selectedAdAccountId}>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name || account.id} - {account.id}
            </option>
          ))}
        </select>
      </label>

      {selected ? (
        <div className={cn("rounded-xl bg-surface-container-low p-4", compact && "grid gap-3 md:grid-cols-4")}>
          <AccountField label="Tài khoản quảng cáo" value={selected.name || selected.id} />
          <AccountField label="ID quảng cáo" value={selected.id} />
          <AccountField label="Account ID" value={selected.account_id || selected.id.replace("act_", "")} />
          <AccountField label="Đơn vị tiền tệ" value={selected.currency || "Chưa rõ"} />
          <AccountField label="Múi giờ" value={selected.timezone_name || "Chưa rõ"} />
          <AccountField label="Trạng thái" value={statusLabel(selected.account_status)} />
          {!compact ? (
            <Button className="mt-2" onClick={() => onSelect(selected.id)} variant="secondary">
              <MaterialIcon name="check_circle" />
              Chọn tài khoản này
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AccountField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-outline">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-on-surface">{value}</p>
    </div>
  );
}

function CampaignTable({ campaigns }: { campaigns: MetaCampaign[] }) {
  if (!campaigns.length) return <EmptyMetaText text="Chưa có campaign hoặc token chưa có quyền đọc campaign." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low text-[13px] font-semibold text-on-surface-variant">
            <th className="px-6 py-4">Tên</th>
            <th className="px-6 py-4">Objective</th>
            <th className="px-6 py-4">Trạng thái</th>
            <th className="px-6 py-4">Ngày tạo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {campaigns.map((campaign) => (
            <tr key={campaign.id} className="hover:bg-surface-container-lowest">
              <td className="px-6 py-5">
                <p className="font-bold text-on-surface">{campaign.name}</p>
                <p className="text-xs text-outline">{campaign.id}</p>
              </td>
              <td className="px-6 py-5">{campaign.objective || "Chưa rõ"}</td>
              <td className="px-6 py-5">
                <Badge className={campaign.status === "ACTIVE" ? "bg-error-container text-error" : "bg-primary-fixed/30 text-primary"}>
                  {campaign.status || "UNKNOWN"}
                </Badge>
              </td>
              <td className="px-6 py-5">{campaign.created_time ? new Date(campaign.created_time).toLocaleString("vi-VN") : "Chưa rõ"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyMetaText({ text }: { text: string }) {
  return <p className="p-6 text-sm font-semibold text-on-surface-variant">{text}</p>;
}
