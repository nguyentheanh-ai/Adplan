"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MaterialIcon } from "@/components/material-icon";

const navItems = [
  { href: "/dashboard", label: "Tổng quan", icon: "dashboard", match: "/dashboard" },
  { href: "/ask", label: "Đặt câu hỏi", icon: "contact_support", match: "/ask" },
  { href: "/dashboard", label: "Chân dung khách hàng", icon: "group", match: "/persona" },
  { href: "/dashboard", label: "Kế hoạch quảng cáo", icon: "ads_click", match: "/plan" },
  { href: "/dashboard/meta", label: "Meta API", icon: "hub", match: "/dashboard/meta" },
  { href: "/dashboard", label: "Lịch sử tư vấn", icon: "history", match: "/history" },
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
  contentClassName = "px-gutter pb-12 pt-24"
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
      // Ignore local configuration errors and return to login.
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-[280px] flex-col border-r border-outline-variant bg-surface py-2 shadow-sm md:flex">
        <div className="px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary">
              <MaterialIcon filled name="insights" />
            </div>
            <div>
              <h1 className="text-[24px] font-extrabold leading-none text-primary">AdPlanner AI</h1>
              <p className="mt-1 text-[12px] font-medium uppercase tracking-wide text-outline">Premium Ads Partner</p>
            </div>
          </div>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-4">
          {navItems.map((item, index) => {
            const active = isActive(pathname, item.match);
            return (
              <Link
                key={`${item.label}-${index}`}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-on-surface-variant transition-colors duration-200 hover:bg-surface-variant/50",
                  active && "border-l-4 border-primary bg-primary-fixed/20 font-bold text-primary"
                )}
              >
                <MaterialIcon filled={active} name={item.icon} />
                <span className="text-base">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-outline-variant px-6 py-6">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-on-surface-variant transition hover:bg-surface-variant/50 hover:text-primary"
          >
            <MaterialIcon name="logout" />
            <span className="font-semibold">Đăng xuất</span>
          </button>
        </div>
      </aside>

      <header className="fixed right-0 top-0 z-40 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface/80 px-4 backdrop-blur-md md:w-[calc(100%-280px)] md:px-6">
        <div className="hidden text-sm font-bold text-primary md:block">AI Ads Planner</div>
        <Link className="flex items-center gap-2 md:hidden" href="/dashboard">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <MaterialIcon filled name="insights" />
          </div>
          <span className="font-extrabold text-primary">AdPlanner AI</span>
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-on-surface">Tài khoản</p>
              <p className="text-[11px] uppercase tracking-wider text-outline">Facebook</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary-fixed bg-primary-fixed text-sm font-extrabold text-primary">
              FB
            </div>
          </div>
        </div>
      </header>

      <main className={cn("min-h-screen md:ml-[280px]", contentClassName)}>
        <div className="mx-auto max-w-[1200px]">
          {title ? (
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-[24px] font-semibold leading-[1.4] text-on-background">{title}</h2>
                {description ? <p className="mt-2 text-base leading-7 text-on-surface-variant">{description}</p> : null}
              </div>
              {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            </div>
          ) : null}
          {children}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-outline-variant bg-surface px-4 md:hidden">
        {navItems.slice(0, 5).map((item, index) => {
          const active = isActive(pathname, item.match);
          return (
            <Link
              key={`${item.label}-mobile-${index}`}
              href={item.href}
              className={cn("flex flex-col items-center gap-1 text-on-surface-variant", active && "text-primary")}
            >
              <MaterialIcon filled={active} name={item.icon} />
              <span className="text-[10px] font-bold">{item.label.split(" ")[0]}</span>
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
