import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CreativeIntelligenceClient } from "@/components/creative/creative-intelligence-client";
import { getAppSession } from "@/lib/auth/session";

export default async function CreativePage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  return (
    <AppShell
      title="Creative"
      description="Theo dõi số lượng creative, phễu hiệu suất và top creative theo lead, tin nhắn, tương tác."
    >
      <CreativeIntelligenceClient />
    </AppShell>
  );
}
