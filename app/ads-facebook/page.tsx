import { redirect } from "next/navigation";
import { FacebookAdsDashboard } from "@/components/ads/FacebookAdsDashboard";
import { AppShell } from "@/components/app-shell";
import { SetupRequired } from "@/components/setup-required";
import { getAppSession } from "@/lib/auth/session";
import { hasSupabasePublicEnv } from "@/lib/env";

export default async function AdsFacebookPage() {
  if (!hasSupabasePublicEnv()) {
    return (
      <AppShell>
        <SetupRequired />
      </AppShell>
    );
  }

  const session = await getAppSession();
  if (!session) redirect("/login?next=%2Fads-facebook");

  return (
    <AppShell>
      <FacebookAdsDashboard />
    </AppShell>
  );
}
