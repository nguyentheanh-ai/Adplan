import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUserPermission, UserRole } from "@/lib/meta/types";

export const dynamic = "force-dynamic";

type AdminUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  facebook_id: string | null;
  created_at: string;
  permission: AdminUserPermission | null;
};

function isMissingTableError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("could not find the table") || lower.includes("schema cache") || lower.includes("admin_user_permissions");
}

async function listFacebookAuthUsers() {
  const admin = createAdminClient();
  const users: Array<{
    id: string;
    email: string;
    full_name: string | null;
    facebook_id: string | null;
    created_at: string;
  }> = [];

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
    if (error) throw new Error(error.message);

    for (const user of data.users) {
      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const provider = typeof metadata.provider === "string" ? metadata.provider : "";
      const facebookId = typeof metadata.facebook_id === "string" ? metadata.facebook_id : null;
      const fullName = typeof metadata.full_name === "string" ? metadata.full_name : null;
      const email = user.email ?? "";
      const isFacebookUser = provider === "facebook" || Boolean(facebookId) || email.startsWith("facebook_");
      if (!isFacebookUser) continue;

      users.push({
        id: user.id,
        email,
        full_name: fullName,
        facebook_id: facebookId,
        created_at: user.created_at ?? new Date().toISOString()
      });
    }

    if (data.users.length < 500) break;
  }

  return users.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export async function GET() {
  try {
    await requireAdminRole();
    const admin = createAdminClient();
    const users = await listFacebookAuthUsers();

    const permissionsResult = await admin
      .from("admin_user_permissions")
      .select("id,user_id,facebook_id,facebook_user_id,facebook_name,facebook_email,role,permissions,ad_account_ids,page_ids,locked_sections,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(1000);

    let warning = "";
    if (permissionsResult.error) {
      if (isMissingTableError(permissionsResult.error.message)) {
        warning =
          "He thong chua co bang admin_user_permissions. Van hien user Facebook, nhung chua luu duoc phan quyen. Vui long cap nhat schema Supabase.";
      } else {
        return NextResponse.json({ error: permissionsResult.error.message }, { status: 500 });
      }
    }

    const permissionMap = new Map<string, AdminUserPermission>();
    for (const item of (permissionsResult.data ?? []) as AdminUserPermission[]) {
      permissionMap.set(item.user_id, item);
      if (item.facebook_user_id) permissionMap.set(`fb:${item.facebook_user_id}`, item);
      if (item.facebook_id) permissionMap.set(`fb:${item.facebook_id}`, item);
    }

    const rows: AdminUserRow[] = users.map((user) => ({
      ...user,
      permission: permissionMap.get(user.id) ?? (user.facebook_id ? permissionMap.get(`fb:${user.facebook_id}`) : null) ?? null
    }));

    return NextResponse.json({ data: rows, warning });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Khong the tai danh sach user." }, { status: 403 });
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
      permissions?: Record<string, unknown>;
      ad_account_ids?: string[];
      page_ids?: string[];
    };

    if (!body.user_id || !body.role) {
      return NextResponse.json({ error: "Thieu user_id hoac role." }, { status: 400 });
    }

    const admin = createAdminClient();
    const payload = {
      user_id: body.user_id,
      facebook_id: body.facebook_id || null,
      facebook_user_id: body.facebook_id || null,
      role: body.role,
      locked_sections: body.locked_sections ?? [],
      permissions: body.permissions ?? {},
      ad_account_ids: body.ad_account_ids ?? [],
      page_ids: body.page_ids ?? []
    };

    const { data, error } = await admin
      .from("admin_user_permissions")
      .upsert(payload, { onConflict: "user_id" })
      .select("id,user_id,facebook_id,facebook_user_id,facebook_name,facebook_email,role,permissions,ad_account_ids,page_ids,locked_sections,created_at,updated_at")
      .single();

    if (error) {
      if (isMissingTableError(error.message)) {
        return NextResponse.json(
          {
            error:
              "Chua co bang admin_user_permissions trong Supabase. Vui long chay file schema SQL roi cap quyen lai."
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Khong the cap nhat quyen." }, { status: 403 });
  }
}
