import { NextResponse } from "next/server";
import { APP_SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(APP_SESSION_COOKIE);
  response.cookies.delete("fb_oauth_state");
  return response;
}
