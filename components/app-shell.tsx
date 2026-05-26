"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { isNavItemActive, primaryNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const SIDEBAR_HIDDEN_STORAGE_KEY = "adplanner_sidebar_hidden";

export function AppShell({
  children,
  title,
  description,
  actions,
  contentClassName = "px-6 pb-24 pt-24 md:px-10 md:pb-12"
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  contentClassName?: string;
}) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_HIDDEN_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  function toggleSidebar() {
    setSidebarHidden((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_HIDDEN_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }
  function handleSidebarControl() {
    const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
    if (!isDesktop) {
      setMobileSidebarOpen(false);
      return;
    }
    toggleSidebar();
  }

  const isFullWidthPage = pathname === "/" || pathname === "/ads-facebook/campaign-builder" || pathname === "/campaign-builder";

  return (
    <div className="min-h-screen bg-[#f8fbff] text-on-background">
      {mobileSidebarOpen ? <button className="fixed inset-0 z-40 bg-on-background/40 md:hidden" aria-label="Đóng menu" type="button" onClick={() => setMobileSidebarOpen(false)} /> : null}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-[300px] flex-col border-r border-[#e7eefb] bg-white shadow-[18px_0_70px_rgba(31,80,154,0.08)] transition-all",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          !sidebarHidden && "md:w-[300px] md:translate-x-0",
          sidebarHidden && "md:w-[300px] md:-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-7">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-xl font-extrabold text-white shadow-[0_14px_34px_rgba(37,99,235,0.28)]">
              G
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-none text-[#0f172a]">Greezhub</h1>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Workspace</p>
            </div>
          </Link>
          <button
            className="grid size-9 place-items-center rounded-lg border border-[#dbe7fb] bg-white text-slate-700 shadow-sm"
            onClick={handleSidebarControl}
            type="button"
            aria-label={sidebarHidden ? "Hiện menu" : "Ẩn menu"}
            title={sidebarHidden ? "Hiện menu" : "Ẩn menu"}
          >
            <MaterialIcon className="text-[20px]" name={sidebarHidden ? "menu_open" : "menu"} />
          </button>
        </div>

        <nav className="custom-scrollbar flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid gap-2">
            {primaryNavItems.map((item) => {
              const active = isNavItemActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={cn(
                    "flex min-h-14 items-center gap-4 rounded-xl px-5 py-3 text-[15px] font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-600",
                    active && "bg-blue-50 text-blue-600"
                  )}
                >
                  <MaterialIcon className="text-[22px]" filled={active} name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="px-6 py-6">
          <p className="text-xs font-semibold text-slate-400">© 2026 Greezhub</p>
        </div>
      </aside>

      {sidebarHidden ? (
        <button
          className="fixed left-4 top-4 z-50 hidden size-11 items-center justify-center rounded-xl border border-[#dbe7fb] bg-white text-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.14)] transition hover:bg-blue-50 hover:text-blue-600 md:flex"
          onClick={toggleSidebar}
          type="button"
          aria-label="Hiện thanh bên"
          title="Hiện thanh bên"
        >
          <MaterialIcon className="text-[22px]" name="menu_open" />
        </button>
      ) : null}

      <header
        className={cn(
          "fixed right-0 top-0 z-40 flex h-20 w-full items-center justify-between bg-transparent px-6 md:px-10",
          sidebarHidden ? "md:w-full" : "md:w-[calc(100%-300px)]"
        )}
      >
        <div className="flex items-center gap-2 md:hidden">
          <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant bg-white text-primary" type="button" aria-label="Mở menu" onClick={() => {
            setMobileSidebarOpen(true);
          }}>
            <MaterialIcon name="menu" />
          </button>
          <Link className="font-extrabold text-primary" href="/">G x A</Link>
        </div>
        <div className="hidden md:block" />
        <AccountMenu />
      </header>

      <main className={cn("app-main-scroll h-screen overflow-x-hidden overflow-y-auto overscroll-contain transition-all", sidebarHidden ? "md:ml-0" : "md:ml-[300px]", contentClassName)}>
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

      <nav className="fixed bottom-0 left-0 right-0 z-50 grid h-16 grid-cols-4 border-t border-outline-variant bg-white px-2 md:hidden">
        {primaryNavItems.slice(0, 4).map((item) => {
          const active = isNavItemActive(pathname, item);
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

type AccountInfo = {
  user?: {
    userId: string;
    facebookId?: string | null;
    name?: string | null;
  };
};

type FacebookPageInfo = {
  id: string;
  name: string;
  has_access_token?: boolean;
};

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [pages, setPages] = useState<FacebookPageInfo[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesLoaded, setPagesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const response = await fetch("/api/admin/me", { cache: "no-store" });
        if (!active) return;
        if (response.ok) {
          const payload = (await response.json()) as { data?: AccountInfo };
          setAccount(payload.data ?? null);
        } else {
          setAccount(null);
          setPages([]);
          setPagesLoaded(false);
        }
      } catch {
        if (active) {
          setAccount(null);
          setPages([]);
          setPagesLoaded(false);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAccount();
    return () => {
      active = false;
    };
  }, []);

  const facebookConnected = Boolean(account?.user?.facebookId);

  useEffect(() => {
    if (!open || !facebookConnected || pagesLoaded || pagesLoading) return;

    let active = true;

    async function loadPages() {
      setPagesLoading(true);
      try {
        const pagesResponse = await fetch("/api/meta/pages", { cache: "no-store" });
        if (!active) return;
        if (pagesResponse.ok) {
          const pagesPayload = (await pagesResponse.json()) as { data?: FacebookPageInfo[] };
          setPages(pagesPayload.data ?? []);
        } else {
          setPages([]);
        }
        setPagesLoaded(true);
      } catch {
        if (active) {
          setPages([]);
          setPagesLoaded(true);
        }
      } finally {
        if (active) setPagesLoading(false);
      }
    }

    loadPages();
    return () => {
      active = false;
    };
  }, [facebookConnected, open, pagesLoaded, pagesLoading]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const displayName = account?.user?.name || "Chưa đăng nhập";
  const initial = displayName.trim().charAt(0).toUpperCase() || "G";
  const pagesWithToken = pages.filter((page) => page.has_access_token).length;
  const facebookStatus = (() => {
    if (!facebookConnected) return "Kết nối Facebook để dùng Ads và Publisher.";
    if (pagesLoading) return "Đang kiểm tra Fanpage đã kết nối...";
    if (!pagesLoaded) return "Facebook connected. Mở menu để kiểm tra Fanpage.";
    return `${pages.length} Fanpage đã đọc được, ${pagesWithToken} Page có token đăng bài.`;
  })();

  return (
    <div className="relative ml-auto flex items-center gap-4">
      <button
        className="grid size-10 place-items-center rounded-full bg-white text-slate-800 shadow-sm"
        type="button"
        aria-label="Thông báo"
      >
        <MaterialIcon name="notifications" />
      </button>
      <button
        className="flex items-center gap-3 rounded-full bg-white/70 py-1.5 pl-2 pr-3 text-left shadow-sm transition hover:bg-white"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-sm font-extrabold text-white">
          {initial}
        </div>
        <div className="hidden text-right sm:block">
          <p className="max-w-[180px] truncate text-sm font-extrabold text-slate-900">{loading ? "Đang tải..." : displayName}</p>
          <p className="text-[11px] uppercase tracking-wider text-slate-400">{facebookConnected ? "Facebook connected" : "Greezhub"}</p>
        </div>
        <MaterialIcon className="hidden text-[20px] text-slate-800 sm:block" name="keyboard_arrow_down" />
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-50 w-[340px] rounded-2xl border border-[#dbe7fb] bg-white p-4 text-slate-900 shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
          <div className="flex items-start gap-3 border-b border-[#edf3ff] pb-4">
            <div className="grid size-11 place-items-center rounded-full bg-blue-600 text-sm font-extrabold text-white">{initial}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{displayName}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {facebookStatus}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <a
              className="flex items-center justify-between rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-blue-700"
              href="/api/auth/facebook/start?force=1"
            >
              <span className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-md bg-white text-blue-600">f</span>Kết nối Facebook</span>
              <MaterialIcon name="arrow_forward" />
            </a>
            <button
              className="flex cursor-not-allowed items-center justify-between rounded-xl border border-[#dbe7fb] px-4 py-3 text-sm font-extrabold text-slate-400"
              disabled
              type="button"
              title="Google login cần chốt lại luồng session riêng vì không cấp quyền Fanpage/Ads."
            >
              <span className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-md bg-slate-100 text-slate-500">G</span>Đăng nhập Google</span>
              <span className="text-[11px] uppercase tracking-wide">Chưa bật</span>
            </button>
            <Link className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50" href="/ads-facebook">
              Mở Ads Facebook
              <MaterialIcon name="arrow_forward" />
            </Link>
            <Link className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50" href="/settings">
              Cài đặt tài khoản
              <MaterialIcon name="settings" />
            </Link>
            {account?.user ? (
              <button className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50" type="button" onClick={handleLogout}>
                Đăng xuất
                <MaterialIcon name="logout" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MiniPersonaLink({ id }: { id: string }) {
  return (
    <Link href={`/persona/${id}`} className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
      <MaterialIcon className="text-[18px]" name="group" />
      Xem chan dung
    </Link>
  );
}
