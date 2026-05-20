import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { requireAppSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

type HistoryRow = {
  id: string;
  created_at: string;
  projects:
    | { business_name?: string | null; industry?: string | null }
    | Array<{ business_name?: string | null; industry?: string | null }>
    | null;
};

export default async function HistoryPage() {
  const session = await requireAppSession();
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
      <Card className="overflow-hidden rounded-xl p-0">
        {rows.length ? (
          <div className="divide-y divide-outline-variant/70">
            {rows.map((row) => {
              const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
              return (
                <div key={row.id} className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <Link href={`/plan/${row.id}`} className="text-lg font-extrabold text-on-surface hover:text-primary">
                      {project?.business_name || "Kế hoạch quảng cáo"}
                    </Link>
                    <p className="text-sm text-on-surface-variant">{project?.industry || "Chưa có ngành hàng"}</p>
                  </div>
                  <div className="text-sm text-on-surface-variant">
                    {new Date(row.created_at).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-sm text-on-surface-variant">Bạn chưa có phiên phân tích nào.</div>
        )}
      </Card>
    </AppShell>
  );
}
