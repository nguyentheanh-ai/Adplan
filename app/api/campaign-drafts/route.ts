import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const draftSchema = z.object({
  account_id: z.string().optional().nullable(),
  page_id: z.string().optional().nullable(),
  mode: z.enum(["scale_existing", "new_campaign", "ab_test"]).default("new_campaign"),
  name: z.string().trim().min(1),
  status: z.string().default("draft"),
  input_json: z.record(z.string(), z.unknown()).default({}),
  preview_json: z.record(z.string(), z.unknown()).default({}),
  meta_payload_json: z.record(z.string(), z.unknown()).default({})
});

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("campaign_drafts") || message.includes("schema cache");
}

export async function GET(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Ban can dang nhap." }, { status: 401 });

  const url = new URL(request.url);
  const accountId = url.searchParams.get("account_id");
  const admin = createAdminClient();
  let query = admin
    .from("campaign_drafts")
    .select("id,user_id,account_id,page_id,mode,name,status,input_json,preview_json,meta_payload_json,created_at,updated_at")
    .eq("user_id", session.userId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (accountId) query = query.eq("account_id", accountId);

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ data: [], storage: "local" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Ban can dang nhap." }, { status: 401 });

  const body = draftSchema.parse(await request.json());
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("campaign_drafts")
    .insert({
      user_id: session.userId,
      account_id: body.account_id || null,
      page_id: body.page_id || null,
      mode: body.mode,
      name: body.name,
      status: body.status,
      input_json: body.input_json,
      preview_json: body.preview_json,
      meta_payload_json: body.meta_payload_json
    })
    .select("id,user_id,account_id,page_id,mode,name,status,input_json,preview_json,meta_payload_json,created_at,updated_at")
    .single();

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({
        storage: "local",
        data: {
          id: `local-${Date.now()}`,
          user_id: session.userId,
          ...body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
