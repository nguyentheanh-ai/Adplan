import { APP_SESSION_COOKIE } from "@/lib/auth/constants";

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml"
];

export function isPublicAppPath(pathname: string) {
  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }

  return /\.[a-zA-Z0-9]+$/.test(pathname);
}

export function shouldRequireAppLogin(pathname: string) {
  if (pathname.startsWith("/api/")) return false;
  return !isPublicAppPath(pathname);
}

export function hasAppSessionCookie(cookieValue?: string | null) {
  return Boolean(cookieValue?.trim());
}

export function buildLoginRedirectPath(pathname: string, search = "") {
  const currentPath = `${pathname}${search}`;
  if (currentPath === "/") return "/login";
  return `/login?next=${encodeURIComponent(currentPath)}`;
}

export { APP_SESSION_COOKIE };
