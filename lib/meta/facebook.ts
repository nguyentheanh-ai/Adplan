import type {
  AdAccount,
  AccountInsight,
  AudienceSuggestion,
  BreakdownRow,
  BreakdownType,
  Campaign,
  CampaignInsight,
  DailyInsight,
  DateRange,
  MetaAdWithCreative
} from "@/lib/meta/types";

export type MetaAdAccount = AdAccount;
export type MetaCampaign = Campaign;

export type MetaApiErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export class MetaApiError extends Error {
  status: number;
  code?: number;
  type?: string;
  fbtraceId?: string;
  userMessage: string;

  constructor({
    status,
    message,
    code,
    type,
    fbtraceId,
    userMessage
  }: {
    status: number;
    message: string;
    code?: number;
    type?: string;
    fbtraceId?: string;
    userMessage: string;
  }) {
    super(message);
    this.name = "MetaApiError";
    this.status = status;
    this.code = code;
    this.type = type;
    this.fbtraceId = fbtraceId;
    this.userMessage = userMessage;
  }
}

function getMetaApiVersion() {
  return process.env.META_API_VERSION || "v23.0";
}

function getMetaAccessToken(accessToken?: string | null) {
  if (!accessToken) {
    throw new MetaApiError({
      status: 500,
      message: "Missing Meta access token",
      userMessage: "Chưa có token Meta. Hãy đăng nhập bằng Facebook để kết nối tài khoản quảng cáo."
    });
  }

  return accessToken;
}

function resolveAdAccountId(adAccountId?: string | null) {
  if (!adAccountId) {
    throw new MetaApiError({
      status: 400,
      message: "Missing selected ad account id",
      userMessage: "Chưa chọn tài khoản quảng cáo."
    });
  }

  return normalizeAdAccountId(adAccountId);
}

function normalizeAdAccountId(adAccountId: string) {
  return adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
}

export function classifyMetaError(status: number, payload: MetaApiErrorPayload) {
  const metaError = payload.error;
  const rawMessage = metaError?.message || "Meta API trả về lỗi không xác định.";
  const lowerMessage = rawMessage.toLowerCase();
  let userMessage = `Meta API trả lỗi: ${rawMessage}`;

  if (metaError?.code === 190 || lowerMessage.includes("invalid oauth") || lowerMessage.includes("access token")) {
    userMessage = "Token Meta không hợp lệ hoặc đã hết hạn. Hãy đăng nhập lại Facebook.";
  } else if (lowerMessage.includes("ads_read")) {
    userMessage = "Token thiếu quyền ads_read để đọc tài khoản quảng cáo hoặc báo cáo.";
  } else if (lowerMessage.includes("ads_management")) {
    userMessage = "Token thiếu quyền ads_management để tạo campaign.";
  } else if (lowerMessage.includes("pages_read_engagement")) {
    userMessage = "Token thiếu quyền pages_read_engagement để đọc một số thông tin creative hoặc bài viết.";
  } else if (metaError?.code === 4 || metaError?.code === 17 || lowerMessage.includes("rate limit")) {
    userMessage = "Meta API đang giới hạn tần suất gọi. Hãy thử lại sau ít phút.";
  } else if (
    lowerMessage.includes("breakdowns") ||
    lowerMessage.includes("breakdown") ||
    lowerMessage.includes("not supported")
  ) {
    userMessage = "Breakdown này chưa được Meta hỗ trợ cho dữ liệu hoặc quyền hiện tại.";
  } else if (metaError?.code === 10 || metaError?.code === 200 || lowerMessage.includes("permission")) {
    userMessage = "Token thiếu quyền cần thiết với Meta Marketing API.";
  } else if (
    metaError?.code === 100 ||
    lowerMessage.includes("unknown path components") ||
    lowerMessage.includes("unsupported get request") ||
    lowerMessage.includes("object does not exist")
  ) {
    userMessage = "Sai ad account id hoặc token không có quyền truy cập tài khoản quảng cáo này.";
  }

  return new MetaApiError({
    status,
    message: rawMessage,
    code: metaError?.code,
    type: metaError?.type,
    fbtraceId: metaError?.fbtrace_id,
    userMessage
  });
}

function graphUrl(path: string, params?: Record<string, string>) {
  const url = new URL(`https://graph.facebook.com/${getMetaApiVersion()}/${path.replace(/^\//, "")}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

async function metaFetch<T>(
  path: string,
  init?: RequestInit & { params?: Record<string, string>; accessToken?: string | null }
) {
  const { params, accessToken: accessTokenOverride, ...requestInit } = init ?? {};
  const accessToken = getMetaAccessToken(accessTokenOverride);
  const response = await fetch(graphUrl(path, params), {
    ...requestInit,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(requestInit.headers ?? {})
    },
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => ({}))) as T & MetaApiErrorPayload;

  if (!response.ok) {
    throw classifyMetaError(response.status, payload);
  }

  return payload as T;
}

export async function getMetaAdAccounts(accessToken?: string | null) {
  const payload = await metaFetch<{ data: AdAccount[] }>("me/adaccounts", {
    accessToken,
    params: {
      fields: "id,account_id,name,currency,timezone_name,account_status,amount_spent,balance,spend_cap,created_time,disable_reason,business{name,id},funding_source_details"
    }
  });

  return payload.data ?? [];
}

export async function getMetaAdAccountDetails(adAccountIdInput?: string | null, accessToken?: string | null) {
  const adAccountId = resolveAdAccountId(adAccountIdInput);
  const fields =
    "id,account_id,name,currency,timezone_name,account_status,amount_spent,balance,spend_cap,created_time,disable_reason,business{name,id},funding_source_details";

  try {
    return await metaFetch<AdAccount>(adAccountId, {
      accessToken,
      params: { fields }
    });
  } catch (error) {
    if (error instanceof MetaApiError) {
      return metaFetch<AdAccount>(adAccountId, {
        accessToken,
        params: {
          fields: "id,account_id,name,currency,timezone_name,account_status,business{name,id}"
        }
      });
    }

    throw error;
  }
}

export async function getMetaCampaigns(adAccountIdInput?: string | null, accessToken?: string | null) {
  const adAccountId = resolveAdAccountId(adAccountIdInput);
  const payload = await metaFetch<{ data: Campaign[] }>(`${adAccountId}/campaigns`, {
    accessToken,
    params: {
      fields: "id,name,status,objective,created_time",
      limit: "100"
    }
  });

  return payload.data ?? [];
}

const insightFields = [
  "campaign_id",
  "campaign_name",
  "objective",
  "spend",
  "impressions",
  "reach",
  "frequency",
  "cpm",
  "ctr",
  "cpc",
  "clicks",
  "actions",
  "cost_per_action_type",
  "purchase_roas",
  "website_purchase_roas",
  "action_values"
].join(",");

function serializeDateRange(dateRange: DateRange) {
  return JSON.stringify({
    since: dateRange.startDate,
    until: dateRange.endDate
  });
}

export async function getMetaCampaignInsights(
  adAccountIdInput: string | null | undefined,
  dateRange: DateRange,
  accessToken?: string | null
) {
  const adAccountId = resolveAdAccountId(adAccountIdInput);
  const payload = await metaFetch<{ data: CampaignInsight[] }>(`${adAccountId}/insights`, {
    accessToken,
    params: {
      level: "campaign",
      fields: insightFields,
      time_range: serializeDateRange(dateRange),
      limit: "100"
    }
  });

  return payload.data ?? [];
}

export async function getMetaDailyInsights(
  adAccountIdInput: string | null | undefined,
  dateRange: DateRange,
  accessToken?: string | null
) {
  const adAccountId = resolveAdAccountId(adAccountIdInput);
  const payload = await metaFetch<{ data: DailyInsight[] }>(`${adAccountId}/insights`, {
    accessToken,
    params: {
      level: "account",
      time_increment: "1",
      fields: "date_start,date_stop,spend,impressions,reach,ctr,cpc,cpm,clicks",
      time_range: serializeDateRange(dateRange),
      limit: "100"
    }
  });

  return payload.data ?? [];
}

export async function getMetaAccountInsights(
  adAccountIdInput: string | null | undefined,
  dateRange: DateRange,
  accessToken?: string | null
) {
  const adAccountId = resolveAdAccountId(adAccountIdInput);
  const payload = await metaFetch<{ data: AccountInsight[] }>(`${adAccountId}/insights`, {
    accessToken,
    params: {
      level: "account",
      fields: "spend,impressions,reach,frequency,cpm,ctr,cpc,clicks,actions,cost_per_action_type",
      time_range: serializeDateRange(dateRange),
      limit: "10"
    }
  });

  return payload.data ?? [];
}

export async function getMetaAdsWithCreatives(
  adAccountIdInput: string | null | undefined,
  dateRange: DateRange,
  accessToken?: string | null
) {
  const adAccountId = resolveAdAccountId(adAccountIdInput);
  const timeRange = serializeDateRange(dateRange);
  const fields = [
    "id",
    "name",
    "status",
    "campaign_id",
    "campaign{id,name,status,objective}",
    "adset_id",
    "adset{id,name}",
    "creative{id,name,title,body,object_story_spec,effective_object_story_id,thumbnail_url,image_url,video_id,call_to_action_type,asset_feed_spec}",
    `insights.time_range(${timeRange}){spend,impressions,reach,frequency,cpm,ctr,cpc,clicks,actions,cost_per_action_type}`
  ].join(",");

  const payload = await metaFetch<{ data: MetaAdWithCreative[] }>(`${adAccountId}/ads`, {
    accessToken,
    params: {
      fields,
      limit: "100"
    }
  });

  return payload.data ?? [];
}

function resolveBreakdown(breakdown: BreakdownType) {
  if (breakdown === "placement") return "publisher_platform";
  return breakdown;
}

export async function getMetaBreakdownInsights({
  adAccountId,
  dateRange,
  breakdown,
  accessToken
}: {
  adAccountId?: string | null;
  dateRange: DateRange;
  breakdown: BreakdownType;
  accessToken?: string | null;
}) {
  const normalizedAdAccountId = resolveAdAccountId(adAccountId);
  const resolvedBreakdown = resolveBreakdown(breakdown);
  const payload = await metaFetch<{ data: BreakdownRow[] }>(`${normalizedAdAccountId}/insights`, {
    accessToken,
    params: {
      level: "campaign",
      breakdowns: resolvedBreakdown,
      fields: `${insightFields},${resolvedBreakdown}`,
      time_range: serializeDateRange(dateRange),
      limit: "100"
    }
  });

  return payload.data ?? [];
}

export async function searchFacebookInterests({
  query,
  adAccountId,
  accessToken
}: {
  query: string;
  adAccountId?: string | null;
  accessToken?: string | null;
}) {
  const normalizedAdAccountId = resolveAdAccountId(adAccountId);
  const payload = await metaFetch<{
    data: Array<{ id: string; name: string; audience_size?: number }>;
  }>(`${normalizedAdAccountId}/targetingsearch`, {
    accessToken,
    params: {
      type: "adinterest",
      q: query,
      limit: "12"
    }
  });

  return (payload.data ?? []).map<AudienceSuggestion>((item) => ({
    id: item.id,
    name: item.name,
    audience_size: item.audience_size,
    source: "facebook"
  }));
}

export async function createPausedMetaCampaign({
  name,
  objective,
  adAccountId,
  accessToken
}: {
  name: string;
  objective: "OUTCOME_TRAFFIC";
  adAccountId?: string;
  accessToken?: string | null;
}) {
  const normalizedAdAccountId = resolveAdAccountId(adAccountId);
  const body = new URLSearchParams({
    name,
    objective,
    status: "PAUSED",
    special_ad_categories: JSON.stringify([]),
    buying_type: "AUCTION"
  });

  return metaFetch<{ id: string }>(`${normalizedAdAccountId}/campaigns`, {
    accessToken,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
}

export function metaErrorResponse(error: unknown) {
  if (error instanceof Error && error.name === "FacebookAuthRequiredError") {
    return {
      status: 401,
      body: {
        error: error.message
      }
    };
  }

  if (error instanceof MetaApiError) {
    return {
      status: error.status,
      body: {
        error: error.userMessage,
        meta: {
          code: error.code,
          type: error.type,
          fbtrace_id: error.fbtraceId
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      error: error instanceof Error ? error.message : "Không thể gọi Meta API."
    }
  };
}
