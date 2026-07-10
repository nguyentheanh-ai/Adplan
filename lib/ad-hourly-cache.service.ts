import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVietnamHoursForDateRange } from "@/lib/reporting-window.service";
import {
  revenueReportDayStartHour,
  revenueReportTimeZone,
  type AdSpendDataStatus,
  type RevenueReportAdHourlyFact,
  type RevenueReportDateRange
} from "@/lib/revenue-report";

export type ClientAdAccountSettings = {
  id?: string;
  clientId: string;
  adAccountId: string;
  accountName: string;
  reportTimezone: typeof revenueReportTimeZone;
  metaDayResetHourVN: number;
  reportingMode: "vietnam_calendar_day";
  dataLagHours: number;
  enabled: boolean;
};

export type AdHourlyFactsStatus = {
  ok: boolean;
  source: "ad_hourly_facts";
  message?: string;
  dataStatus: AdSpendDataStatus;
};

type SettingsRow = {
  id?: string;
  client_id: string;
  ad_account_id: string;
  account_name: string | null;
  report_timezone: string | null;
  meta_day_reset_hour_vn: number | null;
  reporting_mode: string | null;
  data_lag_hours: number | null;
  enabled: boolean | null;
};

type FactRow = {
  client_id: string;
  ad_account_id: string;
  local_date: string;
  local_hour: number;
  local_start_at: string;
  local_end_at: string;
  meta_date: string | null;
  meta_hour: number | null;
  spend: string | number | null;
  impressions: string | number | null;
  reach: string | number | null;
  clicks: string | number | null;
  ctr: string | number | null;
  cpc: string | number | null;
  leads: string | number | null;
  messages: string | number | null;
  source: string | null;
  data_status: AdSpendDataStatus | null;
  raw_json: Record<string, unknown> | null;
};

function toNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function isMissingTableError(error: { code?: string; message?: string } | null) {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "PGRST205" || message.includes("could not find the table") || message.includes("relation");
}

export function defaultGreezhubAdAccountSettings(): ClientAdAccountSettings {
  return {
    clientId: "greezhub",
    adAccountId: "act_1255736315302940",
    accountName: "Greezhub 01",
    reportTimezone: revenueReportTimeZone,
    metaDayResetHourVN: revenueReportDayStartHour,
    reportingMode: "vietnam_calendar_day",
    dataLagHours: 24,
    enabled: true
  };
}

function mapSettings(row: SettingsRow): ClientAdAccountSettings {
  return {
    id: row.id,
    clientId: row.client_id,
    adAccountId: row.ad_account_id,
    accountName: row.account_name || row.ad_account_id,
    reportTimezone: revenueReportTimeZone,
    metaDayResetHourVN: row.meta_day_reset_hour_vn ?? revenueReportDayStartHour,
    reportingMode: "vietnam_calendar_day",
    dataLagHours: row.data_lag_hours ?? 24,
    enabled: row.enabled ?? true
  };
}

function mapFact(row: FactRow): RevenueReportAdHourlyFact {
  return {
    clientId: row.client_id,
    adAccountId: row.ad_account_id,
    localDate: row.local_date,
    localHour: row.local_hour,
    localStartAt: row.local_start_at,
    localEndAt: row.local_end_at,
    metaDate: row.meta_date || "",
    metaHour: row.meta_hour ?? 0,
    spend: toNumber(row.spend),
    impressions: toNumber(row.impressions),
    reach: toNumber(row.reach),
    clicks: toNumber(row.clicks),
    ctr: toNumber(row.ctr),
    cpc: toNumber(row.cpc),
    leads: toNumber(row.leads),
    messages: toNumber(row.messages),
    source: row.source,
    dataStatus: row.data_status || "missing",
    rawJson: row.raw_json || {}
  };
}

function missingFact(settings: ClientAdAccountSettings, hour: ReturnType<typeof getVietnamHoursForDateRange>[number]): RevenueReportAdHourlyFact {
  return {
    clientId: settings.clientId,
    adAccountId: settings.adAccountId,
    localDate: hour.localDate,
    localHour: hour.localHour,
    localStartAt: hour.localStartAt,
    localEndAt: hour.localEndAt,
    metaDate: "",
    metaHour: 0,
    spend: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    ctr: 0,
    cpc: 0,
    leads: 0,
    messages: 0,
    source: "missing",
    dataStatus: "missing",
    rawJson: {}
  };
}

function mergeFactCoverage(settings: ClientAdAccountSettings, range: RevenueReportDateRange, facts: RevenueReportAdHourlyFact[]) {
  const byHour = new Map(facts.map((fact) => [`${fact.localDate}:${fact.localHour}`, fact]));
  return getVietnamHoursForDateRange(range).map((hour) => byHour.get(`${hour.localDate}:${hour.localHour}`) ?? missingFact(settings, hour));
}

function mergeStatus(facts: RevenueReportAdHourlyFact[]): AdSpendDataStatus {
  if (!facts.length || facts.every((fact) => fact.dataStatus === "missing")) return "missing";
  if (facts.every((fact) => fact.dataStatus === "final")) return "final";
  return "partial";
}

export async function getClientAdAccountSettings(adAccountId = "act_1255736315302940") {
  const fallback = defaultGreezhubAdAccountSettings();

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("client_ad_account_settings")
      .select("id,client_id,ad_account_id,account_name,report_timezone,meta_day_reset_hour_vn,reporting_mode,data_lag_hours,enabled")
      .eq("ad_account_id", adAccountId)
      .eq("enabled", true)
      .maybeSingle<SettingsRow>();

    if (error) {
      if (isMissingTableError(error)) return { settings: fallback, status: { ok: false, source: "ad_hourly_facts" as const, dataStatus: "missing" as const, message: "Chua co bang client_ad_account_settings." } };
      throw error;
    }

    return { settings: data ? mapSettings(data) : fallback, status: { ok: true, source: "ad_hourly_facts" as const, dataStatus: "final" as const } };
  } catch (error) {
    return {
      settings: fallback,
      status: {
        ok: false,
        source: "ad_hourly_facts" as const,
        dataStatus: "missing" as const,
        message: error instanceof Error ? error.message : "Khong doc duoc cau hinh tai khoan quang cao."
      }
    };
  }
}

export async function getAdHourlyFactsForReport({ dateRange, adAccountId }: { dateRange: RevenueReportDateRange; adAccountId?: string | null }) {
  const settingsPayload = await getClientAdAccountSettings(adAccountId || "act_1255736315302940");
  const { settings } = settingsPayload;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ad_hourly_facts")
      .select("client_id,ad_account_id,local_date,local_hour,local_start_at,local_end_at,meta_date,meta_hour,spend,impressions,reach,clicks,ctr,cpc,leads,messages,source,data_status,raw_json")
      .eq("client_id", settings.clientId)
      .eq("ad_account_id", settings.adAccountId)
      .gte("local_date", dateRange.startDate)
      .lte("local_date", dateRange.endDate)
      .order("local_date", { ascending: true })
      .order("local_hour", { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        const facts = mergeFactCoverage(settings, dateRange, []);
        return {
          facts,
          settings,
          status: { ok: false, source: "ad_hourly_facts" as const, dataStatus: "missing" as const, message: "Chua co bang ad_hourly_facts de tinh chi phi theo gio Viet Nam." }
        };
      }
      throw error;
    }

    const facts = mergeFactCoverage(settings, dateRange, ((data ?? []) as FactRow[]).map(mapFact));
    return {
      facts,
      settings,
      status: { ok: true, source: "ad_hourly_facts" as const, dataStatus: mergeStatus(facts) }
    };
  } catch (error) {
    const facts = mergeFactCoverage(settings, dateRange, []);
    return {
      facts,
      settings,
      status: {
        ok: false,
        source: "ad_hourly_facts" as const,
        dataStatus: "missing" as const,
        message: error instanceof Error ? error.message : "Khong doc duoc ad_hourly_facts."
      }
    };
  }
}

export async function upsertAdHourlyFacts(facts: RevenueReportAdHourlyFact[]) {
  if (!facts.length) return { count: 0 };
  const supabase = createAdminClient();
  const rows = facts.map((fact) => ({
    client_id: fact.clientId,
    ad_account_id: fact.adAccountId,
    local_date: fact.localDate,
    local_hour: fact.localHour,
    local_start_at: fact.localStartAt,
    local_end_at: fact.localEndAt,
    meta_date: fact.metaDate || null,
    meta_hour: fact.metaHour,
    spend: fact.spend,
    impressions: fact.impressions,
    reach: fact.reach,
    clicks: fact.clicks,
    ctr: fact.ctr,
    cpc: fact.cpc,
    leads: fact.leads,
    messages: fact.messages,
    source: fact.source || "meta_hourly",
    data_status: fact.dataStatus,
    raw_json: fact.rawJson,
    fetched_at: new Date().toISOString()
  }));

  const { error } = await supabase.from("ad_hourly_facts").upsert(rows, {
    onConflict: "client_id,ad_account_id,local_date,local_hour"
  });
  if (error) throw error;
  return { count: rows.length };
}

export async function insertAdSpendSyncLog(input: {
  clientId: string;
  adAccountId: string;
  syncWindowStart: string;
  syncWindowEnd: string;
  status: "success" | "failed" | "partial";
  errorMessage?: string | null;
}) {
  const supabase = createAdminClient();
  await supabase.from("ad_spend_sync_logs").insert({
    client_id: input.clientId,
    ad_account_id: input.adAccountId,
    sync_window_start: input.syncWindowStart,
    sync_window_end: input.syncWindowEnd,
    status: input.status,
    error_message: input.errorMessage ?? null
  });
}
