import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, MiniPersonaLink } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

type HistoryRow = {
  id: string;
  created_at: string;
  projects: unknown;
};

export default async function HistoryPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_outputs")
    .select("id, created_at, projects(business_name, industry)")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const rows = (data ?? []) as HistoryRow[];

  return (
    <AppShell title="Lịch sử" description="Các bản phân tích persona và kế hoạch quảng cáo đã tạo bằng AI.">
      <Card className="overflow-hidden rounded-3xl p-0">
        {rows.length ? (
          <div className="divide-y divide-outline-variant/70">
            {rows.map((row) => {
              const project = Array.isArray(row.projects) ? row.projects[0] : (row.projects as { business_name?: string; industry?: string } | null);
              return (
                <div key={row.id} className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <Link href={`/plan/${row.id}`} className="text-lg font-extrabold text-on-surface hover:text-primary">
                      {project?.business_name || "Kế hoạch quảng cáo"}
                    </Link>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {project?.industry || "Chưa rõ ngành"} · {formatDate(row.created_at)}
                    </p>
                    <div className="mt-2">
                      <MiniPersonaLink id={row.id} />
                    </div>
                  </div>
                  <Link href={`/plan/${row.id}`} className="text-sm font-bold text-primary hover:underline">
                    Xem kế hoạch
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title="Chưa có lịch sử tư vấn"
              description="Khi bạn tạo kế hoạch AI đầu tiên, lịch sử sẽ xuất hiện tại đây."
              href="/ask"
              action="Bắt đầu đặt câu hỏi"
            />
          </div>
        )}
      </Card>
    </AppShell>
  );
}
