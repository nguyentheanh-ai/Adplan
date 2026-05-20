import { NextResponse } from "next/server";
import {
  ensureFacebookSupabaseProfile,
  exchangeFacebookCode,
  findMissingFacebookScopes,
  getFacebookGrantedPermissions,
  getFacebookProfile,
  getSiteUrl
} from "@/lib/auth/facebook-oauth";
import { APP_SESSION_COOKIE, encodeAppSession, getAppSessionCookieOptions } from "@/lib/auth/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorDescription = url.searchParams.get("error_description");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const savedState = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("fb_oauth_state="))
    ?.split("=")[1];

  if (errorDescription) {
    return redirectToLogin(errorDescription);
  }

  if (!code || !state || !savedState || state !== savedState) {
    return redirectToLogin("Phiên đăng nhập Facebook không hợp lệ. Vui lòng thử lại.");
  }

  try {
    const token = await exchangeFacebookCode(code);
    const grantedScopes = await getFacebookGrantedPermissions(token.accessToken);
    const missingScopes = findMissingFacebookScopes(grantedScopes);

    if (missingScopes.length) {
      return redirectToLogin(
        `Facebook chưa cấp đủ quyền: ${missingScopes.join(", ")}. Hãy bấm đăng nhập lại và chọn tiếp tục/cấp quyền cho ứng dụng.`
      );
    }

    const profile = await getFacebookProfile(token.accessToken);
    const userId = await ensureFacebookSupabaseProfile(profile);
    const maxAge = Math.max(60 * 30, Math.min(token.expiresIn, 60 * 60 * 24 * 60));
    const response = NextResponse.redirect(`${getSiteUrl()}/dashboard`);

    response.cookies.delete("fb_oauth_state");
    response.cookies.set(
      APP_SESSION_COOKIE,
      encodeAppSession({
        userId,
        facebookId: profile.id,
        name: profile.name,
        profileUrl: profile.link,
        accessToken: token.accessToken,
        expiresAt: Date.now() + maxAge * 1000,
        grantedScopes: Array.from(grantedScopes)
      }),
      getAppSessionCookieOptions(maxAge)
    );

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể đăng nhập Facebook.";
    return redirectToLogin(message);
  }
}

function redirectToLogin(message: string) {
  const response = NextResponse.redirect(`${getSiteUrl()}/login?error=${encodeURIComponent(message)}`);
  response.cookies.delete("fb_oauth_state");
  return response;
}
