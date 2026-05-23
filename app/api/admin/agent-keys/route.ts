import { NextResponse } from "next/server";
import { listAgentIngestKeysForAdmin, requireAgentKeyOwnerSession, revokeAgentIngestKey, sanitizeAgentKeyRecord } from "@/lib/agent-keys";
import { requireAdminRole } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminRole();
    const admin = createAdminClient();
    const keys = await listAgentIngestKeysForAdmin();
    const userIds = Array.from(new Set(keys.map((item) => item.user_id)));
    const { data: profiles, error: profilesError } = userIds.length
      ? await admin.from("profiles").select("id,email,full_name").in("id", userIds)
      : { data: [], error: null };
    if (profilesError) throw new Error(profilesError.message);
    const profileMap = new Map((profiles ?? []).map((item) => [item.id, item]));
    const { data: logs, error } = await admin
      .from("agent_ingest_logs")
      .select("id,user_id,agent_key_id,action,page_id,title,status,post_id,error_message,created_at")
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      data: {
        keys: keys.map((item) => ({
          ...sanitizeAgentKeyRecord(item),
          facebook_name: profileMap.get(item.user_id)?.full_name || null,
          facebook_email: profileMap.get(item.user_id)?.email || null
        })),
        logs: logs ?? []
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được dashboard Agent key." }, { status: 403 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminRole();
    const session = await requireAgentKeyOwnerSession();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Thiếu id mã Agent." }, { status: 400 });
    const data = await revokeAgentIngestKey({ id, userId: session.userId, asAdmin: true });
    if (!data) return NextResponse.json({ error: "Không tìm thấy mã Agent." }, { status: 404 });
    return NextResponse.json({ data: sanitizeAgentKeyRecord(data) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thu hồi được mã Agent." }, { status: 400 });
  }
}
