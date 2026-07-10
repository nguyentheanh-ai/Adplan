import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AdsPostIntelligence } from "@/components/ads-posts/AdsPostIntelligence";
import { getAppSession } from "@/lib/auth/session";

export default async function PostsPage() {
  const session = await getAppSession();
  if (!session) redirect("/login?next=%2Fads-facebook%2Fposts");

  return (
    <AppShell>
      <AdsPostIntelligence />
    </AppShell>
  );
}
