import { AppShell } from "@/components/app-shell";
import { SetupRequired } from "@/components/setup-required";
import { AskFlow } from "@/app/ask/ask-flow";
import { hasSupabasePublicEnv } from "@/lib/env";

export default function AskPage() {
  if (!hasSupabasePublicEnv()) {
    return (
      <AppShell title="Đặt câu hỏi">
        <SetupRequired />
      </AppShell>
    );
  }

  return (
    <AppShell
      contentClassName="h-screen overflow-hidden pt-16"
    >
      <AskFlow />
    </AppShell>
  );
}
