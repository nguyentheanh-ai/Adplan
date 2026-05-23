"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/material-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AdminAgentKey = {
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
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  facebook_name?: string | null;
  facebook_email?: string | null;
};

type AdminAgentLog = {
  id: string;
  user_id: string;
  agent_key_id?: string | null;
  action: string;
  page_id?: string | null;
  title?: string | null;
  status: string;
  post_id?: string | null;
  error_message?: string | null;
  created_at: string;
};

async function readJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Không thể tải dữ liệu.");
  return payload;
}

export function AgentKeyAdminPanel() {
  const [keys, setKeys] = useState<AdminAgentKey[]>([]);
  const [logs, setLogs] = useState<AdminAgentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revokingId, setRevokingId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const payload = await readJson<{ data: { keys: AdminAgentKey[]; logs: AdminAgentLog[] } }>("/api/admin/agent-keys");
      setKeys(payload.data.keys ?? []);
      setLogs(payload.data.logs ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được dashboard Agent key.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  async function revoke(id: string) {
    setRevokingId(id);
    try {
      await readJson(`/api/admin/agent-keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      toast.success("Admin đã thu hồi mã Agent.");
      await load();
    } catch (revokeError) {
      toast.error(revokeError instanceof Error ? revokeError.message : "Không thu hồi được mã Agent.");
    } finally {
      setRevokingId("");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-lg p-0">
        <div className="flex items-center justify-between border-b border-outline-variant/70 px-6 py-5">
          <div>
            <h3 className="text-lg font-extrabold">Mã kết nối Agent toàn hệ thống</h3>
            <p className="text-sm text-on-surface-variant">Theo dõi key theo user, quyền direct publish và trạng thái thu hồi.</p>
          </div>
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            <MaterialIcon name="refresh" />
            Làm mới
          </Button>
        </div>

        {error ? <p className="px-6 py-4 text-sm font-bold text-error">{error}</p> : null}

        <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
          <MetricCard label="Tổng key" value={String(keys.length)} />
          <MetricCard label="Key auto publish" value={String(keys.filter((item) => item.permissions.canPublishDirect && !item.revoked_at).length)} />
          <MetricCard label="Key đã thu hồi" value={String(keys.filter((item) => item.revoked_at).length)} />
        </div>

        <div className="divide-y divide-outline-variant/70">
          {keys.map((item) => (
            <div key={item.id} className="grid gap-4 px-6 py-5 lg:grid-cols-[1.1fr_0.9fr_0.8fr_auto] lg:items-center">
              <div>
                <p className="font-bold text-on-surface">{item.label}</p>
                <p className="text-sm text-on-surface-variant">{item.facebook_name || "Chưa có tên"} · {item.facebook_email || item.user_id}</p>
                <p className="mt-1 text-xs font-mono font-bold text-outline">{item.key_prefix}...</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge>{item.revoked_at ? "Đã thu hồi" : "Đang hoạt động"}</Badge>
                <Badge>{item.permissions.canPublishDirect ? "Đăng trực tiếp" : "Chỉ draft"}</Badge>
                {item.permissions.canSchedule ? <Badge>Lên lịch</Badge> : null}
              </div>

              <div className="space-y-1 text-sm text-on-surface-variant">
                <p>Page: {item.allowed_page_ids.length ? item.allowed_page_ids.length : "Tất cả"}</p>
                <p>Giới hạn/ngày: {item.daily_post_limit ?? "Không giới hạn"}</p>
                <p>Dùng gần nhất: {item.last_used_at ? new Date(item.last_used_at).toLocaleString("vi-VN") : "Chưa dùng"}</p>
              </div>

              <div className="flex justify-end">
                {!item.revoked_at ? (
                  <Button variant="secondary" onClick={() => void revoke(item.id)} disabled={revokingId === item.id}>
                    <MaterialIcon name="block" />
                    {revokingId === item.id ? "Đang thu hồi..." : "Thu hồi"}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden rounded-lg p-0">
        <div className="border-b border-outline-variant/70 px-6 py-5">
          <h3 className="text-lg font-extrabold">Nhật ký Agent</h3>
          <p className="text-sm text-on-surface-variant">Log bắt buộc: Agent nào dùng key nào, đăng vào page nào, kết quả ra sao.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-container-low text-left text-xs font-extrabold uppercase tracking-wide text-outline">
              <tr>
                <th className="px-6 py-3">Thời gian</th>
                <th className="px-6 py-3">Hành động</th>
                <th className="px-6 py-3">Page</th>
                <th className="px-6 py-3">Nội dung</th>
                <th className="px-6 py-3">Post ID</th>
                <th className="px-6 py-3">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((item) => (
                <tr key={item.id} className="border-t border-outline-variant/70">
                  <td className="px-6 py-3 text-on-surface-variant">{new Date(item.created_at).toLocaleString("vi-VN")}</td>
                  <td className="px-6 py-3 font-bold text-on-surface">{item.action}</td>
                  <td className="px-6 py-3 text-on-surface-variant">{item.page_id || "—"}</td>
                  <td className="px-6 py-3 text-on-surface-variant">{item.title || "—"}</td>
                  <td className="px-6 py-3 text-on-surface-variant">{item.post_id || "—"}</td>
                  <td className="px-6 py-3">
                    <span className={item.status === "success" ? "font-bold text-emerald-700" : "font-bold text-error"}>
                      {item.status === "success" ? "Thành công" : item.error_message || "Thất bại"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-white p-4">
      <p className="text-sm font-bold text-on-surface-variant">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-on-surface">{value}</p>
    </div>
  );
}
