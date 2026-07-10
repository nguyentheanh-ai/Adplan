import type { NextConfig } from "next";

const legacyAdsRedirects = [
  ["/ads", "/ads-facebook"],
  ["/ads/reports", "/ads-facebook/reports"],
  ["/ads/optimization", "/ads-facebook/campaigns"],
  ["/ads/campaign-builder", "/ads-facebook/campaigns"],
  ["/ads/audiences", "/ads-facebook/campaigns"],
  ["/ads/creative", "/ads-facebook/campaigns"],
  ["/ads/history", "/ads-facebook/campaigns"],
  ["/ads/facebook-publisher", "/ads-facebook/posts"],
  ["/ads-facebook/optimization", "/ads-facebook/campaigns"],
  ["/ads-facebook/campaign-builder", "/ads-facebook/campaigns"],
  ["/ads-facebook/audiences", "/ads-facebook/campaigns"],
  ["/ads-facebook/creative", "/ads-facebook/campaigns"],
  ["/ads-facebook/history", "/ads-facebook/campaigns"],
  ["/ads-facebook/publisher", "/ads-facebook/posts"],
  ["/reports", "/ads-facebook/reports"],
  ["/optimization", "/ads-facebook/campaigns"],
  ["/campaign-builder", "/ads-facebook/campaigns"],
  ["/audiences", "/ads-facebook/campaigns"],
  ["/creative", "/ads-facebook/campaigns"],
  ["/history", "/ads-facebook/campaigns"],
  ["/facebook-publisher", "/ads-facebook/posts"],
  ["/workspace", "/"],
  ["/workspace/:path*", "/"],
  ["/dashboard", "/ads-facebook"]
] as const;

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"]
  },
  async redirects() {
    return legacyAdsRedirects.map(([source, destination]) => ({
      source,
      destination,
      permanent: false
    }));
  }
};

export default nextConfig;
