"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/material-icon";

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleFacebookLogin() {
    setLoading(true);
    setErrorMessage(null);
    try {
      window.location.href = "/api/auth/facebook/start?force=1";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cannot start Facebook login.";
      setErrorMessage(message);
      toast.error(message);
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-background text-on-background lg:grid-cols-[480px_1fr]">
      <section className="flex flex-col justify-center border-r border-[#e5e7eb] bg-white p-8 md:p-12">
        <div className="mb-10">
          <Image alt="The Anh logo" className="h-14 w-14 object-contain" height={56} src="/brand/ta-mark-transparent.png" width={56} />
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-outline">AdPilot Marketing Console</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-on-surface">Sign in with Facebook</h1>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            The app uses Facebook OAuth to read authorized ad accounts and Pages. Tokens stay server-side.
          </p>
        </div>

        <button
          className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-md bg-[#1877f2] px-4 text-sm font-semibold text-white disabled:opacity-70"
          disabled={loading}
          onClick={handleFacebookLogin}
          type="button"
        >
          <span className="grid size-5 place-items-center rounded bg-white text-[#1877f2]">f</span>
          {loading ? "Opening Facebook..." : "Continue with Facebook"}
          <MaterialIcon name="arrow_forward" />
        </button>

        {errorMessage ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{errorMessage}</div> : null}
      </section>

      <section className="hidden items-center justify-center p-10 lg:flex">
        <div className="w-full max-w-3xl rounded-lg border border-[#e5e7eb] bg-white p-8">
          <div className="grid gap-4 md:grid-cols-3">
            <PreviewMetric label="Spend" value="Live API" icon="account_balance_wallet" />
            <PreviewMetric label="Campaigns" value="Paginated" icon="campaign" />
            <PreviewMetric label="Publishing" value="Server-side" icon="publish" />
          </div>
          <div className="mt-6 rounded-lg bg-[#f9fafb] p-5">
            <p className="text-sm font-semibold text-on-surface">Operational, not decorative</p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              AdPilot focuses on fast tables, compact controls, clear permission states and no token exposure in the browser.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function PreviewMetric({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white p-4">
      <MaterialIcon className="text-primary" name={icon} />
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-outline">{label}</p>
      <p className="mt-1 text-lg font-semibold text-on-surface">{value}</p>
    </div>
  );
}
