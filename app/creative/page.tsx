import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { getAppSession } from "@/lib/auth/session";

export default async function CreativePage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  return (
    <AppShell title="Creative" description="Quản lý ý tưởng hình ảnh, video, hook và copy quảng cáo trước khi đưa vào campaign.">
      <EmptyState
        title="Creative library đang ở bản nền"
        description="MVP hiện cho phép ghi chú media trong Campaign Builder. Thư viện upload và phân loại creative sẽ được thêm ở bước tiếp theo."
        href="/campaign-builder"
        action="Tạo bản nháp campaign"
      />
    </AppShell>
  );
}
