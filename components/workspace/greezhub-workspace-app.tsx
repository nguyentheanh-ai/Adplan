"use client";

/* eslint-disable @next/next/no-css-tags, @next/next/no-page-custom-font */

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
      <link rel="stylesheet" href="/greezhub-workspace/styles.css?v=20260527-ideas-media" />

      <div className="workspace-embedded">
        <div className="hidden" aria-hidden="true">
          <nav id="nav" />
          <h2 id="pageTitle">Workspace</h2>
          <input id="globalSearch" type="search" />
          <button id="menuButton" type="button" />
          <button id="zoomOut" type="button" />
          <span id="zoomValue">108%</span>
          <button id="zoomIn" type="button" />
          <strong id="sidebarClock">--:--</strong>
          <small id="sidebarClockDate">--</small>
        </div>

        <main className="main" id="app" tabIndex={-1} />
      </div>

      <div className="toast" id="toast" role="status" aria-live="polite" />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.WORKSPACE_REMOTE_CONFIG = { mode: "adplan_api", endpoint: "/api/workspace/app-state" }; window.SUPABASE_CONFIG = ${JSON.stringify(workspaceSupabaseConfig)};`
        }}
      />
      <Script src="/greezhub-workspace/knowledge-seeds.js?v=20260527-ideas-media" strategy="afterInteractive" />
      <Script src="/greezhub-workspace/app.js?v=20260527-ideas-media" strategy="afterInteractive" />
    </>
  );
}
