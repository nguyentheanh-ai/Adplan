import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("saved_audiences") || message.includes("schema cache");
}

export async function GET(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });

  const url = new URL(request.url);
  const accountId = url.searchParams.get("account_id");
  const admin = createAdminClient();
  let query = admin
    .from("saved_audiences")
    .select("id,user_id,account_id,code,name,payload,created_at,updated_at")
    .eq("user_id", session.userId)
    .order("updated_at", { ascending: false })
    .limit(200);

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
    account_id?: string | null;
    code?: string;
    name?: string;
    payload?: {
      ageRange?: string;
      gender?: string;
      locations?: string;
      interests?: string;
      behaviors?: string;
    };
  };

  if (!body.code?.trim() || !body.name?.trim() || !body.payload) {
    return NextResponse.json({ error: "Thiếu dữ liệu tệp khách hàng." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("saved_audiences")
    .upsert(
      {
        id: body.id,
        user_id: session.userId,
        account_id: body.account_id || null,
        code: body.code.trim(),
        name: body.name.trim(),
        payload: body.payload
      },
      { onConflict: "id" }
    )
    .select("id,user_id,account_id,code,name,payload,created_at,updated_at")
    .single();

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({
        data: {
          id: `local-${Date.now()}`,
          user_id: session.userId,
          account_id: body.account_id || null,
          code: body.code.trim(),
          name: body.name.trim(),
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
