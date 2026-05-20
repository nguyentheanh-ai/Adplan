import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CampaignBuilderClient } from "@/components/campaign-builder/campaign-builder-client";
import { getAppSession } from "@/lib/auth/session";

export default async function CampaignBuilderPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  return (
    <AppShell
      title="Tạo Campaign AI"
      description="Nhập thông tin sản phẩm, tệp khách hàng và offer để tạo bản nháp campaign Meta Ads rõ ràng trước khi launch."
    >
      <CampaignBuilderClient />
    </AppShell>
  );
}
