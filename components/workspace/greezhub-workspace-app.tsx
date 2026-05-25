"use client";

/* eslint-disable @next/next/no-css-tags, @next/next/no-page-custom-font */

import Image from "next/image";
import Script from "next/script";

const workspaceSupabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
};

export function GreezhubWorkspaceApp() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400;600;700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="/greezhub-workspace/styles.css?v=20260525-next-port" />

      <aside className="sidebar" aria-label="Điều hướng chính">
        <div className="brand">
          <Image className="brand__mark" src="/greezhub-workspace/logo.svg" alt="" width={48} height={48} priority />
          <div>
            <h1>Engine</h1>
            <p>Pro Dashboard</p>
          </div>
        </div>
        <div className="sidebar-clock" aria-label="Đồng hồ hiện tại">
          <span className="material-symbols-outlined">schedule</span>
          <div>
            <strong id="sidebarClock">--:--</strong>
            <small id="sidebarClockDate">--</small>
          </div>
        </div>

        <nav className="nav" id="nav" />

        <div className="sidebar__footer">
          <button className="ghost-action" type="button" data-page="settings">
            <span className="material-symbols-outlined">settings</span>
            Cài đặt
          </button>
          <button className="ghost-action" type="button" data-page="support">
            <span className="material-symbols-outlined">help</span>
            Hỗ trợ
          </button>
        </div>
      </aside>

      <div className="shell">
        <header className="topbar">
          <button className="icon-button menu-button" id="menuButton" type="button" aria-label="Mở menu">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h2 id="pageTitle">Dashboard tổng quan</h2>
          <div className="topbar__actions">
            <label className="search">
              <span className="material-symbols-outlined">search</span>
              <input id="globalSearch" type="search" placeholder="Tìm kiếm dữ liệu..." />
            </label>
            <div className="zoom-controls" aria-label="Chỉnh cỡ chữ">
              <button className="icon-button" id="zoomOut" type="button" aria-label="Thu nhỏ chữ">
                <span className="material-symbols-outlined">text_decrease</span>
              </button>
              <span id="zoomValue">108%</span>
              <button className="icon-button" id="zoomIn" type="button" aria-label="Phóng to chữ">
                <span className="material-symbols-outlined">text_increase</span>
              </button>
            </div>
            <button className="icon-button" type="button" aria-label="Thông báo">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="avatar" aria-label="Tài khoản">TA</div>
          </div>
        </header>

        <main className="main" id="app" tabIndex={-1} />
      </div>

      <div className="toast" id="toast" role="status" aria-live="polite" />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.WORKSPACE_REMOTE_CONFIG = { mode: "adplan_api", endpoint: "/api/workspace/app-state" }; window.SUPABASE_CONFIG = ${JSON.stringify(workspaceSupabaseConfig)};`
        }}
      />
      <Script src="/greezhub-workspace/knowledge-seeds.js?v=20260525-next-port" strategy="afterInteractive" />
      <Script src="/greezhub-workspace/app.js?v=20260525-next-port" strategy="afterInteractive" />
    </>
  );
}
