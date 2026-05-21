import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth/session";
import { cloneMetaAdWithFallback, type MetaAdCloneResult } from "@/lib/meta/ad-clone";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { createAdminClient } from "@/lib/supabase/admin";

const cloneSchema = z.object({
  ad_account_id: z.string().min(3),
  source_ad_id: z.string().min(3),
  target_adset_id: z.string().min(3).optional().nullable()
});

function getMetaAppConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Thiếu META_APP_ID hoặc META_APP_SECRET để kiểm tra token.");
  }
  return { appId, appSecret };
}

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("ad_clone_logs") || message.includes("schema cache");
}

async function saveAdCloneLog(payload: {
  userId: string;
  adAccountId: string;
  sourceAdId: string;
  targetAdSetId?: string | null;
  result: MetaAdCloneResult;
}) {
  try {
    const admin = createAdminClient();
    const lastError = payload.result.fallbackError || payload.result.metaError;
    const endpoint = payload.result.calledEndpoints[payload.result.calledEndpoints.length - 1] || "POST /ads clone";
    const { error } = await admin.from("ad_clone_logs").insert({
      user_id: payload.userId,
      ad_account_id: payload.adAccountId,
      source_ad_id: payload.sourceAdId,
      target_adset_id: payload.targetAdSetId || null,
      endpoint,
      status: payload.result.ok ? "success" : "failed",
      method: payload.result.method || null,
      meta_error_code: lastError?.code ? String(lastError.code) : null,
      meta_error_subcode: lastError?.error_subcode ? String(lastError.error_subcode) : null,
      fbtrace_id: lastError?.fbtrace_id || null,
      copied_ad_id: payload.result.copiedAdId || null,
      request_json: {
        ad_account_id: payload.adAccountId,
        source_ad_id: payload.sourceAdId,
        target_adset_id: payload.targetAdSetId || null
      },
      response_json: {
        ok: payload.result.ok,
        method: payload.result.method,
        copied_ad_id: payload.result.copiedAdId,
        called_endpoints: payload.result.calledEndpoints,
        meta_error: payload.result.metaError,
        fallback_error: payload.result.fallbackError
      }
    });
    if (error && !isMissingTable(error)) throw new Error(error.message);
  } catch {
    // Clone must not fail only because the optional audit table has not been migrated yet.
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAppSession();
    if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

    const body = cloneSchema.parse(await request.json());
    const accessToken = await requireFacebookProviderToken();
    const { appId, appSecret } = getMetaAppConfig();
    const result = await cloneMetaAdWithFallback({
      accessToken,
      appId,
      appSecret,
      adAccountId: body.ad_account_id,
      sourceAdId: body.source_ad_id,
      targetAdSetId: body.target_adset_id
    });

    await saveAdCloneLog({
      userId: session.userId,
      adAccountId: body.ad_account_id,
      sourceAdId: body.source_ad_id,
      targetAdSetId: body.target_adset_id,
      result
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể nhân bản quảng cáo." },
      { status: 400 }
    );
  }
}
