export type MetaAdAccount = {
  id: string;
  account_id?: string;
  name?: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  business_name?: string;
};

export type MetaCampaign = {
  id: string;
  name: string;
  status?: string;
  objective?: string;
  created_time?: string;
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
    userMessage = "Token Meta không hợp lệ hoặc đã hết hạn. Hãy đăng nhập lại Facebook hoặc tạo lại access token.";
  } else if (lowerMessage.includes("ads_read")) {
    userMessage = "Token thiếu quyền ads_read để đọc tài khoản quảng cáo hoặc campaign.";
  } else if (lowerMessage.includes("ads_management")) {
    userMessage = "Token thiếu quyền ads_management để tạo campaign.";
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
  const payload = await metaFetch<{ data: MetaAdAccount[] }>("me/adaccounts", {
    accessToken,
    params: {
      fields: "id,account_id,name,currency,timezone_name,account_status"
    }
  });

  return payload.data ?? [];
}

export async function getMetaCampaigns(adAccountIdInput?: string | null, accessToken?: string | null) {
  const adAccountId = resolveAdAccountId(adAccountIdInput);
  const payload = await metaFetch<{ data: MetaCampaign[] }>(`${adAccountId}/campaigns`, {
    accessToken,
    params: {
      fields: "id,name,status,objective,created_time",
      limit: "50"
    }
  });

  return payload.data ?? [];
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
