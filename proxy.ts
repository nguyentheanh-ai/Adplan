import { NextResponse, type NextRequest } from "next/server";
import { APP_SESSION_COOKIE } from "@/lib/auth/constants";
import { isDevPreviewAuthEnabled } from "@/lib/auth/dev-preview";

const protectedRoutes = ["/ads", "/dashboard", "/workspace", "/ask", "/persona", "/plan", "/settings"];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const hasSession = Boolean(request.cookies.get(APP_SESSION_COOKIE)?.value);
  const previewAuth = isDevPreviewAuthEnabled();

  if (isProtected && !hasSession && !previewAuth) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/login" && (hasSession || previewAuth)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
