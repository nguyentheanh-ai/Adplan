import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AudienceLibraryClient } from "@/components/audiences/audience-library-client";
import { getAppSession } from "@/lib/auth/session";

export default async function AudiencesPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  return (
    <AppShell
      title="Tệp khách hàng"
      description="Quản lý tệp khách hàng từ dữ liệu nhóm quảng cáo đã chạy và gắn mã tệp để team dễ theo dõi."
    >
      <AudienceLibraryClient />
    </AppShell>
  );
}
