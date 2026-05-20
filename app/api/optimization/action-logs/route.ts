import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("schema cache") || message.includes("optimization_action_logs");
}

export async function GET(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  const url = new URL(request.url);
  const adAccountId = url.searchParams.get("ad_account_id");
  const limit = Math.min(Number(url.searchParams.get("limit") || 30), 100);

  const admin = createAdminClient();
  let query = admin
    .from("optimization_action_logs")
    .select("*")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(Number.isFinite(limit) && limit > 0 ? limit : 30);

  if (adAccountId) query = query.eq("ad_account_id", adAccountId);

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ data: [], storage: "missing_schema" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
