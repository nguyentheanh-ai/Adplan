import crypto from "crypto";
import { createAdminClient } from "./supabase/admin";

const TOKEN_VERSION = "v1";

type StoredProviderTokenRow = {
  user_id: string;
  facebook_user_id?: string | null;
  access_token_encrypted: string;
  token_expires_at?: string | null;
  granted_scopes?: string[] | null;
  created_at?: string;
  updated_at?: string;
};

export function isMissingFacebookProviderTokensTableError(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("facebook_provider_tokens") || message.includes("schema cache");
}

function getVaultKey() {
  const secret = process.env.META_APP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Thiếu META_APP_SECRET hoặc SUPABASE_SERVICE_ROLE_KEY để mã hóa token Facebook.");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptStoredFacebookToken(accessToken: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getVaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(accessToken, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${TOKEN_VERSION}.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptStoredFacebookToken(payload: string) {
  const [version, ivRaw, tagRaw, encryptedRaw] = payload.split(".");
  if (version !== TOKEN_VERSION || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Không giải mã được token Facebook đã lưu.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getVaultKey(),
    Buffer.from(ivRaw, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

export async function saveFacebookProviderToken(input: {
  userId: string;
  facebookUserId: string;
  accessToken: string;
  expiresAt: string;
  grantedScopes: string[];
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("facebook_provider_tokens").upsert(
    {
      user_id: input.userId,
      facebook_user_id: input.facebookUserId,
      access_token_encrypted: encryptStoredFacebookToken(input.accessToken),
      token_expires_at: input.expiresAt,
      granted_scopes: input.grantedScopes
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}

export async function getStoredFacebookProviderToken(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("facebook_provider_tokens")
    .select("user_id,facebook_user_id,access_token_encrypted,token_expires_at,granted_scopes,created_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle<StoredProviderTokenRow>();

  if (error) throw error;
  if (!data) return null;

  if (data.token_expires_at && new Date(data.token_expires_at).getTime() <= Date.now()) {
    return null;
  }

  return {
    userId: data.user_id,
    facebookUserId: data.facebook_user_id || null,
    accessToken: decryptStoredFacebookToken(data.access_token_encrypted),
    expiresAt: data.token_expires_at || null,
    grantedScopes: data.granted_scopes ?? []
  };
}
