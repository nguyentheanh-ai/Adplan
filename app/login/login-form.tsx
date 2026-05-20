"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/material-icon";
export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFacebookLogin() {
    setLoading(true);
    setErrorMessage(null);
    try {
      window.location.href = "/api/auth/facebook/start?force=1";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể mở đăng nhập Facebook.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen overflow-hidden bg-background text-on-background">
      <section className="relative z-10 flex w-full flex-col bg-surface-container-lowest p-6 shadow-2xl md:w-[480px] md:p-12 lg:w-[560px]">
        <div className="mb-12">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary">
              <MaterialIcon filled name="insights" />
            </div>
            <span className="text-[24px] font-extrabold text-primary">AdPlanner AI</span>
          </div>
        </div>

        <div className="mb-10">
          <h1 className="mb-2 text-[32px] font-bold leading-[1.2] text-on-background">Đăng nhập bằng Facebook</h1>
          <p className="text-lg leading-[1.6] text-on-surface-variant">
            Ứng dụng yêu cầu Facebook để kết nối Meta Marketing API và tài khoản quảng cáo.
          </p>
        </div>

        <div className="mb-8 rounded-2xl bg-primary-fixed/30 p-4 text-sm leading-6 text-on-surface-variant">
          Chỉ hỗ trợ đăng nhập Facebook. Email, Google và mật khẩu đã được tắt trong bản MVP này.
        </div>

        <button
          className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#1877F2] text-lg font-bold text-white shadow-lg transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-70"
          disabled={loading}
          onClick={handleFacebookLogin}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded bg-white text-base font-extrabold text-[#1877F2]">f</span>
          <span>{loading ? "Đang mở Facebook..." : "Tiếp tục với Facebook"}</span>
          <MaterialIcon name="arrow_forward" />
        </button>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-error/20 bg-error-container/30 p-4 text-sm font-semibold text-error">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 rounded-xl border border-outline-variant bg-white p-4 text-xs leading-6 text-on-surface-variant">
          Khi đăng nhập Facebook thành công, backend dùng token của phiên đăng nhập để quét tài khoản quảng cáo. Token không được gửi ra frontend.
        </div>
      </section>

      <section className="ai-gradient-bg relative hidden flex-1 items-center justify-center overflow-hidden p-6 md:flex">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute right-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-white blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-tertiary blur-[100px]" />
        </div>
        <div className="relative w-full max-w-2xl">
          <div className="floating-anim relative z-20 rounded-[32px] p-8 shadow-2xl glass-card">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <div className="mb-2 h-2 w-24 rounded-full bg-primary/20" />
                <div className="h-4 w-48 rounded-full bg-primary" />
              </div>
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-error/40" />
                <div className="h-3 w-3 rounded-full bg-secondary/40" />
                <div className="h-3 w-3 rounded-full bg-primary/40" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <PreviewMetric icon="ads_click" label="CTR" value="3.84%" tone="primary" />
              <PreviewMetric icon="group" label="Reach" value="84.2k" tone="secondary" />
              <div className="col-span-2 rounded-2xl border border-white/50 bg-white/60 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-on-surface">AI Recommendations</span>
                  <div className="rounded-md bg-secondary-container/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary">
                    AI Optimizer
                  </div>
                </div>
                <div className="space-y-3">
                  <ProgressLine color="primary" label="High Conversion" width="75%" />
                  <ProgressLine color="secondary" label="Target Reach" width="45%" />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-16 -left-16 z-0 h-48 w-48 rounded-full border-[16px] border-white/10" />
        </div>

      </section>
    </main>
  );
}

function PreviewMetric({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: "primary" | "secondary" }) {
  return (
    <div className="rounded-2xl border border-white/50 bg-white/40 p-5">
      <div className="mb-2 flex items-center gap-3">
        <MaterialIcon filled className={tone === "primary" ? "text-primary" : "text-secondary"} name={icon} />
        <span className="text-xs font-bold text-on-surface-variant">{label}</span>
      </div>
      <div className={tone === "primary" ? "text-2xl font-bold text-primary" : "text-2xl font-bold text-secondary"}>{value}</div>
      <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-tertiary">
        <MaterialIcon className="text-[12px]" name="trending_up" /> +12%
      </div>
    </div>
  );
}

function ProgressLine({ color, label, width }: { color: "primary" | "secondary"; label: string; width: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={color === "primary" ? "h-2 w-2 rounded-full bg-primary" : "h-2 w-2 rounded-full bg-secondary"} />
      <div className={color === "primary" ? "h-2 flex-1 overflow-hidden rounded-full bg-primary/10" : "h-2 flex-1 overflow-hidden rounded-full bg-secondary/10"}>
        <div className={color === "primary" ? "h-full bg-primary" : "h-full bg-secondary"} style={{ width }} />
      </div>
      <span className={color === "primary" ? "text-[10px] font-bold text-primary" : "text-[10px] font-bold text-secondary"}>{label}</span>
    </div>
  );
}
