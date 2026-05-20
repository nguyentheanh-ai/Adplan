"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import type { AdsPlanOutput } from "@/lib/ads-plan-schema";

export function PlanActions({
  outputId,
  plan,
  answers,
  compact = false
}: {
  outputId: string;
  plan: AdsPlanOutput;
  answers: unknown;
  compact?: boolean;
}) {
  const router = useRouter();
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);

  function exportJson() {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ai-ads-plan-${outputId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function regenerate() {
    if (!Array.isArray(answers)) {
      toast.error("Không tìm thấy câu trả lời gốc để tạo lại.");
      return;
    }

    setRegenerating(true);
    try {
      const response = await fetch("/api/analyze-ads-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error ?? "Không thể tạo lại kế hoạch.");
      toast.success("Đã tạo lại kế hoạch");
      router.push(`/plan/${payload.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi khi tạo lại.");
    } finally {
      setRegenerating(false);
    }
  }

  async function sendToN8n() {
    setSending(true);
    try {
      const response = await fetch("/api/send-to-n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputId })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Không thể gửi sang n8n.");
      toast.success("Đã gửi kế hoạch sang n8n");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi khi gửi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Link href="/ask">
        <Button variant="secondary">
          <MaterialIcon name="edit_note" />
          Chỉnh sửa câu trả lời
        </Button>
      </Link>
      {!compact ? (
        <Button disabled={regenerating} onClick={regenerate} variant="secondary">
          <MaterialIcon className={regenerating ? "animate-spin" : ""} name={regenerating ? "sync" : "refresh"} />
        Tạo lại kế hoạch
        </Button>
      ) : null}
      <Button onClick={exportJson} variant="secondary">
        <MaterialIcon name="download" />
        Xuất JSON
      </Button>
      <Button disabled={sending} onClick={sendToN8n} variant="ai">
        <MaterialIcon className={sending ? "animate-spin" : ""} name={sending ? "sync" : "hub"} />
        Gửi sang n8n
      </Button>
    </>
  );
}
