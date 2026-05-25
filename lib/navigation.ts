export type NavItem = {
  href: string;
  label: string;
  icon: string;
  match: string;
  section?: string;
  adminOnly?: boolean;
};

export type NavGroup = {
  key: "workspace" | "ads";
  label: string;
  items: NavItem[];
};

const adsNavItems: NavItem[] = [
  { href: "/ads", label: "Ads Facebook", icon: "campaign", match: "/ads" }
];

const workspaceNavItems: NavItem[] = [
  { href: "/workspace", label: "Workspace", icon: "hub", match: "/workspace" }
];

export const navGroups: NavGroup[] = [
  { key: "ads", label: "Ads Facebook", items: adsNavItems },
  { key: "workspace", label: "Workspace", items: workspaceNavItems }
];

export const workspaceNavOverview = workspaceNavItems.map((item) => item.href);

export function isNavItemActive(pathname: string, item: NavItem) {
  if (item.match === "/") return pathname === "/";
  return pathname === item.match || pathname.startsWith(`${item.match}/`);
}

export function getActiveNavGroupKey(pathname: string): NavGroup["key"] | null {
  if (
    pathname === "/ads" ||
    pathname.startsWith("/ads/") ||
    pathname === "/facebook-publisher" ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/reports" ||
    pathname === "/optimization" ||
    pathname === "/campaign-builder" ||
    pathname === "/audiences" ||
    pathname === "/creative" ||
    pathname === "/history"
  ) {
    return "ads";
  }

  if (
    pathname === "/" ||
    pathname === "/workspace" ||
    pathname.startsWith("/workspace/") ||
    pathname === "/settings" ||
    pathname === "/admin"
  ) {
    return "workspace";
  }

  const match = navGroups.find((group) => group.items.some((item) => isNavItemActive(pathname, item)));
  return match?.key ?? null;
}
