import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AdminConsoleClient } from "@/components/admin/admin-console-client";
import { getCurrentPermission } from "@/lib/admin/permissions";
import { getAppSession } from "@/lib/auth/session";

export default async function AdminPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  const permission = await getCurrentPermission();
  if (!permission || (permission.role !== "owner" && permission.role !== "manager")) {
    redirect("/dashboard");
  }

  return (
    <AppShell
      title="Quản trị hệ thống"
      description="Phân quyền người dùng, khóa/mở mục chức năng và theo dõi tài khoản đăng ký. Khu vực này dành cho quản trị viên."
    >
      <AdminConsoleClient />
    </AppShell>
  );
}
