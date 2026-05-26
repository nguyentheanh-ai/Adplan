import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { MaterialIcon } from "@/components/material-icon";
import { SetupRequired } from "@/components/setup-required";
import { Button } from "@/components/ui/button";
import { adsPlanOutputSchema, type AdsPlanOutput } from "@/lib/ads-plan-schema";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlanActions } from "@/app/plan/[id]/plan-actions";

type PlanPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlanPage({ params }: PlanPageProps) {
  const { id } = await params;

  if (!hasSupabasePublicEnv()) {
    return (
      <AppShell title="Kế hoạch quảng cáo">
        <SetupRequired />
      </AppShell>
    );
  }

  const session = await requireAppSession();
  const admin = createAdminClient();

  const { data } = await admin
    .from("ai_outputs")
    .select("id, ads_plan_json, session_id, projects(business_name), question_sessions(answers_json)")
    .eq("id", id)
    .eq("user_id", session.userId)
    .single();

  if (!data) notFound();
  const parsed = adsPlanOutputSchema.safeParse(data.ads_plan_json);
  if (!parsed.success) notFound();

  const project = Array.isArray(data.projects) ? data.projects[0] : data.projects;
  const sessionRelation = data.question_sessions as unknown as { answers_json?: unknown } | Array<{ answers_json?: unknown }> | null;
  const answers = Array.isArray(sessionRelation) ? sessionRelation[0]?.answers_json : sessionRelation?.answers_json;

  return <PlanView answers={answers} outputId={id} plan={parsed.data} projectName={project?.business_name || "Dự án quảng cáo"} />;
}

function PlanView({
  outputId,
  plan,
  answers,
  projectName
}: {
  outputId: string;
  plan: AdsPlanOutput;
  answers: unknown;
  projectName: string;
}) {
  const campaigns = plan.campaign_plan.campaigns;
  const adsets = campaigns.flatMap((campaign) =>
    campaign.adsets.map((adset) => ({
      campaign: campaign.campaign_name,
      objective: campaign.objective,
      purpose: campaign.purpose,
      ...adset
    }))
  );

  return (
    <AppShell contentClassName="px-gutter pb-12 pt-24">
      <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <nav className="mb-2 flex items-center gap-2 text-sm text-on-surface-variant">
            <span>Dự án: {projectName}</span>
            <MaterialIcon className="text-[14px]" name="chevron_right" />
            <span className="font-medium text-primary">Kế hoạch Facebook Ads</span>
          </nav>
          <h2 className="flex items-center gap-3 text-[24px] font-semibold leading-[1.4] text-on-background">
            Chiến dịch: {plan.business_summary.main_goal || "Testing nhu cầu"}
            <span className="rounded-full bg-primary-fixed px-3 py-1 text-[12px] font-bold text-on-primary-fixed">DRAFT</span>
          </h2>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            Kết quả phân tích từ AI dựa trên dữ liệu sản phẩm và thị trường mục tiêu của bạn. Kế hoạch này tối ưu cho giai đoạn test 7 ngày đầu tiên.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PlanActions answers={answers} outputId={outputId} plan={plan} compact />
        </div>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-4">
        <Metric
          label="Cấu trúc đề xuất"
          value={`${plan.campaign_plan.recommended_campaign_count}`}
          suffix="Camp"
          second={`${plan.campaign_plan.recommended_adset_count} Ad Sets`}
        />
        <Metric label="Mẫu quảng cáo" value={`${plan.campaign_plan.recommended_creative_count}`} suffix="Creatives" tone="secondary" />
        <Metric label="Tổng ngân sách/ngày" value={plan.business_summary.budget || "Chưa rõ"} />
        <Metric label="KPI dự kiến (CPA)" value="~45,000" suffix="VND" gradient />
      </div>

      <div className="space-y-6">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px flex-1 bg-outline-variant" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-outline">Chi tiết các nhóm quảng cáo</h3>
          <span className="h-px flex-1 bg-outline-variant" />
        </div>

        {adsets.map((adset, index) => (
          <div key={`${adset.campaign}-${adset.adset_name}`} className="relative rounded-xl border border-outline-variant/60 bg-white p-6 md:p-8">
            <div className="absolute -left-3 top-6 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{index + 1}</div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="border-outline-variant/50 lg:col-span-4 lg:border-r lg:pr-8">
                <div className="mb-4 flex items-center gap-3">
                  <MaterialIcon
                    filled
                    className={index % 3 === 0 ? "text-primary" : index % 3 === 1 ? "text-secondary" : "text-tertiary"}
                    name={index % 3 === 0 ? "ac_unit" : index % 3 === 1 ? "favorite" : "autorenew"}
                  />
                  <h4 className="text-xl font-bold">{adset.adset_name}</h4>
                </div>
                <div className="space-y-4">
                  <Info label="Ngân sách" value={adset.budget} />
                  <div>
                    <Label>Targeting idea</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[adset.audience, adset.location].filter(Boolean).map((item) => (
                        <span key={item} className="rounded-lg bg-surface-container-high px-3 py-1 text-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-sm italic text-on-surface-variant">{adset.purpose}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-8 md:flex-row lg:col-span-8">
                <div className="flex-1">
                  <Label>Creative angle</Label>
                  <div className="mt-3 rounded-xl bg-surface-container-low p-4">
                    <ul className="space-y-2 font-medium leading-relaxed text-on-surface">
                      {adset.creative_angles.map((angle) => (
                        <li key={angle} className="flex gap-2">
                          <MaterialIcon className="mt-1 text-[18px] text-primary" name="auto_awesome" />
                          {angle}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex-1">
                  <Label>Copy suggestion</Label>
                  <div className="mt-3 rounded-xl border border-primary/10 bg-primary/5 p-4">
                    <p className="text-sm leading-relaxed text-on-surface">{adset.sample_copy[0] || "Chưa có mẫu nội dung."}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-dashed border-primary/30 p-8 text-center">
        <MaterialIcon className="mb-4 text-4xl text-primary" name="rocket_launch" />
        <h3 className="mb-2 text-2xl font-bold">Sẵn sàng để triển khai?</h3>
        <p className="mx-auto mb-6 max-w-lg text-on-surface-variant">
          Bước tiếp theo sẽ gửi kế hoạch đã duyệt sang n8n để chuẩn bị workflow kết nối Meta Marketing API.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/ads-facebook">
            <Button variant="ai">
              <MaterialIcon name="hub" />
              Mở Meta API
            </Button>
          </Link>
          <Link href="/ads-facebook">
            <Button variant="secondary">Về dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SummaryBlock title="Phân bổ ngân sách" items={plan.campaign_plan.budget_split.map((item) => `${item.stage}: ${item.percentage}% - ${item.reason}`)} />
        <SummaryBlock title="Cảnh báo rủi ro" danger items={plan.warnings} />
      </div>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  suffix,
  second,
  tone = "primary",
  gradient
}: {
  label: string;
  value: string;
  suffix?: string;
  second?: string;
  tone?: "primary" | "secondary";
  gradient?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-outline-variant/60 bg-white p-6">
      <span className="mb-1 text-sm font-medium text-on-surface-variant">{label}</span>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <span
          className={
            gradient
              ? "ai-gradient-text min-w-0 break-words text-[26px] font-bold leading-tight"
              : tone === "secondary"
                ? "min-w-0 break-words text-[26px] font-bold leading-tight text-secondary"
                : "min-w-0 break-words text-[26px] font-bold leading-tight text-primary"
          }
        >
          {value}
        </span>
        {suffix ? <span className="text-sm font-bold text-on-surface-variant">{suffix}</span> : null}
        {second ? <span className="ml-2 text-sm font-bold text-on-surface-variant">{second}</span> : null}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[12px] font-bold uppercase text-outline">{children}</label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="text-lg font-bold text-on-surface">{value || "Chưa rõ"}</p>
    </div>
  );
}

function SummaryBlock({ title, items, danger }: { title: string; items: string[]; danger?: boolean }) {
  return (
    <div className={danger ? "rounded-xl border border-error/20 bg-error-container/20 p-6" : "rounded-xl border border-outline-variant/60 bg-white p-6"}>
      <h4 className={danger ? "mb-4 flex items-center gap-2 font-bold text-error" : "mb-4 flex items-center gap-2 font-bold text-primary"}>
        <MaterialIcon filled name={danger ? "warning" : "analytics"} />
        {title}
      </h4>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item} className="rounded-lg bg-white/70 p-3 text-sm leading-6 text-on-surface">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
