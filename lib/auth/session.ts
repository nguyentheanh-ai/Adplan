import crypto from "crypto";
import { cookies } from "next/headers";
import { APP_SESSION_COOKIE } from "@/lib/auth/constants";

export { APP_SESSION_COOKIE };

export type AppSession = {
  userId: string;
  facebookId: string;
  name?: string;
  accessToken: string;
  expiresAt: number;
  grantedScopes?: string[];
};

function getSessionSecret() {
  const secret = process.env.META_APP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Thiếu META_APP_SECRET hoặc SUPABASE_SERVICE_ROLE_KEY.");
  return secret;
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function encodeAppSession(session: AppSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeAppSession(cookieValue?: string | null) {
  if (!cookieValue) return null;
  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  if (
    expectedSignature.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
  ) {
    return null;
  }

  const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AppSession;
  if (!session.accessToken || !session.userId || session.expiresAt < Date.now()) return null;
  return session;
}

export async function getAppSession() {
  const cookieStore = await cookies();
  return decodeAppSession(cookieStore.get(APP_SESSION_COOKIE)?.value);
}

export async function requireAppSession() {
  const session = await getAppSession();
  if (!session) throw new Error("Bạn cần đăng nhập bằng Facebook.");
  return session;
}

export function getAppSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds
  };
}
