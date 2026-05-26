import { redirect } from "next/navigation";
import { AdsFeatureLauncher } from "@/components/ads/ads-feature-launcher";
import { AppShell } from "@/components/app-shell";
import { MetaIntelligenceDashboard } from "@/components/dashboard/meta-intelligence-dashboard";
import { SetupRequired } from "@/components/setup-required";
import { getAppSession } from "@/lib/auth/session";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdsPage() {
  if (!hasSupabasePublicEnv()) {
    return (
      <AppShell contentClassName="px-gutter pb-12 pt-24">
        <SetupRequired />
      </AppShell>
    );
  }

  const session = await getAppSession();
  if (!session) redirect("/login");

  const admin = createAdminClient();
  const { count } = await admin
    .from("ai_outputs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.userId);

  return (
    <AppShell contentClassName="px-6 pb-24 pt-28 md:px-10 md:pb-12 md:pt-32">
      <div className="mx-auto max-w-[1280px] space-y-6">
        <AdsFeatureLauncher />
        <MetaIntelligenceDashboard userName={session.name ?? "Facebook user"} planCount={count ?? 0} />
      </div>
    </AppShell>
  );
}
