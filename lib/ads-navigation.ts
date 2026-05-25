export type AdsFeatureLink = {
  href: string;
  label: string;
  description: string;
  icon: string;
};

export const adsFeatureLinks: AdsFeatureLink[] = [
  {
    href: "/ads",
    label: "Dashboard Ads",
    description: "Tổng quan tài khoản, chi tiêu, kết quả và cảnh báo Meta.",
    icon: "dashboard"
  },
  {
    href: "/ads/reports",
    label: "Báo cáo Ads",
    description: "Báo cáo chiến dịch, ad set, creative, export CSV.",
    icon: "analytics"
  },
  {
    href: "/ads/optimization",
    label: "Tối ưu",
    description: "Khuyến nghị tối ưu, log hành động và khung giờ ủy quyền.",
    icon: "tune"
  },
  {
    href: "/ads/campaign-builder",
    label: "Campaign Builder",
    description: "Dựng chiến dịch, cấu trúc ad set và launch campaign.",
    icon: "add_circle"
  },
  {
    href: "/ads/audiences",
    label: "Audiences",
    description: "Quản lý và lưu tệp đối tượng quảng cáo.",
    icon: "groups"
  },
  {
    href: "/ads/creative",
    label: "Creative",
    description: "Theo dõi creative, hook, angle và hiệu suất nội dung.",
    icon: "palette"
  },
  {
    href: "/ads/history",
    label: "Lịch sử",
    description: "Các bản phân tích persona và kế hoạch đã tạo bằng AI.",
    icon: "history"
  },
  {
    href: "/ads/facebook-publisher",
    label: "Facebook Publisher",
    description: "Hàng chờ draft, duyệt bài và publish lên Page.",
    icon: "publish"
  }
];
