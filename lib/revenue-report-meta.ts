import "server-only";
import { cleanEnvValue } from "@/lib/env";
import { getMetaAdAccountDetails, getMetaCampaignDailyInsights } from "@/lib/meta/facebook";
import type { AdAccount } from "@/lib/meta/types";
import {
  parseCampaignConvention,
  resolveRevenueReportAdAccountId,
  resolveRevenueReportMetaAccessToken,
  toNumber,
  type RevenueReportDailyAdInsight,
  type RevenueReportDateRange
} from "@/lib/revenue-report";

export type RevenueMetaStatus = {
  ok: boolean;
  accountId: string;
  accountName: string;
  message?: string;
};

export const defaultRevenueAdAccountId = "act_1255736315302940";

export function normalizeRevenueAdAccountId(value?: string | null) {
  const raw = cleanEnvValue(value) || defaultRevenueAdAccountId;
  return raw.startsWith("act_") ? raw : `act_${raw}`;
}

function resolveMetaAccessToken(sessionToken?: string | null) {
  return resolveRevenueReportMetaAccessToken({
    sessionToken: cleanEnvValue(sessionToken),
    revenueReportMetaAccessToken: cleanEnvValue(process.env.REVENUE_REPORT_META_ACCESS_TOKEN),
    metaAccessToken: cleanEnvValue(process.env.META_ACCESS_TOKEN)
  });
}

function mapDailyInsight(row: {
  date_start: string;
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  actions?: RevenueReportDailyAdInsight["actions"];
  cost_per_action_type?: RevenueReportDailyAdInsight["costPerActionType"];
}): RevenueReportDailyAdInsight {
  const year = Number(row.date_start.slice(0, 4)) || new Date().getFullYear();
  const convention = parseCampaignConvention(row.campaign_name, year);

  return {
    date: row.date_start,
    spend: toNumber(row.spend),
    impressions: toNumber(row.impressions),
    reach: toNumber(row.reach),
    clicks: toNumber(row.clicks),
    campaignId: row.campaign_id ?? null,
    campaignName: row.campaign_name ?? null,
    campaignDate: convention.campaignDate,
    productCode: convention.productCode,
    productName: convention.productName,
    campaignVariant: convention.variant,
    cpc: toNumber(row.cpc),
    cpm: toNumber(row.cpm),
    ctr: toNumber(row.ctr),
    actions: row.actions,
    costPerActionType: row.cost_per_action_type
  };
}

function accountName(account: AdAccount | null, accountId: string) {
  return account?.name || (accountId === defaultRevenueAdAccountId ? "Greezhub 01" : accountId);
}

export async function getRevenueMetaInsights({
  dateRange,
  sessionToken
}: {
  dateRange: RevenueReportDateRange;
  sessionToken?: string | null;
}) {
  const accountId = resolveRevenueReportAdAccountId({
    revenueReportAdAccountId: cleanEnvValue(process.env.REVENUE_REPORT_META_AD_ACCOUNT_ID),
    metaAdAccountId: cleanEnvValue(process.env.META_AD_ACCOUNT_ID)
  });
  const accessToken = resolveMetaAccessToken(sessionToken);

  if (!accessToken) {
    return {
      insights: [] as RevenueReportDailyAdInsight[],
      status: {
        ok: false,
        accountId,
        accountName: accountName(null, accountId),
        message: "Chưa cấu hình Meta Ads token."
      } satisfies RevenueMetaStatus
    };
  }

  try {
    const [details, daily] = await Promise.all([
      getMetaAdAccountDetails(accountId, accessToken).catch(() => null),
      getMetaCampaignDailyInsights(accountId, dateRange, accessToken)
    ]);

    return {
      insights: daily.map(mapDailyInsight),
      status: {
        ok: true,
        accountId,
        accountName: accountName(details, accountId)
      } satisfies RevenueMetaStatus
    };
  } catch (error) {
    return {
      insights: [] as RevenueReportDailyAdInsight[],
      status: {
        ok: false,
        accountId,
        accountName: accountName(null, accountId),
        message: error instanceof Error ? error.message : "Không đọc được Meta Insights."
      } satisfies RevenueMetaStatus
    };
  }
}
