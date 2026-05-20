import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import type { CreativePerformance, NormalizedCampaignPerformance } from "@/lib/meta/types";
import { buildOptimizationRecommendations } from "@/lib/optimization/recommendations";
import { createAdminClient } from "@/lib/supabase/admin";

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("schema cache") || message.includes("optimization_recommendations");
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

  const [campaignResult, creativeResult] = await Promise.all([campaignQuery, creativeQuery]);
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

  const recommendations = buildOptimizationRecommendations({
    campaigns: (campaignResult.data ?? []).map((row) => campaignFromSnapshot(row as Record<string, unknown>)),
    creatives: (creativeResult.data ?? []).map((row) => creativeFromSnapshot(row as Record<string, unknown>))
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
