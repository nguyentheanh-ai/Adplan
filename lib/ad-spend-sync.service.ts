import "server-only";
import { DateTime } from "luxon";
import { cleanEnvValue } from "@/lib/env";
import { getStoredFacebookProviderTokenCandidates } from "@/lib/facebook-provider-token-store";
import { getMetaDailyInsights, getMetaHourlyAccountInsights } from "@/lib/meta/facebook";
import { getExpandedMetaDateRangeForVietnamRange, metaDateHourToVietnamHour } from "@/lib/reporting-window.service";
import { normalizeMetaSpendToVietnamHours, type MetaHourlyInsightRow } from "@/lib/meta-spend-normalizer.service";
import { getAdHourlyFactsForReport, getClientAdAccountSettings, insertAdSpendSyncLog, upsertAdHourlyFacts } from "@/lib/ad-hourly-cache.service";
import { revenueReportTimeZone, toNumber, type RevenueReportAdHourlyFact, type RevenueReportDateRange } from "@/lib/revenue-report";

type SyncTokenCandidate = {
  source: string;
  token: string;
};

function pushTokenCandidate(candidates: SyncTokenCandidate[], source: string, token?: string | null) {
  const clean = cleanEnvValue(token);
  if (!clean) return;
  if (candidates.some((candidate) => candidate.token === clean)) return;
  candidates.push({ source, token: clean });
}

async function resolveSyncTokenCandidates(sessionToken?: string | null) {
  const candidates: SyncTokenCandidate[] = [];
  pushTokenCandidate(candidates, "session", sessionToken);

  try {
    const storedTokens = await getStoredFacebookProviderTokenCandidates();
    for (const stored of storedTokens) {
      pushTokenCandidate(candidates, `stored:${stored.facebookUserId || stored.userId}`, stored.accessToken);
    }
  } catch {
    // Env/session tokens still allow the sync to run when the token vault is unavailable.
  }

  pushTokenCandidate(candidates, "REVENUE_REPORT_META_ACCESS_TOKEN", process.env.REVENUE_REPORT_META_ACCESS_TOKEN);
  pushTokenCandidate(candidates, "META_ACCESS_TOKEN", process.env.META_ACCESS_TOKEN);

  return candidates;
}

function actionValue(actions: Array<{ action_type: string; value: string }> | undefined, names: string[]) {
  return (actions ?? [])
    .filter((action) => names.includes(action.action_type))
    .reduce((sum, action) => sum + toNumber(action.value), 0);
}

function currentMetaHourForDate(metaDate: string, resetHourVN: number, now: DateTime) {
  const metaStart = DateTime.fromISO(metaDate, { zone: revenueReportTimeZone }).set({ hour: resetHourVN, minute: 0, second: 0, millisecond: 0 });
  const diffHours = Math.floor(now.diff(metaStart, "hours").hours);
  return diffHours >= 0 && diffHours <= 23 ? diffHours : null;
}

async function addDailySnapshotFacts({
  facts,
  accountId,
  token,
  tokenSource,
  settings,
  dateRange,
  metaFetchRange,
  now = DateTime.now().setZone(revenueReportTimeZone)
}: {
  facts: RevenueReportAdHourlyFact[];
  accountId: string;
  token: string;
  tokenSource: string;
  settings: {
    clientId: string;
    adAccountId: string;
    metaDayResetHourVN: number;
  };
  dateRange: RevenueReportDateRange;
  metaFetchRange: RevenueReportDateRange;
  now?: DateTime;
}) {
  const dailyRows = await getMetaDailyInsights(accountId, metaFetchRange, token);
  const existing = await getAdHourlyFactsForReport({ dateRange, adAccountId: accountId }).catch(() => ({ facts: [] as RevenueReportAdHourlyFact[] }));
  const existingAndNew = [...existing.facts, ...facts].filter((fact) => fact.metaDate);
  const output = [...facts];

  for (const row of dailyRows) {
    const metaDate = row.date_start;
    const metaHour = currentMetaHourForDate(metaDate, settings.metaDayResetHourVN, now);
    if (metaHour === null) continue;

    const local = metaDateHourToVietnamHour({ metaDate, metaHour, resetHourVN: settings.metaDayResetHourVN });
    if (local.localDate < dateRange.startDate || local.localDate > dateRange.endDate) continue;

    const currentMetaFacts = existingAndNew.filter((fact) => fact.metaDate === metaDate);
    const currentHourFact = currentMetaFacts.find((fact) => fact.localDate === local.localDate && fact.localHour === local.localHour);
    const spendDelta = Math.max(0, toNumber(row.spend) - currentMetaFacts.reduce((sum, fact) => sum + fact.spend, 0));
    if (spendDelta <= 0) continue;

    const clicksDelta = Math.max(0, toNumber(row.clicks) - currentMetaFacts.reduce((sum, fact) => sum + fact.clicks, 0));
    const leadsDelta = Math.max(0, actionValue(row.actions, ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"]) - currentMetaFacts.reduce((sum, fact) => sum + fact.leads, 0));
    const messagesDelta = Math.max(0, actionValue(row.actions, ["onsite_conversion.messaging_conversation_started_7d", "onsite_conversion.messaging_first_reply"]) - currentMetaFacts.reduce((sum, fact) => sum + fact.messages, 0));
    const currentSpend = currentHourFact?.spend ?? 0;
    const currentClicks = currentHourFact?.clicks ?? 0;
    const currentLeads = currentHourFact?.leads ?? 0;
    const currentMessages = currentHourFact?.messages ?? 0;

    const duplicateIndex = output.findIndex((fact) => fact.localDate === local.localDate && fact.localHour === local.localHour);
    if (duplicateIndex >= 0) output.splice(duplicateIndex, 1);

    output.push({
      clientId: settings.clientId,
      adAccountId: settings.adAccountId,
      localDate: local.localDate,
      localHour: local.localHour,
      localStartAt: local.localStartAt,
      localEndAt: local.localEndAt,
      metaDate,
      metaHour,
      spend: currentSpend + spendDelta,
      impressions: currentHourFact?.impressions ?? 0,
      reach: currentHourFact?.reach ?? 0,
      clicks: currentClicks + clicksDelta,
      ctr: 0,
      cpc: currentClicks + clicksDelta > 0 ? (currentSpend + spendDelta) / (currentClicks + clicksDelta) : 0,
      leads: currentLeads + leadsDelta,
      messages: currentMessages + messagesDelta,
      source: `meta_daily_snapshot:${tokenSource}`,
      dataStatus: "partial",
      rawJson: row as unknown as Record<string, unknown>
    });
  }

  return output;
}

export async function syncAdHourlyFacts({
  clientId,
  adAccountId,
  dateRange,
  sessionToken
}: {
  clientId?: string | null;
  adAccountId: string;
  dateRange: RevenueReportDateRange;
  sessionToken?: string | null;
}) {
  const settingsPayload = await getClientAdAccountSettings(adAccountId);
  const settings = {
    ...settingsPayload.settings,
    clientId: clientId || settingsPayload.settings.clientId,
    adAccountId
  };
  const tokenCandidates = await resolveSyncTokenCandidates(sessionToken);
  const syncWindow = getExpandedMetaDateRangeForVietnamRange(dateRange, settings.metaDayResetHourVN);

  if (!tokenCandidates.length) {
    await insertAdSpendSyncLog({
      clientId: settings.clientId,
      adAccountId: settings.adAccountId,
      syncWindowStart: syncWindow.dateRange.startDate,
      syncWindowEnd: syncWindow.dateRange.endDate,
      status: "failed",
      errorMessage: "Missing Meta access token."
    }).catch(() => undefined);
    throw new Error("Chua cau hinh Meta access token de sync chi phi quang cao.");
  }

  const errors: string[] = [];

  try {
    let insights: MetaHourlyInsightRow[] | null = null;
    let tokenSource = "";
    let token = "";

    for (const candidate of tokenCandidates) {
      try {
        insights = (await getMetaHourlyAccountInsights(settings.adAccountId, syncWindow.dateRange, candidate.token)) as MetaHourlyInsightRow[];
        tokenSource = candidate.source;
        token = candidate.token;
        break;
      } catch (error) {
        errors.push(`${candidate.source}: ${error instanceof Error ? error.message : "Unknown Meta error."}`);
      }
    }

    if (!insights) {
      throw new Error(errors.join(" | ") || "Khong doc duoc Meta hourly insights.");
    }

    const hourlyFacts = normalizeMetaSpendToVietnamHours(insights, {
      clientId: settings.clientId,
      adAccountId: settings.adAccountId,
      accountName: settings.accountName,
      reportTimezone: settings.reportTimezone,
      metaDayResetHourVN: settings.metaDayResetHourVN,
      reportingMode: settings.reportingMode,
      dataLagHours: settings.dataLagHours
    }).filter((fact) => fact.localDate >= dateRange.startDate && fact.localDate <= dateRange.endDate);
    const facts = await addDailySnapshotFacts({
      facts: hourlyFacts,
      accountId: settings.adAccountId,
      token,
      tokenSource,
      settings,
      dateRange,
      metaFetchRange: syncWindow.dateRange
    });

    const result = await upsertAdHourlyFacts(facts);
    await insertAdSpendSyncLog({
      clientId: settings.clientId,
      adAccountId: settings.adAccountId,
      syncWindowStart: syncWindow.dateRange.startDate,
      syncWindowEnd: syncWindow.dateRange.endDate,
      status: facts.length ? "success" : "partial",
      errorMessage: facts.length ? `token_source=${tokenSource}` : `Meta returned no hourly rows for requested window. token_source=${tokenSource}`
    }).catch(() => undefined);

    return {
      ok: true,
      clientId: settings.clientId,
      adAccountId: settings.adAccountId,
      requestedRange: dateRange,
      metaFetchRange: syncWindow.dateRange,
      upserted: result.count,
      tokenSource,
      facts
    };
  } catch (error) {
    await insertAdSpendSyncLog({
      clientId: settings.clientId,
      adAccountId: settings.adAccountId,
      syncWindowStart: syncWindow.dateRange.startDate,
      syncWindowEnd: syncWindow.dateRange.endDate,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown sync error."
    }).catch(() => undefined);
    throw error;
  }
}

export function recentHourlyRefreshRange(now = new Date()) {
  const end = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  const startDate = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const start = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(startDate);
  return { startDate: start, endDate: end };
}
