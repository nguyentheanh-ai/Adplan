import { redirect } from "next/navigation";
import { AdPilotConsole } from "@/components/adpilot/adpilot-console";
import { AppShell } from "@/components/app-shell";
import { RevenueReportClient } from "@/components/revenue-report/revenue-report-client";
import { getCurrentPermission } from "@/lib/admin/permissions";
import { getAppSession } from "@/lib/auth/session";

export default async function ReportsPage() {
  const session = await getAppSession();
  if (!session) redirect("/login?next=%2Fads-facebook%2Freports");
  const permission = await getCurrentPermission();

  return (
    <AppShell title="Ads Facebook Reports" description="Meta performance, revenue, paid students and pending payments in one reporting view.">
      <div className="space-y-6">
        {permission?.role === "owner" ? (
          <section className="space-y-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-primary">Revenue & Ads Spend</p>
              <h1 className="text-2xl font-black text-on-surface">Bao cao doanh thu tu theanhmarketing.com</h1>
              <p className="mt-1 max-w-3xl text-sm font-medium text-on-surface-variant">
                Doc orders/leads website server-side, gom cung chi phi Meta. Ngay bao cao bat dau luc 14:00 gio Viet Nam de khop tai khoan quang cao dang reset theo gio My.
              </p>
            </div>
            <RevenueReportClient />
          </section>
        ) : null}
        <AdPilotConsole view="reports" />
      </div>
    </AppShell>
  );
}
