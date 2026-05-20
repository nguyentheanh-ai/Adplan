import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUserPermission, UserRole } from "@/lib/meta/types";

export async function GET() {
  try {
    await requireAdminRole();
    const admin = createAdminClient();

    const [profilesResult, permissionsResult] = await Promise.all([
      admin.from("profiles").select("id,email,full_name,created_at").order("created_at", { ascending: false }).limit(200),
      admin
        .from("admin_user_permissions")
        .select("id,user_id,facebook_id,role,locked_sections,created_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(200)
    ]);

    if (profilesResult.error) {
      return NextResponse.json({ error: profilesResult.error.message }, { status: 500 });
    }
    if (permissionsResult.error) {
      return NextResponse.json({ error: permissionsResult.error.message }, { status: 500 });
    }

    const permissionMap = new Map<string, AdminUserPermission>();
    for (const item of (permissionsResult.data ?? []) as AdminUserPermission[]) {
      permissionMap.set(item.user_id, item);
    }

    const rows = (profilesResult.data ?? []).map((profile) => ({
      ...profile,
      permission: permissionMap.get(profile.id) ?? null
    }));

    return NextResponse.json({ data: rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tải danh sách user." }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminRole();
    const body = (await request.json().catch(() => ({}))) as {
      user_id?: string;
      facebook_id?: string;
      role?: UserRole;
      locked_sections?: string[];
    };

    if (!body.user_id || !body.role) {
      return NextResponse.json({ error: "Thiếu user_id hoặc role." }, { status: 400 });
    }

    const admin = createAdminClient();
    const payload = {
      user_id: body.user_id,
      facebook_id: body.facebook_id || null,
      role: body.role,
      locked_sections: body.locked_sections ?? []
    };

    const { data, error } = await admin
      .from("admin_user_permissions")
      .upsert(payload, { onConflict: "user_id" })
      .select("id,user_id,facebook_id,role,locked_sections,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể cập nhật quyền." }, { status: 403 });
  }
}
