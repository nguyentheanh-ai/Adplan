"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { buildAnswersFromMap, plannerQuestions } from "@/lib/questions";
import { cn } from "@/lib/utils";

export function AskFlow() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const current = plannerQuestions[currentIndex];
  const isLast = currentIndex === plannerQuestions.length - 1;
  const answeredCount = plannerQuestions.filter((question) => answers[question.id]?.trim()).length;
  const progress = Math.round((answeredCount / plannerQuestions.length) * 100);
  const canContinue = Boolean(answers[current.id]?.trim());

  const answerList = useMemo(() => buildAnswersFromMap(answers), [answers]);
  const ready = answerList.length === plannerQuestions.length;

  function updateAnswer(value: string) {
    setAnswers((previous) => ({ ...previous, [current.id]: value }));
  }

  async function analyze() {
    setLoading(true);
    try {
      const response = await fetch("/api/analyze-ads-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerList })
      });
      const payload = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "Không thể tạo kế hoạch.");
      }

      toast.success("Đã tạo kế hoạch quảng cáo");
      router.push(`/plan/${payload.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi khi phân tích.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="px-4 pb-2 pt-6 md:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-primary">
              Bước {currentIndex + 1}/9: {current.id === "business" ? "Thông tin sản phẩm" : "Phân tích kinh doanh"}
            </span>
            <span className="text-xs text-on-surface-variant">{progress}% hoàn thành</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6 md:px-6">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="flex animate-in items-start gap-4">
            <div className="ai-gradient-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg">
              <MaterialIcon filled name="auto_awesome" />
            </div>
            <div className="max-w-[85%] space-y-4">
              <div className="rounded-2xl rounded-tl-none bg-white p-6 text-on-surface custom-shadow">
                <p className="text-lg leading-[1.6]">
                  Chào bạn! Tôi là trợ lý chiến lược của AdPlanner AI. Để xây dựng kế hoạch quảng cáo hoàn hảo, hãy giúp tôi hiểu rõ về dự án của bạn.
                </p>
                <p className="mt-4 font-bold text-primary">{current.question}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {current.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    className={cn(
                      "rounded-full border border-primary/20 bg-primary-fixed/10 px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary hover:text-white active:scale-95",
                      answers[current.id] === suggestion && "bg-primary text-white"
                    )}
                    onClick={() => updateAnswer(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {plannerQuestions.slice(0, currentIndex).map((question, index) => (
            <div key={question.id} className="space-y-4">
              <div className="flex justify-end">
                <button
                  className="max-w-[75%] rounded-2xl rounded-tr-none bg-primary-container p-4 text-left font-semibold text-on-primary custom-shadow"
                  onClick={() => setCurrentIndex(index)}
                >
                  {answers[question.id]}
                </button>
              </div>
              <div className="flex items-start gap-4">
                <div className="ai-gradient-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg">
                  <MaterialIcon filled name="auto_awesome" />
                </div>
                <div className="rounded-2xl rounded-tl-none bg-white p-5 text-sm leading-6 text-on-surface custom-shadow">
                  <p className="font-bold text-primary">Đã ghi nhận câu {index + 1}.</p>
                  <p className="mt-1 text-on-surface-variant">Bạn có thể bấm vào câu trả lời để quay lại chỉnh sửa.</p>
                </div>
              </div>
            </div>
          ))}

          {answers[current.id]?.trim() ? (
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-tr-none bg-primary-container p-4 font-semibold text-on-primary custom-shadow">
                {answers[current.id]}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl bg-white p-4 custom-shadow lg:hidden">
            <p className="mb-3 text-sm font-bold text-primary">Tiến độ câu trả lời</p>
            <div className="grid grid-cols-9 gap-1">
              {plannerQuestions.map((question, index) => (
                <button
                  key={question.id}
                  className={cn(
                    "h-2 rounded-full bg-surface-container-high",
                    answers[question.id]?.trim() && "bg-primary",
                    index === currentIndex && "bg-secondary"
                  )}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 pt-0 md:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 hidden items-center gap-2 rounded-2xl bg-surface-container-low p-2 lg:flex">
            {plannerQuestions.map((question, index) => (
              <button
                key={question.id}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-on-surface-variant",
                  answers[question.id]?.trim() && "bg-primary text-white",
                  index === currentIndex && "bg-secondary text-white"
                )}
                onClick={() => setCurrentIndex(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-2xl border border-outline-variant/30 bg-white p-2 shadow-xl">
            <Textarea
              className="min-h-12 flex-1 resize-none border-none bg-transparent px-4 py-3 focus:ring-0"
              onChange={(event) => updateAnswer(event.target.value)}
              placeholder="Mô tả câu trả lời của bạn..."
              value={answers[current.id] ?? ""}
            />
            {!isLast ? (
              <button
                className="ai-gradient-bg mb-1 mr-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition active:scale-95 disabled:opacity-50"
                disabled={!canContinue || loading}
                onClick={() => setCurrentIndex((value) => Math.min(plannerQuestions.length - 1, value + 1))}
              >
                <MaterialIcon name="send" />
              </button>
            ) : (
              <button
                className="ai-gradient-bg mb-1 mr-1 flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-50"
                disabled={!ready || loading}
                onClick={analyze}
              >
                <MaterialIcon className={loading ? "animate-spin" : ""} name={loading ? "sync" : "auto_awesome"} />
                <span className="hidden sm:inline">{loading ? "Đang phân tích..." : "Phân tích"}</span>
              </button>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
          <Button
            disabled={currentIndex === 0 || loading}
            onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
            variant="ghost"
          >
            <MaterialIcon name="arrow_back" />
            Quay lại
          </Button>
            <p className="text-center text-[10px] uppercase tracking-widest text-on-surface-variant opacity-50">
              AI đang trong quá trình học hỏi · Thông tin được bảo mật 100%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
