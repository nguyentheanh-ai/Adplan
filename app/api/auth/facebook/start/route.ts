import crypto from "crypto";
import { NextResponse } from "next/server";
import { buildFacebookOAuthUrl } from "@/lib/auth/facebook-oauth";

export async function GET() {
  const state = crypto.randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(buildFacebookOAuthUrl(state));

  response.cookies.set("fb_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60
  });

  return response;
}
