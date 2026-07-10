export type AdsFeatureLink = {
  href: string;
  label: string;
  description: string;
  icon: string;
};

export const adsFeatureLinks: AdsFeatureLink[] = [
  {
    href: "/",
    label: "Overview",
    description: "Meta spend, result health and account-level operating signals.",
    icon: "dashboard"
  },
  {
    href: "/ads-facebook/campaigns",
    label: "Campaigns",
    description: "Paginated campaign performance, filtering and detail drill-down.",
    icon: "campaign"
  },
  {
    href: "/ads-facebook/posts",
    label: "Post ranking",
    description: "Rank paid social posts and creatives by score, cost, CTR and conversion quality.",
    icon: "leaderboard"
  },
  {
    href: "/settings",
    label: "Connections",
    description: "Reconnect Facebook and inspect Page publishing readiness.",
    icon: "settings"
  }
];
