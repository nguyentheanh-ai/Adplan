import { AppShell } from "@/components/app-shell";
import { MaterialIcon } from "@/components/material-icon";
import { Card } from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await getAppSession();

  return (
    <AppShell
      title="Cài đặt"
      description="Kiểm tra tài khoản đang đăng nhập. API key hệ thống ở khu Quản trị, còn mã Agent riêng cho từng khách nằm trong mục Đăng bài Facebook."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl bg-surface-container-lowest p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-fixed/30 text-primary">
              <MaterialIcon name="account_circle" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary">Tài khoản</h3>
              <p className="text-sm text-on-surface-variant">Thông tin đăng nhập Facebook hiện tại.</p>
            </div>
          </div>
          <div className="space-y-3">
            <InfoRow label="Facebook" value={session?.name || "Chưa đăng nhập"} />
            <InfoRow label="User ID" value={session?.userId || "Chưa có phiên đăng nhập"} />
          </div>
        </Card>

        <Card className="rounded-xl bg-surface-container-lowest p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-fixed/70 text-secondary">
              <MaterialIcon name="key" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary">Tích hợp hệ thống</h3>
              <p className="text-sm text-on-surface-variant">API key, Meta app và webhook chỉ dành cho quản trị viên.</p>
            </div>
          </div>
          <div className="rounded-xl bg-background p-4 text-sm leading-6 text-on-surface-variant">
            Khách hàng không cần nhìn thấy API key hệ thống. Nếu bạn là quản trị viên, vào menu <strong>Quản trị</strong> để kiểm tra Gemini, Meta, Supabase, n8n và dashboard mã Agent.
            Nếu bạn muốn tạo mã riêng để Agent Kit nạp draft hoặc đăng bài thay mình, hãy vào mục <strong>Đăng bài Facebook</strong>.
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-outline">{label}</p>
      <p className="mt-2 break-all text-sm font-bold text-on-surface">{value}</p>
    </div>
  );
}
