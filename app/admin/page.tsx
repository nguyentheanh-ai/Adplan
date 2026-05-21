import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AdminConsoleClient } from "@/components/admin/admin-console-client";
import { getCurrentPermission } from "@/lib/admin/permissions";
import { getAppSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  const permission = await getCurrentPermission();
  if (!permission || (permission.role !== "owner" && permission.role !== "manager")) {
    redirect("/dashboard");
  }
  const integrationStatuses = [
    { name: "GEMINI_API_KEY", configured: Boolean(process.env.GEMINI_API_KEY), purpose: "AI tư vấn, Creator Ads AI, phân tích kế hoạch." },
    { name: "META_APP_ID", configured: Boolean(process.env.META_APP_ID), purpose: "Facebook OAuth." },
    { name: "META_APP_SECRET", configured: Boolean(process.env.META_APP_SECRET), purpose: "Ký phiên đăng nhập Facebook." },
    { name: "META_API_VERSION", configured: Boolean(process.env.META_API_VERSION), purpose: "Phiên bản Graph API đang gọi." },
    { name: "N8N_WEBHOOK_URL", configured: Boolean(process.env.N8N_WEBHOOK_URL), purpose: "Webhook gửi plan sang n8n." },
    { name: "SUPABASE_SERVICE_ROLE_KEY", configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), purpose: "Server-side Supabase admin." }
  ];

  return (
    <AppShell
      title="Quản trị hệ thống"
      description="Phân quyền người dùng, khóa/mở mục chức năng và theo dõi tài khoản đăng ký. Khu vực này dành cho quản trị viên."
    >
      <AdminConsoleClient integrationStatuses={integrationStatuses} />
    </AppShell>
  );
}
