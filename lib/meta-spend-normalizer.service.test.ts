import { describe, expect, it } from "vitest";
import { normalizeMetaSpendToVietnamHours, type MetaHourlyInsightRow } from "./meta-spend-normalizer.service";

const accountConfig = {
  clientId: "greezhub",
  adAccountId: "act_1255736315302940",
  accountName: "Greezhub 01",
  reportTimezone: "Asia/Ho_Chi_Minh",
  metaDayResetHourVN: 14,
  reportingMode: "vietnam_calendar_day",
  dataLagHours: 24
} as const;

describe("meta spend normalizer", () => {
  it("maps Meta hourly rows into Vietnam local hours across the 14:00 reset boundary", () => {
    const rows: MetaHourlyInsightRow[] = [
      {
        date_start: "2026-06-07",
        date_stop: "2026-06-07",
        hourly_stats_aggregated_by_advertiser_time_zone: "10:00:00 - 10:59:59",
        spend: "100000",
        impressions: "1000",
        reach: "800",
        clicks: "50",
        ctr: "5",
        cpc: "2000",
        actions: [
          { action_type: "lead", value: "3" },
          { action_type: "onsite_conversion.messaging_conversation_started_7d", value: "2" }
        ]
      },
      {
        date_start: "2026-06-08",
        date_stop: "2026-06-08",
        hourly_stats_aggregated_by_advertiser_time_zone: "0:00:00 - 0:59:59",
        spend: "50000",
        impressions: "400",
        reach: "300",
        clicks: "20",
        ctr: "5",
        cpc: "2500",
        actions: [{ action_type: "lead", value: "1" }]
      }
    ];

    const facts = normalizeMetaSpendToVietnamHours(rows, accountConfig);

    expect(facts).toHaveLength(2);
    expect(facts[0]).toMatchObject({
      clientId: "greezhub",
      adAccountId: "act_1255736315302940",
      localDate: "2026-06-08",
      localHour: 0,
      localStartAt: "2026-06-08T00:00:00+07:00",
      localEndAt: "2026-06-08T00:59:59+07:00",
      metaDate: "2026-06-07",
      metaHour: 10,
      spend: 100000,
      impressions: 1000,
      reach: 800,
      clicks: 50,
      leads: 3,
      messages: 2,
      dataStatus: "final"
    });
    expect(facts[1]).toMatchObject({
      localDate: "2026-06-08",
      localHour: 14,
      localStartAt: "2026-06-08T14:00:00+07:00",
      localEndAt: "2026-06-08T14:59:59+07:00",
      metaDate: "2026-06-08",
      metaHour: 0,
      spend: 50000,
      dataStatus: "final"
    });
  });
});
