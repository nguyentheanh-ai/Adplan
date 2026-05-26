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

export const dashboardNavItem: NavItem = { href: "/", label: "Dashboard", icon: "space_dashboard", match: "/" };

export const primaryNavItems: NavItem[] = [
  { href: "/", label: "Trang chủ", icon: "home", match: "/" },
  { href: "/workspace", label: "Workspace", icon: "folder_copy", match: "/workspace" },
  { href: "/ads-facebook", label: "Ads Facebook", icon: "campaign", match: "/ads-facebook" },
  { href: "/settings", label: "Cài đặt", icon: "settings", match: "/settings" }
];

const adsNavItems: NavItem[] = [
  { href: "/ads-facebook", label: "Dashboard Ads", icon: "dashboard", match: "/ads-facebook" },
  { href: "/ads-facebook/reports", label: "Báo cáo Ads", icon: "analytics", match: "/ads-facebook/reports", section: "reports" },
  { href: "/ads-facebook/optimization", label: "Tối ưu", icon: "tune", match: "/ads-facebook/optimization", section: "optimization" },
  { href: "/ads-facebook/campaign-builder", label: "Campaign Builder", icon: "add_circle", match: "/ads-facebook/campaign-builder", section: "campaign_builder" },
  { href: "/ads-facebook/audiences", label: "Audiences", icon: "groups", match: "/ads-facebook/audiences", section: "audiences" },
  { href: "/ads-facebook/creative", label: "Creative", icon: "palette", match: "/ads-facebook/creative", section: "creative" },
  { href: "/ads-facebook/history", label: "Lịch sử", icon: "history", match: "/ads-facebook/history", section: "history" },
  { href: "/ads-facebook/publisher", label: "Facebook Publisher", icon: "publish", match: "/ads-facebook/publisher", section: "publisher" }
];

export const workspaceNavItems: NavItem[] = [
  { href: "/workspace", label: "Tổng quan", icon: "dashboard", match: "/workspace" },
  { href: "/workspace/content", label: "Không gian nội dung", icon: "inventory_2", match: "/workspace/content" },
  { href: "/workspace/documents", label: "Tài liệu", icon: "folder_copy", match: "/workspace/documents" },
  { href: "/workspace/notes", label: "Notes", icon: "sticky_note_2", match: "/workspace/notes" },
  { href: "/workspace/ideas", label: "Ideas", icon: "lightbulb", match: "/workspace/ideas" },
  { href: "/workspace/prompts", label: "Prompts", icon: "terminal", match: "/workspace/prompts" },
  { href: "/workspace/operations", label: "Không gian vận hành", icon: "hub", match: "/workspace/operations" },
  { href: "/workspace/content-plan", label: "Plan Content", icon: "edit_calendar", match: "/workspace/content-plan" },
  { href: "/workspace/calendar", label: "Calendar", icon: "calendar_month", match: "/workspace/calendar" },
  { href: "/workspace/tools/clock", label: "Clock", icon: "schedule", match: "/workspace/tools/clock" },
  { href: "/workspace/analytics", label: "Analytics", icon: "monitoring", match: "/workspace/analytics" },
  { href: "/workspace/tasks", label: "Tasks", icon: "checklist", match: "/workspace/tasks" }
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
    pathname === "/ads-facebook" ||
    pathname.startsWith("/ads-facebook/") ||
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
