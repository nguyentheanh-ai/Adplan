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

type PersonaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PersonaPage({ params }: PersonaPageProps) {
  const { id } = await params;

  if (!hasSupabasePublicEnv()) {
    return (
      <AppShell title="Chân dung khách hàng">
        <SetupRequired />
      </AppShell>
    );
  }

  const session = await requireAppSession();
  const admin = createAdminClient();

  const { data } = await admin
    .from("ai_outputs")
    .select("id, ads_plan_json, projects(business_name)")
    .eq("id", id)
    .eq("user_id", session.userId)
    .single();

  if (!data) notFound();
  const parsed = adsPlanOutputSchema.safeParse(data.ads_plan_json);
  if (!parsed.success) notFound();

  const project = Array.isArray(data.projects) ? data.projects[0] : data.projects;
  return <PersonaView id={id} persona={parsed.data.customer_persona} projectName={project?.business_name || "kế hoạch quảng cáo"} />;
}

function PersonaView({
  id,
  persona,
  projectName
}: {
  id: string;
  persona: AdsPlanOutput["customer_persona"];
  projectName: string;
}) {
  return (
    <AppShell contentClassName="px-gutter pb-12 pt-24">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="mb-1 text-[24px] font-semibold leading-[1.4] text-primary">Phân tích chân dung khách hàng</h2>
          <p className="text-on-surface-variant">Dựa trên dữ liệu AI và câu trả lời từ dự án {projectName}</p>
        </div>
        <Link href={`/plan/${id}`}>
          <Button variant="secondary">
            <MaterialIcon name="ads_click" />
            Xem kế hoạch
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 lg:col-span-4">
          <div className="rounded-xl bg-white p-8 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary-fixed bg-white text-3xl font-extrabold text-primary">
              KH
            </div>
            <h3 className="mb-1 text-xl font-bold">{persona.primary_customer || "Khách hàng mục tiêu"}</h3>
            <p className="mb-4 font-bold text-secondary">{persona.customer_insight || "Đang cập nhật insight"}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-primary-fixed/30 px-3 py-1 text-xs font-bold text-primary">Persona chính</span>
              <span className="rounded-full bg-tertiary-fixed/30 px-3 py-1 text-xs font-bold text-tertiary">{persona.location || "Việt Nam"}</span>
            </div>
          </div>

          <div className="rounded-xl bg-surface-container-highest p-6">
            <h4 className="mb-4 flex items-center gap-2 font-bold">
              <MaterialIcon className="text-primary" name="interests" />
              Hành vi nổi bật
            </h4>
            <ul className="space-y-3">
              {persona.buying_triggers.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-span-12 space-y-6 lg:col-span-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <InsightCard icon="warning" title="Nỗi đau chính (Pain points)" tone="error" items={persona.pain_points} />
            <InsightCard icon="shopping_cart_checkout" title="Insight mua hàng" tone="tertiary" items={persona.buying_triggers} />
          </div>

          <div className="rounded-xl bg-primary-container p-8 text-on-primary">
            <h4 className="mb-6 flex items-center gap-2 text-xl font-bold">
              <MaterialIcon name="campaign" />
              Góc nội dung quảng cáo đề xuất
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {persona.objections.map((item, index) => (
                <div key={item} className="rounded-xl border border-white/20 bg-white/10 p-5">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-white font-bold text-primary">{index + 1}</div>
                  <p className="text-xs leading-relaxed opacity-90">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center justify-between rounded-xl border border-outline-variant bg-surface-container-low p-6 sm:flex-row">
            <div className="mb-4 sm:mb-0">
              <p className="font-bold text-on-surface">Bạn đã sẵn sàng cho bước tiếp theo?</p>
              <p className="text-sm text-on-surface-variant">AI đã chuẩn bị lộ trình phân bổ ngân sách cho chân dung này.</p>
            </div>
            <Link href={`/plan/${id}`}>
              <Button variant="primary">
                Tiếp tục tạo kế hoạch quảng cáo
                <MaterialIcon name="arrow_forward" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function InsightCard({
  icon,
  title,
  tone,
  items
}: {
  icon: string;
  title: string;
  tone: "error" | "tertiary";
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-transparent bg-white p-6 shadow-sm">
      <div
        className={
          tone === "error"
            ? "mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-error-container text-error"
            : "mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-tertiary-container text-white"
        }
      >
        <MaterialIcon name={icon} />
      </div>
      <h4 className="mb-4 text-lg font-bold">{title}</h4>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item} className={tone === "error" ? "rounded-lg bg-error-container/20 p-3" : "rounded-lg bg-tertiary-container/10 p-3"}>
            <p className={tone === "error" ? "text-sm font-bold text-error" : "text-sm font-bold text-tertiary"}>{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
