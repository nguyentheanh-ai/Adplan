import { NextResponse, type NextRequest } from "next/server";
import { APP_SESSION_COOKIE, buildLoginRedirectPath, hasAppSessionCookie, shouldRequireAppLogin } from "@/lib/auth/protected-routes";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = hasAppSessionCookie(request.cookies.get(APP_SESSION_COOKIE)?.value);

  if (shouldRequireAppLogin(pathname) && !hasSession) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = buildLoginRedirectPath(pathname, search).replace("/login", "");
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/login" && hasSession) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
