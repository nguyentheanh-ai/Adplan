import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { getAppSession } from "@/lib/auth/session";

export default async function AudiencesPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  return (
    <AppShell title="Tệp khách hàng" description="Khu vực quản lý persona, interest và audience suggestion cho các campaign sau này.">
      <EmptyState
        title="Chưa có tệp khách hàng riêng"
        description="Hiện MVP đang dùng tệp từ Campaign Builder và kết quả phân tích AI. Phần lưu audience thành thư viện sẽ được mở rộng sau."
        href="/campaign-builder"
        action="Tạo Campaign AI"
      />
    </AppShell>
  );
}
