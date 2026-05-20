import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { OptimizationCenterClient } from "@/components/optimization/optimization-center-client";
import { canCurrentUserAccessSection } from "@/lib/admin/permissions";
import { getAppSession } from "@/lib/auth/session";

export default async function OptimizationPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");
  if (!(await canCurrentUserAccessSection("optimization"))) redirect("/dashboard");

  return (
    <AppShell
      title="Tối ưu Ads"
      description="Phân tích dữ liệu Meta đã được đồng bộ, tạo khuyến nghị tối ưu và chỉ tự chỉnh quảng cáo khi khách đã ủy quyền rõ."
    >
      <OptimizationCenterClient />
    </AppShell>
  );
}
