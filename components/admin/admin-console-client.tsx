"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MetaDashboard } from "@/components/meta/meta-dashboard";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AdminUserPermission, UserRole } from "@/lib/meta/types";

type AdminUserRow = {
  id: string;
  email: string;
  full_name?: string | null;
  facebook_id?: string | null;
  created_at: string;
  permission: AdminUserPermission | null;
};

const lockOptions = [
  { key: "reports", label: "Báo cáo Ads" },
  { key: "campaign_builder", label: "Tạo Campaign AI" },
  { key: "audiences", label: "Tệp khách hàng" },
  { key: "creative", label: "Creative" },
  { key: "meta_api", label: "Meta API" }
];

async function readJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Không thể tải dữ liệu.");
  return payload;
}

export function AdminConsoleClient() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");
    setWarning("");
    try {
      const payload = await readJson<{ data: AdminUserRow[]; warning?: string }>("/api/admin/users");
      setRows(payload.data ?? []);
      setWarning(payload.warning ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách user.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function updateUser(row: AdminUserRow, role: UserRole, lockedSections: string[]) {
    setSavingId(row.id);
    try {
      await readJson("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: row.id,
          facebook_id: row.facebook_id || row.permission?.facebook_id || null,
          role,
          locked_sections: lockedSections
        })
      });
      toast.success("Đã cập nhật quyền.");
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật quyền.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl p-5">
          <p className="text-sm font-bold text-on-surface-variant">Tổng người dùng Facebook</p>
          <p className="mt-2 text-3xl font-extrabold">{rows.length}</p>
        </Card>
        <Card className="rounded-3xl p-5">
          <p className="text-sm font-bold text-on-surface-variant">Owner/Manager</p>
          <p className="mt-2 text-3xl font-extrabold">
            {rows.filter((item) => item.permission?.role === "owner" || item.permission?.role === "manager").length}
          </p>
        </Card>
        <Card className="rounded-3xl p-5">
          <p className="text-sm font-bold text-on-surface-variant">Tài khoản bị khóa mục</p>
          <p className="mt-2 text-3xl font-extrabold">{rows.filter((item) => (item.permission?.locked_sections ?? []).length > 0).length}</p>
        </Card>
      </section>

      <Card className="overflow-hidden rounded-3xl p-0">
        <div className="flex items-center justify-between border-b border-outline-variant/70 px-6 py-5">
          <div>
            <h3 className="text-lg font-extrabold">Quản lý phân quyền</h3>
            <p className="text-sm text-on-surface-variant">Mọi user đăng nhập bằng Facebook đều hiện ở đây để cấp quyền từng tính năng.</p>
          </div>
          <Button variant="secondary" onClick={() => void loadUsers()} disabled={loading}>
            <MaterialIcon name="refresh" />
            Làm mới
          </Button>
        </div>

        {error ? <p className="px-6 py-4 text-sm font-bold text-error">{error}</p> : null}
        {warning ? <p className="px-6 py-4 text-sm font-bold text-warning">{warning}</p> : null}
        {loading ? <p className="px-6 py-5 text-sm text-on-surface-variant">Đang tải danh sách user...</p> : null}

        {!loading ? (
          <div className="divide-y divide-outline-variant/70">
            {rows.map((row) => (
              <UserPermissionRow
                key={row.id}
                row={row}
                saving={savingId === row.id}
                onSave={(role, locked) => void updateUser(row, role, locked)}
              />
            ))}
          </div>
        ) : null}
      </Card>

      <Card className="rounded-3xl p-0">
        <div className="border-b border-outline-variant/70 px-6 py-5">
          <h3 className="text-lg font-extrabold">Meta API nội bộ</h3>
          <p className="text-sm text-on-surface-variant">Khu test tài khoản/campaign dành cho admin.</p>
        </div>
        <div className="p-6">
          <MetaDashboard />
        </div>
      </Card>
    </div>
  );
}

function UserPermissionRow({
  row,
  saving,
  onSave
}: {
  row: AdminUserRow;
  saving: boolean;
  onSave: (role: UserRole, lockedSections: string[]) => void;
}) {
  const [role, setRole] = useState<UserRole>(row.permission?.role ?? "member");
  const [lockedSections, setLockedSections] = useState<string[]>(row.permission?.locked_sections ?? []);

  return (
    <div className="grid gap-4 px-6 py-5 lg:grid-cols-[1.2fr_0.8fr_1fr_auto] lg:items-center">
      <div>
        <p className="font-bold text-on-surface">{row.full_name || "Chưa cập nhật tên"}</p>
        <p className="text-sm text-on-surface-variant">{row.email}</p>
        {row.facebook_id ? <p className="text-xs text-outline">Facebook ID: {row.facebook_id}</p> : null}
      </div>

      <label className="space-y-2">
        <span className="text-xs font-extrabold uppercase tracking-wide text-outline">Quyền</span>
        <select className="dashboard-input" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
          <option value="owner">Owner</option>
          <option value="manager">Manager</option>
          <option value="member">Member</option>
        </select>
      </label>

      <div className="space-y-2">
        <p className="text-xs font-extrabold uppercase tracking-wide text-outline">Mục khóa</p>
        <div className="flex flex-wrap gap-2">
          {lockOptions.map((option) => {
            const active = lockedSections.includes(option.key);
            return (
              <button
                key={option.key}
                className={`rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-error-container text-error" : "bg-surface-container-low text-on-surface-variant"}`}
                onClick={() =>
                  setLockedSections((current) =>
                    current.includes(option.key) ? current.filter((item) => item !== option.key) : [...current, option.key]
                  )
                }
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => onSave(role, lockedSections)} disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu quyền"}
        </Button>
      </div>
    </div>
  );
}
