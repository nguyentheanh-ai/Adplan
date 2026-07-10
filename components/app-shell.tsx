"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { isNavItemActive, primaryNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { AdminUserPermission } from "@/lib/meta/types";

const SIDEBAR_HIDDEN_STORAGE_KEY = "adpilot_sidebar_hidden";

type AccountInfo = {
  user?: {
    userId: string;
    facebookId?: string | null;
    name?: string | null;
  };
  permission?: AdminUserPermission | null;
};

export function AppShell({
  children,
  title,
  description,
  actions,
  contentClassName = "px-4 pb-24 pt-20 md:px-5 md:pb-10 md:pt-[58px]"
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  contentClassName?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_HIDDEN_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [account, setAccount] = useState<AccountInfo | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (active) setAccount(payload?.data ?? null);
      })
      .catch(() => {
        if (active) setAccount(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const isOwner = account?.permission?.role === "owner";
  const visibleNavItems = primaryNavItems.filter((item) => !item.adminOnly || isOwner);

  function toggleSidebar() {
    setSidebarHidden((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_HIDDEN_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // localStorage is optional.
      }
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-on-background">
      {mobileOpen ? <button aria-label="Close menu" className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} type="button" /> : null}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-[240px] flex-col border-r border-[#dbe1ee] bg-[#f8f9ff] transition-transform",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          sidebarHidden ? "md:-translate-x-full" : "md:translate-x-0"
        )}
      >
        <div className="px-5 py-4">
          <Link className="flex items-center gap-2" href="/" onClick={() => setMobileOpen(false)}>
            <Image alt="The Anh logo" className="size-8 object-contain" height={32} src="/brand/ta-mark-transparent.png" width={32} />
            <div>
              <p className="text-[13px] font-semibold leading-4 text-primary">AdPilot Console</p>
              <p className="text-[10px] text-on-surface-variant">Marketing Ops</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {visibleNavItems.map((item) => {
            const active = isNavItemActive(pathname, item);
            return (
              <Link
                key={item.href}
                className={cn(
                  "flex min-h-9 items-center gap-3 rounded-[6px] px-3 text-[12px] font-medium text-[#374151] transition hover:bg-white hover:text-primary",
                  active && "bg-primary text-white hover:bg-primary hover:text-white"
                )}
                href={item.href}
                onClick={() => setMobileOpen(false)}
              >
                <MaterialIcon className="text-[18px]" name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#dbe1ee] p-3">
          <div className="mb-3 flex items-center gap-2 rounded-[8px] px-1">
            <div className="grid size-8 place-items-center rounded-full bg-[#0f172a] text-[10px] font-semibold text-white">AU</div>
            <div>
              <p className="text-[12px] font-semibold text-[#111827]">Admin User</p>
              <p className="text-[10px] text-[#6b7280]">Control Ops</p>
            </div>
          </div>
          <button
            aria-label={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
            className="hidden min-h-10 w-full items-center justify-center gap-2 rounded-md border border-[#e5e7eb] bg-white text-sm font-medium text-on-surface-variant md:flex"
            onClick={toggleSidebar}
            type="button"
          >
            <MaterialIcon name={sidebarHidden ? "menu_open" : "menu"} />
            {sidebarHidden ? "Show menu" : "Hide menu"}
          </button>
        </div>
      </aside>

      {sidebarHidden ? (
        <button
          aria-label="Show sidebar"
          className="fixed left-4 top-4 z-50 hidden size-10 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-on-surface shadow-sm md:flex"
          onClick={toggleSidebar}
          type="button"
        >
          <MaterialIcon name="menu_open" />
        </button>
      ) : null}

      <header
        className={cn(
          "fixed right-0 top-0 z-30 flex h-12 items-center justify-between border-b border-[#dbe1ee] bg-white px-4 md:px-5",
          sidebarHidden ? "left-0" : "left-0 md:left-[240px]"
        )}
      >
        <div className="flex items-center gap-3">
          <button className="grid size-10 place-items-center rounded-md border border-[#e5e7eb] md:hidden" onClick={() => setMobileOpen(true)} type="button" aria-label="Open menu">
            <MaterialIcon name="menu" />
          </button>
          <div className="hidden items-center gap-2 text-[12px] text-[#374151] md:flex">
            <span className="rounded-[6px] border border-[#dbe1ee] bg-[#f8fafc] px-2 py-1">Client Switcher</span>
            <span className="rounded-[6px] border border-[#dbe1ee] bg-[#f8fafc] px-2 py-1">Jan 1 - Jan 31</span>
            <span className="rounded-[6px] border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">Meta Health: Good</span>
          </div>
        </div>
        <AccountMenu account={account} />
      </header>

      <main className={cn("transition-[margin] md:min-h-screen", sidebarHidden ? "md:ml-0" : "md:ml-[240px]")}>
        <div className={cn("mx-auto max-w-[1540px]", contentClassName)}>
          {title ? (
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-on-surface">{title}</h1>
                {description ? <p className="mt-1 text-sm text-on-surface-variant">{description}</p> : null}
              </div>
              {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
            </div>
          ) : null}
          {children}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-5 border-t border-[#e5e7eb] bg-white md:hidden">
        {visibleNavItems.slice(0, 5).map((item) => {
          const active = isNavItemActive(pathname, item);
          return (
            <Link key={`${item.href}-mobile`} className={cn("flex flex-col items-center justify-center gap-1 text-on-surface-variant", active && "text-primary")} href={item.href}>
              <MaterialIcon className="text-[18px]" name={item.icon} />
              <span className="max-w-full truncate text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function AccountMenu({ account }: { account: AccountInfo | null }) {
  const [open, setOpen] = useState(false);

  const label = account?.user?.name || "Facebook user";
  const isPreviewAccount = account?.user?.userId === "dev-preview-user" || account?.user?.facebookId === "dev-preview-facebook";
  const needsFacebookConnection = !account?.user?.facebookId || isPreviewAccount;

  return (
    <div className="flex items-center gap-2">
      {needsFacebookConnection ? (
        <a
          className="hidden min-h-10 items-center gap-2 rounded-md bg-[#1877f2] px-3 text-sm font-semibold text-white md:inline-flex"
          href="/api/auth/facebook/start?force=1"
        >
          <span className="grid size-5 place-items-center rounded bg-white text-xs font-bold text-[#1877f2]">f</span>
          Connect Facebook
        </a>
      ) : null}
      <div className="relative">
        <button className="flex min-h-10 items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 text-sm font-medium" onClick={() => setOpen((current) => !current)} type="button">
          <span className="grid size-7 place-items-center rounded-full bg-[#eef2ff] text-xs font-semibold text-primary">{label.slice(0, 1).toUpperCase()}</span>
          <span className="hidden max-w-44 truncate md:inline">{label}</span>
          <MaterialIcon name="keyboard_arrow_down" />
        </button>
        {open ? (
          <div className="absolute right-0 top-12 w-64 rounded-lg border border-[#e5e7eb] bg-white p-2 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-on-surface">{label}</p>
              <p className="break-all text-xs text-on-surface-variant">{account?.user?.userId || "Session active"}</p>
            </div>
            <a className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-on-surface-variant hover:bg-[#f3f4f6]" href="/api/auth/facebook/start?force=1">
              <MaterialIcon name="login" />
              {needsFacebookConnection ? "Connect Facebook" : "Reconnect Facebook"}
            </a>
            <Link className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-on-surface-variant hover:bg-[#f3f4f6]" href="/settings" onClick={() => setOpen(false)}>
              <MaterialIcon name="settings" />
              Settings
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm font-medium text-red-700 hover:bg-red-50" type="submit">
                <MaterialIcon name="logout" />
                Logout
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
