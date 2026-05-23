"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/material-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AgentKeyRecord = {
  id: string;
  user_id: string;
  key_prefix: string;
  label: string;
  permissions: {
    canIngestDraft: boolean;
    canPublishDirect: boolean;
    canSchedule: boolean;
  };
  allowed_page_ids: string[];
  daily_post_limit: number | null;
  allowed_window_json: {
    startHour?: number | null;
    endHour?: number | null;
  };
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

async function readJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Không thể tải dữ liệu.");
  return payload;
}

export function AgentKeyManager() {
  const [keys, setKeys] = useState<AgentKeyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revokingId, setRevokingId] = useState("");
  const [rawKey, setRawKey] = useState("");
  const [label, setLabel] = useState("Agent đăng Facebook");
  const [canPublishDirect, setCanPublishDirect] = useState(false);
  const [canSchedule, setCanSchedule] = useState(false);
  const [dailyLimit, setDailyLimit] = useState("");
  const [startHour, setStartHour] = useState("");
  const [endHour, setEndHour] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");

  async function loadKeys() {
    setLoading(true);
    setError("");
    try {
      const payload = await readJson<{ data: AgentKeyRecord[] }>("/api/agent-keys");
      setKeys(payload.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được mã Agent.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadKeys();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  async function createKey() {
    setSaving(true);
    setError("");
    try {
      const payload = await readJson<{ data: AgentKeyRecord; raw_key: string }>("/api/agent-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          permissions: {
            canIngestDraft: true,
            canPublishDirect,
            canSchedule
          },
          allowed_page_ids: [],
          daily_post_limit: dailyLimit ? Number(dailyLimit) : null,
          allowed_window_json:
            startHour !== "" || endHour !== ""
              ? {
                  startHour: startHour === "" ? null : Number(startHour),
                  endHour: endHour === "" ? null : Number(endHour)
                }
              : undefined,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
        })
      });

      setRawKey(payload.raw_key);
      toast.success("Đã tạo mã kết nối Agent. Mã raw chỉ hiện đúng lần này.");
      setCanPublishDirect(false);
      setCanSchedule(false);
      setDailyLimit("");
      setStartHour("");
      setEndHour("");
      setExpiresAt("");
      setLabel("Agent đăng Facebook");
      await loadKeys();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không tạo được mã Agent.");
    } finally {
      setSaving(false);
    }
  }

  async function revokeKey(id: string) {
    setRevokingId(id);
    try {
      await readJson(`/api/agent-keys/${id}`, { method: "DELETE" });
      toast.success("Đã thu hồi mã Agent.");
      await loadKeys();
    } catch (revokeError) {
      toast.error(revokeError instanceof Error ? revokeError.message : "Không thu hồi được mã Agent.");
    } finally {
      setRevokingId("");
    }
  }

  async function copyRawKey() {
    if (!rawKey) return;
    await navigator.clipboard.writeText(rawKey);
    toast.success("Đã copy mã Agent.");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Mã kết nối Agent</CardTitle>
            <CardDescription>
              Mỗi khách có mã riêng để Agent Kit nạp draft hoặc đăng trực tiếp đúng Fanpage đã cho phép. Raw key chỉ hiện đúng một lần khi tạo.
            </CardDescription>
          </div>
          <Button variant="secondary" onClick={() => void loadKeys()} disabled={loading}>
            <MaterialIcon name="refresh" />
            Làm mới
          </Button>
        </div>
      </CardHeader>

      {rawKey ? (
        <div className="rounded-lg border border-primary/20 bg-primary-fixed/15 p-4">
          <p className="text-sm font-extrabold text-primary">Mã raw chỉ hiện đúng lần này</p>
          <p className="mt-2 break-all rounded-lg bg-white px-4 py-3 font-mono text-sm font-bold text-on-surface">{rawKey}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button onClick={() => void copyRawKey()}>
              <MaterialIcon name="content_copy" />
              Copy mã
            </Button>
            <Button variant="secondary" onClick={() => setRawKey("")}>
              Đã lưu xong
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <div className="rounded-lg border border-error/30 bg-error/10 p-4 text-sm font-bold text-error">{error}</div> : null}

      <div className="grid gap-4 rounded-lg border border-outline-variant bg-surface-container-low p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold">Nhãn nội bộ</span>
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Ví dụ: Agent Facebook team sale" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Giới hạn số bài/ngày</span>
            <Input value={dailyLimit} onChange={(event) => setDailyLimit(event.target.value.replace(/\D/g, ""))} placeholder="Để trống nếu không giới hạn" />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-bold">Cho Agent đăng luôn</span>
            <button
              type="button"
              className={`flex h-11 items-center rounded-lg border px-4 text-sm font-bold ${canPublishDirect ? "border-primary bg-primary text-white" : "border-outline-variant bg-white text-on-surface-variant"}`}
              onClick={() => {
                setCanPublishDirect((current) => {
                  const next = !current;
                  if (!next) setCanSchedule(false);
                  return next;
                });
              }}
            >
              {canPublishDirect ? "Đã bật auto publish" : "Chỉ nạp draft chờ duyệt"}
            </button>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Cho phép lên lịch</span>
            <button
              type="button"
              className={`flex h-11 items-center rounded-lg border px-4 text-sm font-bold ${canSchedule ? "border-primary bg-primary text-white" : "border-outline-variant bg-white text-on-surface-variant"}`}
              onClick={() => {
                setCanPublishDirect(true);
                setCanSchedule((current) => !current);
              }}
            >
              {canSchedule ? "Đã bật lên lịch" : "Chưa cho lên lịch"}
            </button>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Key hết hạn lúc</span>
            <Input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold">Khung giờ bắt đầu</span>
            <Input value={startHour} onChange={(event) => setStartHour(event.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="0-23" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Khung giờ kết thúc</span>
            <Input value={endHour} onChange={(event) => setEndHour(event.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="0-23" />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void createKey()} disabled={saving}>
            <MaterialIcon name="key" />
            {saving ? "Đang tạo..." : "Tạo mã kết nối Agent"}
          </Button>
          <div className="rounded-lg bg-white px-4 py-3 text-xs leading-6 text-on-surface-variant">
            Agent Kit dùng header <span className="font-mono font-bold">x-agent-ingest-key</span> với endpoint <span className="font-mono font-bold">/api/facebook-publisher/drafts</span> hoặc <span className="font-mono font-bold">/api/facebook-publisher/agent-publish</span>.
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-sm text-on-surface-variant">Đang tải danh sách mã Agent...</p> : null}

        {keys.map((item) => (
          <div key={item.id} className="rounded-lg border border-outline-variant bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-extrabold text-on-surface">{item.label}</p>
                <p className="mt-1 text-xs font-mono font-bold text-outline">{item.key_prefix}...</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{item.revoked_at ? "Đã thu hồi" : "Đang hoạt động"}</Badge>
                <Badge>{item.permissions.canPublishDirect ? "Đăng trực tiếp" : "Chỉ nạp nháp"}</Badge>
                {item.permissions.canSchedule ? <Badge>Lên lịch</Badge> : null}
              </div>
            </div>

            <div className="mt-3 grid gap-3 text-sm text-on-surface-variant md:grid-cols-2 xl:grid-cols-4">
              <p><span className="font-bold text-on-surface">Page:</span> {item.allowed_page_ids.length ? item.allowed_page_ids.length : "Tất cả"}</p>
              <p><span className="font-bold text-on-surface">Giới hạn/ngày:</span> {item.daily_post_limit ?? "Không giới hạn"}</p>
              <p><span className="font-bold text-on-surface">Dùng gần nhất:</span> {item.last_used_at ? new Date(item.last_used_at).toLocaleString("vi-VN") : "Chưa dùng"}</p>
              <p><span className="font-bold text-on-surface">Hết hạn:</span> {item.expires_at ? new Date(item.expires_at).toLocaleString("vi-VN") : "Không hết hạn"}</p>
            </div>

            {!item.revoked_at ? (
              <div className="mt-4">
                <Button variant="secondary" onClick={() => void revokeKey(item.id)} disabled={revokingId === item.id}>
                  <MaterialIcon name="block" />
                  {revokingId === item.id ? "Đang thu hồi..." : "Thu hồi mã"}
                </Button>
              </div>
            ) : null}
          </div>
        ))}

        {!loading && !keys.length ? (
          <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">
            Chưa có mã Agent nào. Tạo key riêng cho từng khách rồi copy sang Agent Kit để nạp draft an toàn hơn.
          </div>
        ) : null}
      </div>
    </Card>
  );
}
