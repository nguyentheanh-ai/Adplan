import { metaDateHourToVietnamHour, vietnamReportTimezone } from "@/lib/reporting-window.service";
import { toNumber, type RevenueReportAdHourlyFact } from "@/lib/revenue-report";

export type AccountReportingConfig = {
  clientId: string;
  adAccountId: string;
  accountName?: string | null;
  reportTimezone: typeof vietnamReportTimezone | string;
  metaDayResetHourVN: number;
  reportingMode: "vietnam_calendar_day" | string;
  dataLagHours: number;
};

export type MetaHourlyInsightRow = {
  date_start: string;
  date_stop?: string;
  hourly_stats_aggregated_by_advertiser_time_zone?: string;
  spend?: string | number | null;
  impressions?: string | number | null;
  reach?: string | number | null;
  clicks?: string | number | null;
  ctr?: string | number | null;
  cpc?: string | number | null;
  actions?: Array<{ action_type: string; value: string | number }>;
  cost_per_action_type?: Array<{ action_type: string; value: string | number }>;
  [key: string]: unknown;
};

function parseMetaHour(value: string | undefined) {
  const match = String(value || "").match(/(\d{1,2}):\d{2}:\d{2}/);
  if (!match) return null;
  const hour = Number(match[1]);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function actionValue(actions: MetaHourlyInsightRow["actions"], patterns: RegExp[]) {
  return (actions ?? []).reduce((sum, action) => {
    const type = String(action.action_type || "");
    return patterns.some((pattern) => pattern.test(type)) ? sum + toNumber(action.value) : sum;
  }, 0);
}

export function normalizeMetaSpendToVietnamHours(metaInsights: MetaHourlyInsightRow[], accountConfig: AccountReportingConfig): RevenueReportAdHourlyFact[] {
  return metaInsights.flatMap((row) => {
    const metaHour = parseMetaHour(row.hourly_stats_aggregated_by_advertiser_time_zone);
    if (metaHour === null || !row.date_start) return [];

    const local = metaDateHourToVietnamHour({
      metaDate: row.date_start,
      metaHour,
      resetHourVN: accountConfig.metaDayResetHourVN
    });

    const clicks = toNumber(row.clicks);
    const impressions = toNumber(row.impressions);
    const spend = toNumber(row.spend);

    return [
      {
        clientId: accountConfig.clientId,
        adAccountId: accountConfig.adAccountId,
        localDate: local.localDate,
        localHour: local.localHour,
        localStartAt: local.localStartAt,
        localEndAt: local.localEndAt,
        metaDate: row.date_start,
        metaHour,
        spend,
        impressions,
        reach: toNumber(row.reach),
        clicks,
        ctr: row.ctr === undefined || row.ctr === null ? (impressions > 0 ? (clicks / impressions) * 100 : 0) : toNumber(row.ctr),
        cpc: row.cpc === undefined || row.cpc === null ? (clicks > 0 ? spend / clicks : 0) : toNumber(row.cpc),
        leads: actionValue(row.actions, [/^lead$/i, /lead/i, /complete_registration/i]),
        messages: actionValue(row.actions, [/messag/i, /conversation/i]),
        source: "meta_hourly",
        dataStatus: "final",
        rawJson: row
      } satisfies RevenueReportAdHourlyFact
    ];
  });
}
