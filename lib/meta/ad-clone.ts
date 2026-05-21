import type { AdAccount, AdSet, MetaAd, MetaCreative } from "@/lib/meta/types";

export type MetaAdCloneStepStatus = "pass" | "warning" | "fail";

export type MetaAdCloneStep = {
  key:
    | "token_valid"
    | "ads_management"
    | "ads_read"
    | "ad_account_visible"
    | "user_ad_account_permission"
    | "ad_account_status"
    | "source_ad"
    | "source_ad_account_match"
    | "creative"
    | "target_adset"
    | "clone_result";
  label: string;
  status: MetaAdCloneStepStatus;
  message: string;
  details?: Record<string, unknown>;
};

export type MetaErrorDetails = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  fbtrace_id?: string;
  category?: string;
};

export type MetaGraphCaller = (
  path: string,
  init?: {
    method?: string;
    params?: Record<string, string>;
    body?: URLSearchParams;
    accessToken?: string;
    appAccessToken?: string;
  }
) => Promise<unknown>;

type DebugTokenResponse = {
  data?: {
    is_valid?: boolean;
    app_id?: string;
    user_id?: string;
    expires_at?: number;
    scopes?: string[];
    granular_scopes?: Array<{ scope?: string }>;
  };
};

type MetaAdAccountListResponse = {
  data?: Array<AdAccount & { account_id?: string; user_tasks?: string[] }>;
};

type MetaAdCreative = MetaCreative & {
  object_story_id?: string;
  asset_feed_spec?: unknown;
  image_hash?: string;
  authorization_category?: string;
  instagram_actor_id?: string;
};

export type MetaAdsCloneDiagnosticsInput = {
  accessToken: string;
  appId: string;
  appSecret: string;
  adAccountId: string;
  sourceAdId: string;
  targetAdSetId?: string | null;
  apiVersion?: string;
  graph?: MetaGraphCaller;
};

export type MetaAdsCloneDiagnosticsResult = {
  ok: boolean;
  steps: MetaAdCloneStep[];
  token?: DebugTokenResponse["data"];
  adAccount?: AdAccount;
  sourceAd?: MetaAd;
  sourceAdset?: AdSet & { account_id?: string };
  creative?: MetaAdCreative;
  targetAdset?: AdSet;
};

export type MetaAdCloneInput = MetaAdsCloneDiagnosticsInput;

export type MetaAdCloneResult = {
  ok: boolean;
  method?: "copies" | "reuse_creative" | "recreate_creative";
  diagnostics: MetaAdsCloneDiagnosticsResult;
  copiedAdId?: string;
  copiedAd?: MetaAd;
  metaError?: MetaErrorDetails;
  fallbackError?: MetaErrorDetails;
  calledEndpoints: string[];
};

export function normalizeMetaAdAccountId(adAccountId: string) {
  const value = String(adAccountId || "").trim();
  return value.startsWith("act_") ? value : `act_${value}`;
}

function stripAct(adAccountId: string) {
  return normalizeMetaAdAccountId(adAccountId).replace(/^act_/, "");
}

export function buildAdCopyBody({ targetAdSetId }: { targetAdSetId?: string | null }) {
  const body = new URLSearchParams({ status_option: "PAUSED" });
  if (targetAdSetId) body.set("adset_id", targetAdSetId);
  return body;
}

export function isSourceAdShapeValid(ad: unknown): ad is MetaAd {
  const row = ad as MetaAd | null;
  return Boolean(row?.id && row.adset_id && row.campaign_id && row.creative?.id);
}

function extractScopes(debugData?: DebugTokenResponse["data"]) {
  const scopes = new Set(debugData?.scopes ?? []);
  for (const item of debugData?.granular_scopes ?? []) {
    if (item.scope) scopes.add(item.scope);
  }
  return scopes;
}

function addStep(steps: MetaAdCloneStep[], step: MetaAdCloneStep) {
  steps.push(step);
}

function failResult(steps: MetaAdCloneStep[], partial: Omit<MetaAdsCloneDiagnosticsResult, "ok" | "steps"> = {}) {
  return { ok: false, steps, ...partial };
}

function accountMatches(account: AdAccount, adAccountId: string) {
  const normalized = normalizeMetaAdAccountId(adAccountId);
  const raw = stripAct(adAccountId);
  return account.id === normalized || account.id === raw || account.account_id === raw;
}

function hasAdManageTask(tasks?: string[]) {
  if (!tasks) return true;
  const taskSet = new Set((tasks ?? []).map((item) => item.toUpperCase()));
  return taskSet.has("ADVERTISE") || taskSet.has("MANAGE") || taskSet.has("CREATE_CONTENT");
}

function isAccountRestricted(account?: AdAccount) {
  if (!account) return true;
  return account.account_status !== undefined && Number(account.account_status) !== 1;
}

export function serializeMetaError(error: unknown): MetaErrorDetails {
  const payload = error as {
    error?: MetaErrorDetails;
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
    fbtrace_id?: string;
  };
  const meta = payload?.error ?? payload;
  const details: MetaErrorDetails = {
    message: meta?.message ?? (error instanceof Error ? error.message : "Meta API trả về lỗi không xác định."),
    type: meta?.type,
    code: meta?.code,
    error_subcode: meta?.error_subcode,
    error_user_title: meta?.error_user_title,
    error_user_msg: meta?.error_user_msg,
    fbtrace_id: meta?.fbtrace_id
  };
  details.category = classifyAdCloneError(details);
  return details;
}

export function classifyAdCloneError(error: MetaErrorDetails) {
  const message = `${error.message ?? ""} ${error.error_user_title ?? ""} ${error.error_user_msg ?? ""}`.toLowerCase();
  if (error.code === 190) return "token_invalid";
  if (error.code === 10 || error.code === 200 || message.includes("permission")) return "permission";
  if (error.code === 100) return "invalid_parameter_or_id";
  if (
    message.includes("creative") ||
    message.includes("object_story") ||
    message.includes("page") ||
    message.includes("video") ||
    message.includes("post")
  ) {
    return "creative_or_page_access";
  }
  if (
    message.includes("disabled") ||
    message.includes("restricted") ||
    message.includes("payment") ||
    message.includes("policy")
  ) {
    return "account_restricted";
  }
  return "meta_api_error";
}

async function facebookGraphCall(
  path: string,
  init?: {
    method?: string;
    params?: Record<string, string>;
    body?: URLSearchParams;
    accessToken?: string;
    appAccessToken?: string;
    apiVersion?: string;
  }
) {
  const apiVersion = init?.apiVersion || process.env.META_API_VERSION || "v23.0";
  const url = new URL(`https://graph.facebook.com/${apiVersion}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(init?.params ?? {})) {
    url.searchParams.set(key, value);
  }
  if (init?.appAccessToken) url.searchParams.set("access_token", init.appAccessToken);

  const headers: HeadersInit = {};
  if (init?.accessToken) headers.Authorization = `Bearer ${init.accessToken}`;
  if (init?.body) headers["Content-Type"] = "application/x-www-form-urlencoded";

  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body,
    cache: "no-store"
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: MetaErrorDetails };
  if (!response.ok) throw payload;
  return payload;
}

function graphWithVersion(graph: MetaGraphCaller | undefined, apiVersion?: string): MetaGraphCaller {
  if (graph) return graph;
  return (path, init) => facebookGraphCall(path, { ...init, apiVersion });
}

export async function metaAdsCloneDiagnostics(input: MetaAdsCloneDiagnosticsInput): Promise<MetaAdsCloneDiagnosticsResult> {
  const steps: MetaAdCloneStep[] = [];
  const graph = graphWithVersion(input.graph, input.apiVersion);
  const adAccountId = normalizeMetaAdAccountId(input.adAccountId);
  const appAccessToken = `${input.appId}|${input.appSecret}`;

  let tokenData: DebugTokenResponse["data"] | undefined;
  try {
    const debug = (await graph("debug_token", {
      params: { input_token: input.accessToken },
      appAccessToken
    })) as DebugTokenResponse;
    tokenData = debug.data;
    if (!tokenData?.is_valid) {
      addStep(steps, {
        key: "token_valid",
        label: "Token hợp lệ",
        status: "fail",
        message: "Token Meta hiện tại không hợp lệ hoặc đã hết hạn. Hãy đăng nhập lại Facebook."
      });
      return failResult(steps, { token: tokenData });
    }
    addStep(steps, {
      key: "token_valid",
      label: "Token hợp lệ",
      status: "pass",
      message: "Token còn hiệu lực.",
      details: {
        app_id: tokenData.app_id,
        user_id: tokenData.user_id,
        expires_at: tokenData.expires_at
      }
    });
  } catch (error) {
    addStep(steps, {
      key: "token_valid",
      label: "Token hợp lệ",
      status: "fail",
      message: "Không kiểm tra được token bằng debug_token.",
      details: serializeMetaError(error)
    });
    return failResult(steps);
  }

  const scopes = extractScopes(tokenData);
  const hasAdsManagement = scopes.has("ads_management");
  const hasAdsRead = scopes.has("ads_read");
  addStep(steps, {
    key: "ads_management",
    label: "Token có ads_management",
    status: hasAdsManagement ? "pass" : "fail",
    message: hasAdsManagement
      ? "Token đã có quyền tạo/chỉnh sửa quảng cáo."
      : "Token hiện tại chưa có ads_management. Cần login lại và xin đúng scope."
  });
  addStep(steps, {
    key: "ads_read",
    label: "Token có ads_read",
    status: hasAdsRead ? "pass" : "fail",
    message: hasAdsRead ? "Token đã có quyền đọc dữ liệu quảng cáo." : "Token hiện tại chưa có ads_read."
  });
  if (!hasAdsManagement || !hasAdsRead) return failResult(steps, { token: tokenData });

  let visibleAccount: AdAccount | undefined;
  try {
    let accounts: MetaAdAccountListResponse;
    try {
      accounts = (await graph("me/adaccounts", {
        accessToken: input.accessToken,
        params: {
          fields: "id,account_id,name,account_status,disable_reason,user_tasks,business",
          limit: "100"
        }
      })) as MetaAdAccountListResponse;
    } catch {
      accounts = (await graph("me/adaccounts", {
        accessToken: input.accessToken,
        params: {
          fields: "id,account_id,name,account_status,disable_reason",
          limit: "100"
        }
      })) as MetaAdAccountListResponse;
    }
    visibleAccount = (accounts.data ?? []).find((account) => accountMatches(account, adAccountId));
    if (!visibleAccount) {
      addStep(steps, {
        key: "ad_account_visible",
        label: "Token nhìn thấy tài khoản quảng cáo",
        status: "fail",
        message:
          "Token này không nhìn thấy tài khoản quảng cáo. Có thể user chưa được cấp quyền trong Business Settings hoặc token xin thiếu ads_read/ads_management."
      });
      return failResult(steps, { token: tokenData });
    }
    addStep(steps, {
      key: "ad_account_visible",
      label: "Token nhìn thấy tài khoản quảng cáo",
      status: "pass",
      message: `Token nhìn thấy tài khoản ${visibleAccount.name || visibleAccount.id}.`,
      details: {
        id: visibleAccount.id,
        account_status: visibleAccount.account_status,
        disable_reason: visibleAccount.disable_reason,
        user_tasks: visibleAccount.user_tasks ?? []
      }
    });
  } catch (error) {
    addStep(steps, {
      key: "ad_account_visible",
      label: "Token nhìn thấy tài khoản quảng cáo",
      status: "fail",
      message: "Không đọc được danh sách tài khoản quảng cáo từ token hiện tại.",
      details: serializeMetaError(error)
    });
    return failResult(steps, { token: tokenData });
  }

  const canManageAccount = hasAdManageTask(visibleAccount.user_tasks);
  addStep(steps, {
    key: "user_ad_account_permission",
    label: "User có quyền quản lý ad account",
    status: canManageAccount ? "pass" : "fail",
    message: canManageAccount
      ? "User có quyền chạy/quản lý quảng cáo trên tài khoản này."
      : "User có token nhưng chưa có quyền quản lý campaign trên ad account.",
    details: { user_tasks: visibleAccount.user_tasks ?? [] }
  });
  if (!canManageAccount) return failResult(steps, { token: tokenData, adAccount: visibleAccount });

  let accountDetails = visibleAccount;
  try {
    accountDetails = (await graph(adAccountId, {
      accessToken: input.accessToken,
      params: {
        fields: "id,name,account_status,disable_reason,amount_spent,balance,currency,business"
      }
    })) as AdAccount;
    const restricted = isAccountRestricted(accountDetails);
    addStep(steps, {
      key: "ad_account_status",
      label: "Ad account không bị hạn chế",
      status: restricted ? "warning" : "pass",
      message: restricted
        ? "Tài khoản quảng cáo có thể đang bị hạn chế hoặc không đủ điều kiện tạo/copy ads."
        : "Tài khoản quảng cáo đang ở trạng thái có thể thao tác.",
      details: {
        account_status: accountDetails.account_status,
        disable_reason: accountDetails.disable_reason,
        currency: accountDetails.currency
      }
    });
  } catch (error) {
    addStep(steps, {
      key: "ad_account_status",
      label: "Ad account không bị hạn chế",
      status: "warning",
      message: "Không đọc được chi tiết trạng thái tài khoản quảng cáo.",
      details: serializeMetaError(error)
    });
  }

  let sourceAd: MetaAd | undefined;
  try {
    const sourceAdCandidate = (await graph(input.sourceAdId, {
      accessToken: input.accessToken,
      params: {
        fields: "id,name,adset_id,campaign_id,creative,status,effective_status,configured_status"
      }
    })) as unknown;
    if (!isSourceAdShapeValid(sourceAdCandidate)) {
      const invalidAd = sourceAdCandidate as Partial<MetaAd>;
      addStep(steps, {
        key: "source_ad",
        label: "Đọc được ad gốc",
        status: "fail",
        message: "ID hiện tại không giống một ad_id hợp lệ. Kiểm tra lại không được truyền campaign_id/adset_id/creative_id.",
        details: {
          id: invalidAd?.id,
          has_adset_id: Boolean(invalidAd?.adset_id),
          has_campaign_id: Boolean(invalidAd?.campaign_id),
          has_creative_id: Boolean(invalidAd?.creative?.id)
        }
      });
      return failResult(steps, { token: tokenData, adAccount: accountDetails, sourceAd: invalidAd as MetaAd });
    }
    sourceAd = sourceAdCandidate;
    addStep(steps, {
      key: "source_ad",
      label: "Đọc được ad gốc",
      status: "pass",
      message: `Đã đọc được quảng cáo gốc: ${sourceAd.name || sourceAd.id}.`,
      details: {
        id: sourceAd.id,
        adset_id: sourceAd.adset_id,
        campaign_id: sourceAd.campaign_id,
        creative_id: sourceAd.creative?.id,
        status: sourceAd.status
      }
    });
  } catch (error) {
    addStep(steps, {
      key: "source_ad",
      label: "Đọc được ad gốc",
      status: "fail",
      message: "Không đọc được quảng cáo gốc. Có thể sai ad_id hoặc token không có quyền với ad nguồn.",
      details: serializeMetaError(error)
    });
    return failResult(steps, { token: tokenData, adAccount: accountDetails });
  }

  let sourceAdset: (AdSet & { account_id?: string }) | undefined;
  try {
    sourceAdset = (await graph(sourceAd.adset_id || "", {
      accessToken: input.accessToken,
      params: { fields: "id,name,account_id,campaign_id,status,effective_status" }
    })) as AdSet & { account_id?: string };
    const sourceAccountId = sourceAdset.account_id ? normalizeMetaAdAccountId(sourceAdset.account_id) : "";
    if (sourceAccountId && sourceAccountId !== adAccountId) {
      addStep(steps, {
        key: "source_ad_account_match",
        label: "Ad gốc thuộc đúng tài khoản đang chọn",
        status: "fail",
        message:
          "Quảng cáo gốc thuộc tài khoản quảng cáo khác với tài khoản đang chọn. Hãy chọn đúng tài khoản chứa ad này rồi nhân bản lại.",
        details: {
          selected_ad_account_id: adAccountId,
          source_adset_account_id: sourceAccountId,
          source_adset_id: sourceAdset.id
        }
      });
      return failResult(steps, { token: tokenData, adAccount: accountDetails, sourceAd, sourceAdset });
    }
    addStep(steps, {
      key: "source_ad_account_match",
      label: "Ad gốc thuộc đúng tài khoản đang chọn",
      status: "pass",
      message: "Ad gốc nằm trong tài khoản quảng cáo đang chọn.",
      details: { source_adset_id: sourceAdset.id, source_adset_account_id: sourceAccountId || "Meta không trả account_id" }
    });
  } catch (error) {
    addStep(steps, {
      key: "source_ad_account_match",
      label: "Ad gốc thuộc đúng tài khoản đang chọn",
      status: "warning",
      message: "Không đọc được account_id của adset nguồn. App vẫn tiếp tục nhưng nếu fallback fail hãy kiểm tra ad account đang chọn.",
      details: serializeMetaError(error)
    });
  }

  let creative: MetaAdCreative | undefined;
  try {
    creative = (await graph(sourceAd.creative?.id || "", {
      accessToken: input.accessToken,
      params: {
        fields:
          "id,name,object_story_id,object_story_spec,asset_feed_spec,thumbnail_url,image_hash,video_id,effective_object_story_id,instagram_actor_id,authorization_category"
      }
    })) as MetaAdCreative;
    addStep(steps, {
      key: "creative",
      label: "Đọc được creative gốc",
      status: "pass",
      message: `Đã đọc được creative ${creative.name || creative.id}.`,
      details: {
        id: creative.id,
        has_object_story_id: Boolean(creative.object_story_id || creative.effective_object_story_id),
        has_object_story_spec: Boolean(creative.object_story_spec),
        has_asset_feed_spec: Boolean(creative.asset_feed_spec)
      }
    });
  } catch (error) {
    addStep(steps, {
      key: "creative",
      label: "Đọc được creative gốc",
      status: "fail",
      message:
        "Đọc được ad nhưng không đọc được creative. Có thể token thiếu quyền Page/Video/Post hoặc creative dùng asset không còn quyền truy cập.",
      details: serializeMetaError(error)
    });
    return failResult(steps, { token: tokenData, adAccount: accountDetails, sourceAd });
  }

  let targetAdset: AdSet | undefined;
  if (input.targetAdSetId) {
    try {
      targetAdset = (await graph(input.targetAdSetId, {
        accessToken: input.accessToken,
        params: {
          fields:
            "id,name,campaign_id,status,effective_status,optimization_goal,billing_event,destination_type,promoted_object,targeting"
        }
      })) as AdSet;
      addStep(steps, {
        key: "target_adset",
        label: "Đọc được adset đích",
        status: "pass",
        message: `Đã đọc được nhóm quảng cáo đích: ${targetAdset.name || targetAdset.id}.`,
        details: {
          id: targetAdset.id,
          campaign_id: targetAdset.campaign_id,
          status: targetAdset.status,
          optimization_goal: targetAdset.optimization_goal
        }
      });
    } catch (error) {
      addStep(steps, {
        key: "target_adset",
        label: "Đọc được adset đích",
        status: "fail",
        message: "Không đọc được ad set đích. Có thể sai adset_id hoặc user không có quyền với ad account đích.",
        details: serializeMetaError(error)
      });
      return failResult(steps, { token: tokenData, adAccount: accountDetails, sourceAd, creative });
    }
  } else {
    addStep(steps, {
      key: "target_adset",
      label: "Đọc được adset đích",
      status: "pass",
      message: "Không chọn adset đích, app sẽ giữ nguyên nhóm quảng cáo gốc."
    });
  }

  return {
    ok: !steps.some((step) => step.status === "fail"),
    steps,
    token: tokenData,
    adAccount: accountDetails,
    sourceAd,
    sourceAdset,
    creative,
    targetAdset
  };
}

async function createAdFromCreative({
  graph,
  accessToken,
  adAccountId,
  sourceAd,
  targetAdSetId,
  creativeId
}: {
  graph: MetaGraphCaller;
  accessToken: string;
  adAccountId: string;
  sourceAd: MetaAd;
  targetAdSetId?: string | null;
  creativeId: string;
}) {
  return graph(`${adAccountId}/ads`, {
    accessToken,
    method: "POST",
    body: new URLSearchParams({
      name: `${sourceAd.name || "Ad"} - Copy`,
      adset_id: targetAdSetId || sourceAd.adset_id || "",
      creative: JSON.stringify({ creative_id: creativeId }),
      status: "PAUSED"
    })
  });
}

async function recreateCreative({
  graph,
  accessToken,
  adAccountId,
  sourceAd,
  creative
}: {
  graph: MetaGraphCaller;
  accessToken: string;
  adAccountId: string;
  sourceAd: MetaAd;
  creative: MetaAdCreative;
}) {
  const body = new URLSearchParams({ name: `${sourceAd.name || creative.name || "Creative"} - Copy` });
  const objectStoryId = creative.object_story_id || creative.effective_object_story_id;
  if (objectStoryId) {
    body.set("object_story_id", objectStoryId);
  } else if (creative.object_story_spec) {
    body.set("object_story_spec", JSON.stringify(creative.object_story_spec));
  } else {
    throw {
      error: {
        message:
          "Creative gốc thiếu object_story_id/object_story_spec nên không thể tái tạo an toàn qua API.",
        code: 100
      }
    };
  }
  return graph(`${adAccountId}/adcreatives`, {
    accessToken,
    method: "POST",
    body
  });
}

export async function cloneMetaAdWithFallback(input: MetaAdCloneInput): Promise<MetaAdCloneResult> {
  const calledEndpoints: string[] = [];
  const graph = graphWithVersion(input.graph, input.apiVersion);
  const adAccountId = normalizeMetaAdAccountId(input.adAccountId);
  const diagnostics = await metaAdsCloneDiagnostics({ ...input, graph });
  if (!diagnostics.ok || !diagnostics.sourceAd || !diagnostics.creative?.id) {
    return { ok: false, diagnostics, calledEndpoints };
  }

  try {
    calledEndpoints.push(`POST /${input.sourceAdId}/copies`);
    const copied = (await graph(input.sourceAdId + "/copies", {
      accessToken: input.accessToken,
      method: "POST",
      body: buildAdCopyBody({ targetAdSetId: input.targetAdSetId })
    })) as { id?: string; copied_ad_id?: string };
    const copiedAdId = copied.copied_ad_id || copied.id;
    let copiedAd: MetaAd | undefined;
    if (copiedAdId) {
      calledEndpoints.push(`GET /${copiedAdId}`);
      copiedAd = (await graph(copiedAdId, {
        accessToken: input.accessToken,
        params: { fields: "id,name,status,effective_status,adset_id,campaign_id,creative" }
      })) as MetaAd;
    }
    diagnostics.steps.push({
      key: "clone_result",
      label: "Clone endpoint hoặc fallback thành công",
      status: "pass",
      message: `Nhân bản thành công qua /${input.sourceAdId}/copies.`,
      details: { copied_ad_id: copiedAdId, status: copiedAd?.status }
    });
    return { ok: true, method: "copies", diagnostics, copiedAdId, copiedAd, calledEndpoints };
  } catch (error) {
    const metaError = serializeMetaError(error);
    try {
      calledEndpoints.push(`POST /${adAccountId}/ads`);
      const fallback = await createAdFromCreative({
        graph,
        accessToken: input.accessToken,
        adAccountId,
        sourceAd: diagnostics.sourceAd,
        targetAdSetId: input.targetAdSetId,
        creativeId: diagnostics.creative.id
      });
      const copiedAdId = (fallback as { id?: string }).id;
      let copiedAd: MetaAd | undefined;
      if (copiedAdId) {
        calledEndpoints.push(`GET /${copiedAdId}`);
        copiedAd = (await graph(copiedAdId, {
          accessToken: input.accessToken,
          params: { fields: "id,name,status,effective_status,adset_id,campaign_id,creative" }
        })) as MetaAd;
      }
      diagnostics.steps.push({
        key: "clone_result",
        label: "Clone endpoint hoặc fallback thành công",
        status: "warning",
        message: "Clone trực tiếp thất bại, app đã tạo ad mới bằng creative gốc ở trạng thái PAUSED.",
        details: { direct_error: metaError, copied_ad_id: copiedAdId, status: copiedAd?.status }
      });
      return { ok: true, method: "reuse_creative", diagnostics, copiedAdId, copiedAd, metaError, calledEndpoints };
    } catch (fallbackReuseError) {
      const reuseError = serializeMetaError(fallbackReuseError);
      try {
        calledEndpoints.push(`POST /${adAccountId}/adcreatives`);
        const newCreative = await recreateCreative({
          graph,
          accessToken: input.accessToken,
          adAccountId,
          sourceAd: diagnostics.sourceAd,
          creative: diagnostics.creative
        });
        const newCreativeId = (newCreative as { id?: string }).id;
        if (!newCreativeId) throw { error: { message: "Meta không trả về creative_id mới.", code: 100 } };
        calledEndpoints.push(`POST /${adAccountId}/ads`);
        const fallback = await createAdFromCreative({
          graph,
          accessToken: input.accessToken,
          adAccountId,
          sourceAd: diagnostics.sourceAd,
          targetAdSetId: input.targetAdSetId,
          creativeId: newCreativeId
        });
        const copiedAdId = (fallback as { id?: string }).id;
        let copiedAd: MetaAd | undefined;
        if (copiedAdId) {
          calledEndpoints.push(`GET /${copiedAdId}`);
          copiedAd = (await graph(copiedAdId, {
            accessToken: input.accessToken,
            params: { fields: "id,name,status,effective_status,adset_id,campaign_id,creative" }
          })) as MetaAd;
        }
        diagnostics.steps.push({
          key: "clone_result",
          label: "Clone endpoint hoặc fallback thành công",
          status: "warning",
          message: "Clone trực tiếp và reuse creative thất bại, app đã tái tạo creative rồi tạo ad PAUSED.",
          details: {
            direct_error: metaError,
            reuse_error: reuseError,
            copied_ad_id: copiedAdId,
            new_creative_id: newCreativeId,
            status: copiedAd?.status
          }
        });
        return {
          ok: true,
          method: "recreate_creative",
          diagnostics,
          copiedAdId,
          copiedAd,
          metaError,
          fallbackError: reuseError,
          calledEndpoints
        };
      } catch (fallbackError) {
        const finalFallbackError = serializeMetaError(fallbackError);
        diagnostics.steps.push({
          key: "clone_result",
          label: "Clone endpoint hoặc fallback thành công",
          status: "fail",
          message:
            "Không thể copy trực tiếp và cũng không thể tái tạo creative. Cần kiểm tra quyền Page/Post/Video/Lead Form/Catalog hoặc creative gốc thuộc định dạng không hỗ trợ clone qua API.",
          details: {
            direct_error: metaError,
            reuse_error: reuseError,
            recreate_error: finalFallbackError
          }
        });
        return {
          ok: false,
          diagnostics,
          metaError,
          fallbackError: finalFallbackError,
          calledEndpoints
        };
      }
    }
  }
}
