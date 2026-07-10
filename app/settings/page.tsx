import { redirect } from "next/navigation";
import { AdPilotConsole } from "@/components/adpilot/adpilot-console";
import { AppShell } from "@/components/app-shell";
import { getAppSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await getAppSession();
  if (!session) redirect("/login?next=%2Fsettings");

  return (
    <AppShell>
      <AdPilotConsole view="settings" />
    </AppShell>
  );
}
