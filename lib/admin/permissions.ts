import "server-only";
import { getAppSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUserPermission, UserRole } from "@/lib/meta/types";

const defaultLockedSections = ["admin", "meta_api"];
const fixedAdminFacebookUsernames = new Set(["theanh.marketing"]);
const fixedAdminFacebookIds = new Set(["622569270580836"]);
const fixedAdminUserIds = new Set(["48972846-facd-4170-9c40-95fb4fafd4d3"]);
const permissionFields =
  "id,user_id,facebook_id,facebook_user_id,facebook_name,facebook_email,role,permissions,ad_account_ids,page_ids,locked_sections,created_at,updated_at";

function parseAdminUserIds() {
  const raw = process.env.ADMIN_USER_IDS || "";
  return new Set(
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function parseAdminFacebookIds() {
  const raw = process.env.ADMIN_FACEBOOK_IDS || "";
  return new Set(
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function parseAdminFacebookProfileUrls() {
  const raw = process.env.ADMIN_FACEBOOK_PROFILE_URLS || "";
  return new Set(
    raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .map((item) => item.replace(/\/$/, ""))
  );
}

function parseAdminFacebookUsernames() {
  const raw = process.env.ADMIN_FACEBOOK_USERNAMES || "";
  return new Set(
    raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isMissingTableError(message?: string) {
  const lower = (message || "").toLowerCase();
  return lower.includes("could not find the table") || lower.includes("schema cache") || lower.includes("admin_user_permissions");
}

function buildOwnerPermission(userId: string, facebookId: string): AdminUserPermission {
  return {
    id: "env-admin",
    user_id: userId,
    facebook_id: facebookId,
    role: "owner" as UserRole,
    locked_sections: [],
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString()
  };
}

function buildMemberPermission(userId: string, facebookId: string): AdminUserPermission {
  return {
    id: "default-member",
    user_id: userId,
    facebook_id: facebookId,
    role: "member" as UserRole,
    locked_sections: defaultLockedSections,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString()
  };
}

function isConfiguredAdmin(session: { userId: string; facebookId: string; profileUrl?: string }) {
  const adminUserIds = parseAdminUserIds();
  const adminFacebookIds = parseAdminFacebookIds();
  const adminProfileUrls = parseAdminFacebookProfileUrls();
  const adminUsernames = parseAdminFacebookUsernames();
  const normalizedProfileUrl = (session.profileUrl || "").trim().toLowerCase().replace(/\/$/, "");
  const matchedByUsername =
    normalizedProfileUrl &&
    (Array.from(adminUsernames).some((username) => normalizedProfileUrl.includes(`/${username}`)) ||
      Array.from(fixedAdminFacebookUsernames).some((username) => normalizedProfileUrl.includes(`/${username}`)));

  return (
    fixedAdminUserIds.has(session.userId) ||
    adminUserIds.has(session.userId) ||
    fixedAdminFacebookIds.has(session.facebookId) ||
    adminFacebookIds.has(session.facebookId) ||
    (normalizedProfileUrl && adminProfileUrls.has(normalizedProfileUrl)) ||
    matchedByUsername
  );
}

async function assignOwnerPermission(userId: string, facebookId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_user_permissions")
    .upsert(
      {
        user_id: userId,
        facebook_id: facebookId,
        facebook_user_id: facebookId,
        role: "owner",
        locked_sections: [],
        permissions: { all: true },
        ad_account_ids: [],
        page_ids: []
      },
      { onConflict: "user_id" }
    )
    .select(permissionFields)
    .single<AdminUserPermission>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getCurrentPermission() {
  const session = await getAppSession();
  if (!session) return null;

  const admin = createAdminClient();
  const permissionByUser = await admin
    .from("admin_user_permissions")
    .select(permissionFields)
    .eq("user_id", session.userId)
    .maybeSingle<AdminUserPermission>();

  const configuredAdmin = isConfiguredAdmin(session);

  if (permissionByUser.error && isMissingTableError(permissionByUser.error.message)) {
    return configuredAdmin ? buildOwnerPermission(session.userId, session.facebookId) : buildMemberPermission(session.userId, session.facebookId);
  }

  if (permissionByUser.data) {
    const current = permissionByUser.data;
    if (configuredAdmin && current.role !== "owner" && current.role !== "manager") {
      try {
        return await assignOwnerPermission(session.userId, session.facebookId);
      } catch {
        return { ...current, role: "owner" as UserRole, locked_sections: [] };
      }
    }
    return current;
  }

  if (session.facebookId) {
    const byFacebook = await admin
      .from("admin_user_permissions")
      .select(permissionFields)
      .or(`facebook_id.eq.${session.facebookId},facebook_user_id.eq.${session.facebookId}`)
      .maybeSingle<AdminUserPermission>();

    if (byFacebook.data) {
      if (byFacebook.data.user_id !== session.userId) {
        const { data: reassigned } = await admin
          .from("admin_user_permissions")
          .update({ user_id: session.userId })
          .eq("id", byFacebook.data.id)
          .select(permissionFields)
          .maybeSingle<AdminUserPermission>();

        return reassigned ?? { ...byFacebook.data, user_id: session.userId };
      }
      return byFacebook.data;
    }
  }

  if (configuredAdmin) {
    try {
      return await assignOwnerPermission(session.userId, session.facebookId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (isMissingTableError(message)) {
        return buildOwnerPermission(session.userId, session.facebookId);
      }
      return buildOwnerPermission(session.userId, session.facebookId);
    }
  }

  return buildMemberPermission(session.userId, session.facebookId);
}

export async function requireAdminRole() {
  const permission = await getCurrentPermission();
  if (!permission || (permission.role !== "owner" && permission.role !== "manager")) {
    throw new Error("Bạn không có quyền truy cập khu vực quản trị.");
  }
  return permission;
}

export function canAccessSection(permission: AdminUserPermission | null, section: string) {
  if (!permission) return false;
  if (permission.role === "owner" || permission.role === "manager") return true;
  return !permission.locked_sections.includes(section);
}

export async function canCurrentUserAccessSection(section: string) {
  const permission = await getCurrentPermission();
  return canAccessSection(permission, section);
}
