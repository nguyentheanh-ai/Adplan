import { redirect } from "next/navigation";
import { AdPilotConsole } from "@/components/adpilot/adpilot-console";
import { AppShell } from "@/components/app-shell";
import { SetupRequired } from "@/components/setup-required";
import { getAppSession } from "@/lib/auth/session";
import { hasSupabasePublicEnv } from "@/lib/env";

export default async function HomePage() {
  if (!hasSupabasePublicEnv()) {
    return (
      <AppShell>
        <SetupRequired />
      </AppShell>
    );
  }

  const session = await getAppSession();
  if (!session) redirect("/login");

  return (
    <AppShell>
      <AdPilotConsole view="overview" />
    </AppShell>
  );
}
