import type { AdsPostAnalysis, AdsPostBenchmark, AdsPostImprovement, RankedAdsPost } from "@/lib/ads-posts/types";

function cleanMetaText(value: string) {
  return value && !value.includes("Không có dữ liệu") ? value.trim() : "";
}

function firstSentence(text: string) {
  const clean = cleanMetaText(text);
  if (!clean) return "Chưa có hook rõ ràng từ dữ liệu Meta.";
  return clean.split(/\n|\.|\?|!/).map((item) => item.trim()).filter(Boolean)[0] ?? clean.slice(0, 120);
}

export function buildAdsPostAnalysis(post: RankedAdsPost, benchmark: AdsPostBenchmark): AdsPostAnalysis {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const diagnosis: string[] = [];

  if (post.score.engagement >= 70) strengths.push("Khả năng kéo click/tương tác đang tốt so với mặt bằng tài khoản.");
  if (post.score.conversion >= 70) strengths.push("Tín hiệu chuyển đổi tốt, có thể dùng làm mẫu cho biến thể mới.");
  if (post.conversionCount > 0 && post.conversionCost && benchmark.avgConversionCost && post.conversionCost < benchmark.avgConversionCost) strengths.push("CPA/CPL thấp hơn benchmark.");
  if (post.score.risk >= 55) weaknesses.push("Rủi ro cao do chi phí, CTR, frequency hoặc thiếu chuyển đổi.");
  if (post.frequency > Math.max(5, benchmark.avgFrequency * 1.8)) weaknesses.push("Frequency cao, có dấu hiệu creative fatigue.");
  if (post.conversionCount === 0 && post.spend >= benchmark.minSpendToRank) weaknesses.push("Đã có chi tiêu đáng kể nhưng chưa tạo tin nhắn/lead.");
  if (post.score.creative < 65) weaknesses.push("Dữ liệu creative thiếu headline, CTA, ảnh preview hoặc nội dung đủ mạnh.");

  diagnosis.push(`Điểm tổng ${post.score.total}/100, nhóm ${post.rankLabel}.`);
  diagnosis.push(`CTR ${post.ctr.toFixed(2)}% so với benchmark ${benchmark.avgCtr.toFixed(2)}%.`);
  diagnosis.push(
    post.conversionCost
      ? `Chi phí chuyển đổi ${post.conversionCost.toLocaleString("vi-VN")} đ so với benchmark ${benchmark.avgConversionCost.toLocaleString("vi-VN")} đ.`
      : "Chưa có chuyển đổi để tính CPA/CPL."
  );

  return {
    post,
    benchmark,
    diagnosis,
    strengths: strengths.length ? strengths : ["Chưa có điểm mạnh đủ rõ, cần thêm dữ liệu hoặc test biến thể."],
    weaknesses: weaknesses.length ? weaknesses : ["Chưa thấy rủi ro lớn trong dữ liệu hiện tại."],
    recommendedActions: post.recommendations,
    creativeNotes: {
      hook: firstSentence(post.body),
      headline: cleanMetaText(post.headline) || "Chưa có headline rõ ràng.",
      cta: cleanMetaText(post.cta) || "Chưa có CTA rõ ràng.",
      messageLength: cleanMetaText(post.body).length,
      hasLandingUrl: Boolean(cleanMetaText(post.landingUrl))
    }
  };
}

export function generateImprovedVersions(post: RankedAdsPost): AdsPostImprovement[] {
  const baseHeadline = cleanMetaText(post.headline) || post.creativeName || "Ưu đãi dành cho khách hàng mới";
  const cta = cleanMetaText(post.cta) || "Nhắn tin ngay";
  const hook = firstSentence(post.body);

  return [
    {
      title: "Phiên bản nhấn vào vấn đề",
      primaryText: `${hook}\n\nNếu anh/chị đang gặp đúng tình trạng này, hãy để lại tin nhắn để được tư vấn phương án phù hợp trước khi quyết định.`,
      headline: baseHeadline,
      cta,
      rationale: "Giữ insight chính, làm CTA mềm hơn để kéo tin nhắn."
    },
    {
      title: "Phiên bản so sánh lợi ích",
      primaryText: `Đừng chỉ nhìn vào giá. Hãy kiểm tra xem giải pháp có đúng nhu cầu, đúng thời điểm và có người theo sát sau khi bắt đầu hay không.\n\n${baseHeadline}`,
      headline: "Tư vấn rõ trước khi chọn",
      cta,
      rationale: "Tăng độ tin cậy và giảm cảm giác quảng cáo bán gấp."
    },
    {
      title: "Phiên bản ngắn để test CTR",
      primaryText: `${baseHeadline}\n\nMuốn biết phương án nào hợp với mình? Nhắn tin để được kiểm tra nhanh.`,
      headline: "Kiểm tra nhanh hôm nay",
      cta,
      rationale: "Rút gọn nội dung để test phản ứng trên placement có attention thấp."
    }
  ];
}
