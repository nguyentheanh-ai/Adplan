import { MaterialIcon } from "@/components/material-icon";
import { workspaceNavItems } from "@/lib/navigation";

const moduleDescriptions: Record<string, string> = {
  "/workspace/documents": "Kho tài liệu, doc, sheet, PDF, link và giáo trình đã lưu trong app.",
  "/workspace/notes": "Ghi chú nhanh, outline, checklist và nội dung đang triển khai.",
  "/workspace/ideas": "Nơi gom ý tưởng, angle, hook và insight để phát triển nội dung.",
  "/workspace/prompts": "Thư viện prompt và trợ lý dùng lại cho các workflow AI.",
  "/workspace/content-plan": "Plan Content theo chiến dịch, lịch đăng và trạng thái triển khai.",
  "/workspace/calendar": "Lịch triển khai theo ngày, deadline và mốc nội dung.",
  "/workspace/tools/clock": "Clock, timer và công cụ hỗ trợ quản lý thời gian làm việc.",
  "/workspace/analytics": "Khu theo dõi chỉ số, báo cáo và tín hiệu vận hành.",
  "/workspace/tasks": "Task, kế hoạch, ưu tiên và việc cần xử lý."
};

const workspaceBlocks = workspaceNavItems
  .filter(({ href }) => !["/workspace", "/workspace/content", "/workspace/operations"].includes(href))
  .map((item) => ({
    ...item,
    description: moduleDescriptions[item.href] ?? "Mở module Workspace hiện có."
  }));

export function WorkspaceOverview() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[#e4ebf7] bg-white p-7 shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Workspace</p>
        <h1 className="mt-3 text-[30px] font-extrabold leading-tight text-slate-950 md:text-[38px]">Không gian làm việc</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Chọn khu cần làm việc. Các block bên dưới mở lại đúng module Workspace cũ, chỉ đổi cách vào để giao diện gọn và dễ quét hơn.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspaceBlocks.map((section) => (
          <a
            key={section.href}
            href={section.href}
            className="group rounded-2xl border border-[#e4ebf7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_28px_90px_rgba(37,99,235,0.14)]"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-primary">
              <MaterialIcon className="text-[22px]" name={section.icon} />
            </span>
            <h2 className="mt-4 text-lg font-extrabold text-slate-950">{section.label}</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{section.description}</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-primary">
              Mở module
              <MaterialIcon className="text-[18px] transition group-hover:translate-x-0.5" name="arrow_forward" />
            </div>
          </a>
        ))}
      </section>
    </div>
  );
}
