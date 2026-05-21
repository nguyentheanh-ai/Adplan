type SnapshotRow = Record<string, unknown>;

export type InferredIndustryProfile = {
  industry_key: string;
  business_model: string | null;
  offer_type: string | null;
  average_order_value: number | null;
  target_customer: string | null;
  notes: string | null;
};

const industryRules = [
  { key: "education_course", words: ["khoa hoc", "hoc vien", "dao tao", "lop", "bai giang", "ai", "video"] },
  { key: "spa_beauty", words: ["spa", "tham my", "da", "mun", "nam", "tre hoa", "lieu trinh", "phun xam"] },
  { key: "fashion_cosmetics", words: ["my pham", "son", "kem", "thoi trang", "ao", "vay", "giay", "tui"] },
  { key: "restaurant_cafe", words: ["nha hang", "cafe", "quan an", "mon", "buffet", "dat ban"] },
  { key: "real_estate", words: ["can ho", "dat nen", "bat dong san", "du an", "chung cu"] },
  { key: "clinic_health", words: ["phong kham", "bac si", "suc khoe", "dieu tri", "nha khoa"] },
  { key: "b2b_service", words: ["doanh nghiep", "b2b", "phan mem", "tu van", "agency", "crm"] },
  { key: "ecommerce", words: ["sale", "giam gia", "freeship", "dat hang", "mua ngay", "shop"] }
];

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function scoreIndustry(text: string) {
  const scores = industryRules.map((rule) => ({
    key: rule.key,
    score: rule.words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0)
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.score ? scores[0].key : "unknown";
}

function mostCommon(values: unknown[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (!text) continue;
    counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function inferBusinessModel(campaigns: SnapshotRow[], creatives: SnapshotRow[]) {
  const text = normalize([
    ...campaigns.map((row) => row.objective),
    ...creatives.map((row) => `${row.body ?? ""} ${row.headline ?? ""} ${row.cta ?? ""}`)
  ].join(" "));
  if (text.includes("message") || text.includes("tin nhan") || text.includes("inbox")) return "Tư vấn qua inbox/tin nhắn";
  if (text.includes("lead") || text.includes("dang ky") || text.includes("form")) return "Thu lead/đăng ký tư vấn";
  if (text.includes("traffic") || text.includes("landing") || text.includes("website")) return "Kéo traffic về website/landing page";
  if (text.includes("purchase") || text.includes("sales") || text.includes("mua")) return "Bán hàng/chuyển đổi trực tiếp";
  return "Tương tác và nuôi nhu cầu";
}

function inferOffer(creatives: SnapshotRow[]) {
  const text = normalize(creatives.map((row) => `${row.body ?? ""} ${row.headline ?? ""}`).join(" "));
  if (text.includes("mien phi")) return "Tư vấn/tài liệu miễn phí";
  if (text.includes("giam") || text.includes("sale") || text.includes("%")) return "Giảm giá/khuyến mãi";
  if (text.includes("qua tang") || text.includes("tang")) return "Tặng quà/bonus";
  if (text.includes("uu dai")) return "Ưu đãi giới hạn";
  return "Chưa thấy offer rõ trong dữ liệu đã sync";
}

export function inferIndustryProfileFromSnapshots(campaigns: SnapshotRow[], creatives: SnapshotRow[]): InferredIndustryProfile {
  const combinedText = normalize([
    ...campaigns.map((row) => `${row.campaign_name ?? ""} ${row.objective ?? ""}`),
    ...creatives.map((row) => `${row.campaign_name ?? ""} ${row.adset_name ?? ""} ${row.ad_name ?? ""} ${row.body ?? ""} ${row.headline ?? ""} ${row.description ?? ""} ${row.audience_interests ?? ""}`)
  ].join(" "));
  const topCampaign = [...campaigns].sort((a, b) => Number(b.spend ?? 0) - Number(a.spend ?? 0))[0];
  const targetParts = [
    mostCommon(creatives.map((row) => row.audience_age_range)),
    mostCommon(creatives.map((row) => row.audience_gender)),
    mostCommon(creatives.map((row) => row.audience_locations)),
    mostCommon(creatives.map((row) => row.audience_interests))
  ].filter(Boolean);

  return {
    industry_key: scoreIndustry(combinedText),
    business_model: inferBusinessModel(campaigns, creatives),
    offer_type: inferOffer(creatives),
    average_order_value: null,
    target_customer: targetParts.length ? targetParts.join(" · ") : null,
    notes: [
      `Tự suy luận từ ${campaigns.length} campaign và ${creatives.length} creative đã đồng bộ.`,
      topCampaign?.campaign_name ? `Campaign chi tiêu cao nhất: ${topCampaign.campaign_name}.` : "",
      "Nguồn: campaign, bài quảng cáo, target, ngân sách và chỉ số đã lưu từ Meta."
    ].filter(Boolean).join(" ")
  };
}
