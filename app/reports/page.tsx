import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { AdsReportClient } from "@/components/reports/ads-report-client";
import { canCurrentUserAccessSection } from "@/lib/admin/permissions";

export default async function ReportsPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");
  if (!(await canCurrentUserAccessSection("reports"))) redirect("/ads-facebook");

  return (
    <AppShell
      title="Báo cáo Ads"
      description="Theo dõi hiệu suất Meta Ads theo tài khoản, khoảng thời gian, campaign và breakdown. Đây là trang xuất báo cáo."
    >
      <AdsReportClient />
    </AppShell>
  );
}
