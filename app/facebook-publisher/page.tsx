import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FacebookPublisherClient } from "@/components/facebook-publisher/facebook-publisher-client";
import { getAppSession } from "@/lib/auth/session";

export default async function FacebookPublisherPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  return (
    <AppShell
      title="Đăng bài Facebook"
      description="Nạp content và hình ảnh do Agent tạo, chọn Fanpage đã kết nối, duyệt preview rồi đăng trực tiếp lên Facebook Page."
    >
      <FacebookPublisherClient />
    </AppShell>
  );
}
