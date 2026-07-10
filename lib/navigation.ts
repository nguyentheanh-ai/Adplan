export type NavItem = {
  href: string;
  label: string;
  icon: string;
  match: string;
  section?: string;
  adminOnly?: boolean;
};

export type NavGroup = {
  key: "adpilot";
  label: string;
  items: NavItem[];
};

export const dashboardNavItem: NavItem = { href: "/", label: "Overview", icon: "space_dashboard", match: "/" };

export const primaryNavItems: NavItem[] = [
  dashboardNavItem,
  { href: "/ads-facebook", label: "Ads", icon: "ads_click", match: "/ads-facebook", section: "ads" },
  { href: "/ads-facebook/campaigns", label: "Campaigns", icon: "campaign", match: "/ads-facebook/campaigns", section: "campaigns" },
  { href: "/ads-facebook/posts", label: "Post Ranking", icon: "leaderboard", match: "/ads-facebook/posts", section: "posts" },
  { href: "/ads-facebook/reports", label: "Reports", icon: "bar_chart", match: "/ads-facebook/reports", section: "reports" },
  { href: "/admin/revenue-report", label: "Revenue Report", icon: "monitoring", match: "/admin/revenue-report", section: "admin", adminOnly: true },
  { href: "/settings", label: "Settings", icon: "settings", match: "/settings", section: "settings" }
];

export const navGroups: NavGroup[] = [{ key: "adpilot", label: "AdPilot", items: primaryNavItems }];

export const workspaceNavItems: NavItem[] = [];
export const workspaceNavOverview: string[] = [];

export function isNavItemActive(pathname: string, item: NavItem) {
  if (item.match === "/") return pathname === "/";
  if (item.section === "ads") return pathname === "/ads-facebook";
  return pathname === item.match || pathname.startsWith(`${item.match}/`);
}

export function getActiveNavGroupKey(pathname: string): NavGroup["key"] | null {
  if (
    pathname === "/" ||
    pathname === "/ads-facebook" ||
    pathname.startsWith("/ads-facebook/") ||
    pathname === "/admin/revenue-report" ||
    pathname.startsWith("/admin/revenue-report/") ||
    pathname === "/settings"
  ) {
    return "adpilot";
  }
  return null;
}
