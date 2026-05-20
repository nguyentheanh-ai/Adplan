import { AppShell } from "@/components/app-shell";
import { MetaDashboard } from "@/components/meta/meta-dashboard";
import { SetupRequired } from "@/components/setup-required";
import { hasSupabasePublicEnv } from "@/lib/env";

export default function DashboardMetaPage() {
  if (!hasSupabasePublicEnv()) {
    return (
      <AppShell title="Meta API">
        <SetupRequired />
      </AppShell>
    );
  }

  return (
    <AppShell title="Meta Test" description="Kiểm tra kết nối Meta Graph API và tạo campaign test ở trạng thái PAUSED.">
      <MetaDashboard />
    </AppShell>
  );
}
