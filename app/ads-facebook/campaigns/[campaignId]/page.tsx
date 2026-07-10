import { redirect } from "next/navigation";
import { AdPilotConsole } from "@/components/adpilot/adpilot-console";
import { AppShell } from "@/components/app-shell";
import { getAppSession } from "@/lib/auth/session";

export default async function CampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const session = await getAppSession();
  if (!session) redirect("/login?next=%2Fads-facebook%2Fcampaigns");
  const { campaignId } = await params;

  return (
    <AppShell>
      <AdPilotConsole campaignId={campaignId} view="campaign-detail" />
    </AppShell>
  );
}
