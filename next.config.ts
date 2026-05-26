import type { NextConfig } from "next";

const legacyAdsRedirects = [
  ["/ads", "/ads-facebook"],
  ["/ads/reports", "/ads-facebook/reports"],
  ["/ads/optimization", "/ads-facebook/optimization"],
  ["/ads/campaign-builder", "/ads-facebook/campaign-builder"],
  ["/ads/audiences", "/ads-facebook/audiences"],
  ["/ads/creative", "/ads-facebook/creative"],
  ["/ads/history", "/ads-facebook/history"],
  ["/ads/facebook-publisher", "/ads-facebook/publisher"],
  ["/reports", "/ads-facebook/reports"],
  ["/optimization", "/ads-facebook/optimization"],
  ["/campaign-builder", "/ads-facebook/campaign-builder"],
  ["/audiences", "/ads-facebook/audiences"],
  ["/creative", "/ads-facebook/creative"],
  ["/history", "/ads-facebook/history"],
  ["/facebook-publisher", "/ads-facebook/publisher"],
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
