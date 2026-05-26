import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MaterialIcon } from "@/components/material-icon";
import { Card } from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await getAppSession();
  if (!session) redirect("/login?next=%2Fsettings");

  return (
    <AppShell
      title="Cài đặt"
      description="Kết nối tài khoản đăng nhập, Facebook Page và Ads trước khi dùng báo cáo, campaign builder hoặc Publisher."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl bg-surface-container-lowest p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-fixed/30 text-primary">
              <MaterialIcon name="account_circle" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary">Tài khoản</h3>
              <p className="text-sm text-on-surface-variant">Đăng nhập Facebook để tự động kết nối Fanpage vào Ads Facebook.</p>
            </div>
          </div>
          <div className="space-y-3">
            <InfoRow label="Facebook" value={session?.name || "Chưa đăng nhập"} />
            <InfoRow label="User ID" value={session?.userId || "Chưa có phiên đăng nhập"} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 text-sm font-extrabold text-white transition hover:bg-[#0f66d6]" href="/api/auth/facebook/start?force=1">
              <span className="grid size-6 place-items-center rounded-md bg-white text-[#1877F2]">f</span>
              {session ? "Kết nối lại Facebook" : "Đăng nhập Facebook"}
            </a>
            <button
              className="inline-flex min-h-12 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-outline-variant bg-white px-4 text-sm font-extrabold text-on-surface-variant/60"
              disabled
              title="Google chỉ đăng nhập tài khoản, không cấp quyền Fanpage/Ads. Cần chốt luồng session riêng trước khi bật."
              type="button"
            >
              <span className="grid size-6 place-items-center rounded-md bg-surface-container-low text-on-surface-variant">G</span>
              Google
            </button>
          </div>
          <p className="mt-4 text-xs leading-5 text-on-surface-variant">
            Sau khi Facebook cấp quyền, app dùng token server-side để đọc Fanpage và tài khoản quảng cáo. Token không hiển thị ở frontend.
          </p>
        </Card>

        <Card className="rounded-xl bg-surface-container-lowest p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-fixed/70 text-secondary">
              <MaterialIcon name="key" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary">Kết nối Ads Facebook</h3>
              <p className="text-sm text-on-surface-variant">Fanpage sẽ xuất hiện trong Ads, Campaign Builder và Publisher.</p>
            </div>
          </div>
          <div className="rounded-xl bg-background p-4 text-sm leading-6 text-on-surface-variant">
            Kết nối Facebook xong, hệ thống tự dùng các quyền <strong>pages_show_list</strong>, <strong>pages_read_engagement</strong> và <strong>pages_manage_posts</strong> để lấy Fanpage. Các khu Ads sẽ gọi dữ liệu qua API server-side, không cần nhập token thủ công.
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-white" href="/ads-facebook">
              Mở Ads Facebook
              <MaterialIcon name="arrow_forward" />
            </Link>
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-white px-4 text-sm font-extrabold text-primary" href="/ads-facebook/publisher">
              Mở Publisher
              <MaterialIcon name="publish" />
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-outline">{label}</p>
      <p className="mt-2 break-all text-sm font-bold text-on-surface">{value}</p>
    </div>
  );
}
