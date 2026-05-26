import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GreezhubWorkspaceApp } from "@/components/workspace/greezhub-workspace-app";
import { WorkspaceOverview } from "@/components/workspace/workspace-overview";
import { getAppSession } from "@/lib/auth/session";

type WorkspacePageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const session = await getAppSession();
  if (!session) redirect("/login?next=%2Fworkspace");

  const { slug = [] } = await params;

  return (
    <AppShell contentClassName="px-6 pb-24 pt-28 md:px-10 md:pb-12 md:pt-32">
      <div className="mx-auto max-w-[1280px]">
        {slug.length === 0 ? <WorkspaceOverview /> : <GreezhubWorkspaceApp />}
      </div>
    </AppShell>
  );
}
