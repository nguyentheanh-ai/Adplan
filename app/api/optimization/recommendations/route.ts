import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { requireFacebookProviderToken } from "@/lib/meta/auth-token";
import { metaErrorResponse, updateMetaBudget } from "@/lib/meta/facebook";
import type { CreativePerformance, NormalizedCampaignPerformance } from "@/lib/meta/types";
import { isWithinOptimizationWindow } from "@/lib/optimization/authorization-window";
import { buildOptimizationRecommendations } from "@/lib/optimization/recommendations";
import { createAdminClient } from "@/lib/supabase/admin";

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return (
    error?.code === "42P01" ||
    message.includes("schema cache") ||
    message.includes("optimization_recommendations") ||
    message.includes("account_industry_profiles") ||
    message.includes("industry_learning_profiles")
  );
}

function campaignFromSnapshot(row: Record<string, unknown>): NormalizedCampaignPerformance {
  return {
    campaignId: String(row.campaign_id || ""),
    campaignName: String(row.campaign_name || "Campaign không tên"),
    status: row.status ? String(row.status) : undefined,
    objective: row.objective ? String(row.objective) : undefined,
    spend: Number(row.spend || 0),
    impressions: Number(row.impressions || 0),
    reach: Number(row.reach || 0),
    frequency: 0,
    cpm: Number(row.cpm || 0),
    ctr: Number(row.ctr || 0),
    cpc: Number(row.cpc || 0),
    clicks: Number(row.clicks || 0),
    leads: Number(row.leads || 0),
    messages: Number(row.messages || 0),
    engagements: Number(row.engagements || 0),
    purchases: Number(row.purchases || 0),
    results: Number(row.leads || 0) + Number(row.messages || 0) + Number(row.purchases || 0),
    costPerResult: Number(row.cost_per_result || 0),
    roas: row.roas === null || row.roas === undefined ? null : Number(row.roas),
    conversionValue: Number(row.conversion_value || 0)
  };
}

function creativeFromSnapshot(row: Record<string, unknown>): CreativePerformance {
  return {
    adId: String(row.ad_id || ""),
    adName: String(row.ad_name || "Ad không tên"),
    campaignId: row.campaign_id ? String(row.campaign_id) : undefined,
    campaignName: String(row.campaign_name || "Campaign không tên"),
    adsetId: row.adset_id ? String(row.adset_id) : undefined,
    adsetName: String(row.adset_name || "Adset không tên"),
    creativeId: String(row.creative_id || ""),
    creativeName: String(row.creative_name || "Creative không tên"),
    body: String(row.body || ""),
    headline: String(row.headline || ""),
    description: String(row.description || ""),
    cta: String(row.cta || ""),
    landingUrl: String(row.landing_url || ""),
    postId: String(row.post_id || ""),
    postUrl: String(row.post_url || ""),
    audienceAgeRange: String(row.audience_age_range || ""),
    audienceGender: String(row.audience_gender || ""),
    audienceLocations: String(row.audience_locations || ""),
    audienceInterests: String(row.audience_interests || ""),
    audienceBehaviors: String(row.audience_behaviors || ""),
    format: (row.format as CreativePerformance["format"]) || "unknown",
    spend: Number(row.spend || 0),
    impressions: Number(row.impressions || 0),
    reach: Number(row.reach || 0),
    frequency: 0,
    ctr: Number(row.ctr || 0),
    cpc: Number(row.cpc || 0),
    cpm: Number(row.cpm || 0),
    leads: Number(row.leads || 0),
    messages: Number(row.messages || 0),
    engagements: Number(row.engagements || 0),
    cpl: row.cpl === null || row.cpl === undefined ? null : Number(row.cpl),
    costPerMessage: row.cost_per_message === null || row.cost_per_message === undefined ? null : Number(row.cost_per_message)
  };
}

async function saveOptimizationActionLog(payload: {
  userId: string;
  adAccountId: string;
  recommendationId?: string | null;
  actionType: string;
  entityType: string;
  entityId: string;
  status: "blocked" | "success" | "failed" | "proposal_only";
  request: unknown;
  response?: unknown;
  errorMessage?: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("optimization_action_logs").insert({
    user_id: payload.userId,
    ad_account_id: payload.adAccountId,
    recommendation_id: payload.recommendationId || null,
    action_type: payload.actionType,
    entity_type: payload.entityType,
    entity_id: payload.entityId,
    status: payload.status,
    request_json: payload.request,
    response_json: payload.response ?? {},
    error_message: payload.errorMessage || null
  });

  if (error && !isMissingTable(error)) throw new Error(error.message);
}

function getPercentValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.abs(number) : 0;
}

export async function GET(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  const url = new URL(request.url);
  const adAccountId = url.searchParams.get("ad_account_id");
  const admin = createAdminClient();
  let query = admin
    .from("optimization_recommendations")
    .select("*")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (adAccountId) query = query.eq("ad_account_id", adAccountId);
  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ data: [], storage: "missing_schema" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    ad_account_id?: string;
    start_date?: string;
    end_date?: string;
  };
  if (!body.ad_account_id) return NextResponse.json({ error: "Chưa chọn tài khoản quảng cáo." }, { status: 400 });

  const admin = createAdminClient();
  const campaignQuery = admin
    .from("meta_campaign_snapshots")
    .select("*")
    .eq("user_id", session.userId)
    .eq("ad_account_id", body.ad_account_id)
    .order("created_at", { ascending: false })
    .limit(300);
  const creativeQuery = admin
    .from("meta_ad_creative_snapshots")
    .select("*")
    .eq("user_id", session.userId)
    .eq("ad_account_id", body.ad_account_id)
    .order("created_at", { ascending: false })
    .limit(300);
  const industryProfileQuery = admin
    .from("account_industry_profiles")
    .select("*")
    .eq("user_id", session.userId)
    .eq("ad_account_id", body.ad_account_id)
    .maybeSingle();

  const [campaignResult, creativeResult, industryProfileResult] = await Promise.all([
    campaignQuery,
    creativeQuery,
    industryProfileQuery
  ]);
  if (campaignResult.error) {
    if (isMissingTable(campaignResult.error)) {
      return NextResponse.json(
        { error: "Chưa có bảng dữ liệu tối ưu. Hãy chạy migration 202605210004_create_meta_optimization_tables.sql." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: campaignResult.error.message }, { status: 500 });
  }
  if (creativeResult.error) return NextResponse.json({ error: creativeResult.error.message }, { status: 500 });
  if (industryProfileResult.error && !isMissingTable(industryProfileResult.error)) {
    return NextResponse.json({ error: industryProfileResult.error.message }, { status: 500 });
  }

  const profile = industryProfileResult.data as Record<string, unknown> | null;
  let benchmarks: Array<{
    objective: string;
    sampleSize: number;
    medianCtr: number | null;
    medianCpc: number | null;
    medianCpm: number | null;
    medianCpl: number | null;
    medianCostPerMessage: number | null;
  }> = [];
  if (profile?.industry_key && String(profile.industry_key) !== "unknown") {
    const { data: benchmarkRows, error: benchmarkError } = await admin
      .from("industry_learning_profiles")
      .select("objective,sample_size,median_ctr,median_cpc,median_cpm,median_cpl,median_cost_per_message")
      .eq("industry_key", String(profile.industry_key));
    if (benchmarkError && !isMissingTable(benchmarkError)) return NextResponse.json({ error: benchmarkError.message }, { status: 500 });
    benchmarks = (benchmarkRows ?? []).map((row) => ({
      objective: String(row.objective || "UNKNOWN"),
      sampleSize: Number(row.sample_size || 0),
      medianCtr: row.median_ctr === null || row.median_ctr === undefined ? null : Number(row.median_ctr),
      medianCpc: row.median_cpc === null || row.median_cpc === undefined ? null : Number(row.median_cpc),
      medianCpm: row.median_cpm === null || row.median_cpm === undefined ? null : Number(row.median_cpm),
      medianCpl: row.median_cpl === null || row.median_cpl === undefined ? null : Number(row.median_cpl),
      medianCostPerMessage: row.median_cost_per_message === null || row.median_cost_per_message === undefined ? null : Number(row.median_cost_per_message)
    }));
  }

  const recommendations = buildOptimizationRecommendations({
    campaigns: (campaignResult.data ?? []).map((row) => campaignFromSnapshot(row as Record<string, unknown>)),
    creatives: (creativeResult.data ?? []).map((row) => creativeFromSnapshot(row as Record<string, unknown>)),
    context: profile
      ? {
          industryKey: String(profile.industry_key || "unknown"),
          businessModel: profile.business_model ? String(profile.business_model) : null,
          offerType: profile.offer_type ? String(profile.offer_type) : null,
          averageOrderValue: profile.average_order_value === null || profile.average_order_value === undefined ? null : Number(profile.average_order_value),
          targetCustomer: profile.target_customer ? String(profile.target_customer) : null,
          benchmarks
        }
      : undefined
  });

  if (!recommendations.length) return NextResponse.json({ data: [] });

  const { data, error } = await admin
    .from("optimization_recommendations")
    .insert(
      recommendations.map((item) => ({
        user_id: session.userId,
        ad_account_id: body.ad_account_id,
        entity_type: item.entityType,
        entity_id: item.entityId,
        entity_name: item.entityName,
        recommendation_type: item.recommendationType,
        priority: item.priority,
        title: item.title,
        reason: item.reason,
        expected_impact: item.expectedImpact,
        action_payload: item.actionPayload,
        evidence_json: item.evidence,
        status: "draft"
      }))
    )
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function PATCH(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    recommendation_id?: string;
    status?: "approved" | "rejected" | "draft";
  };
  if (!body.recommendation_id || !body.status) {
    return NextResponse.json({ error: "Thiếu recommendation_id hoặc status." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("optimization_recommendations")
    .update({
      status: body.status,
      approved_by: body.status === "approved" ? session.name || session.facebookId : null,
      approved_at: body.status === "approved" ? new Date().toISOString() : null
    })
    .eq("id", body.recommendation_id)
    .eq("user_id", session.userId)
    .select("*")
    .single();

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: "Chưa có bảng optimization_recommendations." }, { status: 500 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PUT(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as { recommendation_id?: string };
    if (!body.recommendation_id) return NextResponse.json({ error: "Thiếu recommendation_id." }, { status: 400 });

    const admin = createAdminClient();
    const { data: recommendation, error } = await admin
      .from("optimization_recommendations")
      .select("*")
      .eq("id", body.recommendation_id)
      .eq("user_id", session.userId)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!recommendation) return NextResponse.json({ error: "Không tìm thấy khuyến nghị." }, { status: 404 });
    if (recommendation.status !== "approved") {
      await saveOptimizationActionLog({
        userId: session.userId,
        adAccountId: recommendation.ad_account_id,
        recommendationId: recommendation.id,
        actionType: recommendation.recommendation_type,
        entityType: recommendation.entity_type,
        entityId: recommendation.entity_id,
        status: "blocked",
        request: body,
        errorMessage: "Khuyến nghị chưa được duyệt."
      }).catch(() => undefined);
      return NextResponse.json({ error: "Khuyến nghị cần được duyệt trước khi áp dụng." }, { status: 400 });
    }

    const { data: authorization, error: authError } = await admin
      .from("optimization_authorizations")
      .select("*")
      .eq("user_id", session.userId)
      .eq("ad_account_id", recommendation.ad_account_id)
      .maybeSingle();
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
    if (!authorization || authorization.status !== "enabled") {
      await saveOptimizationActionLog({
        userId: session.userId,
        adAccountId: recommendation.ad_account_id,
        recommendationId: recommendation.id,
        actionType: recommendation.recommendation_type,
        entityType: recommendation.entity_type,
        entityId: recommendation.entity_id,
        status: "blocked",
        request: body,
        errorMessage: "Tài khoản chưa bật ủy quyền tối ưu."
      }).catch(() => undefined);
      return NextResponse.json({ error: "Tài khoản này chưa bật ủy quyền tối ưu." }, { status: 403 });
    }

    const allowedActions = Array.isArray(authorization.allowed_actions) ? authorization.allowed_actions : [];
    if (!allowedActions.includes(recommendation.recommendation_type)) {
      await saveOptimizationActionLog({
        userId: session.userId,
        adAccountId: recommendation.ad_account_id,
        recommendationId: recommendation.id,
        actionType: recommendation.recommendation_type,
        entityType: recommendation.entity_type,
        entityId: recommendation.entity_id,
        status: "blocked",
        request: body,
        errorMessage: "Hành động ngoài phạm vi ủy quyền."
      }).catch(() => undefined);
      return NextResponse.json({ error: "Loại hành động này chưa nằm trong phạm vi khách ủy quyền." }, { status: 403 });
    }

    const windowStatus = isWithinOptimizationWindow(authorization.optimization_window);
    if (!windowStatus.ok) {
      await saveOptimizationActionLog({
        userId: session.userId,
        adAccountId: recommendation.ad_account_id,
        recommendationId: recommendation.id,
        actionType: recommendation.recommendation_type,
        entityType: recommendation.entity_type,
        entityId: recommendation.entity_id,
        status: "blocked",
        request: { ...body, optimizationWindow: windowStatus.window, currentTime: windowStatus.currentTime },
        errorMessage: windowStatus.label
      }).catch(() => undefined);
      return NextResponse.json({ error: windowStatus.label }, { status: 403 });
    }

    const actionPayload = (recommendation.action_payload ?? {}) as Record<string, unknown>;
    const requestedBudgetChange = getPercentValue(actionPayload.budget_change_percent ?? actionPayload.suggested_budget_increase_percent);
    const maxBudgetChange = Number(authorization.max_daily_budget_change_percent ?? 0);
    if (
      ["scale_budget", "reduce_budget"].includes(String(recommendation.recommendation_type)) &&
      requestedBudgetChange > 0 &&
      maxBudgetChange > 0 &&
      requestedBudgetChange > maxBudgetChange
    ) {
      await saveOptimizationActionLog({
        userId: session.userId,
        adAccountId: recommendation.ad_account_id,
        recommendationId: recommendation.id,
        actionType: recommendation.recommendation_type,
        entityType: recommendation.entity_type,
        entityId: recommendation.entity_id,
        status: "blocked",
        request: { ...body, requestedBudgetChange, maxBudgetChange },
        errorMessage: "Vượt giới hạn thay đổi ngân sách đã ủy quyền."
      }).catch(() => undefined);
      return NextResponse.json(
        { error: `Khuyến nghị muốn đổi ${requestedBudgetChange}%, vượt giới hạn ${maxBudgetChange}% đã ủy quyền.` },
        { status: 403 }
      );
    }

    let result: unknown = {
      status: "proposal_only",
      message: "Hành động này đã được duyệt nhưng chưa có API apply tự động an toàn. App giữ ở dạng proposal để khách xử lý thủ công."
    };
    let actionStatus: "success" | "proposal_only" = "proposal_only";

    if (recommendation.recommendation_type === "scale_budget" && typeof actionPayload.new_daily_budget === "string") {
      const accessToken = await requireFacebookProviderToken();
      result = await updateMetaBudget({
        objectId: recommendation.entity_id,
        dailyBudget: actionPayload.new_daily_budget,
        accessToken
      });
      actionStatus = "success";
    }

    await saveOptimizationActionLog({
      userId: session.userId,
      adAccountId: recommendation.ad_account_id,
      recommendationId: recommendation.id,
      actionType: recommendation.recommendation_type,
      entityType: recommendation.entity_type,
      entityId: recommendation.entity_id,
      status: actionStatus,
      request: { ...body, actionPayload },
      response: result
    });

    const { data: updated, error: updateError } = await admin
      .from("optimization_recommendations")
      .update({
        status: "applied",
        applied_at: new Date().toISOString(),
        evidence_json: {
          ...(recommendation.evidence_json ?? {}),
          apply_result: result
        }
      })
      .eq("id", recommendation.id)
      .eq("user_id", session.userId)
      .select("*")
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ data: updated, result });
  } catch (error) {
    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status === 500 ? 400 : response.status });
  }
}
