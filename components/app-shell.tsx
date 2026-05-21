"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { MaterialIcon } from "@/components/material-icon";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  match: string;
  section?: string;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Tổng quan", icon: "dashboard", match: "/dashboard" },
  { href: "/reports", label: "Báo cáo Ads", icon: "monitoring", match: "/reports", section: "reports" },
  { href: "/optimization", label: "Tối ưu Ads", icon: "trending_up", match: "/optimization", section: "optimization" },
  { href: "/campaign-builder", label: "Tạo Campaign AI", icon: "auto_awesome", match: "/campaign-builder", section: "campaign_builder" },
  { href: "/audiences", label: "Tệp khách hàng", icon: "groups", match: "/audiences", section: "audiences" },
  { href: "/creative", label: "Creative", icon: "palette", match: "/creative", section: "creative" },
  { href: "/history", label: "Lịch sử", icon: "history", match: "/history" },
  { href: "/settings", label: "Cài đặt", icon: "settings", match: "/settings" },
  { href: "/admin", label: "Quản trị", icon: "admin_panel_settings", match: "/admin", adminOnly: true }
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
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("adplanner_sidebar_hidden") === "1";
    } catch {
      return false;
    }
  });
  const [permissionLoaded, setPermissionLoaded] = useState(false);
  const [userRole, setUserRole] = useState<"owner" | "manager" | "member">("member");
  const [lockedSections, setLockedSections] = useState<string[]>([]);

  useEffect(() => {
    let isCancelled = false;
    fetch("/api/admin/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((payload) => {
        if (isCancelled) return;
        const role = payload?.data?.permission?.role;
        const locks = payload?.data?.permission?.locked_sections;
        if (role === "owner" || role === "manager" || role === "member") {
          setUserRole(role);
        }
        if (Array.isArray(locks)) {
          setLockedSections(locks);
        }
      })
      .finally(() => {
        if (!isCancelled) setPermissionLoaded(true);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => {
      if (item.adminOnly) {
        return userRole === "owner" || userRole === "manager";
      }
      if (!item.section) return true;
      if (userRole === "owner" || userRole === "manager") return true;
      return !lockedSections.includes(item.section);
    });
  }, [userRole, lockedSections]);

  function toggleSidebar() {
    setSidebarHidden((current) => {
      const next = !current;
      try {
        window.localStorage.setItem("adplanner_sidebar_hidden", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // vẫn chuyển về login nếu logout lỗi tạm thời.
    }
    router.replace("/login");
    router.refresh();
  }

  const isFullWidthPage = pathname === "/dashboard" || pathname === "/campaign-builder";

  return (
    <div className="min-h-screen bg-background text-on-background">
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 hidden h-full w-[240px] flex-col border-r border-outline-variant bg-surface-container-lowest transition-transform md:flex",
          sidebarHidden && "md:-translate-x-full"
        )}
      >
        <div className="px-5 py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
              <MaterialIcon filled name="insights" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold leading-none text-primary">AdPlanner AI</h1>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-outline">Meta Ads Cockpit</p>
            </div>
          </Link>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3">
          {visibleNavItems.map((item) => {
            const active = isActive(pathname, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container",
                  active && "bg-primary text-white hover:bg-primary"
                )}
              >
                <MaterialIcon className="text-[22px]" filled={active} name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-5">
          <div className="mb-4 rounded-lg border border-outline-variant bg-surface-container-low p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-outline">Kết nối</p>
            <p className="mt-1 text-sm font-bold text-on-surface">Facebook Marketing API</p>
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">Campaign thật luôn được giữ PAUSED trước khi duyệt.</p>
            {!permissionLoaded ? null : <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-outline">Vai trò: {userRole}</p>}
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container hover:text-primary"
          >
            <MaterialIcon name="logout" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <header
        className={cn(
          "fixed right-0 top-0 z-40 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4 md:px-6",
          sidebarHidden ? "md:w-full" : "md:w-[calc(100%-240px)]"
        )}
      >
        <Link className="flex items-center gap-2 md:hidden" href="/dashboard">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
            <MaterialIcon filled name="insights" />
          </div>
          <span className="font-extrabold text-primary">AdPlanner AI</span>
        </Link>
        <div className="hidden text-sm font-bold text-primary md:block">AI Ads Planner</div>
        <div className="flex items-center gap-3">
          <button
            className="hidden h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 text-sm font-bold text-on-surface-variant hover:text-primary md:inline-flex"
            onClick={toggleSidebar}
            type="button"
          >
            <MaterialIcon name={sidebarHidden ? "menu_open" : "menu"} />
            {sidebarHidden ? "Hiện menu" : "Ẩn menu"}
          </button>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-on-surface">Tài khoản</p>
            <p className="text-[11px] uppercase tracking-wider text-outline">Facebook</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-fixed bg-primary-fixed text-sm font-extrabold text-primary">FB</div>
        </div>
      </header>

      <main className={cn("min-h-screen transition-all", sidebarHidden ? "md:ml-0" : "md:ml-[240px]", contentClassName)}>
        <div className={cn("mx-auto", isFullWidthPage ? "max-w-none" : sidebarHidden ? "max-w-[1440px]" : "max-w-[1280px]")}>
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

      <nav className="fixed bottom-0 left-0 right-0 z-50 grid h-16 grid-cols-5 border-t border-outline-variant bg-white px-2 md:hidden">
        {visibleNavItems.slice(0, 5).map((item) => {
          const active = isActive(pathname, item.match);
          return (
            <Link key={`${item.href}-mobile`} href={item.href} className={cn("flex flex-col items-center justify-center gap-1 text-on-surface-variant", active && "text-primary")}>
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
