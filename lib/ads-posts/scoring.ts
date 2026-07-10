import type { CreativePerformance } from "@/lib/meta/types";
import type { AdsPostBenchmark, AdsPostRankLabel, AdsPostScore, RankedAdsPost } from "@/lib/ads-posts/types";

function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function avg(values: number[]) {
  const usable = values.filter((value) => Number.isFinite(value) && value > 0);
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : 0;
}

function higherIsBetter(value: number, baseline: number) {
  if (!baseline || !value) return value > 0 ? 55 : 35;
  return clamp((value / baseline) * 55);
}

function lowerIsBetter(value: number, baseline: number) {
  if (!value && !baseline) return 45;
  if (!value) return 35;
  if (!baseline) return 55;
  return clamp((baseline / value) * 70);
}

function conversionCount(row: CreativePerformance) {
  return row.leads + row.messages;
}

function conversionCost(row: CreativePerformance) {
  const conversions = conversionCount(row);
  if (conversions <= 0) return null;
  return row.spend / conversions;
}

export function buildAdsPostBenchmark(rows: CreativePerformance[]): AdsPostBenchmark {
  const conversionCosts = rows.map(conversionCost).filter((value): value is number => typeof value === "number" && value > 0);
  const avgSpend = avg(rows.map((row) => row.spend));

  return {
    avgCtr: avg(rows.map((row) => row.ctr)),
    avgCpc: avg(rows.map((row) => row.cpc)),
    avgCpm: avg(rows.map((row) => row.cpm)),
    avgConversionCost: avg(conversionCosts),
    avgFrequency: avg(rows.map((row) => row.frequency)),
    avgSpend,
    minSpendToRank: Math.max(50000, avgSpend * 0.2),
    minImpressionsToRank: 500
  };
}

function scoreCreativeText(row: CreativePerformance) {
  const text = `${row.body} ${row.headline} ${row.description}`.trim();
  let score = 45;
  if (row.body && !row.body.includes("Không có dữ liệu")) score += 20;
  if (row.headline && !row.headline.includes("Không có dữ liệu")) score += 12;
  if (row.cta && !row.cta.includes("Không có dữ liệu")) score += 10;
  if (row.thumbnailUrl) score += 8;
  if (text.length >= 80 && text.length <= 700) score += 5;
  return clamp(score);
}

function scoreRow(row: CreativePerformance, benchmark: AdsPostBenchmark): AdsPostScore {
  const conversions = conversionCount(row);
  const cost = conversionCost(row);
  const efficiency = Math.round((lowerIsBetter(row.cpc, benchmark.avgCpc) + lowerIsBetter(row.cpm, benchmark.avgCpm) + lowerIsBetter(cost ?? 0, benchmark.avgConversionCost)) / 3);
  const engagement = Math.round((higherIsBetter(row.ctr, benchmark.avgCtr) + higherIsBetter(row.engagements / Math.max(1, row.impressions), 0.01)) / 2);
  const conversion = Math.round((higherIsBetter(conversions, avg([conversions, 1])) + lowerIsBetter(cost ?? 0, benchmark.avgConversionCost)) / 2);
  const creative = Math.round(scoreCreativeText(row));
  const stability = Math.round(
    clamp(55 + (row.impressions >= benchmark.minImpressionsToRank ? 20 : -15) + (row.spend >= benchmark.minSpendToRank ? 15 : -10) - (row.frequency > Math.max(4, benchmark.avgFrequency * 1.6) ? 20 : 0))
  );

  let risk = 15;
  if (row.spend >= benchmark.minSpendToRank && conversions === 0) risk += 35;
  if (row.ctr > 0 && benchmark.avgCtr > 0 && row.ctr < benchmark.avgCtr * 0.65) risk += 20;
  if (row.frequency > Math.max(5, benchmark.avgFrequency * 1.8)) risk += 18;
  if (row.impressions < benchmark.minImpressionsToRank) risk += 15;

  const total = clamp(efficiency * 0.24 + engagement * 0.2 + conversion * 0.28 + creative * 0.13 + stability * 0.15 - risk * 0.18);

  return {
    total: Math.round(total),
    efficiency,
    engagement,
    conversion,
    creative,
    stability,
    risk: Math.round(clamp(risk))
  };
}

function labelFor(score: AdsPostScore, row: CreativePerformance, benchmark: AdsPostBenchmark): AdsPostRankLabel {
  const conversions = conversionCount(row);
  if (score.risk >= 65) return "risky";
  if (row.spend < benchmark.minSpendToRank || row.impressions < benchmark.minImpressionsToRank) return score.total >= 70 ? "promising" : "average";
  if (score.total >= 80 && conversions > 0) return "winner";
  if (score.total >= 65) return "promising";
  if (score.total >= 45) return "average";
  return "weak";
}

function dataQuality(row: CreativePerformance, benchmark: AdsPostBenchmark): RankedAdsPost["dataQuality"] {
  if (row.spend >= benchmark.minSpendToRank && row.impressions >= benchmark.minImpressionsToRank * 2) return "strong";
  if (row.spend > 0 || row.impressions >= benchmark.minImpressionsToRank) return "medium";
  return "thin";
}

function reasons(row: CreativePerformance, score: AdsPostScore, benchmark: AdsPostBenchmark) {
  const output: string[] = [];
  if (row.ctr >= benchmark.avgCtr * 1.2 && row.ctr > 0) output.push("CTR cao hơn trung bình tài khoản.");
  if ((conversionCost(row) ?? 0) > 0 && benchmark.avgConversionCost > 0 && (conversionCost(row) ?? 0) <= benchmark.avgConversionCost * 0.85) output.push("Chi phí chuyển đổi tốt hơn benchmark.");
  if (row.frequency > Math.max(5, benchmark.avgFrequency * 1.8)) output.push("Tần suất cao, cần kiểm tra fatigue.");
  if (row.spend >= benchmark.minSpendToRank && conversionCount(row) === 0) output.push("Đã tiêu đủ ngưỡng nhưng chưa có tin nhắn/lead.");
  if (score.creative >= 75) output.push("Creative có đủ text, headline, CTA hoặc hình xem trước.");
  return output.length ? output : ["Dữ liệu đủ để xếp hạng nhưng chưa có tín hiệu nổi bật rõ ràng."];
}

function recommendations(row: CreativePerformance, label: AdsPostRankLabel, benchmark: AdsPostBenchmark) {
  const items: string[] = [];
  const cost = conversionCost(row);

  if (label === "winner") items.push("Giữ creative này làm mẫu để nhân bản sang ad set/campaign khác.");
  if (label === "promising") items.push("Tăng ngân sách nhẹ hoặc test thêm audience để xác nhận độ ổn định.");
  if (label === "average") items.push("Viết lại hook 2-3 phiên bản rồi A/B test với cùng tệp.");
  if (label === "weak" || label === "risky") items.push("Giảm ngân sách hoặc tạm dừng nếu đã vượt ngưỡng chi tiêu mà không có kết quả.");
  if (row.frequency > Math.max(5, benchmark.avgFrequency * 1.8)) items.push("Đổi hình/angle vì dấu hiệu người xem đã gặp quảng cáo nhiều lần.");
  if (cost && benchmark.avgConversionCost && cost > benchmark.avgConversionCost * 1.25) items.push("Tối ưu lời kêu gọi hành động vì CPA đang cao hơn benchmark.");

  return items;
}

export function rankCreativePosts(rows: CreativePerformance[]) {
  const benchmark = buildAdsPostBenchmark(rows);
  const posts = rows
    .map((row) => {
      const score = scoreRow(row, benchmark);
      const rankLabel = labelFor(score, row, benchmark);
      return {
        ...row,
        rank: 0,
        rankLabel,
        score,
        conversionCount: conversionCount(row),
        conversionCost: conversionCost(row),
        scoreReasons: reasons(row, score, benchmark),
        recommendations: recommendations(row, rankLabel, benchmark),
        dataQuality: dataQuality(row, benchmark)
      };
    })
    .sort((a, b) => b.score.total - a.score.total || b.conversionCount - a.conversionCount || b.spend - a.spend)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return { benchmark, posts };
}
