import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { AdsReportClient } from "@/components/reports/ads-report-client";

export default async function ReportsPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  return (
    <AppShell
      title="Báo cáo Ads"
      description="Theo dõi hiệu suất Meta Ads theo tài khoản, khoảng thời gian, campaign và breakdown. Trang này dùng để xuất báo cáo."
    >
      <AdsReportClient />
    </AppShell>
  );
}
