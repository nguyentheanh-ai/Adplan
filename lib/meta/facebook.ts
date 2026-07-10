import type {
  AdAccount,
  AccountInsight,
  AdSet,
  AudienceSuggestion,
  BreakdownRow,
  BreakdownType,
  Campaign,
  CampaignInsight,
  DailyInsight,
  DateRange,
  FacebookPagePost,
  MetaAd,
  MetaAdWithCreative
} from "@/lib/meta/types";

export type MetaAdAccount = AdAccount;
export type MetaCampaign = Campaign;

type MetaManagedPage = {
  id: string;
  name: string;
  category?: string;
  access_token?: string;
};

type PostSummaryCount = {
  summary?: {
    total_count?: number;
  };
};

type MetaPagePostPayload = {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  likes?: PostSummaryCount;
  comments?: PostSummaryCount;
  shares?: {
    count?: number;
  };
};

type PostInsightMetric = {
  name: string;
  values?: Array<{
    value?: number | Record<string, number>;
  }>;
};

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
  } else if (lowerMessage.includes("pages_manage_posts")) {
    userMessage = "Token thiếu quyền pages_manage_posts để đăng bài lên Fanpage. Hãy kết nối lại Facebook và cấp quyền đăng bài.";
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
    userMessage = `Meta báo tham số hoặc ID không hợp lệ: ${rawMessage}`;
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
      fields: "id,account_id,name,currency,timezone_name,account_status,user_tasks"
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
          fields: "id,account_id,name,currency,timezone_name,account_status"
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
      fields: "id,name,status,objective,created_time,daily_budget,lifetime_budget,budget_remaining",
      limit: "100"
    }
  });

  return payload.data ?? [];
}

export const listAdAccounts = getMetaAdAccounts;

export async function listCampaignsByDateRange(
  adAccountIdInput: string | null | undefined,
  dateRange: DateRange,
  accessToken?: string | null
) {
  const [campaigns, insights] = await Promise.all([
    getMetaCampaigns(adAccountIdInput, accessToken),
    getMetaCampaignInsights(adAccountIdInput, dateRange, accessToken).catch(() => [])
  ]);
  const insightMap = new Map(insights.map((item) => [item.campaign_id, item]));

  return campaigns.map((campaign) => ({
    ...campaign,
    insight: insightMap.get(campaign.id) ?? null
  }));
}

export async function getMetaAdsets(
  adAccountIdInput: string | null | undefined,
  accessToken?: string | null,
  campaignId?: string | null
) {
  const adAccountId = resolveAdAccountId(adAccountIdInput);
  const payload = await metaFetch<{ data: AdSet[] }>(`${adAccountId}/adsets`, {
    accessToken,
    params: {
      fields:
        "id,name,campaign_id,status,daily_budget,lifetime_budget,optimization_goal,optimization_sub_event,billing_event,bid_amount,bid_strategy,destination_type,promoted_object,attribution_spec,pacing_type,start_time,end_time,targeting,created_time",
      filtering: campaignId ? JSON.stringify([{ field: "campaign.id", operator: "EQUAL", value: campaignId }]) : "[]",
      limit: "100"
    }
  });

  return payload.data ?? [];
}

export async function getMetaAds(adAccountIdInput: string | null | undefined, accessToken?: string | null, adsetId?: string | null) {
  const adAccountId = resolveAdAccountId(adAccountIdInput);
  const payload = await metaFetch<{ data: MetaAd[] }>(`${adAccountId}/ads`, {
    accessToken,
    params: {
      fields: "id,name,status,campaign_id,adset_id,creative{id,name,title,body,thumbnail_url,effective_object_story_id},created_time",
      filtering: adsetId ? JSON.stringify([{ field: "adset.id", operator: "EQUAL", value: adsetId }]) : "[]",
      limit: "100"
    }
  });

  return payload.data ?? [];
}

export async function cloneMetaObject({
  sourceId,
  sourceType,
  campaignId,
  quantity,
  accessToken
}: {
  sourceId: string;
  sourceType: "campaign" | "adset";
  campaignId?: string | null;
  quantity: number;
  accessToken?: string | null;
}) {
  const safeQuantity = Math.max(1, Math.min(Number(quantity || 1), 20));
  const results: Array<{ id?: string; copied_campaign_id?: string; copied_adset_id?: string }> = [];

  for (let index = 0; index < safeQuantity; index += 1) {
    const body = new URLSearchParams({
      deep_copy: "true",
      status_option: "PAUSED",
      rename_options: JSON.stringify({
        rename_strategy: "DEEP_RENAME",
        append_copy_number: true
      })
    });
    if (sourceType === "adset") {
      if (!campaignId) {
        throw new MetaApiError({
          status: 400,
          message: "Missing campaign_id for adset copy",
          userMessage: "Không đọc được campaign_id của nhóm quảng cáo nguồn nên chưa thể nhân bản nhóm quảng cáo."
        });
      }
      body.set("campaign_id", campaignId);
    }
    const result = await metaFetch<{ id?: string; copied_campaign_id?: string; copied_adset_id?: string }>(`${sourceId}/copies`, {
      accessToken,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    results.push(result);
  }

  return results;
}

export async function updateMetaBudget({
  objectId,
  dailyBudget,
  accessToken
}: {
  objectId: string;
  dailyBudget: string;
  accessToken?: string | null;
}) {
  const numericBudget = String(dailyBudget).replace(/[^\d]/g, "");
  if (!numericBudget) {
    throw new MetaApiError({
      status: 400,
      message: "Missing budget",
      userMessage: "Vui long nhap ngan sach moi."
    });
  }

  return metaFetch<{ success?: boolean; id?: string }>(objectId, {
    accessToken,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ daily_budget: numericBudget })
  });
}

export const listAdsets = getMetaAdsets;
export const listAds = getMetaAds;
export const listCreatives = getMetaAdsWithCreatives;
export const cloneCampaign = (sourceId: string, quantity: number, accessToken?: string | null) =>
  cloneMetaObject({ sourceId, sourceType: "campaign", quantity, accessToken });
export const cloneAdset = (sourceId: string, quantity: number, accessToken?: string | null) =>
  cloneMetaObject({ sourceId, sourceType: "adset", quantity, accessToken });
export const updateBudget = updateMetaBudget;

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
      fields: "date_start,date_stop,spend,impressions,reach,ctr,cpc,cpm,clicks,actions,cost_per_action_type",
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
    "adset{id,name,targeting}",
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

export async function getMetaManagedPages(accessToken?: string | null) {
  const [directPages, businessPages, promotedPages] = await Promise.all([
    getDirectManagedPages(accessToken),
    getBusinessManagedPages(accessToken),
    getAdAccountPromotedPages(accessToken)
  ]);

  return dedupeManagedPages([...directPages, ...businessPages, ...promotedPages]);
}

async function getDirectManagedPages(accessToken?: string | null) {
  const payload = await metaFetch<{ data: MetaManagedPage[] }>("me/accounts", {
    accessToken,
    params: {
      fields: "id,name,category,access_token",
      limit: "100"
    }
  });

  return payload.data ?? [];
}

export async function getMetaCampaignDailyInsights(
  adAccountIdInput: string | null | undefined,
  dateRange: DateRange,
  accessToken?: string | null
) {
  const adAccountId = resolveAdAccountId(adAccountIdInput);
  const payload = await metaFetch<{ data: DailyInsight[] }>(`${adAccountId}/insights`, {
    accessToken,
    params: {
      level: "campaign",
      time_increment: "1",
      fields: "campaign_id,campaign_name,date_start,date_stop,spend,impressions,reach,ctr,cpc,cpm,clicks,actions,cost_per_action_type",
      time_range: serializeDateRange(dateRange),
      limit: "500"
    }
  });

  return payload.data ?? [];
}

export async function getMetaHourlyAccountInsights(
  adAccountIdInput: string | null | undefined,
  dateRange: DateRange,
  accessToken?: string | null
) {
  const adAccountId = resolveAdAccountId(adAccountIdInput);
  const payload = await metaFetch<{ data: DailyInsight[] }>(`${adAccountId}/insights`, {
    accessToken,
    params: {
      level: "account",
      breakdowns: "hourly_stats_aggregated_by_advertiser_time_zone",
      time_increment: "1",
      fields: "date_start,date_stop,spend,impressions,reach,ctr,cpc,cpm,clicks,actions,cost_per_action_type",
      time_range: serializeDateRange(dateRange),
      limit: "1000"
    }
  });

  return payload.data ?? [];
}

async function getBusinessManagedPages(accessToken?: string | null) {
  try {
    const payload = await metaFetch<{
      data?: Array<{
        owned_pages?: { data?: MetaManagedPage[] };
        client_pages?: { data?: MetaManagedPage[] };
      }>;
    }>("me/businesses", {
      accessToken,
      params: {
        fields: "owned_pages.limit(100){id,name,category,access_token},client_pages.limit(100){id,name,category,access_token}",
        limit: "50"
      }
    });

    return (payload.data ?? []).flatMap((business) => [
      ...(business.owned_pages?.data ?? []),
      ...(business.client_pages?.data ?? [])
    ]);
  } catch (error) {
    if (error instanceof MetaApiError) return [];
    throw error;
  }
}

async function getAdAccountPromotedPages(accessToken?: string | null) {
  try {
    const adAccounts = await getMetaAdAccounts(accessToken);
    const pageGroups = await Promise.all(
      adAccounts.slice(0, 25).map(async (account) => {
        try {
          const payload = await metaFetch<{ data?: MetaManagedPage[] }>(`${account.id}/promote_pages`, {
            accessToken,
            params: {
              fields: "id,name,category,access_token",
              limit: "100"
            }
          });
          return payload.data ?? [];
        } catch (error) {
          if (error instanceof MetaApiError) return [];
          throw error;
        }
      })
    );
    return pageGroups.flat();
  } catch (error) {
    if (error instanceof MetaApiError) return [];
    throw error;
  }
}

function dedupeManagedPages(pages: MetaManagedPage[]) {
  const seen = new Set<string>();
  const result: MetaManagedPage[] = [];

  for (const page of pages) {
    if (!page.id || seen.has(page.id)) continue;
    seen.add(page.id);
    result.push(page);
  }

  return result;
}

export function sanitizeMetaPage(page: { id: string; name: string; category?: string; access_token?: string }) {
  return {
    id: page.id,
    name: page.name,
    category: page.category,
    has_access_token: Boolean(page.access_token)
  };
}

export async function getMetaManagedPageAccessToken(pageId: string, accessToken?: string | null) {
  const pages = await getMetaManagedPages(accessToken);
  return pages.find((page) => page.id === pageId)?.access_token || null;
}

export async function getMetaPagePosts({
  pageId,
  accessToken
}: {
  pageId: string;
  accessToken?: string | null;
}) {
  const payload = await metaFetch<{
    data: MetaPagePostPayload[];
  }>(`${pageId}/posts`, {
    accessToken,
    params: {
      fields: "id,message,created_time,permalink_url,likes.limit(0).summary(true),comments.limit(0).summary(true),shares",
      limit: "20"
    }
  });

  const posts = payload.data ?? [];
  const enriched = await Promise.all(posts.map((post) => enrichPagePostMetrics(post, accessToken)));
  return enriched;
}

async function enrichPagePostMetrics(post: MetaPagePostPayload, accessToken?: string | null): Promise<FacebookPagePost> {
  const base: FacebookPagePost = {
    id: post.id,
    message: post.message,
    created_time: post.created_time,
    permalink_url: post.permalink_url,
    like_count: post.likes?.summary?.total_count ?? 0,
    comment_count: post.comments?.summary?.total_count ?? 0,
    share_count: post.shares?.count ?? 0,
    reach: 0,
    impressions: 0,
    engaged_users: 0,
    clicks: 0,
    reactions_by_type: {}
  };

  try {
    const payload = await metaFetch<{ data?: PostInsightMetric[] }>(`${post.id}/insights`, {
      accessToken,
      params: {
        metric: [
          "post_impressions",
          "post_impressions_unique",
          "post_engaged_users",
          "post_clicks",
          "post_reactions_by_type_total"
        ].join(",")
      }
    });
    const metrics = payload.data ?? [];
    return {
      ...base,
      impressions: getPostInsightNumber(metrics, "post_impressions"),
      reach: getPostInsightNumber(metrics, "post_impressions_unique"),
      engaged_users: getPostInsightNumber(metrics, "post_engaged_users"),
      clicks: getPostInsightNumber(metrics, "post_clicks"),
      reactions_by_type: getPostInsightObject(metrics, "post_reactions_by_type_total")
    };
  } catch (error) {
    if (error instanceof MetaApiError) return base;
    throw error;
  }
}

function getPostInsightNumber(metrics: PostInsightMetric[], name: string) {
  const value = metrics.find((metric) => metric.name === name)?.values?.[0]?.value;
  return typeof value === "number" ? value : 0;
}

function getPostInsightObject(metrics: PostInsightMetric[], name: string) {
  const value = metrics.find((metric) => metric.name === name)?.values?.[0]?.value;
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).map(([key, count]) => [key, typeof count === "number" ? count : 0]));
}

export async function publishMetaPageFeedPost({
  pageId,
  message,
  link,
  scheduledPublishTime,
  accessToken
}: {
  pageId: string;
  message: string;
  link?: string;
  scheduledPublishTime?: string;
  accessToken?: string | null;
}) {
  const body = new URLSearchParams({ message });
  if (link) body.set("link", link);
  if (scheduledPublishTime) {
    body.set("published", "false");
    body.set("scheduled_publish_time", String(Math.floor(new Date(scheduledPublishTime).getTime() / 1000)));
  }

  return metaFetch<{ id: string }>(`${pageId}/feed`, {
    accessToken,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
}

export async function publishMetaPagePhotoPost({
  pageId,
  caption,
  imageUrl,
  imageBlob,
  fileName = "agent-post-image.png",
  scheduledPublishTime,
  accessToken
}: {
  pageId: string;
  caption: string;
  imageUrl?: string;
  imageBlob?: Blob;
  fileName?: string;
  scheduledPublishTime?: string;
  accessToken?: string | null;
}) {
  if (!imageUrl && !imageBlob) {
    throw new MetaApiError({
      status: 400,
      message: "Missing photo source",
      userMessage: "Thiếu ảnh để đăng bài hình ảnh lên Fanpage."
    });
  }

  let body: URLSearchParams | FormData;
  let headers: Record<string, string> | undefined;

  if (imageBlob) {
    const form = new FormData();
    form.set("caption", caption);
    form.set("source", imageBlob, fileName);
    if (scheduledPublishTime) {
      form.set("published", "false");
      form.set("scheduled_publish_time", String(Math.floor(new Date(scheduledPublishTime).getTime() / 1000)));
    }
    body = form;
  } else {
    const params = new URLSearchParams({ caption, url: imageUrl || "" });
    if (scheduledPublishTime) {
      params.set("published", "false");
      params.set("scheduled_publish_time", String(Math.floor(new Date(scheduledPublishTime).getTime() / 1000)));
    }
    body = params;
    headers = { "Content-Type": "application/x-www-form-urlencoded" };
  }

  return metaFetch<{ id: string; post_id?: string }>(`${pageId}/photos`, {
    accessToken,
    method: "POST",
    headers,
    body
  });
}

export async function uploadMetaPageUnpublishedPhoto({
  pageId,
  imageUrl,
  imageBlob,
  fileName = "agent-post-image.png",
  accessToken
}: {
  pageId: string;
  imageUrl?: string;
  imageBlob?: Blob;
  fileName?: string;
  accessToken?: string | null;
}) {
  if (!imageUrl && !imageBlob) {
    throw new MetaApiError({
      status: 400,
      message: "Missing photo source",
      userMessage: "Thiếu ảnh để đăng bài nhiều ảnh lên Fanpage."
    });
  }

  let body: URLSearchParams | FormData;
  let headers: Record<string, string> | undefined;

  if (imageBlob) {
    const form = new FormData();
    form.set("published", "false");
    form.set("source", imageBlob, fileName);
    body = form;
  } else {
    const params = new URLSearchParams({ published: "false", url: imageUrl || "" });
    body = params;
    headers = { "Content-Type": "application/x-www-form-urlencoded" };
  }

  return metaFetch<{ id: string }>(`${pageId}/photos`, {
    accessToken,
    method: "POST",
    headers,
    body
  });
}

export async function publishMetaPageMultiPhotoPost({
  pageId,
  message,
  mediaFbids,
  scheduledPublishTime,
  accessToken
}: {
  pageId: string;
  message: string;
  mediaFbids: string[];
  scheduledPublishTime?: string;
  accessToken?: string | null;
}) {
  if (!mediaFbids.length) {
    throw new MetaApiError({
      status: 400,
      message: "Missing attached media",
      userMessage: "Thiếu ảnh đã upload để tạo bài nhiều ảnh."
    });
  }

  const body = new URLSearchParams({ message });
  mediaFbids.forEach((mediaFbid, index) => {
    body.set(`attached_media[${index}]`, JSON.stringify({ media_fbid: mediaFbid }));
  });
  if (scheduledPublishTime) {
    body.set("published", "false");
    body.set("scheduled_publish_time", String(Math.floor(new Date(scheduledPublishTime).getTime() / 1000)));
  }

  return metaFetch<{ id: string }>(`${pageId}/feed`, {
    accessToken,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
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
  objective: string;
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

export const createCampaignOnMeta = createPausedMetaCampaign;

function parseAgeRange(ageRange?: string) {
  const matches = String(ageRange || "25-44").match(/\d+/g) ?? [];
  const min = Number(matches[0] || 25);
  const max = Number(matches[1] || 44);
  return {
    age_min: Math.max(18, Math.min(min, 65)),
    age_max: Math.max(Math.max(18, min), Math.min(max, 65))
  };
}

function parseGender(gender?: string) {
  const normalized = String(gender || "").toLowerCase();
  if (normalized.includes("nam")) return [1];
  if (normalized.includes("nữ") || normalized.includes("nu")) return [2];
  return [];
}

function parseDailyBudget(value?: string) {
  const amount = String(value || "").replace(/[^\d]/g, "");
  if (!amount) {
    throw new MetaApiError({
      status: 400,
      message: "Missing daily budget",
      userMessage: "Vui lòng nhập ngân sách mỗi ngày trước khi launch."
    });
  }
  return amount;
}

export async function createAdsetOnMeta({
  adAccountId,
  campaignId,
  name,
  dailyBudget,
  ageRange,
  gender,
  accessToken
}: {
  adAccountId?: string | null;
  campaignId: string;
  name: string;
  dailyBudget: string;
  ageRange?: string;
  gender?: string;
  accessToken?: string | null;
}) {
  const normalizedAdAccountId = resolveAdAccountId(adAccountId);
  const age = parseAgeRange(ageRange);
  const genders = parseGender(gender);
  const targeting: Record<string, unknown> = {
    geo_locations: { countries: ["VN"] },
    age_min: age.age_min,
    age_max: age.age_max
  };
  if (genders.length) targeting.genders = genders;

  const body = new URLSearchParams({
    name,
    campaign_id: campaignId,
    status: "PAUSED",
    daily_budget: parseDailyBudget(dailyBudget),
    billing_event: "IMPRESSIONS",
    optimization_goal: "POST_ENGAGEMENT",
    targeting: JSON.stringify(targeting)
  });

  return metaFetch<{ id: string }>(`${normalizedAdAccountId}/adsets`, {
    accessToken,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
}

export async function createAdsetFromSourceOnMeta({
  adAccountId,
  campaignId,
  sourceAdset,
  name,
  dailyBudget,
  accessToken
}: {
  adAccountId?: string | null;
  campaignId: string;
  sourceAdset: AdSet;
  name: string;
  dailyBudget?: string | null;
  accessToken?: string | null;
}) {
  const normalizedAdAccountId = resolveAdAccountId(adAccountId);
  const budget = dailyBudget || sourceAdset.daily_budget || sourceAdset.lifetime_budget || "100000";
  const targeting = sourceAdset.targeting && Object.keys(sourceAdset.targeting).length
    ? sourceAdset.targeting
    : { geo_locations: { countries: ["VN"] }, age_min: 25, age_max: 44 };

  const body = new URLSearchParams({
    name,
    campaign_id: campaignId,
    status: "PAUSED",
    billing_event: sourceAdset.billing_event || "IMPRESSIONS",
    optimization_goal: sourceAdset.optimization_goal || "POST_ENGAGEMENT",
    targeting: JSON.stringify(targeting)
  });
  if (dailyBudget || sourceAdset.daily_budget || !sourceAdset.lifetime_budget) {
    body.set("daily_budget", parseDailyBudget(budget));
  } else if (sourceAdset.lifetime_budget) {
    body.set("lifetime_budget", parseDailyBudget(budget));
  }
  if (sourceAdset.promoted_object && Object.keys(sourceAdset.promoted_object).length) {
    body.set("promoted_object", JSON.stringify(sourceAdset.promoted_object));
  }
  if (sourceAdset.destination_type) body.set("destination_type", sourceAdset.destination_type);
  if (sourceAdset.optimization_sub_event) body.set("optimization_sub_event", sourceAdset.optimization_sub_event);
  if (sourceAdset.bid_strategy) body.set("bid_strategy", sourceAdset.bid_strategy);
  if (sourceAdset.bid_amount) body.set("bid_amount", String(sourceAdset.bid_amount));
  if (sourceAdset.attribution_spec?.length) body.set("attribution_spec", JSON.stringify(sourceAdset.attribution_spec));
  if (sourceAdset.pacing_type?.length) body.set("pacing_type", JSON.stringify(sourceAdset.pacing_type));

  return metaFetch<{ id: string }>(`${normalizedAdAccountId}/adsets`, {
    accessToken,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
}

export async function createPostAdCreativeOnMeta({
  adAccountId,
  name,
  objectStoryId,
  accessToken
}: {
  adAccountId?: string | null;
  name: string;
  objectStoryId: string;
  accessToken?: string | null;
}) {
  const normalizedAdAccountId = resolveAdAccountId(adAccountId);
  const body = new URLSearchParams({
    name,
    object_story_id: objectStoryId
  });

  return metaFetch<{ id: string }>(`${normalizedAdAccountId}/adcreatives`, {
    accessToken,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
}

export async function createAdOnMeta({
  adAccountId,
  adsetId,
  name,
  creativeId,
  accessToken
}: {
  adAccountId?: string | null;
  adsetId: string;
  name: string;
  creativeId: string;
  accessToken?: string | null;
}) {
  const normalizedAdAccountId = resolveAdAccountId(adAccountId);
  const body = new URLSearchParams({
    name,
    adset_id: adsetId,
    status: "PAUSED",
    creative: JSON.stringify({ creative_id: creativeId })
  });

  return metaFetch<{ id: string }>(`${normalizedAdAccountId}/ads`, {
    accessToken,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
}

export async function createABTestOnMeta() {
  throw new MetaApiError({
    status: 501,
    message: "A/B test launch is not enabled yet",
    userMessage: "A/B test hien chi luu ban nhap. Chua tu tao experiment tren Meta."
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
