"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MaterialIcon } from "@/components/material-icon";

const navItems = [
  { href: "/dashboard", label: "Tổng quan", icon: "dashboard", match: "/dashboard" },
  { href: "/reports", label: "Báo cáo Ads", icon: "monitoring", match: "/reports" },
  { href: "/campaign-builder", label: "Tạo Campaign AI", icon: "auto_awesome", match: "/campaign-builder" },
  { href: "/audiences", label: "Tệp khách hàng", icon: "groups", match: "/audiences" },
  { href: "/creative", label: "Creative", icon: "palette", match: "/creative" },
  { href: "/dashboard/meta", label: "Meta API", icon: "hub", match: "/dashboard/meta" },
  { href: "/history", label: "Lịch sử", icon: "history", match: "/history" },
  { href: "/settings", label: "Cài đặt", icon: "settings", match: "/settings" }
];

function isActive(pathname: string, match: string) {
  if (match === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === match || pathname.startsWith(`${match}/`);
}

export function AppShell({
  children,
  title,
  description,
  actions,
  contentClassName = "px-gutter pb-24 pt-24 md:pb-12"
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  contentClassName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Đưa người dùng về login kể cả khi logout endpoint lỗi tạm thời.
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-[268px] flex-col border-r border-outline-variant/70 bg-white/95 shadow-soft backdrop-blur md:flex">
        <div className="px-5 py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ai-gradient text-white shadow-glow">
              <MaterialIcon filled name="insights" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold leading-none text-primary">AdPlanner AI</h1>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-outline">Meta ads cockpit</p>
            </div>
          </Link>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3">
          {navItems.map((item) => {
            const active = isActive(pathname, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary",
                  active && "bg-primary text-white shadow-glow hover:bg-primary hover:text-white"
                )}
              >
                <MaterialIcon className="text-[22px]" filled={active} name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-5">
          <div className="mb-4 rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-outline">Kết nối</p>
            <p className="mt-1 text-sm font-bold text-on-surface">Facebook Marketing API</p>
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">Campaign thật luôn được giữ PAUSED trước khi duyệt.</p>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary"
          >
            <MaterialIcon name="logout" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <header className="fixed right-0 top-0 z-40 flex h-16 w-full items-center justify-between border-b border-outline-variant/70 bg-white/82 px-4 backdrop-blur md:w-[calc(100%-268px)] md:px-6">
        <Link className="flex items-center gap-2 md:hidden" href="/dashboard">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <MaterialIcon filled name="insights" />
          </div>
          <span className="font-extrabold text-primary">AdPlanner AI</span>
        </Link>
        <div className="hidden text-sm font-bold text-primary md:block">AI Ads Planner</div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-on-surface">Tài khoản</p>
            <p className="text-[11px] uppercase tracking-wider text-outline">Facebook</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-fixed bg-primary-fixed text-sm font-extrabold text-primary">
            FB
          </div>
        </div>
      </header>

      <main className={cn("min-h-screen md:ml-[268px]", contentClassName)}>
        <div className="mx-auto max-w-[1280px]">
          {title ? (
            <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-[26px] font-extrabold leading-tight text-on-background">{title}</h2>
                {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">{description}</p> : null}
              </div>
              {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            </div>
          ) : null}
          {children}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 grid h-16 grid-cols-5 border-t border-outline-variant/70 bg-white px-2 md:hidden">
        {navItems.slice(0, 5).map((item) => {
          const active = isActive(pathname, item.match);
          return (
            <Link
              key={`${item.href}-mobile`}
              href={item.href}
              className={cn("flex flex-col items-center justify-center gap-1 text-on-surface-variant", active && "text-primary")}
            >
              <MaterialIcon className="text-[22px]" filled={active} name={item.icon} />
              <span className="max-w-full truncate text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function MiniPersonaLink({ id }: { id: string }) {
  return (
    <Link href={`/persona/${id}`} className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
      <MaterialIcon className="text-[18px]" name="group" />
      Xem chân dung
    </Link>
  );
}
