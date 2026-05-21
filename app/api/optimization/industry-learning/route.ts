import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { buildIndustryLearningProfiles } from "@/lib/optimization/industry-learning";
import { createAdminClient } from "@/lib/supabase/admin";

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return (
    error?.code === "42P01" ||
    message.includes("schema cache") ||
    message.includes("industry_learning_profiles") ||
    message.includes("account_industry_profiles")
  );
}

export async function GET(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  const url = new URL(request.url);
  const industryKey = url.searchParams.get("industry_key");
  if (!industryKey || industryKey === "unknown") return NextResponse.json({ data: [] });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("industry_learning_profiles")
    .select("*")
    .eq("industry_key", industryKey)
    .order("sample_size", { ascending: false });

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ data: [], storage: "missing_schema" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập Facebook." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { industry_key?: string };
  if (!body.industry_key || body.industry_key === "unknown") {
    return NextResponse.json({ error: "Chưa chọn ngành hàng để học benchmark." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profiles, error: profileError } = await admin
    .from("account_industry_profiles")
    .select("user_id,ad_account_id")
    .eq("industry_key", body.industry_key);

  if (profileError) {
    if (isMissingTable(profileError)) {
      return NextResponse.json(
        { error: "Chưa có bảng account_industry_profiles. Hãy chạy migration 202605210006_create_account_industry_profiles.sql." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const accountIds = [...new Set((profiles ?? []).map((item) => String(item.ad_account_id)).filter(Boolean))];
  if (!accountIds.length) return NextResponse.json({ data: [], sample_size: 0 });

  const { data: campaigns, error: campaignError } = await admin
    .from("meta_campaign_snapshots")
    .select("objective,ctr,cpc,cpm,cost_per_result,messages,leads")
    .in("ad_account_id", accountIds)
    .limit(5000);

  if (campaignError) {
    if (isMissingTable(campaignError)) return NextResponse.json({ error: "Chưa có bảng meta_campaign_snapshots." }, { status: 500 });
    return NextResponse.json({ error: campaignError.message }, { status: 500 });
  }

  const drafts = buildIndustryLearningProfiles(
    body.industry_key,
    (campaigns ?? []).map((item) => ({
      objective: String(item.objective || "UNKNOWN"),
      ctr: Number(item.ctr || 0),
      cpc: Number(item.cpc || 0),
      cpm: Number(item.cpm || 0),
      costPerResult: Number(item.cost_per_result || 0),
      messages: Number(item.messages || 0),
      leads: Number(item.leads || 0)
    }))
  );

  if (!drafts.length) return NextResponse.json({ data: [], sample_size: 0 });

  const { data, error } = await admin
    .from("industry_learning_profiles")
    .upsert(
      drafts.map((item) => ({
        industry_key: item.industryKey,
        objective: item.objective,
        sample_size: item.sampleSize,
        median_ctr: item.medianCtr,
        median_cpc: item.medianCpc,
        median_cpm: item.medianCpm,
        median_cpl: item.medianCpl,
        median_cost_per_message: item.medianCostPerMessage,
        winning_patterns: item.winningPatterns,
        losing_patterns: item.losingPatterns,
        updated_at: new Date().toISOString()
      })),
      { onConflict: "industry_key,objective" }
    )
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [], sample_size: campaigns?.length ?? 0 });
}
