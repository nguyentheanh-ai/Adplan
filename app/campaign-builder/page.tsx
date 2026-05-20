import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CampaignBuilderClient } from "@/components/campaign-builder/campaign-builder-client";
import { getAppSession } from "@/lib/auth/session";
import { canCurrentUserAccessSection } from "@/lib/admin/permissions";

export default async function CampaignBuilderPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");
  if (!(await canCurrentUserAccessSection("campaign_builder"))) redirect("/dashboard");

  return (
    <AppShell
      title="Tạo Campaign AI"
      description="Chọn tài khoản, fanpage, bài viết hoặc landing page để tạo bản nháp campaign chi tiết trước khi launch trên Meta."
    >
      <CampaignBuilderClient />
    </AppShell>
  );
}
