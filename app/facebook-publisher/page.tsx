import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FacebookPublisherClient } from "@/components/facebook-publisher/facebook-publisher-client";
import { getAppSession } from "@/lib/auth/session";

export default async function FacebookPublisherPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");
  const hasFacebookConnection = Boolean(session.facebookId && session.accessToken);

  return (
    <AppShell
      title="Đăng bài Facebook"
      description="Chọn Fanpage, chọn bài trong Draft, xem preview rồi đăng trực tiếp lên Facebook Page."
    >
      <FacebookPublisherClient hasFacebookConnection={hasFacebookConnection} />
    </AppShell>
  );
}
