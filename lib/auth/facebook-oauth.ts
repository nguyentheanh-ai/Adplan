import { createAdminClient } from "@/lib/supabase/admin";
import { REQUIRED_FACEBOOK_SCOPES } from "@/lib/auth/facebook-scopes";

const facebookApiVersion = process.env.META_API_VERSION || "v23.0";
const facebookScopes = REQUIRED_FACEBOOK_SCOPES.join(",");
export { REQUIRED_FACEBOOK_SCOPES };

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://adsplan.theanhmarketing.com").replace(/\/$/, "");
}

export function getFacebookCallbackUrl() {
  return `${getSiteUrl()}/api/auth/facebook/callback`;
}

function getFacebookAppConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Thiếu META_APP_ID hoặc META_APP_SECRET.");
  }

  return { appId, appSecret };
}

export function buildFacebookOAuthUrl(state: string, options?: { forceRerequest?: boolean }) {
  const { appId } = getFacebookAppConfig();
  const url = new URL(`https://www.facebook.com/${facebookApiVersion}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", getFacebookCallbackUrl());
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", facebookScopes);
  url.searchParams.set("return_scopes", "true");
  if (options?.forceRerequest) {
    url.searchParams.set("auth_type", "rerequest");
  }
  return url.toString();
}

export async function exchangeFacebookCode(code: string) {
  const { appId, appSecret } = getFacebookAppConfig();
  const tokenUrl = new URL(`https://graph.facebook.com/${facebookApiVersion}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("redirect_uri", getFacebookCallbackUrl());
  tokenUrl.searchParams.set("code", code);

  const shortLived = await fetchJson<{ access_token: string; expires_in?: number }>(tokenUrl);

  const longLivedUrl = new URL(`https://graph.facebook.com/${facebookApiVersion}/oauth/access_token`);
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", appId);
  longLivedUrl.searchParams.set("client_secret", appSecret);
  longLivedUrl.searchParams.set("fb_exchange_token", shortLived.access_token);

  try {
    const longLived = await fetchJson<{ access_token: string; expires_in?: number }>(longLivedUrl);
    return {
      accessToken: longLived.access_token,
      expiresIn: longLived.expires_in ?? shortLived.expires_in ?? 60 * 60 * 24 * 60
    };
  } catch {
    return {
      accessToken: shortLived.access_token,
      expiresIn: shortLived.expires_in ?? 60 * 60 * 2
    };
  }
}

export async function getFacebookProfile(accessToken: string) {
  const url = new URL(`https://graph.facebook.com/${facebookApiVersion}/me`);
  url.searchParams.set("fields", "id,name,link");
  url.searchParams.set("access_token", accessToken);
  return fetchJson<{ id: string; name?: string; link?: string }>(url);
}

export async function getFacebookGrantedPermissions(accessToken: string) {
  const url = new URL(`https://graph.facebook.com/${facebookApiVersion}/me/permissions`);
  url.searchParams.set("access_token", accessToken);
  const payload = await fetchJson<{ data?: Array<{ permission: string; status: string }> }>(url);
  return new Set((payload.data ?? []).filter((item) => item.status === "granted").map((item) => item.permission));
}

export function findMissingFacebookScopes(grantedScopes: Set<string>) {
  return REQUIRED_FACEBOOK_SCOPES.filter((scope) => !grantedScopes.has(scope));
}

export async function ensureFacebookSupabaseProfile(profile: { id: string; name?: string }) {
  const admin = createAdminClient();
  const email = `facebook_${profile.id}@adsplan.local`;

  const existingProfile = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existingProfile.data?.id) return existingProfile.data.id;

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: profile.name ?? "",
      provider: "facebook",
      facebook_id: profile.id
    }
  });

  let userId = created.data.user?.id;
  if (!userId && created.error?.message.toLowerCase().includes("already")) {
    userId = await findAuthUserIdByEmail(email);
  }

  if (!userId) {
    throw new Error(created.error?.message ?? "Không thể tạo user Supabase cho Facebook.");
  }

  await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: profile.name ?? ""
  });

  return userId;
}

async function findAuthUserIdByEmail(email: string) {
  const admin = createAdminClient();
  for (let page = 1; page <= 10; page += 1) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const user = data.users.find((item) => item.email === email);
    if (user) return user.id;
    if (data.users.length < 1000) break;
  }

  return undefined;
}

async function fetchJson<T>(url: URL) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Không thể gọi Facebook OAuth API.");
  }

  return payload as T;
}
