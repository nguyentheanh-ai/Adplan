import type { AdsAnalyticsModel, BreakdownRow, DailyMetricRow } from "@/lib/ads/metrics";
import { formatCompactMoney, formatMetric, formatNumber } from "@/lib/ads/metrics";

export type AdsActionItem = {
  severity: "scale" | "warning" | "check" | "hold";
  title: string;
  reason: string;
  metric: string;
  action: string;
};

function bestCpl(rows: BreakdownRow[]) {
  return rows.filter((row) => row.conversions > 0 && row.cpl > 0).sort((a, b) => a.cpl - b.cpl)[0];
}

function wasteRow(rows: BreakdownRow[]) {
  return rows.filter((row) => row.spend > 0 && row.conversions === 0).sort((a, b) => b.spend - a.spend)[0];
}

function highCtr(rows: BreakdownRow[]) {
  return rows.filter((row) => row.ctr > 0 && row.spend > 0).sort((a, b) => b.ctr - a.ctr)[0];
}

function highCpc(rows: BreakdownRow[]) {
  return rows.filter((row) => row.cpc > 0).sort((a, b) => b.cpc - a.cpc)[0];
}

function bestDay(rows: DailyMetricRow[]) {
  return rows.filter((row) => row.conversions > 0 || row.messages > 0).sort((a, b) => b.conversions - a.conversions || b.messages - a.messages)[0];
}

export function buildAdsActionCenter(model: AdsAnalyticsModel): AdsActionItem[] {
  const items: AdsActionItem[] = [];
  const efficient = bestCpl(model.campaigns);
  const waste = wasteRow(model.campaigns);
  const creative = highCtr(model.creatives);
  const costly = highCpc(model.campaigns);
  const day = bestDay(model.daily);

  if (efficient) {
    items.push({
      severity: "scale",
      title: "Campaign có CPL tốt nhất",
      reason: `${efficient.name} đang tạo ${formatNumber(efficient.conversions)} conversion với CPL ${formatMetric("cpl", efficient.cpl, model.currency)}.`,
      metric: `Spend ${formatCompactMoney(efficient.spend)} · CTR ${efficient.ctr.toFixed(2)}%`,
      action: "Tăng ngân sách từng bước 10-20% và giữ nguyên creative đang thắng."
    });
  }

  if (waste) {
    items.push({
      severity: "warning",
      title: "Campaign đốt tiền nhưng ít lead",
      reason: `${waste.name} đã chi ${formatCompactMoney(waste.spend)} nhưng chưa có conversion trong kỳ.`,
      metric: `CPC ${formatMetric("cpc", waste.cpc, model.currency)} · CTR ${waste.ctr.toFixed(2)}%`,
      action: "Kiểm tra creative/audience; nếu không cải thiện thì tắt hoặc tách nhóm test mới."
    });
  }

  if (creative) {
    items.push({
      severity: "scale",
      title: "Creative có CTR cao",
      reason: `${creative.name} đang có CTR ${creative.ctr.toFixed(2)}%, cao nhất trong nhóm creative có dữ liệu.`,
      metric: `Spend ${formatCompactMoney(creative.spend)} · ${formatNumber(creative.conversions)} conversion`,
      action: "Nhân bản concept thắng và test thêm biến thể headline/hình ảnh."
    });
  }

  if (costly) {
    items.push({
      severity: costly.conversions > 0 ? "check" : "warning",
      title: "CPC cao bất thường",
      reason: `${costly.name} có CPC ${formatMetric("cpc", costly.cpc, model.currency)}.`,
      metric: `Clicks ${formatNumber(costly.clicks)} · CTR ${costly.ctr.toFixed(2)}%`,
      action: "Xem lại placement, target và chất lượng creative để giảm chi phí click."
    });
  }

  if (day) {
    items.push({
      severity: "hold",
      title: "Ngày performance tốt nhất",
      reason: `${day.label} tạo ${formatNumber(day.conversions || day.messages)} kết quả với spend ${formatCompactMoney(day.spend)}.`,
      metric: `CPL ${day.cpl ? formatMetric("cpl", day.cpl, model.currency) : "N/A"}`,
      action: "Đối chiếu lịch đăng/creative của ngày này để nhân rộng setup tốt."
    });
  }

  return items.length
    ? items.slice(0, 5)
    : [
        {
          severity: "check",
          title: "Cần thêm dữ liệu",
          reason: "Chưa đủ campaign/daily/creative để tạo khuyến nghị đáng tin.",
          metric: "N/A",
          action: "Kiểm tra quyền Meta hoặc mở rộng date range."
        }
      ];
}
