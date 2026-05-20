"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AdsPlanOutput } from "@/lib/ads-plan-schema";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";

type PlanActionsProps = {
  outputId: string;
  answers: unknown;
  plan: AdsPlanOutput;
  compact?: boolean;
};

export function PlanActions({ outputId, answers, plan, compact = false }: PlanActionsProps) {
  const router = useRouter();
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const exportedJson = useMemo(() => JSON.stringify(plan, null, 2), [plan]);

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
      if (!response.ok || !payload.id) throw new Error(payload.error || "Không thể tạo lại kế hoạch.");
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
      if (!response.ok) throw new Error(payload.error || "Không thể gửi sang n8n.");
      toast.success("Đã gửi kế hoạch sang n8n");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi khi gửi.");
    } finally {
      setSending(false);
    }
  }

  function exportJson() {
    const blob = new Blob([exportedJson], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ads-plan-${outputId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const className = compact ? "flex flex-wrap gap-2" : "mt-8 flex flex-wrap gap-2";

  return (
    <div className={className}>
      <Link href="/ask">
        <Button variant="secondary">
          <MaterialIcon name="edit_note" />
          Chỉnh sửa câu trả lời
        </Button>
      </Link>
      <Button onClick={() => void regenerate()} disabled={regenerating} variant="secondary">
        <MaterialIcon className={regenerating ? "animate-spin" : ""} name={regenerating ? "sync" : "refresh"} />
        {regenerating ? "Đang tạo lại..." : "Tạo lại kế hoạch"}
      </Button>
      <Button onClick={exportJson} variant="secondary">
        <MaterialIcon name="file_download" />
        Xuất JSON
      </Button>
      <Button onClick={() => void sendToN8n()} disabled={sending}>
        <MaterialIcon className={sending ? "animate-spin" : ""} name={sending ? "sync" : "send"} />
        {sending ? "Đang gửi..." : "Gửi sang n8n"}
      </Button>
    </div>
  );
}
