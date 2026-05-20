import "server-only";
import { getAppSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUserPermission, UserRole } from "@/lib/meta/types";

const defaultLockedSections = ["admin", "meta_api"];
const fixedAdminFacebookUsernames = new Set(["theanh.marketing"]);

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

export async function getCurrentPermission() {
  const session = await getAppSession();
  if (!session) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_user_permissions")
    .select("id,user_id,facebook_id,role,locked_sections,created_at,updated_at")
    .eq("user_id", session.userId)
    .maybeSingle<AdminUserPermission>();

  if (data) return data;

  const adminFacebookIds = parseAdminFacebookIds();
  const adminProfileUrls = parseAdminFacebookProfileUrls();
  const adminUsernames = parseAdminFacebookUsernames();
  const normalizedProfileUrl = (session.profileUrl || "").trim().toLowerCase().replace(/\/$/, "");
  const matchedByUsername =
    normalizedProfileUrl &&
    (Array.from(adminUsernames).some((username) => normalizedProfileUrl.includes(`/` + username)) ||
      Array.from(fixedAdminFacebookUsernames).some((username) => normalizedProfileUrl.includes(`/` + username)));

  if (adminFacebookIds.has(session.facebookId) || (normalizedProfileUrl && adminProfileUrls.has(normalizedProfileUrl)) || matchedByUsername) {
    return {
      id: "env-admin",
      user_id: session.userId,
      facebook_id: session.facebookId,
      role: "owner" as UserRole,
      locked_sections: [],
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString()
    };
  }

  return {
    id: "default-member",
    user_id: session.userId,
    facebook_id: session.facebookId,
    role: "member" as UserRole,
    locked_sections: defaultLockedSections,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString()
  };
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
