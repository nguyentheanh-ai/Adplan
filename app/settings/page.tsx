import { AppShell } from "@/components/app-shell";
import { MaterialIcon } from "@/components/material-icon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";

const envItems = [
  ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
  ["GEMINI_API_KEY", process.env.GEMINI_API_KEY],
  ["N8N_WEBHOOK_URL", process.env.N8N_WEBHOOK_URL],
  ["META_APP_ID", process.env.META_APP_ID],
  ["META_APP_SECRET", process.env.META_APP_SECRET],
  ["META_API_VERSION", process.env.META_API_VERSION]
];

export default async function SettingsPage() {
  const session = await getAppSession();

  return (
    <AppShell title="Cài đặt" description="Kiểm tra tài khoản và các biến môi trường cần cho MVP.">
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
              <h3 className="text-xl font-bold text-primary">Biến môi trường</h3>
              <p className="text-sm text-on-surface-variant">Khóa bí mật chỉ đọc phía server.</p>
            </div>
          </div>
          <div className="space-y-3">
            {envItems.map(([name, value]) => (
              <div key={name} className="flex items-center justify-between gap-3 rounded-xl bg-background p-4">
                <span className="break-all text-sm font-bold text-on-surface">{name}</span>
                {value ? (
                  <Badge className="bg-tertiary-fixed/40 text-tertiary">
                    <MaterialIcon className="mr-1 text-[16px]" name="check_circle" />
                    Đã có
                  </Badge>
                ) : (
                  <Badge className="bg-error-container text-error">
                    <MaterialIcon className="mr-1 text-[16px]" name="cancel" />
                    Thiếu
                  </Badge>
                )}
              </div>
            ))}
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
