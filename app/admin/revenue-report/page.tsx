import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RevenueReportClient } from "@/components/revenue-report/revenue-report-client";
import { getAppSession } from "@/lib/auth/session";
import { getCurrentPermission } from "@/lib/admin/permissions";

export default async function RevenueReportPage() {
  const session = await getAppSession();
  if (!session) redirect("/login?next=%2Fadmin%2Frevenue-report");

  const permission = await getCurrentPermission();
  if (permission?.role !== "owner") {
    return (
      <AppShell title="Báo cáo doanh thu">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-900">
          Bạn không có quyền truy cập báo cáo này.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Báo cáo doanh thu" description="Revenue, Meta spend và hiệu quả bán hàng tập trung cho Greezhub 01.">
      <RevenueReportClient />
    </AppShell>
  );
}
