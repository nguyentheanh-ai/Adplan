import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AudienceLibraryClient } from "@/components/audiences/audience-library-client";
import { getAppSession } from "@/lib/auth/session";
import { canCurrentUserAccessSection } from "@/lib/admin/permissions";

export default async function AudiencesPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");
  if (!(await canCurrentUserAccessSection("audiences"))) redirect("/ads-facebook");

  return (
    <AppShell
      title="Tệp khách hàng"
      description="Quản lý tệp khách hàng từ dữ liệu nhóm quảng cáo đã chạy, gắn mã tệp để team theo dõi và tái sử dụng khi tạo campaign."
    >
      <AudienceLibraryClient />
    </AppShell>
  );
}
