import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CreativeIntelligenceClient } from "@/components/creative/creative-intelligence-client";
import { getAppSession } from "@/lib/auth/session";
import { canCurrentUserAccessSection } from "@/lib/admin/permissions";

export default async function CreativePage() {
  const session = await getAppSession();
  if (!session) redirect("/login");
  if (!(await canCurrentUserAccessSection("creative"))) redirect("/ads-facebook");

  return (
    <AppShell title="Creative" description="Theo dõi số lượng creative, phễu hiệu suất và bảng so sánh theo lead, tin nhắn, tương tác.">
      <CreativeIntelligenceClient />
    </AppShell>
  );
}
