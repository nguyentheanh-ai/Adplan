import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth/session";
import { AppShell, MiniPersonaLink } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { MaterialIcon } from "@/components/material-icon";
import { MetaDashboard } from "@/components/meta/meta-dashboard";
import { SetupRequired } from "@/components/setup-required";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { adsPlanOutputSchema, type AdsPlanOutput } from "@/lib/ads-plan-schema";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

type DashboardOutput = {
  id: string;
  created_at: string;
  ads_plan_json: unknown;
  projects: unknown;
};

export default async function DashboardPage() {
  if (!hasSupabasePublicEnv()) {
    return (
      <AppShell contentClassName="px-gutter pb-12 pt-24">
        <SetupRequired />
      </AppShell>
    );
  }

  const session = await getAppSession();
  if (!session) redirect("/login");

  const admin = createAdminClient();
  const { data: outputs } = await admin
    .from("ai_outputs")
    .select("id, created_at, ads_plan_json, projects(business_name, industry)")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <AppShell contentClassName="px-gutter pb-12 pt-24">
      <DashboardView outputs={outputs ?? []} userEmail={session.name ?? "Facebook user"} />
    </AppShell>
  );
}

function DashboardView({ outputs, userEmail }: { outputs: DashboardOutput[]; userEmail: string }) {
  const validPlans = outputs
    .map((item) => {
      const parsed = adsPlanOutputSchema.safeParse(item.ads_plan_json);
      return parsed.success ? { item, plan: parsed.data } : null;
    })
    .filter((item): item is { item: DashboardOutput; plan: AdsPlanOutput } => Boolean(item));

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="mb-1 text-[24px] font-semibold leading-[1.4] text-on-background">Tổng quan</h2>
          <p className="text-on-surface-variant">Đăng nhập: {userEmail}. Tạo kế hoạch AI và quản lý campaign Meta từ một nơi.</p>
        </div>
        <Link href="/ask">
          <Button variant="ai" className="px-6 py-3">
            <MaterialIcon filled name="add_circle" />
            Bắt đầu lập kế hoạch mới
          </Button>
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="campaign" label="Kế hoạch đã tạo" metric={String(validPlans.length).padStart(2, "0")} note="AI plans" tone="primary" />
        <StatCard icon="account_balance_wallet" label="Meta API" metric="Live" note="Facebook OAuth" tone="secondary" />
        <StatCard icon="auto_awesome" label="AI Planner" metric="Ready" note="Gemini" tone="tertiary" />
        <StatCard ai icon="verified" label="Trạng thái app" metric="MVP" note="Production" tone="primary" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-[20px] font-semibold">Luồng làm việc</h3>
              <p className="mt-1 text-sm text-on-surface-variant">Các bước chính để tạo và duyệt kế hoạch quảng cáo.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <WorkflowStep icon="contact_support" title="Trả lời câu hỏi" text="Thu thập thông tin sản phẩm, khách hàng, ngân sách và mục tiêu." />
            <WorkflowStep icon="auto_awesome" title="AI phân tích" text="Gemini tạo chân dung khách hàng và cấu trúc campaign có thể triển khai." />
            <WorkflowStep icon="hub" title="Kết nối Meta" text="Chọn tài khoản quảng cáo Facebook và tạo campaign PAUSED khi đã sẵn sàng." />
          </div>
        </Card>

        <Card className="relative flex flex-col overflow-hidden rounded-2xl bg-primary-container p-6 text-on-primary">
          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-2">
              <MaterialIcon className="text-secondary-fixed" name="security" />
              <h3 className="text-lg font-bold">An toàn trước khi chạy ads</h3>
            </div>
            <ul className="space-y-3 text-sm leading-6">
              <li>Không expose Facebook token ra frontend.</li>
              <li>Campaign tạo từ app luôn ở trạng thái PAUSED.</li>
              <li>Người dùng chọn đúng ad account trước khi tạo campaign.</li>
            </ul>
          </div>
          <Link className="mt-6" href="/dashboard/meta">
            <Button variant="secondary">Mở Meta API</Button>
          </Link>
        </Card>
      </div>

      <Card className="mt-8 overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-6">
          <div>
            <h3 className="text-[20px] font-semibold">Kế hoạch quảng cáo gần đây</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Dữ liệu thật từ Supabase theo tài khoản đang đăng nhập.</p>
          </div>
          <Link href="/ask" className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            Tạo mới <MaterialIcon className="text-sm" name="chevron_right" />
          </Link>
        </div>

        {validPlans.length ? (
          <RecentPlansTable rows={validPlans} />
        ) : (
          <div className="p-6">
            <EmptyState
              title="Chưa có kế hoạch nào"
              description="Trả lời 9 câu hỏi để AI tạo chân dung khách hàng và kế hoạch Facebook Ads đầu tiên."
              href="/ask"
              action="Tạo kế hoạch đầu tiên"
            />
          </div>
        )}
      </Card>

      <MetaDashboard compact />
    </>
  );
}

function RecentPlansTable({ rows }: { rows: Array<{ item: DashboardOutput; plan: AdsPlanOutput }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low text-[13px] font-semibold text-on-surface-variant">
            <th className="px-6 py-4">Tên kế hoạch</th>
            <th className="px-6 py-4">Mục tiêu</th>
            <th className="px-6 py-4">Trạng thái</th>
            <th className="px-6 py-4">Ngân sách</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {rows.map(({ item, plan }) => {
            const project = Array.isArray(item.projects) ? item.projects[0] : (item.projects as { business_name?: string; industry?: string } | null);
            return (
              <tr key={item.id} className="transition-colors hover:bg-surface-container-lowest">
                <td className="px-6 py-5">
                  <Link href={`/plan/${item.id}`} className="font-bold text-on-surface hover:text-primary">
                    {project?.business_name ?? plan.business_summary.offer ?? "Kế hoạch quảng cáo"}
                  </Link>
                  <p className="text-xs text-outline">Tạo lúc {formatDate(item.created_at)}</p>
                  <div className="mt-2">
                    <MiniPersonaLink id={item.id} />
                  </div>
                </td>
                <td className="px-6 py-5">{plan.business_summary.main_goal || "Chưa rõ"}</td>
                <td className="px-6 py-5">
                  <Badge className="bg-tertiary-fixed/40 text-tertiary">DRAFT</Badge>
                </td>
                <td className="px-6 py-5">{plan.business_summary.budget || "Chưa rõ"}</td>
                <td className="px-6 py-5 text-right">
                  <Link href={`/plan/${item.id}`} className="text-on-surface-variant hover:text-primary">
                    <MaterialIcon name="arrow_forward" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WorkflowStep({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-surface-container-low p-5">
      <MaterialIcon className="mb-4 text-primary" filled name={icon} />
      <h4 className="font-bold text-on-surface">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{text}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  metric,
  note,
  tone,
  ai
}: {
  icon: string;
  label: string;
  metric: string;
  note: string;
  tone: "primary" | "secondary" | "tertiary";
  ai?: boolean;
}) {
  const toneClass = {
    primary: "text-primary bg-primary-fixed/30",
    secondary: "text-secondary bg-surface-container",
    tertiary: "text-tertiary bg-surface-container"
  }[tone];

  return (
    <Card className={ai ? "rounded-2xl border-2 border-primary/10 p-6" : "rounded-2xl p-6"}>
      <div className="mb-4 flex items-center gap-3">
        <div className={ai ? "ai-gradient-bg flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-md" : `flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
          <MaterialIcon name={icon} />
        </div>
        <span className="text-[13px] font-semibold leading-none tracking-[0.01em] text-on-surface-variant">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className={ai ? "text-3xl font-extrabold text-primary" : "text-3xl font-extrabold"}>{metric}</span>
        <span className={ai ? "rounded-full bg-tertiary-fixed/40 px-2 py-1 text-[10px] font-bold text-tertiary" : "text-sm font-bold text-outline"}>
          {note}
        </span>
      </div>
    </Card>
  );
}
