import { NextResponse } from "next/server";
import { createDevPreviewSession } from "@/lib/auth/dev-preview";
import { APP_SESSION_COOKIE, encodeAppSession, getAppSessionCookieOptions } from "@/lib/auth/session";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev preview login chỉ dùng trong local development." }, { status: 404 });
  }

  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const maxAge = 60 * 60 * 8;
  const response = NextResponse.redirect(new URL(safeNext, url.origin));

  response.cookies.set(
    APP_SESSION_COOKIE,
    encodeAppSession({
      ...createDevPreviewSession(),
      expiresAt: Date.now() + maxAge * 1000
    }),
    getAppSessionCookieOptions(maxAge)
  );

  return response;
}
