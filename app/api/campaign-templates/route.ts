import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CampaignBuilderInput } from "@/lib/meta/types";

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("campaign_templates") || message.includes("schema cache");
}

export async function GET(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });

  const url = new URL(request.url);
  const accountId = url.searchParams.get("account_id");
  const admin = createAdminClient();
  let query = admin
    .from("campaign_templates")
    .select("id,user_id,account_id,name,objective,payload,created_at,updated_at")
    .eq("user_id", session.userId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (accountId) {
    query = query.or(`account_id.eq.${accountId},account_id.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ data: [], storage: "local" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    account_id?: string | null;
    objective?: string;
    payload?: CampaignBuilderInput;
  };

  if (!body.name?.trim() || !body.objective || !body.payload) {
    return NextResponse.json({ error: "Thiếu dữ liệu template." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("campaign_templates")
    .upsert(
      {
        id: body.id,
        user_id: session.userId,
        account_id: body.account_id || null,
        name: body.name.trim(),
        objective: body.objective,
        payload: body.payload
      },
      { onConflict: "id" }
    )
    .select("id,user_id,account_id,name,objective,payload,created_at,updated_at")
    .single();

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({
        data: {
          id: `local-${Date.now()}`,
          user_id: session.userId,
          account_id: body.account_id || null,
          name: body.name.trim(),
          objective: body.objective,
          payload: body.payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        storage: "local"
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}
